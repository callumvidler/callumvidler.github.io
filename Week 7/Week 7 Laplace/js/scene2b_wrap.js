// Scene 2b — Wrap intro. Four-stage continuous morph that builds up the
// "wind the signal around the complex plane" gesture:
//
//   stage 0 : signal g(t) drawn on a straight time axis (time domain)
//   stage 1 : the complex exponential e^{-j2πft} shown as a UNIT CIRCLE
//             (the straight signal is ghosted on the left for reference)
//   stage 2 : multiply by g(t0) for a FIXED slice of time — the unit circle
//             scales in/out as we scrub t0. The radius IS g(t0).
//   stage 3 : let t sweep. Radius breathes with g(t), angle advances with
//             the exponential. The trace is the wound signal.
//
// u ∈ [0,3] is the continuously-animated parameter; user can jump stages
// via buttons or play the full sequence.

(function () {
  const cvs = document.getElementById('wrapCanvas');
  if (!cvs) return;

  const fEl = document.getElementById('wrapF');
  const fO = document.getElementById('wrapFO');
  const stageBtns = document.querySelectorAll('#wrapStage button');
  const playBtn = document.getElementById('wrapPlay');
  const resetBtn = document.getElementById('wrapReset');
  const sub = document.getElementById('wrapSub');

  let target = 0;
  let u = 0;
  let playing = false;
  let playT0 = 0;
  let drawProgress = 1;   // pen progress during stage 0
  let circleProgress = 1; // unit-circle trace-in during stage 1
  let t0Scrub = 0;        // which sample of g(t) we're currently "picking" for stage 2
  let wrapProgress = 0;   // how much of the wound path has been laid down in stage 3
  // Stage-3 "auto-play" on entry: reset the plane, ghost-copy the signal, then trace.
  let s3Anim = false;     // is the stage-3 entry animation running?
  let s3Start = 0;        // timestamp when stage-3 entry anim began

  function gOf(t) {
    // Simple constant-amplitude cosine, shifted to stay strictly positive.
    // Keeps the "radius = g(t)" picture clean.
    return 1 + 0.7 * Math.cos(2 * Math.PI * 1 * t);
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function setStage(n) {
    target = n;
    stageBtns.forEach(b => b.classList.toggle('on', +b.dataset.v === n));
    // Highlight the relevant parts of the Fourier equation bar.
    const eq = document.getElementById('wrapEq');
    if (eq) {
      eq.querySelectorAll('.eq-piece').forEach(p => p.classList.remove('hl'));
      // stage 0: g(t) ; stage 1: exp ; stage 2: g(t) · exp ; stage 3: everything
      if (n === 0) eq.querySelector('.e-g').classList.add('hl');
      else if (n === 1) eq.querySelector('.e-exp').classList.add('hl');
      else if (n === 2) {
        eq.querySelector('.e-g').classList.add('hl');
        eq.querySelector('.e-dot').classList.add('hl');
        eq.querySelector('.e-exp').classList.add('hl');
      } else {
        eq.querySelectorAll('.eq-piece').forEach(p => p.classList.add('hl'));
      }
    }
  }
  stageBtns.forEach(b => b.addEventListener('click', () => {
    playing = false;
    playBtn.textContent = 'play sequence';
    const n = +b.dataset.v;
    drawProgress = 1;
    circleProgress = 1;
    if (n === 2) t0Scrub = 0;
    if (n === 3) {
      // Kick off a fresh "copy the signal → wrap it" animation.
      wrapProgress = 0;
      s3Anim = true;
      s3Start = performance.now();
    } else {
      s3Anim = false;
      wrapProgress = 0;
    }
    setStage(n);
  }));

  playBtn.addEventListener('click', () => {
    playing = !playing;
    if (playing) {
      playBtn.textContent = 'pause';
      playT0 = performance.now();
      u = 0; target = 0;
      drawProgress = 0; circleProgress = 0; wrapProgress = 0; t0Scrub = 0;
      setStage(0);
    } else {
      playBtn.textContent = 'play sequence';
    }
  });

  resetBtn.addEventListener('click', () => {
    playing = false;
    playBtn.textContent = 'play sequence';
    u = 0; drawProgress = 0; circleProgress = 0; wrapProgress = 0; t0Scrub = 0;
    setStage(0);
  });

  fEl.addEventListener('input', () => { fO.textContent = parseFloat(fEl.value).toFixed(2); });

  const Tmax = 6;
  const N = 360;

  // hex → rgb for color interpolation
  function hexToRgb(hex) {
    if (!hex || !hex.startsWith('#')) return null;
    let m = hex.trim();
    if (m.length === 4) m = '#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3];
    const n = parseInt(m.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function interpColor(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    if (!A || !B) return a;
    const r = Math.round(A.r + (B.r - A.r) * t);
    const g = Math.round(A.g + (B.g - A.g) * t);
    const bl = Math.round(A.b + (B.b - A.b) * t);
    return `rgb(${r},${g},${bl})`;
  }

  function draw() {
    const { ctx, w, h } = CFG.setupCanvas(cvs);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const padT = 40, padB = 30;
    const leftX0 = 44;
    const leftX1 = Math.min(w * 0.42, w - 320);
    const leftMid = (padT + (h - padB)) / 2;
    const leftAmp = Math.min(60, (h - padT - padB) / 3);

    const rightCx = (leftX1 + w - 24) / 2;
    const rightCy = (padT + (h - padB)) / 2;
    const R = Math.min((w - leftX1) / 2 - 30, (h - padT - padB) / 2 - 18);
    const Runit = R * 0.62; // unit circle radius in screen pixels

    const fVal = parseFloat(fEl.value);

    // Per-stage weights (eased). uk = how much of stage k is "on".
    const u0 = clamp01(1 - u);                   // 1 → 0 as we leave stage 0
    const u1 = clamp01(u) - clamp01(u - 1);      // tent: peaks at u=1
    const u2 = clamp01(u - 1) - clamp01(u - 2);  // tent: peaks at u=2
    const u3 = clamp01(u - 2);                   // 0 → 1 entering stage 3
    // We also use monotone "has-entered-stage-k" values for cumulative visuals
    const entered1 = clamp01(u);      // faded in circle
    const entered2 = clamp01(u - 1);  // started scaling
    const entered3 = clamp01(u - 2);  // started wrapping

    // ============ LEFT: straight time-domain signal ============
    // Baseline at the bottom since g(t) is strictly positive now.
    const leftBase = h - padB - 8;
    const leftTop = padT + 14;
    const leftScale = (leftBase - leftTop) / 2.4; // g peaks around 1.7, leave generous headroom
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(leftX0, leftBase); ctx.lineTo(leftX1, leftBase); ctx.stroke();

    ctx.fillStyle = C.muted;
    ctx.font = "10px 'JetBrains Mono', monospace";
    for (let k = 0; k <= 6; k++) {
      const px = leftX0 + (k / Tmax) * (leftX1 - leftX0);
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(px, leftBase - 3); ctx.lineTo(px, leftBase + 3); ctx.stroke();
      ctx.fillText(String(k), px - 3, leftBase + 14);
    }
    CFG.label(ctx, 't →', leftX1 + 4, leftBase - 5, C.muted, { size: 10 });
    CFG.label(ctx, 'g(t)', leftX0 - 4, leftTop - 6, C.muted, { size: 10, align: 'right' });

    // The signal itself (traces in during stage 0, then stays)
    const drawN = Math.max(2, Math.floor(N * drawProgress));
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.time;
    ctx.beginPath();
    for (let i = 0; i <= drawN; i++) {
      const tt = (i / N) * Tmax;
      const v = gOf(tt);
      const px = leftX0 + (tt / Tmax) * (leftX1 - leftX0);
      const py = leftBase - v * leftScale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Pen marker during stage 0
    if (drawProgress < 1) {
      const tt = drawProgress * Tmax;
      const v = gOf(tt);
      const px = leftX0 + (tt / Tmax) * (leftX1 - leftX0);
      const py = leftBase - v * leftScale;
      ctx.fillStyle = C.accent;
      ctx.shadowColor = C.accent; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // In stage 2 we highlight a specific "slice" t0 on the left axis.
    // t0 is the current sample whose g(t0) is scaling the circle on the right.
    if (entered2 > 0.01) {
      const tSlice = t0Scrub * Tmax;
      const v = gOf(tSlice);
      const px = leftX0 + (tSlice / Tmax) * (leftX1 - leftX0);
      const py = leftBase - v * leftScale;
      // vertical guide
      ctx.strokeStyle = `rgba(255,207,92,${0.25 + 0.4 * u2})`;
      ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, padT + 4); ctx.lineTo(px, h - padB - 4); ctx.stroke();
      ctx.setLineDash([]);
      // dot at (t0, g(t0))
      ctx.fillStyle = C.accent;
      ctx.shadowColor = C.accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      CFG.label(ctx, `t₀=${tSlice.toFixed(2)}`, px + 6, py - 14, C.accent, { size: 10 });
      CFG.label(ctx, `g(t₀)=${v.toFixed(2)}`, px + 6, py + 4, C.accent, { size: 10 });
    }

    // ============ RIGHT: complex plane ============
    // Grid, axes, unit-circle reference
    const discAlpha = clamp01(u);
    ctx.save();
    ctx.globalAlpha = discAlpha;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath(); ctx.arc(rightCx, rightCy, (r / 3) * R, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(rightCx - R - 12, rightCy); ctx.lineTo(rightCx + R + 12, rightCy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightCx, rightCy - R - 12); ctx.lineTo(rightCx, rightCy + R + 12); ctx.stroke();
    CFG.label(ctx, 'Re', rightCx + R + 14, rightCy - 6, C.muted, { size: 10 });
    CFG.label(ctx, 'Im', rightCx + 6, rightCy - R - 14, C.muted, { size: 10 });

    // reference unit circle (faint, only visible from stage 1 onward)
    ctx.strokeStyle = `rgba(255,255,255,${0.18 * entered1})`;
    ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(rightCx, rightCy, Runit, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ---- Stage 1: the unit circle being traced out by e^{-j2πft} ----
    // We trace one full turn. The running dot shows "now".
    if (entered1 > 0.01 && u < 1.9) {
      const traceAlpha = Math.min(1, entered1 * 1.2) * (1 - Math.max(0, u - 1.5)); // fade as stage 2 kicks in
      ctx.save();
      ctx.globalAlpha = Math.max(0, traceAlpha);
      // traced arc
      const p = circleProgress;
      ctx.strokeStyle = C.real;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const arcN = 200;
      for (let i = 0; i <= arcN * p; i++) {
        const theta = -2 * Math.PI * (i / arcN);
        const px = rightCx + Runit * Math.cos(theta);
        const py = rightCy - Runit * Math.sin(theta);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // running point
      const theta = -2 * Math.PI * p;
      const px = rightCx + Runit * Math.cos(theta);
      const py = rightCy - Runit * Math.sin(theta);
      ctx.fillStyle = C.real;
      ctx.shadowColor = C.real; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // legend
      CFG.label(ctx, 'e^{-j2πft} · radius 1', rightCx, rightCy + R + 18, C.real, { size: 10, align: 'center' });
      ctx.restore();
    }

    // ---- Stage 2: scaled circle — radius = g(t0), with trail ----
    // As t₀ scrubs forward, the scaled point traces out what will become the
    // wound signal — we lay that down here too, so the viewer sees stage 2
    // naturally building into stage 3.
    if (entered2 > 0.01 && u < 2.95) {
      const alpha = Math.min(1, (entered2 * 1.1) * (1 - Math.max(0, u - 2.7)));
      const tSlice = t0Scrub * Tmax;
      const gVal = gOf(tSlice);
      const scale = gVal; // signed
      const rad = Math.abs(scale) * Runit;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);

      // Trail: the path traced by g(t) * e^{-j2πf t} for t in [0, t0Scrub].
      // This is exactly the wound signal-in-progress.
      const trailN = 240;
      const lastI = Math.max(1, Math.floor(trailN * t0Scrub));
      ctx.lineWidth = 2;
      let prevX = 0, prevY = 0;
      for (let i = 0; i <= lastI; i++) {
        const frac = (i / trailN);
        const tt = frac * Tmax;
        const v = gOf(tt);
        const th = -2 * Math.PI * fVal * tt;
        const px_ = rightCx + v * Runit * Math.cos(th);
        const py_ = rightCy - v * Runit * Math.sin(th);
        if (i === 0) { prevX = px_; prevY = py_; continue; }
        // fade the tail so the most recent stretch is brightest
        const ageFrac = i / Math.max(1, lastI); // 0..1 along the laid-down trail
        const col = interpColor(C.time, C.accent, ageFrac);
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY); ctx.lineTo(px_, py_);
        ctx.stroke();
        prevX = px_; prevY = py_;
      }

      // Scaled circle outline (the ghost of "where the point could be right now")
      ctx.strokeStyle = `rgba(255,207,92,0.55)`; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(rightCx, rightCy, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,207,92,0.05)`;
      ctx.beginPath(); ctx.arc(rightCx, rightCy, rad, 0, Math.PI * 2); ctx.fill();

      // Current point at angle -2πf*t0: g(t0) * e^{-j2πf t0}
      const theta = -2 * Math.PI * fVal * tSlice;
      const px = rightCx + scale * Runit * Math.cos(theta);
      const py = rightCy - scale * Runit * Math.sin(theta);
      // radial line from origin
      ctx.strokeStyle = `rgba(255,207,92,0.55)`;
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rightCx, rightCy); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.accent;
      ctx.shadowColor = C.accent; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      CFG.label(ctx, `radius = g(t₀) = ${gVal.toFixed(2)}`, rightCx, rightCy + R + 18, C.accent, { size: 10, align: 'center' });
      CFG.label(ctx, `point = g(t₀)·e^{-j2πf t₀}`, rightCx, rightCy + R + 34, C.muted, { size: 10, align: 'center' });
      ctx.restore();
    }

    // ---- Stage 3: copy the signal, then smoothly wrap it ----
    // Three-phase animation driven by s3Anim + s3Start:
    //   phase A (0..0.6s)  : disc empty / fade-in of the copied signal
    //   phase B (0.6..2.0s): straight signal copy morphs from the left panel
    //                        into a horizontal line inside the disc
    //   phase C (2.0..5.0s): that horizontal line smoothly wraps around the
    //                        origin (each point interpolates from its
    //                        straight position to its wound position)
    // After phase C: the full wound trace is shown, no moving head.
    if (entered3 > 0.005) {
      const alpha = Math.min(1, entered3 * 1.3);
      ctx.save();
      ctx.globalAlpha = alpha;

      // Derive copyAmt (0..1) and wrapAmt (0..1) from s3Anim timing, or
      // default to fully-wound if we arrived here some other way.
      let copyAmt = 1;
      let wrapAmt = 1;
      if (s3Anim) {
        const elap = (performance.now() - s3Start) / 1000;
        if (elap < 0.6) { copyAmt = 0; wrapAmt = 0; }
        else if (elap < 2.0) { copyAmt = ease((elap - 0.6) / 1.4); wrapAmt = 0; }
        else if (elap < 5.0) { copyAmt = 1; wrapAmt = ease((elap - 2.0) / 3.0); }
        else { copyAmt = 1; wrapAmt = 1; s3Anim = false; }
      }

      // Compact-in-disc coords for the straight-copied signal.
      // The horizontal line goes across the disc; height is g(t) with the DC
      // offset subtracted so it sits nicely around the center.
      const compactAmp = Runit * 0.38;
      const compactX0 = rightCx - Runit * 0.95;
      const compactX1 = rightCx + Runit * 0.95;

      ctx.lineWidth = 2;
      let prevX = 0, prevY = 0;
      for (let i = 0; i <= N; i++) {
        const frac = i / N;
        const tt = frac * Tmax;
        const v = gOf(tt);

        // straight-on-left
        const sx = leftX0 + frac * (leftX1 - leftX0);
        const sy = leftBase - v * leftScale;
        // straight-inside-disc
        const cxp = compactX0 + frac * (compactX1 - compactX0);
        const cyp = rightCy - (v - 1) * compactAmp;
        // fully wound
        const theta = -2 * Math.PI * fVal * tt;
        const wx = rightCx + v * Runit * Math.cos(theta);
        const wy = rightCy - v * Runit * Math.sin(theta);

        // first blend (copy): left-straight → in-disc-straight
        const mx = sx + (cxp - sx) * copyAmt;
        const my = sy + (cyp - sy) * copyAmt;
        // second blend (wrap): in-disc-straight → fully wound
        const fx = mx + (wx - mx) * wrapAmt;
        const fy = my + (wy - my) * wrapAmt;

        if (i === 0) { prevX = fx; prevY = fy; continue; }
        // gradient along the signal: green → accent
        const col = interpColor(C.time, C.accent, frac);
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY); ctx.lineTo(fx, fy);
        ctx.stroke();
        prevX = fx; prevY = fy;
      }

      CFG.label(ctx, `g(t)·e^{-j2πft} · f = ${fVal.toFixed(2)}`, rightCx, rightCy + R + 18, C.accent, { size: 10, align: 'center' });
      CFG.label(ctx, `total turns = f·T = ${(fVal * Tmax).toFixed(2)}`, rightCx, rightCy + R + 34, C.muted, { size: 10, align: 'center' });
      ctx.restore();
    }

    // Section headers
    ctx.save();
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = C.muted;
    ctx.textAlign = 'center';
    ctx.fillText('time domain', (leftX0 + leftX1) / 2, padT - 12);
    ctx.globalAlpha = clamp01(u);
    ctx.fillText('complex plane', rightCx, padT - 12);
    ctx.restore();

    // Stage caption
    let cap = '';
    if (u < 0.4) cap = 'stage 1 · the signal g(t) on a straight time axis';
    else if (u < 1.3) cap = 'stage 2 · e^{-j2πft} traces the unit circle';
    else if (u < 2.3) cap = 'stage 3 · multiplying by g(t₀) scales that circle';
    else cap = 'stage 4 · let t advance · the scaled circle becomes a wound trace';
    sub.textContent = cap;
  }

  // Animation loop
  let lastT = 0;
  CFG.registerLoop(cvs, (t) => {
    const dt = Math.min(0.05, Math.max(0, t - lastT));
    lastT = t;

    if (playing) {
      const elapsed = (performance.now() - playT0) / 1000;
      // Phase 1 (0..1.3s)   : draw signal. u=0.
      // Phase 2 (1.3..2.6s) : u 0→1, trace unit circle.
      // Phase 3 (2.6..9.6s) : u 1→2, SLOWLY scrub t0 across the signal,
      //                      laying down the wound trail as it goes.
      // Phase 4 (9.6..11.6s): u 2→3, finish the wound trace.
      // Phase 5 (11.6..12.8s): hold, then stop.
      if (elapsed < 1.3) {
        drawProgress = Math.min(1, elapsed / 1.3);
        u = 0; setStage(0);
      } else if (elapsed < 2.6) {
        drawProgress = 1;
        const p = (elapsed - 1.3) / 1.3;
        u = p; setStage(1);
        circleProgress = Math.min(1, p * 1.2);
      } else if (elapsed < 9.6) {
        drawProgress = 1; circleProgress = 1;
        const p = (elapsed - 2.6) / 7.0;
        u = 1 + p; setStage(2);
        t0Scrub = p;
      } else if (elapsed < 11.6) {
        drawProgress = 1; circleProgress = 1; t0Scrub = 1;
        const p = (elapsed - 9.6) / 2.0;
        u = 2 + p; setStage(3);
        wrapProgress = Math.min(1, p);
      } else if (elapsed < 12.8) {
        u = 3; wrapProgress = 1; setStage(3);
      } else {
        playing = false;
        playBtn.textContent = 'play sequence';
        u = 3; wrapProgress = 1; setStage(3);
      }
    } else {
      // chase target
      const speed = 2.8;
      const diff = target - u;
      if (Math.abs(diff) > 0.001) {
        u += diff * Math.min(1, dt * speed);
      }
      // When idle in stage 1, keep the point alive by advancing circleProgress fractionally.
      if (Math.abs(target - 1) < 0.01) {
        circleProgress += dt * 0.25;
        if (circleProgress > 1) circleProgress -= 1;
      }
      // When idle in stage 2, slowly scrub t0 forward (looping) so the trail
      // gets drawn out naturally. Much slower than before.
      if (Math.abs(target - 2) < 0.01) {
        t0Scrub += dt * 0.09;  // ~11s to complete a full pass
        if (t0Scrub > 1) t0Scrub = 0;
      }
      // Stage 3 animation is now driven entirely by s3Anim inside the draw
      // (phases: clear → copy → wrap). Nothing to do here.
      if (Math.abs(target - 3) < 0.01) {
        // no-op
      }
      if (Math.abs(target - 0) < 0.01) {
        drawProgress = 1;
      }
    }

    draw();
  });

  window.addEventListener('theme-change', draw);
  window.addEventListener('resize', draw);
  setStage(0);
  draw();
})();
