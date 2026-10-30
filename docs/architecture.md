# Arsitektur DrawInDB

Deskripsi kode saat ini (per 2026-10-30), bukan target.

## 1. Struktur Vault → Project → Diagram
```
<Vault>/
  .drawindb/config.json          { vault_name, created_at, version, migrated }
  projects/<projId>/project.json { id, name, createdAt, updatedAt }
  projects/<projId>/diagrams/<safeName>_<type>.json
  projects/<projId>/docs/<safeName>.json          (opsional, dibuat saat PRD pertama)
```

- `projects` tidak ada di vault baru sampai `createProject()` dipanggil.
- Migrasi legacy (`vaultStore.openVault`): folder lama `diagrams/*.json` dipindah ke `projects/proj_<ts>/diagrams/`, `meta.projectId` diisi, `meta.type = 'erd'`, lalu `config.migrated = true`. Dilewati jika `migrated` sudah true.
- `openVault()` memanggil `setCurrentVaultPath` **sebelum** baca file (IPC main process memvalidasi path di vault aktif).

### Format file diagram
```json
{
  "version": "1.0",
  "meta":   { "projectId", "name", "type", "db_type?", "created_at", "updated_at" },
  "canvas": { "x", "y", "zoom" },
  "tables": [], "relationships": [],
  "nodes": [],  "edges": []
}
```

| Tipe | `meta` tambahan | Data terpakai |
|------|-----------------|---------------|
| `erd` | `db_type` (mysql/postgresql/sqlite/generic) | `tables[]` + `relationships[]` |
| `flowchart` | — | `nodes[]` + `edges[]` |
| `usecase` | — | `nodes[]` + `edges[]` (edge punya `data.relType`) |
| `statemachine` | — | `nodes[]` + `edges[]` (node `data.type` = initial/state/final/choice; edge punya `data.label`) |
| `architecture` | — | `nodes[]` + `edges[]` (node `data.type` = person/system/container/database/boundary; edge punya `data.label` + `data.technology`) |

Semua field ditulis `saveDiagram()`; tipe yang tidak memakai `tables` menulis array kosong. `canvas` legacy berformat `{pan:{x,y},zoom}` dinormalisasi saat load.

### 1a. Dokumen PRD (`docs/`) — BUKAN tipe diagram
Dokumen teks terstruktur per project. Tidak masuk `diagramTypes.js`/`editorTypes.jsx`, tidak memakai React Flow, dan tidak muncul di grid kartu tipe.

```json
{
  "version": "1.0",
  "meta": { "name", "type": "prd", "projectId", "created_at", "updated_at" },
  "sections": [ { "id", "key", "title", "content" } ],
  "stories":  [ { "id", "actor", "want", "benefit", "priority", "status", "links" } ]
}
```

