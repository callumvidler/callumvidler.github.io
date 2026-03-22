# BJT Semiconductors Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive teaching page showing fundamental BJT semiconductor operation (NPN/PNP), with animated carrier physics, depletion regions, and carrier concentration plots.

**Architecture:** Single self-contained HTML file with inline CSS and JS. Four-panel grid layout matching existing Week 4 style. Canvas-based rendering for cross-section and concentration plot, DOM-based controls and explanation panels. `requestAnimationFrame` loop drives particle animation.

**Tech Stack:** Vanilla HTML/CSS/JS, Canvas 2D API, Google Fonts (IBM Plex Sans/Mono)

**Spec:** `docs/superpowers/specs/2026-03-22-bjt-semiconductors-design.md`

---

## Chunk 1: Page Scaffold, Controls & Explanation Panels

### Task 1: HTML/CSS Scaffold

**Files:**
- Create: `Week 4/bjt_semiconductors.html`

- [ ] **Step 1: Create the HTML file with full CSS and empty panel structure**

Create `Week 4/bjt_semiconductors.html` with:

1. **Head section** — charset, viewport, title "BMEN90033: BJT Semiconductors — Fundamental Operation", Google Fonts link (IBM Plex Sans 400/500/600 + Mono 400/500), inline `<style>` block.

2. **CSS variables** — copy exactly from `bjt_switch.html`:
```css
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
```
Plus page-specific colors:
```css
:root {
    --col-ntype: #e06050;      /* N-type region tint */
    --col-ptype: #5080d0;      /* P-type region tint */
    --col-electron: #ffcc44;   /* free electron */
    --col-hole: #ff66aa;       /* hole */
    --col-donor-ion: #ff8866;  /* fixed + ion */
    --col-acceptor-ion: #66aaff; /* fixed - ion */
    --col-depletion: rgba(255,255,255,0.08); /* depletion zone */
}
```

3. **Base styles** — same reset, body, header, `.main-layout` grid, `.panel`, `.panel-header`, `.panel-body` as `bjt_switch.html` lines 30-98.

4. **Controls panel CSS** — `.controls-panel`, `.ctrl-section`, `.ctrl-title`, `.ctrl-row`, `.toggle-btn`, `.btn-group` from `bjt_switch.html` lines 102-202.

5. **Header HTML:**
```html
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
            <h1>BJT Semiconductors — Fundamental Operation</h1>
            <div class="header-sub">BMEN90033 · Week 4</div>
        </div>
    </div>
</header>
```

6. **4-panel grid:**
```html
<div class="main-layout">
    <!-- Top-left: Cross-section -->
    <div class="panel">
        <div class="panel-header"><strong>Transistor Cross-Section</strong><span id="type-label">NPN</span></div>
        <div class="panel-body"><canvas id="cross-section-canvas"></canvas></div>
    </div>
    <!-- Top-right: Carrier concentration -->
    <div class="panel">
        <div class="panel-header"><strong>Carrier Concentration</strong><span>n(x), p(x) vs position</span></div>
        <div class="panel-body"><canvas id="concentration-canvas"></canvas></div>
    </div>
    <!-- Bottom-left: Controls -->
    <div class="panel controls-panel" id="controls-panel">
        <!-- filled in Task 2 -->
    </div>
    <!-- Bottom-right: Explanation -->
    <div class="panel">
        <div class="panel-header"><strong>Explanation</strong><span id="region-label">Cutoff</span></div>
        <div class="panel-body" style="padding:0.75rem;overflow-y:auto;" id="explanation-panel">
        </div>
    </div>
</div>
```

- [ ] **Step 2: Open in browser and verify the 4-panel grid renders correctly**

Open `Week 4/bjt_semiconductors.html` in a browser. Verify:
- Header with back button, title, subtitle
- 4 equal panels filling the viewport below the header
- Dark theme matches bjt_switch.html
- Canvases are blank (expected — no JS yet)

- [ ] **Step 3: Commit scaffold**
```bash
git add "Week 4/bjt_semiconductors.html"
git commit -m "feat: add BJT semiconductors page scaffold with 4-panel layout"
```

---

### Task 2: Controls Panel (Bottom-Left)

**Files:**
- Modify: `Week 4/bjt_semiconductors.html`

- [ ] **Step 1: Add controls HTML inside `#controls-panel`**

