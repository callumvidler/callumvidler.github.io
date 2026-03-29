# Amplifier Classes — Design Spec

**Date:** 2026-03-29
**Course:** BMEN90033 Bioinstrumentation — Week 5
**File:** `Week 5/amplifier_classes.html`

## Overview

An interactive single-page visualization covering Class A, Class B, and Class AB amplifiers. Students explore how bias point and input amplitude affect circuit operation, output waveforms, and power efficiency. Follows the established 2x2 grid layout and dark-themed design system used throughout the course.

## Layout

Self-contained HTML file with inline CSS and JavaScript. No external dependencies beyond Google Fonts.

**Header:** Back button (`../index.html`), title "Amplifier Classes", subtitle "BMEN90033 · Week 5".

**2x2 Grid:**

| Position | Panel | Content |
|----------|-------|---------|
| Top-left | Circuit Schematic | Realistic circuit diagram + Q-point on load line inset |
| Top-right | Waveforms | Input and output sine waves (vertically stacked) |
| Bottom-left | Controls & Power | Class toggle, sliders, power bar chart |
| Bottom-right | Explanation | Dynamic context-aware text |

**Index update:** Add Week 5 section to `index.html` with link to this page.

## Panel 1: Circuit Schematic (Top-Left)

Canvas-rendered realistic circuit diagrams that redraw based on selected class.

### Class A — Common-Emitter
- Single NPN transistor
- Voltage divider bias network (R1, R2)
- Collector resistor (RC), emitter resistor (RE) with bypass capacitor
- Coupling capacitors on input and output
- VCC supply rail
- Q-point at centre of load line

### Class B — Push-Pull
- Two transistors (NPN + PNP) with bases tied together
- No bias resistors
- Coupling capacitors, VCC/VEE supply rails
- Q-point at cutoff

### Class AB — Biased Push-Pull
- Same push-pull topology as Class B
- Two diodes between bases providing slight forward bias
- Q-point just above cutoff

### Load Line Inset
- Small graph in corner of the panel showing DC load line
- Q-point marked and moves as bias slider changes
- Input signal swing shown as a range on the load line

### Visual Feedback
- Component values (resistor labels, VCC) update with bias slider
- Active current paths highlighted with animated colour when signal is present

## Panel 2: Waveforms (Top-Right)

Two vertically stacked plots on a single canvas:

- **Top:** Input signal (clean sine wave), amplitude from slider, labelled "V_in"
- **Bottom:** Output signal (amplified, potentially clipped/distorted), labelled "V_out"

### Per-Class Behaviour

- **Class A:** Full amplified sine wave, 180-degree phase inversion (common-emitter). Symmetric clipping only when input is driven too high.
- **Class B:** Crossover distortion — signal cuts to zero around each zero-crossing (flat dead zones). Each transistor handles one half-cycle.
- **Class AB:** Mostly clean output. Very slight crossover distortion visible at low amplitudes. Nearly identical to Class A at moderate amplitudes.

### Display
- Time on x-axis, voltage on y-axis, grid lines for reference
- Gain ratio displayed as text (e.g., "Gain: ~20x")
- Continuous scrolling animation (oscilloscope-style), real-time slider response

## Panel 3: Controls & Power (Bottom-Left)

### Controls

**Class Toggle:** Three buttons — "Class A", "Class B", "Class AB". Active button uses `.toggle-btn.active` styling. Switching redraws all panels.

**Input Amplitude Slider:** Range 0–100%. Label shows voltage (e.g., "V_in: 0.5 V"). Default ~30%.

**Bias Point Slider:** Range 0–100%. Label shows Q-point current (e.g., "I_CQ: 5 mA"). Defaults per class:
- Class A: 50% (mid-point bias)
- Class B: 0% (cutoff)
- Class AB: ~5% (just above cutoff)

When switching class, bias snaps to that class's typical default but remains freely adjustable so students can explore non-standard biasing.

### Power Bar Chart

Three horizontal bars stacked vertically:
- **DC Input Power** (blue) — total power from supply
- **Signal Output Power** (green/accent) — useful power to load
- **Wasted as Heat** (red/orange) — power dissipated in transistor(s)

Bars animate smoothly as sliders change.

**Efficiency readout** below bars: "eta = XX%" displayed prominently.

Typical efficiency ranges:
- Class A: ~25% max
- Class B: ~78.5% max
- Class AB: ~50–60%

### Legend
Small colour key for waveform traces (input vs output).

## Panel 4: Dynamic Explanation (Bottom-Right)

Context-aware text updating based on: selected class, amplitude, and bias point.

### Base Content Per Class

**Class A:** Full-cycle conduction, transistor always on, linear operation. Trade-off between linearity and efficiency. Conduction angle = 360 degrees.

**Class B:** Half-cycle conduction per transistor, push-pull operation, crossover distortion. Higher efficiency because transistors are off when not conducting. Conduction angle = 180 degrees per transistor.

**Class AB:** Small forward bias eliminates crossover distortion while retaining most of Class B's efficiency. Conduction angle slightly > 180 degrees.

### Dynamic Overlays

| Condition | Overlay |
|-----------|---------|
| Amplitude too high (any class) | Warning about clipping, distortion explanation tied to load line limits |
| Class A with low bias | Asymmetric clipping explanation — Q-point not centred |
| Class B/AB with amplitude near zero | Crossover distortion most visible at low signal levels |
| Class A at default bias | Physics note: conduction angle = 360 degrees |
| Class B at default | Physics note: conduction angle = 180 degrees per transistor |
| Class AB at default | Physics note: conduction angle slightly > 180 degrees |

### Formatting
Matches existing BJT page pattern: `<h3>` title, `<p>` body, `<div class="physics-note">` for key equations and concepts.

## Technical Approach

- Pure Canvas 2D rendering (no THREE.js needed — all content is 2D)
- `requestAnimationFrame()` loop for waveform scrolling and particle animation
- High-DPI rendering via `devicePixelRatio`
- CSS variables from existing `:root` theme
- Responsive canvas sizing on window resize
- All state managed via global variables matching existing page patterns

## Theming

Uses the established CSS variable system:
- `--bg-deep: #1a1a1e`
- `--bg-panel: #222226`
- `--accent: #6aaa8e`
- `--text: #ffffff`
- `--text-dim: #a0a0a0`
- `--border: rgba(255,255,255,0.08)`

Additional colours for this page:
- Power bar (input): `#5080d0` (blue)
- Power bar (output/signal): `var(--accent)` (green)
- Power bar (heat): `#e06050` (red/orange)
- Input waveform trace: `#5080d0`
- Output waveform trace: `var(--accent)`
