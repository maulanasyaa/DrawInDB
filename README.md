# DrawInDB

[![CI](https://github.com/maulanasyaa/DrawInDB/actions/workflows/ci.yml/badge.svg)](https://github.com/maulanasyaa/DrawInDB/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/maulanasyaa/DrawInDB?label=Release)](https://github.com/maulanasyaa/DrawInDB/releases)

DrawInDB is an offline, native desktop application for visually designing databases — an open alternative to drawDB, built local-first. All data stays on your machine in a **Vault** (a plain folder), so it is easy to back up, track with Git, or sync via Dropbox/iCloud.

## Features

- **7 diagram types**: ERD, Flowchart, Use Case, State Machine, Architecture, Sequence, and API Contract (OpenAPI)
- **SQL generation** for MySQL/MariaDB, PostgreSQL, SQLite, and generic SQL with a live preview panel
- **Export**: PNG image, SQL, and JSON (import/export for Use Case & OpenAPI)
- **Vaults**: local folders, zero cloud dependency, Git-friendly JSON files
- **Docs**: built-in PRD documents with editable sections and user stories
- Keyboard shortcuts, dark/light theme, undo/redo, minimap

## Tech Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 30 |
| Frontend | React 18, Vite 5 |
| Styling | Tailwind CSS v4 |
| State | Zustand 4 |
| Canvas | React Flow 11 |
| Storage | electron-store + JSON file vaults |
| Packaging | electron-builder 24 |

## Getting Started

```bash
git clone https://github.com/maulanasyaa/DrawInDB.git
cd DrawInDB
npm install

# Dev: Vite dev server + Electron
npm run dev
```

> Note: `npm run dev` starts Vite (port 5173) and waits before launching Electron.

## Testing & Building

```bash
# Run the full test suite (Vitest)
npm test

# With coverage
npm run test:coverage

# Build renderer bundle
npm run build
```

## Build & Distribution

Packaging is handled by `electron-builder`; artifacts are written to `release/`.

| Platform | Command |
|---|---|
| macOS (DMG, arm64 + x64) | `npm run dist:mac` |
| Windows (NSIS installer) | `npm run dist:win` |

On every tag `v*`, GitHub Actions builds both installers and attaches them to a GitHub Release automatically — see [Releases](https://github.com/maulanasyaa/DrawInDB/releases).

## Installation

DrawInDB is distributed **unsigned**, so your OS may show a security warning on first launch — this is expected.

**macOS**
1. Open the `.dmg`, drag **DrawInDB.app** into Applications.
2. If you see _"unidentified developer"_, run in Terminal:
   ```bash
   xattr -cr /Applications/DrawInDB.app
   ```
   Then open the app from Launchpad/Finder.
3. Alternative: right-click the DMG → **Open** → **Open Anyway**.

**Windows**
1. Run `DrawInDB-Setup-*.exe`.
2. If SmartScreen appears, click **More info** → **Run anyway**.

> No auto-update yet — download the latest version from [Releases](https://github.com/maulanasyaa/DrawInDB/releases).

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Save diagram |
| `Ctrl+\` / `Cmd+\` | Toggle sidebar |
| `Ctrl+D` / `Cmd+D` | Duplicate selected table |
| `Delete` / `Backspace` | Delete selected table/relationship |
| `Escape` | Deselect all / close panels |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom control |

## License

[MIT](LICENSE) © 2026 Maulana Syarip Abdurahman