```html
<!-- Transistor Type -->
<div class="ctrl-section">
    <div class="ctrl-title">Transistor Type</div>
    <div class="btn-group">
        <button class="toggle-btn active" id="btn-npn" onclick="setType('NPN')">NPN</button>
        <button class="toggle-btn" id="btn-pnp" onclick="setType('PNP')">PNP</button>
    </div>
</div>

<!-- Base Current -->
<div class="ctrl-section">
    <div class="ctrl-title">Base Current</div>
    <div class="ctrl-row">
        <label>I<sub>B</sub></label>
        <input type="range" id="ib-slider" min="0" max="100" value="0"
               oninput="setBaseCurrent(this.value)">
        <span class="ctrl-val" id="ib-display">0 &micro;A</span>
    </div>
    <div style="text-align:center;margin-top:4px;">
        <span id="operating-region" style="display:inline-block;padding:2px 8px;border-radius:3px;
              font-family:'IBM Plex Mono',monospace;font-size:0.65rem;font-weight:500;
              background:var(--col-cutoff,rgba(200,200,200,0.06));color:var(--text-dim);">
            CUTOFF
        </span>
    </div>
</div>

<!-- Animation -->
<div class="ctrl-section">
    <div class="ctrl-title">Animation</div>
    <div class="btn-group">
        <button class="toggle-btn active" id="btn-play" onclick="toggleAnimation(true)">Play</button>
        <button class="toggle-btn" id="btn-pause" onclick="toggleAnimation(false)">Pause</button>
    </div>
</div>

<!-- Legend -->
<div class="ctrl-section">
    <div class="ctrl-title">Legend</div>
    <div style="display:flex;flex-direction:column;gap:4px;font-size:0.68rem;">
        <div style="display:flex;align-items:center;gap:6px;color:var(--text-dim)">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--col-electron)"></div> Electron
        </div>
        <div style="display:flex;align-items:center;gap:6px;color:var(--text-dim)">
            <div style="width:8px;height:8px;border-radius:50%;border:1.5px solid var(--col-hole);background:transparent"></div> Hole
        </div>
        <div style="display:flex;align-items:center;gap:6px;color:var(--text-dim)">
            <span style="font-weight:700;font-size:10px;color:var(--col-donor-ion);width:8px;text-align:center">+</span> Donor ion (fixed)
        </div>
        <div style="display:flex;align-items:center;gap:6px;color:var(--text-dim)">
            <span style="font-weight:700;font-size:10px;color:var(--col-acceptor-ion);width:8px;text-align:center">&minus;</span> Acceptor ion (fixed)
        </div>
        <div style="display:flex;align-items:center;gap:6px;color:var(--text-dim)">
            <div style="width:8px;height:8px;background:var(--col-ntype);border-radius:2px;opacity:0.5"></div> N-type region
        </div>
        <div style="display:flex;align-items:center;gap:6px;color:var(--text-dim)">
            <div style="width:8px;height:8px;background:var(--col-ptype);border-radius:2px;opacity:0.5"></div> P-type region
        </div>
        <div style="display:flex;align-items:center;gap:6px;color:var(--text-dim)">
            <div style="width:8px;height:8px;background:var(--col-depletion);border:1px dashed rgba(255,255,255,0.2);border-radius:2px"></div> Depletion region
        </div>
    </div>
</div>
```

- [ ] **Step 2: Add stub JS functions at bottom of `<body>`**

```html
<script>
// === State ===
let transistorType = 'NPN';
let baseCurrent = 0;        // 0-100 slider value
let animating = true;

function setType(type) {
    transistorType = type;
    document.getElementById('btn-npn').classList.toggle('active', type === 'NPN');
    document.getElementById('btn-pnp').classList.toggle('active', type === 'PNP');
    document.getElementById('type-label').textContent = type;
    updateAll();
}

function setBaseCurrent(val) {
    baseCurrent = parseInt(val);
    const microAmps = Math.round(baseCurrent * 2); // 0-200 uA range
    document.getElementById('ib-display').innerHTML = microAmps + ' &micro;A';

    // Update operating region indicator
    const regionEl = document.getElementById('operating-region');
    if (baseCurrent === 0) {
        regionEl.textContent = 'CUTOFF';
        regionEl.style.background = 'rgba(200,200,200,0.06)';
        regionEl.style.color = 'var(--text-dim)';
    } else if (baseCurrent < 70) {
        regionEl.textContent = 'ACTIVE';
        regionEl.style.background = 'rgba(90,154,186,0.10)';
        regionEl.style.color = '#5a9aba';
    } else {
        regionEl.textContent = 'SATURATION';
        regionEl.style.background = 'rgba(255,180,60,0.12)';
        regionEl.style.color = '#cca855';
    }
    updateAll();
}

function toggleAnimation(play) {
    animating = play;
    document.getElementById('btn-play').classList.toggle('active', play);
    document.getElementById('btn-pause').classList.toggle('active', !play);
}

function updateAll() {
    updateExplanation();
    // updateCrossSection() and updateConcentration() added in later tasks
}
</script>
```

- [ ] **Step 3: Verify controls render and state updates work**

Open in browser. Verify:
- NPN/PNP toggle highlights correctly
- Slider updates the I_B display and operating region label
- Play/Pause toggle switches

- [ ] **Step 4: Commit**
```bash
git add "Week 4/bjt_semiconductors.html"
git commit -m "feat: add controls panel with type toggle, base current slider, and legend"
```

---

### Task 3: Dynamic Explanation Panel (Bottom-Right)

**Files:**
- Modify: `Week 4/bjt_semiconductors.html`

- [ ] **Step 1: Add explanation panel CSS**

Add to the `<style>` block:
```css
#explanation-panel h3 {
    font-size: 0.78rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    color: var(--text);
}
#explanation-panel p {
    font-size: 0.72rem;
    color: var(--text-dim);
    line-height: 1.65;
    margin-bottom: 0.5rem;
}
#explanation-panel .physics-note {
    font-size: 0.65rem;
    color: var(--text-muted);
    border-left: 2px solid var(--border);
    padding-left: 8px;
    margin-top: 0.3rem;
}
```

- [ ] **Step 2: Add `updateExplanation()` function in the `<script>` block**

