# Total Harmonic Distortion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an interactive scrollable explainer page teaching Total Harmonic Distortion (THD) with 7 sections, interactive canvas visualizations, and live THD calculation.

**Architecture:** Single self-contained HTML file with inline CSS and JS (matching Class D amplifier page pattern). Scrollable explainer layout with `<details>/<summary>` collapsible sections. All canvases use `requestAnimationFrame` with `ResizeObserver` for responsiveness. Harmonic state is shared globally so Sections 3–6 stay in sync.

**Tech Stack:** Vanilla HTML/CSS/JS, Canvas 2D API, IBM Plex Sans + IBM Plex Mono fonts.

**Spec:** `docs/superpowers/specs/2026-03-30-total-harmonic-distortion-design.md`

**Reference files:**
- `Week 5/class_d_amplifier.html` — scrollable explainer layout, CSS variables, canvas patterns, controls, callouts, equation blocks
- `Week 5/amplifier_bandwidth.html` — `<details>/<summary>` collapsible section pattern
- `index.html` — navigation index (needs updating)

---

### Task 1: Page Skeleton — HTML Structure + CSS

**Files:**
- Create: `Week 5/total_harmonic_distortion.html`

This task creates the full HTML/CSS shell with all 7 sections stubbed out (no JS yet). The page should be viewable with correct layout, typography, and styling — just empty canvas containers.

- [ ] **Step 1: Create the HTML file with full CSS and section structure**

