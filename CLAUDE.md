# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static GitHub Pages site (`callumvidler.github.io`) hosting interactive lecture/study visualisations for **BMEN90033 Bioinstrumentation** at the University of Melbourne. Each "Week N" directory contains standalone HTML pages that simulate a concept (action potentials, semiconductor physics, op-amps, Laplace transforms, filters, etc.) using vanilla JS + Canvas2D + Three.js (via ESM importmap from jsdelivr).

There is **no build system, no package.json, no tests, and no lint config**. Edits to HTML/JS/CSS are the final artefact — opening the file in a browser is the only way to "run" it.

## Running locally

Open `index.html` directly in a browser, or serve the repo root over HTTP (needed for ESM modules in some pages):

```
python3 -m http.server 8000
# then visit http://localhost:8000/
```

Pages are published by GitHub Pages from `main` at the repo root.

## Architecture

### Landing page and navigation
- `index.html` (root) is the landing page and is the source of truth for which topic pages are linked. When adding a new topic, add an `<a href="Week N/topic.html" class="topic">…</a>` entry to the appropriate week section.
- Each topic page lives at `Week N/<topic>.html` (spaces in directory names — always quote paths). Topic pages include a fixed "← Back" link to `../index.html`.

### Theme system (global, shared by every page)
- `theme.css` and `theme.js` at the repo root are referenced by every topic page as `../theme.css` / `../theme.js` (or `../../…` from nested paths like `Week 6/Slides/` and `Week 7/Week 7 Laplace/`). Keep this relative-path contract intact when moving pages.
- `theme.js` runs before DOM ready, reads `localStorage['theme']` (defaulting to `light`), sets `data-theme` on `<html>`, and injects a fixed top-right toggle button.
- It exposes **`window.T`** — a theme-aware colour helper with getters like `T.text`, `T.grid`, `T.plotBg`, `T.wire`, `T.sceneBg`, plus dynamic helpers `T.fg(alpha)` and `T.yellowA(alpha)`. Canvas/Three.js drawing code should read from `T` on every frame (not cache colours) so theme toggling recolors immediately.
- Theme toggling dispatches `window` event `themechange` with `{detail:{theme}}`. Drawing code that caches anything should listen and redraw.

### Page anatomy (the common pattern)
Each topic HTML page is a fully self-contained document that typically contains:
1. Inline `<style>` with `:root` CSS variables for the dark palette, plus `[data-theme="light"]` overrides.
2. `<link rel="stylesheet" href="../theme.css">` and `<script src="../theme.js"></script>` near the end of `<head>`.
3. A fixed `← Back` anchor to `../index.html`.
4. For Three.js pages: an `<script type="importmap">` block pointing `three` and `three/addons/` at jsdelivr CDN (version is typically `three@0.160.0`), followed by `<script type="module">` with the simulation.
5. For Canvas2D pages: plain inline `<script>` blocks. KaTeX is loaded from jsdelivr when formulas are needed (see the Laplace index for the auto-render snippet).

Because pages are standalone, there is heavy copy-paste of boilerplate (CSS variables, back button, importmap). When changing shared behaviour (palette, theme toggle), check whether the change belongs in `theme.css` / `theme.js` / `window.T` instead of each page.

### Multi-file features

- **`Week 7/Week 7 Laplace/`** — one `index.html` with section-based scroll navigation that loads `js/*.js` scene scripts (`scene1_car.js` … `scene8_sandbox.js`, plus `common.js`, `nav.js`, `tweaks.js`). `common.js` provides shared canvas helpers (`setupCanvas`, `drawGrid`, colour lookup from CSS vars / `window.TWEAKS`). `nav.js` builds the dot rail from `<section data-label="…">`. `window.TWEAKS` is an inline object in the HTML wrapped by `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` markers — the Tweaks panel UI persists palette/font overrides by rewriting that region.

- **`Week 6/Slides/`** — iframe-based slide deck. `index.html` hosts a sidebar + `<iframe id="stage">` and the slide list (`slides` array). Each slide is its own HTML file (`00_preamble.html` … `20_iv_vi_converter.html`) loaded with `?theme=…` so the child iframe inherits the parent's theme. Because `theme.js` hardcodes the initial theme from `localStorage`, the deck shadows that with `sessionStorage['slideTheme']` and listens for the `themechange` event to keep parent + child in sync. When adding/removing slides, edit the `slides` array in `Week 6/Slides/index.html` (commented-out entries in that array are intentional gaps — not dead code).