```javascript
function updateExplanation() {
    const panel = document.getElementById('explanation-panel');
    const regionLabel = document.getElementById('region-label');
    const isNPN = transistorType === 'NPN';
    const majority = isNPN ? 'electrons' : 'holes';
    const minority = isNPN ? 'holes' : 'electrons';
    const emitterDopant = isNPN ? 'Phosphorus' : 'Boron';
    const baseDopant = isNPN ? 'Boron' : 'Phosphorus';
    const emitterType = isNPN ? 'N⁺' : 'P⁺';
    const baseType = isNPN ? 'P' : 'N';
    const collectorType = isNPN ? 'N' : 'P';

    let html = '';

    if (baseCurrent === 0) {
        regionLabel.textContent = 'Cutoff';
        html = `
            <h3>Cutoff — Transistor OFF</h3>
            <p>No base current is applied. The base-emitter junction is unbiased, so no minority carriers are injected into the base. Both depletion regions are at their thermal equilibrium width.</p>
            <p>The ${emitterType} emitter (${emitterDopant}-doped) contains abundant majority ${majority}, but they cannot cross the base-emitter depletion region. No collector current flows.</p>
            <p>The ${baseType} base (${baseDopant}-doped, lightly doped and thin) and the ${collectorType} collector sit at equilibrium. Fixed donor and acceptor ions in each depletion region create a built-in electric field that opposes carrier diffusion.</p>
            <div class="physics-note"><strong>Key physics:</strong> At thermal equilibrium, the diffusion tendency of carriers is exactly balanced by the drift due to the built-in electric field in each depletion region.</div>
        `;
    } else if (baseCurrent < 70) {
        regionLabel.textContent = 'Active';
        html = `
            <h3>Forward Active — Transistor Action</h3>
            <p>A small forward bias is applied to the base-emitter junction, narrowing its depletion region. Majority ${majority} from the heavily-doped ${emitterType} emitter are injected into the thin, lightly-doped ${baseType} base as <em>minority carriers</em>.</p>
            <p>Because the base is very thin, most injected ${majority} diffuse across it before they can recombine with the base's majority ${minority}. They reach the base-collector depletion region, where the strong electric field sweeps them into the collector.</p>
            <p>The small fraction of ${majority} that <em>do</em> recombine in the base is what constitutes the base current I<sub>B</sub>. This gives rise to current gain: I<sub>C</sub>/I<sub>B</sub> &approx; &beta; (typically 50&ndash;300).</p>
            <div class="physics-note"><strong>Key physics:</strong> Carrier transport across the base is by <em>diffusion</em> (concentration gradient). Collection at the BC junction is by <em>drift</em> (electric field). The thin, lightly-doped base ensures most carriers are collected rather than recombined.</div>
        `;
    } else {
        regionLabel.textContent = 'Saturation';
        html = `
            <h3>Saturation — Both Junctions Forward Biased</h3>
            <p>The base current is large enough that <em>both</em> the base-emitter and base-collector junctions are now forward biased. Carriers are injected into the base from both the emitter and the collector sides.</p>
            <p>The collector current no longer increases proportionally with base current &mdash; the transistor is <em>saturated</em>. V<sub>CE</sub> drops to a small value (V<sub>CE(sat)</sub> &approx; 0.2 V).</p>
            <p>Excess minority ${majority} accumulate throughout the base region. This stored charge is visible in the carrier concentration plot as an elevated minority concentration that no longer decays linearly across the base.</p>
            <div class="physics-note"><strong>Key physics:</strong> The excess stored charge in the base is why BJTs are slow to turn off from saturation &mdash; the stored charge must be removed before the transistor can return to cutoff (storage delay time).</div>
        `;
    }

    panel.innerHTML = html;
}
```

- [ ] **Step 3: Call `updateExplanation()` on page load**

Add at the end of the script:
```javascript
// Initialize
updateExplanation();
```

- [ ] **Step 4: Verify explanation updates when slider and toggle change**

Open in browser. Move slider and toggle NPN/PNP. Verify text updates correctly for all 6 combinations (3 regions x 2 types).

- [ ] **Step 5: Commit**
```bash
git add "Week 4/bjt_semiconductors.html"
git commit -m "feat: add dynamic explanation panel with physics descriptions for all operating regions"
```

---

## Chunk 2: Cross-Section Canvas (Top-Left)

### Task 4: Cross-Section — Static Regions and Labels

**Files:**
- Modify: `Week 4/bjt_semiconductors.html`

- [ ] **Step 1: Add cross-section drawing code**

Add to `<script>` block:

