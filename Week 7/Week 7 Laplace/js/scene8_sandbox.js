// Scene 8 — Sandbox.
// User picks an input function x(t) (each forces a fixed set of poles/zeros
// in X(s)) and builds a transfer function H(s) by clicking the s-plane to
// drop poles and zeros. Output y(t) is the inverse Laplace of X(s)·H(s),
// computed numerically by simulating the controllable-canonical state-space
// realisation of Y(s) = X(s)·H(s) with RK4.
(function () {
  const cSP = document.getElementById('sb_splane');
  if (!cSP) return;
  const cIO       = document.getElementById('sb_io');
  const inputSeg  = document.getElementById('sbInput');
  const modeSeg   = document.getElementById('sbMode');
  const param     = document.getElementById('sbParam');
  const paramO    = document.getElementById('sbParamO');
  const paramLbl  = document.getElementById('sbParamLbl');
  const paramRow  = document.getElementById('sbParamRow');
  const gain      = document.getElementById('sbGain');
  const gainO     = document.getElementById('sbGainO');
  const resetBtn  = document.getElementById('sbReset');
  const clearBtn  = document.getElementById('sbClear');
  const hsub      = document.getElementById('sb_hsub');
  const iosub     = document.getElementById('sb_iosub');

  // ─── State ───────────────────────────────────────────────────────────
  let inputKind = 'step';
  let inputParam = 1;     // ω for sin/cos, a for exp
  let mode = 'pole';
  // Each item is one root in the upper half-plane (im ≥ 0). If im > 0 it
  // implicitly carries its conjugate so coefficients stay real.
  const items = [{ kind: 'pole', re: -1, im: 0 }];
  let drag = null;
  let dirty = true;       // only redraw when something changed

  // ─── s-plane geometry ────────────────────────────────────────────────
  const SPAN_X_LEFT = -3, SPAN_X_RIGHT = 1.5;
  const SPAN_Y = 3;
  function geom() {
    const rect = cSP.getBoundingClientRect();
    const padL = 36, padR = 18, padT = 26, padB = 30;
    const w = rect.width, h = rect.height;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    return {
      x0, x1, y0, y1, w, h,
      xOf: re => x0 + (re - SPAN_X_LEFT) / (SPAN_X_RIGHT - SPAN_X_LEFT) * (x1 - x0),
      yOf: im => y1 - (im + SPAN_Y) / (2 * SPAN_Y) * (y1 - y0),
      reOf: px => SPAN_X_LEFT + (px - x0) / (x1 - x0) * (SPAN_X_RIGHT - SPAN_X_LEFT),
      imOf: py => -SPAN_Y + (y1 - py) / (y1 - y0) * 2 * SPAN_Y,
    };
  }

  // ─── Input definitions ───────────────────────────────────────────────
  function inputFn(t) {
    if (t < 0) return 0;
    switch (inputKind) {
      case 'impulse': return 0;             // handled via initial state
      case 'step':    return 1;
      case 'ramp':    return t;
      case 'exp':     return Math.exp(-inputParam * t);
      case 'sin':     return Math.sin(inputParam * t);
      case 'cos':     return Math.cos(inputParam * t);
    }
    return 0;
  }
  // X(s) poles/zeros, each with im ≥ 0 (conjugate pair implicit)
  function inputPolesZeros() {
    switch (inputKind) {
      case 'impulse': return { poles: [], zeros: [], k: 1 };
      case 'step':    return { poles: [{ re: 0, im: 0 }], zeros: [], k: 1 };
      case 'ramp':    return { poles: [{ re: 0, im: 0 }, { re: 0, im: 0 }], zeros: [], k: 1 };
      case 'exp':     return { poles: [{ re: -inputParam, im: 0 }], zeros: [], k: 1 };
      case 'sin':     return { poles: [{ re: 0, im: inputParam }], zeros: [], k: inputParam };
      case 'cos':     return { poles: [{ re: 0, im: inputParam }], zeros: [{ re: 0, im: 0 }], k: 1 };
    }
    return { poles: [], zeros: [], k: 1 };
  }
  function inputParamLabel() {
    if (inputKind === 'sin' || inputKind === 'cos') return 'frequency $\\omega$';
    if (inputKind === 'exp') return 'rate $a$';
    return '—';
  }
  function paramVisible() {
    return inputKind === 'sin' || inputKind === 'cos' || inputKind === 'exp';
  }

  // ─── Polynomial helpers (real coefficients, descending order) ────────
  function polyMul(a, b) {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++)
        out[i + j] += a[i] * b[j];
    return out;
  }
  // roots = list of {re, im} where im ≥ 0; im > 0 means conjugate pair.
  function polyFromRoots(roots) {
    let p = [1];
    for (const r of roots) {
      if (Math.abs(r.im) < 1e-9) {
        p = polyMul(p, [1, -r.re]);
      } else {
        // (s − r)(s − r*) = s² − 2 Re(r) s + |r|²
        p = polyMul(p, [1, -2 * r.re, r.re * r.re + r.im * r.im]);
      }
    }
    return p;
  }
  function buildSystem() {
    const inp = inputPolesZeros();
    const hZeros = items.filter(i => i.kind === 'zero');
    const hPoles = items.filter(i => i.kind === 'pole');
    const k = parseFloat(gain.value) * inp.k;
    const num = polyFromRoots([...inp.zeros, ...hZeros]).map(c => c * k);
    const den = polyFromRoots([...inp.poles, ...hPoles]);
    return { num, den, hZeroCount: hZeros.length, hPoleCount: hPoles.length };
  }

  // ─── Controllable-canonical state-space realisation ─────────────────
  // Returns { A (n×n flat), B (n), C (n), Dterm, n }.  null when n === 0.
  function stateSpace(num, den) {
    const a0 = den[0];
    if (!isFinite(a0) || a0 === 0) return null;
    const D = den.map(c => c / a0);
    const N = num.map(c => c / a0);
    const n = D.length - 1;
    if (n <= 0) return null;
    while (N.length < n + 1) N.unshift(0);
    if (N.length > n + 1) N.splice(0, N.length - (n + 1)); // truncate (improper)
    const A = new Array(n * n).fill(0);
    for (let i = 0; i < n - 1; i++) A[i * n + (i + 1)] = 1;
    // last row: x_dot_{n-1} = -Σ a_j x_j + u, with a_j = D[n-j]
    for (let j = 0; j < n; j++) A[(n - 1) * n + j] = -D[n - j];
    const B = new Array(n).fill(0); B[n - 1] = 1;
    // For proper-with-feedthrough, polynomial-divide first:
    //   H(s) = Dterm + (N(s) − Dterm·D(s))/D(s)
    // Then C uses the strictly-proper part N′(s) = N(s) − Dterm·D(s).
    const Dterm = N[0];
    const C = new Array(n).fill(0);
    for (let i = 0; i < n; i++) C[i] = N[n - i] - Dterm * D[n - i];
    return { A, B, C, Dterm, n };
  }
  function matVec(A, x, n) {
    const out = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i * n + j] * x[j];
      out[i] = s;
    }
    return out;
  }

  function simulate(num, den, tMax, N) {
    const ss = stateSpace(num, den);
    const dt = tMax / N;
    const out = new Array(N + 1);
    if (!ss) {
      const k = num[num.length - 1] / den[den.length - 1];
      for (let i = 0; i <= N; i++) {
        const t = i * dt;
        const xv = inputFn(t);
        out[i] = { t, x: xv, y: k * xv };
      }
      return out;
    }
    let state = inputKind === 'impulse' ? ss.B.slice() : new Array(ss.n).fill(0);
    for (let i = 0; i <= N; i++) {
      const t = i * dt;
      const u = inputKind === 'impulse' ? 0 : inputFn(t);
      let yv = ss.Dterm * u;
      for (let j = 0; j < ss.n; j++) yv += ss.C[j] * state[j];
      out[i] = { t, x: inputFn(t), y: yv };
      if (i === N) break;
      const u2 = inputKind === 'impulse' ? 0 : inputFn(t + dt / 2);
      const u4 = inputKind === 'impulse' ? 0 : inputFn(t + dt);
      const f = (s, uu) => {
        const r = matVec(ss.A, s, ss.n);
        r[ss.n - 1] += uu; // because B = e_{n-1}
        return r;
      };
      const k1 = f(state, u);
      const m1 = state.map((s, j) => s + (dt / 2) * k1[j]);
      const k2 = f(m1, u2);
      const m2 = state.map((s, j) => s + (dt / 2) * k2[j]);
      const k3 = f(m2, u2);
      const m3 = state.map((s, j) => s + dt * k3[j]);
      const k4 = f(m3, u4);
      for (let j = 0; j < ss.n; j++)
        state[j] += (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
      // hard cap to keep RK4 from going to Inf and breaking the canvas
      for (let j = 0; j < ss.n; j++) state[j] = Math.max(-1e8, Math.min(1e8, state[j]));
    }
    return out;
  }

  // ─── Drawing ─────────────────────────────────────────────────────────
  function drawMark(ctx, G, re, im, kind, color, alpha, hi) {
    const px = G.xOf(re), py = G.yOf(im);
    if (px < G.x0 - 4 || px > G.x1 + 4 || py < G.y0 - 4 || py > G.y1 + 4) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = kind === 'pole' ? 2.4 : 2.2;
    if (hi) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    if (kind === 'pole') {
      const r = 7;
      ctx.beginPath();
      ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
      ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const G = geom();
    // shaded half-planes
    ctx.fillStyle = 'rgba(123,224,137,0.04)';
    ctx.fillRect(G.x0, G.y0, G.xOf(0) - G.x0, G.y1 - G.y0);
    ctx.fillStyle = 'rgba(255,92,122,0.04)';
    ctx.fillRect(G.xOf(0), G.y0, G.x1 - G.xOf(0), G.y1 - G.y0);
    // grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let v = Math.ceil(SPAN_X_LEFT); v <= Math.floor(SPAN_X_RIGHT); v++) {
      const x = G.xOf(v);
      ctx.beginPath(); ctx.moveTo(x, G.y0); ctx.lineTo(x, G.y1); ctx.stroke();
    }
    for (let v = -Math.floor(SPAN_Y); v <= Math.floor(SPAN_Y); v++) {
      const y = G.yOf(v);
      ctx.beginPath(); ctx.moveTo(G.x0, y); ctx.lineTo(G.x1, y); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(G.x0, G.yOf(0)); ctx.lineTo(G.x1, G.yOf(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(G.xOf(0), G.y0); ctx.lineTo(G.xOf(0), G.y1); ctx.stroke();
    CFG.label(ctx, 'jω', G.xOf(0) + 5, G.y0 + 2, C.real, { size: 10 });
    CFG.label(ctx, 'σ', G.x1 - 10, G.yOf(0) + 4, C.muted, { size: 10 });
    CFG.label(ctx, 'LHP · stable', G.x0 + 4, G.y1 - 14, C.time, { size: 10 });
    CFG.label(ctx, 'RHP · unstable', G.x1 - 4, G.y1 - 14, C.imag, { size: 10, align: 'right' });

    // input poles & zeros (forced by x(t)) — yellow
    const inp = inputPolesZeros();
    const inputCol = C.accent;
    function drawInputRoot(r, kind) {
      drawMark(ctx, G, r.re, r.im, kind, inputCol, 0.9, false);
      if (Math.abs(r.im) > 1e-6) drawMark(ctx, G, r.re, -r.im, kind, inputCol, 0.6, false);
    }
    inp.poles.forEach(p => drawInputRoot(p, 'pole'));
    inp.zeros.forEach(z => drawInputRoot(z, 'zero'));

    // user H items + their conjugates
    for (const it of items) {
      const color = it.kind === 'pole' ? C.imag : C.time;
      const hi = drag && drag.item === it;
      drawMark(ctx, G, it.re, it.im, it.kind, color, 1, hi);
      if (Math.abs(it.im) > 1e-6) drawMark(ctx, G, it.re, -it.im, it.kind, color, 0.7, false);
    }

    // legend along the bottom edge
    const legendY = G.y1 + 14;
    CFG.label(ctx, '× pole',  G.x0,        legendY, C.imag,   { size: 10 });
    CFG.label(ctx, '○ zero',  G.x0 + 60,   legendY, C.time,   { size: 10 });
    CFG.label(ctx, 'input', G.x1, legendY, C.accent, { size: 10, align: 'right' });
  }

  function drawIO() {
    const { ctx, w, h } = CFG.setupCanvas(cIO);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const sys = buildSystem();
    const improper = sys.num.length > sys.den.length;

    // pick a reasonable plot horizon
    const inp = inputPolesZeros();
    const allPoles = [...inp.poles, ...items.filter(i => i.kind === 'pole')];
    let slow = 4;
    for (const p of allPoles) {
      if (p.re < -1e-3) slow = Math.max(slow, 5 / -p.re);
      if (Math.abs(p.re) < 1e-3 && Math.abs(p.im) > 1e-3) slow = Math.max(slow, 4 * Math.PI / Math.abs(p.im));
      if (Math.abs(p.re) < 1e-3 && Math.abs(p.im) < 1e-3) slow = Math.max(slow, 8); // pure integrator
    }
    if (inputKind === 'sin' || inputKind === 'cos') slow = Math.max(slow, 6 * Math.PI / inputParam);
    if (inputKind === 'exp') slow = Math.max(slow, 5 / inputParam);
    let tMax = Math.min(slow, 40);

    const samples = improper ? [] : simulate(sys.num, sys.den, tMax, 700);
    let yMax = 0.5, xMax = 0.5;
    for (const s of samples) {
      if (isFinite(s.x)) xMax = Math.max(xMax, Math.abs(s.x));
      if (isFinite(s.y)) yMax = Math.max(yMax, Math.abs(s.y));
    }
    xMax *= 1.15; yMax *= 1.15;
    if (yMax > 1e6) yMax = 1e6;

    const padL = 44, padR = 14, padT = 36, padB = 28;
    const midGap = 20;
    const x0 = padL, x1 = w - padR;
    const topY0 = padT;
    const topY1 = padT + (h - padT - padB - midGap) / 2;
    const botY0 = topY1 + midGap;
    const botY1 = h - padB;

    function lane(y0, y1, color, label, getter, ymax, isInputLane) {
      const mid = (y0 + y1) / 2;
      const amp = (y1 - y0) / 2 - 4;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
      ctx.strokeStyle = C.gridStrong;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();

      if (samples.length) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          let v = getter(s);
          if (!isFinite(v)) { started = false; continue; }
          v = CFG.clamp(v, -ymax, ymax);
          const px = x0 + (s.t / tMax) * (x1 - x0);
          const py = mid - (v / ymax) * amp;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // impulse spike marker
      if (isInputLane && inputKind === 'impulse') {
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + 1, mid); ctx.lineTo(x0 + 1, y0 + 6);
        ctx.moveTo(x0 - 4, y0 + 10); ctx.lineTo(x0 + 1, y0 + 6); ctx.lineTo(x0 + 6, y0 + 10);
        ctx.stroke();
        CFG.label(ctx, 'δ(t)', x0 + 10, y0 + 4, color, { size: 10 });
      }

      CFG.label(ctx, label, x0 + 4, y0 - 16, color, { size: 11, weight: 700 });
      CFG.label(ctx, `±${ymax.toFixed(2)}`, x0 - 4, y0, C.muted, { size: 9, align: 'right' });
    }

    lane(topY0, topY1, C.real, 'x(t) · input',  s => s.x, xMax, true);
    lane(botY0, botY1, C.imag, 'y(t) · output', s => s.y, yMax, false);

    CFG.label(ctx, 't →', x1, botY1 + 6, C.muted, { size: 10, align: 'right' });
    CFG.label(ctx, '0',   x0 + 2, botY1 + 6, C.muted, { size: 10 });
    CFG.label(ctx, tMax.toFixed(1), (x0 + x1) / 2, botY1 + 6, C.muted, { size: 10 });

    // status line
    let status = 'stable response';
    const userPoles = items.filter(i => i.kind === 'pole');
    const unstable = userPoles.some(p => p.re > 1e-4);
    const onAxis   = userPoles.some(p => Math.abs(p.re) < 1e-4 && Math.abs(p.im) > 1e-4);
    if (improper) status = 'improper · need at least as many poles as zeros';
    else if (unstable) status = 'unstable · pole in RHP; output grows';
    else if (onAxis) status = 'marginally stable · poles on jω axis';
    else if (userPoles.length === 0 && inputKind !== 'impulse') status = 'pure feedthrough · y(t) = k·x(t)';
    iosub.textContent = status;
  }

  function updateHsubText() {
    const userZ = items.filter(i => i.kind === 'zero').length;
    const userP = items.filter(i => i.kind === 'pole').length;
    const k = parseFloat(gain.value).toFixed(2);
    hsub.textContent = `H(s) · ${userZ} zero${userZ === 1 ? '' : 's'} · ${userP} pole${userP === 1 ? '' : 's'} · k=${k}`;
  }

  function drawAll() {
    drawSPlane();
    drawIO();
    updateHsubText();
    dirty = false;
  }
  function mark() { dirty = true; }

  // ─── Interaction ─────────────────────────────────────────────────────
  function hitTest(px, py) {
    const G = geom();
    let best = null, bestD = 18;
    for (const it of items) {
      const x = G.xOf(it.re), y = G.yOf(it.im);
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) { best = it; bestD = d; }
      if (Math.abs(it.im) > 1e-6) {
        const x2 = G.xOf(it.re), y2 = G.yOf(-it.im);
        const d2 = Math.hypot(px - x2, py - y2);
        if (d2 < bestD) { best = it; bestD = d2; }
      }
    }
    return best;
  }
  cSP.addEventListener('pointerdown', (e) => {
    const rect = cSP.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const G = geom();
    if (px < G.x0 || px > G.x1 || py < G.y0 || py > G.y1) return;
    const hit = hitTest(px, py);
    if (e.shiftKey && hit) {
      const i = items.indexOf(hit);
      if (i >= 0) items.splice(i, 1);
      mark();
      return;
    }
    if (hit) {
      drag = { item: hit };
      cSP.setPointerCapture(e.pointerId);
      mark();
      return;
    }
    let im = G.imOf(py);
    if (im < 0) im = -im;
    if (im < 0.05) im = 0;
    const newItem = {
      kind: mode,
      re: CFG.clamp(G.reOf(px), SPAN_X_LEFT, SPAN_X_RIGHT),
      im: CFG.clamp(im, 0, SPAN_Y),
    };
    items.push(newItem);
    drag = { item: newItem };
    cSP.setPointerCapture(e.pointerId);
    mark();
  });
  cSP.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = cSP.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const G = geom();
    let im = G.imOf(py);
    if (im < 0) im = -im;
    if (im < 0.05) im = 0;
    drag.item.re = CFG.clamp(G.reOf(px), SPAN_X_LEFT, SPAN_X_RIGHT);
    drag.item.im = CFG.clamp(im, 0, SPAN_Y);
    mark();
  });
  function endDrag() { if (drag) { drag = null; mark(); } }
  cSP.addEventListener('pointerup', endDrag);
  cSP.addEventListener('pointercancel', endDrag);
  cSP.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = cSP.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const hit = hitTest(px, py);
    if (hit) {
      const i = items.indexOf(hit);
      if (i >= 0) items.splice(i, 1);
      mark();
    }
  });

  // ─── Controls ────────────────────────────────────────────────────────
  function renderParamLabel() {
    const tex = inputParamLabel();
    if (window.katex && tex !== '—') {
      try { katex.render(tex, paramLbl, { throwOnError: false }); return; }
      catch (_) { /* fall through */ }
    }
    paramLbl.textContent = tex;
  }
  function syncParamUI() {
    paramRow.style.display = paramVisible() ? '' : 'none';
    renderParamLabel();
    paramO.textContent = inputParam.toFixed(2);
  }
  inputSeg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    inputSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    inputKind = b.dataset.v;
    if (inputKind === 'exp') {
      param.min = '0.1'; param.max = '2'; param.step = '0.05';
      if (inputParam < 0.1 || inputParam > 2) inputParam = 0.5;
    } else {
      param.min = '0.2'; param.max = '3'; param.step = '0.05';
      if (inputParam < 0.2 || inputParam > 3) inputParam = 1;
    }
    param.value = inputParam;
    syncParamUI();
    mark();
  }));
  modeSeg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    modeSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    mode = b.dataset.v;
  }));
  param.addEventListener('input', () => {
    inputParam = parseFloat(param.value);
    paramO.textContent = inputParam.toFixed(2);
    mark();
  });
  gain.addEventListener('input', () => {
    gainO.textContent = parseFloat(gain.value).toFixed(2);
    mark();
  });
  resetBtn.addEventListener('click', () => {
    items.length = 0;
    items.push({ kind: 'pole', re: -1, im: 0 });
    mark();
  });
  clearBtn.addEventListener('click', () => {
    items.length = 0;
    mark();
  });

  // ─── Init ────────────────────────────────────────────────────────────
  syncParamUI();
  gainO.textContent = parseFloat(gain.value).toFixed(2);

  function loop() { if (dirty) drawAll(); }
  CFG.registerLoop(cSP, loop);
  window.addEventListener('theme-change', () => { mark(); });
  window.addEventListener('resize', () => { mark(); });
  // re-render math label once KaTeX is up
  function tryKaTeX(n) {
    if (window.katex) { renderParamLabel(); return; }
    if (n > 20) return;
    setTimeout(() => tryKaTeX(n + 1), 60);
  }
  tryKaTeX(0);
  drawAll();
})();
