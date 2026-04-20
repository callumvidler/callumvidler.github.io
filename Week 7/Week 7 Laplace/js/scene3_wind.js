// Scene 3 — Fourier winding machine. Signal / wound / spectrum.
(function () {
  const cSig = document.getElementById('w_sig');
  const cWnd = document.getElementById('w_wound');
  const cSpc = document.getElementById('w_spec');
  if (!cSig) return;

  const fEl = document.getElementById('windF');
  const fO = document.getElementById('windFO');
  const sub = document.getElementById('w_sub');
  const segBtns = document.querySelectorAll('#windSig button');
  const sweepBtn = document.getElementById('sweepBtn');
  let signalKind = 'tone1';
  let sweep = false, sweepT = 0, sweepElapsed = 0;

  segBtns.forEach(b => b.addEventListener('click', () => {
    segBtns.forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    signalKind = b.getAttribute('data-v');
    drawAll();
    rebuildPeaks();
  }));
  // Sweep state: whether we're currently holding on an exact peak, and how
  // long we've been there. Re-lock avoidance is handled by advancing
  // nextPeakIdx once each peak has been visited.
  const sweepState = { holding: false, holdT: 0 };
  function resetSweepState() {
    sweepState.holding = false;
    sweepState.holdT = 0;
  }

  sweepBtn.addEventListener('click', () => {
    sweep = !sweep;
    sweepBtn.textContent = sweep ? 'stop sweep' : 'sweep f';
    sweepElapsed = 0;
    resetSweepState();
    if (sweep) {
      sweepF = 0;
      fEl.value = '0';
      fO.textContent = '0.00';
      rebuildPeaks();
    }
    drawAll();
  });

  // Each signal carries a DC offset so g(t) ≥ 0 everywhere. This keeps the
  // radius of the wound spiral strictly positive and reads more cleanly.
  function gOf(t) {
    if (signalKind === 'tone1') return 1 + Math.cos(2 * Math.PI * 1 * t);
    if (signalKind === 'chord') return 1.2 + 0.6 * Math.cos(2 * Math.PI * 1 * t) + 0.6 * Math.cos(2 * Math.PI * 2 * t);
    if (signalKind === 'square') return 0.8 + Math.sign(Math.sin(2 * Math.PI * 1 * t)) * 0.8;
    return 0;
  }
  // Peak amplitudes for plot scaling (corresponds to max of gOf for each kind).
  function gMax() {
    if (signalKind === 'tone1') return 2.0;
    if (signalKind === 'chord') return 2.4;
    if (signalKind === 'square') return 1.6;
    return 1;
  }

  // Precompute spectrum |F(f)| for current signal
  function computeSpectrum() {
    const F = [];
    const N = 260;
    const fMax = 4;
    const Tmax = 6, samples = 600;
    const dt = Tmax / samples;
    for (let i = 0; i < N; i++) {
      const f = (i / (N - 1)) * fMax;
      let re = 0, im = 0;
      for (let k = 0; k < samples; k++) {
        const t = k * dt;
        const g = gOf(t);
        const ang = -2 * Math.PI * f * t;
        re += g * Math.cos(ang) * dt;
        im += g * Math.sin(ang) * dt;
      }
      F.push(Math.hypot(re, im) / Tmax * 2);
    }
    return { F, fMax };
  }
  let spec = computeSpectrum();
  function refreshSpec() { spec = computeSpectrum(); }

  function drawSig() {
    const { ctx, w, h } = CFG.setupCanvas(cSig);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const padL = 14, padR = 12, padT = 34, padB = 18;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    // Baseline at the bottom — g(t) is strictly positive, so the pen only
    // ever rises from here.
    const baseY = y1 - 2;
    const amp = (y1 - y0) - 4;
    const M = gMax();
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(x0, baseY); ctx.lineTo(x1, baseY); ctx.stroke();
    ctx.strokeStyle = C.time; ctx.lineWidth = 1.8;
    ctx.beginPath();
    const Tmax = 4;
    for (let i = 0; i <= 300; i++) {
      const u = i / 300, t = u * Tmax;
      const v = gOf(t);
      const px = x0 + u * (x1 - x0);
      const py = baseY - (v / M) * amp;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function drawWound(fVal) {
    const { ctx, w, h } = CFG.setupCanvas(cWnd);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const cx = w / 2, cy = h / 2;
    // Scale the wound shape to fill the panel. g(t) is now strictly positive
    // with max value gMax(), so we size one "unit" to peak amplitude.
    const maxR = Math.min(w, h) * 0.44;
    const scale = maxR / gMax();
    // grid — three concentric circles at |g| = 1/3, 2/3, 1
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath(); ctx.arc(cx, cy, (r / 3) * scale, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

    // wind g(t) * e^{-2πift}
    const Tmax = 6, N = 700;
    let comX = 0, comY = 0, cnt = 0;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = i / N * Tmax;
      const g = gOf(t);
      const ang = -2 * Math.PI * fVal * t;
      const re = g * Math.cos(ang);
      const im = g * Math.sin(ang);
      const px = cx + re * scale;
      const py = cy - im * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      comX += re; comY += im; cnt++;
      // gradient along path
      const u = i / N;
      ctx.strokeStyle = `rgba(${u > 0.5 ? 255 : 123}, ${u > 0.5 ? 92 : 224}, ${u > 0.5 ? 122 : 137}, ${0.35 + u * 0.4})`;
    }
    ctx.stroke();
    // Redraw cleanly with gradient-less single color (previous loop overwrites style each iteration; simple final pass looks fine)
    comX /= cnt; comY /= cnt;

    // Center of mass marker
    const cmx = cx + comX * scale;
    const cmy = cy - comY * scale;
    ctx.strokeStyle = C.accent; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cmx, cmy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.accent;
    ctx.shadowColor = C.accent; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(cmx, cmy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Flip the label to the inside of the panel when the COM drifts near the
    // right/bottom edges so the text stays on-canvas.
    const lblRight = cmx > w * 0.7;
    const lblBottom = cmy < h * 0.15;
    CFG.label(ctx, 'center of mass',
      cmx + (lblRight ? -8 : 8),
      cmy + (lblBottom ? 14 : -10),
      C.accent, { size: 10, align: lblRight ? 'right' : 'left' });
  }

  function drawSpec(fVal) {
    const { ctx, w, h } = CFG.setupCanvas(cSpc);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const padL = 28, padR = 12, padT = 34, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    ctx.strokeStyle = C.grid;
    for (let i = 0; i <= 4; i++) {
      const x = x0 + i / 4 * (x1 - x0);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    CFG.label(ctx, 'f (Hz)', x1, y1 + 8, C.muted, { align: 'right', size: 10 });
    for (let i = 0; i <= 4; i++) {
      const x = x0 + i / 4 * (x1 - x0);
      CFG.label(ctx, String(i), x, y1 + 8, C.muted, { size: 10, align: 'center' });
    }

    const maxF = Math.max(0.001, ...spec.F);
    // During sweep, only draw spectrum up to current fVal (synced with rotation).
    // Also clears immediately on sweep start since fVal = 0 → lastIdx = 0.
    const lastIdx = sweep
      ? Math.max(0, Math.min(spec.F.length - 1, Math.round(fVal / spec.fMax * (spec.F.length - 1))))
      : spec.F.length - 1;
    // Only draw the curve if we actually have more than one sample
    if (lastIdx >= 1) {
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i <= lastIdx; i++) {
        const f = i / (spec.F.length - 1) * spec.fMax;
        const px = x0 + f / spec.fMax * (x1 - x0);
        const py = y1 - spec.F[i] / maxF * (y1 - y0);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // fill under curve subtly (only up to current index)
      const lastX = x0 + (lastIdx / (spec.F.length - 1)) * (x1 - x0);
      ctx.lineTo(lastX, y1); ctx.lineTo(x0, y1); ctx.closePath();
      ctx.fillStyle = 'rgba(255,207,92,0.12)'; ctx.fill();
    }

    // current f cursor
    const cx = x0 + fVal / spec.fMax * (x1 - x0);
    ctx.strokeStyle = C.time; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
    ctx.setLineDash([]);
    // magnitude at f
    // sample F(f) by linear interp on spec array
    const idx = fVal / spec.fMax * (spec.F.length - 1);
    const lo = Math.floor(idx), hi = Math.min(spec.F.length - 1, lo + 1);
    const tI = idx - lo;
    const magg = spec.F[lo] * (1 - tI) + spec.F[hi] * tI;
    const py = y1 - magg / maxF * (y1 - y0);
    ctx.fillStyle = C.time;
    ctx.shadowColor = C.time; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Position the readout near the cursor dot, flipping below if too close
    // to the top, and flipping left if too close to the right edge.
    const labelY = py - 14 > y0 + 10 ? py - 14 : Math.min(y1 - 16, py + 14);
    const flipLeft = cx > (x0 + x1) / 2;
    const labelX = cx + (flipLeft ? -8 : 8);
    CFG.label(ctx, `|F(${fVal.toFixed(2)})| = ${magg.toFixed(2)}`, labelX, labelY, C.time, { size: 10, align: flipLeft ? 'right' : 'left' });
  }

  function drawAll(fOverride) {
    refreshSpec();
    // During a sweep we pass the high-precision sweepF directly, so the
    // wound spiral and spectrum cursor render at the exact frequency — the
    // snapped peak position is otherwise lost to the slider's toFixed(3).
    const f = (typeof fOverride === 'number') ? fOverride : parseFloat(fEl.value);
    fO.textContent = f.toFixed(2);
    sub.textContent = `f = ${f.toFixed(2)} Hz`;
    drawSig();
    drawWound(f);
    drawSpec(f);
  }

  fEl.addEventListener('input', () => {
    if (!sweep) {
      sweepF = parseFloat(fEl.value);
      drawAll();
    }
  });

  // ── Sweep smoothing — three user-tunable knobs ──────────────────────────
  const NORMAL_SPEED = 0.25;   // Hz/sec — cruise rate away from peaks
  const SLOW_MULT = 0.5;       // fraction of speed subtracted at the peak (0=never slow, 1=stop)
  const HOLD_SECONDS = 1.0;    // duration of the pause at each exact peak

  const DC_CUT = 0.25;         // Hz — exclude the DC lump from peak detection

  function smoothstep(u) { const x = CFG.clamp(u, 0, 1); return x * x * (3 - 2 * x); }

  function peakFrac(f) {
    if (f < DC_CUT) return 0;
    const idx = f / spec.fMax * (spec.F.length - 1);
    const lo = Math.floor(idx), hi = Math.min(spec.F.length - 1, lo + 1);
    const tI = idx - lo;
    const mag = spec.F[lo] * (1 - tI) + spec.F[hi] * tI;
    const dcCutIdx = Math.ceil(DC_CUT / spec.fMax * (spec.F.length - 1));
    let maxMag = 0;
    for (let i = dcCutIdx; i < spec.F.length; i++) if (spec.F[i] > maxMag) maxMag = spec.F[i];
    return maxMag > 1e-6 ? Math.min(1, mag / maxMag) : 0;
  }

  // Slowdown shape: zero below peak=0.5, smoothly rises to 1 as peak → 1.
  function slowFactor(peak) {
    return smoothstep((peak - 0.5) * 2);
  }

  // Exact peak frequencies — we know these analytically for each signal, so
  // we use them directly. (Parabolic fits on the Riemann-summed spectrum
  // pick up DC-leakage bias that shifts the estimate a few millihertz above
  // the true peak.)
  let peakList = [];
  let nextPeakIdx = 0;
  function expectedPeaks() {
    switch (signalKind) {
      case 'tone1':  return [1.0];
      case 'chord':  return [1.0, 2.0];
      case 'square': return [1.0, 3.0];  // fundamental + 3rd harmonic (5th is too weak to hold)
      default:       return [];
    }
  }
  function rebuildPeaks() {
    peakList = expectedPeaks().filter(f => f > DC_CUT && f < spec.fMax);
    nextPeakIdx = 0;
    while (nextPeakIdx < peakList.length && peakList[nextPeakIdx] < sweepF) nextPeakIdx++;
  }

  function sweepRate(f, dt) {
    // Holding: f frozen at the exact peak, timer counts to HOLD_SECONDS.
    if (sweepState.holding) {
      sweepState.holdT += dt;
      if (sweepState.holdT >= HOLD_SECONDS) {
        sweepState.holding = false;
        nextPeakIdx++;              // move past this peak, never re-trigger it
      }
      return 0;
    }

    // If we've reached (or crossed) the next detected peak frequency, snap
    // sweepF exactly to it and start the hold.
    if (nextPeakIdx < peakList.length && f >= peakList[nextPeakIdx]) {
      sweepF = peakList[nextPeakIdx];
      sweepState.holding = true;
      sweepState.holdT = 0;
      return 0;
    }

    // Otherwise cruise, with a smooth deceleration as we approach a peak.
    const peak = peakFrac(f);
    return NORMAL_SPEED * (1 - SLOW_MULT * slowFactor(peak));
  }

  // Track f internally at full float precision. Writing fEl.value with
  // toFixed(3) loses sub-millihertz increments, which stalls the sweep near
  // peaks where rate*dt can be smaller than the quantization step.
  let sweepF = 0;
  function loop(dt) {
    if (!sweep) return;
    const d = dt || 0.016;
    const rate = sweepRate(sweepF, d);
    sweepF += rate * d;
    if (sweepF >= 4) {
      sweepF = 4;
      sweep = false;
      sweepBtn.textContent = 'sweep f';
    }
    fEl.value = sweepF.toFixed(3);
    drawAll(sweepF);
  }
  let _lastT = 0;
  CFG.registerLoop(cWnd, (t) => {
    const d = t - _lastT; _lastT = t;
    loop(d > 0 && d < 1 ? d : 0.016);
  });
  window.addEventListener('theme-change', drawAll);
  window.addEventListener('resize', drawAll);
  drawAll();
})();
