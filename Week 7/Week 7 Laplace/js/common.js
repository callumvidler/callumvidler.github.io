// Common drawing helpers + theme bridging.
(function () {
  const T = window.TWEAKS;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function colors() {
    return {
      real: cssVar('--real') || T.colorReal,
      imag: cssVar('--imag') || T.colorImag,
      time: cssVar('--time') || T.colorTime,
      accent: cssVar('--accent') || T.colorAccent,
      fg: cssVar('--fg') || T.colorFg,
      muted: cssVar('--muted') || T.colorMuted,
      bg: cssVar('--bg') || T.colorBg,
      grid: 'rgba(255,255,255,0.06)',
      gridStrong: 'rgba(255,255,255,0.14)',
    };
  }

  // High DPI canvas
  function setupCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  // Grid drawing in a box with given world->screen mapping
  function drawGrid(ctx, w, h, opts = {}) {
    const C = colors();
    const step = opts.step || 32;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let x = (w / 2) % step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
    }
    for (let y = (h / 2) % step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = C.gridStrong;
    ctx.lineWidth = 1;
    const cx = opts.cx ?? w / 2;
    const cy = opts.cy ?? h / 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.restore();
  }

  function label(ctx, text, x, y, color, opts = {}) {
    ctx.save();
    ctx.font = `${opts.weight || 500} ${opts.size || 10}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'top';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // RAF registry with IntersectionObserver pause
  const raf = { loops: new Map(), io: null };

  function registerLoop(el, fn) {
    raf.loops.set(el, { fn, running: false, t0: performance.now() });
    if (!raf.io) {
      raf.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const L = raf.loops.get(e.target);
          if (!L) continue;
          if (e.isIntersecting && !L.running) {
            L.running = true;
            L.t0 = performance.now();
            tick(e.target);
          } else if (!e.isIntersecting) {
            L.running = false;
          }
        }
      }, { threshold: 0.15 });
    }
    raf.io.observe(el);
  }

  function tick(el) {
    const L = raf.loops.get(el);
    if (!L || !L.running) return;
    const now = performance.now();
    L.fn((now - L.t0) / 1000);
    requestAnimationFrame(() => tick(el));
  }

  // Small utility: map
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  window.CFG = {
    colors, setupCanvas, clear, drawGrid, label, registerLoop, lerp, clamp,
  };
})();
