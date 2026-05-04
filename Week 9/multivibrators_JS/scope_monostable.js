// Section 03 · Monostable scope. Three stacked panels share a time axis:
// trigger pulses (manual button, plus an automatic prime), capacitor
// voltage v_C with the +V_TH and -V_TL thresholds, and the digital output.
// In the stable state the capacitor is clamped just below 0 V; on a
// negative trigger it is released and discharges toward -V_sat through
// R until it crosses -beta V_sat, when the output flips back.
(function () {
    var canvas = document.getElementById('scope-monostable');
    if (!canvas) return;

    var WINDOW_SECS = 6;
    var SAMPLE_RATE = 200;
    var N = WINDOW_SECS * SAMPLE_RATE;

    var buf = {
        trig: new Float32Array(N),
        vc:   new Float32Array(N),
        out:  new Float32Array(N)
    };
    var head = -1;
    var absIdx = 0;

    var Vsat = 1.0;
    var Vd = 0.06;             // diode forward drop, clamp sits at +Vd
    var state = { rc: 0.30, beta: 0.50 };

    // System state
    var sysOut = +Vsat;        // output rail
    var vc = +Vd;              // capacitor voltage clamped at one diode drop
    var triggerActive = 0;     // ms remaining on the visible trigger pulse
    var triggerForce = false;  // request to start a new pulse

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
        absIdx += 1;
        var t = absIdx / SAMPLE_RATE;

        var trigVal = 0;
        if (triggerForce) {
            triggerActive = 60;     // ~ 60 samples ~ 0.30 s of pulse window
            triggerForce = false;
        }
        if (triggerActive > 0) {
            // brief negative pulse magnitude
            trigVal = -1.0;
            triggerActive -= 1;
        }

        var VTH = +state.beta * Vsat;
        var VTL = -state.beta * Vsat;

        // Stable state: sysOut = +Vsat, capacitor clamped at +Vd by the
        // diode (anode at v_C, cathode at ground). A trigger forces sysOut
        // to -Vsat; the diode reverse-biases and the capacitor discharges
        // from +Vd toward -Vsat through R until v_C reaches -beta Vsat,
        // which flips the output back. The diode then reclamps v_C at +Vd.
        var tau = state.rc;
        if (sysOut > 0) {
            vc = +Vd;
            if (trigVal < -0.5) {
                sysOut = -Vsat;
            }
        } else {
            vc += (-Vsat - vc) * (dt / tau);
            if (vc <= VTL) {
                sysOut = +Vsat;
                vc = +Vd;
            }
        }

        head = (head + 1) % N;
        buf.trig[head] = trigVal;
        buf.vc[head]   = vc;
        buf.out[head]  = sysOut;
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
        var cTrig  = window.CMP.cssVar('--c-trigger');
        var cCap   = window.CMP.cssVar('--c-cap');
        var cOut   = window.CMP.cssVar('--c-output');
        var cTh    = window.CMP.cssVar('--c-thresh-h');

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dims.w, dims.h);

        var marL = 64, marR = 30, marT = 28, marB = 38;
        var innerW = dims.w - marL - marR;
        var innerH = dims.h - marT - marB;
        var gap = 10;
        // panel heights: trigger small, vc big, out medium
        var hTrig = (innerH - 2 * gap) * 0.18;
        var hVc   = (innerH - 2 * gap) * 0.50;
        var hOut  = innerH - 2 * gap - hTrig - hVc;

        var trigY0 = marT;
        var vcY0   = trigY0 + hTrig + gap;
        var outY0  = vcY0 + hVc + gap;

        function yToPxTrig(v) {
            return trigY0 + (1 - (v - (-1.2)) / (0.4 - (-1.2))) * hTrig;
        }
        function yToPxVc(v) {
            return vcY0 + (1 - (v - (-1.3)) / (1.3 - (-1.3))) * hVc;
        }
        function yToPxOut(v) {
            return outY0 + (1 - (v - (-1.4)) / (1.4 - (-1.4))) * hOut;
        }

        // ── Trigger panel ──
        drawPanelGrid(ctx, marL, trigY0, innerW, hTrig, grid, gridZ, [0, -1], yToPxTrig);
        ctx.strokeStyle = cTrig;
        ctx.lineWidth = 1.6;
        tracePath(ctx, buf.trig, yToPxTrig, marL, innerW, false);

        // ── v_C panel ──
        drawPanelGrid(ctx, marL, vcY0, innerW, hVc, grid, gridZ,
            [-1, -0.5, 0, 0.5, 1], yToPxVc);
        // Threshold V_TL
        strokeLine(ctx, marL, yToPxVc(-state.beta), marL + innerW, yToPxVc(-state.beta),
            cTh, 1.2, [4, 4]);
        // 0 reference (clamp level approx)
        strokeLine(ctx, marL, yToPxVc(0), marL + innerW, yToPxVc(0),
            window.CMP.cssVar('--c-rail'), 1, [2, 4]);

        ctx.strokeStyle = cCap;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        tracePath(ctx, buf.vc, yToPxVc, marL, innerW, false);

        // ── Output panel ──
        drawPanelGrid(ctx, marL, outY0, innerW, hOut, grid, gridZ, [-1, 0, 1], yToPxOut);
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
        ctx.fillText('0',  marL - 6, yToPxTrig(0));
        ctx.fillText('-1', marL - 6, yToPxTrig(-1));
        [-1, 0, 1].forEach(function (v) { ctx.fillText(v.toFixed(0), marL - 6, yToPxVc(v)); });
        [-1, 1].forEach(function (v) { ctx.fillText(v.toFixed(0), marL - 6, yToPxOut(v)); });

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
        vTitle('trig', trigY0, hTrig);
        vTitle('v_C (V)', vcY0, hVc);
        vTitle('v_out (V)', outY0, hOut);
        ctx.restore();

        // ── Panel labels ──
        ctx.fillStyle = cTrig;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.fillText('trigger pulse', marL + innerW - 8, trigY0 + 4);
        ctx.fillStyle = cCap;
        ctx.fillText('capacitor voltage', marL + innerW - 8, vcY0 + 6);
        ctx.fillStyle = cOut;
        ctx.fillText('comparator output', marL + innerW - 8, outY0 + 6);

        // V_TL label at right edge of vc panel
        ctx.fillStyle = cTh;
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText('−β·Vsat', marL + innerW + 4, yToPxVc(-state.beta));
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
        var rc = document.getElementById('mono-rc');
        var b  = document.getElementById('mono-beta');
        var rcL = document.getElementById('mono-rc-val');
        var bL  = document.getElementById('mono-beta-val');
        var btn = document.getElementById('mono-trigger');
        function update() {
            state.rc   = parseFloat(rc.value);
            state.beta = parseFloat(b.value);
            rcL.textContent = state.rc.toFixed(2) + ' s';
            bL.textContent  = state.beta.toFixed(2);
        }
        [rc, b].forEach(function (el) { el.addEventListener('input', update); });
        btn.addEventListener('click', function () { triggerForce = true; });
        update();

        // Auto-fire one trigger so the user sees the pulse on first arrival.
        setTimeout(function () { triggerForce = true; }, 1500);
        setInterval(function () { if (Math.random() < 0.4) triggerForce = true; }, 4000);
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