- `sections[].content` adalah markdown. Urutan default: `latar-belakang`, `tujuan-metrik`, `target-pengguna`, `fitur`, `nfr`, `di-luar-lingkup`, `asumsi-risiko`. Judul boleh diubah; `key` stabil.
- `priority`: `must|should|could|wont`. `status`: `todo|doing|done`.
- `links`: `{ diagramFile, diagramType, note? }` menunjuk diagram di project yang sama. Tautan tanpa target dirender sebagai "Diagram missing" dan tidak bisa diklik (tidak crash).
- Section `fitur` tidak memakai `content` untuk tampilan: slot-nya diisi tabel `stories` saat edit, preview, dan export.
- `normalizePrdDoc` (`src/utils/prd.js`) tahan file rusak: section default yang hilang disisipkan sesuai urutan canonical, section asing dipertahankan di akhir, enum tak dikenal di-coerce, id kosong diisi. Idempotent.
- Nama file selalu `sanitizeDocFilename(name)` → `[a-z0-9_].json`, jadi tidak bisa keluar dari `docs/`.
- `openVault` membaca `docs/*.json` (lewati dotfile/non-`.json`, satu file rusak dilewati lewat try/catch) menjadi `project.documents: [{filename, name, type, updated_at}]`. Project lama tanpa `docs/` mendapat `[]` — tidak ada perubahan perilaku.
- **Dua store, satu penulis masing-masing:** `vaultStore` memiliki daftar dokumen (`createDocument`/`renameDocument`/`deleteDocument`/`updateDocumentMeta`); `store/docStore.js` memiliki isi dokumen yang sedang dibuka + autosave 1500 ms, mirror `editorStore` (`markDirty`/`autoSave`/`saveDoc`/`flush`/`cleanup`). `saveDoc` memanggil `updateDocumentMeta` supaya daftar tidak basi tanpa re-`openVault`.
- Berbeda dari editor diagram: unmount halaman dokumen **mem-flush** perubahan (bukan membuang), dan Cmd/Ctrl+S ditangani lewat `window.addEventListener('keydown')` karena `react-hotkeys-hook` mati di dalam textarea.
- IPC: hanya `window.api` yang sudah ada, plus `fs:deleteDirectory` (`fs.rm` rekursif, dijaga `assertVaultAccess`) yang dipakai `deleteProject` — sebelumnya `deleteFile` (unlink) dipanggil pada direktori dan gagal.

## 2. Registry tipe: `src/config/diagramTypes.js`
Entri `DIAGRAM_TYPES[<id>]`:
`id`, `label`, `labelPlural`, `placeholder`, `badge`, `backLabel`, `description`, `icon`, `dataShape` (`tables` | `graph`), `hasDbType`, `exports` `{ png, sql, json }`.

Saat ini: `erd` (tables, hasDbType, png+sql), `flowchart` (graph, png), `usecase` (graph, json), `statemachine` (graph, png), `architecture` (graph, png).

Helper: `getDiagramType(id)` (fallback ke `DEFAULT_DIAGRAM_TYPE = 'erd'` bila id tak dikenal/undefined), `isGraphType(id)`, `isErdType(id)`, `DIAGRAM_TYPE_LIST` (urutan render kartu).

Pemakai: `EditorHeader` + `DiagramCard` + `DiagramList` (`getDiagramType` → `hasDbType`, `exports`), `ProjectDetail` (`DIAGRAM_TYPE_LIST`, grid 5 kartu: `xl:grid-cols-5`), `Home` (`getDiagramType().badge`, urutan badge dari `DIAGRAM_TYPE_LIST`; badge `flex-wrap` jadi 5 tipe tidak meluber).

### 2a. Config editor per tipe: `src/config/editorTypes.jsx`
Pemisahan supaya `diagramTypes.js` tetap bebas JSX. `EDITOR_TYPES[<id>]`:
`sidebar`, `nodeTypes`, `edgeTypes`, `defaultEdge`, `addNode(type, position)`, `tips`, `overlays`.
Helper: `getEditorConfig(id)` (fallback entri `erd`). `Editor.jsx` hanya membaca config ini — tidak ada `nodeTypes`/`renderSidebar`/`onDrop` per tipe di sana.
`tests/editorStore.statemachine.test.jsx` menjaga korespondensi: setiap id di `DIAGRAM_TYPES` punya entri `EDITOR_TYPES` dan strategi `CONNECT_STRATEGIES` (dan sebaliknya).

### 2b. Strategi koneksi per tipe: `src/config/connectStrategies.js`
`CONNECT_STRATEGIES[<id>](connection, { get })` mengembalikan patch state (`{ flowEdges?, tables?, relationships? }`) atau `null` (ditolak). Store hanya me-lookup lewat `getDiagramType(type).id` lalu men-set patch + satu snapshot history. `erd` memakai FK/`clearOrphanFk`, `flowchart` label Yes/No, `usecase` `data.relType`, `statemachine` edge `type:'statemachine'` tanpa dedupe (mengizinkan beberapa transition & self-transition), `architecture` edge `data:{label,technology}` tanpa dedupe tapi **menolak self-loop** (return `null`).