```javascript
// === Cross-Section Canvas ===
const csCanvas = document.getElementById('cross-section-canvas');
const csCtx = csCanvas.getContext('2d');

function resizeCanvases() {
    [csCanvas, document.getElementById('concentration-canvas')].forEach(c => {
        const rect = c.parentElement.getBoundingClientRect();
        c.width = rect.width * devicePixelRatio;
        c.height = rect.height * devicePixelRatio;
        c.style.width = rect.width + 'px';
        c.style.height = rect.height + 'px';
    });
}
window.addEventListener('resize', () => { resizeCanvases(); drawCrossSection(); drawConcentration(); });

function getRegions(w, h) {
    // Regions layout: Emitter | Base | Collector
    // Base is thin (15% of width), Emitter 35%, Collector 40%, with margins
    const margin = w * 0.08;
    const top = h * 0.12;
    const bottom = h * 0.78;
    const regionW = w - 2 * margin;
    const emitterW = regionW * 0.35;
    const baseW = regionW * 0.12;  // thin!
    const collectorW = regionW * 0.35;
    const eX = margin;
    const bX = eX + emitterW;
    const cX = bX + baseW;

    // Depletion region widths depend on base current
    const maxDepl = Math.min(emitterW, collectorW) * 0.15;
    const beFrac = baseCurrent === 0 ? 1.0 : Math.max(0.15, 1.0 - baseCurrent / 100);
    const bcFrac = baseCurrent === 0 ? 1.0 : (baseCurrent < 70 ? Math.min(1.4, 1.0 + baseCurrent / 200) : Math.max(0.3, 1.0 - (baseCurrent - 70) / 60));
    const beDepl = maxDepl * beFrac;
    const bcDepl = maxDepl * bcFrac;

    return {
        margin, top, bottom,
        emitter: { x: eX, w: emitterW },
        base: { x: bX, w: baseW },
        collector: { x: cX, w: collectorW },
        totalW: emitterW + baseW + collectorW,
        beDepl, bcDepl, maxDepl,
        height: bottom - top
    };
}

function drawCrossSection() {
    const w = csCanvas.width;
    const h = csCanvas.height;
    const ctx = csCtx;
    const dpr = devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = w / dpr, ch = h / dpr;

    ctx.clearRect(0, 0, cw, ch);

    const isNPN = transistorType === 'NPN';
    const r = getRegions(cw, ch);
    const regionH = r.height;

    // Draw three regions with background colors
    // Emitter
    ctx.fillStyle = isNPN ? 'rgba(224,96,80,0.15)' : 'rgba(80,128,208,0.15)';
    ctx.fillRect(r.emitter.x, r.top, r.emitter.w, regionH);
    // Base
    ctx.fillStyle = isNPN ? 'rgba(80,128,208,0.15)' : 'rgba(224,96,80,0.15)';
    ctx.fillRect(r.base.x, r.top, r.base.w, regionH);
    // Collector
    ctx.fillStyle = isNPN ? 'rgba(224,96,80,0.12)' : 'rgba(80,128,208,0.12)';
    ctx.fillRect(r.collector.x, r.top, r.collector.w, regionH);

    // Region borders
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.emitter.x, r.top, r.emitter.w, regionH);
    ctx.strokeRect(r.base.x, r.top, r.base.w, regionH);
    ctx.strokeRect(r.collector.x, r.top, r.collector.w, regionH);

    // Depletion regions (shaded at junctions)
    // BE junction depletion
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(r.base.x - r.beDepl, r.top, r.beDepl * 2, regionH);
    // Dashed border for depletion
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(r.base.x - r.beDepl, r.top, r.beDepl * 2, regionH);
    // BC junction depletion
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    const bcX = r.base.x + r.base.w;
    ctx.fillRect(bcX - r.bcDepl, r.top, r.bcDepl * 2, regionH);
    ctx.strokeRect(bcX - r.bcDepl, r.top, r.bcDepl * 2, regionH);
    ctx.setLineDash([]);

    // Fixed ions in depletion regions
    drawFixedIons(ctx, r, isNPN);

    // Labels
    ctx.font = '600 13px "IBM Plex Sans"';
    ctx.textAlign = 'center';
    const labelY = r.top - 20;

    // Emitter label
    ctx.fillStyle = '#fff';
    ctx.fillText('Emitter (E)', r.emitter.x + r.emitter.w / 2, labelY);
    ctx.font = '11px "IBM Plex Mono"';
    const eDoping = isNPN ? 'N\u207A  Phosphorus' : 'P\u207A  Boron';
    ctx.fillStyle = isNPN ? '#e06050' : '#5080d0';
    ctx.fillText(eDoping, r.emitter.x + r.emitter.w / 2, labelY + 14);

    // Base label
    ctx.font = '600 13px "IBM Plex Sans"';
    ctx.fillStyle = '#fff';
    ctx.fillText('Base (B)', r.base.x + r.base.w / 2, labelY);
    ctx.font = '11px "IBM Plex Mono"';
    const bDoping = isNPN ? 'P  Boron' : 'N  Phosphorus';
    ctx.fillStyle = isNPN ? '#5080d0' : '#e06050';
    ctx.fillText(bDoping, r.base.x + r.base.w / 2, labelY + 14);

    // Collector label
    ctx.font = '600 13px "IBM Plex Sans"';
    ctx.fillStyle = '#fff';
    ctx.fillText('Collector (C)', r.collector.x + r.collector.w / 2, labelY);
    ctx.font = '11px "IBM Plex Mono"';
    const cDoping = isNPN ? 'N  Phosphorus' : 'P  Boron';
    ctx.fillStyle = isNPN ? '#e06050' : '#5080d0';
    ctx.fillText(cDoping, r.collector.x + r.collector.w / 2, labelY + 14);

    // Terminal wire stubs
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    // E terminal (bottom)
    const eCx = r.emitter.x + r.emitter.w / 2;
    ctx.beginPath(); ctx.moveTo(eCx, r.top + regionH); ctx.lineTo(eCx, r.top + regionH + 20); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '600 11px "IBM Plex Mono"';
    ctx.fillText('E', eCx, r.top + regionH + 32);
    // B terminal (bottom center)
    const bCx = r.base.x + r.base.w / 2;
    ctx.beginPath(); ctx.moveTo(bCx, r.top + regionH); ctx.lineTo(bCx, r.top + regionH + 20); ctx.stroke();
    ctx.fillText('B', bCx, r.top + regionH + 32);
    // C terminal (bottom)
    const cCx = r.collector.x + r.collector.w / 2;
    ctx.beginPath(); ctx.moveTo(cCx, r.top + regionH); ctx.lineTo(cCx, r.top + regionH + 20); ctx.stroke();
    ctx.fillText('C', cCx, r.top + regionH + 32);

    // Current direction arrows (shown when I_B > 0)
    if (baseCurrent > 0) {
        drawCurrentArrows(ctx, r, isNPN);
    }
}

function drawCurrentArrows(ctx, r, isNPN) {
    const regionH = r.height;
    const midY = r.top + regionH / 2;
    const arrowLen = 25;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.font = '600 9px "IBM Plex Sans"';
    ctx.textAlign = 'center';

    // Conventional current: opposite to electron flow for NPN
    // I_E arrow (into emitter for NPN, out for PNP)
    const eArrowX = r.emitter.x + r.emitter.w * 0.3;
    const eDir = isNPN ? 1 : -1;  // NPN: current into emitter (down), PNP: out (up)
    drawArrow(ctx, eArrowX, r.top + regionH + 18 - (eDir > 0 ? arrowLen : 0), eArrowX, r.top + regionH + 18 - (eDir > 0 ? 0 : arrowLen));
    ctx.fillText('I_E', eArrowX, r.top + regionH + 45);

    // I_C arrow (out of collector for NPN)
    const cArrowX = r.collector.x + r.collector.w * 0.7;
    drawArrow(ctx, cArrowX, r.top + regionH + 18 - (eDir > 0 ? 0 : arrowLen), cArrowX, r.top + regionH + 18 - (eDir > 0 ? arrowLen : 0));
    ctx.fillText('I_C', cArrowX, r.top + regionH + 45);

    // I_B arrow (into base)
    const bArrowX = r.base.x + r.base.w / 2;
    drawArrow(ctx, bArrowX, r.top + regionH + 35, bArrowX, r.top + regionH + 22);
    ctx.fillText('I_B', bArrowX + 15, r.top + regionH + 35);
}

function drawArrow(ctx, x1, y1, x2, y2) {
    const headLen = 6;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function drawFixedIons(ctx, r, isNPN) {
    const regionH = r.height;
    ctx.font = 'bold 10px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // BE junction: ions in depletion region
    // On emitter side of BE junction: exposed donor ions (+) for NPN, acceptor ions (-) for PNP
    const beJunction = r.base.x;
    const spacing = 12;
    const rows = Math.floor(regionH / spacing);
    // Emitter side of BE depletion
    for (let row = 0; row < rows; row++) {
        const y = r.top + spacing / 2 + row * spacing;
        const cols = Math.max(1, Math.floor(r.beDepl / spacing));
        for (let col = 0; col < cols; col++) {
            const x = beJunction - r.beDepl + spacing / 2 + col * spacing;
            if (x >= r.emitter.x && x < beJunction) {
                ctx.fillStyle = isNPN ? '#ff8866' : '#66aaff';
                ctx.fillText(isNPN ? '+' : '\u2212', x, y);
            }
        }
    }
    // Base side of BE depletion
    for (let row = 0; row < rows; row++) {
        const y = r.top + spacing / 2 + row * spacing;
        const cols = Math.max(1, Math.floor(r.beDepl / spacing));
        for (let col = 0; col < cols; col++) {
            const x = beJunction + spacing / 2 + col * spacing;
            if (x > beJunction && x < beJunction + r.beDepl) {
                ctx.fillStyle = isNPN ? '#66aaff' : '#ff8866';
                ctx.fillText(isNPN ? '\u2212' : '+', x, y);
            }
        }
    }

    // BC junction: similar pattern
    const bcJunction = r.base.x + r.base.w;
    // Base side of BC depletion
    for (let row = 0; row < rows; row++) {
        const y = r.top + spacing / 2 + row * spacing;
        const cols = Math.max(1, Math.floor(r.bcDepl / spacing));
        for (let col = 0; col < cols; col++) {
            const x = bcJunction - r.bcDepl + spacing / 2 + col * spacing;
            if (x >= r.base.x && x < bcJunction) {
                ctx.fillStyle = isNPN ? '#66aaff' : '#ff8866';
                ctx.fillText(isNPN ? '\u2212' : '+', x, y);
            }
        }
    }
    // Collector side of BC depletion
    for (let row = 0; row < rows; row++) {
        const y = r.top + spacing / 2 + row * spacing;
        const cols = Math.max(1, Math.floor(r.bcDepl / spacing));
        for (let col = 0; col < cols; col++) {
            const x = bcJunction + spacing / 2 + col * spacing;
            if (x > bcJunction && x < bcJunction + r.bcDepl) {
                ctx.fillStyle = isNPN ? '#ff8866' : '#66aaff';
                ctx.fillText(isNPN ? '+' : '\u2212', x, y);
            }
        }
    }
}
```