Create `Week 5/total_harmonic_distortion.html` with the following content. This is the complete HTML+CSS shell:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BMEN90033: Total Harmonic Distortion — Interactive Explainer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0e14;
            --bg-panel: rgba(16, 20, 28, 0.92);
            --border: rgba(255,255,255,0.07);
            --border-hover: rgba(255,255,255,0.15);
            --text: #e2e8f0;
            --text-dim: #8892a4;
            --text-muted: #505868;
            --accent: #6aaa8e;
            --yellow: #ffcc44;
            --red: #e06050;
            --blue: #5080d0;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'IBM Plex Sans', -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden;
        }

        .back-btn {
            position: fixed;
            top: 16px;
            left: 16px;
            z-index: 100;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 4px;
            background: var(--bg-panel);
            border: 1px solid var(--border);
            color: var(--text-dim);
            text-decoration: none;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.15s;
        }
        .back-btn:hover { color: #fff; border-color: var(--border-hover); }

        .explainer {
            max-width: 880px;
            margin: 0 auto;
            padding: 72px 24px 120px;
        }

        .title-block {
            margin-bottom: 56px;
        }
        .title-block h1 {
            font-size: 28px;
            font-weight: 700;
            color: #fff;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
        }
        .title-block .sub {
            font-size: 12px;
            color: var(--text-muted);
            font-family: 'IBM Plex Mono', monospace;
            margin-bottom: 12px;
        }
        .title-block p {
            font-size: 14px;
            color: var(--text-dim);
            line-height: 1.7;
            max-width: 640px;
        }

        /* ── Collapsible sections ── */
        .section {
            margin-bottom: 72px;
        }
        .section summary {
            cursor: pointer;
            list-style: none;
            display: flex;
            align-items: baseline;
            gap: 12px;
            padding: 12px 0;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--border);
            transition: border-color 0.15s;
        }
        .section summary:hover { border-bottom-color: var(--border-hover); }
        .section summary::-webkit-details-marker { display: none; }
        .section summary::after {
            content: '\25B6';
            font-size: 10px;
            color: var(--text-muted);
            margin-left: auto;
            transition: transform 0.2s;
        }
        .section[open] summary::after {
            transform: rotate(90deg);
        }
        .section-number {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 11px;
            color: var(--accent);
            letter-spacing: 1px;
            text-transform: uppercase;
            flex-shrink: 0;
        }
        .section h2 {
            font-size: 22px;
            font-weight: 700;
            color: #fff;
            letter-spacing: -0.3px;
        }
        .section p, .section li {
            font-size: 14px;
            color: var(--text-dim);
            line-height: 1.8;
            margin-bottom: 12px;
        }
        .section ul {
            padding-left: 20px;
            margin-bottom: 16px;
        }

        /* ── Canvas containers ── */
        .canvas-container {
            position: relative;
            width: 100%;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin: 24px 0 28px;
            overflow: hidden;
        }
        .canvas-container canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        .canvas-tall { height: 420px; }
        .canvas-medium { height: 280px; }
        .canvas-short { height: 200px; }

        /* ── Equation blocks ── */
        .eq-block {
            display: block;
            margin: 16px 0;
            padding: 12px 20px;
            background: rgba(106,170,142,0.06);
            border: 1px solid rgba(106,170,142,0.15);
            border-radius: 6px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 15px;
            color: var(--accent);
            line-height: 1.8;
            text-align: center;
        }
        .eq-block .dim { color: var(--text-muted); }
        .eq-block .hl { color: var(--yellow); }

        /* ── Controls ── */
        .controls-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin: 20px 0;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--bg-panel);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 10px 16px;
        }
        .control-group label {
            font-size: 12px;
            color: var(--text-dim);
            font-weight: 500;
            white-space: nowrap;
        }
        .control-group input[type=range] {
            width: 120px;
            -webkit-appearance: none;
            background: rgba(255,255,255,0.1);
            height: 3px;
            border-radius: 2px;
            outline: none;
        }
        .control-group input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px; height: 14px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
        }
        .control-value {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            color: #fff;
            min-width: 52px;
            text-align: right;
        }

        /* ── Toggle buttons ── */
        .btn-group {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }
        .toggle-btn {
            padding: 8px 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--border);
            color: var(--text-dim);
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .toggle-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .toggle-btn.active {
            background: rgba(106,170,142,0.15);
            border-color: rgba(106,170,142,0.4);
            color: var(--accent);
        }

        /* ── Preset buttons ── */
        .preset-btn {
            padding: 8px 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--border);
            color: var(--text-dim);
            font-size: 12px;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .preset-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .preset-btn.active {
            background: rgba(80,128,208,0.15);
            border-color: rgba(80,128,208,0.4);
            color: var(--blue);
        }

        /* ── Callouts ── */
        .callout {
            padding: 14px 18px;
            background: rgba(106,170,142,0.06);
            border-left: 3px solid var(--accent);
            border-radius: 0 6px 6px 0;
            margin: 16px 0;
            font-size: 13px;
            color: var(--text-dim);
            line-height: 1.7;
        }
        .callout strong { color: #fff; }
        .callout.warn {
            background: rgba(255,200,100,0.06);
            border-left-color: var(--yellow);
        }

        /* ── THD readout ── */
        .thd-readout {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 48px;
            font-weight: 700;
            color: var(--accent);
            text-align: center;
            margin: 24px 0;
            letter-spacing: -1px;
        }
        .thd-readout .unit {
            font-size: 24px;
            color: var(--text-dim);
            font-weight: 500;
        }

        /* ── Contribution bars ── */
        .contrib-bars {
            margin: 24px 0;
        }
        .contrib-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
        }
        .contrib-label {
            font-size: 12px;
            color: var(--text-dim);
            min-width: 100px;
            text-align: right;
            font-weight: 500;
        }
        .contrib-track {
            flex: 1;
            height: 22px;
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--border);
            border-radius: 4px;
            overflow: hidden;
        }
        .contrib-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.2s;
        }
        .contrib-value {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            color: #fff;
            min-width: 60px;
        }

        /* ── Reference table ── */
        .ref-table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 13px;
        }
        .ref-table th {
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid var(--border);
            color: var(--text-dim);
            font-weight: 500;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .ref-table td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--border);
            color: var(--text-dim);
        }
        .ref-table td:first-child {
            font-family: 'IBM Plex Mono', monospace;
            color: var(--accent);
        }

        /* ── Play/reset button ── */
        .action-btn {
            padding: 10px 20px;
            background: var(--bg-panel);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-dim);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
        }
        .action-btn:hover { color: #fff; border-color: var(--border-hover); }
    </style>
</head>
<body>

<a class="back-btn" href="../index.html">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
    </svg>
    Back
</a>

<div class="explainer">

    <!-- TITLE -->
    <div class="title-block">
        <div class="sub">BMEN90033 &middot; Week 5</div>
        <h1>Total Harmonic Distortion</h1>
        <p>When an amplifier's output isn't a perfect copy of its input, the difference is called distortion.
           Total Harmonic Distortion (THD) quantifies this by measuring how much unwanted harmonic content
           has been added to the signal. This page walks through harmonics, how they combine to distort a
           waveform, how engineers measure them, and why it matters for bioinstrumentation.</p>
    </div>

    <!-- SECTION 1: The Pure Fundamental -->
    <details class="section" id="sec-fundamental" open>
        <summary>
            <span class="section-number">Part 01</span>
            <h2>The Pure Fundamental</h2>
        </summary>

        <p>Every periodic signal has a fundamental frequency — the lowest frequency component, and the one
           that defines the signal's pitch or repetition rate. Here is a pure sine wave at a single frequency.
           This is what a perfect, undistorted signal looks like.</p>

        <div class="canvas-container canvas-medium">
            <canvas id="canvas-fundamental"></canvas>
        </div>

        <div class="controls-row">
            <div class="control-group">
                <label>Frequency</label>
                <input type="range" id="slider-freq" min="50" max="2000" step="10" value="440">
                <span class="control-value" id="val-freq">440 Hz</span>
            </div>
        </div>

        <div class="callout">
            <strong>This is our reference.</strong> Any deviation from this pure shape means distortion has been introduced.
            The question is: how do we measure that deviation?
        </div>
    </details>

    <!-- SECTION 2: What Are Harmonics? -->
    <details class="section" id="sec-harmonics" open>
        <summary>
            <span class="section-number">Part 02</span>
            <h2>What Are Harmonics?</h2>
        </summary>

        <p>Harmonics are sine waves at exact integer multiples of the fundamental frequency. The 2nd harmonic
           is at 2&times; the fundamental, the 3rd at 3&times;, and so on. Each harmonic has its own amplitude
           and phase.</p>

        <div class="canvas-container canvas-medium">
            <canvas id="canvas-harmonics"></canvas>
        </div>

        <div class="controls-row">
            <div class="btn-group">
                <button class="toggle-btn active" id="btn-h2" onclick="selectHarmonic(2)">2nd</button>
                <button class="toggle-btn" id="btn-h3" onclick="selectHarmonic(3)">3rd</button>
                <button class="toggle-btn" id="btn-h4" onclick="selectHarmonic(4)">4th</button>
                <button class="toggle-btn" id="btn-h5" onclick="selectHarmonic(5)">5th</button>
            </div>
        </div>

        <div class="callout">
            <strong>Even vs odd harmonics:</strong> Push-pull amplifier topologies (Class B, AB) tend to cancel
            even harmonics (2nd, 4th) due to symmetry, leaving predominantly odd harmonics (3rd, 5th). Single-ended
            designs (Class A) produce both even and odd harmonics.
        </div>
    </details>

    <!-- SECTION 3: Combining Harmonics -->
    <details class="section" id="sec-combining" open>
        <summary>
            <span class="section-number">Part 03</span>
            <h2>Combining Harmonics — Building Distortion</h2>
        </summary>

        <p>Now let's see what happens when harmonics are added to the fundamental. Drag the sliders to add
           harmonic content and watch the waveform distort in real-time. The faint coloured traces show
           individual harmonics; the bright white trace is the combined (distorted) signal.</p>

        <div class="canvas-container canvas-tall">
            <canvas id="canvas-combined"></canvas>
        </div>

        <div class="controls-row">
            <div class="control-group">
                <label>2nd</label>
                <input type="range" id="slider-h2" min="0" max="100" step="1" value="0">
                <span class="control-value" id="val-h2">0%</span>
            </div>
            <div class="control-group">
                <label>3rd</label>
                <input type="range" id="slider-h3" min="0" max="100" step="1" value="0">
                <span class="control-value" id="val-h3">0%</span>
            </div>
            <div class="control-group">
                <label>4th</label>
                <input type="range" id="slider-h4" min="0" max="100" step="1" value="0">
                <span class="control-value" id="val-h4">0%</span>
            </div>
            <div class="control-group">
                <label>5th</label>
                <input type="range" id="slider-h5" min="0" max="100" step="1" value="0">
                <span class="control-value" id="val-h5">0%</span>
            </div>
        </div>

        <p>Load a typical amplifier harmonic profile:</p>
        <div class="controls-row">
            <div class="btn-group">
                <button class="preset-btn" id="preset-a" onclick="loadPreset('A')">Class A</button>
                <button class="preset-btn" id="preset-ab" onclick="loadPreset('AB')">Class AB</button>
                <button class="preset-btn" id="preset-b" onclick="loadPreset('B')">Class B</button>
                <button class="preset-btn" id="preset-clear" onclick="loadPreset('clear')">Clear</button>
            </div>
        </div>

        <p>Amplitude vs frequency — the harmonic spectrum of the current signal:</p>
        <div class="canvas-container canvas-medium">
            <canvas id="canvas-spectrum-sec3"></canvas>
        </div>

        <div class="callout">
            <strong>Try the presets.</strong> Notice how Class B has prominent odd harmonics (3rd, 5th) from
            crossover distortion, while Class A shows lower, more evenly distributed harmonics.
        </div>
    </details>

    <!-- SECTION 4: Fourier Decomposition -->
    <details class="section" id="sec-fourier" open>
        <summary>
            <span class="section-number">Part 04</span>
            <h2>Fourier Decomposition — Pulling Apart a Signal</h2>
        </summary>

        <p>In 1807, Joseph Fourier showed that any periodic signal can be expressed as a sum of sinusoids.
           This means we can take a distorted waveform and decompose it back into its individual frequency
           components — the fundamental and each harmonic.</p>

        <p>Press play to see the current distorted waveform separate into its constituent sine waves:</p>

        <div class="canvas-container canvas-tall">
            <canvas id="canvas-fourier"></canvas>
        </div>

        <div class="controls-row">
            <button class="action-btn" id="btn-decompose" onclick="toggleDecomposition()">&#9654; Decompose</button>
            <button class="action-btn" id="btn-reset-fourier" onclick="resetDecomposition()">Reset</button>
        </div>

        <div class="callout">
            <strong>This is the conceptual foundation.</strong> Any periodic signal, no matter how complex,
            is just a sum of simple sine waves. The next section shows the practical tool engineers use to
            perform this decomposition.
        </div>
    </details>

    <!-- SECTION 5: The Frequency Spectrum -->
    <details class="section" id="sec-spectrum" open>
        <summary>
            <span class="section-number">Part 05</span>
            <h2>The Frequency Spectrum — Measuring Harmonics</h2>
        </summary>

        <p>In practice, engineers use the Fast Fourier Transform (FFT) to convert a time-domain signal into
           its frequency-domain representation. The result is a spectrum: a plot of amplitude vs frequency
           that reveals every harmonic component present in the signal.</p>

        <div class="canvas-container canvas-medium">
            <canvas id="canvas-spectrum"></canvas>
        </div>

        <p>This spectrum updates live as you adjust the harmonic sliders in Part 03. Each bar represents
           a frequency component. The tallest bar at <em>f</em> is the fundamental; any bars at
           2<em>f</em>, 3<em>f</em>, etc. are harmonics that shouldn't be there.</p>

        <div class="callout">
            <strong>This is how engineers measure distortion in practice</strong> — feed a pure sine into
            the amplifier input, look at the output spectrum, and measure what shouldn't be there. The ratio
            of unwanted harmonics to the fundamental gives us THD.
        </div>
    </details>

    <!-- SECTION 6: The THD Formula -->
    <details class="section" id="sec-thd" open>
        <summary>
            <span class="section-number">Part 06</span>
            <h2>The THD Formula</h2>
        </summary>

        <p>Total Harmonic Distortion is defined as the ratio of the root-sum-square of all harmonic amplitudes
           to the fundamental amplitude:</p>

        <div class="eq-block">
            THD = <span class="dim">&radic;(</span>V<sub>2</sub><sup>2</sup> + V<sub>3</sub><sup>2</sup>
            + V<sub>4</sub><sup>2</sup> + V<sub>5</sub><sup>2</sup><span class="dim">)</span>
            / V<sub>1</sub> <span class="dim">&times;</span> <span class="hl">100%</span>
        </div>

        <div class="thd-readout">
            <span id="thd-value">0.00</span><span class="unit">%</span>
        </div>

        <p>Each harmonic's contribution to the total:</p>

        <div class="contrib-bars">
            <div class="contrib-row">
                <span class="contrib-label">2nd harmonic</span>
                <div class="contrib-track">
                    <div class="contrib-fill" id="contrib-h2" style="width:0%; background: rgba(80,128,208,0.7);"></div>
                </div>
                <span class="contrib-value" id="contrib-val-h2">0%</span>
            </div>
            <div class="contrib-row">
                <span class="contrib-label">3rd harmonic</span>
                <div class="contrib-track">
                    <div class="contrib-fill" id="contrib-h3" style="width:0%; background: rgba(106,170,142,0.7);"></div>
                </div>
                <span class="contrib-value" id="contrib-val-h3">0%</span>
            </div>
            <div class="contrib-row">
                <span class="contrib-label">4th harmonic</span>
                <div class="contrib-track">
                    <div class="contrib-fill" id="contrib-h4" style="width:0%; background: rgba(255,204,68,0.7);"></div>
                </div>
                <span class="contrib-value" id="contrib-val-h4">0%</span>
            </div>
            <div class="contrib-row">
                <span class="contrib-label">5th harmonic</span>
                <div class="contrib-track">
                    <div class="contrib-fill" id="contrib-h5" style="width:0%; background: rgba(224,96,80,0.7);"></div>
                </div>
                <span class="contrib-value" id="contrib-val-h5">0%</span>
            </div>
        </div>

        <table class="ref-table">
            <thead>
                <tr><th>THD</th><th>Quality</th><th>Typical Application</th></tr>
            </thead>
            <tbody>
                <tr><td>&lt; 0.1%</td><td>Excellent</td><td>Hi-fi audio, precision instrumentation</td></tr>
                <tr><td>&lt; 1%</td><td>Good</td><td>Biomedical instruments (ECG, EEG)</td></tr>
                <tr><td>1 – 5%</td><td>Noticeable</td><td>May affect signal integrity</td></tr>
                <tr><td>&gt; 10%</td><td>Heavy</td><td>Unsuitable for most measurement</td></tr>
            </tbody>
        </table>
    </details>

    <!-- SECTION 7: Why It Matters -->
    <details class="section" id="sec-context" open>
        <summary>
            <span class="section-number">Part 07</span>
            <h2>Why It Matters</h2>
        </summary>

        <p>Distortion means the amplifier's output is not a faithful copy of its input. For audio, this
           might sound unpleasant. For bioinstrumentation, it can be dangerous.</p>

        <p>Biosignals like ECG, EEG, and EMG contain critical diagnostic information in their shape and
           timing. Harmonic distortion can:</p>
        <ul>
            <li>Introduce false peaks that mimic pathological waveforms</li>
            <li>Smooth out sharp features needed for accurate diagnosis</li>
            <li>Shift the apparent amplitude of signal components</li>
        </ul>

        <p>This is the fundamental tradeoff in amplifier design:</p>
        <ul>
            <li><strong>Class A</strong> — lowest THD (~1–2%), but only ~25% power efficient</li>
            <li><strong>Class AB</strong> — moderate THD (~3–5%), ~55% efficient</li>
            <li><strong>Class B</strong> — higher THD from crossover distortion (~5–10%), ~78% efficient</li>
            <li><strong>Class D</strong> — THD depends on filter design, but ~90–95% efficient</li>
        </ul>

        <div class="callout">
            <strong>In bioinstrumentation, fidelity usually wins.</strong> A device that distorts an ECG
            waveform is worse than one that uses more battery. But in portable/wearable devices, power
            efficiency matters too — which is why Class D amplifiers with careful filter design are
            increasingly used, achieving both high efficiency and low THD.
        </div>
    </details>

</div><!-- .explainer -->

<!-- JavaScript will be added in subsequent tasks -->

</body>
</html>
```

- [ ] **Step 2: Verify the page renders correctly**

Open `Week 5/total_harmonic_distortion.html` in a browser. Verify:
- Dark background, correct fonts (IBM Plex Sans/Mono)
- Title block with "BMEN90033 · Week 5" subtitle
- 7 collapsible sections with Part 01–07 labels
- Sections collapse/expand when clicking the summary bar
- Back button in top-left corner
- All canvas containers visible as dark rectangles
- Sliders, buttons, and controls styled correctly
- Equation block with green accent
- THD readout shows "0.00%"
- Reference table renders cleanly
- Contribution bars visible

- [ ] **Step 3: Commit**

```bash
git add "Week 5/total_harmonic_distortion.html"
git commit -m "feat: add THD page HTML/CSS skeleton with all 7 sections"
```

---

### Task 2: Core State + Canvas Infrastructure

**Files:**
- Modify: `Week 5/total_harmonic_distortion.html` (add `<script>` before `</body>`)

This task adds the shared state, canvas setup, resize handling, and animation loop — no drawing yet.

- [ ] **Step 1: Add the script tag with core state and canvas infrastructure**

Replace `<!-- JavaScript will be added in subsequent tasks -->` with the following `<script>` block:

```javascript
<script>
// ═══════════════════════════════════════════════════════
// SHARED STATE
// ═══════════════════════════════════════════════════════
const state = {
    fundamentalFreq: 440,
    harmonics: { 2: 0, 3: 0, 4: 0, 5: 0 }, // amplitude as fraction 0–1
    selectedHarmonic: 2,                      // for Section 2 display
    decomposing: false,                       // Section 4 animation
    decomposeProgress: 0,                     // 0–1
    simTime: 0,
};

// Amplifier class presets: harmonic amplitudes as percentages
const PRESETS = {
    A:     { 2: 2,  3: 1,   4: 0.5, 5: 0.2 },
    AB:    { 2: 5,  3: 3,   4: 1,   5: 0.5 },
    B:     { 2: 3,  3: 8,   4: 1,   5: 4   },
    clear: { 2: 0,  3: 0,   4: 0,   5: 0   },
};

// Harmonic colours
const HARMONIC_COLORS = {
    2: 'rgba(80,128,208,',   // blue
    3: 'rgba(106,170,142,',  // green/accent
    4: 'rgba(255,204,68,',   // yellow
    5: 'rgba(224,96,80,',    // red
};

// ═══════════════════════════════════════════════════════
// CANVAS SETUP
// ═══════════════════════════════════════════════════════
const canvasIds = [
    'canvas-fundamental',
    'canvas-harmonics',
    'canvas-combined',
    'canvas-spectrum-sec3',
    'canvas-fourier',
    'canvas-spectrum',
];

const canvases = {};
const contexts = {};

function initCanvases() {
    for (const id of canvasIds) {
        const c = document.getElementById(id);
        if (c) {
            canvases[id] = c;
            contexts[id] = c.getContext('2d');
            resizeCanvas(c);
        }
    }
}

function resizeCanvas(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resizeAll() {
    for (const id of canvasIds) {
        if (canvases[id]) resizeCanvas(canvases[id]);
    }
}

// ═══════════════════════════════════════════════════════
// SLIDER WIRING
// ═══════════════════════════════════════════════════════
function wireSlider(sliderId, valueId, suffix, callback) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(valueId);
    if (!slider || !display) return;
    slider.addEventListener('input', () => {
        const v = +slider.value;
        display.textContent = v + suffix;
        callback(v);
        updateTHDReadout();
    });
}

function wireFrequencySlider() {
    wireSlider('slider-freq', 'val-freq', ' Hz', (v) => {
        state.fundamentalFreq = v;
    });
}

function wireHarmonicSliders() {
    wireSlider('slider-h2', 'val-h2', '%', (v) => { state.harmonics[2] = v / 100; });
    wireSlider('slider-h3', 'val-h3', '%', (v) => { state.harmonics[3] = v / 100; });
    wireSlider('slider-h4', 'val-h4', '%', (v) => { state.harmonics[4] = v / 100; });
    wireSlider('slider-h5', 'val-h5', '%', (v) => { state.harmonics[5] = v / 100; });
}

// ═══════════════════════════════════════════════════════
// HARMONIC TOGGLE (Section 2)
// ═══════════════════════════════════════════════════════
function selectHarmonic(n) {
    state.selectedHarmonic = n;
    for (let h = 2; h <= 5; h++) {
        const btn = document.getElementById('btn-h' + h);
        if (btn) btn.classList.toggle('active', h === n);
    }
}

// ═══════════════════════════════════════════════════════
// PRESETS (Section 3)
// ═══════════════════════════════════════════════════════
function loadPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    for (let h = 2; h <= 5; h++) {
        state.harmonics[h] = p[h] / 100;
        const slider = document.getElementById('slider-h' + h);
        const display = document.getElementById('val-h' + h);
        if (slider) slider.value = p[h];
        if (display) display.textContent = p[h] + '%';
    }
    // Update active preset button
    ['A', 'AB', 'B', 'clear'].forEach(key => {
        const btn = document.getElementById('preset-' + key.toLowerCase());
        if (btn) btn.classList.toggle('active', key === name);
    });
    updateTHDReadout();
}

