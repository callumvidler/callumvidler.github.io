# Total Harmonic Distortion — Interactive Explainer

**Page location:** `Week 5/total_harmonic_distortion.html`
**Style:** Scrollable explainer matching Class D amplifier page (dark theme, `Part 01–07` numbering, canvas visualizations, IBM Plex Sans/Mono, control groups, callouts, equation blocks)
**Navigation:** Inserted in index.html between Amplifier Classes (1) and Class D Amplifier, renumbering subsequent items.

---

## Section 1: The Pure Fundamental

**Content:** Introduces the concept of a fundamental frequency — a single, pure sine wave with no distortion.

**Visualization:** Canvas showing a clean, animated sine wave.

**Controls:**
- Frequency slider — adjusts the fundamental frequency so students see what "fundamental" means (label shows Hz value).

**Text:** Brief explanation that this is the reference signal — what a perfect, undistorted output looks like.

---

## Section 2: What Are Harmonics?

**Content:** Harmonics are sine waves at exact integer multiples of the fundamental frequency (2f, 3f, 4f, 5f).

**Visualization:** Canvas showing the fundamental (always visible) with a single harmonic overlaid.

**Controls:**
- Toggle buttons (2nd / 3rd / 4th / 5th) to select which harmonic is shown alongside the fundamental.
- The selected harmonic is drawn at its correct frequency relative to the fundamental.

**Text:**
- Explanation of integer multiples.
- Callout: even harmonics (2nd, 4th) vs odd harmonics (3rd, 5th) — different amplifier classes tend to produce different harmonic profiles (e.g. push-pull topologies cancel even harmonics).

---

## Section 3: Combining Harmonics — Building Distortion

**Content:** Interactive exploration of how adding harmonics to a fundamental distorts the waveform.

**Visualization A — Waveform canvas:**
- Individual harmonics drawn faintly underneath.
- The summed (distorted) waveform drawn in bold accent colour on top.
- Updates in real-time as sliders change.

**Visualization B — Amplitude vs frequency bar chart:**
- Bar chart with x-axis showing f, 2f, 3f, 4f, 5f and y-axis showing relative amplitude.
- Bars update live with slider values.
- Includes reference profiles for typical amplifier classes.

**Controls:**
- Individual amplitude sliders for 2nd, 3rd, 4th, and 5th harmonics (0–100% of fundamental).
- Preset dropdown/buttons to load typical harmonic profiles:
  - **Class A:** low-level harmonics across the board (~2% 2nd, ~1% 3rd, ~0.5% 4th, ~0.2% 5th)
  - **Class AB:** moderate 2nd and 3rd (~5% 2nd, ~3% 3rd, ~1% 4th, ~0.5% 5th)
  - **Class B:** prominent odd harmonics due to crossover distortion (~3% 2nd, ~8% 3rd, ~1% 4th, ~4% 5th)
- Selecting a preset updates the sliders; students can then tweak from there.

---

## Section 4: Fourier Decomposition — Pulling Apart a Signal

**Content:** Fourier's insight — any periodic signal can be expressed as a sum of sinusoids. This section shows the reverse of Section 3.

**Visualization:** Canvas showing an animated decomposition:
- Starts with the current distorted waveform (from Section 3 slider values, or a preset).
- The distorted wave visually "separates" — individual sine components slide apart vertically so students see the constituent waves stacked.
- Each component is labelled (fundamental, 2nd, 3rd, etc.).

**Controls:**
- Play/reset button for the decomposition animation.

**Text:**
- Explanation of Fourier's theorem.
- Callout: "This is the conceptual foundation. The next section shows the practical tool engineers use."

---

## Section 5: The Frequency Spectrum — Measuring Harmonics

**Content:** The frequency-domain view — what an FFT produces.

**Visualization:** Canvas with a bar chart / spectrum view:
- X-axis: frequency (f, 2f, 3f, 4f, 5f), labelled with actual Hz values based on fundamental.
- Y-axis: amplitude (relative to fundamental, or dB).
- Bars update live as Section 3 sliders are adjusted.

**Text:**
- Explanation of FFT — converts time-domain signals into frequency-domain.
- Callout: "This is how engineers measure distortion in practice — feed a pure sine in, look at the output spectrum, and see what shouldn't be there."

---

## Section 6: The THD Formula

**Content:** The formal definition and live calculation.

**Equation block:**
```
THD = sqrt(V2^2 + V3^2 + V4^2 + V5^2) / V1 x 100%
```

**Visualization:**
- Large, prominent live THD% readout that updates as sliders change.
- Visual breakdown showing each harmonic's contribution (e.g. small stacked horizontal bar showing relative power of each harmonic squared).

**Reference values (callout or table):**
- < 0.1% — Hi-fi audio, precision instrumentation
- < 1% — Acceptable for many biomedical instruments
- 1–5% — Noticeable distortion, may affect signal integrity
- > 10% — Heavily distorted, unsuitable for most measurement applications

---

## Section 7: Why It Matters

**Content:** Ties THD back to the course context.

**Text:**
- Distortion means the output is not a faithful copy of the input.
- In bioinstrumentation, distorted biosignals (ECG, EEG, EMG) can lead to misdiagnosis or missed features.
- Tie-back to amplifier classes: Class A has low THD but poor efficiency; Class D has high efficiency but filtering design is critical to keep THD low.
- Final callout summarizing the core tradeoff: **fidelity vs efficiency**.

**No interactive visualization** — this is a summary/context section.

---

## Technical Notes

- All canvases use `requestAnimationFrame` for smooth animation.
- Canvases are responsive (resize with container via `ResizeObserver`).
- Slider values are shared across sections where relevant (Section 3 sliders feed into Sections 4, 5, and 6).
- Collapsible `<details>/<summary>` wrapping for each Part section, matching existing site pattern.
- Back button links to `../index.html`.
- Page title: `BMEN90033: Total Harmonic Distortion — Interactive Explainer`.
