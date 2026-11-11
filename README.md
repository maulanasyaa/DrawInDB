<div align="center">

  <h1>🗄️ DrawInDB</h1>

  <p>Offline, native desktop app for visually designing databases — local-first, no cloud.</p>

  [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![GitHub last commit](https://img.shields.io/github/last-commit/maulanasyaa/DrawInDB)](https://github.com/maulanasyaa/DrawInDB/commits/main)
  [![Build Status](https://img.shields.io/github/actions/workflow/status/maulanasyaa/DrawInDB/ci.yml?branch=main)](https://github.com/maulanasyaa/DrawInDB/actions)

  <br/>

  <a href="#️-download">Download</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-testing--build">Testing & Build</a> •
  <a href="#-license">License</a>

  <br/>

</div>

---

**DrawInDB** adalah aplikasi desktop untuk memvisualisasikan desain database secara offline. Diagram dan dokumen disimpan sebagai file JSON lokal di dalam **Vault** (folder pilihan Anda), sehingga data sepenuhnya milik Anda dan mudah dilacak dengan Git, di-backup, atau disinkronkan via Dropbox/iCloud.

---
![Downloads](https://img.shields.io/github/downloads/maulanasyaa/DrawInDB/total?style=flat&label=Downloads)
---

## ⬇️ Download

| Platform | Download |
|---|---|
| macOS (Apple Silicon) | [DrawInDB-1.0.0-arm64.dmg](https://github.com/maulanasyaa/DrawInDB/releases/latest) |
| macOS (Intel) | [DrawInDB-1.0.0.dmg](https://github.com/maulanasyaa/DrawInDB/releases/latest) |
| Windows | [DrawInDB.Setup.1.0.0.exe](https://github.com/maulanasyaa/DrawInDB/releases/latest) |

> **Note:** DrawInDB is not code-signed. You may need to bypass OS security warnings on first launch.

### macOS

Run the following command in Terminal after installing:

```bash
xattr -cr /Applications/DrawInDB.app
```

### Windows

Click **"More info"** → **"Run anyway"** when the SmartScreen prompt appears.

---

## ✨ Features

### 🎨 Diagram Types
- **ERD** — Model database relasional dengan dukungan SQL generator (MySQL/MariaDB, PostgreSQL, SQLite, Generic).
- **Flowchart & Use Case** — Buat alur proses dan use case diagram.
- **State Machine** — Model state, transisi, dan choice.
- **Architecture** — Gambarkan sistem, kontainer, dan batasan (boundary).
- **Sequence** — Diagram urutan dengan participants, messages, dan option.
- **API Contract (OpenAPI)** — Desain skema endpoint, export/import OpenAPI.

### ⚡ Productivity
- **SQL Preview** — Lihat hasil `CREATE TABLE` secara real-time.
- **Export PNG** — Ekspor diagram sebagai gambar.
- **Docs / PRD** — Dokumen PRD per project dengan sections dan user stories.

### 🔒 Privacy & Data Control
- **100% Offline-First** — Semua data tersimpan lokal di mesin Anda, tanpa cloud pihak ketiga.
- **Vaults** — Folder biasa + metadata `.drawindb/config.json`; data diagram berupa `.json` mentah yang Git-friendly.
- **Export/Import JSON** — Pindahkan diagram antar perangkat dengan mudah.

### 🎨 Premium Experience
- **Fluid Animations** — Transisi halus didukung Framer Motion.
- **Dark/Light Theme** — Dukungan tema penuh.
- **Keyboard Shortcuts** — Navigasi cepat untuk save, duplicate, zoom, dan lainnya.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Core | [Electron](https://www.electronjs.org/) |
| Frontend | [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| State Management | [Zustand](https://github.com/pmndrs/zustand) |
| Canvas | [React Flow](https://reactflow.dev/) |
| Storage | electron-store + JSON file vaults |
| Testing | [Vitest](https://vitest.dev/) |
| Packaging | [electron-builder](https://www.electron.build/) |

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/maulanasyaa/DrawInDB.git
cd DrawInDB

# 2. Install dependencies
npm install

# 3. Start development server (Vite + Electron)
npm run dev
```

---

## 🧪 Testing & Build

```bash
# Run the full test suite (Vitest)
npm test

# With coverage
npm run test:coverage

# Build renderer bundle
npm run build
```

---

## 📦 Packaging & Build

```bash
# Build for macOS (DMG, arm64 + x64) — requires macOS
npm run dist:mac

# Build for Windows (NSIS installer)
npm run dist:win
```

Pada setiap tag `v*`, GitHub Actions otomatis membangun kedua installer dan menempelkannya ke GitHub Release — lihat [Releases](https://github.com/maulanasyaa/DrawInDB/releases).

---

## 📄 License

[MIT](LICENSE) © 2026 Maulana Syarip Abdurahman
