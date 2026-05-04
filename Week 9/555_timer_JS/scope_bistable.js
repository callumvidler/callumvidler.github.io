// Section 04 · Bistable scope. Three stacked panels: SET pulse on TRIG
// (pin 2), RESET pulse on RESET (pin 4), and OUT (pin 3). The SR latch is
// directly driven by the two active-low inputs; the output is latched on
// SET, cleared on RESET, and otherwise holds its last value.
(function () {
    var canvas = document.getElementById('scope-bistable');
    if (!canvas) return;

    var WINDOW_SECS = 6;
    var SAMPLE_RATE = 200;
    var N = WINDOW_SECS * SAMPLE_RATE;

    var Vcc = 1.0;

    var buf = {
        set: new Float32Array(N),
        rst: new Float32Array(N),
        out: new Float32Array(N)
    };
    var head = -1;

    var sysOut = 0;
    var setCountdown = 0;
    var rstCountdown = 0;
    var setForce = false;
    var rstForce = false;

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

    function advanceOne() {
        var setVal = Vcc, rstVal = Vcc;
        if (setForce) { setCountdown = 16; setForce = false; }
        if (rstForce) { rstCountdown = 16; rstForce = false; }
        if (setCountdown > 0) {
            setVal = 0; setCountdown -= 1;
            sysOut = Vcc;          // active-low SET latches output high
        }
        if (rstCountdown > 0) {
            rstVal = 0; rstCountdown -= 1;
            sysOut = 0;            // active-low RESET clears output (overrides SET if both)
        }
        head = (head + 1) % N;
        buf.set[head] = setVal;
        buf.rst[head] = rstVal;
        buf.out[head] = sysOut;
    }

    function primeBuffer() {
        for (var i = 0; i < N; i++) advanceOne();
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
        var cThresh= window.CMP.cssVar('--c-thresh');
        var cOut   = window.CMP.cssVar('--c-output');

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dims.w, dims.h);

        var marL = 64, marR = 30, marT = 28, marB = 38;
        var innerW = dims.w - marL - marR;
        var innerH = dims.h - marT - marB;
        var gap = 10;
        var hSet = (innerH - 2 * gap) * 0.25;
        var hRst = (innerH - 2 * gap) * 0.25;
        var hOut = innerH - 2 * gap - hSet - hRst;

        var setY0 = marT;
        var rstY0 = setY0 + hSet + gap;
        var outY0 = rstY0 + hRst + gap;

        function yToPxSet(v) { return setY0 + (1 - (v - (-0.10)) / (Vcc + 0.20)) * hSet; }
        function yToPxRst(v) { return rstY0 + (1 - (v - (-0.10)) / (Vcc + 0.20)) * hRst; }
        function yToPxOut(v) { return outY0 + (1 - (v - (-0.10)) / (Vcc + 0.20)) * hOut; }

        // SET panel
        drawPanelGrid(ctx, marL, setY0, innerW, hSet, grid, gridZ, [0, Vcc], yToPxSet);
        ctx.strokeStyle = cTrig;
        ctx.lineWidth = 1.6;
        tracePath(ctx, buf.set, yToPxSet, marL, innerW, true);

        // RESET panel
        drawPanelGrid(ctx, marL, rstY0, innerW, hRst, grid, gridZ, [0, Vcc], yToPxRst);
        ctx.strokeStyle = cThresh;
        ctx.lineWidth = 1.6;
        tracePath(ctx, buf.rst, yToPxRst, marL, innerW, true);

        // OUT panel
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
        ctx.fillText('0',   marL - 6, yToPxSet(0));
        ctx.fillText('Vcc', marL - 6, yToPxSet(Vcc));
        ctx.fillText('0',   marL - 6, yToPxRst(0));
        ctx.fillText('Vcc', marL - 6, yToPxRst(Vcc));
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
        vTitle('SET', setY0, hSet);
        vTitle('RESET', rstY0, hRst);
        vTitle('OUT (V)', outY0, hOut);
        ctx.restore();

        // Panel labels
        ctx.fillStyle = cTrig;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.fillText('SET pulse (active low)', marL + innerW - 8, setY0 + 4);
        ctx.fillStyle = cThresh;
        ctx.fillText('RESET pulse (active low)', marL + innerW - 8, rstY0 + 4);
        ctx.fillStyle = cOut;
        ctx.fillText('OUT (latched)', marL + innerW - 8, outY0 + 6);
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
        for (var k = 0; k < nNew; k++) advanceOne();
        draw();
        raf = requestAnimationFrame(tick);
    }
    function start() { if (running) return; running = true; lastNow = performance.now(); raf = requestAnimationFrame(tick); }
    function stop()  { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    function bind() {
        var setBtn = document.getElementById('bi-set');
        var rstBtn = document.getElementById('bi-reset');
        setBtn.addEventListener('click', function () { setForce = true; });
        rstBtn.addEventListener('click', function () { rstForce = true; });

        // Auto-demo: alternating SET / RESET so the panel shows activity
        // even before the user interacts with the buttons.
        var demoStep = 0;
        setInterval(function () {
            if (Math.random() < 0.6) {
                if (demoStep % 2 === 0) setForce = true; else rstForce = true;
                demoStep += 1;
            }
        }, 2400);
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