- [ ] **Step 2: Hook up initialization**

Add to the initialization block at end of script:
```javascript
resizeCanvases();
drawCrossSection();
```

Update `updateAll()`:
```javascript
function updateAll() {
    updateExplanation();
    drawCrossSection();
    drawConcentration();
}
```

Add a stub `drawConcentration()`:
```javascript
function drawConcentration() {
    // implemented in Task 6
}
```

- [ ] **Step 3: Verify cross-section renders**

Open in browser. Verify:
- Three colored regions (red/blue tints correct for NPN)
- Depletion zones visible at junctions with dashed borders
- Fixed ions (+/-) displayed in depletion regions
- Labels (Emitter/Base/Collector) with doping info
- Terminal wire stubs at bottom
- Toggle to PNP flips all colors and doping labels
- Slider changes depletion region widths

- [ ] **Step 4: Commit**
```bash
git add "Week 4/bjt_semiconductors.html"
git commit -m "feat: add cross-section canvas with doped regions, depletion zones, and fixed ions"
```

---

### Task 5: Cross-Section — Animated Carrier Particles

**Files:**
- Modify: `Week 4/bjt_semiconductors.html`

- [ ] **Step 1: Add particle system code**

Add to `<script>`:

```javascript
// === Particle System ===
let particles = [];
const MAX_PARTICLES = 200;

function initParticles() {
    particles = [];
    const isNPN = transistorType === 'NPN';
    const cw = csCanvas.width / devicePixelRatio;
    const ch = csCanvas.height / devicePixelRatio;
    const r = getRegions(cw, ch);

    // Majority carriers in emitter
    const emitterCarrierCount = 30;
    for (let i = 0; i < emitterCarrierCount; i++) {
        particles.push({
            x: r.emitter.x + Math.random() * r.emitter.w,
            y: r.top + Math.random() * r.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            type: isNPN ? 'electron' : 'hole',
            region: 'emitter',
            life: 1
        });
    }

    // Majority carriers in base (fewer — lightly doped)
    const baseCarrierCount = 8;
    for (let i = 0; i < baseCarrierCount; i++) {
        particles.push({
            x: r.base.x + Math.random() * r.base.w,
            y: r.top + Math.random() * r.height,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            type: isNPN ? 'hole' : 'electron',
            region: 'base',
            life: 1
        });
    }

    // Majority carriers in collector
    const collectorCarrierCount = 20;
    for (let i = 0; i < collectorCarrierCount; i++) {
        particles.push({
            x: r.collector.x + Math.random() * r.collector.w,
            y: r.top + Math.random() * r.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            type: isNPN ? 'electron' : 'hole',
            region: 'collector',
            life: 1
        });
    }
}

function updateParticles() {
    if (!animating) return;

    const isNPN = transistorType === 'NPN';
    const cw = csCanvas.width / devicePixelRatio;
    const ch = csCanvas.height / devicePixelRatio;
    const r = getRegions(cw, ch);
    const injectionRate = baseCurrent / 100;  // 0 to 1

    // Inject carriers from emitter into base when I_B > 0
    if (baseCurrent > 0 && Math.random() < injectionRate * 0.3) {
        const carrierType = isNPN ? 'electron' : 'hole';
        particles.push({
            x: r.base.x + 2,
            y: r.top + Math.random() * r.height,
            vx: 0.4 + injectionRate * 0.6,
            vy: (Math.random() - 0.5) * 0.2,
            type: carrierType,
            region: 'injected',
            life: 1
        });
    }

    // In saturation, also inject from collector side
    if (baseCurrent >= 70 && Math.random() < (baseCurrent - 70) / 60 * 0.15) {
        const carrierType = isNPN ? 'electron' : 'hole';
        particles.push({
            x: r.base.x + r.base.w - 2,
            y: r.top + Math.random() * r.height,
            vx: -0.3,
            vy: (Math.random() - 0.5) * 0.2,
            type: carrierType,
            region: 'injected',
            life: 1
        });
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Random thermal motion for majority carriers
        if (p.region !== 'injected') {
            p.vx += (Math.random() - 0.5) * 0.1;
            p.vy += (Math.random() - 0.5) * 0.1;
            p.vx *= 0.95;
            p.vy *= 0.95;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Bounce off top/bottom
        if (p.y < r.top + 2 || p.y > r.top + r.height - 2) {
            p.vy *= -1;
            p.y = Math.max(r.top + 2, Math.min(r.top + r.height - 2, p.y));
        }

        // Confine majority carriers to their regions
        if (p.region === 'emitter') {
            if (p.x < r.emitter.x + 2) { p.x = r.emitter.x + 2; p.vx = Math.abs(p.vx); }
            if (p.x > r.emitter.x + r.emitter.w - r.beDepl) { p.x = r.emitter.x + r.emitter.w - r.beDepl; p.vx = -Math.abs(p.vx); }
        } else if (p.region === 'base') {
            if (p.x < r.base.x + r.beDepl) { p.x = r.base.x + r.beDepl; p.vx = Math.abs(p.vx); }
            if (p.x > r.base.x + r.base.w - r.bcDepl) { p.x = r.base.x + r.base.w - r.bcDepl; p.vx = -Math.abs(p.vx); }
        } else if (p.region === 'collector') {
            if (p.x > r.collector.x + r.collector.w - 2) { p.x = r.collector.x + r.collector.w - 2; p.vx = -Math.abs(p.vx); }
            if (p.x < r.collector.x + r.bcDepl) { p.x = r.collector.x + r.bcDepl; p.vx = Math.abs(p.vx); }
        } else if (p.region === 'injected') {
            // Injected carriers: some recombine in base (disappear = base current)
            if (p.x > r.base.x && p.x < r.base.x + r.base.w) {
                if (Math.random() < 0.003) {
                    // Recombination — this carrier IS the base current
                    p.life = 0;
                }
            }
            // Collected at BC junction — swept into collector
            if (p.x > r.base.x + r.base.w) {
                p.vx = Math.max(p.vx, 0.5);  // accelerate through depletion field
                if (p.x > r.collector.x + r.collector.w) {
                    p.life = 0;  // exits collector
                }
            }
            // Reverse-injected in saturation moving left
            if (p.vx < 0 && p.x < r.base.x) {
                p.life = 0;
            }
        }

        // Remove dead particles
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Cap particle count
    if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
    }
}

function drawParticles(ctx) {
    for (const p of particles) {
        if (p.type === 'electron') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffcc44';
            ctx.fill();
        } else {
            // Hole: open circle
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff66aa';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
}
```

