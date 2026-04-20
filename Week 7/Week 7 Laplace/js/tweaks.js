// Tweaks panel: color, font size, offset. Persists via parent postMessage.
(function () {
  const T = window.TWEAKS;
  const panel = document.getElementById('tweaks');

  const PRESETS = {
    math:  { colorBg: '#0a0a10', colorFg: '#eef0f5', colorReal: '#58a6ff', colorImag: '#ff5c7a', colorTime: '#7be089', colorAccent: '#ffcf5c', colorMuted: '#8b90a3' },
    cream: { colorBg: '#f3eee3', colorFg: '#1a1914', colorReal: '#2d5cff', colorImag: '#d9395a', colorTime: '#2f9e55', colorAccent: '#b8851a', colorMuted: '#7a7564' },
    navy:  { colorBg: '#0d1b2a', colorFg: '#e8ecf3', colorReal: '#7cc4ff', colorImag: '#ff7a95', colorTime: '#69d4b0', colorAccent: '#f4b13a', colorMuted: '#8a99b3' },
  };

  function apply() {
    const r = document.documentElement;
    r.style.setProperty('--bg', T.colorBg);
    r.style.setProperty('--bg-2', mix(T.colorBg, T.colorFg, 0.08));
    r.style.setProperty('--fg', T.colorFg);
    r.style.setProperty('--muted', T.colorMuted);
    r.style.setProperty('--real', T.colorReal);
    r.style.setProperty('--imag', T.colorImag);
    r.style.setProperty('--time', T.colorTime);
    r.style.setProperty('--accent', T.colorAccent);
    r.style.setProperty('--border', hexA(T.colorFg, 0.09));
    r.style.setProperty('--panel', hexA(mix(T.colorBg, T.colorFg, 0.05), 0.78));
    r.style.setProperty('--body-size', T.fontBody + 'px');
    r.style.setProperty('--math-size', T.fontMath + 'px');
    r.style.setProperty('--hero-size', T.fontHero + 'px');
    r.style.setProperty('--canvas-offset', (T.canvasOffset || 0) + 'px');
    r.style.setProperty('--text-offset', (T.textOffset || 0) + 'px');
    // sync inputs
    document.querySelectorAll('[data-tk]').forEach(el => {
      const k = el.getAttribute('data-tk');
      if (T[k] !== undefined) el.value = T[k];
    });
    // tell canvases to redraw (they self-redraw on theme change event)
    window.dispatchEvent(new CustomEvent('theme-change'));
  }
  function hexA(hex, a) {
    const { r, g, b } = toRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  function mix(a, b, t) {
    const ca = toRgb(a), cb = toRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function toRgb(c) {
    if (c.startsWith('rgb')) {
      const m = c.match(/rgba?\(([^)]+)\)/);
      const p = m[1].split(',').map(s => parseFloat(s));
      return { r: p[0], g: p[1], b: p[2] };
    }
    const h = c.replace('#', '');
    const v = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
  }

  function persist() {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: T }, '*'); } catch (e) {}
  }

  // Panel events
  panel.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.hasAttribute('data-tk')) return;
    const k = el.getAttribute('data-tk');
    let v = el.value;
    if (el.type === 'range') v = parseFloat(v);
    T[k] = v;
    apply();
    persist();
  });
  panel.querySelectorAll('[data-preset]').forEach(b => {
    b.addEventListener('click', () => {
      const p = PRESETS[b.getAttribute('data-preset')];
      if (!p) return;
      // set muted based on fg brightness
      Object.assign(T, p);
      apply();
      persist();
    });
  });
  document.getElementById('tweaksX').addEventListener('click', () => {
    panel.classList.remove('show');
    panel.classList.remove('min');
  });
  document.getElementById('tweaksMin').addEventListener('click', () => {
    panel.classList.toggle('min');
    document.getElementById('tweaksMin').textContent = panel.classList.contains('min') ? '+' : '–';
  });

  // Edit-mode protocol
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') panel.classList.add('show');
    else if (d.type === '__deactivate_edit_mode') panel.classList.remove('show');
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  apply();
})();
