// Section 03 · Scrolling oscilloscope. Three vertically stacked Canvas2D
// panels share a time axis: noisy biosignal with thresholds, plain
// comparator output, Schmitt trigger output. The Schmitt state is
// advanced sample by sample so its memory is preserved across frames.
(function () {
    var canvas = document.getElementById('scope-canvas');
    if (!canvas) return;

    var WINDOW_SECS = 6;
    var SAMPLE_RATE = 220;
    var N = WINDOW_SECS * SAMPLE_RATE;

    // Circular buffer of samples currently visible.
    var buf = {
        sig:   new Float32Array(N),
        clean: new Float32Array(N),
        plain: new Float32Array(N),
        sch:   new Float32Array(N),
        t:     new Float32Array(N)
    };
    var head = -1;        // index of newest sample, -1 before any sample written
    var absIdx = 0;       // absolute sample index since start
    var schState = +1;
    var plainState = +1;

    var Vsat = 1.0;       // normalised digital rail
    var state = { noise: 0.18, vref: 0.40, hyst: 0.55, speed: 1.0 };

    // Geometry recomputed on each draw.
    var dims = { w: 0, h: 0, dpr: 1 };

    function setupCanvas() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var rect = canvas.getBoundingClientRect();
        canvas.width  = Math.max(1, Math.round(rect.width  * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dims.w = rect.width;
        dims.h = rect.height;
        dims.dpr = dpr;
        return ctx;
    }

    // Deterministic Gaussian noise indexed by absolute sample number, so
    // a given index always returns the same value. Box-Muller on a hashed
    // uniform pair derived from i.
    function hash01(i) {
        var s = (i * 2654435761) >>> 0;
        s ^= s >>> 13;
        s = Math.imul(s, 1597334677) >>> 0;
        s ^= s >>> 16;
        return ((s >>> 0) % 4294967295) / 4294967295;
    }
    function noiseAt(i) {
        var u = hash01(i * 2 + 1);
        var v = hash01(i * 2 + 2);
        if (u < 1e-9) u = 1e-9;
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function advanceOne() {
        absIdx += 1;
        var t = absIdx / SAMPLE_RATE;
        var clean = window.CMP.ecgLike(t);
        var sig = clean + state.noise * noiseAt(absIdx);

        var VTH = state.vref + state.hyst / 2;
        var VTL = state.vref - state.hyst / 2;

        plainState = sig > state.vref ? +Vsat : -Vsat;
        if (schState > 0 && sig < VTL) schState = -Vsat;
        else if (schState < 0 && sig > VTH) schState = +Vsat;

        head = (head + 1) % N;
        buf.sig[head]   = sig;
        buf.clean[head] = clean;
        buf.plain[head] = plainState;
        buf.sch[head]   = schState;
        buf.t[head]     = t;
    }

    function primeBuffer() {
        // Pre-fill the buffer with the first N samples so the scope is
        // populated before the first frame.
        for (var i = 0; i < N; i++) advanceOne();
    }

    // Drawing helpers
    function fillRect(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }
    function strokeLine(ctx, x1, y1, x2, y2, color, width, dash) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function tracePath(ctx, samples, mapY, panelLeft, panelW, useStep) {
        if (head < 0) return;
        var start = (head + 1) % N;
        ctx.beginPath();
        for (var i = 0; i < N; i++) {
            var idx = (start + i) % N;
            var px = panelLeft + (i / (N - 1)) * panelW;
            var py = mapY(samples[idx]);
            if (i === 0) ctx.moveTo(px, py);
            else if (useStep) {
                // step-after: hold previous y until the current x
                var prevIdx = (start + i - 1) % N;
                var prevPy = mapY(samples[prevIdx]);
                ctx.lineTo(px, prevPy);
                ctx.lineTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();
    }

    function drawPanelGrid(ctx, x0, y0, w, h, gridColor, zeroColor, yTicks, yToPx) {
        // background
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        // vertical grid lines (1-second intervals along the visible window)
        for (var s = 0; s <= WINDOW_SECS; s++) {
            var px = x0 + (s / WINDOW_SECS) * w;
            ctx.beginPath();
            ctx.moveTo(px, y0);
            ctx.lineTo(px, y0 + h);
            ctx.stroke();
        }
        // horizontal grid at supplied yTicks
        ctx.strokeStyle = gridColor;
        for (var i = 0; i < yTicks.length; i++) {
            var py = yToPx(yTicks[i]);
            ctx.beginPath();
            ctx.moveTo(x0, py);
            ctx.lineTo(x0 + w, py);
            ctx.stroke();
        }
        // panel border
        ctx.strokeStyle = zeroColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    }

    function draw() {
        var ctx = canvas.getContext('2d');
        // background
        var bg = window.CMP.cssVar('--bg-2');
        var grid = window.CMP.cssVar('--grid-line');
        var gridZero = window.CMP.cssVar('--grid-zero');
        var muted = window.CMP.cssVar('--muted');
        var fg = window.CMP.cssVar('--fg');
        var cInput = window.CMP.cssVar('--c-input');
        var cOut   = window.CMP.cssVar('--c-output');
        var cOut2  = window.CMP.cssVar('--c-output2');
        var cThresh = window.CMP.cssVar('--c-thresh');
        var cThreshH = window.CMP.cssVar('--c-thresh-h');
        var cBand = window.CMP.cssVar('--c-band');

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dims.w, dims.h);

        var marL = 64, marR = 24, marT = 28, marB = 32;
        var innerW = dims.w - marL - marR;
        var innerH = dims.h - marT - marB;
        var gap = 10;
        // panel heights: signal large, two outputs equal smaller
        var panelW = innerW;
        var hSig = (innerH - 2 * gap) * 0.50;
        var hOut = (innerH - 2 * gap - hSig) / 2;

        var sigY0 = marT;
        var plainY0 = sigY0 + hSig + gap;
        var schY0   = plainY0 + hOut + gap;

        // Y mappings
        var sigMin = -0.4, sigMax = 1.3;
        function yToPxSig(v) {
            return sigY0 + (1 - (v - sigMin) / (sigMax - sigMin)) * hSig;
        }
        function yToPxOut(v, panelY0) {
            // digital range [-1.4, 1.4]
            var yMin = -1.4, yMax = 1.4;
            return panelY0 + (1 - (v - yMin) / (yMax - yMin)) * hOut;
        }

        // ── Signal panel ────────────────────────────────────────────
        // Hysteresis band shading (between V_TL and V_TH)
        if (state.hyst > 0) {
            var bandTop = yToPxSig(state.vref + state.hyst / 2);
            var bandBot = yToPxSig(state.vref - state.hyst / 2);
            ctx.fillStyle = cBand;
            ctx.fillRect(marL, bandTop, panelW, bandBot - bandTop);
        }

        drawPanelGrid(ctx, marL, sigY0, panelW, hSig, grid, gridZero,
            [0, 0.4, 0.8, 1.2], yToPxSig);

        // Threshold lines: V_ref (solid dashed pink) and V_TH/V_TL (dashed)
        strokeLine(ctx, marL, yToPxSig(state.vref), marL + panelW, yToPxSig(state.vref),
            cThresh, 1.6, [5, 4]);
        if (state.hyst > 0) {
            strokeLine(ctx, marL, yToPxSig(state.vref + state.hyst / 2),
                       marL + panelW, yToPxSig(state.vref + state.hyst / 2),
                       cThreshH, 1.2, [3, 4]);
            strokeLine(ctx, marL, yToPxSig(state.vref - state.hyst / 2),
                       marL + panelW, yToPxSig(state.vref - state.hyst / 2),
                       cThreshH, 1.2, [3, 4]);
        }

        // Noisy signal first (lower opacity haze)
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = cInput;
        ctx.lineWidth = 1.2;
        ctx.lineJoin = 'round';
        tracePath(ctx, buf.sig, yToPxSig, marL, panelW, false);
        ctx.restore();

        // Clean ECG overlay on top
        ctx.strokeStyle = cInput;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        tracePath(ctx, buf.clean, yToPxSig, marL, panelW, false);

        // ── Plain comparator panel ─────────────────────────────────
        drawPanelGrid(ctx, marL, plainY0, panelW, hOut, grid, gridZero,
            [-1, 0, 1], function (v) { return yToPxOut(v, plainY0); });
        ctx.strokeStyle = cOut;
        ctx.lineWidth = 2.0;
        tracePath(ctx, buf.plain, function (v) { return yToPxOut(v, plainY0); },
            marL, panelW, true);

        // ── Schmitt panel ───────────────────────────────────────────
        drawPanelGrid(ctx, marL, schY0, panelW, hOut, grid, gridZero,
            [-1, 0, 1], function (v) { return yToPxOut(v, schY0); });
        ctx.strokeStyle = cOut2;
        ctx.lineWidth = 2.0;
        tracePath(ctx, buf.sch, function (v) { return yToPxOut(v, schY0); },
            marL, panelW, true);

        // ── Tick labels ────────────────────────────────────────────
        ctx.fillStyle = muted;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        // Time axis tick labels under bottom panel. Each tick shows the
        // relative time (negative seconds back from the right edge),
        // so the rightmost is 0 and leftmost is -WINDOW_SECS.
        for (var s = 0; s <= WINDOW_SECS; s++) {
            var px = marL + (s / WINDOW_SECS) * panelW;
            var lab = (s === WINDOW_SECS) ? '0' : '-' + (WINDOW_SECS - s) + 's';
            ctx.fillText(lab, px, schY0 + hOut + 6);
        }
        // Y tick labels on signal panel
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        [0, 0.5, 1.0].forEach(function (v) {
            ctx.fillText(v.toFixed(1), marL - 6, yToPxSig(v));
        });
        // Y tick labels on output panels
        [-1, 1].forEach(function (v) {
            ctx.fillText(v.toFixed(0), marL - 6, yToPxOut(v, plainY0));
            ctx.fillText(v.toFixed(0), marL - 6, yToPxOut(v, schY0));
        });

        // ── Axis titles (plain alphabetic, canvas text) ────────────
        ctx.save();
        ctx.fillStyle = fg;
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        // Time axis title
        ctx.fillText('time (relative, s)', marL + panelW / 2, schY0 + hOut + 22);
        // Voltage labels (rotated -90) for each panel
        function vTitle(label, panelY, panelH) {
            ctx.save();
            ctx.translate(18, panelY + panelH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
        vTitle('voltage (V)', sigY0, hSig);
        vTitle('output', plainY0, hOut);
        vTitle('output', schY0, hOut);
        ctx.restore();

        // ── Panel labels in top-right corners ──────────────────────
        ctx.fillStyle = muted;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.fillText('clean ECG + noisy input + thresholds', marL + panelW - 8, sigY0 + 6);
        ctx.fillStyle = cOut;
        ctx.fillText('plain comparator output', marL + panelW - 8, plainY0 + 6);
        ctx.fillStyle = cOut2;
        ctx.fillText('Schmitt trigger output', marL + panelW - 8, schY0 + 6);
    }

    // ── Animation loop ────────────────────────────────────────────
    var running = false;
    var raf = 0;
    var lastNow = 0;
    var sampleAccumulator = 0;

    function tick(now) {
        if (!running) return;
        var dt = (now - lastNow) / 1000;
        lastNow = now;
        if (dt > 0.1) dt = 0.1;  // clamp on tab unfreeze

        sampleAccumulator += dt * SAMPLE_RATE * state.speed;
        var nNew = Math.floor(sampleAccumulator);
        sampleAccumulator -= nNew;
        // cap to avoid runaway
        if (nNew > N) nNew = N;
        for (var k = 0; k < nNew; k++) advanceOne();

        draw();
        raf = requestAnimationFrame(tick);
    }
    function start() {
        if (running) return;
        running = true;
        lastNow = performance.now();
        raf = requestAnimationFrame(tick);
    }
    function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    }

    function bind() {
        var n = document.getElementById('scope-noise');
        var v = document.getElementById('scope-vref');
        var h = document.getElementById('scope-hyst');
        var s = document.getElementById('scope-speed');
        var nL = document.getElementById('scope-noise-val');
        var vL = document.getElementById('scope-vref-val');
        var hL = document.getElementById('scope-hyst-val');
        var sL = document.getElementById('scope-speed-val');

        function update() {
            state.noise = parseFloat(n.value);
            state.vref  = parseFloat(v.value);
            state.hyst  = parseFloat(h.value);
            state.speed = parseFloat(s.value);
            nL.textContent = state.noise.toFixed(2) + ' V';
            vL.textContent = state.vref.toFixed(2) + ' V';
            hL.textContent = state.hyst.toFixed(2) + ' V';
            sL.textContent = state.speed.toFixed(2) + 'x';
        }
        [n, v, h, s].forEach(function (el) { el.addEventListener('input', update); });
        update();
    }

    function init() {
        setupCanvas();
        bind();
        primeBuffer();
        draw();

        // Pause when off-screen, redraw on theme change.
        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) start();
                else stop();
            }
        }, { threshold: 0.15 });
        io.observe(canvas);

        window.addEventListener('themechange', function () { draw(); });
        window.addEventListener('resize', function () { setupCanvas(); draw(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