- [ ] **Step 2: Add animation loop**

```javascript
// === Animation Loop ===
function animate() {
    updateParticles();
    drawCrossSection();

    // Draw particles on top of cross-section
    const dpr = devicePixelRatio;
    csCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawParticles(csCtx);

    requestAnimationFrame(animate);
}
```

- [ ] **Step 3: Update initialization**

Replace the static `drawCrossSection()` init call with:
```javascript
initParticles();
drawConcentration();
animate();
```

Also update `setType()` to reinitialize particles:
```javascript
// In setType(), after updateAll():
initParticles();
```

- [ ] **Step 4: Verify animated particles**

Open in browser. Verify:
- Majority carriers jitter in their home regions (thermal motion)
- At I_B = 0: no carriers cross junctions
- At low I_B: carriers stream from emitter through base into collector; occasional ones disappear in base (recombination)
- At high I_B: more carriers, plus some injected from collector side
- NPN shows yellow dots (electrons) flowing E→B→C; PNP shows pink circles (holes)
- Pause button stops animation

- [ ] **Step 5: Commit**
```bash
git add "Week 4/bjt_semiconductors.html"
git commit -m "feat: add animated carrier particles with injection, recombination, and collection"
```

---

## Chunk 3: Concentration Plot, Index Update, and Polish

