// Section 02 · Bistable scope. Two stacked panels share a time axis.
// Top: input signal v_in (a slow sinusoid) with V_TH = +beta and
// V_TL = -beta thresholds. Bottom: digital output v_out evaluated by a
// running Schmitt rule, so the latch behaviour is visible.
(function () {
    var canvas = document.getElementById('scope-bistable');
    if (!canvas) return;

    var WINDOW_SECS = 6;
    var SAMPLE_RATE = 200;
    var N = WINDOW_SECS * SAMPLE_RATE;

    var buf = {
        sig:  new Float32Array(N),
        out:  new Float32Array(N)
    };
    var head = -1;
    var absIdx = 0;
    var outState = +1;

    var Vsat = 1.0;
    var state = { beta: 0.40, amp: 0.70 };

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

    function inputAt(t) {
        // slow tri-sinusoid that crosses the rails
        return state.amp * Math.sin(2 * Math.PI * 0.40 * t);
    }

    function advanceOne() {
        absIdx += 1;
        var t = absIdx / SAMPLE_RATE;
        var sig = inputAt(t);

        var VTH = +state.beta * Vsat;
        var VTL = -state.beta * Vsat;

        // Inverting Schmitt: output = +Vsat while input < VTL, -Vsat while input > VTH
        if (outState > 0 && sig > VTH) outState = -Vsat;
        else if (outState < 0 && sig < VTL) outState = +Vsat;

        head = (head + 1) % N;
        buf.sig[head] = sig;
        buf.out[head] = outState;
    }

    function primeBuffer() { for (var i = 0; i < N; i++) advanceOne(); }

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
        var cIn    = window.CMP.cssVar('--c-cap');
        var cOut   = window.CMP.cssVar('--c-output');
        var cTh    = window.CMP.cssVar('--c-thresh');
        var cThH   = window.CMP.cssVar('--c-thresh-h');
        var cBand  = window.CMP.cssVar('--c-band');

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dims.w, dims.h);

        var marL = 64, marR = 24, marT = 28, marB = 38;
        var innerW = dims.w - marL - marR;
        var innerH = dims.h - marT - marB;
        var gap = 12;
        var hSig = (innerH - gap) * 0.55;
        var hOut = innerH - gap - hSig;

        var sigY0 = marT;
        var outY0 = sigY0 + hSig + gap;

        var sigMin = -1.3, sigMax = 1.3;
        function yToPxSig(v) {
            return sigY0 + (1 - (v - sigMin) / (sigMax - sigMin)) * hSig;
        }
        var outMin = -1.4, outMax = 1.4;
        function yToPxOut(v) {
            return outY0 + (1 - (v - outMin) / (outMax - outMin)) * hOut;
        }

        // ── Signal panel ──
        // Hysteresis band
        var bandTop = yToPxSig(+state.beta);
        var bandBot = yToPxSig(-state.beta);
        ctx.fillStyle = cBand;
        ctx.fillRect(marL, bandTop, innerW, bandBot - bandTop);

        drawPanelGrid(ctx, marL, sigY0, innerW, hSig, grid, gridZ,
            [-1, -0.5, 0, 0.5, 1], yToPxSig);

        // Threshold lines
        strokeLine(ctx, marL, yToPxSig(+state.beta), marL + innerW, yToPxSig(+state.beta),
            cThH, 1.2, [4, 4]);
        strokeLine(ctx, marL, yToPxSig(-state.beta), marL + innerW, yToPxSig(-state.beta),
            cThH, 1.2, [4, 4]);
        strokeLine(ctx, marL, yToPxSig(0), marL + innerW, yToPxSig(0),
            cTh, 1, [2, 4]);

        ctx.strokeStyle = cIn;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        tracePath(ctx, buf.sig, yToPxSig, marL, innerW, false);

        // ── Output panel ──
        drawPanelGrid(ctx, marL, outY0, innerW, hOut, grid, gridZ,
            [-1, 0, 1], yToPxOut);
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
        [-1, 0, 1].forEach(function (v) {
            ctx.fillText(v.toFixed(0), marL - 6, yToPxSig(v));
        });
        [-1, 1].forEach(function (v) {
            ctx.fillText(v.toFixed(0), marL - 6, yToPxOut(v));
        });

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
        vTitle('input v_in (V)', sigY0, hSig);
        vTitle('output v_out (V)', outY0, hOut);
        ctx.restore();

        // ── Panel labels ──
        ctx.fillStyle = muted;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.fillText('input + thresholds', marL + innerW - 8, sigY0 + 6);
        ctx.fillStyle = cOut;
        ctx.fillText('latched output', marL + innerW - 8, outY0 + 6);

        // Threshold value labels at right edge of signal panel
        ctx.fillStyle = cThH;
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText('+β·Vsat', marL + innerW + 4, yToPxSig(+state.beta));
        ctx.fillText('−β·Vsat', marL + innerW + 4, yToPxSig(-state.beta));
    }

    var running = false;
    var raf = 0;
    var lastNow = 0;
    var sampleAcc = 0;

    function tick(now) {
        if (!running) return;
        var dt = (now - lastNow) / 1000;
        lastNow = now;
        if (dt > 0.1) dt = 0.1;
        sampleAcc += dt * SAMPLE_RATE;
        var nNew = Math.floor(sampleAcc);
        sampleAcc -= nNew;
        if (nNew > N) nNew = N;
        for (var k = 0; k < nNew; k++) advanceOne();
        draw();
        raf = requestAnimationFrame(tick);
    }
    function start() { if (running) return; running = true; lastNow = performance.now(); raf = requestAnimationFrame(tick); }
    function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    function bind() {
        var b = document.getElementById('bi-beta');
        var a = document.getElementById('bi-amp');
        var bL = document.getElementById('bi-beta-val');
        var aL = document.getElementById('bi-amp-val');
        function update() {
            state.beta = parseFloat(b.value);
            state.amp  = parseFloat(a.value);
            bL.textContent = state.beta.toFixed(2);
            aL.textContent = state.amp.toFixed(2);
        }
        [b, a].forEach(function (el) { el.addEventListener('input', update); });
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
