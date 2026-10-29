# Audit: Diagram Type Branching (ERD / Flowchart / Use Case)

Generated: 2026-10-29
Scope: 9 related files + full `src/` search for type-branching patterns

---

## A. Metadata Tampilan (label, ikon, warna badge, deskripsi)

| File | Line | Fungsi |
|------|------|--------|
| src/components/editor/EditorHeader.jsx | 17–27 | Konstanta `TYPE_BADGE` & `TYPE_LABEL_BACK` memetakan tipe → label tampilan |
| src/components/editor/EditorHeader.jsx | 48–52 | Deteksi tipe dari `diagramMeta.type`, set `badgeText` & `backLabel` |
| src/components/editor/EditorHeader.jsx | 156–164 | Render badge tipe + badge `db_type` (hanya ERD) di header |
| src/pages/DiagramList.jsx | 25–37 | Registry `TYPE_LABELS`: singular/plural/placeholder per tipe |
| src/pages/DiagramList.jsx | 39–47 | Fungsi `getTypeLabel()` fallback untuk tipe tak dikenal |
| src/pages/DiagramList.jsx | 52, 63, 85 | Gunakan label per tipe di modal NewDiagramModal inline |
| src/pages/ProjectDetail.jsx | 84–101 | `renderCard()` dipanggil 3× dengan title, deskripsi, ikon per tipe |
| src/pages/Home.jsx | 98 | Badge sederhana: `type === "erd" ? "ERD" : "FLOWCHART"` (usecase tidak ditangani) |

---

## B. Pembuatan Diagram Baru (template file JSON awal)

| File | Line | Fungsi |
|------|------|--------|
| src/store/vaultStore.js | 396–414 | `createDiagram()`: bangun objek JSON awal; `meta.type` diisi dari argumen; ERD dapat `db_type`, flowchart/usecase tidak |
| src/pages/DiagramList.jsx | 49–108 | `NewDiagramModal` inline: field nama + DB engine (hanya ERD) → panggil `createDiagram(name, dbType)` |
| src/components/NewDiagramModal.jsx | 1–120 | Modal terpisah (legacy/hanya ERD): field nama + DB engine → navigate ke `/editor/${filename}` |

---

## C. Load / Save (struktur data yang dibaca/ditulis)

| File | Line | Fungsi |
|------|------|--------|
| src/store/editorStore.js | 55–91 | `loadDiagram()`: baca `tables`, `relationships`, `nodes`, `edges` dari file; set ke state terpisah |
| src/store/editorStore.js | 93–147 | `saveDiagram()`: tulis `tables`+`relationships` (ERD) ATAU `nodes`+`edges` (node-based) berdasarkan `diagramMeta.type` |
| src/store/editorStore.js | 211–228 | `onNodesChange()`: pakai `isNodeBasedType()` → apply ke `nodes` atau `tables` |
| src/store/editorStore.js | 231–241 | `onEdgesChange()`: pakai `isNodeBasedType()` → apply ke `flowEdges` atau `relationships` |
| src/store/editorStore.js | 243–285 | `onConnect()`: cabang 3 arah — usecase (type `usecase` + relType), flowchart (type `smoothstep` + label Yes/No), ERD (plain) |
| src/store/vaultStore.js | 56–65 | Migrasi legacy: set `parsed.meta.type = 'erd'` hardcoded untuk file lama |
| src/store/vaultStore.js | 101–105 | Load daftar diagram: baca `dContent.meta.type || 'erd'` sebagai fallback |
| src/store/vaultStore.js | 418–424 | Simpan metadata diagram baru: `type: newDiagram.meta.type` |
---

## D. Pilihan Komponen (nodeTypes, edgeTypes, sidebar, markers, edge options)

| File | Line | Fungsi |
|------|------|--------|
| src/pages/Editor.jsx | 28–36 | Registry `nodeTypes` {table, flowchart, usecase} & `edgeTypes` {usecase} |
| src/pages/Editor.jsx | 68–71 | Deteksi `diagramType`, set `isFlowchart`, `isUseCase`, `isNodeBased` |
| src/pages/Editor.jsx | 107–110 | `onDrop`: cabang `addUseCaseNode` / `addFlowNode` / `addTable` |
| src/pages/Editor.jsx | 143–148 | `renderSidebar()`: return `<UseCaseSidebar>` / `<FlowchartSidebar>` / `<Sidebar>` (ERD) |
| src/pages/Editor.jsx | 157–183 | Render `<UseCaseMarkers>` + tips banner per tipe |
| src/pages/Editor.jsx | 186–187 | `<ReactFlow nodes={isNodeBased ? nodes : tables} edges={isNodeBased ? flowEdges : relationships}>` |
| src/pages/Editor.jsx | 193–194 | `defaultEdgeOptions`: `{type: "usecase"}` untuk usecase, `{type: "smoothstep"}` untuk lain |
| src/pages/Editor.jsx | 122–133 | `onNodeClick` / `onPaneClick`: hanya set `selectedTableId` jika **bukan** node-based |
| src/store/editorStore.js | 12 | Helper `isNodeBasedType(type)` → `type === 'flowchart' \|\| type === 'usecase'` |
| src/store/editorStore.js | 152, 256 | `addFlowNode` set `type: 'flowchart'`; `onConnect` flowchart cabang label Yes/No |

---

## E. Export (SQL, PNG, JSON)

