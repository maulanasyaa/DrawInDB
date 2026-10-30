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
| `sequence` | — | `participants[]` + `messages[]` + `options` (BUKAN nodes/edges; lihat §1b) |

Semua field ditulis `saveDiagram()`; tipe yang tidak memakai `tables` menulis array kosong. `canvas` legacy berformat `{pan:{x,y},zoom}` dinormalisasi saat load.

### 1b. Diagram Sequence — satu-satunya tipe non-React-Flow
`dataShape: 'sequence'`. Model berurutan, bukan posisi bebas: urutan array = urutan tampil, layout dihitung ulang setiap render (`utils/sequence.js`). File:

```json
{
  "version": "1.0",
  "meta": { "name", "type": "sequence", "projectId", "created_at", "updated_at" },
  "canvas": { "x", "y", "zoom" },
  "tables": [], "relationships": [], "nodes": [], "edges": [],
  "participants": [ { "id", "name", "kind" } ],
  "messages": [ { "id", "from", "to", "label", "kind" } ],
  "options": { "showNumbers": false }
}
```

- `participants[].kind`: `participant | actor | database | external`. `messages[].kind`: `sync | async | return | self`.
- Tiga field tambahan hanya ditulis bila `getDiagramType(type).dataShape === 'sequence'`; file lima tipe lama tetap 7 kunci (`tests/roundtrip.test.js`).
- `loadDiagram` menormalkan lewat `normalizeSequence()` untuk **semua** tipe (default `[]`/`[]`/`{showNumbers:false}`), jadi file rusak/field hilang tidak crash dan state lama tidak terbawa. Pesan yang merujuk peserta hilang **dipertahankan** (nomor urut stabil), dirender dilewati, diberi peringatan.
- Layout murni (`layoutSequence`, tanpa DOM): pitch kolom dari lebar nama terpanjang, tinggi baris tetap, self-message = loop di kanan garis hidup, pesan kanan→kiri benar.
- Store: `participants`, `messages`, `sequenceOptions`, `selectedSequenceItem`; `participants`/`messages` ikut snapshot history, opsi + seleksi tidak. Hapus peserta menghapus pesannya dalam **satu** snapshot.
- Renderer `SequenceCanvas.jsx` (SVG sendiri, zoom lokal — tidak lewat `updateCanvas`, yang akan menyalakan "Unsaved changes" saat scroll). Export PNG lewat `editorConfig.exportPng` (`utils/sequenceExport.js`, clone SVG + buang `.seq-ui`).

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
- IPC hapus: `deleteProject`/`deleteDiagram`/`deleteDocument` memakai `window.api.trashPath` → `fs:trashPath` → `electron/pathGuard.js` → `shell.trashItem` (pindah ke Trash OS, bisa dipulihkan). Guard menerima **hanya** `<vault>/projects/<projectId>/…`: ditolak vault root, folder `projects/`, `.drawindb/`, path traversal, dan symlink yang keluar dari project (cek realpath + project id harus sama). Vault root diambil dari state main process, bukan dari renderer. Ketiga action melempar error ke UI (toast); `fs:deleteFile`/`fs:deleteDirectory` tetap ada hanya untuk migrasi legacy.

## 2. Registry tipe: `src/config/diagramTypes.js`
Entri `DIAGRAM_TYPES[<id>]`:
`id`, `label`, `labelPlural`, `placeholder`, `badge`, `backLabel`, `description`, `icon`, `dataShape` (`tables` | `graph` | `sequence`), `hasDbType`, `exports` `{ png, sql, json }`.

Saat ini: `erd` (tables, hasDbType, png+sql), `flowchart` (graph, png), `usecase` (graph, json), `statemachine` (graph, png), `architecture` (graph, png), `sequence` (sequence, png).

Helper: `getDiagramType(id)` (fallback ke `DEFAULT_DIAGRAM_TYPE = 'erd'` bila id tak dikenal/undefined), `isGraphType(id)`, `isErdType(id)`, `isSequenceType(id)`, `DIAGRAM_TYPE_LIST` (urutan render kartu).

