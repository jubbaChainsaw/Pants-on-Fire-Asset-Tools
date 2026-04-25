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

## Android APK (Expo EAS)

Codespaces note: use `eas-cli` via `npx`, not `npx eas`.

```bash
npm install
npm run eas:login
npm run eas:configure
npm run eas:build:apk
```

If you need a Play Store bundle instead:

```bash
npm run eas:build:aab
```

Project ID resolution for EAS now works automatically in this order:

1. `EXPO_EAS_PROJECT_ID` environment variable (if set)
2. `app.json` -> `expo.extra.eas.projectId` (when written by EAS)
3. `EAS_PROJECT_ID` environment variable

So after `npm run eas:configure`, you usually do **not** need to edit `app.config.js` manually.

## Notes

- Tool title in-app: **Pants on Fire! Asset Tools**
- This repository is now the standalone root workspace for asset/admin tooling.
