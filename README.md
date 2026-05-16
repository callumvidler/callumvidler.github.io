# BMEN90033 Bioinstrumentation: Interactive Lecture Material

This repository hosts the static site published at [callumvidler.github.io](https://callumvidler.github.io). The site collects interactive visualisations developed alongside BMEN90033 Bioinstrumentation at the University of Melbourne. Each topic page presents a single concept, such as the action potential, semiconductor band structure, operational amplifier behaviour, Laplace-domain analysis, or analogue filter response, and renders it as an explorable simulation rather than a static figure.

## Scope and intent

The material is intended to support student study and lecture delivery. It complements, rather than replaces, the prescribed text and lecture notes. Each page isolates one phenomenon, exposes the parameters that govern it, and allows direct manipulation so that the relationship between parameter and response can be observed.

The pages are pedagogical artefacts; they are not validated instruments and should not be used for measurement or clinical decision-making.

## Structure

The site is a static collection of HTML, CSS, and JavaScript files served directly from the repository root by GitHub Pages. There is no build step, no package manager, and no test runner.

- `index.html` is the landing page and the canonical index of available topics.
- `theme.css` and `theme.js` define a shared light/dark palette and an injected theme toggle used by every topic page.
- Each `Week N/` directory contains the topic pages associated with that week of the unit. Directory names contain spaces and must be quoted in shell contexts.
- `Week 6/Slides/` is an iframe-based slide deck whose entries are listed in the `slides` array of `Week 6/Slides/index.html`.
- `Week 7/Week 7 Laplace/` is a section-scrolled compound page that loads scene scripts from its `js/` subdirectory.

## Implementation notes

Topic pages are written in vanilla JavaScript. Two-dimensional plots and animations use the HTML Canvas 2D API and, where appropriate, D3.js. Three-dimensional scenes use Three.js, loaded via an import map that points at the jsdelivr CDN. Mathematical typesetting is rendered with KaTeX where formulas appear in page content.

Colours are read from `window.T`, a theme-aware helper exposed by `theme.js`, on every draw frame, so that toggling the theme recolours canvases without reloading the page. The toggle dispatches a `themechange` event on `window` for any drawing code that needs to invalidate cached state.

## Running locally

The pages can be opened directly in a browser. For pages that load ES modules from relative paths, a local HTTP server is required:

```
python3 -m http.server 8000
```

The site is then available at `http://localhost:8000/`.

## Licence and use

The source is published for educational purposes. Reuse of the material in teaching contexts is welcomed; attribution to the unit and author is appreciated.
