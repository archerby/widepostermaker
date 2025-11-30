# Prompt Sequence for Electron UI Implementation

Use the following ordered prompts to drive an AI assistant or developer through building the Electron application. Each step references upstream artifacts for continuity:

1. **Product Brief & Success Criteria**  
   Prompt: "Read `ui_prompt_guidelines.md` and summarize the product goals, must-have features, and success metrics. Produce a concise brief (≤1 page) plus acceptance checklist."  
   Outcome: shared understanding before design.

2. **Workflow & Screen Flow Specification**  
   Prompt: "Using the brief and Section 1 of `ui_prompt_midlevel.md`, draft detailed user journeys, state diagrams, and screen transitions for Import → Preview → Adjust → Export."  
   Outcome: diagrams + narrative of flows.

3. **UI Layout & Component Inventory**  
   Prompt: "Leverage Sections 2–4 of `ui_prompt_midlevel.md` to create wireframe descriptions (top toolbar, preview canvas, inspector panels) and list every UI component with props/state."  
   Outcome: annotated wireframes + component contract table.

4. **State Management & Data Contracts**  
   Prompt: "From Sections 5–6, define global store slices (document settings, tiling grid, export jobs), IPC channels, and serialization format for project files. Include TypeScript interfaces."  
   Outcome: state schema + IPC message shapes.

5. **Backend/Image Engine Plan**  
   Prompt: "Detail how the backend tiling engine will be invoked (Node Sharp vs Python worker). Provide module structure, command signatures, and streaming progress events referencing Section 5."  
   Outcome: backend architecture doc + pseudo-code.

6. **Accessibility & Internationalization Checklist**  
   Prompt: "Summarize Section 7 into actionable tasks, mapping each requirement to UI components and noting technical implementation (ARIA labels, hotkeys, i18n library)."  
   Outcome: checklist for QA.

7. **Build & Packaging Blueprint**  
   Prompt: "Follow Section 8 to outline project scaffolding (Electron + Vite + React), scripts, lint/test setup, and Electron Builder configs for Win/macOS/Linux."  
   Outcome: project setup instructions + config snippets.

8. **End-to-End Implementation Sprint**  
   Prompt: "Using all prior artifacts, generate a phased implementation plan (milestones, tasks, code modules) culminating in a shippable MVP. Include testing strategy and manual verification steps (export + OS print)."  
   Outcome: actionable sprint backlog leading to code execution.

Executing these prompts sequentially will transform the high-level concept into a fully specified, build-ready plan for the Electron application that slices large images into printable tiles with live previews and flexible export/print options.
