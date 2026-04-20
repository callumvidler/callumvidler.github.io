// Scene 2 — Rotating phasor.
// cos(ωt) = real shadow: lives BELOW the plane, shares its vertical axis with Re.
//   Horizontal position of the trace = real shadow value, vertical position = time (flowing DOWN).
// sin(ωt) = imaginary shadow: lives to the RIGHT of the plane, shares its horizontal axis with Im.
//   Vertical position of the trace = imag shadow value, horizontal position = time (flowing RIGHT).
(function () {
  const canvas = document.getElementById('phasorCanvas');
  if (!canvas) return;
  const wEl = document.getElementById('phasorW');
  const aEl = document.getElementById('phasorA');
  const wO = document.getElementById('phasorWO');
  const aO = document.getElementById('phasorAO');

  function draw(tAnim) {
    const { ctx, w, h } = CFG.setupCanvas(canvas);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const omega = parseFloat(wEl.value);
    const A = parseFloat(aEl.value);
    wO.textContent = omega.toFixed(2);
    aO.textContent = A.toFixed(2);

    const stripW = 120;
    const margin = 14;
    const planeX0 = margin, planeY0 = margin;
    const planeX1 = w - stripW - margin;
    const planeY1 = h - stripW - margin;
    const pw = planeX1 - planeX0, ph = planeY1 - planeY0;
    const cx = planeX0 + pw * 0.5;
    const cy = planeY0 + ph * 0.5;
    // Scale down the radius so that even at A=max (typically 1.0 or more),
    // the phasor tip stays well inside the plane and the sin/cos traces
    // have more breathing room in their side strips.
    const R = Math.min(pw, ph) * 0.34;

    // --- Complex plane grid ---
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const gx = cx + i * R / 2, gy = cy + i * R / 2;
      ctx.beginPath(); ctx.moveTo(gx, planeY0); ctx.lineTo(gx, planeY1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(planeX0, gy); ctx.lineTo(planeX1, gy); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = C.real; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(planeX0, cy); ctx.lineTo(planeX1, cy); ctx.stroke();
    ctx.strokeStyle = C.imag;
    ctx.beginPath(); ctx.moveTo(cx, planeY0); ctx.lineTo(cx, planeY1); ctx.stroke();
    CFG.label(ctx, 'Re', planeX1 - 4, cy + 6, C.real, { align: 'right', size: 11 });
    CFG.label(ctx, 'Im', cx + 8, planeY0 + 4, C.imag, { size: 11 });

    // Phasor tip
    const phi = tAnim * omega;
    const reVal = A * Math.cos(phi); // real shadow value (unit: radius)
    const imVal = A * Math.sin(phi); // imag shadow value
    const px = cx + reVal * R;
    const py = cy - imVal * R;

    // fading orbit trail
    ctx.strokeStyle = 'rgba(255,207,92,0.18)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 80; k++) {
      const p = phi - k * 0.04;
      const tx = cx + A * R * Math.cos(p);
      const ty = cy - A * R * Math.sin(p);
      if (k === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    // drop lines to axes
    ctx.strokeStyle = C.real; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, cy); ctx.stroke();
    ctx.strokeStyle = C.imag;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, py); ctx.stroke();
    ctx.setLineDash([]);

    // shadow dots on axes
    ctx.fillStyle = C.real;
    ctx.beginPath(); ctx.arc(px, cy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.imag;
    ctx.beginPath(); ctx.arc(cx, py, 4.5, 0, Math.PI * 2); ctx.fill();

    // phasor arrow
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.shadowColor = C.accent; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    const Tspan = 6; // seconds of history shown

    // ===================================================================
    // BOTTOM STRIP: cos(ωt) = real shadow.
    // Horizontal axis matches the plane's Re axis (horizontal).
    // Time flows DOWN: t=0 at top (adjacent to Re axis), past times below.
    // ===================================================================
    const bottomTop = planeY1 + 8;
    const bottomBot = h - margin;
    const bottomH = bottomBot - bottomTop;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(planeX0, bottomTop, pw, bottomH);

    // vertical zero line (real = 0) aligns with cx
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(cx, bottomTop); ctx.lineTo(cx, bottomBot); ctx.stroke();

    // cos trace: for each u in [0..1], tPast = tAnim - u*Tspan,
    //   xx = cx + A*cos(tPast*omega)*R  (aligns with Re axis)
    //   yy = bottomTop + u*bottomH  (time flows down)
    ctx.strokeStyle = C.real; ctx.lineWidth = 1.8;
    ctx.beginPath();
    const Nb = 200;
    for (let i = 0; i <= Nb; i++) {
      const u = i / Nb;
      const tPast = tAnim - u * Tspan;
      const v = A * Math.cos(tPast * omega);
      const xx = cx + v * R;
      const yy = bottomTop + u * (bottomH - 4) + 2;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    // link: the leading edge of the trace sits directly below the real shadow
    ctx.strokeStyle = C.real; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, bottomTop + 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.real;
    ctx.shadowColor = C.real; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px, bottomTop + 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    CFG.label(ctx, 'cos(ωt) = Re{e^{jωt}}', planeX0 + 6, bottomTop + 4, C.real, { size: 10 });
    CFG.label(ctx, 'time ↓', planeX1 - 6, bottomBot - 4, C.muted, { size: 9, align: 'right' });

    // ===================================================================
    // RIGHT STRIP: sin(ωt) = imaginary shadow.
    // Vertical axis matches the plane's Im axis (vertical).
    // Time flows RIGHT: t=0 at left (adjacent to Im axis), past times to the right.
    // ===================================================================
    const rightLeft = planeX1 + 8;
    const rightRight = w - margin;
    const rightW = rightRight - rightLeft;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(rightLeft, planeY0, rightW, ph);

    // horizontal zero line aligns with cy (imag = 0)
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(rightLeft, cy); ctx.lineTo(rightRight, cy); ctx.stroke();

    // sin trace: for each u in [0..1], tPast = tAnim - u*Tspan,
    //   yy = cy - A*sin(tPast*omega)*R  (aligns with Im axis, up = positive)
    //   xx = rightLeft + u*rightW (time flows right)
    ctx.strokeStyle = C.imag; ctx.lineWidth = 1.8;
    ctx.beginPath();
    const Nr = 200;
    for (let i = 0; i <= Nr; i++) {
      const u = i / Nr;
      const tPast = tAnim - u * Tspan;
      const v = A * Math.sin(tPast * omega);
      const yy = cy - v * R;
      const xx = rightLeft + u * (rightW - 4) + 2;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    // link: leading edge of sin trace sits directly to the right of the imag shadow
    ctx.strokeStyle = C.imag; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(rightLeft + 2, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.imag;
    ctx.shadowColor = C.imag; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(rightLeft + 2, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    CFG.label(ctx, 'sin(ωt) = Im{e^{jωt}}', rightLeft + 6, planeY0 + 4, C.imag, { size: 10 });
    CFG.label(ctx, 'time →', rightRight - 6, planeY1 - 4, C.muted, { size: 9, align: 'right' });
  }

  CFG.registerLoop(canvas, draw);
  [wEl, aEl].forEach(el => el.addEventListener('input', () => draw(performance.now() / 1000)));
  window.addEventListener('theme-change', () => draw(performance.now() / 1000));
  window.addEventListener('resize', () => draw(performance.now() / 1000));
})();