// ═══════════════════════════════════════════════════════
// FOURIER DECOMPOSITION (Section 4)
// ═══════════════════════════════════════════════════════
function toggleDecomposition() {
    state.decomposing = !state.decomposing;
    const btn = document.getElementById('btn-decompose');
    if (btn) btn.textContent = state.decomposing ? '\u25A0 Stop' : '\u25B6 Decompose';
}

function resetDecomposition() {
    state.decomposing = false;
    state.decomposeProgress = 0;
    const btn = document.getElementById('btn-decompose');
    if (btn) btn.textContent = '\u25B6 Decompose';
}

// ═══════════════════════════════════════════════════════
// THD CALCULATION
// ═══════════════════════════════════════════════════════
function calculateTHD() {
    const h = state.harmonics;
    const sumSq = h[2]*h[2] + h[3]*h[3] + h[4]*h[4] + h[5]*h[5];
    return Math.sqrt(sumSq) * 100; // as percentage
}

function updateTHDReadout() {
    const thd = calculateTHD();
    const el = document.getElementById('thd-value');
    if (el) el.textContent = thd.toFixed(2);

    // Update contribution bars
    const h = state.harmonics;
    const maxContrib = Math.max(h[2]*h[2], h[3]*h[3], h[4]*h[4], h[5]*h[5], 0.001);
    for (let n = 2; n <= 5; n++) {
        const sq = h[n] * h[n];
        const pct = (sq / maxContrib) * 100;
        const fill = document.getElementById('contrib-h' + n);
        const val = document.getElementById('contrib-val-h' + n);
        if (fill) fill.style.width = pct + '%';
        if (val) val.textContent = (h[n] * 100).toFixed(1) + '%';
    }
}

