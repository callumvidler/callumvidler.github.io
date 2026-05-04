// Section 02 · Astable scope. Two stacked panels share a time axis. The
// timing capacitor charges through R1+R2 toward V_CC, the output flips
// when v_C reaches 2/3 V_CC, the capacitor then discharges through R2
// toward 0 V, and the output flips back when v_C falls to 1/3 V_CC.
// Both v_C and v_out are unipolar (0 .. V_CC).
(function () {
    var canvas = document.getElementById('scope-astable');
    if (!canvas) return;

    var WINDOW_SECS = 6;
    var SAMPLE_RATE = 200;
    var N = WINDOW_SECS * SAMPLE_RATE;

    var Vcc = 1.0;
    var TH = (2 / 3) * Vcc;       // upper threshold (2/3 V_CC)
    var TL = (1 / 3) * Vcc;       // lower threshold (1/3 V_CC)

    var buf = {
        vc:  new Float32Array(N),
        out: new Float32Array(N)
    };
    var head = -1;

    var state = { r1: 0.30, r2: 0.30, c: 1.0 };

    var sysOut = Vcc;             // output rail; starts high
    var vc = TL;                  // capacitor starts at lower threshold

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
    }

    function advanceOne(dt) {
        var tau;
        if (sysOut > Vcc / 2) {
            // Charging through R1 + R2 toward V_CC
            tau = (state.r1 + state.r2) * state.c;
            vc += (Vcc - vc) * (dt / tau);
            if (vc >= TH) sysOut = 0;
        } else {
            // Discharging through R2 toward 0 V
            tau = state.r2 * state.c;
            vc += (0 - vc) * (dt / tau);
            if (vc <= TL) sysOut = Vcc;
        }
        head = (head + 1) % N;
        buf.vc[head]  = vc;
        buf.out[head] = sysOut;
    }

    function primeBuffer() {
        var dt = 1 / SAMPLE_RATE;
        for (var i = 0; i < N; i++) advanceOne(dt);
    }

    function strokeLine(ctx, x1, y1, x2, y2, color, width, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = width;
        if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
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
                var prev = (start + i - 1) % N;
                ctx.lineTo(px, mapY(samples[prev]));
                ctx.lineTo(px, py);
            } else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    function drawPanelGrid(ctx, x0, y0, w, h, gridColor, zeroColor, yTicks, yToPx) {
        ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
        for (var s = 0; s <= WINDOW_SECS; s++) {
            var px = x0 + (s / WINDOW_SECS) * w;
            ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + h); ctx.stroke();
        }
        for (var i = 0; i < yTicks.length; i++) {
            var py = yToPx(yTicks[i]);
            ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x0 + w, py); ctx.stroke();
        }
        ctx.strokeStyle = zeroColor; ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    }

    function draw() {
        var ctx = canvas.getContext('2d');
        var bg     = window.CMP.cssVar('--bg-2');
        var grid   = window.CMP.cssVar('--grid-line');
        var gridZ  = window.CMP.cssVar('--grid-zero');
        var muted  = window.CMP.cssVar('--muted');
        var fg     = window.CMP.cssVar('--fg');
        var cCap   = window.CMP.cssVar('--c-cap');
        var cOut   = window.CMP.cssVar('--c-output');
        var cTh    = window.CMP.cssVar('--c-thresh-h');

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dims.w, dims.h);

        var marL = 64, marR = 30, marT = 28, marB = 38;
        var innerW = dims.w - marL - marR;
        var innerH = dims.h - marT - marB;
        var gap = 12;
        var hCap = (innerH - gap) * 0.55;
        var hOut = innerH - gap - hCap;

        var capY0 = marT;
        var outY0 = capY0 + hCap + gap;

        // y-domain for both panels: 0..Vcc, with a small margin
        function yToPxCap(v) {
            return capY0 + (1 - (v - (-0.05)) / (Vcc + 0.10)) * hCap;
        }
        function yToPxOut(v) {
            return outY0 + (1 - (v - (-0.10)) / (Vcc + 0.20)) * hOut;
        }

        // ── v_C panel ──
        drawPanelGrid(ctx, marL, capY0, innerW, hCap, grid, gridZ,
            [0, TL, TH, Vcc], yToPxCap);
        // Threshold lines
        strokeLine(ctx, marL, yToPxCap(TH), marL + innerW, yToPxCap(TH),
            cTh, 1.4, [4, 4]);
        strokeLine(ctx, marL, yToPxCap(TL), marL + innerW, yToPxCap(TL),
            cTh, 1.4, [4, 4]);
        // 0 reference
        strokeLine(ctx, marL, yToPxCap(0), marL + innerW, yToPxCap(0),
            window.CMP.cssVar('--c-rail'), 1, [2, 4]);

        ctx.strokeStyle = cCap;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        tracePath(ctx, buf.vc, yToPxCap, marL, innerW, false);

        // ── Output panel ──
        drawPanelGrid(ctx, marL, outY0, innerW, hOut, grid, gridZ, [0, Vcc], yToPxOut);
        ctx.strokeStyle = cOut;
        ctx.lineWidth = 2.0;
        tracePath(ctx, buf.out, yToPxOut, marL, innerW, true);

        // ── Tick labels ──
        ctx.fillStyle = muted;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        for (var s = 0; s <= WINDOW_SECS; s++) {
            var px = marL + (s / WINDOW_SECS) * innerW;
            var lab = (s === WINDOW_SECS) ? '0' : '-' + (WINDOW_SECS - s) + 's';
            ctx.fillText(lab, px, outY0 + hOut + 6);
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('0',         marL - 6, yToPxCap(0));
        ctx.fillText('Vcc/3',     marL - 6, yToPxCap(TL));
        ctx.fillText('2Vcc/3',    marL - 6, yToPxCap(TH));
        ctx.fillText('Vcc',       marL - 6, yToPxCap(Vcc));
        ctx.fillText('0',   marL - 6, yToPxOut(0));
        ctx.fillText('Vcc', marL - 6, yToPxOut(Vcc));

        // ── Axis titles ──
        ctx.save();
        ctx.fillStyle = fg;
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('time (relative, s)', marL + innerW / 2, outY0 + hOut + 24);
        function vTitle(label, panelY, panelH) {
            ctx.save();
            ctx.translate(18, panelY + panelH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
        vTitle('v_C  (V)', capY0, hCap);
        vTitle('v_out (V)', outY0, hOut);
        ctx.restore();

        // ── Panel labels ──
        ctx.fillStyle = cCap;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.fillText('capacitor voltage', marL + innerW - 8, capY0 + 6);
        ctx.fillStyle = cOut;
        ctx.fillText('OUT  (pin 3)', marL + innerW - 8, outY0 + 6);

        // ── Period / duty readout ──
        var TH_t = Math.log(2) * (state.r1 + state.r2) * state.c;
        var TL_t = Math.log(2) * state.r2 * state.c;
        var Tt = TH_t + TL_t;
        var duty = TH_t / Tt;
        ctx.fillStyle = fg;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText('T = ' + Tt.toFixed(2) + ' s   f = ' + (1 / Tt).toFixed(2) +
                     ' Hz   duty = ' + (duty * 100).toFixed(1) + '%',
            marL + 8, capY0 + 6);
    }

    var running = false;
    var raf = 0;
    var lastNow = 0;
    var sampleAcc = 0;

    function tick(now) {
        if (!running) return;
        var dtReal = (now - lastNow) / 1000;
        lastNow = now;
        if (dtReal > 0.1) dtReal = 0.1;
        sampleAcc += dtReal * SAMPLE_RATE;
        var nNew = Math.floor(sampleAcc);
        sampleAcc -= nNew;
        if (nNew > N) nNew = N;
        var dt = 1 / SAMPLE_RATE;
        for (var k = 0; k < nNew; k++) advanceOne(dt);
        draw();
        raf = requestAnimationFrame(tick);
    }
    function start() { if (running) return; running = true; lastNow = performance.now(); raf = requestAnimationFrame(tick); }
    function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    function bind() {
        var r1 = document.getElementById('ast-r1');
        var r2 = document.getElementById('ast-r2');
        var c  = document.getElementById('ast-c');
        var r1L = document.getElementById('ast-r1-val');
        var r2L = document.getElementById('ast-r2-val');
        var cL  = document.getElementById('ast-c-val');
        function update() {
            state.r1 = parseFloat(r1.value);
            state.r2 = parseFloat(r2.value);
            state.c  = parseFloat(c.value);
            r1L.textContent = state.r1.toFixed(2);
            r2L.textContent = state.r2.toFixed(2);
            cL.textContent  = state.c.toFixed(2);
        }
        [r1, r2, c].forEach(function (el) { el.addEventListener('input', update); });
        update();
    }

    function init() {
        setupCanvas();
        bind();
        primeBuffer();
        draw();

        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) start(); else stop();
            }
        }, { threshold: 0.15 });
        io.observe(canvas);

        window.addEventListener('themechange', function () { draw(); });
        window.addEventListener('resize', function () { setupCanvas(); draw(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();