### Task 6: Carrier Concentration Plot (Top-Right)

**Files:**
- Modify: `Week 4/bjt_semiconductors.html`

- [ ] **Step 1: Implement `drawConcentration()`**

Replace the stub with:

```javascript
function drawConcentration() {
    const canvas = document.getElementById('concentration-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    ctx.clearRect(0, 0, cw, ch);

    const isNPN = transistorType === 'NPN';
    const margin = { top: 30, bottom: 40, left: 55, right: 20 };
    const plotW = cw - margin.left - margin.right;
    const plotH = ch - margin.top - margin.bottom;

    // Region boundaries as fractions of plotW (matching cross-section proportions, scaled to fill)
    const emitterFrac = 0.42;
    const baseFrac = 0.15;
    const collectorFrac = 0.43;
    const beJunc = emitterFrac;
    const bcJunc = emitterFrac + baseFrac;

    // Y-axis: log scale from 10^10 to 10^18
    const logMin = 10, logMax = 18;
    function yForLog(logVal) {
        return margin.top + plotH * (1 - (logVal - logMin) / (logMax - logMin));
    }
    function xForFrac(frac) {
        return margin.left + frac * plotW;
    }

    // Background region shading
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = isNPN ? '#e06050' : '#5080d0';
    ctx.fillRect(xForFrac(0), margin.top, xForFrac(emitterFrac) - xForFrac(0), plotH);
    ctx.fillStyle = isNPN ? '#5080d0' : '#e06050';
    ctx.fillRect(xForFrac(beJunc), margin.top, xForFrac(bcJunc) - xForFrac(beJunc), plotH);
    ctx.fillStyle = isNPN ? '#e06050' : '#5080d0';
    ctx.fillRect(xForFrac(bcJunc), margin.top, xForFrac(1) - xForFrac(bcJunc), plotH);
    ctx.globalAlpha = 1;

    // Junction lines
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    [beJunc, bcJunc].forEach(frac => {
        ctx.beginPath();
        ctx.moveTo(xForFrac(frac), margin.top);
        ctx.lineTo(xForFrac(frac), margin.top + plotH);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // Depletion region shading (grey bands matching cross-section)
    const beFracDepl = baseCurrent === 0 ? 0.04 : Math.max(0.006, 0.04 * (1 - baseCurrent / 100));
    const bcFracDepl = baseCurrent === 0 ? 0.04 : (baseCurrent < 70 ? Math.min(0.056, 0.04 * (1 + baseCurrent / 200)) : Math.max(0.012, 0.04 * (1 - (baseCurrent - 70) / 60)));
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(xForFrac(beJunc - beFracDepl), margin.top, xForFrac(beFracDepl * 2) - xForFrac(0), plotH);
    ctx.fillRect(xForFrac(bcJunc - bcFracDepl), margin.top, xForFrac(bcFracDepl * 2) - xForFrac(0), plotH);

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotH);
    ctx.lineTo(margin.left + plotW, margin.top + plotH);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px "IBM Plex Mono"';
    ctx.textAlign = 'right';
    for (let logV = logMin; logV <= logMax; logV += 2) {
        const y = yForLog(logV);
        ctx.fillText('10' + superscript(logV), margin.left - 5, y + 3);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotW, y); ctx.stroke();
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px "IBM Plex Sans"';
    ctx.fillText('Emitter', xForFrac(emitterFrac / 2), margin.top + plotH + 20);
    ctx.fillText('Base', xForFrac(beJunc + baseFrac / 2), margin.top + plotH + 20);
    ctx.fillText('Collector', xForFrac(bcJunc + collectorFrac / 2), margin.top + plotH + 20);

    // Y-axis title
    ctx.save();
    ctx.translate(12, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '11px "IBM Plex Sans"';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Carrier concentration (cm\u207B\u00B3)', 0, 0);
    ctx.restore();

    // Carrier concentration curves
    // NPN: n(x) majority in E and C, minority in B; p(x) majority in B, minority in E and C
    // Doping levels (log scale): Emitter N+ = 17, Base P = 15, Collector N = 16
    const eMaj = 17, bMaj = 15, cMaj = 16;
    const eMin = 13, bMinEq = 13, cMin = 12;  // minority at equilibrium (ni^2/N)
    const injectionBoost = baseCurrent / 100;

    // n(x) — electron concentration
    ctx.beginPath();
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 2;
    // Emitter: flat majority (NPN) or flat minority
    const nEmitter = isNPN ? eMaj : eMin;
    const nBase0 = isNPN ? (bMinEq + injectionBoost * 4) : bMaj;  // minority injection in base for NPN
    const nBaseEnd = isNPN ? (baseCurrent >= 70 ? bMinEq + injectionBoost * 3 : bMinEq) : bMaj;
    const nCollector = isNPN ? cMaj : cMin;

    // Draw n(x) curve with proper junction behavior:
    // - Sharp injection spike at forward-biased BE junction (minority jumps up)
    // - Linear decay across thin base (diffusion gradient)
    // - Extraction dip at reverse-biased BC junction (active) or injection at both (saturation)
    const steps = 300;
    function getLogN(frac) {
        if (frac < beJunc - 0.005) return nEmitter;
        if (frac < beJunc + 0.005) {
            // Transition at BE junction — sharp step to injected level
            const t = (frac - (beJunc - 0.005)) / 0.01;
            return nEmitter + (nBase0 - nEmitter) * t;
        }
        if (frac < bcJunc - 0.005) {
            // Linear decay across base (diffusion gradient in log space)
            const baseFracLocal = (frac - beJunc - 0.005) / (baseFrac - 0.01);
            return nBase0 + (nBaseEnd - nBase0) * Math.min(1, Math.max(0, baseFracLocal));
        }
        if (frac < bcJunc + 0.005) {
            // Transition at BC junction
            const t = (frac - (bcJunc - 0.005)) / 0.01;
            return nBaseEnd + (nCollector - nBaseEnd) * t;
        }
        return nCollector;
    }
    for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const logN = getLogN(frac);
        const x = xForFrac(frac);
        const y = yForLog(logN);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // p(x) — hole concentration
    ctx.beginPath();
    ctx.strokeStyle = '#ff66aa';
    ctx.lineWidth = 2;
    const pEmitter = isNPN ? eMin : eMaj;
    const pBase0 = isNPN ? bMaj : (bMinEq + injectionBoost * 4);
    const pBaseEnd = isNPN ? bMaj : (baseCurrent >= 70 ? bMinEq + injectionBoost * 3 : bMinEq);
    const pCollector = isNPN ? cMin : cMaj;

    function getLogP(frac) {
        if (frac < beJunc - 0.005) return pEmitter;
        if (frac < beJunc + 0.005) {
            const t = (frac - (beJunc - 0.005)) / 0.01;
            return pEmitter + (pBase0 - pEmitter) * t;
        }
        if (frac < bcJunc - 0.005) {
            const baseFracLocal = (frac - beJunc - 0.005) / (baseFrac - 0.01);
            return pBase0 + (pBaseEnd - pBase0) * Math.min(1, Math.max(0, baseFracLocal));
        }
        if (frac < bcJunc + 0.005) {
            const t = (frac - (bcJunc - 0.005)) / 0.01;
            return pBaseEnd + (pCollector - pBaseEnd) * t;
        }
        return pCollector;
    }
    for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const logP = getLogP(frac);
        const x = xForFrac(frac);
        const y = yForLog(logP);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Curve labels (positioned inside the plot area to avoid clipping)
    ctx.font = '600 11px "IBM Plex Mono"';
    ctx.fillStyle = '#ffcc44';
    ctx.textAlign = 'right';
    ctx.fillText('n(x)', margin.left + plotW - 5, yForLog(nCollector) - 6);
    ctx.fillStyle = '#ff66aa';
    ctx.fillText('p(x)', margin.left + plotW - 5, yForLog(pCollector) + 14);
}

function superscript(n) {
    const sup = { '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074',
                  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079' };
    return String(n).split('').map(c => sup[c] || c).join('');
}
```

