// Scene 2c — the s-plane as a grid of exponentials e^{st}.
//   Left panel : 8×8 grid; each tile plots Re{e^{st}} = e^{σ t} cos(ω t)
//                for the s at that tile's centre.
//   Right panel: full complex trajectory of e^{st} for the currently
//                selected tile. A shared playhead ties the two together.
(function () {
  const gridCanvas   = document.getElementById('splaneGridCanvas');
  const detailCanvas = document.getElementById('splaneDetailCanvas');
  const detailSub    = document.getElementById('splaneDetailSub');
  if (!gridCanvas || !detailCanvas) return;

  const N = 9;                 // 9×9 grid · 4 tiles per quadrant + an axis row/column at σ=0 and ω=0
  const SIGMA_MAX = 0.5;
  const OMEGA_MAX = 3.0;
  const T_WINDOW  = 5.0;       // seconds shown in each grid tile
  const DETAIL_T  = 30.0;      // seconds shown in the RHS spiral (large t)
  const LOOP_SEC  = 5.0;
  const SAMPLES   = 96;
  const DETAIL_SAMPLES = 1600; // spiral resolution in the detail panel

  // Default selection: stable & oscillating so the spiral looks interesting.
  let selected = { i: 2, j: 2 };

  function sigmaOf(i) { return ((i + 0.5) / N * 2 - 1) * SIGMA_MAX; }
  function omegaOf(j) { return -((j + 0.5) / N * 2 - 1) * OMEGA_MAX; } // +ω up

  // Blend the "real" (σ) and "imag" (ω) palette colours by the relative
  // magnitude of each component at a given s. Pure real axis → real colour,
  // pure imaginary axis → imag colour, in between a gradient mix.
  function hexToRgb(hex) {
    if (!hex || hex[0] !== '#') return { r: 200, g: 200, b: 210 };
    const m = hex.length === 4
      ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
      : hex;
    const n = parseInt(m.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function mixRealImag(sigma, omega, C) {
    const sNorm = Math.abs(sigma) / SIGMA_MAX;
    const oNorm = Math.abs(omega) / OMEGA_MAX;
    const total = sNorm + oNorm;
    if (total < 1e-6) return C.muted;
    const real = hexToRgb(C.real);
    const imag = hexToRgb(C.imag);
    const sf = sNorm / total;
    const of = oNorm / total;
    const r = Math.round(real.r * sf + imag.r * of);
    const g = Math.round(real.g * sf + imag.g * of);
    const b = Math.round(real.b * sf + imag.b * of);
    return `rgb(${r},${g},${b})`;
  }

  function gridLayout() {
    const rect = gridCanvas.getBoundingClientRect();
    const padL = 44, padR = 14, padT = 30, padB = 34;
    const plotX0 = padL, plotY0 = padT;
    const plotX1 = rect.width - padR, plotY1 = rect.height - padB;
    return {
      w: rect.width, h: rect.height,
      plotX0, plotY0, plotX1, plotY1,
      pw: plotX1 - plotX0, ph: plotY1 - plotY0,
      cellW: (plotX1 - plotX0) / N,
      cellH: (plotY1 - plotY0) / N,
    };
  }

  // --- click to select a tile ---------------------------------------------
  gridCanvas.addEventListener('mousedown', (e) => {
    const rect = gridCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const L = gridLayout();
    if (x < L.plotX0 || x > L.plotX1 || y < L.plotY0 || y > L.plotY1) return;
    const i = Math.min(N - 1, Math.max(0, Math.floor((x - L.plotX0) / L.cellW)));
    const j = Math.min(N - 1, Math.max(0, Math.floor((y - L.plotY0) / L.cellH)));
    selected = { i, j };
  });
  gridCanvas.style.cursor = 'crosshair';

  // --- grid panel ---------------------------------------------------------
  function drawGrid(tAnim) {
    const { ctx, w, h } = CFG.setupCanvas(gridCanvas);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const L = gridLayout();
    const { plotX0, plotY0, plotX1, plotY1, pw, ph, cellW, cellH } = L;
    const cx = plotX0 + pw / 2;  // σ = 0
    const cy = plotY0 + ph / 2;  // ω = 0

    // (half-plane shading intentionally omitted — the tile colours now
    //  encode the real/imag blend, so shading would fight with them.)

    // Cell gridlines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let k = 0; k <= N; k++) {
      const x = plotX0 + k * cellW;
      ctx.beginPath(); ctx.moveTo(x + 0.5, plotY0); ctx.lineTo(x + 0.5, plotY1); ctx.stroke();
      const y = plotY0 + k * cellH;
      ctx.beginPath(); ctx.moveTo(plotX0, y + 0.5); ctx.lineTo(plotX1, y + 0.5); ctx.stroke();
    }

    // Shared playhead fraction
    const u = (tAnim % LOOP_SEC) / LOOP_SEC;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const sigma = sigmaOf(i);
        const omega = omegaOf(j);
        const x0 = plotX0 + i * cellW;
        const y0 = plotY0 + j * cellH;
        const mx = 4, my = 5;
        const cw = cellW - 2 * mx;
        const ch = cellH - 2 * my;
        const ccx = x0 + mx;
        const ccy = y0 + my;

        // Envelope peak of |e^{σt}| over the window
        const envMax = Math.max(1, Math.exp(sigma * T_WINDOW));
        const scale = (ch / 2 - 2) / envMax;

        // Colour: smooth real/imag blend — blue on the real axis, pink/red
        // on the imaginary axis, mixed hues in between.
        const color = mixRealImag(sigma, omega, C);

        // Zero line
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ccx, ccy + ch / 2);
        ctx.lineTo(ccx + cw, ccy + ch / 2);
        ctx.stroke();

        // Envelope ±e^{σt}, faint dashed
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        for (const sign of [-1, 1]) {
          ctx.beginPath();
          for (let k = 0; k <= 24; k++) {
            const uu = k / 24;
            const t = uu * T_WINDOW;
            const e = Math.exp(sigma * t);
            const px = ccx + uu * cw;
            const py = ccy + ch / 2 + sign * e * scale;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // Signal Re{e^{st}} = e^{σt} cos(ω t)
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let k = 0; k <= SAMPLES; k++) {
          const uu = k / SAMPLES;
          const t = uu * T_WINDOW;
          const v = Math.exp(sigma * t) * Math.cos(omega * t);
          const px = ccx + uu * cw;
          let py = ccy + ch / 2 - v * scale;
          if (py < ccy) py = ccy;
          if (py > ccy + ch) py = ccy + ch;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Shared playhead dot
        const tNow = u * T_WINDOW;
        const vNow = Math.exp(sigma * tNow) * Math.cos(omega * tNow);
        const phx = ccx + u * cw;
        let phy = ccy + ch / 2 - vNow * scale;
        if (phy < ccy) phy = ccy;
        if (phy > ccy + ch) phy = ccy + ch;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(phx, phy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Selected-cell highlight
    const sx = plotX0 + selected.i * cellW;
    const sy = plotY0 + selected.j * cellH;
    ctx.save();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.accent;
    ctx.shadowBlur = 12;
    ctx.strokeRect(sx + 1, sy + 1, cellW - 2, cellH - 2);
    ctx.restore();

    // s-plane axes on top
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(plotX0, cy); ctx.lineTo(plotX1, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, plotY0); ctx.lineTo(cx, plotY1); ctx.stroke();

    CFG.label(ctx, 'σ (real)', plotX1 - 4, cy + 6, C.real, { size: 11, align: 'right' });
    CFG.label(ctx, 'jω (imag)', cx + 8, plotY0 + 4, C.imag, { size: 11 });
    CFG.label(ctx, 'σ<0 · decays', plotX0 + 8, plotY0 + 8, C.muted, { size: 10 });
    CFG.label(ctx, 'σ>0 · grows', plotX1 - 8, plotY0 + 8, C.muted, { size: 10, align: 'right' });
    CFG.label(ctx, 'σ = 0 · pure oscillation', cx + 8, plotY1 - 14, C.imag, { size: 10 });

    const clean = (v) => (Math.abs(v) < 1e-6 ? 0 : v);
    for (let i = 0; i < N; i++) {
      const s = clean(sigmaOf(i));
      const xt = plotX0 + (i + 0.5) * cellW;
      CFG.label(ctx, s.toFixed(2), xt, plotY1 + 6, C.muted, { size: 9, align: 'center' });
    }
    for (let j = 0; j < N; j++) {
      const o = clean(omegaOf(j));
      const yt = plotY0 + (j + 0.5) * cellH;
      CFG.label(ctx, (o >= 0 ? '+' : '') + o.toFixed(2), plotX0 - 6, yt - 5, C.muted, { size: 9, align: 'right' });
    }
  }

  // --- detail panel: complex trajectory of e^{st} ------------------------
  function drawDetail(tAnim) {
    const { ctx, w, h } = CFG.setupCanvas(detailCanvas);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const sigma = sigmaOf(selected.i);
    const omega = omegaOf(selected.j);
    if (detailSub) detailSub.textContent = '';

    const padL = 40, padR = 16, padT = 40, padB = 26;
    const px0 = padL, py0 = padT, px1 = w - padR, py1 = h - padB;
    const pw = px1 - px0, ph = py1 - py0;
    const cx = px0 + pw / 2;
    const cy = py0 + ph / 2;

    // Choose R so the full spiral fits. |e^{st}| ∈ [min, max] over [0, DETAIL_T].
    const rAt0 = 1;
    const rAtT = Math.exp(sigma * DETAIL_T);
    const rMax = Math.max(rAt0, rAtT);
    const R = Math.min(pw, ph) * 0.42 / Math.max(rMax, 1e-3);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      const gx = cx + k * R / 2;
      const gy = cy + k * R / 2;
      ctx.beginPath(); ctx.moveTo(gx, py0); ctx.lineTo(gx, py1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px0, gy); ctx.lineTo(px1, gy); ctx.stroke();
    }

    // Unit circle (Fourier kernel reference)
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = C.real; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(px0, cy); ctx.lineTo(px1, cy); ctx.stroke();
    ctx.strokeStyle = C.imag;
    ctx.beginPath(); ctx.moveTo(cx, py0); ctx.lineTo(cx, py1); ctx.stroke();
    CFG.label(ctx, 'Re', px1 - 4, cy + 6, C.real, { size: 11, align: 'right' });
    CFG.label(ctx, 'Im', cx + 8, py0 + 4, C.imag, { size: 11 });

    // Colour matching the grid tile (real/imag blend)
    const color = mixRealImag(sigma, omega, C);

    // Spiral: z(t) = e^{st} = e^{σ t} ( cos(ω t) + j sin(ω t) )
    // Alpha fades from start → end so direction of travel is obvious.
    ctx.lineWidth = 2;
    let prevX = null, prevY = null;
    for (let k = 0; k <= DETAIL_SAMPLES; k++) {
      const u = k / DETAIL_SAMPLES;
      const t = u * DETAIL_T;
      const r = Math.exp(sigma * t);
      const re = r * Math.cos(omega * t);
      const im = r * Math.sin(omega * t);
      const x = cx + re * R;
      const y = cy - im * R;
      if (prevX !== null) {
        const a = 0.25 + 0.75 * u;
        ctx.strokeStyle = withAlpha(color, a);
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      prevX = x; prevY = y;
    }

    // Start marker (t = 0) : always at +1 + 0j
    ctx.fillStyle = C.muted;
    ctx.beginPath(); ctx.arc(cx + R, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    CFG.label(ctx, 't = 0', cx + R + 6, cy - 14, C.muted, { size: 10 });

    // End marker (t = DETAIL_T)
    {
      const r = Math.exp(sigma * DETAIL_T);
      const re = r * Math.cos(omega * DETAIL_T);
      const im = r * Math.sin(omega * DETAIL_T);
      const x = cx + re * R;
      const y = cy - im * R;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      CFG.label(ctx, `t = ${DETAIL_T.toFixed(0)}`, x + 6, y - 14, color, { size: 10 });
    }

    // Playhead sweeps the full spiral over LOOP_SEC of wall time.
    const u = (tAnim % LOOP_SEC) / LOOP_SEC;
    const tNow = u * DETAIL_T;
    const r = Math.exp(sigma * tNow);
    const re = r * Math.cos(omega * tNow);
    const im = r * Math.sin(omega * tNow);
    const px = cx + re * R;
    const py = cy - im * R;
    ctx.strokeStyle = color; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Regime tag — top-right corner of the plot
    const tag = sigma < -0.02 ? 'decaying spiral' :
                sigma > 0.02 ? 'growing spiral' :
                (Math.abs(omega) < 0.01 ? 'constant · 1' : 'unit circle · Fourier kernel');
    CFG.label(ctx, tag, w - 14, 12, color, { size: 11, align: 'right' });
  }

  function withAlpha(color, a) {
    if (!color) return color;
    if (color[0] === '#' && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    const m = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(color);
    if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
    return color;
  }

  function drawBoth(tAnim) {
    drawGrid(tAnim);
    drawDetail(tAnim);
  }

  CFG.registerLoop(gridCanvas, drawBoth);
  window.addEventListener('theme-change', () => drawBoth(performance.now() / 1000));
  window.addEventListener('resize', () => drawBoth(performance.now() / 1000));
})();