| File | Line | Fungsi |
|------|------|--------|
| src/components/editor/EditorHeader.jsx | 54–78 | `handleExportSQL()`: hanya ERD — generate `CREATE TABLE` dari `tables` |
| src/components/editor/EditorHeader.jsx | 80–96 | `handleExportJSON()`: hanya Use Case — pakai `buildUseCaseExport(nodes, flowEdges)` |
| src/components/editor/EditorHeader.jsx | 98–110 | `handleExportImage()`: pilih `tables` (ERD) atau `nodes` (flowchart/usecase) |
| src/components/editor/EditorHeader.jsx | 178–187 | Tombol **Export PNG** tampil untuk `isERD \|\| isFlowchart` (usecase **tidak**) |
| src/components/editor/EditorHeader.jsx | 189–198 | Tombol **Export SQL** tampil hanya `isERD` |
| src/components/editor/EditorHeader.jsx | 200–226 | Tombol **Import/Export JSON** tampil hanya `isUseCase` |
| src/utils/exportImage.js | 100–101 | `exportNodes = type === "erd" ? tables : nodes` |
| src/utils/exportImage.js | 261–270 | Filter SVG: skip warning icon milik `FlowchartNode` (title-based) |

---

## F. Lainnya

| File | Line | Fungsi |
|------|------|--------|
| src/App.jsx | 82, 99 | Komentar rute menyebut "ERD / Flowchart" (usecase tidak disebut) |
| src/components/DiagramCard.jsx | 40–46 | Warna badge berdasarkan `db_type` (MySQL/PostgreSQL/SQLite/Generic) — **bukan** tipe diagram |
| src/utils/useCaseJson.js | 58–62 | Validasi import: `raw.meta.type !== "usecase"` → throw error |

---

## Variasi Penulisan String Tipe

| Variasi | Ditemukan di | Catatan |
|---------|--------------|---------|
| `'erd'` | Seluruh codebase | Standar, lowercase |
| `'flowchart'` | Seluruh codebase | Standar, lowercase |
| `'usecase'` | Seluruh codebase | Standar, lowercase **tanpa underscore** |
| `'use_case'` | **Tidak ditemukan** | — |
| `'useCase'` | **Tidak ditemukan** (kecuali konstanta `USECASE_*`) | Konstanta `USECASE_NODE_TYPES` dll. adalah UPPER_SNAKE_CASE |

> **Kesimpulan**: Hanya satu variasi dipakai per tipe: `erd`, `flowchart`, `usecase`. Tidak ada inkonsistensi penulisan string.

---

## Field `meta` / Diagram JSON Spesifik per Tipe

| Tipe | Field `meta` | Field Data Utama |
|------|--------------|------------------|
| ERD | `type: "erd"`, `db_type`, `name`, `created_at`, `updated_at`, `projectId` | `tables[]`, `relationships[]` |
| Flowchart | `type: "flowchart"`, `name`, `created_at`, `updated_at`, `projectId` | `nodes[]`, `edges[]` (disimpan sebagai `flowEdges` di store) |
| Use Case | `type: "usecase"`, `name`, `created_at`, `updated_at`, `projectId` | `nodes[]`, `edges[]` (disimpan sebagai `flowEdges` di store), state `usecaseRelType` |

> **Catatan**: File JSON menyimpan `edges` tapi store memakai `flowEdges` — mapping terjadi di `loadDiagram()` (line 78) dan `saveDiagram()`.

---

## 5 Risiko / Kejanggalan

1. **Duplikasi helper `isNodeBasedType`**  
   - Definisi di `editorStore.js:12` **dan** inline di `Editor.jsx:71`. Jika salah satu berubah, yang lain jadi stale.

2. **Export PNG tidak tersedia untuk Use Case**  
   - `EditorHeader.jsx:178` guard `(isERD || isFlowchart)` — usecase terlewat tanpa alasan teknis yang jelas.

3. **Modal NewDiagramModal ganda**  
   - `DiagramList.jsx` punya inline modal yang support 3 tipe; `NewDiagramModal.jsx` terpisah hanya ERD. Keduanya dipakai di tempat berbeda → maintenance burden.

4. **Migrasi legacy hardcode `'erd'`**  
   - `vaultStore.js:62` set `parsed.meta.type = 'erd'` untuk semua file lama. Tidak ada deteksi tipe sebenarnya (meski memang legacy hanya ERD).

5. **Inkonsistensi nama field `edges` vs `flowEdges`**  
   - File JSON: `edges` → Store: `flowEdges` → `saveDiagram()` tulis kembali sebagai `edges`. Mapping manual rawan typo.

6. **Home.jsx badge tidak handle usecase**  
   - Line 98: ternary `type === "erd" ? "ERD" : "FLOWCHART"` — usecase akan salah label "FLOWCHART".

7. **DiagramCard.jsx tidak menampilkan tipe diagram**  
   - Badge hanya `db_type` (MySQL/PostgreSQL/etc). User tidak bisa membedakan ERD vs Flowchart vs Use Case dari kartu.

---

## Files Covered in This Audit

- [x] src/store/editorStore.js
- [x] src/store/vaultStore.js
- [x] src/pages/Editor.jsx
- [x] src/pages/ProjectDetail.jsx
- [x] src/pages/DiagramList.jsx
- [x] src/components/DiagramCard.jsx
- [x] src/components/NewDiagramModal.jsx
- [x] src/components/editor/EditorHeader.jsx
- [x] src/utils/exportImage.js