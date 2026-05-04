// Section 03 · Monostable scope. Three stacked panels: trigger pulse on
// the TRIG pin, capacitor voltage v_C, and the output OUT. At rest v_C is
// held near 0 V by the discharge transistor and OUT sits low. A negative
// trigger pulse on TRIG causes OUT to go high, the discharge transistor
// to release the capacitor, and v_C to rise along an exponential through
// R toward V_CC. When v_C reaches 2/3 V_CC the latch is reset, OUT
// returns to low, and the discharge transistor pulls v_C rapidly back to
// 0 V.
(function () {
    var canvas = document.getElementById('scope-monostable');
    if (!canvas) return;

    var WINDOW_SECS = 6;
    var SAMPLE_RATE = 200;
    var N = WINDOW_SECS * SAMPLE_RATE;

    var Vcc = 1.0;
    var TH = (2 / 3) * Vcc;
    var TL = (1 / 3) * Vcc;

    var buf = {
        trig: new Float32Array(N),
        vc:   new Float32Array(N),
        out:  new Float32Array(N)
    };
    var head = -1;

    var state = { r: 0.30, c: 1.0 };

    var sysOut = 0;               // OUT pin: 0 (low) at rest
    var vc = 0;                   // capacitor at rest, held by discharge transistor
    var trigCountdown = 0;        // samples of trigger pulse remaining
    var trigForce = false;
    var trigArmed = true;         // can a new trigger fire? (false during pulse)

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
        // TRIG signal: rest at Vcc; goes briefly to 0 on a trigger pulse.
        var trigVal = Vcc;
        if (trigForce && trigArmed) {
            trigCountdown = 16;       // ~ 80 ms pulse window at 200 Hz
            trigForce = false;
        }
        if (trigCountdown > 0) {
            trigVal = 0;
            trigCountdown -= 1;
            if (sysOut < Vcc / 2 && trigArmed) {
                // Negative trigger latches OUT high
                sysOut = Vcc;
                trigArmed = false;
            }
        }

        var tau = state.r * state.c;
        if (sysOut > Vcc / 2) {
            // Output high → cap charges through R toward V_CC
            vc += (Vcc - vc) * (dt / tau);
            if (vc >= TH) {
                sysOut = 0;
                trigArmed = true;
            }
        } else {
            // Output low → discharge transistor active, cap pulled to 0 fast
            vc += (0 - vc) * (dt / (tau * 0.04));   // very short discharge time constant
            if (vc < 0.005) vc = 0;
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
        var hTrig = (innerH - 2 * gap) * 0.20;
        var hVc   = (innerH - 2 * gap) * 0.50;
        var hOut  = innerH - 2 * gap - hTrig - hVc;

        var trigY0 = marT;
        var vcY0   = trigY0 + hTrig + gap;
        var outY0  = vcY0 + hVc + gap;

        function yToPxTrig(v) {
            return trigY0 + (1 - (v - (-0.10)) / (Vcc + 0.20)) * hTrig;
        }
        function yToPxVc(v) {
            return vcY0 + (1 - (v - (-0.05)) / (Vcc + 0.10)) * hVc;
        }
        function yToPxOut(v) {
            return outY0 + (1 - (v - (-0.10)) / (Vcc + 0.20)) * hOut;
        }

        // Trigger panel
        drawPanelGrid(ctx, marL, trigY0, innerW, hTrig, grid, gridZ, [0, Vcc], yToPxTrig);
        ctx.strokeStyle = cTrig;
        ctx.lineWidth = 1.6;
        tracePath(ctx, buf.trig, yToPxTrig, marL, innerW, true);

        // v_C panel
        drawPanelGrid(ctx, marL, vcY0, innerW, hVc, grid, gridZ,
            [0, TL, TH, Vcc], yToPxVc);
        strokeLine(ctx, marL, yToPxVc(TH), marL + innerW, yToPxVc(TH),
            cTh, 1.4, [4, 4]);
        strokeLine(ctx, marL, yToPxVc(TL), marL + innerW, yToPxVc(TL),
            cTh, 1.4, [4, 4]);

        ctx.strokeStyle = cCap;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        tracePath(ctx, buf.vc, yToPxVc, marL, innerW, false);

        // Output panel
        drawPanelGrid(ctx, marL, outY0, innerW, hOut, grid, gridZ, [0, Vcc], yToPxOut);
        ctx.strokeStyle = cOut;
        ctx.lineWidth = 2.0;
        tracePath(ctx, buf.out, yToPxOut, marL, innerW, true);

        // Tick labels
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
        ctx.fillText('0',   marL - 6, yToPxTrig(0));
        ctx.fillText('Vcc', marL - 6, yToPxTrig(Vcc));
        ctx.fillText('0',         marL - 6, yToPxVc(0));
        ctx.fillText('Vcc/3',     marL - 6, yToPxVc(TL));
        ctx.fillText('2Vcc/3',    marL - 6, yToPxVc(TH));
        ctx.fillText('Vcc',       marL - 6, yToPxVc(Vcc));
        ctx.fillText('0',   marL - 6, yToPxOut(0));
        ctx.fillText('Vcc', marL - 6, yToPxOut(Vcc));

        // Axis titles
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
        vTitle('TRIG', trigY0, hTrig);
        vTitle('v_C (V)', vcY0, hVc);
        vTitle('OUT (V)', outY0, hOut);
        ctx.restore();

        // Panel labels
        ctx.fillStyle = cTrig;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.fillText('TRIG (pin 2)', marL + innerW - 8, trigY0 + 4);
        ctx.fillStyle = cCap;
        ctx.fillText('capacitor voltage', marL + innerW - 8, vcY0 + 6);
        ctx.fillStyle = cOut;
        ctx.fillText('OUT (pin 3)', marL + innerW - 8, outY0 + 6);

        // Pulse-width readout
        var pulseT = Math.log(3) * state.r * state.c;
        ctx.fillStyle = fg;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText('T = ln(3)·RC ≈ ' + pulseT.toFixed(2) + ' s',
            marL + 8, vcY0 + 6);
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
        var r = document.getElementById('mono-r');
        var c = document.getElementById('mono-c');
        var rL = document.getElementById('mono-r-val');
        var cL = document.getElementById('mono-c-val');
        var btn = document.getElementById('mono-trigger');
        function update() {
            state.r = parseFloat(r.value);
            state.c = parseFloat(c.value);
            rL.textContent = state.r.toFixed(2);
            cL.textContent = state.c.toFixed(2);
        }
        [r, c].forEach(function (el) { el.addEventListener('input', update); });
        btn.addEventListener('click', function () { trigForce = true; });
        update();

        // Auto-fire one trigger so the user sees the pulse on first arrival,
        // then occasionally if the user hasn't been pressing the button.
        setTimeout(function () { trigForce = true; }, 1500);
        setInterval(function () { if (Math.random() < 0.35) trigForce = true; }, 4500);
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
