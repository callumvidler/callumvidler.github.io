// Scene 5 — Laplace: σ tames the signal. Signal + wound + s-plane with ROC.
(function () {
  const cSig = document.getElementById('l_sig');
  const cWnd = document.getElementById('l_wound');
  const cSP = document.getElementById('l_splane');
  if (!cSig) return;
  const sEl = document.getElementById('lapS');
  const wEl = document.getElementById('lapW');
  const aEl = document.getElementById('lapA');
  const sO = document.getElementById('lapSO');
  const wO = document.getElementById('lapWO');
  const aO = document.getElementById('lapAO');
  const matchBtn = document.getElementById('lapMatch');
  const sub = document.getElementById('l_sub');

  const w0 = 2 * Math.PI * 0.7;
  function signal(t, a) { return Math.exp(a * t) * Math.cos(w0 * t); }

  matchBtn.addEventListener('click', () => {
    sEl.value = (parseFloat(aEl.value) + 0.05).toFixed(3);
    drawAll();
  });

  function drawSig() {
    const { ctx, w, h } = CFG.setupCanvas(cSig);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const sigma = parseFloat(sEl.value);
    const a = parseFloat(aEl.value);
    const padL = 14, padR = 12, padT = 34, padB = 14;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const mid = (y0 + y1) / 2;
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();

    const Tmax = 8;
    // raw signal
    let maxV = 0;
    for (let i = 0; i <= 200; i++) maxV = Math.max(maxV, Math.abs(signal(i / 200 * Tmax, a)));
    maxV = Math.max(1, maxV);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const u = i / 300, t = u * Tmax;
      const v = signal(t, a) / maxV;
      const px = x0 + u * (x1 - x0);
      const py = mid - v * ((y1 - y0) / 2 - 6);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // tamed signal g(t) * e^{-σt}
    let maxVT = 0;
    for (let i = 0; i <= 300; i++) maxVT = Math.max(maxVT, Math.abs(signal(i / 300 * Tmax, a) * Math.exp(-sigma * i / 300 * Tmax)));
    maxVT = Math.max(1, maxVT, maxV * 0.3);
    ctx.strokeStyle = C.time; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const u = i / 400, t = u * Tmax;
      const v = signal(t, a) * Math.exp(-sigma * t) / maxVT;
      const px = x0 + u * (x1 - x0);
      const py = mid - v * ((y1 - y0) / 2 - 6);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    CFG.label(ctx, `σ = ${sigma.toFixed(2)}`, x1 - 6, y0 + 6, C.accent, { align: 'right', size: 11 });
    CFG.label(ctx, 'raw g(t)', x0 + 6, y0 + 6, 'rgba(255,255,255,0.6)', { size: 10 });
    CFG.label(ctx, 'g(t)·e^(-σt)', x0 + 6, y0 + 22, C.time, { size: 10 });
  }

  function drawWound(tAnim) {
    const { ctx, w, h } = CFG.setupCanvas(cWnd);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const sigma = parseFloat(sEl.value);
    const omega = parseFloat(wEl.value);
    const a = parseFloat(aEl.value);
    const cx = w / 2, cy = h / 2;

    ctx.strokeStyle = C.grid;
    for (let r = 1; r <= 4; r++) { ctx.beginPath(); ctx.arc(cx, cy, r * 20, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

    const Tmax = 8, N = 700;
    const scale = 20;
    let comX = 0, comY = 0, cnt = 0;
    const inROC = sigma > a;
    ctx.strokeStyle = inROC ? C.time : C.imag;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const reveal = Math.min(1, (tAnim % 6) / 5);
    let started = false;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      if (u > reveal) break;
      const t = u * Tmax;
      const g = signal(t, a) * Math.exp(-sigma * t);
      const ang = -omega * t;
      const re = g * Math.cos(ang);
      const im = g * Math.sin(ang);
      const px = cx + re * scale;
      const py = cy - im * scale;
      if (px < -400 || px > w + 400 || py < -400 || py > h + 400) continue;
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      comX += re; comY += im; cnt++;
    }
    ctx.stroke();

    if (cnt > 0) {
      comX /= cnt; comY /= cnt;
      const cmx = CFG.clamp(cx + comX * scale, 6, w - 6);
      const cmy = CFG.clamp(cy - comY * scale, 6, h - 6);
      ctx.fillStyle = C.accent;
      ctx.shadowColor = C.accent; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cmx, cmy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    sub.textContent = inROC ? `bounded · in ROC (σ > ${a.toFixed(2)})` : `diverges · outside ROC`;
  }

  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const sigma = parseFloat(sEl.value);
    const omega = parseFloat(wEl.value);
    const a = parseFloat(aEl.value);

    const cx = w / 2, cy = h / 2;
    // map σ in [-1.5..1.5], ω in [-h range..]
    const sScale = (w - 60) / 3.5;
    const wScale = (h - 40) / 6;

    // ROC region σ > a: fill right of x line
    const xA = cx + a * sScale;
    ctx.fillStyle = 'rgba(123,224,137,0.08)';
    ctx.fillRect(xA, 6, w - xA - 6, h - 12);
    ctx.strokeStyle = 'rgba(123,224,137,0.35)'; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xA, 6); ctx.lineTo(xA, h - 6); ctx.stroke();
    ctx.setLineDash([]);
    CFG.label(ctx, 'ROC: σ > a', w - 8, h - 10, C.time, { size: 10, align: 'right' });

    // grid
    ctx.strokeStyle = C.grid;
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * sScale / 2;
      ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, h - 6); ctx.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const y = cy + i * wScale;
      ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(w - 6, y); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(6, cy); ctx.lineTo(w - 6, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 6); ctx.lineTo(cx, h - 6); ctx.stroke();

    // jω axis — Fourier slice highlight
    ctx.strokeStyle = C.real; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 6); ctx.lineTo(cx, h - 6); ctx.stroke();
    CFG.label(ctx, 'jω axis · Fourier slice', cx + 6, 28, C.real, { size: 10 });
    CFG.label(ctx, 'σ →', w - 6, cy - 4, C.muted, { align: 'right', size: 10 });

    // pole at a ± j w0
    drawPole(ctx, cx + a * sScale, cy - w0 * wScale, C);
    drawPole(ctx, cx + a * sScale, cy + w0 * wScale, C);

    // current s
    const sx = cx + sigma * sScale;
    const sy = cy - omega * wScale;
    ctx.strokeStyle = C.accent; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.accent;
    ctx.shadowColor = C.accent; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Flip the label left/below when near the top-right so it never collides
    // with the "jω axis · Fourier slice" caption up top.
    const sLblY = sy < 48 ? sy + 10 : sy - 14;
    const sLblX = sx > w - 140 ? sx - 10 : sx + 10;
    const sLblAlign = sx > w - 140 ? 'right' : 'left';
    CFG.label(ctx, `s = ${sigma.toFixed(2)} + j${omega.toFixed(2)}`, sLblX, sLblY, C.accent, { size: 10, align: sLblAlign });
  }

  function drawPole(ctx, x, y, C) {
    ctx.strokeStyle = C.imag; ctx.lineWidth = 2;
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
    ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r);
    ctx.stroke();
  }

  function drawAll(tAnim) {
    sO.textContent = parseFloat(sEl.value).toFixed(2);
    wO.textContent = parseFloat(wEl.value).toFixed(2);
    aO.textContent = parseFloat(aEl.value).toFixed(2);
    drawSig();
    drawWound(tAnim || performance.now() / 1000);
    drawSPlane();
  }

  [sEl, wEl, aEl].forEach(el => el.addEventListener('input', () => drawAll()));
  CFG.registerLoop(cWnd, (t) => drawAll(t));
  window.addEventListener('theme-change', () => drawAll());
  window.addEventListener('resize', () => drawAll());
})();