### Large binary assets
`Week 6/Audio/` and `Week 6/Videos/` hold lecture audio/video used by the slide deck. Do not rewrite or regenerate these; they are referenced from slides verbatim.

## Conventions

- Match the surrounding page's style when editing a topic: inline `<style>`, `:root` variables, `[data-theme="light"]` overrides, fixed back-button, jsdelivr imports.
- When drawing to canvas, always read colours from `window.T` (or CSS vars) rather than hardcoding hex — both themes must look correct.
- Directory names contain spaces (`Week 2`, `Week 7 Laplace`). Always quote paths in shell commands.
- The `.vibeyardignore` file lists paths excluded from AI readiness scans (lockfiles, minified bundles); no action needed beyond awareness.

## Writing style for any prose added to pages or docs

Any text written into this repository (topic copy, slide content, captions, inline explanations, commit messages, documentation) must follow these rules:

- Use an academic tone: precise, measured, third-person where appropriate, no marketing voice.
- Do not use em-dashes (`—`). Use a comma, semicolon, colon, or a new sentence instead.
- No flowery or ornamental language, no metaphors dressed up as insight, no rhetorical flourishes.
- No clichés or stock phrases ("at the end of the day", "dive into", "unlock", "leverage", "in today's world", "it is important to note that", etc.).
- No cringy or performative wording (no exclamations, no "let's", no second-person pep talk, no emoji unless the user explicitly asks).
- Do not be verbose. Prefer the shortest sentence that is still technically accurate. Remove hedges ("perhaps", "arguably", "it could be said that") unless the uncertainty is the point.
- Prefer concrete nouns and verbs over abstract nominalisations. State the mechanism, not an impression of it.

## When creating graphs or graphics 

When creating any graphs, animation or graphics you must always follow these rules: 

- 2D Plots should be made in D3.js with correctly labeled X-axis and Y-axis. The text on the X and Y axis should be large enough to be readable. If any axis labels include equations, mathematical symbols or sub-script/superscript, then this should be written in Latex Format. '
- Axis title placement depends on the quadrants shown:
    - For plots that show only the positive quadrant (e.g. Bode magnitude/phase, time-domain traces), place the **x-axis title** centred horizontally below the x-axis (outside the plot, in the bottom margin) and the **y-axis title rotated 90° anticlockwise**, centred vertically alongside the y-axis (outside the plot, in the left margin). Do not place either title inside the plot area.
    - For plots that show all four quadrants (e.g. s-plane, complex plane, phasor diagrams where both +X/−X and +Y/−Y are visible), do **not** rotate the y-axis title. Instead:
        - place the **y-axis title** above the plot, outside the plot area, horizontally centred on the y-axis itself (i.e. at x where the y-axis sits, in the top margin);
        - place the **x-axis title** to the right of the plot, outside the plot area, vertically centred on the x-axis itself (i.e. at y where the x-axis sits, in the right margin).
    - Reserve enough padding (pad ≥ ~36–48 px) so the external titles never overlap tick labels, the plot frame, or any drawn elements.
- 3D plots should be created in D3.js or ThreeJs depending on the content of the plots and what it is trying to represent. Ensure that you ask for clarification about this before proceeding 
- Before implementing any graphics, animations, plots, etc.. carefully analyse the placement of text elements, arrows, labels, axis labels or any overlaying elements to ensure that their placement is correct and does not cause overlapping text or elements and that they are laid out correctly with respect to each other. 
- Check that text does not overlap any line elements within the diagrams, plots or figures. 
- Check that there is sufficient gap between neighbouring text, if there is it should be moved so that there is enough space, without changing the text size. 
- If text / elements cannot be moved or localised near their intended label location, then they should be moved and an arrow / secondary element should be placed to indicate what this label or text is referencing 
- If a label is meant to move with an element, ensure that it is placed properly such that it moves correctly and does not obstruct any additional labels, lines or elements throughout its entire range 
- After implementing any graphics, check carefully again to confirm layout before completing the task. 

## Creating Circuit Graphics 

When creating any circuit diagrams, circuit animations or graphics you must always follow these rules: 


- When creating graphics of circuits, ensure that the circuits are arranged correctly, that all lines are orthogonal and straight, i.e no diagonal lines or curved lines. Ensure labels are placed correctly with respect to the components and are not overlapping. 
- Show resistors as rectangles instead of zig-zag lines 
- Ensure that voltage supplies are shown as circles with +/- correctly placed with repect to the circuit and does not overlap any elements 
- Ensure that the circuit labels are correctly sized so that they can be read properly. 
- Use latex for circuit labels where necessary 
