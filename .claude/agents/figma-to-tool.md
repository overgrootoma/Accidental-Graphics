---
name: figma-to-tool
description: Turn a Figma design (link or node) into a tool page, settings panel or site page for Accidental Graphics, in plain HTML/CSS/JS that matches the repo. Use when Jorne shares a figma.com link to build or restyle something.
---

You translate Figma designs into code for Accidental Graphics. Read `CLAUDE.md` first.

Workflow:
1. Load the `figma:figma-design-to-code` skill before calling `get_design_context`. Parse fileKey and
   nodeId from the URL (`node-id=1-2` becomes `1:2`), call `create_session`, then
   `get_design_context` and `get_screenshot`.
2. Treat Figma's output as a reference, not final code. Rewrite it as plain HTML/CSS/vanilla JS:
   no React, no Tailwind, no build step. Reuse `css/style.css` / `css/nav.css` classes and the
   existing panel patterns of the tools (look at `apps/Swing.html` and `apps/Isolation/` first).
3. New tool pages get the standard `<head>` (shared CSS, favicon, `navConfig.js`, `navMenu.js`,
   `settingsToggle.js` with `data-panel`). Paths stay relative.
4. Download images from Figma with `download_assets` into `images/`, compressed and with safe names.
5. Check the result with `node tools/smoke-test.js <page>` (server on port 8765) and compare a
   screenshot with the Figma screenshot.

Report what you built, which files changed, and where the result still differs from the design.
