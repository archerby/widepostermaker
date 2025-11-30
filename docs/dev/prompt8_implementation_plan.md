# End-to-End Implementation Plan

## Milestone A – Foundations (Week 1)
1. **Repo Init & Tooling**  
   - Scaffold project per `prompt7_build_packaging.md`.  
   - Configure ESLint, Prettier, Husky, Vitest.  
   - Add base Electron main/renderer handshake with hot reload.
2. **State Store Skeleton**  
   - Implement Zustand store using interfaces from `prompt4_state_contracts.md`.  
   - Wire persistence layer stubs (recent projects JSON, autosave timer).  
   - Add actions for loading image metadata (mocked).
3. **Welcome Screen**  
   - Build FileDropZone, RecentProjectsList components referencing `prompt3_ui_components.md`.  
   - Hook open dialogs via IPC.

**Exit Criteria:** App launches, user can open placeholder image, state reflects metadata, UI transitions to Preview stub.

## Milestone B – Preview Workspace (Weeks 2–3)
1. **Layout & Navigation**  
   - Implement AppShell, TopToolbar, ModeRail, StatusBar as described in `prompt3_ui_components.md`.  
   - Ensure light/dark themes + high-contrast toggle.
2. **Preview Canvas MVP**  
   - Render image using Canvas, overlay tile grid (fake data).  
   - Add ZoomControls, pan gestures, tooltip skeleton.
3. **Inspector Panels**  
   - Build Document, Grid, Guides panels with inputs; connect to store actions.  
   - Real-time derived metrics shown in MetricsBar.
4. **Workflow Integration**  
   - Follow `prompt2_workflows.md` to ensure state transitions between empty/loading/ready behave correctly.

**Exit Criteria:** Users adjust settings and see grid updates (simulated). Accessibility checklist items for panels implemented.

## Milestone C – Backend Integration (Weeks 4–5)
1. **Node Tiler Worker**  
   - Implement `ImageEngine` + worker thread per `prompt5_backend_plan.md`.  
   - Integrate `sharp` processing, guide rendering (Canvas/Skia).  
   - Emit progress events to renderer.
2. **Python Fallback (optional)**  
   - Bridge to `image_to_a4_tiles.py`, parse stdout progress.  
   - Add settings toggle enabling fallback path.
3. **Export & Print Flows**  
   - Build Export modal + progress UI.  
   - Connect PrintService to OS dialogs.

**Exit Criteria:** Real images sliced into PDF/PNG/JPG with accurate tile counts; progress modal works; print dialog opens.

## Milestone D – Persistence & Projects (Week 6)
1. **Project Save/Load**  
   - Serialize project files using schema from `prompt4_state_contracts.md`.  
   - Implement autosave with debouncing.  
   - Add relink dialog when source missing.
2. **Recent Files + Thumbnails**  
   - Capture preview thumbnails per export, store metadata.  
   - Display in welcome screen + File menu.
3. **Batch Export**  
   - Extend Export panel for queueing multiple images; update state machine accordingly.

**Exit Criteria:** User can save project, reopen later, continue editing; recents display correctly; batch export functional.

## Milestone E – Polish & Release (Week 7)
1. **Accessibility & i18n Pass**  
   - Apply checklist from `prompt6_accessibility_i18n.md`.  
   - Implement localization infrastructure with English + pseudo-language.
2. **Testing & QA**  
   - Unit tests for store reducers, helper functions.  
   - Playwright scripts covering import → adjust → export + print cancel/resume.  
   - Manual sizing verification (print sample, measure mm tolerance).
3. **Packaging & Distribution**  
   - Configure Electron Builder per `prompt7_build_packaging.md`.  
   - Sign binaries, set up auto-update feed.  
   - Write release notes + onboarding tips.

**Exit Criteria:** Installers produced for Win/macOS/Linux, tests passing, release candidate ready.

## Testing Strategy Summary
- **Unit Tests:** Document/grid calculators, overlap math, IPC payload validators.  
- **Integration:** Worker pipeline invoked with fixture images, verifying tile outputs via pixel comparisons.  
- **E2E:** Playwright flows, screenshot diff for preview overlay, accessibility snapshot tests (axe-core).  
- **Manual:** Printing on reference printers A4/Letter, verifying crop guides alignment, multi-language string fit.

## Manual Verification Steps
1. Import large JPEG, confirm preview updates within <5s.  
2. Adjust rows/cols manually, ensure MetricsBar updates.  
3. Export to PDF with guides; open resulting file to inspect crop marks.  
4. Trigger OS print with overlap and margin adjustments; confirm printer settings respect orientation.  
5. Save project, relaunch app, reopen project, verify state matches prior session.  
6. Switch to dark theme + pseudo-language; inspect layout for clipping.
