// Scene 5b — Transfer functions: HTML+KaTeX block diagram, s-plane, and a
// worked input/output example per system so the filter's effect is visible.
// For each preset we feed in a sum of sinusoids and plot the steady-state
// response y(t), computed from H(jω) of each component (LTI, no transient).
(function () {
  const eqnEl     = document.getElementById('tfEqn');
  if (!eqnEl) return;
  const inEqnEl   = document.getElementById('tfInEqn');
  const outEqnEl  = document.getElementById('tfOutEqn');
  const cPZ       = document.getElementById('tfPZ');
  const cIO       = document.getElementById('tfInOut');
  const seg       = document.getElementById('tfSeg');
  const sub       = document.getElementById('tfSub');
  const ioSub     = document.getElementById('tfInOutSub');

  // ─── System presets ─────────────────────────────────────────────────────
  // `comps`: list of {A, w, fn} sinusoidal components of the input signal,
  // chosen to make the filter's effect obvious (e.g. a slow + a fast tone for
  // the low-pass, three tones straddling the notch frequency, etc.).
  // `tMax`/`yMax` set the viewport for the plot so both traces share axes.
  const SYSTEMS = {
    lowpass: {
      name: 'low-pass · single pole',
      tex:  'H(s) = \\dfrac{1}{s + 1}',
      zeros: [],
      poles: [{ re: -1.0, im: 0 }],
      comps: [
        { A: 1, w: 0.5, fn: 'sin' },   // slow tone — passes through
        { A: 1, w: 4.0, fn: 'sin' },   // fast tone — gets squashed
      ],
      xTex: 'X(s) = \\dfrac{0.5}{s^{2}+0.25} + \\dfrac{4}{s^{2}+16}',
      yTex: 'Y(s) = \\dfrac{X(s)}{s + 1}',
      tMax: 14,
      yMax: 2.3,
      inputDesc: 'x(t) = sin(0.5 t) + sin(4 t)',
    },
    resonator: {
      name: 'lightly damped · 2nd order',
      tex:  'H(s) = \\dfrac{1}{(s + 0.2)^{2} + 1.4^{2}}',
      zeros: [],
      poles: [{ re: -0.2, im:  1.4 }, { re: -0.2, im: -1.4 }],
      comps: [
        { A: 1, w: 0.5, fn: 'sin' },
        { A: 1, w: 1.4, fn: 'sin' },   // right at the resonance — amplified
        { A: 1, w: 2.5, fn: 'sin' },
      ],
      xTex: 'X(s) = \\dfrac{0.5}{s^{2}+0.25} + \\dfrac{1.4}{s^{2}+1.96} + \\dfrac{2.5}{s^{2}+6.25}',
      yTex: 'Y(s) = \\dfrac{X(s)}{(s+0.2)^{2} + 1.4^{2}}',
      tMax: 20,
      yMax: 3.4,
      inputDesc: 'x(t) = sin(0.5 t) + sin(1.4 t) + sin(2.5 t)',
    },
    notch: {
      name: 'notch · zeros on jω axis',
      tex:  'H(s) = \\dfrac{s^{2} + 1}{(s + 0.3)^{2} + 1^{2}}',
      zeros: [{ re: 0, im:  1.0 }, { re: 0, im: -1.0 }],
      poles: [{ re: -0.3, im:  1.0 }, { re: -0.3, im: -1.0 }],
      comps: [
        { A: 1, w: 0.5, fn: 'sin' },
        { A: 1, w: 1.0, fn: 'sin' },   // the notched frequency — killed
        { A: 1, w: 2.0, fn: 'sin' },
      ],
      xTex: 'X(s) = \\dfrac{0.5}{s^{2}+0.25} + \\dfrac{1}{s^{2}+1} + \\dfrac{2}{s^{2}+4}',
      yTex: 'Y(s) = \\dfrac{(s^{2}+1)\\,X(s)}{(s+0.3)^{2} + 1}',
      tMax: 18,
      yMax: 3.4,
      inputDesc: 'x(t) = sin(0.5 t) + sin(1.0 t) + sin(2.0 t)',
    },
    integrator: {
      name: 'pure integrator · pole at origin',
      tex:  'H(s) = \\dfrac{1}{s}',
      zeros: [],
      poles: [{ re: 0, im: 0 }],
      comps: [
        { A: 1.0, w: 1.0, fn: 'cos' },
        { A: 0.5, w: 3.0, fn: 'cos' },
      ],
      xTex: 'X(s) = \\dfrac{s}{s^{2}+1} + \\dfrac{0.5\\,s}{s^{2}+9}',
      yTex: 'Y(s) = \\dfrac{X(s)}{s}',
      tMax: 14,
      yMax: 1.8,
      inputDesc: 'x(t) = cos(t) + ½ cos(3 t)',
    },
  };
  let cur = 'lowpass';

  // ─── Frequency response H(jω) ───────────────────────────────────────────
  // Returns [re, im] = H(jω). Per-system closed-form; avoids any ODE solve.
  function Hjw(sysKey, w) {
    switch (sysKey) {
      case 'lowpass': {
        // 1/(jω + 1)
        const d = 1 + w * w;
        return [1 / d, -w / d];
      }
      case 'resonator': {
        // 1/((jω + 0.2)² + 1.4²) = 1/(2 - ω² + 0.4 jω)
        const a = 2 - w * w, b = 0.4 * w;
        const d = a * a + b * b;
        return [a / d, -b / d];
      }
      case 'notch': {
        // (1 - ω²) / (1.09 - ω² + 0.6 jω)
        const nr = 1 - w * w;
        const dr = 1.09 - w * w, di = 0.6 * w;
        const dm = dr * dr + di * di;
        return [(nr * dr) / dm, (-nr * di) / dm];
      }
      case 'integrator': {
        // 1/(jω) = -j/ω
        if (Math.abs(w) < 1e-8) return [0, 0];
        return [0, -1 / w];
      }
    }
    return [0, 0];
  }

  // Map an input component through the system to get its steady-state output
  // component: amplitude × |H(jω)|, phase += arg H(jω).
  function outputComp(c, sysKey) {
    const [hr, hi] = Hjw(sysKey, c.w);
    const mag = Math.hypot(hr, hi);
    const ph  = Math.atan2(hi, hr);
    return { A: c.A * mag, w: c.w, fn: c.fn || 'sin', phase: (c.phase || 0) + ph };
  }

  function evalSignal(comps, t) {
    let v = 0;
    for (const c of comps) {
      const p = c.phase || 0;
      v += c.fn === 'cos'
        ? c.A * Math.cos(c.w * t + p)
        : c.A * Math.sin(c.w * t + p);
    }
    return v;
  }

  // ─── KaTeX rendering of the block-diagram equations ─────────────────────
  function renderInto(el, tex, displayMode) {
    if (!el) return;
    if (window.katex) {
      try { katex.render(tex, el, { throwOnError: false, displayMode: !!displayMode }); return; }
      catch (_) { /* fall through */ }
    }
    el.textContent = tex;
  }
  function renderEquation() {
    const s = SYSTEMS[cur];
    renderInto(eqnEl,    s.tex,  false);
    renderInto(inEqnEl,  s.xTex, false);
    renderInto(outEqnEl, s.yTex, false);
  }

  // ─── s-plane ────────────────────────────────────────────────────────────
  function drawPZ() {
    const { ctx, w, h } = CFG.setupCanvas(cPZ);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const sys = SYSTEMS[cur];
    const span = 2.2;
    const padL = 36, padR = 22, padT = 44, padB = 34;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const bw = x1 - x0, bh = y1 - y0;
    const xOf = re => x0 + (re + span) / (2 * span) * bw;
    const yOf = im => y1 - (im + span) / (2 * span) * bh;

    // LHP stability tint
    ctx.fillStyle = 'rgba(123,224,137,0.05)';
    ctx.fillRect(x0, y0, xOf(0) - x0, bh);

    // grid
    ctx.strokeStyle = C.grid;
    for (let k = -2; k <= 2; k++) {
      const xv = xOf(k * span / 2);
      ctx.beginPath(); ctx.moveTo(xv, y0); ctx.lineTo(xv, y1); ctx.stroke();
      const yv = yOf(k * span / 2);
      ctx.beginPath(); ctx.moveTo(x0, yv); ctx.lineTo(x1, yv); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = C.gridStrong;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yOf(0)); ctx.lineTo(x1, yOf(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xOf(0), y0); ctx.lineTo(xOf(0), y1); ctx.stroke();

    // axis labels (σ right end, jω top end — placed just outside the plot)
    CFG.label(ctx, 'σ',  x1 + 4,      yOf(0) - 5, C.muted, { size: 11 });
    CFG.label(ctx, 'jω', xOf(0) + 6,  y0 - 12,    C.real,  { size: 11 });
    CFG.label(ctx, '0',  xOf(0) + 4,  yOf(0) + 4, C.muted, { size: 10 });

    // Input-frequency tick marks on the jω axis with their ω values.
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);
    for (const c of sys.comps) {
      for (const sw of [+c.w, -c.w]) {
        const py = yOf(sw);
        if (py < y0 || py > y1) continue;
        ctx.beginPath(); ctx.moveTo(xOf(0) - 8, py); ctx.lineTo(xOf(0) + 8, py); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    // positive-side ω labels only (avoid clutter)
    for (const c of sys.comps) {
      const py = yOf(c.w);
      if (py < y0 || py > y1) continue;
      CFG.label(ctx, `ω=${c.w}`, xOf(0) + 10, py - 5, C.accent, { size: 9 });
    }

    // zeros
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = C.time;
    for (const z of sys.zeros) {
      const px = xOf(z.re), py = yOf(z.im);
      ctx.shadowColor = C.time; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // poles
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = C.imag;
    for (const p of sys.poles) {
      const px = xOf(p.re), py = yOf(p.im);
      const r = 7;
      ctx.shadowColor = C.imag; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
      ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // bottom legend row
    const legY = y1 + 14;
    CFG.label(ctx, '×  poles',       x0,        legY, C.imag,   { size: 10 });
    CFG.label(ctx, '○  zeros',       x0 + 70,   legY, C.time,   { size: 10 });
    CFG.label(ctx, '┄  input ω',     x0 + 140,  legY, C.accent, { size: 10 });
    CFG.label(ctx, 'LHP = stable',   x1,        legY, C.muted,  { size: 10, align: 'right' });
  }

  // ─── Input/output panel ────────────────────────────────────────────────
  // Two traces sharing the same t-axis and the same y-scale — equal scale is
  // what makes attenuation / amplification visible at a glance.
  function drawInOut() {
    const { ctx, w, h } = CFG.setupCanvas(cIO);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const sys = SYSTEMS[cur];
    const tMax = sys.tMax;
    const yMax = sys.yMax;
    const yOut = sys.comps.map(c => outputComp(c, cur));

    // Leave room at the top for the .title/.sub HTML overlays and a label
    // row inside the canvas for each lane; extra bottom padding for the t axis.
    const padL = 48, padR = 18, padT = 66, padB = 34;
    const labelLane = 20;  // per-lane header strip above each lane
    const midGap = 26;
    const x0 = padL, x1 = w - padR;
    const usable = h - padT - padB - midGap;
    const laneH = usable / 2;
    const topY0 = padT;
    const topY1 = topY0 + laneH;
    const botY0 = topY1 + midGap;
    const botY1 = botY0 + laneH;

    function plotLane(y0, y1, color, headLabel, headDetail, comps) {
      // header strip just above the trace box (baseline 'middle' centers it on the strip)
      const headY = y0 - labelLane / 2;
      CFG.label(ctx, headLabel,  x0,      headY, color,   { size: 12, weight: 700, baseline: 'middle' });
      CFG.label(ctx, headDetail, x0 + 44, headY, C.muted, { size: 10,              baseline: 'middle' });

      const mid = (y0 + y1) / 2;
      const amp = (y1 - y0) / 2 - 4;

      // zero line
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
      // frame — left edge + baseline
      ctx.strokeStyle = C.gridStrong;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();

      // amplitude ticks (±yMax) as short hash marks on the left
      ctx.beginPath();
      ctx.moveTo(x0 - 3, y0);  ctx.lineTo(x0, y0);
      ctx.moveTo(x0 - 3, mid); ctx.lineTo(x0, mid);
      ctx.moveTo(x0 - 3, y1);  ctx.lineTo(x0, y1);
      ctx.stroke();
      CFG.label(ctx, `+${yMax.toFixed(1)}`, x0 - 6, y0,  C.muted, { size: 9, align: 'right', baseline: 'middle' });
      CFG.label(ctx, '0',                    x0 - 6, mid, C.muted, { size: 9, align: 'right', baseline: 'middle' });
      CFG.label(ctx, `−${yMax.toFixed(1)}`, x0 - 6, y1,  C.muted, { size: 9, align: 'right', baseline: 'middle' });

      // trace
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const N = 360;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * tMax;
        const v = CFG.clamp(evalSignal(comps, t), -yMax, yMax);
        const px = x0 + (t / tMax) * (x1 - x0);
        const py = mid - (v / yMax) * amp;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    plotLane(topY0, topY1, C.real, 'x(t)',  'input · applied signal',  sys.comps);
    plotLane(botY0, botY1, C.imag, 'y(t)',  'output · H(s) · x(t)',    yOut);

    // shared t axis ticks
    ctx.strokeStyle = C.gridStrong;
    for (let k = 0; k <= 4; k++) {
      const t = (k / 4) * tMax;
      const px = x0 + (t / tMax) * (x1 - x0);
      ctx.beginPath(); ctx.moveTo(px, botY1); ctx.lineTo(px, botY1 + 4); ctx.stroke();
      CFG.label(ctx, t.toFixed(t < 10 ? 0 : 0), px, botY1 + 6, C.muted, { size: 9, align: 'center' });
    }
    CFG.label(ctx, 't  (seconds) →', x1, botY1 + 18, C.muted, { size: 10, align: 'right' });

    ioSub.textContent = sys.inputDesc;
  }

  function drawAll() {
    drawPZ();
    drawInOut();
    sub.textContent = SYSTEMS[cur].name;
  }

  seg.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      cur = b.dataset.v;
      renderEquation();
      drawAll();
    });
  });

  // Poll briefly for KaTeX's global to appear; it loads via defer and the
  // auto-render onload may fire before or after this script.
  function tryRender(attempt) {
    if (window.katex) { renderEquation(); return; }
    if (attempt > 20) {
      const s = SYSTEMS[cur];
      eqnEl.textContent    = s.tex;
      if (inEqnEl)  inEqnEl.textContent  = s.xTex;
      if (outEqnEl) outEqnEl.textContent = s.yTex;
      return;
    }
    setTimeout(() => tryRender(attempt + 1), 60);
  }
  tryRender(0);

  CFG.registerLoop(cPZ, () => drawAll());
  window.addEventListener('theme-change', () => drawAll());
  window.addEventListener('resize', () => drawAll());
})();