## 3. Alur editor
1. `Editor.jsx` ambil `vaultPath` dari `vaultStore`, panggil `editorStore.loadDiagram(vaultPath, projectId, filename)`.
2. `loadDiagram` baca via `window.api` (`pathJoin` + `readFile`), set `diagramMeta`, `tables` (+`type:'table'`), `relationships`, `nodes`, `flowEdges`, `canvasState`, `isDirty=false`, `_vaultPath/_projectId/_filename`.
3. **Mapping:** file `edges` → state `flowEdges` (load), `flowEdges` → file `edges` (save). `relationships` tetap bernama sama di keduanya.
4. React Flow menerima `nodes={isGraphType ? nodes : tables}`, `edges={isGraphType ? flowEdges : relationships}`; viewport disimpan lewat `onMoveEnd` → `updateCanvas`.
5. Setiap action memanggil `markDirty(...)` lalu `autoSave()`: debounce 1500 ms → `saveDiagram()` jika `isDirty`. `_pendingSave` mengunci konteks vault/project/filename pada dirty pertama.
6. `saveDiagram()` menulis ulang seluruh file (`version`, `meta.updated_at` baru), lalu `isDirty=false`. `cleanup()` (unmount) membatalkan timer dan mengosongkan state.

Store juga menyimpan state khusus tipe: `usecaseRelType` (use case) dan `selectedTableId` (ERD).

### Undo / redo
- `historyPast` / `historyFuture` di `editorStore` berisi snapshot `{ tables, relationships, nodes, flowEdges }`, batas 100 entri per stack. Snapshot hanya di memori — tidak ditulis ke file diagram.
- `commitHistory(mode)` mencatat state **sebelum** mutasi: `'action'` (add/delete/duplicate/connect/reorder/resize — satu entri), `'typing'` (debounce 500 ms, satu entri per burst ketikan), `'flush'` (tutup burst menggantung; dipakai `undo`/`redo`).
- `onNodesChange` satu entri per drag (flag `dragging` pada change `position`), `remove`/`add`/`dimensions` satu entri; selection diabaikan. `onEdgesChange` hanya menghitung `remove`. `updateCanvas` (pan/zoom) dan `setSelectedTable` tidak masuk history.
- `undo()`/`redo()` menukar snapshot, lalu `markDirty` + `autoSave`. Aksi baru mengosongkan `historyFuture`.
- `loadDiagram` dan `cleanup` memanggil `resetHistory()`. Shortcut di `hooks/useEditorShortcuts.js` (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Ctrl+Y); shortcut mati saat fokus di input/textarea/select.

## 4. Titik yang masih spesifik per tipe

Tiga titik hardcode lama (`Editor.jsx` nodeTypes/edgeTypes/onDrop/renderSidebar/tips/defaultEdgeOptions, `editorStore.onConnect`, `EditorHeader` `type === "erd"` dan `isFlowchart`/`isUseCase`) **sudah hilang**: dipindah ke `config/editorTypes.jsx` dan `config/connectStrategies.js`.

| Lokasi | Hal |
|--------|-----|
| `store/editorStore.js` | Action tambah node per tipe tetap terpisah (`addTable`, `addFlowNode`, `addUseCaseNode`, `addStateMachineNode`, `addArchitectureNode`) dan direferensikan dari `EDITOR_TYPES[<id>].addNode` — bukan percabangan tipe di dalam action. |
| `components/editor/EditorHeader.jsx` | Handler export SQL/JSON tetap di-gate `exports.*`; hanya `handleExportSQL`/`handleExportJSON` yang secara intrinsik milik ERD/Use Case. |
| `utils/useCaseJson.js` | Validasi import hardcode `meta.type !== "usecase"` (hanya dipakai jalur export JSON usecase). |
| `utils/exportImage.js` | Filter badge peringatan berbasis atribut `title` (Flowchart + State Machine + Architecture). Registry tidak menyimpan daftar judul; menambah tipe berperingatan baru = menambah satu prefix di sini (Architecture memakai satu prefix `Architecture:` untuk semua pesannya). |

