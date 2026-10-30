# Arsitektur DrawInDB

Deskripsi kode saat ini (per 2026-10-30), bukan target.

## 1. Struktur Vault → Project → Diagram
```
<Vault>/
  .drawindb/config.json          { vault_name, created_at, version, migrated }
  projects/<projId>/project.json { id, name, createdAt, updatedAt }
  projects/<projId>/diagrams/<safeName>_<type>.json
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

Semua field ditulis `saveDiagram()`; tipe yang tidak memakai `tables` menulis array kosong. `canvas` legacy berformat `{pan:{x,y},zoom}` dinormalisasi saat load.

## 2. Registry tipe: `src/config/diagramTypes.js`
Entri `DIAGRAM_TYPES[<id>]`:
`id`, `label`, `labelPlural`, `placeholder`, `badge`, `backLabel`, `description`, `icon`, `dataShape` (`tables` | `graph`), `hasDbType`, `exports` `{ png, sql, json }`.

Saat ini: `erd` (tables, hasDbType, png+sql), `flowchart` (graph, png), `usecase` (graph, json), `statemachine` (graph, png).

Helper: `getDiagramType(id)` (fallback ke `DEFAULT_DIAGRAM_TYPE = 'erd'` bila id tak dikenal/undefined), `isGraphType(id)`, `isErdType(id)`, `DIAGRAM_TYPE_LIST` (urutan render kartu).

Pemakai: `EditorHeader` + `DiagramCard` + `DiagramList` (`getDiagramType` → `hasDbType`, `exports`), `ProjectDetail` (`DIAGRAM_TYPE_LIST`, grid 4 kartu), `Home` (`getDiagramType().badge`, urutan badge dari `DIAGRAM_TYPE_LIST`).

### 2a. Config editor per tipe: `src/config/editorTypes.jsx`
Pemisahan supaya `diagramTypes.js` tetap bebas JSX. `EDITOR_TYPES[<id>]`:
`sidebar`, `nodeTypes`, `edgeTypes`, `defaultEdge`, `addNode(type, position)`, `tips`, `overlays`.
Helper: `getEditorConfig(id)` (fallback entri `erd`). `Editor.jsx` hanya membaca config ini — tidak ada `nodeTypes`/`renderSidebar`/`onDrop` per tipe di sana.
`tests/editorStore.statemachine.test.jsx` menjaga korespondensi: setiap id di `DIAGRAM_TYPES` punya entri `EDITOR_TYPES` dan strategi `CONNECT_STRATEGIES` (dan sebaliknya).

### 2b. Strategi koneksi per tipe: `src/config/connectStrategies.js`
`CONNECT_STRATEGIES[<id>](connection, { get })` mengembalikan patch state (`{ flowEdges?, tables?, relationships? }`) atau `null` (ditolak). Store hanya me-lookup lewat `getDiagramType(type).id` lalu men-set patch + satu snapshot history. `erd` memakai FK/`clearOrphanFk`, `flowchart` label Yes/No, `usecase` `data.relType`, `statemachine` edge `type:'statemachine'` tanpa dedupe (mengizinkan beberapa transition & self-transition).

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
| `store/editorStore.js` | Action tambah node per tipe tetap terpisah (`addTable`, `addFlowNode`, `addUseCaseNode`, `addStateMachineNode`) dan direferensikan dari `EDITOR_TYPES[<id>].addNode` — bukan percabangan tipe di dalam action. |
| `components/editor/EditorHeader.jsx` | Handler export SQL/JSON tetap di-gate `exports.*`; hanya `handleExportSQL`/`handleExportJSON` yang secara intrinsik milik ERD/Use Case. |
| `utils/useCaseJson.js` | Validasi import hardcode `meta.type !== "usecase"` (hanya dipakai jalur export JSON usecase). |
| `utils/exportImage.js` | Filter badge peringatan berbasis atribut `title` (Flowchart + State Machine). Registry tidak menyimpan daftar judul; menambah tipe berperingatan baru = menambah satu prefix di sini. |

Selain itu, pemilihan label/badge/ikon/field DB/export/tombol, layout editor, sidebar, tips, overlay marker, dan perilaku koneksi sudah lewat registry.

## 5. Checklist menambah tipe diagram baru (`<id>`)

1. `src/config/diagramTypes.js` — tambah entri `DIAGRAM_TYPES[<id>]` (lengkapi `dataShape`, `hasDbType`, `exports`, `icon`); tambahkan test di `tests/diagramTypes.test.js` (termasuk urutan `DIAGRAM_TYPE_LIST`).
2. `src/config/<id>Types.js` — konstanta node/edge tipe (pola `useCaseTypes.js` / `stateMachineTypes.js`). Bebas JSX.
3. `src/components/editor/<Id>Node.jsx` (+ `<Id>Edge.jsx`, `<Id>Sidebar.jsx`, `<Id>Markers.jsx` bila perlu) — drag source pakai `dataTransfer` key `application/reactflow`.
4. `src/store/editorStore.js` — action tambah node (pola `addFlowNode`/`addStateMachineNode`).
5. `src/config/connectStrategies.js` — satu strategi `CONNECT_STRATEGIES[<id>]`.
6. `src/config/editorTypes.jsx` — satu entri `EDITOR_TYPES[<id>]` (sidebar, nodeTypes, edgeTypes, defaultEdge, addNode, tips, overlays). **`pages/Editor.jsx` tidak perlu diubah.**
7. Test baru: `tests/editorStore.<id>.test.jsx` (atau `.js` bila tak import JSX), plus kasus di `tests/roundtrip.test.js`. Korespondensi registry ↔ `EDITOR_TYPES` ↔ `CONNECT_STRATEGIES` sudah diawasi `tests/editorStore.statemachine.test.jsx`.
8. Jalankan `npm test` dan `npx vite build`.

7. Test: tambah kasus roundtrip di `tests/roundtrip.test.js` + store test baru; jalankan `npm test` dan `npx vite build`.
