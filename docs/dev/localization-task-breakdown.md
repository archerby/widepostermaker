# Localization Task Breakdown

## Overview
Translators should work from `src/renderer/i18n/locales/en-US.ts`, preserving key order and interpolation tokens. Focus on user-facing copy that blocks comprehension first, then long-form descriptions.

## Priority Tiers
1. **Tier A (critical UI)**: `toolbar`, `navigation`, `modes`, `actions`, `status`, `units`.
2. **Tier B (workflow guidance)**: `welcome` copy and drag hints in `preview`.
3. **Tier C (descriptive status text)**: `preview.summary`, `preview.hoveredTile`, `preview.tileSize`, `exportModal` strings.

## General Requirements
- Keep placeholders like `{rows}` or `{posterWidth}` intact and in braces.
- Use sentence case unless the English source is Title Case (e.g., buttons).
- Prefer concise translations that fit inside narrow buttons (8–12 characters ideal).
- Return UTF-8 text; no HTML.

## Per-Language Notes
### Belarusian (BY)
- Use contemporary Belarusian terminology; avoid Russified loanwords when modern alternatives exist.
- Verify measurement abbreviations remain lowercase (`мм`, `цал.` if appropriate) and consistent with units.
- Provide localized app name only if a well-known translation exists; otherwise keep "Wide Poster Maker".

### Ukrainian (UA)
- Buttons typically use imperative forms ("Відкрити", "Експорт"), keep consistent.
- Double-check diacritics (ї, є, ґ) render properly; UTF-8 ok.
- Ensure "PDF" and other acronyms remain Latin.

### Polish (PL)
- Maintain polite but concise tone; prefer infinitive for menu actions ("Otwórz" vs "Otwórz plik").
- Keep measurement units in lowercase abbreviations (`mm`, `cal`).
- For "tiles", pick consistent term (e.g., "płytki" or "arkusze") and reuse across keys.

### Spanish (ES)
- Default to neutral Spain Spanish; avoid region-specific vos/vosotros forms in buttons.
- Clarify measurement context where necessary ("Papel", "Área imprimible").
- Watch string length for `summary`; rephrase to keep similar character count.

### Portuguese (PT-BR)
- Use Brazilian Portuguese terminology ("Página", "Exportar", "Moldura").
- Measurement abbreviations remain `mm`/`pol`; add diacritics only when spelled-out words require it.
- Keep friendly tone; avoid gerunds where concise infinitives work better.

## Deliverables
- Update each locale file (`be-BY.ts`, `uk-UA.ts`, `pl-PL.ts`, `es-ES.ts`, `pt-BR.ts`) with Tier A and B strings first, submit for review, then continue with Tier C.
- Provide reviewer notes for any untranslated strings explaining blockers (terminology, context needed).
- Log QA screenshots for button overflow or wrapping issues per locale once integrated.
