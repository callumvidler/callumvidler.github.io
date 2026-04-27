// Section 01 (intro) · Q parameter explorer.
// Left panel  : s-plane pole pair on a circle of radius ω0 = 1.
// Right panel : time-domain step response y(t) for the same Q.
// One slider sweeps Q ∈ [0.1, 5] on a log scale and redraws both panels.
(function () {
    var T = window.T;
    var slider = document.getElementById('q-intro-slider');
    var valLabel = document.getElementById('q-intro-val');
    var regimeLabel = document.getElementById('q-intro-regime');

    var state = { Q: 1 };

    // ── Pole locations of H(s) = 1 / (s²/ω0² + s/(Q ω0) + 1) at ω0 = 1 ──
    function poles(Q) {
        var alpha = -1 / (2 * Q);
        var disc = 1 / (4 * Q * Q) - 1;
        if (disc >= 0) {
            var rt = Math.sqrt(disc);
            return { type: 'real', p1: alpha - rt, p2: alpha + rt };
        }
        var beta = Math.sqrt(-disc);
        return { type: 'complex', re: alpha, im: beta };
    }

    // ── Step response for unit step input ──────────────────────────────
    function stepResponse(Q, tMax, n) {
        n = n || 480;
        var pts = [];
        var zeta = 1 / (2 * Q);
        var w0 = 1;
        for (var i = 0; i <= n; i++) {
            var t = i / n * tMax;
            var y;
            if (Math.abs(zeta - 1) < 1e-4) {
                y = 1 - (1 + w0 * t) * Math.exp(-w0 * t);
            } else if (zeta < 1) {
                var wd = w0 * Math.sqrt(1 - zeta * zeta);
                var phi = Math.acos(zeta);
                y = 1 - Math.exp(-zeta * w0 * t) * Math.sin(wd * t + phi)
                        / Math.sqrt(1 - zeta * zeta);
            } else {
                var sd = Math.sqrt(zeta * zeta - 1);
                y = 1 - Math.exp(-zeta * w0 * t) * (
                    Math.cosh(w0 * t * sd) +
                    (zeta / sd) * Math.sinh(w0 * t * sd)
                );
            }
            pts.push({ t: t, y: y });
        }
        return pts;
    }

    function fmtQ(q) {
        if (q >= 10) return q.toFixed(1);
        return q.toFixed(2);
    }

    // ── s-plane panel ──────────────────────────────────────────────────
    function renderSplane() {
        var sel = '#plot-splane-q';
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || W;

        var margin = { top: 36, right: 56, bottom: 32, left: 36 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        var svg = root.append('svg').attr('width', W).attr('height', H);
        var g = svg.append('g').attr('transform',
            'translate(' + margin.left + ',' + margin.top + ')');

        // Symmetric domain so the unit circle is centred on the origin
        // and both half-planes are equally visible.
        var sigDomain = [-1.5, 1.5];
        var jDomain = [-1.5, 1.5];
        // Equalise scale so the unit circle stays circular.
        var spanX = sigDomain[1] - sigDomain[0];
        var spanY = jDomain[1] - jDomain[0];
        var unit = Math.min(innerW / spanX, innerH / spanY);
        var plotW = unit * spanX;
        var plotH = unit * spanY;
        var ox = (innerW - plotW) / 2;
        var oy = (innerH - plotH) / 2;
        var xs = function (v) { return ox + (v - sigDomain[0]) * unit; };
        var ys = function (v) { return oy + (jDomain[1] - v) * unit; };

        // Faint grid
        var sigTicks = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5];
        var jTicks = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5];
        sigTicks.forEach(function (v) {
            g.append('line').attr('x1', xs(v)).attr('x2', xs(v))
                .attr('y1', oy).attr('y2', oy + plotH)
                .attr('stroke', T.grid).attr('stroke-width', 1);
        });
        jTicks.forEach(function (v) {
            g.append('line').attr('y1', ys(v)).attr('y2', ys(v))
                .attr('x1', ox).attr('x2', ox + plotW)
                .attr('stroke', T.grid).attr('stroke-width', 1);
        });

        // Unit circle (radius ω0 = 1)
        g.append('circle')
            .attr('cx', xs(0)).attr('cy', ys(0))
            .attr('r', unit)
            .attr('fill', 'none')
            .attr('stroke', T.fg(0.45))
            .attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '4 3');
        g.append('text')
            .attr('x', xs(-Math.SQRT1_2) - 4)
            .attr('y', ys(Math.SQRT1_2) - 4)
            .attr('text-anchor', 'end')
            .attr('fill', T.fg(0.6)).attr('font-size', 11)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text('|s| = ω0');

        // Axes through origin
        g.append('line')
            .attr('x1', ox).attr('x2', ox + plotW)
            .attr('y1', ys(0)).attr('y2', ys(0))
            .attr('stroke', T.gridStrong).attr('stroke-width', 1.4);
        g.append('line')
            .attr('x1', xs(0)).attr('x2', xs(0))
            .attr('y1', oy).attr('y2', oy + plotH)
            .attr('stroke', T.gridStrong).attr('stroke-width', 1.4);

        // Tick labels (along the axes through origin)
        sigTicks.filter(function (v) { return v !== 0; }).forEach(function (v) {
            g.append('text')
                .attr('x', xs(v)).attr('y', ys(0) + 14)
                .attr('text-anchor', 'middle')
                .attr('fill', T.fg(0.7))
                .attr('font-size', 11)
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(v.toFixed(1));
        });
        jTicks.filter(function (v) { return v !== 0; }).forEach(function (v) {
            g.append('text')
                .attr('x', xs(0) - 6).attr('y', ys(v) + 4)
                .attr('text-anchor', 'end')
                .attr('fill', T.fg(0.7))
                .attr('font-size', 11)
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(v.toFixed(1));
        });

        // Axis titles, four-quadrant rule from CLAUDE.md.
        // y-axis title (jω) above plot, centred on σ = 0.
        window.renderKatex(svg, 'j\\omega',
            margin.left + xs(0), margin.top - 16,
            { width: 80, height: 22, size: 14 });
        // x-axis title (σ) right of plot, centred on jω = 0.
        window.renderKatex(svg, '\\sigma',
            margin.left + ox + plotW + 28, margin.top + ys(0),
            { width: 60, height: 22, size: 14 });

        // Pole markers
        var p = poles(state.Q);
        function drawX(cx, cy) {
            var r = 8;
            var col = T.text;
            g.append('line')
                .attr('x1', cx - r).attr('x2', cx + r)
                .attr('y1', cy - r).attr('y2', cy + r)
                .attr('stroke', col).attr('stroke-width', 2.6)
                .attr('stroke-linecap', 'round');
            g.append('line')
                .attr('x1', cx - r).attr('x2', cx + r)
                .attr('y1', cy + r).attr('y2', cy - r)
                .attr('stroke', col).attr('stroke-width', 2.6)
                .attr('stroke-linecap', 'round');
        }

        if (p.type === 'real') {
            drawX(xs(p.p1), ys(0));
            drawX(xs(p.p2), ys(0));
        } else {
            drawX(xs(p.re), ys(p.im));
            drawX(xs(p.re), ys(-p.im));

            // Indicate the pole pair sits on the unit circle by drawing
            // a short radial line from the origin to the upper pole.
            g.append('line')
                .attr('x1', xs(0)).attr('y1', ys(0))
                .attr('x2', xs(p.re)).attr('y2', ys(p.im))
                .attr('stroke', T.fg(0.4))
                .attr('stroke-width', 1.2)
                .attr('stroke-dasharray', '3 3');
        }
    }

    // ── Step response panel ────────────────────────────────────────────
    function renderStep() {
        var sel = '#plot-step-q';
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || (W / 1.6);

        var margin = { top: 24, right: 30, bottom: 50, left: 56 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        var svg = root.append('svg').attr('width', W).attr('height', H);
        var g = svg.append('g').attr('transform',
            'translate(' + margin.left + ',' + margin.top + ')');

        var tMax = 24;
        var x = d3.scaleLinear().domain([0, tMax]).range([0, innerW]);
        var y = d3.scaleLinear().domain([-0.05, 1.85]).range([innerH, 0]);

        var xTicks = [0, 4, 8, 12, 16, 20, 24];
        var yTicks = [0, 0.5, 1, 1.5];

        xTicks.forEach(function (v) {
            g.append('line').attr('x1', x(v)).attr('x2', x(v))
                .attr('y1', 0).attr('y2', innerH)
                .attr('stroke', T.grid).attr('stroke-width', 1);
        });
        yTicks.forEach(function (v) {
            g.append('line').attr('y1', y(v)).attr('y2', y(v))
                .attr('x1', 0).attr('x2', innerW)
                .attr('stroke', T.grid).attr('stroke-width', 1);
        });

        // Final-value reference
        g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', y(1)).attr('y2', y(1))
            .attr('stroke', T.fg(0.45)).attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '4 3');
        g.append('text')
            .attr('x', innerW - 4).attr('y', y(1) - 4)
            .attr('text-anchor', 'end')
            .attr('fill', T.fg(0.65)).attr('font-size', 11)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text('y = 1');

        // Axes
        var xAx = d3.axisBottom(x).tickValues(xTicks).tickSizeOuter(0);
        var yAx = d3.axisLeft(y).tickValues(yTicks).tickSizeOuter(0);
        var xg = g.append('g').attr('transform', 'translate(0,' + innerH + ')').call(xAx);
        var yg = g.append('g').call(yAx);
        [xg, yg].forEach(function (ax) {
            ax.selectAll('path,line').attr('stroke', T.gridAxis);
            ax.selectAll('text').attr('fill', T.text)
                .attr('font-size', 11)
                .attr('font-family', "'JetBrains Mono', monospace");
        });

        // Border
        g.append('rect').attr('x', 0).attr('y', 0)
            .attr('width', innerW).attr('height', innerH)
            .attr('fill', 'none').attr('stroke', T.gridStrong)
            .attr('stroke-width', 1);

        // Faint step input
        g.append('path')
            .attr('d', 'M ' + x(0) + ' ' + y(0) +
                       ' L ' + x(0) + ' ' + y(1) +
                       ' L ' + x(tMax) + ' ' + y(1))
            .attr('fill', 'none').attr('stroke', T.fg(0.32))
            .attr('stroke-width', 1.4).attr('stroke-dasharray', '5 4');

        // Step response trace
        var pts = stepResponse(state.Q, tMax, 480);
        var line = d3.line()
            .x(function (d) { return x(d.t); })
            .y(function (d) { return y(Math.min(Math.max(d.y, -0.05), 1.85)); });
        g.append('path').datum(pts)
            .attr('class', 'trace active')
            .attr('d', line);

        // Underdamped overshoot annotation
        var disc = 1 / (4 * state.Q * state.Q) - 1;
        if (disc < 0) {
            var zeta = 1 / (2 * state.Q);
            var wd = Math.sqrt(1 - zeta * zeta);
            var tp = Math.PI / wd;
            var Mp = Math.exp(-Math.PI * zeta / wd);
            var peakY = 1 + Mp;
            if (tp <= tMax && peakY <= 1.85) {
                var px = x(tp);
                var py = y(peakY);
                g.append('circle')
                    .attr('cx', px).attr('cy', py).attr('r', 4)
                    .attr('fill', 'none').attr('stroke', T.text)
                    .attr('stroke-width', 1.4);
                g.append('text')
                    .attr('x', px + 8).attr('y', py - 6)
                    .attr('fill', T.text).attr('font-size', 11)
                    .attr('font-family', "'JetBrains Mono', monospace")
                    .text('overshoot ' + (Mp * 100).toFixed(1) + '%');
            }
        }

        // Axis titles, single-quadrant rule.
        window.renderKatex(svg, 'y(t)',
            18, margin.top + innerH / 2,
            { width: 60, height: 22, rotate: -90, size: 14 });
        window.renderKatex(svg, 't \\, [\\,1/\\omega_0\\,]',
            margin.left + innerW / 2, H - 14,
            { width: 220, height: 22, size: 14 });
    }

    function updateRegimeLabel() {
        if (!regimeLabel) return;
        var Q = state.Q;
        if (Q < 0.5 - 0.005) {
            regimeLabel.textContent = 'overdamped · two real poles · no overshoot';
        } else if (Q < 0.5 + 0.005) {
            regimeLabel.textContent = 'critically damped · repeated real pole';
        } else {
            regimeLabel.textContent = 'underdamped · complex conjugate pair · ringing';
        }
    }

    function render() {
        renderSplane();
        renderStep();
        updateRegimeLabel();
    }

    function onSlider() {
        var v = parseFloat(slider.value);
        state.Q = Math.pow(10, v);
        if (valLabel) valLabel.textContent = fmtQ(state.Q);
        render();
    }

    function init() {
        if (slider) {
            slider.addEventListener('input', onSlider);
            onSlider();
        } else {
            render();
        }
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
