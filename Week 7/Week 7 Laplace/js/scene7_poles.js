// Scene 7 — Drag pole around the s-plane, impulse response updates.
(function () {
  const cSP = document.getElementById('p_splane');
  const cT = document.getElementById('p_time');
  if (!cSP) return;
  const sub = document.getElementById('p_sub');

  // pole pair (pole + its conjugate)
  const pole = { sigma: -0.5, omega: 1.4 };
  let dragging = false;

  function toPix(cSP, sigma, omega) {
    const rect = cSP.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const sS = (rect.width - 40) / 3.5;
    const wS = (rect.height - 30) / 6;
    return { x: cx + sigma * sS, y: cy - omega * wS, sS, wS, cx, cy };
  }
  function fromPix(cSP, px, py) {
    const rect = cSP.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const sS = (rect.width - 40) / 3.5;
    const wS = (rect.height - 30) / 6;
    return { sigma: (px - cx) / sS, omega: -(py - cy) / wS };
  }

  cSP.addEventListener('pointerdown', (e) => {
    const rect = cSP.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const p = toPix(cSP, pole.sigma, pole.omega);
    const pConj = toPix(cSP, pole.sigma, -pole.omega);
    if (Math.hypot(x - p.x, y - p.y) < 18 || Math.hypot(x - pConj.x, y - pConj.y) < 18) {
      dragging = true;
      cSP.setPointerCapture(e.pointerId);
    }
  });
  cSP.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = cSP.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const s = fromPix(cSP, x, y);
    pole.sigma = CFG.clamp(s.sigma, -1.6, 1.2);
    pole.omega = Math.abs(CFG.clamp(s.omega, -2.8, 2.8));
    if (pole.omega < 0.1) pole.omega = 0.1;
    drawAll();
  });
  cSP.addEventListener('pointerup', () => dragging = false);
  cSP.addEventListener('pointercancel', () => dragging = false);

  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const cx = w / 2, cy = h / 2;
    const sS = (w - 40) / 3.5;
    const wS = (h - 30) / 6;

    // LHP shaded stable region
    ctx.fillStyle = 'rgba(88,166,255,0.06)';
    ctx.fillRect(6, 6, cx - 6, h - 12);
    ctx.fillStyle = 'rgba(255,92,122,0.05)';
    ctx.fillRect(cx, 6, w - cx - 6, h - 12);

    ctx.strokeStyle = C.grid;
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * sS / 2;
      ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, h - 6); ctx.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const y = cy + i * wS;
      ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(w - 6, y); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(6, cy); ctx.lineTo(w - 6, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 6); ctx.lineTo(cx, h - 6); ctx.stroke();
    CFG.label(ctx, 'LHP · stable', 14, h - 10, C.real, { size: 10 });
    CFG.label(ctx, 'RHP · unstable', w - 14, h - 10, C.imag, { align: 'right', size: 10 });

    // poles
    function pole_mark(x, y, live) {
      ctx.strokeStyle = live ? C.accent : C.imag;
      ctx.lineWidth = 2;
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r);
      ctx.stroke();
      if (live) {
        ctx.strokeStyle = 'rgba(255,207,92,0.35)';
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const p1 = { x: cx + pole.sigma * sS, y: cy - pole.omega * wS };
    const p2 = { x: cx + pole.sigma * sS, y: cy + pole.omega * wS };
    pole_mark(p1.x, p1.y, true);
    pole_mark(p2.x, p2.y, false);
    CFG.label(ctx, `s = ${pole.sigma.toFixed(2)} ± j${pole.omega.toFixed(2)}`, p1.x + 12, p1.y - 14, C.accent, { size: 10 });
    CFG.label(ctx, 'drag →', p1.x + 12, p1.y + 4, C.muted, { size: 10 });
  }

  function drawTime() {
    const { ctx, w, h } = CFG.setupCanvas(cT);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const padL = 24, padR = 12, padT = 34, padB = 24;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const mid = (y0 + y1) / 2;
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();

    const Tmax = 12;
    // find autoscale
    let maxV = 0;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400 * Tmax;
      const v = Math.exp(pole.sigma * t) * Math.cos(pole.omega * t);
      maxV = Math.max(maxV, Math.abs(v));
    }
    maxV = Math.max(1, Math.min(maxV, 20));
    ctx.strokeStyle = C.time; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 500; i++) {
      const u = i / 500, t = u * Tmax;
      const v = Math.exp(pole.sigma * t) * Math.cos(pole.omega * t) / maxV;
      const px = x0 + u * (x1 - x0);
      const py = CFG.clamp(mid - v * ((y1 - y0) / 2 - 6), y0 + 2, y1 - 2);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    let s = 'marginally stable · pure oscillation';
    if (pole.sigma < -0.02) s = 'stable · decaying';
    if (pole.sigma > 0.02) s = 'unstable · growing';
    if (pole.sigma < -0.02 && pole.omega < 0.5) s = 'heavily damped · fast settle';
    if (pole.sigma < -0.02 && Math.abs(pole.sigma) < 0.3 && pole.omega > 1.5) s = 'lightly damped · rings';
    sub.textContent = s;
  }

  function drawAll() { drawSPlane(); drawTime(); }
  CFG.registerLoop(cT, () => drawAll());
  window.addEventListener('theme-change', drawAll);
  window.addEventListener('resize', drawAll);
  drawAll();
})();
