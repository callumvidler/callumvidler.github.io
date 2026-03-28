# Amplifier Bandwidth — Design Spec

**Date:** 2026-03-29
**Page:** `Week 5/amplifier_bandwidth.html`
**Pattern:** Multi-panel grid dashboard (consistent with `bjt_semiconductors.html`)

## Overview

An interactive learning page that teaches students how amplifier bandwidth is determined by modeling the frequency-dependent gain as a first-order RC-limited system. Students can manipulate R, C, gain, and a test signal frequency to see the transfer function, Bode plot, and animated circuit respond in real time.

**Transfer function notation:** H(j omega) = Av / (1 + j(omega / omega_0)), where omega_0 = 1/RC.

## Technology

- Single self-contained HTML file (inline CSS + JS, no build system)
- Canvas 2D for all drawing (circuit schematic, Bode plot, equations)
- No external libraries beyond Google Fonts (IBM Plex)
- Same CSS variable dark theme and glass-morphism panel styling as existing pages

## Layout

```
┌──────────────────────────────────────────────────┐
│  Header: "Amplifier Bandwidth"  |  Back button   │
├────────────────────┬─────────────────────────────┤
│  Top-Left:         │  Top-Right:                 │
│  Animated RC       │  Bode Magnitude Plot        │
│  Circuit Diagram   │  + dynamic annotations      │
├────────────────────┼─────────────────────────────┤
│  Bottom-Left:      │  Bottom-Right:              │
│  Controls          │  Equations + Frequency      │
│  (R, C, Av, freq)  │  Response Info              │
└────────────────────┴─────────────────────────────┘
```

- Header bar: title + back button to `../index.html`
- 2x2 grid: `height: calc(100vh - 42px)`
- Follows exact structure of `bjt_semiconductors.html`

## Panel 1: Top-Left — Animated RC Circuit Diagram

**Canvas 2D schematic showing:**
- Voltage source (input signal) -> amplifier block (gain Av) -> resistor R -> output node -> capacitor C to ground
- Component labels (R, C, Av) update dynamically when sliders change

**Animated signal flow:**
- Sinusoidal "pulses" travel along the wires, amplitude and color reflecting signal level
- After the RC junction, signal visibly attenuates at high frequencies
- Input and output sine wave previews at source and output nodes
- Output wave shrinks as test frequency increases past omega_0
- Animation speed syncs with the test frequency slider

## Panel 2: Top-Right — Bode Magnitude Plot

**Axes:**
- X-axis: frequency (log scale, rad/s)
- Y-axis: gain in dB

**Curve:**
- |H(j omega)| = 20 * log10(Av / sqrt(1 + (omega / omega_0)^2))
- Redraws smoothly when R, C, or Av change

**Dynamic annotations on the plot:**
- Horizontal dashed line at Av (dB) labeled "Mid-band gain"
- Vertical dashed line at omega_0 labeled "omega_0 = 1/RC"
- The -3dB point marked with a dot and label
- Asymptotic -20 dB/decade slope line as a dotted extension
- Moving marker dot on the curve at the current test frequency, with gain readout

## Panel 3: Bottom-Left — Controls

Organized in sections with subtle dividers:

- **Resistance R** — range slider (100 Ohm to 100 kOhm, log scale), value readout
- **Capacitance C** — range slider (1 pF to 100 nF, log scale), value readout
- **Mid-band Gain Av** — range slider (1 to 1000, log scale), value readout in linear and dB
- **Test Signal Frequency** — range slider (log scale, ~3 decades below to ~3 decades above omega_0), value readout in rad/s and Hz
- **Derived readout:** omega_0 = 1/RC displayed prominently, updating in real time
- **Preset buttons:** "Audio Amplifier", "RF Stage" — snap R/C/Av to realistic values

## Panel 4: Bottom-Right — Equations & Frequency Response Info

**Key equations displayed:**
- H(j omega) = Av / (1 + j(omega / omega_0))
- |H(j omega)| = Av / sqrt(1 + (omega / omega_0)^2)

**Dynamic highlighting based on current test frequency:**
- omega << omega_0: the (omega/omega_0) term fades/dims, gain ~ Av
- omega = omega_0: both terms highlighted equally, gain = Av/sqrt(2) = -3dB
- omega >> omega_0: the "1" fades, gain ~ Av * omega_0/omega (rolloff regime)

**Current values panel:**
- Computed gain at test frequency (linear and dB)
- Ratio omega / omega_0
- Operating regime label: passband / cutoff / rolloff

**Rendering:** Styled HTML with subscripts/superscripts for equations (no external LaTeX library). Canvas 2D for any diagrams within this panel.

## Index Page Update

Add a Week 5 section to `index.html` with a link to the new page, following the existing navigation pattern for Weeks 2-4.

## Styling

- Same CSS variables: `--bg: #1a1a1e`, `--bg-panel: #222226`, `--accent: #6aaa8e`, etc.
- Glass-morphism panels with `backdrop-filter: blur(10px)`
- Custom-styled range sliders matching existing pages
- IBM Plex font family via Google Fonts
- Responsive canvas sizing via `getBoundingClientRect()` + `devicePixelRatio`