// ═══════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════
let lastFrameTime = 0;

function animate(timestamp) {
    const dt = lastFrameTime ? (timestamp - lastFrameTime) / 1000 : 0;
    lastFrameTime = timestamp;
    state.simTime += dt;

    // Advance decomposition animation
    if (state.decomposing && state.decomposeProgress < 1) {
        state.decomposeProgress = Math.min(1, state.decomposeProgress + dt * 0.5);
    }

    // Draw all canvases (drawing functions added in subsequent tasks)
    if (typeof drawFundamental === 'function') drawFundamental();
    if (typeof drawHarmonics === 'function') drawHarmonics();
    if (typeof drawCombined === 'function') drawCombined();
    if (typeof drawSpectrumSec3 === 'function') drawSpectrumSec3();
    if (typeof drawFourier === 'function') drawFourier();
    if (typeof drawSpectrum === 'function') drawSpectrum();

    requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
function init() {
    initCanvases();
    wireFrequencySlider();
    wireHarmonicSliders();
    updateTHDReadout();

    window.addEventListener('resize', resizeAll);
    new ResizeObserver(resizeAll).observe(document.querySelector('.explainer'));

    requestAnimationFrame(animate);
}

init();
</script>
```

- [ ] **Step 2: Verify in browser**

Open the page. Verify:
- No console errors
- Sliders update their value displays when dragged
- Frequency slider shows "440 Hz" → "50 Hz" → "2000 Hz"
- Harmonic sliders show "0%" → "100%"
- Preset buttons update slider values (click "Class B", verify sliders jump to 3/8/1/4)
- THD readout updates when sliders change (Class B should show ~9.43%)
- Harmonic toggle buttons switch active state
- Decompose/Reset buttons toggle text

- [ ] **Step 3: Commit**

```bash
git add "Week 5/total_harmonic_distortion.html"
git commit -m "feat: add core state, canvas infra, slider wiring, THD calc"
```

---

### Task 3: Drawing — Section 1 (Fundamental) and Section 2 (Harmonics)

**Files:**
- Modify: `Week 5/total_harmonic_distortion.html` (add drawing functions before the `animate` function)

- [ ] **Step 1: Add the drawFundamental function**

Insert the following before the `// ANIMATION LOOP` comment:

```javascript
// ═══════════════════════════════════════════════════════
// DRAWING: Section 1 — Pure Fundamental
// ═══════════════════════════════════════════════════════
function drawFundamental() {
    const canvas = canvases['canvas-fundamental'];
    const ctx = contexts['canvas-fundamental'];
    if (!canvas || !ctx) return;

    const W = canvas.parentElement.getBoundingClientRect().width;
    const H = canvas.parentElement.getBoundingClientRect().height;
    const midY = H / 2;
    const amp = H * 0.35;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(W, midY);
    ctx.stroke();

    // Axis label
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '10px IBM Plex Mono';
    ctx.fillText('0', 8, midY - 4);

    // Draw sine wave
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cycles = 3;
    for (let x = 0; x < W; x++) {
        const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
        const y = midY - amp * Math.sin(t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Frequency label
    ctx.fillStyle = 'rgba(106,170,142,0.8)';
    ctx.font = '500 11px IBM Plex Mono';
    ctx.fillText('f = ' + state.fundamentalFreq + ' Hz', W - 120, 20);
}
```

- [ ] **Step 2: Add the drawHarmonics function**

Insert immediately after `drawFundamental`:

```javascript
// ═══════════════════════════════════════════════════════
// DRAWING: Section 2 — What Are Harmonics?
// ═══════════════════════════════════════════════════════
function drawHarmonics() {
    const canvas = canvases['canvas-harmonics'];
    const ctx = contexts['canvas-harmonics'];
    if (!canvas || !ctx) return;

    const W = canvas.parentElement.getBoundingClientRect().width;
    const H = canvas.parentElement.getBoundingClientRect().height;
    const midY = H / 2;
    const amp = H * 0.3;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(W, midY);
    ctx.stroke();

    const cycles = 3;
    const n = state.selectedHarmonic;
    const colorBase = HARMONIC_COLORS[n];

    // Draw fundamental (dimmed)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
        const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
        const y = midY - amp * Math.sin(t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw selected harmonic
    ctx.strokeStyle = colorBase + '1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
        const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
        const y = midY - amp * 0.5 * Math.sin(n * t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '500 11px IBM Plex Mono';
    ctx.fillText('fundamental (f)', 12, 20);

    ctx.fillStyle = colorBase + '0.9)';
    ctx.fillText(n + getOrdinalSuffix(n) + ' harmonic (' + n + 'f)', 12, 36);
}

function getOrdinalSuffix(n) {
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
}
```

- [ ] **Step 3: Verify in browser**

Open the page. Verify:
- Section 1: animated white sine wave scrolling, frequency label in bottom-right
- Section 1: frequency slider changes label text (wave speed stays same, that's fine)
- Section 2: dimmed white fundamental + coloured harmonic overlaid
- Section 2: clicking "3rd" shows a wave at 3× the frequency in green
- Section 2: clicking "5th" shows a wave at 5× the frequency in red
- Both canvases animate smoothly

- [ ] **Step 4: Commit**

```bash
git add "Week 5/total_harmonic_distortion.html"
git commit -m "feat: add Section 1 & 2 canvas drawing (fundamental + harmonics)"
```

---

### Task 4: Drawing — Section 3 (Combined Waveform + Spectrum Bar Chart)

**Files:**
- Modify: `Week 5/total_harmonic_distortion.html` (add drawing functions after `drawHarmonics`)

- [ ] **Step 1: Add the drawCombined function**

Insert after `getOrdinalSuffix`:

```javascript
// ═══════════════════════════════════════════════════════
// DRAWING: Section 3 — Combined Waveform
// ═══════════════════════════════════════════════════════
function drawCombined() {
    const canvas = canvases['canvas-combined'];
    const ctx = contexts['canvas-combined'];
    if (!canvas || !ctx) return;

    const W = canvas.parentElement.getBoundingClientRect().width;
    const H = canvas.parentElement.getBoundingClientRect().height;
    const midY = H / 2;
    const amp = H * 0.3;
    const cycles = 3;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY); ctx.lineTo(W, midY);
    ctx.stroke();

    // Draw individual harmonics (faint)
    for (let n = 2; n <= 5; n++) {
        if (state.harmonics[n] < 0.001) continue;
        const colorBase = HARMONIC_COLORS[n];
        ctx.strokeStyle = colorBase + '0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < W; x++) {
            const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
            const y = midY - amp * state.harmonics[n] * Math.sin(n * t);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Draw fundamental (dimmed)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
        const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
        const y = midY - amp * Math.sin(t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw combined signal (bright white)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
        const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
        let val = Math.sin(t); // fundamental
        for (let n = 2; n <= 5; n++) {
            val += state.harmonics[n] * Math.sin(n * t);
        }
        const y = midY - amp * val;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px IBM Plex Mono';
    ctx.fillText('— combined', 12, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText('--- fundamental', 12, 34);
}
```

- [ ] **Step 2: Add the drawSpectrumSec3 function (amplitude vs frequency bar chart)**

Insert immediately after `drawCombined`:

```javascript
// ═══════════════════════════════════════════════════════
// DRAWING: Section 3 — Amplitude vs Frequency Bar Chart
// ═══════════════════════════════════════════════════════
function drawSpectrumSec3() {
    const canvas = canvases['canvas-spectrum-sec3'];
    const ctx = contexts['canvas-spectrum-sec3'];
    if (!canvas || !ctx) return;

    const W = canvas.parentElement.getBoundingClientRect().width;
    const H = canvas.parentElement.getBoundingClientRect().height;

    ctx.clearRect(0, 0, W, H);

    const marginLeft = 60;
    const marginRight = 40;
    const marginTop = 30;
    const marginBottom = 50;
    const plotW = W - marginLeft - marginRight;
    const plotH = H - marginTop - marginBottom;

    // Y-axis (amplitude)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + plotH);
    ctx.lineTo(marginLeft + plotW, marginTop + plotH);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px IBM Plex Mono';
    ctx.textAlign = 'right';
    for (let pct = 0; pct <= 100; pct += 25) {
        const y = marginTop + plotH - (pct / 100) * plotH;
        ctx.fillText(pct + '%', marginLeft - 8, y + 3);
        if (pct > 0) {
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.beginPath();
            ctx.moveTo(marginLeft, y);
            ctx.lineTo(marginLeft + plotW, y);
            ctx.stroke();
        }
    }
    ctx.textAlign = 'left';

    // Bars
    const barLabels = ['f', '2f', '3f', '4f', '5f'];
    const barValues = [1, state.harmonics[2], state.harmonics[3], state.harmonics[4], state.harmonics[5]];
    const barColors = ['rgba(255,255,255,0.6)', HARMONIC_COLORS[2] + '0.7)', HARMONIC_COLORS[3] + '0.7)', HARMONIC_COLORS[4] + '0.7)', HARMONIC_COLORS[5] + '0.7)'];

    const barCount = barLabels.length;
    const barGap = plotW * 0.15 / barCount;
    const barWidth = (plotW - barGap * (barCount + 1)) / barCount;

    for (let i = 0; i < barCount; i++) {
        const x = marginLeft + barGap + i * (barWidth + barGap);
        const barH = barValues[i] * plotH;
        const y = marginTop + plotH - barH;

        ctx.fillStyle = barColors[i];
        ctx.fillRect(x, y, barWidth, barH);

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px IBM Plex Mono';
        ctx.textAlign = 'center';
        ctx.fillText(barLabels[i], x + barWidth / 2, marginTop + plotH + 16);

        // Hz value
        const freqHz = state.fundamentalFreq * (i + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '9px IBM Plex Mono';
        ctx.fillText(freqHz + ' Hz', x + barWidth / 2, marginTop + plotH + 30);

        // Value on top of bar
        if (barValues[i] > 0.005) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '10px IBM Plex Mono';
            ctx.fillText((barValues[i] * 100).toFixed(1) + '%', x + barWidth / 2, y - 6);
        }

        ctx.textAlign = 'left';
    }

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '500 11px IBM Plex Mono';
    ctx.fillText('AMPLITUDE', marginLeft, marginTop - 10);
}
```

- [ ] **Step 3: Verify in browser**

Open the page. Verify:
- Section 3 top canvas: white combined waveform with dashed fundamental underneath
- Dragging "2nd" slider to 50% shows a blue faint wave and the combined waveform distorts
- Clicking "Class B" preset: sliders jump, waveform visibly distorts, faint coloured harmonics visible
- Section 3 bottom canvas: bar chart with 5 bars (f, 2f, 3f, 4f, 5f)
- Fundamental bar (f) always at 100%
- Harmonic bars update as sliders change
- Hz labels update when frequency slider changes
- "Clear" preset resets everything to 0

- [ ] **Step 4: Commit**

```bash
git add "Week 5/total_harmonic_distortion.html"
git commit -m "feat: add Section 3 drawing (combined waveform + spectrum bars)"
```

---

### Task 5: Drawing — Section 4 (Fourier Decomposition Animation)

**Files:**
- Modify: `Week 5/total_harmonic_distortion.html` (add drawing function after `drawSpectrumSec3`)

- [ ] **Step 1: Add the drawFourier function**

Insert after `drawSpectrumSec3`:

```javascript
// ═══════════════════════════════════════════════════════
// DRAWING: Section 4 — Fourier Decomposition
// ═══════════════════════════════════════════════════════
function drawFourier() {
    const canvas = canvases['canvas-fourier'];
    const ctx = contexts['canvas-fourier'];
    if (!canvas || !ctx) return;

    const W = canvas.parentElement.getBoundingClientRect().width;
    const H = canvas.parentElement.getBoundingClientRect().height;
    const cycles = 3;

    ctx.clearRect(0, 0, W, H);

    // Count active harmonics (amplitude > 0)
    const activeHarmonics = [];
    for (let n = 2; n <= 5; n++) {
        if (state.harmonics[n] > 0.001) activeHarmonics.push(n);
    }

    // Total lanes: fundamental + each active harmonic
    const laneCount = 1 + activeHarmonics.length;
    const p = state.decomposeProgress; // 0 = stacked, 1 = separated

    if (laneCount === 1 && p < 0.01) {
        // No harmonics active — just show fundamental
        const midY = H / 2;
        const amp = H * 0.35;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < W; x++) {
            const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
            const y = midY - amp * Math.sin(t);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px IBM Plex Mono';
        ctx.fillText('Add harmonics in Part 03, then press Decompose', 12, 20);
        return;
    }

    // Calculate lane positions
    const laneH = H / laneCount;
    const lanes = []; // { midY, label, color, multiplier, amplitude }

    // Fundamental lane
    lanes.push({
        midY: laneH / 2,
        label: 'fundamental (f)',
        color: '#ffffff',
        multiplier: 1,
        amplitude: 1,
    });

    // Harmonic lanes
    activeHarmonics.forEach((n, i) => {
        lanes.push({
            midY: laneH * (i + 1) + laneH / 2,
            label: n + getOrdinalSuffix(n) + ' harmonic (' + n + 'f)',
            color: HARMONIC_COLORS[n] + '1)',
            multiplier: n,
            amplitude: state.harmonics[n],
        });
    });

    // When p=0, all waves are drawn summed at H/2
    // When p=1, each wave is in its own lane
    const stackedMidY = H / 2;
    const stackedAmp = H * 0.3;

    // Draw lane separators (fade in with progress)
    if (p > 0.01) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.06 * p) + ')';
        ctx.lineWidth = 1;
        for (let i = 1; i < laneCount; i++) {
            const y = i * laneH;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
    }

    // Draw each component
    lanes.forEach((lane, i) => {
        const targetMidY = lane.midY;
        const currentMidY = stackedMidY + (targetMidY - stackedMidY) * p;
        const targetAmp = (laneH * 0.35) * lane.amplitude;
        const stackedAmpVal = stackedAmp * lane.amplitude;
        const currentAmp = stackedAmpVal + (targetAmp - stackedAmpVal) * p;

        ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,' + (0.4 + 0.6 * p) + ')' : lane.color;
        ctx.lineWidth = i === 0 ? 2 : 1.5;
        ctx.beginPath();
        for (let x = 0; x < W; x++) {
            const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
            const y = currentMidY - currentAmp * Math.sin(lane.multiplier * t);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Lane labels (fade in)
        if (p > 0.1) {
            ctx.fillStyle = (i === 0 ? 'rgba(255,255,255,' : lane.color.replace('1)', '')) + (0.7 * p) + ')';
            ctx.font = '500 10px IBM Plex Mono';
            ctx.fillText(lane.label, 12, currentMidY - (laneH * 0.35) * lane.amplitude - 6);
        }
    });

    // When not decomposed, also draw the combined wave prominently
    if (p < 0.99) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - p) * 0.8 + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < W; x++) {
            const t = (x / W) * cycles * 2 * Math.PI + state.simTime * 3;
            let val = Math.sin(t);
            for (let n = 2; n <= 5; n++) {
                val += state.harmonics[n] * Math.sin(n * t);
            }
            const y = stackedMidY - stackedAmp * val;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}
```

- [ ] **Step 2: Verify in browser**

Open the page. Verify:
- With no harmonics: shows fundamental with instruction text
- Set some harmonics (e.g. Class AB preset), scroll to Section 4
- Click "Decompose": combined wave smoothly separates into individual sine lanes over ~2 seconds
- Each lane shows the correct frequency (3rd harmonic visibly 3× the frequency)
- Lane labels fade in as components separate
- Click "Reset": everything snaps back to stacked position
- The combined wave fades out as decomposition progresses

- [ ] **Step 3: Commit**

```bash
git add "Week 5/total_harmonic_distortion.html"
git commit -m "feat: add Section 4 Fourier decomposition animation"
```

---

### Task 6: Drawing — Section 5 (Frequency Spectrum)

**Files:**
- Modify: `Week 5/total_harmonic_distortion.html` (add drawing function after `drawFourier`)

- [ ] **Step 1: Add the drawSpectrum function**

Insert after `drawFourier`:

```javascript
// ═══════════════════════════════════════════════════════
// DRAWING: Section 5 — Frequency Spectrum
// ═══════════════════════════════════════════════════════
function drawSpectrum() {
    const canvas = canvases['canvas-spectrum'];
    const ctx = contexts['canvas-spectrum'];
    if (!canvas || !ctx) return;

    const W = canvas.parentElement.getBoundingClientRect().width;
    const H = canvas.parentElement.getBoundingClientRect().height;

    ctx.clearRect(0, 0, W, H);

    const marginLeft = 60;
    const marginRight = 40;
    const marginTop = 30;
    const marginBottom = 50;
    const plotW = W - marginLeft - marginRight;
    const plotH = H - marginTop - marginBottom;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + plotH);
    ctx.lineTo(marginLeft + plotW, marginTop + plotH);
    ctx.stroke();

    // Y-axis: dB scale (0 to -60 dB)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px IBM Plex Mono';
    ctx.textAlign = 'right';
    const dbMin = -60;
    for (let db = 0; db >= dbMin; db -= 20) {
        const y = marginTop + (-db / -dbMin) * plotH;
        ctx.fillText(db + ' dB', marginLeft - 8, y + 3);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(marginLeft + plotW, y);
        ctx.stroke();
    }
    ctx.textAlign = 'left';

    // Bars — show up to 8 frequency bins (fundamental + harmonics + noise floor)
    const barLabels = ['f', '2f', '3f', '4f', '5f', '6f', '7f', '8f'];
    const barAmplitudes = [
        1,
        state.harmonics[2],
        state.harmonics[3],
        state.harmonics[4],
        state.harmonics[5],
        0.001, // noise floor visualization
        0.001,
        0.001,
    ];
    const barColors = [
        'rgba(255,255,255,0.7)',
        HARMONIC_COLORS[2] + '0.8)',
        HARMONIC_COLORS[3] + '0.8)',
        HARMONIC_COLORS[4] + '0.8)',
        HARMONIC_COLORS[5] + '0.8)',
        'rgba(255,255,255,0.08)',
        'rgba(255,255,255,0.08)',
        'rgba(255,255,255,0.08)',
    ];

    const barCount = barLabels.length;
    const barGap = plotW * 0.08 / barCount;
    const barWidth = (plotW - barGap * (barCount + 1)) / barCount;

    for (let i = 0; i < barCount; i++) {
        const x = marginLeft + barGap + i * (barWidth + barGap);
        const amplitude = Math.max(barAmplitudes[i], 0.001);
        const db = 20 * Math.log10(amplitude);
        const clampedDb = Math.max(db, dbMin);
        const barH = (1 - clampedDb / dbMin) * plotH;
        const y = marginTop + plotH - barH;

        // Glow effect for active harmonics
        if (barAmplitudes[i] > 0.01) {
            ctx.shadowColor = barColors[i];
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = barColors[i];
        ctx.fillRect(x, y, barWidth, barH);
        ctx.shadowBlur = 0;

        // Frequency label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px IBM Plex Mono';
        ctx.textAlign = 'center';
        ctx.fillText(barLabels[i], x + barWidth / 2, marginTop + plotH + 16);

        // Hz value
        const freqHz = state.fundamentalFreq * (i + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '9px IBM Plex Mono';
        ctx.fillText(freqHz + '', x + barWidth / 2, marginTop + plotH + 30);

        ctx.textAlign = 'left';
    }

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '500 11px IBM Plex Mono';
    ctx.fillText('FREQUENCY SPECTRUM (dB)', marginLeft, marginTop - 10);
}
```

- [ ] **Step 2: Verify in browser**

Open the page. Verify:
- Section 5 shows a frequency spectrum with 8 bars
- Fundamental bar (f) is at 0 dB, always tallest
- Harmonic bars reflect slider values from Section 3
- Bars 6f, 7f, 8f show at noise floor level
- Active harmonics have subtle glow effect
- dB scale on y-axis reads 0, -20, -40, -60
- Hz values update when fundamental frequency changes

- [ ] **Step 3: Commit**

```bash
git add "Week 5/total_harmonic_distortion.html"
git commit -m "feat: add Section 5 frequency spectrum (dB scale)"
```

---

### Task 7: Update index.html Navigation

**Files:**
- Modify: `index.html` (Week 5 section)

- [ ] **Step 1: Insert THD link and renumber subsequent items**

In `index.html`, find the Week 5 topics section. Insert the THD link between Amplifier Classes and Class D Amplifier, renumbering:

Replace:
```html
            <div class="topics">
                <a href="Week 5/amplifier_classes.html" class="topic">
                    <span class="topic-number">1</span>
                    <span class="topic-title">Amplifier Classes</span>
                </a>
                <a href="Week 5/class_d_amplifier.html" class="topic">
                    <span class="topic-number">2</span>
                    <span class="topic-title">Class D Amplifier</span>
                </a>
                <a href="Week 5/amplifier_bandwidth.html" class="topic">
                    <span class="topic-number">3</span>
                    <span class="topic-title">Amplifier Bandwidth</span>
                </a>
                <a href="Week 5/lab_circuit_analysis.html" class="topic">
                    <span class="topic-number">4</span>
                    <span class="topic-title">Lab Circuit Analysis</span>
                </a>
            </div>
```

With:
```html
            <div class="topics">
                <a href="Week 5/amplifier_classes.html" class="topic">
                    <span class="topic-number">1</span>
                    <span class="topic-title">Amplifier Classes</span>
                </a>
                <a href="Week 5/total_harmonic_distortion.html" class="topic">
                    <span class="topic-number">2</span>
                    <span class="topic-title">Total Harmonic Distortion</span>
                </a>
                <a href="Week 5/class_d_amplifier.html" class="topic">
                    <span class="topic-number">3</span>
                    <span class="topic-title">Class D Amplifier</span>
                </a>
                <a href="Week 5/amplifier_bandwidth.html" class="topic">
                    <span class="topic-number">4</span>
                    <span class="topic-title">Amplifier Bandwidth</span>
                </a>
                <a href="Week 5/lab_circuit_analysis.html" class="topic">
                    <span class="topic-number">5</span>
                    <span class="topic-title">Lab Circuit Analysis</span>
                </a>
            </div>
```

- [ ] **Step 2: Verify in browser**

Open `index.html`. Verify:
- Week 5 now shows 5 items numbered 1–5
- "Total Harmonic Distortion" appears as item 2
- "Class D Amplifier" is now item 3
- Clicking "Total Harmonic Distortion" navigates to the THD page
- Back button on THD page returns to index

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add THD page to Week 5 navigation, renumber items"
```

---

### Task 8: Final Verification + Polish

**Files:**
- Modify: `Week 5/total_harmonic_distortion.html` (if any fixes needed)

- [ ] **Step 1: Full end-to-end test**

Open `index.html` → click "Total Harmonic Distortion" → verify all 7 sections:

1. **Section 1:** Animated sine wave, frequency slider works
2. **Section 2:** Harmonic overlay, toggle buttons switch harmonics
3. **Section 3:** Combined waveform distorts with sliders, presets load correctly, bar chart updates live
4. **Section 4:** Decompose animation separates waveform into components, Reset works
5. **Section 5:** dB spectrum with 8 bars, updates live with Section 3 sliders
6. **Section 6:** THD% readout updates, contribution bars show relative power, reference table renders
7. **Section 7:** Static text content, callout renders correctly
8. **Navigation:** Back button works, all sections collapse/expand
9. **Responsive:** Resize window — canvases resize, no horizontal overflow

- [ ] **Step 2: Fix any issues found**

Address any rendering bugs, alignment issues, or console errors found during testing.

- [ ] **Step 3: Final commit (if any fixes were made)**

```bash
git add "Week 5/total_harmonic_distortion.html"
git commit -m "fix: polish THD page after end-to-end review"
```