Pemakai: `EditorHeader` + `DiagramCard` + `DiagramList` (`getDiagramType` → `hasDbType`, `exports`), `ProjectDetail` (`DIAGRAM_TYPE_LIST`, grid 6 kartu: `xl:grid-cols-3` → dua baris tiga), `Home` (`getDiagramType().badge`, urutan badge dari `DIAGRAM_TYPE_LIST`; badge `flex-wrap` jadi 6 tipe tidak meluber).

### 2a. Config editor per tipe: `src/config/editorTypes.jsx`
Pemisahan supaya `diagramTypes.js` tetap bebas JSX. `EDITOR_TYPES[<id>]`:
`sidebar`, `nodeTypes`, `edgeTypes`, `defaultEdge`, `addNode(type, position)`, `tips`, `overlays`, plus dua kunci **opsional**: `canvas` (komponen kanvas pengganti `<ReactFlow>`) dan `exportPng` (fungsi export PNG sendiri).
Helper: `getEditorConfig(id)` (fallback entri `erd`). `Editor.jsx` hanya membaca config ini — tidak ada `nodeTypes`/`renderSidebar`/`onDrop` per tipe di sana; kanvas dipilih lewat `editorConfig.canvas ?? ReactFlowCanvas` (bukan cek nama tipe). `ReactFlowCanvas.jsx` adalah blok `<ReactFlow>` lama yang dipindah apa adanya (menerima `{ editorConfig }`, membaca store sendiri, wajib berada di dalam `ReactFlowProvider`). `SequenceCanvas`/`SequenceSidebar` tidak boleh memanggil `useReactFlow()`.
`tests/editorStore.statemachine.test.jsx` menjaga korespondensi: setiap id di `DIAGRAM_TYPES` punya entri `EDITOR_TYPES` dan strategi `CONNECT_STRATEGIES` (dan sebaliknya).

### 2b. Strategi koneksi per tipe: `src/config/connectStrategies.js`
`CONNECT_STRATEGIES[<id>](connection, { get })` mengembalikan patch state (`{ flowEdges?, tables?, relationships? }`) atau `null` (ditolak). Store hanya me-lookup lewat `getDiagramType(type).id` lalu men-set patch + satu snapshot history. `erd` memakai FK/`clearOrphanFk`, `flowchart` label Yes/No, `usecase` `data.relType`, `statemachine` edge `type:'statemachine'` tanpa dedupe (mengizinkan beberapa transition & self-transition), `architecture` edge `data:{label,technology}` tanpa dedupe tapi **menolak self-loop** (return `null`), `sequence` selalu `null` (pesan ditambahkan lewat sidebar, bukan koneksi kanvas).

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

### 5a. Tipe React Flow (`dataShape` `tables`/`graph`)

1. `src/config/diagramTypes.js` — tambah entri `DIAGRAM_TYPES[<id>]` (lengkapi `dataShape`, `hasDbType`, `exports`, `icon`); tambahkan test di `tests/diagramTypes.test.js` (termasuk urutan `DIAGRAM_TYPE_LIST`).
2. `src/config/<id>Types.js` — konstanta node/edge tipe (pola `useCaseTypes.js` / `stateMachineTypes.js` / `architectureTypes.js`). Bebas JSX; simpan ukuran default, label default, field tambahan per subtype, dan daftar palet di sini.
3. `src/components/editor/<Id>Node.jsx` (+ `<Id>Edge.jsx`, `<Id>Sidebar.jsx`, `<Id>Markers.jsx` bila perlu) — drag source pakai `dataTransfer` key `application/reactflow`.
4. `src/store/editorStore.js` — action tambah node (pola `addFlowNode`/`addStateMachineNode`/`addArchitectureNode`) + action edit field edge bila edge punya data custom (pola `setStateMachineEdgeLabel` / `setArchitectureEdgeData`, `commitHistory('typing')`).
5. `src/config/connectStrategies.js` — satu strategi `CONNECT_STRATEGIES[<id>]`.
6. `src/config/editorTypes.jsx` — satu entri `EDITOR_TYPES[<id>]` (sidebar, nodeTypes, edgeTypes, defaultEdge, addNode, tips, overlays). **`pages/Editor.jsx` tidak perlu diubah.**
7. Test baru: `tests/editorStore.<id>.test.jsx` (atau `.js` bila tak import JSX), plus kasus di `tests/roundtrip.test.js`. Korespondensi registry ↔ `EDITOR_TYPES` ↔ `CONNECT_STRATEGIES` sudah diawasi `tests/editorStore.statemachine.test.jsx`.
8. Jalankan `npm test` dan `npx vite build`.