Selain itu, pemilihan label/badge/ikon/field DB/export/tombol, layout editor, sidebar, tips, overlay marker, dan perilaku koneksi sudah lewat registry.

## 5. Checklist menambah tipe diagram baru (`<id>`)

1. `src/config/diagramTypes.js` — tambah entri `DIAGRAM_TYPES[<id>]` (lengkapi `dataShape`, `hasDbType`, `exports`, `icon`); tambahkan test di `tests/diagramTypes.test.js` (termasuk urutan `DIAGRAM_TYPE_LIST`).
2. `src/config/<id>Types.js` — konstanta node/edge tipe (pola `useCaseTypes.js` / `stateMachineTypes.js` / `architectureTypes.js`). Bebas JSX; simpan ukuran default, label default, field tambahan per subtype, dan daftar palet di sini.
3. `src/components/editor/<Id>Node.jsx` (+ `<Id>Edge.jsx`, `<Id>Sidebar.jsx`, `<Id>Markers.jsx` bila perlu) — drag source pakai `dataTransfer` key `application/reactflow`.
4. `src/store/editorStore.js` — action tambah node (pola `addFlowNode`/`addStateMachineNode`/`addArchitectureNode`) + action edit field edge bila edge punya data custom (pola `setStateMachineEdgeLabel` / `setArchitectureEdgeData`, `commitHistory('typing')`).
5. `src/config/connectStrategies.js` — satu strategi `CONNECT_STRATEGIES[<id>]`.
6. `src/config/editorTypes.jsx` — satu entri `EDITOR_TYPES[<id>]` (sidebar, nodeTypes, edgeTypes, defaultEdge, addNode, tips, overlays). **`pages/Editor.jsx` tidak perlu diubah.**
7. Test baru: `tests/editorStore.<id>.test.jsx` (atau `.js` bila tak import JSX), plus kasus di `tests/roundtrip.test.js`. Korespondensi registry ↔ `EDITOR_TYPES` ↔ `CONNECT_STRATEGIES` sudah diawasi `tests/editorStore.statemachine.test.jsx`.
8. Jalankan `npm test` dan `npx vite build`.

**Tipe berperingatan** (`src/utils/<id>Validation.js`): semua pesan berprefix satu string tipe (pola `Architecture: `) supaya `utils/exportImage.js` hanya perlu menambah satu baris `title.startsWith("<Type>:")`.

**Halaman non-editor** (`ProjectDetail` grid kartu, `Home` badge) membaca registry, jadi tidak perlu disentuh per tipe — cukup cek layout saat jumlah tipe bertambah (grid ProjectDetail memakai `xl:grid-cols-5`).

### Catatan: langkah kini lebih singkat dari saat State Machine
State Machine adalah tipe pertama yang memakai `EDITOR_TYPES`/`CONNECT_STRATEGIES`; pembuatan kedua file itu ikut tercatat di commit yang sama, jadi waktu itu juga menyentuh `pages/Editor.jsx` dan `EditorHeader` (`6b15593`, −76 baris di `Editor.jsx`). Setelah pemisahan itu selesai, Architecture hanya menambah entri ke dua file config tersebut — **`Editor.jsx` dan `EditorHeader.jsx` tidak diubah sama sekali**, begitu pula `onNodesChange`/`onEdgesChange`/`onConnect` di store (semua lewat `isGraphType` + lookup registry). Yang tetap harus ditulis per tipe: file konstanta, komponen node/edge/sidebar/markers, action store, strategi koneksi, validasi, dan test.

