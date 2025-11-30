# Localization Prompt (Pareto 80/20)

You are translating the Wide Poster Maker desktop app. Focus on the UI strings listed below; they cover the critical 20% of surfaces that 80% of users interact with daily.

## Context
- Electron + React app for slicing large posters into printable tiles.
- Languages needed: English source → Belarusian (BY), Ukrainian (UA), Polish (PL), Spanish (ES), Portuguese (PT-BR).
- Strings live in `src/renderer/i18n/locales/en-US.ts`; translations must mirror the key structure.
- Measurements (mm/in) remain abbreviated; placeholders like `{rows}` must stay intact.

## Tone & Style
- Crisp, action-oriented verbs for buttons.
- Friendly but professional descriptive text.
- Prefer neutral terminology when multiple variants exist.

## Priority Strings (translate first)
```
toolbar.logo
toolbar.openImage
toolbar.export
navigation.language
modes.preview
modes.settings
modes.export
welcome.title
welcome.description
welcome.primaryCta
welcome.dropHint
preview.loading
preview.dragColumns
preview.dragRows
preview.fitToggle
status.rowsCols
status.poster
status.printableArea
status.pages
actions.openImage
actions.cancel
exportModal.title
exportModal.cancel
```

## Delivery Checklist
1. Copy `en-US.ts` and update each locale file while keeping key order.
2. Verify TypeScript passes (`npm run lint`) to ensure no keys are missing.
3. Manually launch the app (`npm run dev`) and switch languages via the toolbar toggle to spot layout issues.
4. Flag any string you cannot translate yet with an inline `TODO:` comment and explain why in the PR description.

## Reference Material
- `docs/localization-plan.md` → workflow & risk notes.
- `docs/localization-task-breakdown.md` → tiering and per-language nuances.

Return translations as Git diffs or patched files ready for review.
