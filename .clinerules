# DrawInDB — Aturan Kerja

DrawInDB: aplikasi Electron lokal untuk diagram (ERD, Flowchart, Use Case).
Diagram disimpan sebagai JSON di "Vault" (folder yang dipilih user).
Stack: Electron 30 + React 18 + Vite 5 + Zustand 4 + React Flow 11 + Tailwind 4. Test: Vitest (`npm test`).

## Tipe Diagram
- Tipe baru WAJIB didaftarkan di `src/config/diagramTypes.js` (satu entri di registry).
- JANGAN menulis percabangan `type === 'erd'` / `'flowchart'` / `'usecase'` di tempat lain.
- Pakai helper: `getDiagramType(id)`, `isGraphType(id)`, `isErdType(id)`.
- Baca perilaku dari entri registry (`dataShape`, `hasDbType`, `exports`), bukan string tipe.

## Data
- JANGAN mengubah format JSON diagram yang sudah ada.
- Perubahan skema harus backward compatible dan disertai migrasi (contoh: migrasi legacy di `src/store/vaultStore.js`).
- File JSON menyimpan `edges`; store memakai `flowEdges`. Mapping hanya di `loadDiagram()` / `saveDiagram()`.

## Keamanan Electron
- Semua akses file lewat IPC yang divalidasi di main process (`assertVaultAccess` / `isPathInVault` di `electron/main.js`). Renderer tidak menyentuh `fs`.
- JANGAN aktifkan `nodeIntegration`. Pertahankan `contextIsolation: true` dan API preload (`window.api`).

## Aturan Kerja
- Sebelum selesai jalankan `npm test` dan `npx vite build`; keduanya harus hijau.
- Tambahkan test untuk logika store/util baru (pola: `tests/*.test.js`, environment node).
- JANGAN menjalankan dev server.
- Laporkan kejanggalan yang ditemukan; jangan diperbaiki di luar lingkup tugas.

## Laporan Akhir
- Ringkas, maksimal 10 baris: apa yang diubah, hasil test/build, kejanggalan.

Rujukan arsitektur: `docs/architecture.md` (audit historis: `docs/refactor/p0-audit.md`).
