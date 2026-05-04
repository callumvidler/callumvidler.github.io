// Section 04 · Time-domain oscillator output, drawn on Canvas2D for smooth
// animation of the start-up envelope. The signal model is a sinusoid at
// w0 = 1/RC with a soft-saturating exponential envelope whose growth rate
// is set by the loop gain A*beta.
(function () {
    var canvas = document.getElementById('scope-oscillator');
    var overlay = document.getElementById('scope-oscillator-overlay');
    if (!canvas || !overlay) return;

    var R_FIXED = 10000;     // 10 kOhm, Wien arm resistor
    var BETA    = 1 / 3;     // Wien network feedback fraction at omega_0

    var state = {
        loopGain: 1.20,      // Aβ, computed from A and BETA
        RC: 0.100,           // s, computed from R_FIXED and C
        startedAt: 0,
        running: false,
        paused: false,
        T_total: 1.0,        // seconds shown on the x-axis (fixed)
        seed: 0.02,          // thermal-noise seed amplitude (V), used when Aβ > 1
        A0: 0.55,            // perturbation amplitude (V), used when Aβ ≤ 1
        Asat: 0.95           // saturation amplitude (V)
    };

    var dims = { w: 0, h: 0, dpr: 1 };
    var margin = { top: 28, right: 28, bottom: 50, left: 76 };

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

    function envelope(t) {
        // Two regimes for the envelope, separated by the Barkhausen threshold:
        //   Aβ > 1: a thermal-noise seed grows under exp(σ t) and soft-saturates
        //           at the rail (tanh model).
        //   Aβ ≤ 1: an initial perturbation A0 evolves under exp(σ t), giving
        //           visible exponential decay (or a constant trace at Aβ = 1).
        var omega0 = 1 / state.RC;
        var sigma  = 0.5 * (state.loopGain - 1) * omega0;
        var e;
        if (sigma > 0) {
            var arg = state.seed * Math.exp(sigma * t);
            e = state.Asat * Math.tanh(arg);
        } else {
            e = state.A0 * Math.exp(sigma * t);
        }
        return { env: e, omega0: omega0, sigma: sigma };
    }

    function signal(t) {
        var r = envelope(t);
        var y = r.env * Math.sin(r.omega0 * t);
        return y;
    }

    function tickFormatT(t, T) {
        if (T <= 0.5) {
            // milliseconds
            var ms = t * 1000;
            return (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';
        }
        if (T <= 5) {
            return t.toFixed(t < 1 ? 2 : 1) + ' s';
        }
        return t.toFixed(0) + ' s';
    }
    function chooseTickStep(T) {
        var raw = T / 6;                                 // target ~6 ticks
        var pow = Math.pow(10, Math.floor(Math.log10(raw)));
        var n = raw / pow;
        var step;
        if (n < 1.5)      step = 1 * pow;
        else if (n < 3)   step = 2 * pow;
        else if (n < 7)   step = 5 * pow;
        else              step = 10 * pow;
        return step;
    }

    function draw(elapsed) {
        var ctx = canvas.getContext('2d');
        var T = window.T;
        var W = dims.w, H = dims.h;
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        ctx.clearRect(0, 0, W, H);

        // Plot background
        ctx.fillStyle = window.CMP.cssVar('--bg-2');
        ctx.fillRect(0, 0, W, H);

        // Grid
        var gridLine = window.CMP.cssVar('--grid-line');
        var gridZero = window.CMP.cssVar('--grid-zero');
        var tickLine = window.CMP.cssVar('--tick-line');

        function xPx(t) { return margin.left + (t / state.T_total) * innerW; }
        function yPx(v) { return margin.top + ((1.2 - v) / 2.4) * innerH; }

        // Vertical gridlines at the chosen tick step
        ctx.strokeStyle = gridLine;
        ctx.lineWidth = 1;
        var tStep = chooseTickStep(state.T_total);
        for (var ti = 0; ti <= state.T_total + 1e-9; ti += tStep) {
            ctx.beginPath();
            ctx.moveTo(xPx(ti), margin.top);
            ctx.lineTo(xPx(ti), margin.top + innerH);
            ctx.stroke();
        }
        // Horizontal gridlines at v = -1, -0.5, 0.5, 1.0
        var yGrid = [-1.0, -0.5, 0.5, 1.0];
        for (var i = 0; i < yGrid.length; i++) {
            ctx.beginPath();
            ctx.moveTo(margin.left, yPx(yGrid[i]));
            ctx.lineTo(margin.left + innerW, yPx(yGrid[i]));
            ctx.stroke();
        }
        // Zero line bold
        ctx.strokeStyle = gridZero;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(margin.left, yPx(0));
        ctx.lineTo(margin.left + innerW, yPx(0));
        ctx.stroke();

        // Plot frame
        ctx.strokeStyle = tickLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(margin.left, margin.top, innerW, innerH);

        // Visible time window: 0..min(elapsed, T_total)
        var tEnd = Math.min(elapsed, state.T_total);
        // Sample density scales with omega0 so high-frequency cases stay smooth.
        var omega0 = 1 / state.RC;
        var n = Math.max(800, Math.ceil(omega0 * state.T_total * 12));
        var dt = state.T_total / n;
        var iEnd = Math.max(2, Math.ceil(tEnd / dt));

        // Envelope (faint dashed)
        var envColor = window.CMP.cssVar('--c-thresh');
        ctx.strokeStyle = envColor;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([5, 4]);
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        for (var k = 0; k <= iEnd; k++) {
            var tk = k * dt;
            var ek = envelope(tk).env;
            var px = xPx(tk), py = yPx(ek);
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.beginPath();
        for (var k2 = 0; k2 <= iEnd; k2++) {
            var tk2 = k2 * dt;
            var ek2 = envelope(tk2).env;
            var px2 = xPx(tk2), py2 = yPx(-ek2);
            if (k2 === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);

        // Trace
        var traceColor = window.CMP.cssVar('--c-output');
        ctx.strokeStyle = traceColor;
        ctx.lineWidth = 2.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (var j = 0; j <= iEnd; j++) {
            var t = j * dt;
            var v = signal(t);
            var px3 = xPx(t), py3 = yPx(v);
            if (j === 0) ctx.moveTo(px3, py3); else ctx.lineTo(px3, py3);
        }
        ctx.stroke();

        // Playhead
        if (elapsed < state.T_total) {
            ctx.strokeStyle = window.T.fg(0.35);
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(xPx(tEnd), margin.top);
            ctx.lineTo(xPx(tEnd), margin.top + innerH);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Axis tick labels (plain text — purely numeric, no math)
        ctx.fillStyle = window.T.textDim;
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (var ti2 = 0; ti2 <= state.T_total + 1e-9; ti2 += tStep) {
            ctx.fillText(tickFormatT(ti2, state.T_total),
                         xPx(ti2), margin.top + innerH + 6);
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        var yTicks = [-1.0, -0.5, 0, 0.5, 1.0];
        for (var yi = 0; yi < yTicks.length; yi++) {
            var v = yTicks[yi];
            ctx.fillText(v.toFixed(1) + ' V', margin.left - 8, yPx(v));
        }

        // Phase annotations: noise-seed, growth, steady state
        ctx.fillStyle = window.T.textDim;
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        var labelY = margin.top + 8;
        if (state.loopGain > 1.001) {
            ctx.fillText('seed', xPx(0.05), labelY);
            ctx.fillText('exponential growth', xPx(state.T_total * 0.32), labelY);
            ctx.fillText('steady state', xPx(state.T_total * 0.78), labelY);
        } else if (state.loopGain < 0.999) {
            ctx.fillText('damped: loop gain < 1', xPx(0.05), labelY);
        } else {
            ctx.fillText('marginal: loop gain = 1', xPx(0.05), labelY);
        }
    }

    // ── Overlay SVG: KaTeX axis titles ──────────────────────────────
    function renderOverlay() {
        var rect = canvas.getBoundingClientRect();
        var W = rect.width, H = rect.height;

        var svg = d3.select(overlay);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + W + ' ' + H)
           .attr('preserveAspectRatio', 'none');

        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        // x-axis title (single-quadrant rule: t >= 0)
        window.renderKatex(svg, 't \\, [\\mathrm{s}]',
            margin.left + innerW / 2, H - 14,
            { width: 100, height: 22, size: 14 });
        // y-axis title (rotated -90)
        window.renderKatex(svg, 'v_\\text{out} \\, [\\mathrm{V}]',
            22, margin.top + innerH / 2,
            { width: 140, height: 22, rotate: -90, size: 14 });
    }

    // ── Animation loop ──────────────────────────────────────────────
    var ANIM_WALL = 5;   // seconds of wall-clock per full sweep
    var raf = 0;
    function loop() {
        if (!state.running || state.paused) { raf = 0; return; }
        var elapsedWall = (performance.now() - state.startedAt) / 1000;
        var t = (elapsedWall / ANIM_WALL) * state.T_total;
        draw(t);
        if (elapsedWall < ANIM_WALL + 0.6) {
            raf = requestAnimationFrame(loop);
        } else {
            draw(state.T_total);
            raf = 0;
            state.running = false;
        }
    }
    function start() {
        state.startedAt = performance.now();
        state.running = true;
        state.paused = false;
        if (!raf) raf = requestAnimationFrame(loop);
    }
    function pause() {
        state.paused = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    }
    function resume() {
        if (!state.running) return;
        state.paused = false;
        // Re-anchor startedAt so elapsed time continues from where it was.
        // Quick approach: restart from t=0 to keep the model simple.
        state.startedAt = performance.now();
        if (!raf) raf = requestAnimationFrame(loop);
    }

    // ── IntersectionObserver: pause when offscreen ──────────────────
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) {
                if (!state.running) start();
                else if (state.paused) resume();
            } else {
                pause();
            }
        });
    }, { threshold: 0.15 });
    io.observe(canvas);

    // ── Bind controls ───────────────────────────────────────────────
    function bind() {
        var loopEl = document.getElementById('osc-loop');
        var rcEl   = document.getElementById('osc-rc');
        var loopLab= document.getElementById('osc-loop-val');
        var rcLab  = document.getElementById('osc-rc-val');
        var resetBtn = document.getElementById('osc-reset');

        function update() {
            var A = parseFloat(loopEl.value);
            var C_uF = parseFloat(rcEl.value);
            state.loopGain = A * BETA;
            state.RC       = R_FIXED * C_uF * 1e-6;
            var regime = state.loopGain > 1.0005 ? 'growing'
                       : state.loopGain < 0.9995 ? 'decaying'
                       : 'threshold';
            var cVal = C_uF >= 1 ? C_uF.toFixed(1) + ' µF'
                                 : (C_uF * 1000).toFixed(0) + ' nF';
            var rcVal = state.RC >= 0.5 ? state.RC.toFixed(2) + ' s'
                                        : (state.RC * 1000).toFixed(2) + ' ms';
            loopLab.textContent = A.toFixed(2) + ' · Aβ=' + state.loopGain.toFixed(3)
                                + ' · ' + regime;
            rcLab.textContent   = cVal + ' · RC = ' + rcVal;
            start();
        }
        [loopEl, rcEl].forEach(function (el) { el.addEventListener('input', update); });
        resetBtn.addEventListener('click', function () { start(); });
        update();
    }

    function resize() {
        setupCanvas();
        renderOverlay();
        var t = state.T_total;
        if (state.running) {
            var elapsedWall = (performance.now() - state.startedAt) / 1000;
            t = Math.min(state.T_total,
                         (elapsedWall / ANIM_WALL) * state.T_total);
        }
        draw(t);
    }

    function init() {
        setupCanvas();
        renderOverlay();
        bind();
        window.addEventListener('resize', resize);
        window.addEventListener('themechange', function () {
            renderOverlay();
            // The animation loop will pick up new colors on its next frame;
            // if paused, draw immediately.
            if (!state.running) draw(state.T_total);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