**Tipe berperingatan** (`src/utils/<id>Validation.js`): semua pesan berprefix satu string tipe (pola `Architecture: `) supaya `utils/exportImage.js` hanya perlu menambah satu baris `title.startsWith("<Type>:")`.

### 5b. Tipe non-React-Flow (`dataShape` `sequence`)

Sama seperti 5a untuk langkah 1, 5, 6, dan 8, dengan perbedaan:

- `src/utils/sequence.js` menggantikan `src/config/<id>Types.js` sebagai tempat layout murni (harus bebas DOM — test jalan di environment `node`).
- Tidak ada node/edge component. Sebagai gantinya satu `canvas` SVG di `EDITOR_TYPES[<id>].canvas` + `SequenceSidebar` untuk pengeditan model berurutan.
- `CONNECT_STRATEGIES[<id>]` tetap wajib ada (invariant test) — isi `() => null`.
- `src/store/editorStore.js` — field state baru **harus mendarat sebelum** komponen yang memakainya (`tests/storeContract.test.js` memindai `state.<nama>` di `src/` saat modul dimuat), dan harus ikut `captureSnapshot`/`_restoreSnapshot`/`cleanup`.
- `saveDiagram`/`createDiagram` menulis field tipe **setelah** literal objek (`if (isSeq) fileData.x = …`), bukan spread bernilai `undefined`, supaya file tipe lain tetap 7 kunci.
- Export PNG lewat `EDITOR_TYPES[<id>].exportPng`; `EditorHeader` memanggilnya **sebelum** guard "Nothing to export" (tipe ini tidak punya `nodes`).

**Halaman non-editor** (`ProjectDetail` grid kartu, `Home` badge) membaca registry, jadi tidak perlu disentuh per tipe — cukup cek layout saat jumlah tipe bertambah (grid ProjectDetail memakai `xl:grid-cols-3` untuk 6 kartu).

### Catatan: langkah kini lebih singkat dari saat State Machine
State Machine adalah tipe pertama yang memakai `EDITOR_TYPES`/`CONNECT_STRATEGIES`; pembuatan kedua file itu ikut tercatat di commit yang sama, jadi waktu itu juga menyentuh `pages/Editor.jsx` dan `EditorHeader` (`6b15593`, −76 baris di `Editor.jsx`). Setelah pemisahan itu selesai, Architecture hanya menambah entri ke dua file config tersebut — **`Editor.jsx` dan `EditorHeader.jsx` tidak diubah sama sekali**, begitu pula `onNodesChange`/`onEdgesChange`/`onConnect` di store (semua lewat `isGraphType` + lookup registry). Yang tetap harus ditulis per tipe: file konstanta, komponen node/edge/sidebar/markers, action store, strategi koneksi, validasi, dan test.

Sequence mengubah itu: tipe non-React-Flow memaksa `Editor.jsx` berubah **sekali** (blok `<ReactFlow>` dipindah ke `ReactFlowCanvas.jsx`, kanvas dipilih lewat `editorConfig.canvas`) dan `EditorHeader` berubah **sekali** (jalur `editorConfig.exportPng`). Keduanya config-driven, jadi tipe non-graph berikutnya cukup mengisi `canvas`/`exportPng` tanpa menyentuh dua file itu lagi.

