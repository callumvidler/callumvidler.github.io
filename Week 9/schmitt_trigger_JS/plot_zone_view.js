// Section 02 RHS · Operating zones overlaid on a live test signal.
// Canvas2D scrolling oscilloscope. The vertical axis is voltage; the
// horizontal axis is time. Three horizontal background bands mark the
// non-inverting Schmitt's operating zones:
//   v_in > V_TH : output forced HIGH (green)
//   V_TL ≤ v_in ≤ V_TH : memory zone (yellow)
//   v_in < V_TL : output forced LOW  (red)
// A sine test signal scrolls through the bands; the Schmitt state is
// advanced sample by sample so the running v_out reflects the true
// hysteresis history. The cursor at the right edge tracks the latest
// sample and is colour-coded by the current rail.
//
// This file owns the slider DOM events and shared state. It dispatches
// 'sch-update' at ~10 Hz so the live circuit beside it shows the
// instantaneous v_in without thrashing the SVG redraw.
(function () {
    var Vsat = 5;
    var WINDOW_SECS = 6;
    var SAMPLE_RATE = 200;
    var N = WINDOW_SECS * SAMPLE_RATE;

    window.SCH = window.SCH || {};
    window.SCH.state = window.SCH.state || {
        beta: 0.20, probe: 0, branch: +1, amp: 2.20, freq: 0.40
    };

    var canvas;
    var dims = { w: 0, h: 0, dpr: 1 };

    var buf = {
        sig: new Float32Array(N),
        t:   new Float32Array(N)
    };
    var head = -1;
    var absIdx = 0;

    function ratio(beta) { return beta / (1 - beta); }
    function thresholds(s) {
        var k = ratio(s.beta);
        return { VTH: +Vsat * k, VTL: -Vsat * k };
    }
    function fmt(v) {
        var sign = v >= 0 ? '+' : '';
        return sign + v.toFixed(2);
    }

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

    // Test signal shape:
    //   tanh(3·sin(phase)) gives a wave that lingers near ±1 with a
    //   short steep transition through 0. Multiplied by the user-set
    //   amplitude this gives clear plateaus inside the force-HIGH and
    //   force-LOW zones. A small fast ripple is added so the eye can
    //   verify that local fluctuations within a zone do not produce
    //   spurious output transitions; only the genuine large excursion
    //   between plateaus crosses a threshold and flips the output.
    var RIPPLE_AMP  = 0.18;
    var RIPPLE_FREQ = 1.6;
    var SHAPE_K     = 3.0;

    function advanceOne() {
        var s = window.SCH.state;
        absIdx += 1;
        var t = absIdx / SAMPLE_RATE;

        var phase = 2 * Math.PI * s.freq * t;
        var slow = s.amp * Math.tanh(SHAPE_K * Math.sin(phase));
        var ripple = RIPPLE_AMP * Math.sin(2 * Math.PI * RIPPLE_FREQ * t);
        var sig = slow + ripple;

        var th = thresholds(s);
        if (s.branch < 0 && sig > th.VTH) s.branch = +1;
        else if (s.branch > 0 && sig < th.VTL) s.branch = -1;

        head = (head + 1) % N;
        buf.sig[head] = sig;
        buf.t[head]   = t;

        // Expose current sample so the live circuit shows live v_in.
        s.probe = sig;
    }

    function primeBuffer() { for (var i = 0; i < N; i++) advanceOne(); }

    function draw() {
        var s = window.SCH.state;
        var th = thresholds(s);
        var ctx = canvas.getContext('2d');

        var bg       = window.CMP.cssVar('--bg-2');
        var border   = window.CMP.cssVar('--border');
        var grid     = window.CMP.cssVar('--grid-line');
        var gridZero = window.CMP.cssVar('--grid-zero');
        var muted    = window.CMP.cssVar('--muted');
        var fg       = window.CMP.cssVar('--fg');
        var cInput   = window.CMP.cssVar('--c-input');
        var cHigh    = window.CMP.cssVar('--c-output2');
        var cLow     = window.CMP.cssVar('--c-thresh');
        var cMem     = window.CMP.cssVar('--c-band');

        var greenFill = window.T.isDark ? 'rgba(123, 224, 137, 0.10)'
                                        : 'rgba(47, 143, 63, 0.08)';
        var redFill   = window.T.isDark ? 'rgba(255, 92, 122, 0.12)'
                                        : 'rgba(220, 38, 38, 0.08)';

        var marL = 56, marR = 30, marT = 78, marB = 38;
        var innerW = dims.w - marL - marR;
        var innerH = dims.h - marT - marB;

        var yMin = -3.5, yMax = 3.5;
        function yToPx(v) {
            return marT + (1 - (v - yMin) / (yMax - yMin)) * innerH;
        }

        // Background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, dims.w, dims.h);

        // Zone background stripes
        var yTH = yToPx(Math.max(yMin, Math.min(yMax, th.VTH)));
        var yTL = yToPx(Math.max(yMin, Math.min(yMax, th.VTL)));
        if (th.VTH < yMax) {
            ctx.fillStyle = greenFill;
            ctx.fillRect(marL, marT, innerW, yTH - marT);
        }
        if (th.VTL < th.VTH) {
            ctx.fillStyle = cMem;
            ctx.fillRect(marL, yTH, innerW, yTL - yTH);
        }
        if (th.VTL > yMin) {
            ctx.fillStyle = redFill;
            ctx.fillRect(marL, yTL, innerW, marT + innerH - yTL);
        }

        // Grid lines (voltage)
        ctx.strokeStyle = grid;
        ctx.lineWidth = 1;
        [-3, -2, -1, 1, 2, 3].forEach(function (v) {
            var py = yToPx(v);
            ctx.beginPath();
            ctx.moveTo(marL, py); ctx.lineTo(marL + innerW, py);
            ctx.stroke();
        });
        // Bold zero line
        ctx.strokeStyle = gridZero;
        ctx.beginPath();
        ctx.moveTo(marL, yToPx(0));
        ctx.lineTo(marL + innerW, yToPx(0));
        ctx.stroke();

        // Threshold dashed lines
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = cHigh;
        ctx.beginPath();
        ctx.moveTo(marL, yToPx(th.VTH)); ctx.lineTo(marL + innerW, yToPx(th.VTH));
        ctx.stroke();
        ctx.strokeStyle = cLow;
        ctx.beginPath();
        ctx.moveTo(marL, yToPx(th.VTL)); ctx.lineTo(marL + innerW, yToPx(th.VTL));
        ctx.stroke();
        ctx.setLineDash([]);

        // Test signal trace
        if (head >= 0) {
            var currentT = buf.t[head];
            var start = (head + 1) % N;
            ctx.strokeStyle = cInput;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (var i = 0; i < N; i++) {
                var idx = (start + i) % N;
                var rel = (buf.t[idx] - (currentT - WINDOW_SECS)) / WINDOW_SECS;
                var px = marL + rel * innerW;
                var py = yToPx(buf.sig[idx]);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Cursor at the right edge tracking the latest sample.
            var cursorColor = s.branch > 0 ? cHigh : cLow;
            var mx = marL + innerW;
            var my = yToPx(buf.sig[head]);
            ctx.fillStyle = cursorColor;
            ctx.strokeStyle = bg;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(mx, my, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }

        // Plot border
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.strokeRect(marL + 0.5, marT + 0.5, innerW - 1, innerH - 1);

        // Y tick labels
        ctx.fillStyle = muted;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        [-3, -2, -1, 0, 1, 2, 3].forEach(function (v) {
            ctx.fillText(v.toFixed(0), marL - 6, yToPx(v));
        });

        // Threshold inline labels (right side, sit on the dashed line)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = cHigh;
        ctx.fillText('V_TH = ' + fmt(th.VTH) + ' V',
            marL + innerW - 6, yToPx(th.VTH) - 2);
        ctx.fillStyle = cLow;
        ctx.textBaseline = 'top';
        ctx.fillText('V_TL = ' + fmt(th.VTL) + ' V',
            marL + innerW - 6, yToPx(th.VTL) + 2);

        // Zone labels along the left interior
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = cHigh;
        if ((yTH - marT) > 22) {
            ctx.fillText('FORCE HIGH', marL + 6, (marT + yTH) / 2);
        }
        ctx.fillStyle = muted;
        if ((yTL - yTH) > 22) {
            ctx.fillText('MEMORY', marL + 6, (yTH + yTL) / 2);
        }
        ctx.fillStyle = cLow;
        if ((marT + innerH - yTL) > 22) {
            ctx.fillText('FORCE LOW', marL + 6, (yTL + marT + innerH) / 2);
        }

        // Time axis tick labels
        ctx.fillStyle = muted;
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (var k = 0; k <= WINDOW_SECS; k++) {
            var tx = marL + (k / WINDOW_SECS) * innerW;
            var lab = (k === WINDOW_SECS) ? '0' : '-' + (WINDOW_SECS - k) + 's';
            ctx.fillText(lab, tx, marT + innerH + 6);
        }

        // Y-axis title (rotated)
        ctx.save();
        ctx.translate(18, marT + innerH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = fg;
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('voltage (V)', 0, 0);
        ctx.restore();

        // X-axis title
        ctx.fillStyle = fg;
        ctx.font = "500 12px 'Inter', system-ui, sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('time (relative, s)',
            marL + innerW / 2, marT + innerH + 20);

        // State badge as a KaTeX HTML overlay (top-right, clear of the title)
        updateStateBadge(s);
    }

    function updateStateBadge(s) {
        var box = canvas.closest('.plot-box');
        if (!box) return;
        var badge = box.querySelector('.state-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'state-badge';
            box.appendChild(badge);
        }
        var cHigh = window.CMP.cssVar('--c-output2');
        var cLow  = window.CMP.cssVar('--c-thresh');
        badge.style.color = s.branch > 0 ? cHigh : cLow;
        var tex = s.branch > 0
            ? 'v_\\text{out} = +V_\\text{sat}'
            : 'v_\\text{out} = -V_\\text{sat}';
        if (window.katex && badge.dataset.tex !== tex) {
            window.katex.render(tex, badge,
                { throwOnError: false, displayMode: false });
            badge.dataset.tex = tex;
        }
    }

    var running = false;
    var raf = 0;
    var lastNow = 0;
    var sampleAcc = 0;
    var lastDispatch = 0;

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

        // Throttle the live-circuit refresh to ~10 Hz; any faster and the
        // SVG redraw becomes the bottleneck.
        if (now - lastDispatch > 100) {
            window.dispatchEvent(new CustomEvent('sch-update'));
            lastDispatch = now;
        }
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
        var b  = document.getElementById('sch-beta');
        var bL = document.getElementById('sch-beta-val');
        var a  = document.getElementById('sch-amp');
        var aL = document.getElementById('sch-amp-val');
        var f  = document.getElementById('sch-freq');
        var fL = document.getElementById('sch-freq-val');
        if (!b) return;

        function update() {
            var s = window.SCH.state;
            s.beta = parseFloat(b.value);
            if (a) s.amp  = parseFloat(a.value);
            if (f) s.freq = parseFloat(f.value);
            bL.textContent = s.beta.toFixed(2);
            if (aL) aL.textContent = s.amp.toFixed(2) + ' V';
            if (fL) fL.textContent = s.freq.toFixed(2) + ' Hz';
            window.dispatchEvent(new CustomEvent('sch-update'));
        }
        [b, a, f].forEach(function (el) {
            if (el) el.addEventListener('input', update);
        });
        update();
    }

    function init() {
        canvas = document.getElementById('plot-zone-view');
        if (!canvas) return;

        setupCanvas();
        bind();
        primeBuffer();
        draw();

        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) start();
                else stop();
            }
        }, { threshold: 0.15 });
        io.observe(canvas);

        window.addEventListener('themechange', function () { draw(); });
        window.addEventListener('resize', function () {
            setupCanvas(); draw();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();
