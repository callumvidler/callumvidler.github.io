// Scene 6 — Fourier is a slice of Laplace.
// Main panel: |F(s)| surface over the s-plane, rendered as a back-to-front
// filled wireframe (painter's algorithm on rows). A user-controlled σ-slice
// highlights the cross section the side panel plots. The jω ridge (σ = 0) is
// painted blue — that's exactly what Fourier sees.
//
// Side panels:
//   • 1D slice |F(σ + jω)| as a function of ω, at current σ
//   • top-down s-plane map with poles and the σ slice line
(function () {
  const canvas = document.getElementById('surfCanvas');
  if (!canvas) return;

  const cSlice = document.getElementById('surfSlice');
  const cTop   = document.getElementById('surfTop');
  const sigEl  = document.getElementById('surfSigma');
  const sigO   = document.getElementById('surfSigmaO');
  const sysSeg = document.getElementById('surfSysSeg');
  const sub    = document.getElementById('surfSub');
  const sliceTitle = document.getElementById('surfSliceTitle');
  const btnFourier = document.getElementById('surfFourier');
  const btnSpin    = document.getElementById('surfSpin');
  const btnTopView = document.getElementById('surfTopView');
  const btnBode    = document.getElementById('surfBode');
  const meshEl = document.getElementById('surfMesh');
  const meshO  = document.getElementById('surfMeshO');

  const DEFAULT_ROT_Y = 0.85;
  const DEFAULT_ROT_X = 0.55;
  const TOP_ROT_Y     = 0;
  const TOP_ROT_X     = Math.PI / 2;
  const MAX_ROT_X     = Math.PI / 2;

  // ─── System presets: poles (×) and zeros (○) ───────────────────────────
  // Zeros press |F(s)| toward the floor. Poles punch it to infinity.
  const SYSTEMS = {
    stable:   {
      poles: [{re: -0.55, im:  1.25}, {re: -0.55, im: -1.25}],
      zeros: [{re: -1.20, im:  0.00}],
      label: 'H(s) = (s+1.2) / ((s+0.55)² + 1.25²)'
    },
    ring:     {
      poles: [{re: -0.12, im:  1.55}, {re: -0.12, im: -1.55}],
      zeros: [{re:  0.00, im:  0.60}, {re: 0.00, im: -0.60}],
      label: 'H(s) = (s² + 0.36) / ((s+0.12)² + 1.55²)'
    },
    unstable: {
      poles: [{re:  0.30, im:  1.10}, {re:  0.30, im: -1.10}],
      zeros: [{re: -0.90, im:  0.00}],
      label: 'H(s) = (s+0.9) / ((s-0.30)² + 1.10²)'
    },
  };
  let currentSys = 'stable';

  // ─── Interaction state ───────────────────────────────────────────────────
  let rotY = DEFAULT_ROT_Y;   // yaw (around vertical)
  let rotX = DEFAULT_ROT_X;   // pitch
  let autoSpin = false;
  let topView = false;
  let bodeMode = false;       // side-panel slice rendered as a Bode plot
  let drag = null;

  // ─── Math ────────────────────────────────────────────────────────────────
  const spanS = 2.2;     // σ half-range
  const spanW = 2.4;     // ω half-range
  const Z_CLAMP = 6;     // axis tripod height — intentionally shorter than tall
                         //   peaks, which are allowed to shoot past the top of
                         //   the canvas.
  const Z_SKIP  = 120;   // threshold used to skip only quads at the singularity
  let   Nsig = 84;       // grid rows along σ (controlled by mesh slider)
  let   Nw   = 84;       // grid cols along ω (controlled by mesh slider)

  function magAt(sigma, omega) {
    const sys = SYSTEMS[currentSys];
    let denom = 1;
    for (const p of sys.poles) {
      const dx = sigma - p.re, dy = omega - p.im;
      denom *= Math.hypot(dx, dy);
    }
    let num = 1;
    for (const z of (sys.zeros || [])) {
      const dx = sigma - z.re, dy = omega - z.im;
      num *= Math.hypot(dx, dy);
    }
    return num / Math.max(1e-4, denom);
  }
  function zOf(sigma, omega) {
    // Linear height. Near-pole samples shoot up (Z_SKIP catches values close
    // to the singularity); everywhere else the surface reads as |F(s)|
    // directly, so resonant peaks stretch past the top of the canvas.
    return magAt(sigma, omega);
  }

  // ─── 3D → 2D projection (orthographic, yaw then pitch) ───────────────────
  function makeProject(w, h) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    // At side view, scale is governed by the smaller canvas dimension and the
    // surface sits low (cy high) so the height spike has room above. At top
    // view, ω uses the full scale vertically, so we must shrink to fit ±spanW
    // inside the height and center vertically.
    const sideScale = Math.min(w, h) * 0.22;
    const topScale  = Math.min(w / (2 * spanS), h / (2 * spanW)) * 0.92;
    const scale = sideScale + (topScale - sideScale) * sinX;
    const cx = w * 0.50;
    const cy = h * (0.68 - 0.18 * sinX);
    // world: x=σ, y=ω, z=height
    return function project(sig, om, z) {
      // yaw around z
      const x1 =  sig * cosY + om * sinY;
      const y1 = -sig * sinY + om * cosY;
      const z1 =  z;
      // pitch around x1
      const y2 =  y1 * cosX - z1 * sinX;
      // Split z2 so the height component keeps its foreshortening (0.55) while
      // the in-plane ω component (y1·sinX) uses the full scale — otherwise at
      // top-down view ω would render at 55% of σ's scale and the plot looks
      // rectangular instead of square.
      const yFromPitch = y1 * sinX * scale;       // ω mapped to screen-y as pitch increases
      const yFromZ     = z1 * cosX * scale * 0.22; // height mapped to screen-y (foreshortened)
      // Fade the y2→screen parallax as pitch approaches vertical so height
      // stops leaking into screen-y at top-down view.
      const parallax = 0.18 * cosX;
      return {
        x: cx + x1 * scale,
        y: cy - yFromPitch - yFromZ - y2 * scale * parallax,
        depth: y2, // larger = farther back (for painter's sort)
      };
    };
  }

  // ─── Main surface draw ───────────────────────────────────────────────────
  function drawSurface(tAnim) {
    const { ctx, w, h } = CFG.setupCanvas(canvas);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    if (autoSpin) rotY = 0.85 + 0.55 * Math.sin(tAnim * 0.25);
    const project = makeProject(w, h);
    const sigma0 = parseFloat(sigEl.value);

    // ── Build grid of projected points
    const pts = new Array(Nsig + 1);
    for (let i = 0; i <= Nsig; i++) {
      pts[i] = new Array(Nw + 1);
      const sig = -spanS + 2 * spanS * i / Nsig;
      for (let j = 0; j <= Nw; j++) {
        const om = -spanW + 2 * spanW * j / Nw;
        const z  = zOf(sig, om);
        const p  = project(sig, om, z);
        pts[i][j] = { sig, om, z, sx: p.x, sy: p.y, depth: p.depth };
      }
    }

    // ── Ground floor (s-plane) behind surface — subtle ROC tint
    const sys = SYSTEMS[currentSys];
    const maxPoleRe = Math.max(...sys.poles.map(p => p.re));
    // ROC σ > max(Re(poles))
    ctx.save();
    ctx.beginPath();
    const corners = [
      project(-spanS, -spanW, 0),
      project( spanS, -spanW, 0),
      project( spanS,  spanW, 0),
      project(-spanS,  spanW, 0),
    ];
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let k = 1; k < 4; k++) ctx.lineTo(corners[k].x, corners[k].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ROC: σ > maxPoleRe shaded green on floor
    const rA = project(maxPoleRe, -spanW, 0);
    const rB = project( spanS,    -spanW, 0);
    const rC = project( spanS,     spanW, 0);
    const rD = project(maxPoleRe,  spanW, 0);
    ctx.beginPath();
    ctx.moveTo(rA.x, rA.y); ctx.lineTo(rB.x, rB.y);
    ctx.lineTo(rC.x, rC.y); ctx.lineTo(rD.x, rD.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(123,224,137,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(123,224,137,0.28)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(rA.x, rA.y); ctx.lineTo(rD.x, rD.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label ROC on the floor
    const rocLbl = project(maxPoleRe + 0.4, spanW * 0.85, 0);
    CFG.label(ctx, 'ROC · σ > α', rocLbl.x, rocLbl.y, C.time, { size: 10 });
    ctx.restore();

    // ── Paint the surface: sort rows by depth (back to front)
    const rowOrder = [];
    for (let i = 0; i < Nsig; i++) {
      // average depth of row
      const d = (pts[i][Math.floor(Nw/2)].depth + pts[i+1][Math.floor(Nw/2)].depth) / 2;
      rowOrder.push({ i, d });
    }
    rowOrder.sort((a, b) => b.d - a.d); // far first

    // In Bode mode the surface is rendered translucently so the overlay slice
    // (ω ≥ 0) reads as the primary object on screen.
    const surfAlpha = bodeMode ? 0.18 : 1.0;

    // For each row, paint each quad with a fill + stroke inline (avoids
    // hairline seams between fill and the later wireframe pass)
    for (const { i } of rowOrder) {
      for (let j = 0; j < Nw; j++) {
        const a = pts[i][j], b = pts[i+1][j], c = pts[i+1][j+1], d = pts[i][j+1];
        const zAvg = (a.z + b.z + c.z + d.z) / 4;
        const near = Math.min(a.z, b.z, c.z, d.z);

        // Skip quads that are effectively infinite (clip near poles)
        if (near > Z_SKIP) continue;

        // Fill shade — lighter with height, warm tint near peaks
        const t = Math.min(1, zAvg / 5.0);
        const r = Math.round(12 + 60 * t);
        const g = Math.round(14 + 30 * t);
        const bl= Math.round(30 + 50 * (1 - t));
        ctx.fillStyle = `rgba(${r},${g},${bl},${(0.55 + 0.35 * t) * surfAlpha})`;
        // Matching same-color stroke seals seams between adjacent quads
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.lineTo(c.sx, c.sy);
        ctx.lineTo(d.sx, d.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // ── Wireframe pass on top — every few lines only, so a denser surface
    // still reads as geometry without becoming a mesh of noise. Break the
    // polyline when we cross a clamped (pole) region.
    ctx.lineWidth = 1;
    ctx.strokeStyle = bodeMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)';
    // Grid line count scales with mesh density (sqrt-ish so it stays readable).
    // At Nw=24 → ~14 lines; at Nw=160 → ~53 lines.
    const targetLines = Math.round(9 + Math.sqrt(Nw) * 3.5);
    const stride = Math.max(1, Math.round(Nw / targetLines));
    for (let j = 0; j <= Nw; j += stride) {
      ctx.beginPath();
      let penDown = false;
      for (let i = 0; i <= Nsig; i++) {
        const p = pts[i][j];
        if (p.z > Z_SKIP) { penDown = false; continue; }
        if (!penDown) { ctx.moveTo(p.sx, p.sy); penDown = true; }
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
    }
    for (let i = 0; i <= Nsig; i += stride) {
      ctx.beginPath();
      let penDown = false;
      for (let j = 0; j <= Nw; j++) {
        const p = pts[i][j];
        if (p.z > Z_SKIP) { penDown = false; continue; }
        if (!penDown) { ctx.moveTo(p.sx, p.sy); penDown = true; }
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
    }

    // In Bode mode, restrict the overlay curves to ω ≥ 0 so they trace the
    // same half-axis the Bode magnitude panel plots.
    const jStart = bodeMode ? Math.round(Nw / 2) : 0;

    // ── Highlight 1: jω ridge (σ = 0) — Fourier slice (pen-lifted near poles)
    const iZero = Math.round((0 + spanS) / (2 * spanS) * Nsig);
    ctx.lineWidth = bodeMode ? 1.4 : 2.4;
    ctx.strokeStyle = bodeMode ? 'rgba(88,166,255,0.45)' : C.real;
    ctx.beginPath();
    {
      let penDown = false;
      for (let j = jStart; j <= Nw; j++) {
        const p = pts[iZero][j];
        if (p.z > Z_SKIP) { penDown = false; continue; }
        if (!penDown) { ctx.moveTo(p.sx, p.sy); penDown = true; }
        else ctx.lineTo(p.sx, p.sy);
      }
    }
    ctx.stroke();
    // Label on ridge
    if (!bodeMode) {
      const ridgeLbl = pts[iZero][Nw];
      CFG.label(ctx, 'σ = 0  ·  Fourier', ridgeLbl.x + 8, ridgeLbl.y - 6, C.real, { size: 10 });
    }

    // ── Highlight 2: current σ slice — accent colored (pen-lifted near poles)
    const iCur = Math.round(CFG.clamp((sigma0 + spanS) / (2 * spanS), 0, 1) * Nsig);
    ctx.lineWidth = bodeMode ? 3.2 : 2.4;
    ctx.strokeStyle = C.accent;
    ctx.shadowColor = C.accent; ctx.shadowBlur = bodeMode ? 10 : 6;
    ctx.beginPath();
    {
      let penDown = false;
      for (let j = jStart; j <= Nw; j++) {
        const p = pts[iCur][j];
        if (p.z > Z_SKIP) { penDown = false; continue; }
        if (!penDown) { ctx.moveTo(p.sx, p.sy); penDown = true; }
        else ctx.lineTo(p.sx, p.sy);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    // In Bode mode anchor the label at the ω = 0 end of the slice curve so it
    // points to where the magnitude plot starts, not the −ω end.
    const curLbl = bodeMode ? pts[iCur][jStart] : pts[iCur][0];
    CFG.label(ctx, `σ = ${sigma0.toFixed(2)}`, curLbl.x - 8, curLbl.y - 6, C.accent, { size: 10, align: 'right' });

    // ── Pole spikes
    ctx.strokeStyle = C.imag;
    ctx.fillStyle = C.imag;
    ctx.lineWidth = 2;
    for (const p of sys.poles) {
      const base = project(p.re, p.im, 0);
      const top  = project(p.re, p.im, Z_CLAMP + 0.3);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
      ctx.shadowColor = C.imag; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(top.x, top.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      const pLblAlign = top.x > w * 0.65 ? 'right' : 'left';
      const pLblDx = pLblAlign === 'right' ? -8 : 8;
      CFG.label(ctx, `× s = ${p.re.toFixed(2)} ${p.im >= 0 ? '+' : '−'} j${Math.abs(p.im).toFixed(2)}`,
                top.x + pLblDx, top.y - 4, C.imag, { size: 10, align: pLblAlign });
    }

    // ── Zero markers: ring on floor + short mast showing the dip
    // Height where the surface actually is at the zero — it's 0 by definition,
    // so we plant the marker on the floor and draw a dashed guide tracing the
    // valley up to a short reference height so the eye picks it out.
    ctx.strokeStyle = C.time;
    ctx.fillStyle = 'rgba(10,10,16,0.9)';
    ctx.lineWidth = 1.8;
    for (const z of (sys.zeros || [])) {
      const base = project(z.re, z.im, 0);
      const top  = project(z.re, z.im, 0.9);
      // dashed mast going UP from floor — shows "the surface is pinned to 0 here"
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(123,224,137,0.55)';
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // ring at base
      ctx.strokeStyle = C.time;
      ctx.shadowColor = C.time; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(base.x, base.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      const zLblAlign = base.x > w * 0.65 ? 'right' : 'left';
      const zLblDx = zLblAlign === 'right' ? -9 : 9;
      CFG.label(ctx, `○ zero  s = ${z.re.toFixed(2)}${z.im === 0 ? '' : (z.im >= 0 ? ' + j' : ' − j') + Math.abs(z.im).toFixed(2)}`,
                base.x + zLblDx, base.y + 4, C.time, { size: 10, align: zLblAlign });
    }

    // ── Axis tripod (origin arrows)
    const O = project(0, 0, 0);
    const Ax = project(spanS * 0.9, 0, 0);
    const Ay = project(0, spanW * 0.9, 0);
    const Az = project(0, 0, Z_CLAMP * 0.75);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    [Ax, Ay, Az].forEach(A => {
      ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(A.x, A.y); ctx.stroke();
    });
    CFG.label(ctx, 'σ', Ax.x + 4, Ax.y,     C.muted, { size: 10 });
    CFG.label(ctx, 'jω', Ay.x + 4, Ay.y,    C.muted, { size: 10 });
    CFG.label(ctx, '|F(s)|', Az.x + 4, Az.y, C.muted, { size: 10 });

    // sub text
    sub.textContent = SYSTEMS[currentSys].label;
  }

  // ─── Side panel: 1D slice |F(σ + jω)| vs ω ──────────────────────────────
  function drawSlice() {
    const { ctx, w, h } = CFG.setupCanvas(cSlice);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const sigma0 = parseFloat(sigEl.value);
    const padL = 40, padR = 14, padT = 36, padB = 28;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;

    if (bodeMode) {
      // ── Bode-style: log ω on x, magnitude in dB on y, ω > 0 only ───────
      const wMin = 0.05;
      const wMax = spanW;
      const logMin = Math.log10(wMin);
      const logMax = Math.log10(wMax);

      // Auto-scale the dB ceiling so sharp resonances don't flat-top.
      // Sweep both curves (Fourier reference and current σ slice) to find the
      // true peak, then pad and round up to the next 10 dB mark.
      const NProbe = 400;
      let peakDB = -Infinity;
      for (let i = 0; i <= NProbe; i++) {
        const u = i / NProbe;
        const om = Math.pow(10, logMin + u * (logMax - logMin));
        const m1 = magAt(0, om);
        const m2 = magAt(sigma0, om);
        const d1 = 20 * Math.log10(Math.max(1e-9, m1));
        const d2 = 20 * Math.log10(Math.max(1e-9, m2));
        if (d1 > peakDB) peakDB = d1;
        if (d2 > peakDB) peakDB = d2;
      }
      const dBMax = Math.max(30, Math.ceil((peakDB + 8) / 10) * 10);
      const dBMin = -40;

      const xOfLogW = u => x0 + ((Math.log10(u) - logMin) / (logMax - logMin)) * (x1 - x0);
      const yOfDB   = d => y1 - ((d - dBMin) / (dBMax - dBMin)) * (y1 - y0);

      // horizontal dB grid every 10 dB
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      for (let d = Math.ceil(dBMin / 10) * 10; d <= dBMax; d += 10) {
        const y = yOfDB(d);
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        CFG.label(ctx, `${d > 0 ? '+' : ''}${d} dB`, x0 - 4, y + 3, C.muted, { size: 9, align: 'right' });
      }
      // decade gridlines + minor log ticks
      const decadeStart = Math.ceil(logMin);
      const decadeEnd   = Math.floor(logMax);
      ctx.strokeStyle = C.grid;
      for (let k = decadeStart; k <= decadeEnd; k++) {
        const xv = xOfLogW(Math.pow(10, k));
        ctx.beginPath(); ctx.moveTo(xv, y0); ctx.lineTo(xv, y1); ctx.stroke();
        CFG.label(ctx, `10^${k}`, xv, y1 + 12, C.muted, { size: 10 });
      }
      // minor ticks at 2,3,...,9 × 10^k
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      for (let k = decadeStart - 1; k <= decadeEnd; k++) {
        for (let m = 2; m <= 9; m++) {
          const v = m * Math.pow(10, k);
          if (v < wMin || v > wMax) continue;
          const xv = xOfLogW(v);
          ctx.beginPath(); ctx.moveTo(xv, y0); ctx.lineTo(xv, y1); ctx.stroke();
        }
      }
      // axis baseline
      ctx.strokeStyle = C.gridStrong;
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();

      // plot helper: sweep log ω from wMin to wMax
      const N = 320;
      function plotBode(sig, color, width) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const logw = logMin + u * (logMax - logMin);
          const om = Math.pow(10, logw);
          const m  = magAt(sig, om);
          const db = 20 * Math.log10(Math.max(1e-6, m));
          const px = xOfLogW(om);
          const py = yOfDB(CFG.clamp(db, dBMin - 10, dBMax + 20));
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      plotBode(0, 'rgba(88,166,255,0.55)', 1.2);  // Fourier reference
      plotBode(sigma0, C.accent, 2);              // current σ slice

      // axis labels
      CFG.label(ctx, 'ω (rad/s, log)', x1, y1 + 14, C.muted, { size: 10, align: 'right' });
      CFG.label(ctx, '|F| (dB)', x0 - 4, y0 - 6, C.muted, { size: 10, align: 'right' });

      // legend
      CFG.label(ctx, '— Fourier (σ=0)', x0 + 6, y0 + 2,  C.real, { size: 10 });
      CFG.label(ctx, `— slice σ=${sigma0.toFixed(2)}`, x0 + 6, y0 + 16, C.accent, { size: 10 });

      sliceTitle.textContent = `Bode magnitude  ·  20 log₁₀|F(σ + jω)|  ·  σ = ${sigma0.toFixed(2)}`;
      return;
    }

    // ── Standard linear slice (ω ∈ [−spanW, +spanW], |F| linear) ─────────
    ctx.strokeStyle = C.grid;
    for (let k = 1; k <= 3; k++) {
      const y = y1 - (y1 - y0) * k / 4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    // ω = 0 vertical
    const xMid = x0 + (x1 - x0) / 2;
    ctx.beginPath(); ctx.moveTo(xMid, y0); ctx.lineTo(xMid, y1); ctx.stroke();

    const N = 240;
    const ymax = Math.min(Z_CLAMP, 3.5);
    function plot(sig, color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const om = -spanW + 2 * spanW * u;
        const z  = Math.min(ymax, magAt(sig, om));
        const px = x0 + u * (x1 - x0);
        const py = y1 - (z / ymax) * (y1 - y0);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    plot(0, 'rgba(88,166,255,0.55)', 1.2);  // Fourier ghost
    plot(sigma0, C.accent, 2);               // current slice

    CFG.label(ctx, 'ω →', x1, y1 + 6, C.muted, { size: 10, align: 'right' });
    CFG.label(ctx, '|F|',  x0 - 4, y0 - 6, C.muted, { size: 10, align: 'right' });
    CFG.label(ctx, '−' + spanW.toFixed(1), x0, y1 + 6, C.muted, { size: 10 });
    CFG.label(ctx, '+' + spanW.toFixed(1), x1, y1 + 6, C.muted, { size: 10, align: 'right' });
    CFG.label(ctx, '0', xMid + 3, y1 + 6, C.muted, { size: 10 });

    CFG.label(ctx, '— Fourier (σ=0)', x0, y0 + 2,  C.real, { size: 10 });
    CFG.label(ctx, `— slice σ=${sigma0.toFixed(2)}`, x0, y0 + 16, C.accent, { size: 10 });

    sliceTitle.textContent = `slice at σ = ${sigma0.toFixed(2)}  ·  |F(σ + jω)|`;
  }

  // ─── Side panel: top-down s-plane map ────────────────────────────────────
  // Stash coordinate mappings for the top panel so the pointer handler can
  // hit-test poles/zeros and convert drag deltas back to (σ, ω).
  let topMap = null;
  function drawTop() {
    const { ctx, w, h } = CFG.setupCanvas(cTop);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const sigma0 = parseFloat(sigEl.value);
    const sys = SYSTEMS[currentSys];
    const maxPoleRe = Math.max(...sys.poles.map(p => p.re));

    const padL = 18, padR = 18, padT = 32, padB = 22;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const bw = x1 - x0, bh = y1 - y0;
    const xOf = sig => x0 + (sig + spanS) / (2 * spanS) * bw;
    const yOf = om  => y1 - (om + spanW) / (2 * spanW) * bh;
    const sigOf = px => (px - x0) / bw * (2 * spanS) - spanS;
    const omOf  = py => (y1 - py) / bh * (2 * spanW) - spanW;
    topMap = { xOf, yOf, sigOf, omOf, x0, x1, y0, y1 };

    // ROC shade
    const xROC = xOf(maxPoleRe);
    ctx.fillStyle = 'rgba(123,224,137,0.08)';
    ctx.fillRect(xROC, y0, x1 - xROC, bh);
    ctx.strokeStyle = 'rgba(123,224,137,0.35)';
    ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(xROC, y0); ctx.lineTo(xROC, y1); ctx.stroke();
    ctx.setLineDash([]);

    // grid
    ctx.strokeStyle = C.grid;
    for (let k = -2; k <= 2; k++) {
      const xv = xOf(k * spanS / 2);
      ctx.beginPath(); ctx.moveTo(xv, y0); ctx.lineTo(xv, y1); ctx.stroke();
      const yv = yOf(k * spanW / 2);
      ctx.beginPath(); ctx.moveTo(x0, yv); ctx.lineTo(x1, yv); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, yOf(0)); ctx.lineTo(x1, yOf(0)); ctx.stroke();

    // jω axis (Fourier)
    ctx.strokeStyle = C.real;
    ctx.lineWidth = 2;
    const xZero = xOf(0);
    ctx.beginPath(); ctx.moveTo(xZero, y0); ctx.lineTo(xZero, y1); ctx.stroke();
    CFG.label(ctx, 'jω · Fourier', xZero + 5, y0 + 4, C.real, { size: 10 });

    // current σ slice line
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    const xSig = xOf(sigma0);
    ctx.beginPath(); ctx.moveTo(xSig, y0); ctx.lineTo(xSig, y1); ctx.stroke();
    CFG.label(ctx, `σ=${sigma0.toFixed(2)}`, xSig + 5, y1 - 6, C.accent, { size: 10 });

    // poles × (draggable)
    ctx.lineWidth = 2.4;
    for (let i = 0; i < sys.poles.length; i++) {
      const p = sys.poles[i];
      const px = xOf(p.re), py = yOf(p.im);
      const r = 7;
      const active = dragNode && dragNode.kind === 'pole' && (dragNode.idx === i || dragNode.mateIdx === i);
      ctx.strokeStyle = active ? C.accent : C.imag;
      ctx.lineWidth = active ? 3 : 2.4;
      if (active) { ctx.shadowColor = C.accent; ctx.shadowBlur = 10; }
      ctx.beginPath();
      ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
      ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // zeros ○ (draggable)
    for (let i = 0; i < (sys.zeros || []).length; i++) {
      const z = sys.zeros[i];
      const px = xOf(z.re), py = yOf(z.im);
      const active = dragNode && dragNode.kind === 'zero' && (dragNode.idx === i || dragNode.mateIdx === i);
      ctx.strokeStyle = active ? C.accent : C.time;
      ctx.lineWidth = active ? 3 : 2.4;
      if (active) { ctx.shadowColor = C.accent; ctx.shadowBlur = 10; }
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    CFG.label(ctx, 'σ →', x1 - 4, yOf(0) - 6, C.muted, { size: 10, align: 'right' });
    CFG.label(ctx, 'drag × or ○ to reshape', x0, y1 + 6, C.muted, { size: 10 });
  }

  // ─── Interaction ─────────────────────────────────────────────────────────
  let dragNode = null; // { kind, idx, mateIdx } for top-view pole/zero drag

  // Mate index for conjugate pairs (nodes with non-zero imaginary part)
  function findMate(nodes, idx) {
    const n = nodes[idx];
    if (Math.abs(n.im) < 1e-6) return -1;
    for (let k = 0; k < nodes.length; k++) {
      if (k === idx) continue;
      if (Math.abs(nodes[k].re - n.re) < 1e-6 && Math.abs(nodes[k].im + n.im) < 1e-6) return k;
    }
    return -1;
  }

  function hitTestTop(px, py) {
    if (!topMap) return null;
    const sys = SYSTEMS[currentSys];
    let best = null, bestD = 14 * 14; // 14px radius
    const cand = [
      ...sys.poles.map((p, i) => ({ kind: 'pole', idx: i, p })),
      ...(sys.zeros || []).map((z, i) => ({ kind: 'zero', idx: i, p: z })),
    ];
    for (const c of cand) {
      const dx = topMap.xOf(c.p.re) - px;
      const dy = topMap.yOf(c.p.im) - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = c; }
    }
    if (!best) return null;
    const nodes = best.kind === 'pole' ? sys.poles : sys.zeros;
    return { kind: best.kind, idx: best.idx, mateIdx: findMate(nodes, best.idx) };
  }

  cTop.style.cursor = 'crosshair';
  cTop.addEventListener('pointermove', (e) => {
    if (dragNode) return;
    const rect = cTop.getBoundingClientRect();
    const hit = hitTestTop(e.clientX - rect.left, e.clientY - rect.top);
    cTop.style.cursor = hit ? 'grab' : 'crosshair';
  });
  cTop.addEventListener('pointerdown', (e) => {
    const rect = cTop.getBoundingClientRect();
    const hit = hitTestTop(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) return;
    dragNode = hit;
    cTop.setPointerCapture(e.pointerId);
    cTop.style.cursor = 'grabbing';
    drawAll();
  });
  cTop.addEventListener('pointermove', (e) => {
    if (!dragNode || !topMap) return;
    const rect = cTop.getBoundingClientRect();
    const mx = CFG.clamp(e.clientX - rect.left, topMap.x0, topMap.x1);
    const my = CFG.clamp(e.clientY - rect.top,  topMap.y0, topMap.y1);
    let sig = topMap.sigOf(mx);
    let om  = topMap.omOf(my);
    // Snap to σ-axis when close
    if (Math.abs(om) < 0.08) om = 0;
    // Snap to jω-axis when close
    if (Math.abs(sig) < 0.06) sig = 0;

    const sys = SYSTEMS[currentSys];
    const nodes = dragNode.kind === 'pole' ? sys.poles : sys.zeros;
    nodes[dragNode.idx] = { re: sig, im: om };
    if (dragNode.mateIdx >= 0 && Math.abs(om) > 1e-6) {
      nodes[dragNode.mateIdx] = { re: sig, im: -om };
    } else if (dragNode.mateIdx >= 0 && Math.abs(om) < 1e-6) {
      // if user dragged a conjugate onto the real axis, snap mate to origin mirror too
      nodes[dragNode.mateIdx] = { re: sig, im: 0 };
    }
    drawAll();
  });
  window.addEventListener('pointerup', (e) => {
    if (dragNode) {
      dragNode = null;
      cTop.style.cursor = 'crosshair';
      drawAll();
    }
  });

  // 3D canvas drag = rotate
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, rotY, rotX };
    autoSpin = false;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / 140;
    const dy = (e.clientY - drag.y) / 180;
    rotY = drag.rotY + dx;
    rotX = CFG.clamp(drag.rotX + dy, 0.05, MAX_ROT_X);
    if (topView) {
      topView = false;
      btnTopView.style.borderColor = '';
      btnTopView.style.color = '';
    }
    drawSurface(0);
  });
  window.addEventListener('pointerup', () => {
    drag = null;
    canvas.style.cursor = 'grab';
  });

  // system toggle
  sysSeg.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      sysSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      currentSys = b.dataset.v;
      drawAll();
    });
  });

  sigEl.addEventListener('input', () => {
    sigO.textContent = parseFloat(sigEl.value).toFixed(2);
    drawAll();
  });
  meshEl.addEventListener('input', () => {
    const n = parseInt(meshEl.value, 10);
    Nsig = n; Nw = n;
    meshO.textContent = String(n);
    drawAll();
  });
  btnFourier.addEventListener('click', () => {
    const start = parseFloat(sigEl.value);
    const t0 = performance.now();
    const dur = 500;
    function step() {
      const k = CFG.clamp((performance.now() - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = start + (0 - start) * eased;
      sigEl.value = v.toFixed(3);
      sigO.textContent = v.toFixed(2);
      drawAll();
      if (k < 1) requestAnimationFrame(step);
    }
    step();
  });
  btnSpin.addEventListener('click', () => {
    autoSpin = !autoSpin;
    btnSpin.style.borderColor = autoSpin ? 'var(--accent)' : '';
    btnSpin.style.color = autoSpin ? 'var(--accent)' : '';
  });

  if (btnBode) {
    btnBode.addEventListener('click', () => {
      bodeMode = !bodeMode;
      btnBode.style.borderColor = bodeMode ? 'var(--accent)' : '';
      btnBode.style.color       = bodeMode ? 'var(--accent)' : '';
      drawAll();
    });
  }

  btnTopView.addEventListener('click', () => {
    topView = !topView;
    if (topView) autoSpin = false;
    btnSpin.style.borderColor = autoSpin ? 'var(--accent)' : '';
    btnSpin.style.color      = autoSpin ? 'var(--accent)' : '';
    btnTopView.style.borderColor = topView ? 'var(--accent)' : '';
    btnTopView.style.color       = topView ? 'var(--accent)' : '';

    const startY = rotY, startX = rotX;
    const targetY = topView ? TOP_ROT_Y : DEFAULT_ROT_Y;
    const targetX = topView ? TOP_ROT_X : DEFAULT_ROT_X;
    const t0 = performance.now();
    const dur = 520;
    function step() {
      const k = CFG.clamp((performance.now() - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      rotY = startY + (targetY - startY) * eased;
      rotX = startX + (targetX - startX) * eased;
      drawAll();
      if (k < 1) requestAnimationFrame(step);
    }
    step();
  });

  function drawAll(tAnim) {
    drawSurface(tAnim || performance.now() / 1000);
    drawSlice();
    drawTop();
  }

  // init outputs
  sigO.textContent = parseFloat(sigEl.value).toFixed(2);

  CFG.registerLoop(canvas, (t) => drawAll(t));
  window.addEventListener('theme-change', () => drawAll());
  window.addEventListener('resize', () => drawAll());
})();
