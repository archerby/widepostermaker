# Build & Packaging Blueprint

## Project Scaffolding
```
wide-poster-maker/
├─ package.json
├─ electron-builder.yml
├─ tsconfig.json
├─ vite.config.ts
├─ src/
│  ├─ main/          // Electron main process
│  │  ├─ index.ts
│  │  ├─ ipcHandlers/
│  │  └─ services/
│  └─ renderer/      // React app
│     ├─ App.tsx
│     ├─ components/
│     ├─ store/
│     ├─ hooks/
│     └─ styles/
├─ public/
│  └─ icons/
└─ scripts/
   └─ postinstall.mjs
```

## Tooling Choices
- **Electron 28+** for up-to-date printing APIs.  
- **Vite + React + TypeScript** in renderer for fast HMR.  
- **Zustand** for state, **React Router** for internal navigation.  
- **TailwindCSS** (with CSS variables for theming) or Chakra UI for accessibility-ready components.  
- **ESLint + Prettier** enforced via `lint-staged`.

## Key npm Scripts
```json
{
  "scripts": {
    "dev": "cross-env VITE_DEV_SERVER_URL=http://localhost:5173 electron-vite dev",
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "build": "electron-vite build",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  }
}
```
- Use `electron-vite` plugin to streamline dev server + main/renderer bundling.  
- `postinstall` runs `electron-builder install-app-deps` for native modules like `sharp`.

## Electron Builder Config (`electron-builder.yml`)
```yaml
appId: com.example.widepostermaker
productName: Wide Poster Maker
files:
  - dist/**
  - package.json
  - node_modules/**
extraMetadata:
  main: dist/main/index.js
mac:
  target:
    - dmg
    - zip
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
win:
  target:
    - nsis
  artifactName: "WidePosterMaker-${version}-Setup.${ext}"
linux:
  target:
    - AppImage
    - deb
  category: Graphics
publish:
  provider: generic
  url: https://example.com/downloads/
```

## Environment Config
- `.env` for shared vars (feature flags). `.env.development`, `.env.production` consumed by Vite.  
- Secrets (code signing) stored outside repo; configure Apple notarization + Windows signing via env variables.

## Testing & CI
- **Unit tests:** Vitest for renderer, Jest for shared modules, run via `npm run test`.  
- **E2E:** Playwright scenarios covering import → export flow.  
- **CI pipeline:** GitHub Actions matrix (win-latest, macos-latest, ubuntu-latest). Steps: install deps, lint, test, typecheck, `npm run build`, `npm run dist -- --publish never`.  
- Artifacts uploaded per OS for manual QA.

## Auto-Update & Crash Reporting
- Integrate `electron-updater` with generic provider (or GitHub Releases).  
- Crash reporter stub (Sentry/Telemetry toggle) wired but disabled offline.

## Packaging Steps
1. `npm install`
2. `npm run lint && npm run typecheck`
3. `npm run build` (produces `dist/` for main/renderer).  
4. `npm run dist` to create platform installers.  
5. Notarize mac builds; sign Windows executables; compute checksums.  
6. Upload artifacts + update auto-update feed.

## Developer Experience
- VS Code launch configs: one for `npm run dev`, one for attaching debugger to renderer.  
- Storybook or Ladle for component previews (optional).  
- Husky pre-commit: run `lint-staged` to enforce formatting + type safety.

## Dependency Notes
- `sharp` requires optional dependencies; ensure prebuilds downloaded for all platforms via `npm install --platform=win32 --arch=x64 sharp` in CI if necessary.  
- Include Python runtime detection only when bridging; otherwise, ship Node-only binary for simplicity.
