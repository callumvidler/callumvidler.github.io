# Amplifier Bandwidth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive "Amplifier Bandwidth" page that teaches students the single-pole low-pass transfer function H(jw) = Av / (1 + j(w/w0)) through an animated RC circuit, live Bode plot, and dynamic equation highlighting.

**Architecture:** Single self-contained HTML file with inline CSS and JS. 2x2 grid dashboard layout matching `Week 4/bjt_semiconductors.html`. All rendering via Canvas 2D and styled HTML. No external libraries beyond Google Fonts.

**Tech Stack:** Vanilla JavaScript, Canvas 2D API, CSS Grid, IBM Plex (Google Fonts)

---

## File Map

- **Create:** `Week 5/amplifier_bandwidth.html` — the full interactive page (single file: HTML + CSS + JS)
- **Modify:** `index.html` — add Week 5 section with link to the new page

---

### Task 1: Scaffold the HTML shell and 2x2 grid layout

**Files:**
- Create: `Week 5/amplifier_bandwidth.html`

- [ ] **Step 1: Create the Week 5 directory**

```bash
mkdir -p "Week 5"
```

- [ ] **Step 2: Write the HTML scaffold with header and 2x2 grid**

Create `Week 5/amplifier_bandwidth.html` with the full CSS and empty panel structure. This matches the `bjt_semiconductors.html` pattern exactly.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BMEN90033: Amplifier Bandwidth</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-deep: #1a1a1e;
            --bg-panel: #222226;
            --bg-card: #2a2a2f;
            --border: rgba(255,255,255,0.08);
            --accent: #6aaa8e;
            --text: #ffffff;
            --text-dim: #a0a0a0;
            --text-muted: #606060;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'IBM Plex Sans', -apple-system, sans-serif;
            background: var(--bg-deep);
            color: var(--text);
            min-height: 100vh;
            overflow: hidden;
        }

        header {
            padding: 0.55rem 1.25rem;
            border-bottom: 1px solid var(--border);
            background: var(--bg-panel);
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 10;
        }

        .header-left { display: flex; align-items: center; gap: 12px; }

        .back-btn {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 4px 10px; border-radius: 3px;
            background: rgba(255,255,255,0.05); border: 1px solid var(--border);
            color: var(--text-dim); text-decoration: none;
            font-size: 11px; font-weight: 500; transition: all 0.15s;
        }
        .back-btn:hover { color: #fff; border-color: rgba(255,255,255,0.18); }

        h1 { font-size: 0.85rem; font-weight: 600; letter-spacing: -0.01em; }
        .header-sub { font-size: 0.65rem; color: var(--text-dim); margin-top: 1px; }

        .main-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            height: calc(100vh - 42px);
            gap: 0;
        }

        .panel {
            background: var(--bg-panel);
            border: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .panel-header {
            padding: 0.4rem 0.75rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.72rem;
            color: var(--text-dim);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-card);
            flex-shrink: 0;
        }
        .panel-header strong { color: var(--text); font-weight: 500; font-size: 0.75rem; }

        .panel-body {
            flex: 1;
            position: relative;
            min-height: 0;
        }
        .panel-body canvas { display: block; width: 100%; height: 100%; }

        /* Controls panel */
        .controls-panel {
            background: var(--bg-deep);
            border: 1px solid var(--border);
            overflow-y: auto;
            padding: 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .ctrl-section {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 3px;
            padding: 0.45rem 0.55rem;
        }

        .ctrl-title {
            font-size: 0.65rem;
            font-weight: 500;
            color: var(--text-dim);
            margin-bottom: 0.35rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .ctrl-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 0.3rem;
        }
        .ctrl-row:last-child { margin-bottom: 0; }

        .ctrl-row label {
            font-size: 0.68rem;
            color: var(--text-dim);
            min-width: 55px;
            flex-shrink: 0;
        }

        .ctrl-row input[type=range] {
            flex: 1;
            -webkit-appearance: none;
            background: rgba(255,255,255,0.1);
            height: 3px;
            border-radius: 2px;
            outline: none;
        }
        .ctrl-row input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px; height: 12px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
        }

        .ctrl-val {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.68rem;
            color: #fff;
            min-width: 56px;
            width: 80px;
            text-align: right;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 3px;
            padding: 2px 6px;
        }

        .btn-group {
            display: flex;
            gap: 3px;
        }
        .toggle-btn {
            flex: 1;
            padding: 5px 10px;
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--border);
            color: var(--text-dim);
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.65rem;
            font-weight: 500;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.15s;
            text-align: center;
        }
        .toggle-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .toggle-btn.active {
            background: rgba(255,255,255,0.12);
            border-color: rgba(255,255,255,0.18);
            color: #fff;
        }

        /* Equations panel */
        .eq-panel {
            background: var(--bg-deep);
            border: 1px solid var(--border);
            overflow-y: auto;
            padding: 0.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .eq-section {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 3px;
            padding: 0.45rem 0.55rem;
        }

        .eq-title {
            font-size: 0.65rem;
            font-weight: 500;
            color: var(--text-dim);
            margin-bottom: 0.35rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .equation {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.82rem;
            color: #fff;
            line-height: 1.8;
            padding: 0.3rem 0;
        }

        .equation .dim {
            color: var(--text-muted);
            transition: color 0.3s;
        }

        .equation .highlight {
            color: var(--accent);
            transition: color 0.3s;
        }

        .regime-label {
            display: inline-block;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.7rem;
            font-weight: 500;
            padding: 3px 10px;
            border-radius: 3px;
            background: rgba(106,170,142,0.15);
            color: var(--accent);
            border: 1px solid rgba(106,170,142,0.3);
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            color: var(--text-dim);
            padding: 0.15rem 0;
        }
        .info-row .val {
            font-family: 'IBM Plex Mono', monospace;
            color: #fff;
        }

        .derived-readout {
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.78rem;
            color: var(--accent);
            text-align: center;
            padding: 0.4rem;
            background: rgba(106,170,142,0.08);
            border: 1px solid rgba(106,170,142,0.2);
            border-radius: 3px;
        }
    </style>
</head>
<body>

<header>
    <div class="header-left">
        <a href="../index.html" class="back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round">
                <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Back
        </a>
        <div>
            <h1>Amplifier Bandwidth</h1>
            <div class="header-sub">BMEN90033 · Week 5</div>
        </div>
    </div>
</header>

<div class="main-layout">
    <!-- Top-left: Animated RC Circuit -->
    <div class="panel">
        <div class="panel-header"><strong>RC Circuit Model</strong><span id="circuit-freq-label">—</span></div>
        <div class="panel-body"><canvas id="circuit-canvas"></canvas></div>
    </div>
    <!-- Top-right: Bode Plot -->
    <div class="panel">
        <div class="panel-header"><strong>Bode Magnitude Plot</strong><span id="bode-gain-label">—</span></div>
        <div class="panel-body"><canvas id="bode-canvas"></canvas></div>
    </div>
    <!-- Bottom-left: Controls -->
    <div class="controls-panel" id="controls-panel">
        <!-- Controls will be populated in Step 4 -->
    </div>
    <!-- Bottom-right: Equations -->
    <div class="eq-panel" id="eq-panel">
        <!-- Equations will be populated in Step 5 -->
    </div>
</div>

<script>
// ── State ──────────────────────────────────────────────
let R = 10000;          // Ohms (default 10k)
let C = 1e-9;           // Farads (default 1nF)
let Av = 100;           // mid-band gain (linear)
let testFreq = 1e5;     // rad/s

function omega0() { return 1 / (R * C); }
function gainAt(w) { return Av / Math.sqrt(1 + (w / omega0()) ** 2); }
function gainDb(w) { return 20 * Math.log10(gainAt(w)); }

// ── Canvas references (populated in init) ──────────────
let circuitCanvas, circuitCtx;
let bodeCanvas, bodeCtx;

// ── Resize helper ──────────────────────────────────────
function sizeCanvas(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height, ctx };
}

// ── Init ───────────────────────────────────────────────
function init() {
    circuitCanvas = document.getElementById('circuit-canvas');
    bodeCanvas = document.getElementById('bode-canvas');
    circuitCtx = circuitCanvas.getContext('2d');
    bodeCtx = bodeCanvas.getContext('2d');

    window.addEventListener('resize', () => { /* redraw on resize */ });
    animate();
}

let animTime = 0;
function animate() {
    animTime += 0.016;
    requestAnimationFrame(animate);
}

document.addEventListener('DOMContentLoaded', init);
</script>

</body>
</html>
```

- [ ] **Step 3: Verify the scaffold opens in a browser**

```bash
open "Week 5/amplifier_bandwidth.html"
```

Expected: dark page with header "Amplifier Bandwidth", four empty panels in a 2x2 grid, back button links to index.

- [ ] **Step 4: Commit scaffold**

```bash
git add "Week 5/amplifier_bandwidth.html"
git commit -m "feat: scaffold amplifier bandwidth page with 2x2 grid layout"
```

---

### Task 2: Build the controls panel (bottom-left)

**Files:**
- Modify: `Week 5/amplifier_bandwidth.html`

- [ ] **Step 1: Add controls HTML inside the `controls-panel` div**

Replace the `<!-- Controls will be populated in Step 4 -->` comment with:

```html
<div class="ctrl-section">
    <div class="ctrl-title">Component Values</div>
    <div class="ctrl-row">
        <label>R</label>
        <input type="range" id="r-slider" min="0" max="1" step="0.001" value="0.5">
        <span class="ctrl-val" id="r-val">10 k&#8486;</span>
    </div>
    <div class="ctrl-row">
        <label>C</label>
        <input type="range" id="c-slider" min="0" max="1" step="0.001" value="0.5">
        <span class="ctrl-val" id="c-val">1.0 nF</span>
    </div>
</div>

<div class="ctrl-section">
    <div class="ctrl-title">Amplifier</div>
    <div class="ctrl-row">
        <label>A<sub>v</sub></label>
        <input type="range" id="av-slider" min="0" max="1" step="0.001" value="0.667">
        <span class="ctrl-val" id="av-val">100 (40 dB)</span>
    </div>
</div>

<div class="ctrl-section">
    <div class="ctrl-title">Test Signal</div>
    <div class="ctrl-row">
        <label>&#969;</label>
        <input type="range" id="freq-slider" min="0" max="1" step="0.001" value="0.5">
        <span class="ctrl-val" id="freq-val">100 krad/s</span>
    </div>
    <div class="info-row">
        <span>Frequency</span>
        <span class="val" id="freq-hz-val">15.9 kHz</span>
    </div>
</div>

<div class="derived-readout" id="omega0-readout">
    &#969;<sub>0</sub> = 1/RC = 100 krad/s
</div>

<div class="ctrl-section">
    <div class="ctrl-title">Presets</div>
    <div class="btn-group">
        <button class="toggle-btn" id="preset-audio">Audio Amp</button>
        <button class="toggle-btn" id="preset-rf">RF Stage</button>
    </div>
</div>
```

- [ ] **Step 2: Add JavaScript for log-scale slider mapping and state updates**

Add these functions inside the `<script>` tag, before `init()`:

```javascript
// ── Log-scale slider helpers ───────────────────────────
// Maps slider [0,1] to [min,max] on a log scale
function logMap(t, min, max) {
    return min * Math.pow(max / min, t);
}
function logUnmap(val, min, max) {
    return Math.log(val / min) / Math.log(max / min);
}

// Slider ranges
const R_MIN = 100, R_MAX = 100000;           // 100 Ohm – 100 kOhm
const C_MIN = 1e-12, C_MAX = 100e-9;         // 1 pF – 100 nF
const AV_MIN = 1, AV_MAX = 1000;             // 1 – 1000
const FREQ_MIN = 1, FREQ_MAX = 1e9;          // 1 rad/s – 1 Grad/s

// ── Formatting helpers ─────────────────────────────────
function fmtR(val) {
    if (val >= 1e6) return (val / 1e6).toPrecision(3) + ' M\u2126';
    if (val >= 1e3) return (val / 1e3).toPrecision(3) + ' k\u2126';
    return val.toPrecision(3) + ' \u2126';
}

function fmtC(val) {
    if (val >= 1e-6) return (val * 1e6).toPrecision(3) + ' \u00B5F';
    if (val >= 1e-9) return (val * 1e9).toPrecision(3) + ' nF';
    return (val * 1e12).toPrecision(3) + ' pF';
}

function fmtFreq(val) {
    if (val >= 1e9) return (val / 1e9).toPrecision(3) + ' Grad/s';
    if (val >= 1e6) return (val / 1e6).toPrecision(3) + ' Mrad/s';
    if (val >= 1e3) return (val / 1e3).toPrecision(3) + ' krad/s';
    return val.toPrecision(3) + ' rad/s';
}

function fmtHz(wVal) {
    const hz = wVal / (2 * Math.PI);
    if (hz >= 1e9) return (hz / 1e9).toPrecision(3) + ' GHz';
    if (hz >= 1e6) return (hz / 1e6).toPrecision(3) + ' MHz';
    if (hz >= 1e3) return (hz / 1e3).toPrecision(3) + ' kHz';
    return hz.toPrecision(3) + ' Hz';
}

function fmtAv(val) {
    const db = 20 * Math.log10(val);
    return val.toPrecision(3) + ' (' + db.toFixed(1) + ' dB)';
}
```

- [ ] **Step 3: Wire up slider event listeners inside `init()`**

Add to `init()`:

```javascript
const rSlider = document.getElementById('r-slider');
const cSlider = document.getElementById('c-slider');
const avSlider = document.getElementById('av-slider');
const freqSlider = document.getElementById('freq-slider');

function updateFromSliders() {
    R = logMap(parseFloat(rSlider.value), R_MIN, R_MAX);
    C = logMap(parseFloat(cSlider.value), C_MIN, C_MAX);
    Av = logMap(parseFloat(avSlider.value), AV_MIN, AV_MAX);
    testFreq = logMap(parseFloat(freqSlider.value), FREQ_MIN, FREQ_MAX);
    updateReadouts();
}

function updateReadouts() {
    document.getElementById('r-val').textContent = fmtR(R);
    document.getElementById('c-val').textContent = fmtC(C);
    document.getElementById('av-val').textContent = fmtAv(Av);
    document.getElementById('freq-val').textContent = fmtFreq(testFreq);
    document.getElementById('freq-hz-val').textContent = fmtHz(testFreq);
    document.getElementById('omega0-readout').innerHTML =
        '\u03C9<sub>0</sub> = 1/RC = ' + fmtFreq(omega0());
}

rSlider.addEventListener('input', updateFromSliders);
cSlider.addEventListener('input', updateFromSliders);
avSlider.addEventListener('input', updateFromSliders);
freqSlider.addEventListener('input', updateFromSliders);

// Preset buttons
document.getElementById('preset-audio').addEventListener('click', () => {
    R = 10000; C = 10e-9; Av = 100; testFreq = omega0();
    rSlider.value = logUnmap(R, R_MIN, R_MAX);
    cSlider.value = logUnmap(C, C_MIN, C_MAX);
    avSlider.value = logUnmap(Av, AV_MIN, AV_MAX);
    freqSlider.value = logUnmap(testFreq, FREQ_MIN, FREQ_MAX);
    updateReadouts();
});

document.getElementById('preset-rf').addEventListener('click', () => {
    R = 500; C = 5e-12; Av = 20; testFreq = omega0();
    rSlider.value = logUnmap(R, R_MIN, R_MAX);
    cSlider.value = logUnmap(C, C_MIN, C_MAX);
    avSlider.value = logUnmap(Av, AV_MIN, AV_MAX);
    freqSlider.value = logUnmap(testFreq, FREQ_MIN, FREQ_MAX);
    updateReadouts();
});

updateReadouts();
```

- [ ] **Step 4: Verify controls work**

Open in browser. Move each slider — readout values should update. Preset buttons should snap values. omega_0 readout should update when R or C change.

- [ ] **Step 5: Commit controls**

```bash
git add "Week 5/amplifier_bandwidth.html"
git commit -m "feat: add controls panel with log-scale sliders and presets"
```

---

### Task 3: Build the Bode magnitude plot (top-right)

**Files:**
- Modify: `Week 5/amplifier_bandwidth.html`

- [ ] **Step 1: Write the `drawBode()` function**

Add this function in the `<script>` block:

```javascript
function drawBode() {
    const { w: W, h: H, ctx } = sizeCanvas(bodeCanvas);
    const pad = { top: 30, right: 30, bottom: 45, left: 60 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Determine frequency range: 3 decades below to 3 decades above omega_0
    const w0 = omega0();
    const wMin = w0 / 1000;
    const wMax = w0 * 1000;
    const logMin = Math.log10(wMin);
    const logMax = Math.log10(wMax);

    // Determine dB range
    const avDb = 20 * Math.log10(Av);
    const dbMax = Math.ceil((avDb + 10) / 10) * 10;
    const dbMin = dbMax - 80;

    // Helpers: data → pixel
    function xPx(w) { return pad.left + (Math.log10(w) - logMin) / (logMax - logMin) * plotW; }
    function yPx(db) { return pad.top + (dbMax - db) / (dbMax - dbMin) * plotH; }

    // ── Grid lines ──────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;

    // Vertical: decade lines
    for (let exp = Math.ceil(logMin); exp <= Math.floor(logMax); exp++) {
        const x = xPx(Math.pow(10, exp));
        ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
    }

    // Horizontal: every 10 dB
    for (let db = dbMin; db <= dbMax; db += 10) {
        const y = yPx(db);
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    }

    // ── Mid-band gain dashed line ───────────────────────
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(pad.left, yPx(avDb));
    ctx.lineTo(pad.left + plotW, yPx(avDb));
    ctx.stroke();

    // Label mid-band gain
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Mid-band: ' + avDb.toFixed(1) + ' dB', pad.left + 6, yPx(avDb) - 5);

    // ── Cutoff frequency vertical dashed line ───────────
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(106,170,142,0.5)';
    const x0 = xPx(w0);
    ctx.beginPath();
    ctx.moveTo(x0, pad.top);
    ctx.lineTo(x0, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label omega_0
    ctx.fillStyle = 'rgba(106,170,142,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('\u03C9\u2080 = ' + fmtFreq(w0), x0, pad.top + plotH + 28);

    // ── Asymptotic -20 dB/decade slope ──────────────────
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    const asymStart = w0;
    const asymEnd = wMax;
    ctx.moveTo(xPx(asymStart), yPx(avDb));
    ctx.lineTo(xPx(asymEnd), yPx(avDb - 20 * Math.log10(asymEnd / asymStart)));
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Main curve ──────────────────────────────────────
    ctx.strokeStyle = '#6aaa8e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const w = Math.pow(10, logMin + t * (logMax - logMin));
        const db = gainDb(w);
        const x = xPx(w);
        const y = yPx(db);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // ── -3dB point ──────────────────────────────────────
    const db3 = avDb - 3;
    const x3 = xPx(w0);
    const y3 = yPx(db3);
    ctx.beginPath();
    ctx.arc(x3, y3, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#6aaa8e';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('-3 dB', x3 + 8, y3 + 4);

    // ── Test frequency marker ───────────────────────────
    const testDb = gainDb(testFreq);
    const tx = xPx(Math.max(wMin, Math.min(wMax, testFreq)));
    const ty = yPx(testDb);

    // Vertical line from marker to x-axis
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(255,200,100,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marker dot
    ctx.beginPath();
    ctx.arc(tx, ty, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc44';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Gain readout at marker
    ctx.fillStyle = '#ffcc44';
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = tx > W / 2 ? 'right' : 'left';
    const labelOffsetX = tx > W / 2 ? -10 : 10;
    ctx.fillText(testDb.toFixed(1) + ' dB', tx + labelOffsetX, ty - 10);

    // ── Axes labels ─────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px IBM Plex Sans, sans-serif';

    // X-axis tick labels (decades)
    ctx.textAlign = 'center';
    for (let exp = Math.ceil(logMin); exp <= Math.floor(logMax); exp++) {
        const x = xPx(Math.pow(10, exp));
        ctx.fillText('10' + exp, x, pad.top + plotH + 14);
    }

    // Y-axis tick labels
    ctx.textAlign = 'right';
    for (let db = dbMin; db <= dbMax; db += 10) {
        ctx.fillText(db + '', pad.left - 6, yPx(db) + 4);
    }

    // Axis titles
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (rad/s)', pad.left + plotW / 2, H - 4);

    ctx.save();
    ctx.translate(12, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Gain (dB)', 0, 0);
    ctx.restore();

    // ── Update header label ─────────────────────────────
    document.getElementById('bode-gain-label').textContent =
        'Gain @ test: ' + testDb.toFixed(1) + ' dB';
}
```

- [ ] **Step 2: Call `drawBode()` from the animation loop and resize handler**

Update the `animate()` function:

```javascript
function animate() {
    animTime += 0.016;
    drawBode();
    drawCircuit();
    requestAnimationFrame(animate);
}
```

Add to the resize listener in `init()`:

```javascript
window.addEventListener('resize', () => {
    drawBode();
    drawCircuit();
});
```

(Note: `drawCircuit()` doesn't exist yet — it will be a no-op call until Task 4. Add a placeholder at the top of the script block: `function drawCircuit() {}`)

- [ ] **Step 3: Verify the Bode plot renders**

Open in browser. The top-right panel should show a Bode plot with the accent-colored curve, dashed annotation lines, -3dB marker, and a yellow test-frequency marker. Moving the sliders should update the curve and marker positions.

- [ ] **Step 4: Commit Bode plot**

```bash
git add "Week 5/amplifier_bandwidth.html"
git commit -m "feat: add Bode magnitude plot with dynamic annotations"
```

---

### Task 4: Build the animated RC circuit diagram (top-left)

**Files:**
- Modify: `Week 5/amplifier_bandwidth.html`

- [ ] **Step 1: Replace the `drawCircuit()` placeholder with the full implementation**

```javascript
function drawCircuit() {
    const { w: W, h: H, ctx } = sizeCanvas(circuitCanvas);
    ctx.clearRect(0, 0, W, H);

    const pad = 40;
    const midY = H / 2;

    // Layout key x-positions
    const xSrc = pad + 20;                    // Input source
    const xAmp = W * 0.28;                    // Amplifier block
    const xR1 = W * 0.45;                     // Resistor start
    const xR2 = W * 0.62;                     // Resistor end
    const xOut = W * 0.72;                     // Output node
    const xEnd = W - pad - 20;                // End terminal

    // Ground y
    const gndY = H * 0.75;

    // ── Wires ───────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;

    // Input wire: source → amp
    ctx.beginPath();
    ctx.moveTo(xSrc, midY);
    ctx.lineTo(xAmp - 20, midY);
    ctx.stroke();

    // Amp → resistor
    ctx.beginPath();
    ctx.moveTo(xAmp + 20, midY);
    ctx.lineTo(xR1, midY);
    ctx.stroke();

    // After resistor → output node → end
    ctx.beginPath();
    ctx.moveTo(xR2, midY);
    ctx.lineTo(xEnd, midY);
    ctx.stroke();

    // Output node down to capacitor
    ctx.beginPath();
    ctx.moveTo(xOut, midY);
    ctx.lineTo(xOut, gndY - 20);
    ctx.stroke();

    // Capacitor to ground
    ctx.beginPath();
    ctx.moveTo(xOut, gndY + 6);
    ctx.lineTo(xOut, gndY + 16);
    ctx.stroke();

    // Ground line
    ctx.beginPath();
    ctx.moveTo(xOut - 10, gndY + 16);
    ctx.lineTo(xOut + 10, gndY + 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xOut - 6, gndY + 20);
    ctx.lineTo(xOut + 6, gndY + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xOut - 2, gndY + 24);
    ctx.lineTo(xOut + 2, gndY + 24);
    ctx.stroke();

    // ── Input Source (sine symbol) ──────────────────────
    ctx.beginPath();
    ctx.arc(xSrc - 14, midY, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tiny sine wave inside
    ctx.beginPath();
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 1.5;
    for (let i = -8; i <= 8; i++) {
        const px = xSrc - 14 + i;
        const py = midY - Math.sin(i * 0.5) * 5;
        if (i === -8) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // "Vin" label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('V\u1D62\u2099', xSrc - 14, midY - 20);

    // ── Amplifier block (triangle) ──────────────────────
    ctx.beginPath();
    ctx.moveTo(xAmp - 20, midY - 18);
    ctx.lineTo(xAmp + 20, midY);
    ctx.lineTo(xAmp - 20, midY + 18);
    ctx.closePath();
    ctx.fillStyle = 'rgba(106,170,142,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#6aaa8e';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Av label inside
    ctx.fillStyle = '#6aaa8e';
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A\u1D65', xAmp - 4, midY + 4);

    // ── Resistor (zig-zag) ──────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xR1, midY);
    const rLen = xR2 - xR1;
    const zags = 6;
    const zagW = rLen / zags;
    const zagH = 8;
    for (let i = 0; i < zags; i++) {
        const xBase = xR1 + i * zagW;
        if (i === 0) {
            ctx.lineTo(xBase + zagW * 0.25, midY - zagH);
        } else {
            ctx.lineTo(xBase + zagW * 0.25, midY - zagH);
        }
        ctx.lineTo(xBase + zagW * 0.75, midY + zagH);
        ctx.lineTo(xBase + zagW, midY);
    }
    ctx.stroke();

    // R label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R', (xR1 + xR2) / 2, midY - 16);
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(fmtR(R), (xR1 + xR2) / 2, midY + 24);

    // ── Capacitor ───────────────────────────────────────
    const capY = gndY - 20;
    const capGap = 6;
    const capW = 16;

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;

    // Top plate
    ctx.beginPath();
    ctx.moveTo(xOut - capW / 2, capY);
    ctx.lineTo(xOut + capW / 2, capY);
    ctx.stroke();

    // Bottom plate
    ctx.beginPath();
    ctx.moveTo(xOut - capW / 2, capY + capGap);
    ctx.lineTo(xOut + capW / 2, capY + capGap);
    ctx.stroke();

    // C label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('C', xOut + capW / 2 + 6, capY + capGap / 2 + 4);
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(fmtC(C), xOut + capW / 2 + 6, capY + capGap / 2 + 16);

    // "Vout" label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('V\u2092\u1D64\u209C', xEnd, midY - 14);

    // Output dot
    ctx.beginPath();
    ctx.arc(xOut, midY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // ── Animated sine waves ─────────────────────────────
    const w0 = omega0();
    const ratio = testFreq / w0;
    const outputGain = 1 / Math.sqrt(1 + ratio * ratio);
    const phase = -Math.atan(ratio);

    // Input sine wave (below source)
    drawSineWave(ctx, xSrc - 34, midY + 40, 40, 14, 1.0, 0, animTime * testFreq, '#ffcc44');

    // Output sine wave (below output)
    drawSineWave(ctx, xOut - 20, midY + 40, 40, 14, outputGain, phase, animTime * testFreq, '#6aaa8e');

    // ── Animated signal pulses along wire ────────────────
    drawSignalPulses(ctx, xAmp + 20, xR1, midY, animTime * testFreq, 1.0, '#ffcc44');
    drawSignalPulses(ctx, xR2, xEnd, midY, animTime * testFreq, outputGain, '#6aaa8e');

    // ── Update header label ─────────────────────────────
    document.getElementById('circuit-freq-label').textContent =
        '\u03C9 = ' + fmtFreq(testFreq);
}

function drawSineWave(ctx, x, y, width, amp, gainFrac, phaseShift, wt, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    for (let i = 0; i <= width; i++) {
        const t = (i / width) * Math.PI * 2;
        const px = x + i;
        const py = y - Math.sin(t + wt + phaseShift) * amp * gainFrac;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Label amplitude
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.font = '9px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText((gainFrac * 100).toFixed(0) + '%', x + width / 2, y + amp + 12);
    ctx.globalAlpha = 1.0;
}

function drawSignalPulses(ctx, x1, x2, y, wt, gainFrac, color) {
    ctx.globalAlpha = 0.4 * gainFrac + 0.1;
    const len = x2 - x1;
    const numPulses = 3;
    for (let i = 0; i < numPulses; i++) {
        const phase = (wt * 0.5 + i * (Math.PI * 2 / numPulses)) % (Math.PI * 2);
        const t = phase / (Math.PI * 2);
        const px = x1 + t * len;
        const radius = 3 * gainFrac + 1;
        ctx.beginPath();
        ctx.arc(px, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}
```

- [ ] **Step 2: Verify the circuit animation**

Open in browser. The top-left panel should show: input source with sine symbol, amplifier triangle labeled Av, zig-zag resistor, parallel-plate capacitor to ground. Animated sine waves below the input and output. Pulses moving along wires. Moving the test frequency slider should change animation speed, and the output sine wave should shrink at high frequencies.

- [ ] **Step 3: Commit circuit panel**

```bash
git add "Week 5/amplifier_bandwidth.html"
git commit -m "feat: add animated RC circuit diagram with signal flow"
```

---

### Task 5: Build the equations panel (bottom-right)

**Files:**
- Modify: `Week 5/amplifier_bandwidth.html`

- [ ] **Step 1: Add equations HTML inside the `eq-panel` div**

Replace the `<!-- Equations will be populated in Step 5 -->` comment with:

```html
<div class="eq-section">
    <div class="eq-title">Transfer Function</div>
    <div class="equation" id="eq-transfer">
        H(j&#969;) = A<sub>v</sub> / (1 + j(<span class="highlight" id="eq-ratio">&#969;/&#969;<sub>0</sub></span>))
    </div>
</div>

<div class="eq-section">
    <div class="eq-title">Magnitude</div>
    <div class="equation" id="eq-magnitude">
        |H(j&#969;)| = <span id="eq-av-term">A<sub>v</sub></span> / &#8730;(<span id="eq-one-term">1</span> + (<span id="eq-ratio2">&#969;/&#969;<sub>0</sub></span>)&#178;)
    </div>
</div>

<div class="eq-section">
    <div class="eq-title">Frequency Response</div>
    <div class="info-row">
        <span>Gain at &#969;</span>
        <span class="val" id="eq-gain-linear">—</span>
    </div>
    <div class="info-row">
        <span>Gain (dB)</span>
        <span class="val" id="eq-gain-db">—</span>
    </div>
    <div class="info-row">
        <span>&#969; / &#969;<sub>0</sub></span>
        <span class="val" id="eq-ratio-val">—</span>
    </div>
    <div class="info-row" style="margin-top: 0.3rem;">
        <span>Regime</span>
        <span class="regime-label" id="eq-regime">—</span>
    </div>
</div>
```

- [ ] **Step 2: Add the `updateEquations()` function**

```javascript
function updateEquations() {
    const w0 = omega0();
    const ratio = testFreq / w0;
    const gain = gainAt(testFreq);
    const db = gainDb(testFreq);

    // Update info values
    document.getElementById('eq-gain-linear').textContent = gain.toPrecision(4);
    document.getElementById('eq-gain-db').textContent = db.toFixed(2) + ' dB';
    document.getElementById('eq-ratio-val').textContent = ratio.toPrecision(3);

    // Determine regime and apply highlighting
    const oneTermEl = document.getElementById('eq-one-term');
    const ratioEl = document.getElementById('eq-ratio');
    const ratio2El = document.getElementById('eq-ratio2');
    const regimeEl = document.getElementById('eq-regime');

    if (ratio < 0.1) {
        // Passband: omega << omega_0, denominator ≈ 1
        oneTermEl.className = 'highlight';
        ratioEl.className = 'dim';
        ratio2El.className = 'dim';
        regimeEl.textContent = 'Passband';
        regimeEl.style.background = 'rgba(106,170,142,0.15)';
        regimeEl.style.color = 'var(--accent)';
        regimeEl.style.borderColor = 'rgba(106,170,142,0.3)';
    } else if (ratio > 10) {
        // Rolloff: omega >> omega_0, gain ≈ Av * omega_0/omega
        oneTermEl.className = 'dim';
        ratioEl.className = 'highlight';
        ratio2El.className = 'highlight';
        regimeEl.textContent = 'Rolloff (−20 dB/dec)';
        regimeEl.style.background = 'rgba(224,96,80,0.15)';
        regimeEl.style.color = '#e06050';
        regimeEl.style.borderColor = 'rgba(224,96,80,0.3)';
    } else {
        // Cutoff region: near omega_0
        oneTermEl.className = 'highlight';
        ratioEl.className = 'highlight';
        ratio2El.className = 'highlight';
        regimeEl.textContent = 'Cutoff (−3 dB)';
        regimeEl.style.background = 'rgba(255,200,100,0.15)';
        regimeEl.style.color = '#ffcc44';
        regimeEl.style.borderColor = 'rgba(255,200,100,0.3)';
    }
}
```

- [ ] **Step 3: Call `updateEquations()` from `updateFromSliders()` and `updateReadouts()`**

Add `updateEquations();` as the last line in `updateReadouts()`.

- [ ] **Step 4: Also call `updateEquations()` once during `init()`**

Add `updateEquations();` at the end of `init()`, after the initial `updateReadouts()` call.

- [ ] **Step 5: Verify equations panel**

Open in browser. The bottom-right panel should show the transfer function and magnitude equations. Moving the test frequency slider should change the regime label (Passband → Cutoff → Rolloff) and the equation terms should dim/highlight accordingly. Gain values should update.

- [ ] **Step 6: Commit equations panel**

```bash
git add "Week 5/amplifier_bandwidth.html"
git commit -m "feat: add equations panel with dynamic regime highlighting"
```

---

### Task 6: Update `index.html` with Week 5 section

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add Week 5 section to index.html**

Insert after the Week 4 closing `</div>` (the one closing the week div, around line 238):

```html

        <div class="week">
            <div class="week-label">
                <h2>Week 5</h2>
                <span>Amplifiers</span>
            </div>
            <div class="topics">
                <a href="Week 5/amplifier_bandwidth.html" class="topic">
                    <span class="topic-number">1</span>
                    <span class="topic-title">Amplifier Bandwidth</span>
                </a>
            </div>
        </div>
```

- [ ] **Step 2: Verify the index page**

Open `index.html` in a browser. Week 5 "Amplifiers" section should appear below Week 4 with a link to "Amplifier Bandwidth". Clicking the link should navigate to the new page.

- [ ] **Step 3: Commit index update**

```bash
git add index.html
git commit -m "feat: add Week 5 section to index page"
```

---

### Task 7: Polish and final verification

**Files:**
- Modify: `Week 5/amplifier_bandwidth.html`

- [ ] **Step 1: Ensure animation time scaling feels natural**

The `animTime` increment is currently fixed at 0.016. Replace with proper delta-time using `performance.now()`:

```javascript
let lastTime = 0;
function animate(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt < 0.1) { // skip large jumps (e.g. tab switch)
        animTime += dt;
    }
    drawBode();
    drawCircuit();
    updateEquations();
    requestAnimationFrame(animate);
}
```

Update the `init()` function to call `requestAnimationFrame(animate)` instead of `animate()`.

- [ ] **Step 2: Verify full page interaction**

Open in browser and test:
1. All four sliders update all four panels in real time
2. The Bode curve shifts when R or C change (omega_0 moves)
3. The Bode curve shifts vertically when Av changes
4. The yellow test marker moves along the curve when frequency changes
5. The circuit animation speeds up / slows down with frequency
6. The output sine wave shrinks at high frequencies
7. The equations panel highlights the correct regime
8. Preset buttons snap to realistic values
9. The back button returns to the index page

- [ ] **Step 3: Commit final polish**

```bash
git add "Week 5/amplifier_bandwidth.html"
git commit -m "feat: polish animation timing and final integration"
```
