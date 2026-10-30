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

Semua field ditulis `saveDiagram()`; tipe yang tidak memakai `tables` menulis array kosong. `canvas` legacy berformat `{pan:{x,y},zoom}` dinormalisasi saat load.

## 2. Registry tipe: `src/config/diagramTypes.js`
Entri `DIAGRAM_TYPES[<id>]`:
`id`, `label`, `labelPlural`, `placeholder`, `badge`, `backLabel`, `description`, `icon`, `dataShape` (`tables` | `graph`), `hasDbType`, `exports` `{ png, sql, json }`.

Saat ini: `erd` (tables, hasDbType, png+sql), `flowchart` (graph, png), `usecase` (graph, json).

Helper: `getDiagramType(id)` (fallback ke `DEFAULT_DIAGRAM_TYPE = 'erd'` bila id tak dikenal/undefined), `isGraphType(id)`, `isErdType(id)`, `DIAGRAM_TYPE_LIST` (urutan render kartu).

Pemakai: `Editor.jsx` (`isGraphType`), `editorStore` (`isGraphType` di `onNodesChange`/`onEdgesChange`), `EditorHeader` + `DiagramCard` + `DiagramList` (`getDiagramType` → `hasDbType`, `exports`), `ProjectDetail` (`DIAGRAM_TYPE_LIST`), `Home` (`badge`).

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

## 4. Masih spesifik per tipe (belum lewat registry)
| Lokasi | Hal |
|--------|-----|
| `pages/Editor.jsx:29-37` | `nodeTypes` {table, flowchart, usecase} & `edgeTypes` {usecase} hardcoded |
| `pages/Editor.jsx:70-72` | `isFlowchart`/`isUseCase` dari string tipe; `isNodeBased` dari `isGraphType` |
| `pages/Editor.jsx:108-116` | `onDrop` → `addUseCaseNode` / `addFlowNode` / `addTable` |
| `pages/Editor.jsx:144-149` | `renderSidebar` → `<UseCaseSidebar>` / `<FlowchartSidebar>` / `<Sidebar>` |
| `pages/Editor.jsx:158-184,194-196` | `<UseCaseMarkers>`, tips banner per tipe, `defaultEdgeOptions` |
| `store/editorStore.js:335-388` | `addFlowNode` (peta subtype→ukuran flowchart) dan `addUseCaseNode` (pakai `config/useCaseTypes.js`) |
| `store/editorStore.js:461-549` | `onConnect` cabang `usecase` (relType) / `flowchart` (label Yes/No) / sisanya ERD (FK, tipe kolom, `clearOrphanFk`) |
| `components/editor/EditorHeader.jsx:36-110` | Handler export: `handleExportSQL` (ERD), `handleExportJSON` + import (usecase, `utils/useCaseJson.js`), `handleExportImage` (`type === "erd" ? tables : nodes`). Tombolnya sendiri sudah pakai `typeConfig.exports`. |
| `utils/exportImage.js:261-270` | Filter ikon warning khusus `FlowchartNode` (berbasis atribut `title`) |
| `utils/useCaseJson.js:58` | Validasi import hardcode `meta.type !== "usecase"` |

Selain tabel ini, pemilihan label/badge/ikon/field DB/export/tombol sudah lewat registry.

## 5. Checklist menambah tipe diagram baru (`<id>`)

1. `src/config/diagramTypes.js` — tambah entri `DIAGRAM_TYPES[<id>]` (lengkapi `dataShape`, `hasDbType`, `exports`, `icon`); tambahkan test di `tests/diagramTypes.test.js`.
2. `src/components/editor/<Id>Node.jsx` (+ `<Id>Edge.jsx` bila perlu edge kustom) + sidebar drag source (`dataTransfer` key `application/reactflow`, lihat `FlowchartSidebar.jsx`).
3. `src/pages/Editor.jsx` — daftarkan `nodeTypes`/`edgeTypes`, `onDrop`, `renderSidebar`, overlay/tips bila perlu.
4. `src/store/editorStore.js` — action tambah node/edge dan cabang `onConnect` bila perilaku edge berbeda.
5. `src/components/editor/EditorHeader.jsx` — handler export untuk `exports` yang diaktifkan (mis. `json`).
6. `src/pages/Home.jsx`/`ProjectDetail.jsx`/`DiagramList.jsx` — hanya jika butuh penyesuaian tampilan (umumnya sudah registry-driven).
7. Test: tambah kasus roundtrip di `tests/roundtrip.test.js` + store test baru; jalankan `npm test` dan `npx vite build`.
