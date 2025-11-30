# Accessibility & Internationalization Checklist

## Keyboard Navigation
- [ ] Global shortcuts: Ctrl/Cmd+O (Open), Ctrl/Cmd+S (Save Project), Ctrl/Cmd+Shift+S (Save As), Ctrl/Cmd+P (Print), Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z (Undo/Redo), Ctrl/Cmd+Plus/Minus (Zoom in/out), Ctrl/Cmd+0 (Fit), Arrow keys (nudge tile count when handles focused).
- [ ] Mode Rail focusable via `Alt+1..4` and arrow keys; focus ring visible in both themes.
- [ ] Inspector inputs accessible via Tab order; `Esc` closes modals and resets focus to triggering control.

## Screen Reader Support
- [ ] Provide `aria-label` / `aria-describedby` for all sliders, steppers, toggles; include current numeric values (e.g., "Margin: 5 millimeters").
- [ ] Preview canvas exposes off-screen description summarizing tile grid (rows, columns, poster size).  
- [ ] Progress modal announces step changes via `aria-live="polite"` region.  
- [ ] Toast notifications announced using live regions with concise copy.

## Visual Accessibility
- [ ] Light/dark themes meet WCAG AA (contrast ratio ≥ 4.5:1); accent color tested against both backgrounds.  
- [ ] Provide "High Contrast" toggle boosting outlines and legend saturation.  
- [ ] Margin/overlap overlays use patterns + color to remain distinguishable for color-blind users.

## Zoom & Scaling
- [ ] Text respects OS scaling; root font size adjustable via preferences (90–120%).  
- [ ] Canvas zoom uses double-tap gestures (trackpad/pinch) and keyboard shortcuts; provide on-screen zoom slider for accessibility.

## Announcements & Feedback
- [ ] After tile adjustments, announce new row/column counts: `Row count changed to 5, Column count 4, Poster width 840 mm`.  
- [ ] Print/Export completion triggers toast + `aria-live` announcement with action buttons focusable via keyboard.

## Internationalization
- [ ] All textual strings stored in localization files (e.g., `src/i18n/en-US.json`).  
- [ ] Support dynamic language switching without restart; persist preference in settings.  
- [ ] Number/measurement formatting uses Intl APIs; allow switching between metric (mm) and imperial (inches).  
- [ ] Date/timestamps (recent files) displayed via locale-aware formatting.

## Input Validation Messages
- [ ] Error tooltips localized, include guidance ("Overlap must be less than printable width").  
- [ ] Invalid inputs set `aria-invalid="true"` and describe fix path.

## Testing Checklist
- [ ] Screen reader smoke test (NVDA/VoiceOver/Orca) for main flows.  
- [ ] Keyboard-only walkthrough ensures no traps.  
- [ ] Contrast analyzer pass for UI states.  
- [ ] Localization pseudo-language (e.g., double-length strings) to catch layout issues.  
- [ ] Metric/imperial toggle verification vs displayed units.