- [ ] **Step 2: Verify concentration plot**

Open in browser. Verify:
- Log-scale Y-axis with labeled tick marks
- Two curves: yellow n(x) and pink p(x)
- Junction positions marked with dashed vertical lines
- Grey depletion region bands visible at both junctions, widths change with I_B
- At cutoff: flat majority/minority levels
- At active: sharp minority carrier injection spike at BE junction, linear decay across base, extraction at BC
- At saturation: injection spikes at both junctions
- NPN/PNP toggle flips which curve is majority in each region

- [ ] **Step 3: Commit**
```bash
git add "Week 4/bjt_semiconductors.html"
git commit -m "feat: add carrier concentration plot with log-scale axes and bias-dependent curves"
```

---

### Task 7: Index Page Update

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add BJT Semiconductors entry to Week 4 section**

In `index.html`, find the Week 4 topics div (line ~225) and add the Preface entry before the existing "BJT as a Switch":

```html
<a href="Week 4/bjt_semiconductors.html" class="topic">
    <span class="topic-number" style="width:auto;margin-right:8px">Preface</span>
    <span class="topic-title">BJT Semiconductors</span>
</a>
```

This goes immediately after `<div class="topics">` on line 225 and before the `bjt_switch.html` link.

- [ ] **Step 2: Verify index page**

Open `index.html` in browser. Verify:
- Week 4 section now shows: Preface (BJT Semiconductors), 1 (BJT as a Switch), 2 (NPN BJT as an Amplifier)
- Link navigates correctly to the new page

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "feat: add BJT Semiconductors preface link to Week 4 index"
```

---

### Task 8: Final Polish and Verification

**Files:**
- Modify: `Week 4/bjt_semiconductors.html`

- [ ] **Step 1: Add resize handler fix for concentration canvas**

Ensure `resizeCanvases()` is called on load and that `drawConcentration()` is called in the animation loop or on state change. Verify the concentration canvas resizes correctly.

- [ ] **Step 2: Full end-to-end test**

Open the page and test all combinations:
1. NPN + Cutoff (I_B = 0): static carriers, flat concentration curves, cutoff explanation
2. NPN + Active (I_B ~ 50): carriers streaming E→B→C, minority injection visible in plot, active explanation
3. NPN + Saturation (I_B ~ 90): heavy flow, both junctions injecting, saturation explanation
4. PNP + Cutoff: same layout but holes as majority in E/C, electrons in B
5. PNP + Active: holes flow E→B→C
6. PNP + Saturation: both junctions forward biased
7. Play/Pause works
8. Back button navigates to index
9. Resize window — canvases redraw correctly

- [ ] **Step 3: Commit any fixes**
```bash
git add "Week 4/bjt_semiconductors.html"
git commit -m "fix: polish and verify BJT semiconductors page"
```
