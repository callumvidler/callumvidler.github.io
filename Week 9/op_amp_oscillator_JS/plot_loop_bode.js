// Section 04 · Complex-plane (Nyquist-style) view of A·β(jω) for the Wien
// feedback network. As the amplifier gain A is changed by the slider the
// closed locus scales: it crosses the real axis at A/3, the place where β
// is purely real. The Barkhausen criterion is satisfied where the locus
// passes through the marked target point at 1 + j·0.
(function () {
    var sel    = '#plot-loop-bode';
    var slider = '#bark-A';
    var slabel = '#bark-A-val';

    var state = { A: 3.00 };
    var BETA0 = 1 / 3;        // β(jω₀) is purely real, equal to 1/3
    var Nsamp = 800;          // locus sample count

    // β(ju) = ju / (1 − u² + 3ju), expanded into real/imag parts.
    function beta(u) {
        var reD  = 1 - u * u;
        var imD  = 3 * u;
        var den2 = reD * reD + imD * imD;
        return { re: 3 * u * u / den2, im: u * (1 - u * u) / den2 };
    }

    // Pre-compute β samples once; they are independent of A.
    var betaSamples = (function () {
        var out = [];
        for (var i = 0; i <= Nsamp; i++) {
            var lp  = (i / Nsamp - 0.5) * 2;        // -1 … +1
            var sgn = lp >= 0 ? 1 : -1;
            var u   = sgn * Math.pow(10, -2 + 4 * Math.abs(lp));
            out.push(beta(u));
        }
        return out;
    })();

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width  || 600;
        var H = rect.height || 540;

        var margin = { top: 80, right: 150, bottom: 50, left: 70 };
        var innerW = Math.max(50, W - margin.left - margin.right);
        var innerH = Math.max(50, H - margin.top - margin.bottom);

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // ── Isotropic scaling ──────────────────────────────────────
        // Show a fixed data window large enough to hold the largest locus
        // (A = Amax = 5, so the real-axis crossing reaches 5/3 ≈ 1.67) and
        // the Barkhausen target at (1, 0). We use the same pixels-per-unit
        // for x and y so the curve is not visually distorted; whichever
        // axis is the limiting one anchors the scale, the other gets
        // symmetric padding.
        var halfXNeed = 1.15;            // window: real ∈ [−0.30, 2.00]
        var halfYNeed = 1.05;            // window: imag ∈ [−1.05, 1.05]
        var xCenter   = 0.85;
        var yCenter   = 0;

        var pxPerUnit = Math.min(innerW / (2 * halfXNeed),
                                 innerH / (2 * halfYNeed));
        var halfX = innerW / (2 * pxPerUnit);
        var halfY = innerH / (2 * pxPerUnit);

        var x = d3.scaleLinear()
            .domain([xCenter - halfX, xCenter + halfX])
            .range([0, innerW]);
        var y = d3.scaleLinear()
            .domain([yCenter - halfY, yCenter + halfY])
            .range([innerH, 0]);

        // ── grid (0.2 unit spacing) ────────────────────────────────
        var gridLine = window.CMP.cssVar('--grid-line');
        var gridZero = window.CMP.cssVar('--grid-zero');
        var tickLine = window.CMP.cssVar('--tick-line');

        function frange(a, b, step) {
            var arr = [];
            var v = Math.ceil(a / step) * step;
            for (; v <= b + 1e-9; v += step) arr.push(v);
            return arr;
        }
        frange(x.domain()[0], x.domain()[1], 0.2).forEach(function (xv) {
            g.append('line')
                .attr('x1', x(xv)).attr('x2', x(xv))
                .attr('y1', 0).attr('y2', innerH)
                .attr('stroke', gridLine).attr('stroke-width', 1);
        });
        frange(y.domain()[0], y.domain()[1], 0.2).forEach(function (yv) {
            g.append('line')
                .attr('x1', 0).attr('x2', innerW)
                .attr('y1', y(yv)).attr('y2', y(yv))
                .attr('stroke', gridLine).attr('stroke-width', 1);
        });

        // Bold real and imaginary axes through the origin
        g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', gridZero).attr('stroke-width', 1.4);
        g.append('line')
            .attr('x1', x(0)).attr('x2', x(0))
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', gridZero).attr('stroke-width', 1.4);

        // Plot frame
        g.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', innerW).attr('height', innerH)
            .attr('fill', 'none')
            .attr('stroke', tickLine).attr('stroke-width', 1);

        // ── reference β(jω) locus and active Aβ(jω) locus ──────────
        var refPts = betaSamples.map(function (b) { return [b.re, b.im]; });
        var locPts = betaSamples.map(function (b) {
            return [state.A * b.re, state.A * b.im];
        });

        var line = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); });

        // Faint reference: β alone (no amplifier).
        g.append('path').datum(refPts)
            .attr('fill', 'none')
            .attr('stroke', window.CMP.cssVar('--c-input'))
            .attr('stroke-width', 1.2)
            .attr('opacity', 0.32)
            .attr('stroke-dasharray', '4 4')
            .attr('d', line);

        // Active Aβ locus, colour-coded by regime.
        var Aratio = state.A / 3;
        var traceColor;
        if (Math.abs(Aratio - 1) < 0.005) {
            traceColor = window.CMP.cssVar('--c-output');
        } else if (Aratio < 1) {
            traceColor = window.CMP.cssVar('--c-output2');
        } else {
            traceColor = window.CMP.cssVar('--c-thresh');
        }
        g.append('path').datum(locPts)
            .attr('fill', 'none')
            .attr('stroke', traceColor)
            .attr('stroke-width', 2.6)
            .attr('opacity', 0.95)
            .attr('d', line);

        // ── Barkhausen target at (1, 0) ─────────────────────────────
        var targetColor = window.CMP.cssVar('--c-output');
        g.append('line')
            .attr('x1', x(1) - 9).attr('x2', x(1) + 9)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', targetColor).attr('stroke-width', 1.4);
        g.append('line')
            .attr('x1', x(1)).attr('x2', x(1))
            .attr('y1', y(0) - 9).attr('y2', y(0) + 9)
            .attr('stroke', targetColor).attr('stroke-width', 1.4);
        g.append('circle')
            .attr('cx', x(1)).attr('cy', y(0))
            .attr('r', 6.5)
            .attr('fill', 'none')
            .attr('stroke', targetColor).attr('stroke-width', 1.6);

        // Current Aβ(jω₀) marker on the real axis.
        var markerR = state.A * BETA0;
        g.append('line')
            .attr('x1', x(0)).attr('y1', y(0))
            .attr('x2', x(markerR)).attr('y2', y(0))
            .attr('stroke', traceColor).attr('stroke-width', 1.6)
            .attr('opacity', 0.7);
        g.append('circle')
            .attr('cx', x(markerR)).attr('cy', y(0))
            .attr('r', 6).attr('fill', traceColor)
            .attr('stroke', window.CMP.cssVar('--bg-2'))
            .attr('stroke-width', 1.4);

        // ── tick labels on the axes ─────────────────────────────────
        var realTicks = [-0.4, 0, 0.4, 0.8, 1.0, 1.2, 1.6, 2.0];
        realTicks.forEach(function (rv) {
            if (rv < x.domain()[0] || rv > x.domain()[1]) return;
            g.append('line')
                .attr('x1', x(rv)).attr('x2', x(rv))
                .attr('y1', y(0) - 4).attr('y2', y(0) + 4)
                .attr('stroke', tickLine).attr('stroke-width', 1);
            g.append('text')
                .attr('x', x(rv))
                .attr('y', y(0) + 16)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .attr('fill', window.T.textDim)
                .text(rv === 0 ? '0' : rv.toFixed(1));
        });
        var imagTicks = [-1.0, -0.5, 0.5, 1.0];
        imagTicks.forEach(function (iv) {
            if (iv < y.domain()[0] || iv > y.domain()[1]) return;
            g.append('line')
                .attr('x1', x(0) - 4).attr('x2', x(0) + 4)
                .attr('y1', y(iv)).attr('y2', y(iv))
                .attr('stroke', tickLine).attr('stroke-width', 1);
            g.append('text')
                .attr('x', x(0) - 8)
                .attr('y', y(iv) + 4)
                .attr('text-anchor', 'end')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .attr('fill', window.T.textDim)
                .text(iv.toFixed(1));
        });

        // ── axis titles · 4-quadrant rule ───────────────────────────
        window.renderKatex(svg, '\\Im\\{A\\beta(j\\omega)\\}',
            margin.left + x(0), margin.top - 34,
            { width: 240, height: 24, size: 14 });
        window.renderKatex(svg, '\\Re\\{A\\beta(j\\omega)\\}',
            margin.left + innerW + 70, margin.top + y(0),
            { width: 140, height: 24, size: 13 });

        // ── on-plot annotations ─────────────────────────────────────
        window.renderKatex(svg, '1 + j\\,0',
            margin.left + x(1), margin.top + y(0) - 22,
            { width: 100, height: 20, size: 12, color: targetColor });
        window.renderKatex(svg,
            'A\\beta(j\\omega_0) = ' + (state.A * BETA0).toFixed(3),
            margin.left + x(markerR), margin.top + y(0) + 22,
            { width: 220, height: 22, size: 12, color: traceColor });

        // ── legend (top-right of plot) ──────────────────────────────
        var legRowH = 18;
        var legSegW = 22;
        var legGap  = 8;
        var legLabelW = 200;
        var legRight = margin.left + innerW - 10;
        var legX = legRight - (legSegW + legGap + legLabelW);
        var legY = margin.top + 10;
        [
            { label: '\\beta(j\\omega) \\text{ (network only)}',
              color: window.CMP.cssVar('--c-input'), dashed: true, op: 0.55 },
            { label: 'A\\beta(j\\omega) \\text{ (current } A \\text{)}',
              color: traceColor, dashed: false, op: 1 }
        ].forEach(function (it, idx) {
            var ly = legY + idx * legRowH;
            var seg = svg.append('line')
                .attr('x1', legX).attr('x2', legX + legSegW)
                .attr('y1', ly).attr('y2', ly)
                .attr('stroke', it.color).attr('stroke-width', 2.4)
                .attr('opacity', it.op);
            if (it.dashed) seg.attr('stroke-dasharray', '4 4');
            window.renderKatex(svg, it.label,
                legX + legSegW + legGap + legLabelW / 2, ly,
                { width: legLabelW, height: 18, size: 11,
                  color: window.T.text, align: 'left' })
                .attr('opacity', it.op);
        });
    }

    function attachSlider() {
        var sl  = document.querySelector(slider);
        var lab = document.querySelector(slabel);
        if (!sl || !lab) return;

        function tick() {
            state.A = parseFloat(sl.value);
            var loop = state.A * BETA0;
            var regime = Math.abs(loop - 1) < 0.005
                ? 'threshold'
                : (loop < 1 ? 'below — decays' : 'above — clips');
            lab.textContent = state.A.toFixed(2)
                            + ' · Aβ(jω₀) = ' + loop.toFixed(3)
                            + ' · ' + regime;
            render();
        }
        sl.addEventListener('input',  tick);
        sl.addEventListener('change', tick);
        tick();                                     // initial sync
    }

    function init() {
        attachSlider();   // also runs the first render
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
