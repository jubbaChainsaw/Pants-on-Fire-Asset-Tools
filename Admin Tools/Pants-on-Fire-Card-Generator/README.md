# Pants on Fire! Asset Tools - Card Generator

Standalone admin tool for generating and exporting card assets.

## Purpose

This workspace is for admin/creator workflows and is intentionally separate from game runtime code.

Included systems:

- prompt matrix generation
- strict one-card artwork rules
- card-text generation by round-type structure
- deck exports (PNG, PDF, ZIP)
- theme and round-type editing
- localStorage persistence
- full JSON import/export

## Folder structure

- `src/` - app UI, data models, generators, exporters, storage
- `public/assets/` - logos, placeholder media, theme folders
- `src/data/defaultThemes.ts` - default theme definitions
- `src/data/defaultRoundTypes.ts` - default round-type definitions

## Quick start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- Tool title in-app: **Pants on Fire! Asset Tools**
- Keep this folder under `Admin Tools/` and out of runtime game bundles.
