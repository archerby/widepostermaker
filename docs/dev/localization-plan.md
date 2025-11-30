# Localization Plan

## Goals
- Deliver a switchable UI that supports English plus Belarusian, Ukrainian, Polish, Spanish, and Brazilian Portuguese.
- Keep language resources colocated with the renderer so Electron main stays locale-agnostic.
- Provide a predictable workflow for adding strings, normalizing locale codes, and wiring new languages.

## Scope & Surfaces
| Surface | Components / Files | Notes |
| --- | --- | --- |
| Application chrome | `TopToolbar`, `ModeRail`, `LanguageSwitcher` | Buttons, export states, language labels. |
| Welcome / empty state | `App.tsx` hero copy, drop hints | Long-form copy; translators need tone guidance. |
| Preview workspace | `PreviewWorkspace`, `PreviewGrid`, status readout, tooltips | Numeric placeholders must remain intact. |
| Inspector panels | `GridPanel`, `DocumentPanel`, `GuidesPanel`, `OutputPanel` | Labels plus helper text. |
| Export modal & progress | store actions + modal component | Contains step counts, cancel action. |
| Toasts / errors (future) | `useAppStore` actions | Keep keys ready even if not yet exposed. |

## Existing Foundations
1. **Locale registry** (`src/renderer/i18n/locales/index.ts`) normalizes locale codes and exposes `languageOptions` for UI.
2. **Message bundles** stubbed for each locale; all extend the `en-US` type to preserve completeness.
3. **I18n provider** enforces normalized locale persistence via Zustand store so switching works across sessions.
4. **Language switcher** lives in the toolbar, so any user can change languages without diving into settings.

## Workflow
1. **Add / update strings** only in `en-US.ts`. Keep placeholders descriptive (`{rows}`, `{posterWidth}`) and document units where unclear.
2. **Propagate typings** by re-exporting `Messages` from `en-US.ts`; TypeScript will highlight missing keys in other locales.
3. **Run `npm run lint` + `npm run test`** after touching locale files to catch unused keys or interpolation mistakes.
4. **Translate locales** by copying `en-US` structure; do not remove keys. Use comments (preceded by `//`) sparingly for context.
5. **QA in-app** by switching languages and spot-checking: toolbar, welcome hero, inspector panels, export modal. Screenshot issues.
6. **Ship** after verifying fallbacks: delete `settings.locale` from persisted store and ensure default is `en-US`.

## Outstanding Work
- Populate the non-English bundles with high-priority strings (toolbar, actions, preview, export modal).
- Document translation guidelines (tone, preferred terminology, measurement units).
- Prepare a translator-friendly prompt with priorities and context images (if available).

## Risks & Mitigations
- **String drift**: New UI copy might land outside i18n. Mitigate with lint rule/search for raw strings before release.
- **Long text overflow**: Track in QA checklist; prefer flex containers with min-widths.
- **Plural / grammar**: Currently minimal; if complexity grows, consider messageformat or ICU in phase two.
