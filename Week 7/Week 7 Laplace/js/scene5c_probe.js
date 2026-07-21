// Scene 5c — Drag the complex point s around an s-plane decorated with the
// poles & zeros of a chosen H(s). Left panel draws vectors from each pole/zero
// to s (the geometric factors |s - p_j| and |s - z_i|). Right panel plots H(s)
// as a single complex number on a polar log-radius grid.
(function () {
  const cSP  = document.getElementById('probe_splane');
  const cOut = document.getElementById('probe_output');
  if (!cSP || !cOut) return;
  const subL = document.getElementById('probe_sub_left');
  const subR = document.getElementById('probe_sub_right');
  const seg  = document.getElementById('probeSeg');
  const btnSnapPole = document.getElementById('probeSnapPole');
  const btnSnapZero = document.getElementById('probeSnapZero');
  const btnSnapJw   = document.getElementById('probeSnapJw');

  // `num` and `den` are the numerator and denominator polynomials of H(s),
  // monic in `den`, in low → high order:
  //    den = [a_0, a_1, ..., 1]   meaning   D(s) = s^n + a_{n-1} s^{n-1} + … + a_0
  //    num = [b_0, b_1, ..., b_m] meaning   N(s) = b_m s^m + … + b_1 s + b_0
  // The system ODE is then
  //    y^(n) + a_{n-1} y^(n-1) + … + a_0 y = b_m x^(m) + … + b_0 x.
  // For an exponential input x(t) = e^{s t}, x^(k)(t) = s^k · e^{s t}, so the
  // forcing term collapses to N(s) · e^{s t}. We integrate that ODE on the
  // right panel using RK4 with zero initial conditions — which is what makes
  // the RHP example diverge and what makes the "zeros" example annihilate the
  // input when s sits exactly on a zero (because then N(s) = 0).
  const SYSTEMS = {
    onepole: {
      name: '1 pole · H(s) = 1 / (s + 1)',
      zeros: [],
      poles: [{ re: -1.0, im: 0 }],
      k: 1,
      num: [1],
      den: [1, 1],                  // s + 1
      sStart: { re: 0.0, im: 0.6 },
    },
    twopole: {
      name: '2 poles · H(s) = 1 / ((s + 0.3)² + 1²)',
      zeros: [],
      poles: [{ re: -0.3, im: 1.0 }, { re: -0.3, im: -1.0 }],
      k: 1,
      num: [1],
      den: [1.09, 0.6, 1],          // s² + 0.6 s + 1.09
      sStart: { re: 0.4, im: 0.6 },
    },
    rhp: {
      name: 'RHP poles · H(s) = 1 / ((s − 0.3)² + 1²) · unstable',
      zeros: [],
      poles: [{ re:  0.3, im: 1.0 }, { re:  0.3, im: -1.0 }],
      k: 1,
      num: [1],
      den: [1.09, -0.6, 1],         // s² − 0.6 s + 1.09
      sStart: { re: -0.4, im: 0.6 },
    },
    notch: {
      name: 'with zeros · H(s) = (s² + 1) / ((s + 0.3)² + 1²) · notch',
      zeros: [{ re: 0, im: 1.0 }, { re: 0, im: -1.0 }],
      poles: [{ re: -0.3, im: 1.0 }, { re: -0.3, im: -1.0 }],
      k: 1,
      num: [1, 0, 1],               // s² + 1   (vanishes at s = ±j)
      den: [1.09, 0.6, 1],          // (s + 0.3)² + 1
      sStart: { re: 0.4, im: 0.5 },
    },
  };

  let cur = 'onepole';
  const s = { re: SYSTEMS.onepole.sStart.re, im: SYSTEMS.onepole.sStart.im };
  let dragging = false;

  // ─── World ↔ pixel mapping for the s-plane panel ─────────────────────────
  const SPAN = 2.5;
  const STRIP_GAP = 14;
  const STRIP_H   = 56;
  const STRIP_PAD_B = 12;
  function mapSP() {
    const rect = cSP.getBoundingClientRect();
    const padL = 36, padR = 22, padT = 44;
    const padB = STRIP_GAP + STRIP_H + STRIP_PAD_B;
    const x0 = padL, x1 = rect.width - padR, y0 = padT, y1 = rect.height - padB;
    const bw = x1 - x0, bh = y1 - y0;
    return {
      x0, x1, y0, y1, bw, bh,
      xOf: re => x0 + (re + SPAN) / (2 * SPAN) * bw,
      yOf: im => y1 - (im + SPAN) / (2 * SPAN) * bh,
      reOf: px => (px - x0) / bw * 2 * SPAN - SPAN,
      imOf: py => (y1 - py) / bh * 2 * SPAN - SPAN,
    };
  }

  // ─── Evaluate H(s) ────────────────────────────────────────────────────────
  function cmul(ar, ai, br, bi) { return [ar * br - ai * bi, ar * bi + ai * br]; }
  function evalH(re, im) {
    const sys = SYSTEMS[cur];
    let nr = sys.k, ni = 0;
    for (const z of sys.zeros) {
      [nr, ni] = cmul(nr, ni, re - z.re, im - z.im);
    }
    let dr = 1, di = 0;
    for (const p of sys.poles) {
      [dr, di] = cmul(dr, di, re - p.re, im - p.im);
    }
    const dm = dr * dr + di * di;
    if (dm < 1e-20) return { re: Infinity, im: 0, mag: Infinity, phase: 0, exploded: true };
    // (nr + j ni) / (dr + j di) = (nr + j ni)(dr - j di) / dm
    const re_ = (nr * dr + ni * di) / dm;
    const im_ = (ni * dr - nr * di) / dm;
    return { re: re_, im: im_, mag: Math.hypot(re_, im_), phase: Math.atan2(im_, re_), exploded: false };
  }

  // ─── Drag interaction ────────────────────────────────────────────────────
  function pointerToS(e) {
    const rect = cSP.getBoundingClientRect();
    const M = mapSP();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    return {
      re: CFG.clamp(M.reOf(x), -SPAN, SPAN),
      im: CFG.clamp(M.imOf(y), -SPAN, SPAN),
    };
  }
  cSP.addEventListener('pointerdown', (e) => {
    const rect = cSP.getBoundingClientRect();
    const M = mapSP();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const sx = M.xOf(s.re), sy = M.yOf(s.im);
    if (Math.hypot(x - sx, y - sy) > 22) {
      const np = pointerToS(e);
      s.re = np.re; s.im = np.im;
    }
    dragging = true;
    cSP.setPointerCapture(e.pointerId);
    drawAll();
  });
  cSP.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const np = pointerToS(e);
    s.re = np.re; s.im = np.im;
    drawAll();
  });
  cSP.addEventListener('pointerup',     () => dragging = false);
  cSP.addEventListener('pointercancel', () => dragging = false);

  cSP.style.cursor = 'grab';

  // ─── Snap buttons — convenience for the "what happens AT a pole/zero" beat ─
  function nearestOf(arr) {
    let best = null, bestD = Infinity;
    for (const p of arr) {
      const d = Math.hypot(s.re - p.re, s.im - p.im);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
  if (btnSnapPole) btnSnapPole.addEventListener('click', () => {
    const sys = SYSTEMS[cur];
    if (!sys.poles.length) return;
    const p = nearestOf(sys.poles) || sys.poles[0];
    s.re = p.re; s.im = p.im; drawAll();
  });
  if (btnSnapZero) btnSnapZero.addEventListener('click', () => {
    const sys = SYSTEMS[cur];
    if (!sys.zeros.length) return;
    const z = nearestOf(sys.zeros) || sys.zeros[0];
    s.re = z.re; s.im = z.im; drawAll();
  });
  if (btnSnapJw) btnSnapJw.addEventListener('click', () => {
    s.re = 0; if (Math.abs(s.im) < 0.05) s.im = 1.0; drawAll();
  });

  // ─── Left panel: s-plane with poles, zeros, draggable s, vector overlays ──
  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const M = mapSP();
    const sys = SYSTEMS[cur];

    // LHP / RHP tint
    ctx.fillStyle = 'rgba(123,224,137,0.05)';
    ctx.fillRect(M.x0, M.y0, M.xOf(0) - M.x0, M.bh);
    ctx.fillStyle = 'rgba(255,92,122,0.04)';
    ctx.fillRect(M.xOf(0), M.y0, M.x1 - M.xOf(0), M.bh);

    // grid
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      const xv = M.xOf(k);
      ctx.beginPath(); ctx.moveTo(xv, M.y0); ctx.lineTo(xv, M.y1); ctx.stroke();
      const yv = M.yOf(k);
      ctx.beginPath(); ctx.moveTo(M.x0, yv); ctx.lineTo(M.x1, yv); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(M.x0, M.yOf(0)); ctx.lineTo(M.x1, M.yOf(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(M.xOf(0), M.y0); ctx.lineTo(M.xOf(0), M.y1); ctx.stroke();
    CFG.label(ctx, 'σ',  M.x1 + 4,        M.yOf(0) - 5, C.muted, { size: 11 });
    CFG.label(ctx, 'jω', M.xOf(0) + 6,    M.y0 - 12,    C.real,  { size: 11 });

    // Vectors from poles/zeros to s
    const sx = M.xOf(s.re), sy = M.yOf(s.im);

    function drawVec(fromX, fromY, color, width, dash) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.restore();
    }

    // Zero vectors (green): contributes to numerator → label distance
    for (const z of sys.zeros) {
      const d = Math.hypot(s.re - z.re, s.im - z.im);
      drawVec(M.xOf(z.re), M.yOf(z.im), C.time, 1.6, [4, 4]);
      // label at midpoint
      const mx = (M.xOf(z.re) + sx) / 2, my = (M.yOf(z.im) + sy) / 2;
      CFG.label(ctx, `|s−z|=${d.toFixed(2)}`, mx + 6, my - 6, C.time, { size: 9 });
    }
    // Pole vectors (pink)
    for (const p of sys.poles) {
      const d = Math.hypot(s.re - p.re, s.im - p.im);
      drawVec(M.xOf(p.re), M.yOf(p.im), C.imag, 1.6, [4, 4]);
      const mx = (M.xOf(p.re) + sx) / 2, my = (M.yOf(p.im) + sy) / 2;
      CFG.label(ctx, `|s−p|=${d.toFixed(2)}`, mx + 6, my + 4, C.imag, { size: 9 });
    }

    // Zeros (○)
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = C.time;
    for (const z of sys.zeros) {
      const px = M.xOf(z.re), py = M.yOf(z.im);
      ctx.shadowColor = C.time; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // Poles (×)
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = C.imag;
    for (const p of sys.poles) {
      const px = M.xOf(p.re), py = M.yOf(p.im);
      const r = 8;
      ctx.shadowColor = C.imag; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
      ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // s point — yellow filled with halo
    ctx.save();
    ctx.shadowColor = C.accent; ctx.shadowBlur = 14;
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,207,92,0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    CFG.label(ctx, `s = ${s.re.toFixed(2)} ${s.im >= 0 ? '+' : '−'} j${Math.abs(s.im).toFixed(2)}`,
      sx + 14, sy - 18, C.accent, { size: 11, weight: 600 });

    // Time-mode strip (Re e^{st}) below the s-plane — stability physics
    drawTimeModeStrip(ctx, M);

    if (subL) subL.textContent = sys.name;
  }

  // ─── Time-mode strip ──────────────────────────────────────────────────────
  // Plots Re(e^{st}) = e^{σt} cos(ωt) for a fixed time window. This is the
  // natural mode the system would ring with if s were one of its poles.
  //   σ < 0 → envelope decays        (stable mode)
  //   σ = 0 → pure sinusoid          (jω-axis — Fourier)
  //   σ > 0 → envelope grows         (unstable — RHP poles)
  function drawTimeModeStrip(ctx, M) {
    const C = CFG.colors();
    const sigma = s.re, omega = s.im;

    const x0 = M.x0;
    const x1 = M.x1;
    const y0 = M.y1 + STRIP_GAP;
    const y1 = y0 + STRIP_H;
    const w = x1 - x0, h = y1 - y0;
    const midY = y0 + h / 2;

    let col, statusText;
    if (sigma >  0.02) { col = C.imag;   statusText = 'unstable mode · grows without bound'; }
    else if (sigma < -0.02) { col = C.time; statusText = 'stable mode · decays to zero'; }
    else                    { col = C.accent; statusText = 'pure oscillation · s on jω-axis'; }

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    ctx.restore();

    CFG.label(ctx, 'Re(eˢᵗ) · natural mode at s',
      x0 + 8, y0 + 4, C.muted, { size: 10, baseline: 'top' });
    CFG.label(ctx, statusText,
      x1 - 8, y0 + 4, col, { size: 10, weight: 600, align: 'right', baseline: 'top' });

    const plotTop    = y0 + 20;
    const plotBot    = y1 - 6;
    const plotH      = plotBot - plotTop;
    const plotMid    = (plotTop + plotBot) / 2;
    const plotLeft   = x0 + 6;
    const plotRight  = x1 - 6;
    const plotW      = plotRight - plotLeft;
    const yHalf      = plotH / 2;

    // zero-of-time axis
    ctx.save();
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(plotLeft, plotMid); ctx.lineTo(plotRight, plotMid); ctx.stroke();
    ctx.restore();

    // t=0 tick + arrow-of-time
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.moveTo(plotLeft, plotTop); ctx.lineTo(plotLeft, plotBot); ctx.stroke();
    ctx.restore();
    CFG.label(ctx, 't = 0', plotLeft + 4, plotBot - 2, C.muted, { size: 9, baseline: 'bottom' });
    CFG.label(ctx, 't →',   plotRight - 2, plotBot - 2, C.muted, { size: 9, baseline: 'bottom', align: 'right' });

    const T_END = 14;
    const Y_CLIP = 3;                // clip at |Re e^{st}| = 3
    const N = 240;

    // Faint ±1 reference lines (amplitude of the initial oscillation)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(plotLeft,  plotMid - yHalf / Y_CLIP);
    ctx.lineTo(plotRight, plotMid - yHalf / Y_CLIP);
    ctx.moveTo(plotLeft,  plotMid + yHalf / Y_CLIP);
    ctx.lineTo(plotRight, plotMid + yHalf / Y_CLIP);
    ctx.stroke();
    ctx.restore();

    // ±e^{σt} envelope — dashed, tinted
    if (Math.abs(sigma) > 0.02) {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.30;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      for (const sign of [1, -1]) {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const t = (i / N) * T_END;
          const env = Math.exp(sigma * t);
          const px = plotLeft + (i / N) * plotW;
          let yN = sign * env / Y_CLIP;
          if (yN >  1) yN =  1;
          if (yN < -1) yN = -1;
          const py = plotMid - yN * yHalf;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Main trace Re(e^{st})
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = col;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    let clipped = false;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * T_END;
      const env = Math.exp(sigma * t);
      const val = env * Math.cos(omega * t);
      const px = plotLeft + (i / N) * plotW;
      let yN = val / Y_CLIP;
      if (yN >  1) { yN =  1; clipped = true; }
      if (yN < -1) { yN = -1; clipped = true; }
      const py = plotMid - yN * yHalf;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    if (clipped) {
      CFG.label(ctx, '▲ off-scale', plotLeft + 4, y0 + 18, col,
        { size: 9, baseline: 'top', weight: 600 });
    }
  }

  // ─── Right panel: H(s) itself as a single complex vector (fixed scale) ──
  // Polar plot with a fixed linear radius — outer labelled ring is at
  // |H| = SCALE_FULL. The drawing area extends a bit past the outer ring so
  // that as s slides toward a pole, the vector visibly grows past the labels
  // and out to the canvas edge before finally clipping. That growth IS the
  // "blow up" — what was hidden by the previous auto-rescale.
  const SCALE_FULL = 2;       // |H| value at the outer labelled ring
  const OVERSHOOT  = 1.6;     // how far past the outer ring the vector may go
  let _animTime = 0;

  function drawOutput() {
    const { ctx, w, h } = CFG.setupCanvas(cOut);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const padT = 56, padB = 38;
    const cx = w / 2;
    const cy = padT + (h - padT - padB) / 2;
    // R_grid is where the rings/labels live; R_clip is the outer drawing edge.
    const halfBox = Math.min(w, h - padT - padB) / 2;
    const R_clip = halfBox - 6;
    const R_grid = R_clip / OVERSHOOT;

    const sigma = s.re, omega = s.im;
    const H = evalH(sigma, omega);

    const PX = R_grid / SCALE_FULL;          // pixels per unit of |H|
    const drawAtInf  = !isFinite(H.mag) || H.mag * PX > R_clip;
    const drawAtZero = H.mag < 1e-9;
    const offScale   = drawAtInf;            // vector pinned at outer edge

    // ── Concentric grid rings at fractions of full-scale ─────────────────
    const fracs = [0.25, 0.5, 0.75, 1.0];
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (const f of fracs) {
      ctx.beginPath(); ctx.arc(cx, cy, R_grid * f, 0, Math.PI * 2); ctx.stroke();
    }
    // Off-scale boundary ring (where the vector finally clips)
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(255,92,122,0.30)';
    ctx.beginPath(); ctx.arc(cx, cy, R_clip, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // 30° angle spokes (phase reference)
    ctx.strokeStyle = C.grid;
    for (let a = 0; a < 360; a += 30) {
      const th = a * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(th) * R_clip, cy - Math.sin(th) * R_clip);
      ctx.stroke();
    }
    // Real / imag axes emphasised
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(cx - R_clip, cy); ctx.lineTo(cx + R_clip, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - R_clip); ctx.lineTo(cx, cy + R_clip); ctx.stroke();

    // Ring magnitude labels along the +Re axis
    for (const f of fracs) {
      const v = SCALE_FULL * f;
      CFG.label(ctx, formatMag(v), cx + R_grid * f + 3, cy - 11, C.muted, { size: 9 });
    }
    CFG.label(ctx, `|H| > ${formatMag(SCALE_FULL * OVERSHOOT)}  (off-scale)`,
      cx, cy - R_clip - 6, 'rgba(255,92,122,0.65)',
      { size: 9, align: 'center', baseline: 'bottom' });
    CFG.label(ctx, 'Re H', cx + R_clip + 4, cy + 4, C.muted, { size: 10 });
    CFG.label(ctx, 'Im H', cx + 4,         cy - R_clip - 14, C.muted, { size: 10 });

    // ── The vector H(s) ─────────────────────────────────────────────────
    let r = drawAtInf ? R_clip : Math.min(R_clip, H.mag * PX);
    let phase = H.phase;
    if (!isFinite(phase)) phase = 0;
    const tipX = cx + Math.cos(phase) * r;
    const tipY = cy - Math.sin(phase) * r;

    ctx.save();
    let vecColor;
    if      (offScale)   vecColor = C.imag;
    else if (drawAtZero) vecColor = C.time;
    else                 vecColor = C.accent;
    ctx.shadowColor = vecColor;
    ctx.shadowBlur  = offScale ? 22 : (drawAtZero ? 18 : 12);
    ctx.strokeStyle = vecColor;
    ctx.lineWidth   = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    if (r > 6) {
      const ah = 10, aw = 6;
      const ux = Math.cos(phase), uy = -Math.sin(phase);
      const px = -uy, py = ux;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - ux * ah + px * aw, tipY - uy * ah + py * aw);
      ctx.lineTo(tipX - ux * ah - px * aw, tipY - uy * ah - py * aw);
      ctx.closePath();
      ctx.fillStyle = vecColor;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = vecColor;
    ctx.beginPath(); ctx.arc(tipX, tipY, drawAtZero ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Origin dot
    ctx.fillStyle = C.muted;
    ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();

    // ── Bottom status text ───────────────────────────────────────────────
    const phaseDeg = phase * 180 / Math.PI;
    let stateText, stateColor;
    if (drawAtInf) {
      stateText = '|H(s)| → ∞   ·   s sits on a pole';
      stateColor = C.imag;
    } else if (drawAtZero) {
      stateText = '|H(s)| = 0   ·   s sits on a zero';
      stateColor = C.time;
    } else {
      stateText =
        `H(s) = ${formatMag(H.mag)} ∠ ${phaseDeg.toFixed(1)}°    ·    σ = ${sigma.toFixed(2)}    ω = ${omega.toFixed(2)}`;
      stateColor = C.accent;
    }
    CFG.label(ctx, stateText, w / 2, h - 14, stateColor,
      { size: 11, weight: 600, align: 'center', baseline: 'bottom' });

    if (subR) {
      const sys = SYSTEMS[cur];
      let nearest = { kind: null, d: Infinity };
      for (const p of sys.poles) {
        const d = Math.hypot(sigma - p.re, omega - p.im);
        if (d < nearest.d) nearest = { kind: 'pole', d };
      }
      for (const z of sys.zeros) {
        const d = Math.hypot(sigma - z.re, omega - z.im);
        if (d < nearest.d) nearest = { kind: 'zero', d };
      }
      if (drawAtInf || (nearest.d < 0.08 && nearest.kind === 'pole')) {
        subR.textContent = 'denominator → 0   ⇒   |H(s)| explodes';
      } else if (drawAtZero || (nearest.d < 0.08 && nearest.kind === 'zero')) {
        subR.textContent = 'numerator → 0   ⇒   |H(s)| vanishes';
      } else if (Math.abs(sigma) < 0.04) {
        subR.textContent = `s on jω axis · this is the Fourier response at ω = ${omega.toFixed(2)}`;
      } else {
        subR.textContent = 'product of vector lengths from the s-plane on the left';
      }
    }
  }

  // helpers ───────────────────────────────────────────────────────────────
  function formatMag(m) {
    if (!isFinite(m)) return '∞';
    if (m === 0)      return '0';
    if (m >= 100 || m < 0.01) return m.toExponential(2);
    return m.toFixed(2);
  }

  function drawAll(t) {
    if (typeof t === 'number') _animTime = t;
    drawSPlane();
    drawOutput(_animTime);
  }

  // ─── System switcher ─────────────────────────────────────────────────────
  if (seg) {
    seg.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        cur = b.dataset.v;
        const ss = SYSTEMS[cur].sStart;
        s.re = ss.re; s.im = ss.im;
        drawAll();
      });
    });
  }

  CFG.registerLoop(cSP, (t) => drawAll(t));
  window.addEventListener('theme-change', drawAll);
  window.addEventListener('resize', drawAll);
  drawAll();
})();
