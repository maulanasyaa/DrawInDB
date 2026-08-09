# DrawInDB

DrawInDB is an offline, native desktop application for visually designing databases. Think of it like drawDB, but built explicitly as a local-first application using the concept of local "vaults" for secure and rapid diagram management without relying on the cloud.

## Tech Stack
- **Desktop Shell**: Electron
- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Canvas Engine**: React Flow
- **Storage Engine**: electron-store + JSON file vaults
- **Packaging**: electron-builder

## The Vault Concept
DrawInDB operates on "Vaults" instead of cloud accounts. A Vault is simply a standard folder anywhere on your computer (e.g. `~/Documents/My Diagrams`). DrawInDB tracks its metadata via a hidden `.drawindb/config.json` folder and stores all diagrams locally as raw `.json` files. This means your data remains strictly on your device and can easily be tracked with Git or synced via Dropbox/iCloud.

## Supported Databases (Generators)
- **MySQL** / MariaDB
- **PostgreSQL**
- **SQLite**
- **Generic** (A flavor-agnostic format for basic structures)

## Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Save diagram |
| `Ctrl+\` / `Cmd+\` | Toggle sidebar |
| `Ctrl+D` / `Cmd+D` | Duplicate selected table |
| `Delete` / `Backspace` | Delete selected table/relationship |
| `Escape` | Deselect all / close panels |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom control |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/drawindb.git
cd drawindb

# Install dependencies
npm install

# Start the development server
# Wait for Vite to compile before the Electron app launches
npm run dev
```

## Build & Distribution

Packaging is handled by `electron-builder`.

**To build for macOS (requires a Mac):**
```bash
npm run dist:mac
```
Output will be in `release/` (e.g., `DrawInDB-1.0.0-mac.zip` and `.dmg`).

**To build for Windows:**
```bash
npm run dist:win
```
Output will be in `release/` (e.g., `DrawInDB-Setup-1.0.0.exe`).

*Note: For official distribution, code signing configurations must be added to the `electron-builder.yml` file.*

## License
MIT License
