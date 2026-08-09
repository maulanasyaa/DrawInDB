# App Icons

Replace these placeholder files with actual DrawInDB icons.

## Required sizes:
- icon.icns: macOS — use `iconutil` to generate from 512x512 PNG
- icon.ico: Windows — use a tool like https://convertico.com

## Quick generation from a single PNG:
npm install -g electron-icon-builder
electron-icon-builder --input=icon-source.png --output=build/