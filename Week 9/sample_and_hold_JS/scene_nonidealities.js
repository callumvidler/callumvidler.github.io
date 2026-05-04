// Scene 05 · Non-idealities.
// Three independent panels: droop during hold, aperture jitter on a fast sine,
// and charge injection at the hold transition. Each panel shares the same
// state object but is rendered into its own SVG so the user can compare the
// three failure modes side by side.
(function () {
    var leakI = document.getElementById('sh-nid-leak');
    var jitI  = document.getElementById('sh-nid-jit');
    var qchI  = document.getElementById('sh-nid-qch');
    var leakL = document.getElementById('sh-nid-leak-val');
    var jitL  = document.getElementById('sh-nid-jit-val');
    var qchL  = document.getElementById('sh-nid-qch-val');
    var rdDv  = document.getElementById('sh-nid-dv');
    var rdSv  = document.getElementById('sh-nid-sv');
    var rdCj  = document.getElementById('sh-nid-cj');

    // Fixed contextual values for derived quantities
    var C_H = 5e-12;          // 5 pF
    var T_CONV = 1e-6;        // 1 µs conversion window
    var DVDT  = 5e6;          // 5 V/µs slew at the sample instant (fast sine)
    var F_FAST = 1e6;         // 1 MHz reference sine for jitter scene

    var state = { leak: 40e-12, jit: 10e-12, qch: 100e-15 };

    var svgD = d3.select('#plot-sh-nid-droop').classed('ov', true);
    var svgJ = d3.select('#plot-sh-nid-jit').classed('ov', true);
    var svgC = d3.select('#plot-sh-nid-cj').classed('ov', true);

    function makeFrame(svg, opts) {
        opts = opts || {};
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(opts.minH || 220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = opts.margin || { top: 22, right: 28, bottom: 38, left: 60 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    // ─── Droop panel ───
    function drawDroop() {
        var f = makeFrame(svgD);
        f.g.selectAll('*').remove();

        var t0 = 0, t1 = T_CONV;
        var x = d3.scaleLinear().domain([t0, t1]).range([0, f.iw]);
        var v0 = 1.000;
        // ΔV across the conversion window in volts
        var dv = state.leak * T_CONV / C_H;
        var vMin = v0 - 6 * dv;        // give some headroom for the band
        var vMax = v0 + 2 * dv;
        if (vMax - vMin < 1e-3) { vMin = v0 - 0.5e-3; vMax = v0 + 0.5e-3; }
        var y = d3.scaleLinear().domain([vMin, vMax]).range([f.ih, 0]);

        var grid = f.g.append('g').attr('class', 'grid');
        [vMin, (vMin + vMax) / 2, vMax].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Captured-value reference
        f.g.append('line')
            .attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(v0)).attr('y2', y(v0))
            .attr('stroke', 'var(--c-input)')
            .attr('stroke-dasharray', '4 4')
            .attr('stroke-width', 1.2)
            .attr('opacity', 0.7);

        // Linear droop
        var pts = [[t0, v0], [t1, v0 - dv]];
        f.g.append('path')
            .datum(pts)
            .attr('class', 'trace output')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // ΔV annotation
        f.g.append('line')
            .attr('x1', x(t1) - 4).attr('x2', x(t1) - 4)
            .attr('y1', y(v0)).attr('y2', y(v0 - dv))
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1.4);
        f.g.append('text')
            .attr('x', x(t1) - 8).attr('y', y(v0 - dv / 2) + 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-thresh)')
            .text('ΔV = ' + (dv * 1e3).toFixed(2) + ' mV');

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5)
                .tickFormat(function (d) { return (d * 1e6).toFixed(2) + ' µs'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(3)
                .tickFormat(function (d) { return d.toFixed(3) + ' V'; })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30)
            .attr('text-anchor', 'middle')
            .text('time during hold');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-50) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('v_C');

        rdDv.textContent = (dv * 1e3).toFixed(2) + ' mV';
    }

    // ─── Aperture-jitter panel ───
    function drawJitter() {
        var f = makeFrame(svgJ);
        f.g.selectAll('*').remove();

        var T_W = 2 / F_FAST;        // two periods of the fast sine
        var x = d3.scaleLinear().domain([0, T_W]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-1.25, 1.25]).range([f.ih, 0]);

        var grid = f.g.append('g').attr('class', 'grid');
        [-1, 0, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Sine
        var pts = [];
        for (var k = 0; k <= 400; k++) {
            var tt = (k / 400) * T_W;
            pts.push([tt, Math.sin(2 * Math.PI * F_FAST * tt)]);
        }
        f.g.append('path')
            .datum(pts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Twenty samples at the same nominal phase, perturbed by Gaussian jitter σ_t
        var t0 = T_W * 0.25;     // sample on the rising zero-crossing where dV/dt is max
        var sigT = state.jit;
        var sigV = sigT * (2 * Math.PI * F_FAST);
        for (var n = 0; n < 30; n++) {
            var dT = randn() * sigT;
            var ti = t0 + dT;
            if (ti < 0 || ti > T_W) continue;
            var vi = Math.sin(2 * Math.PI * F_FAST * ti);
            f.g.append('line')
                .attr('x1', x(ti)).attr('x2', x(ti))
                .attr('y1', y(0)).attr('y2', y(vi))
                .attr('class', 'sample-stem')
                .attr('opacity', 0.4);
            f.g.append('circle')
                .attr('cx', x(ti)).attr('cy', y(vi)).attr('r', 2.6)
                .attr('class', 'sample-dot');
        }

        // Sigma annotation: ±σ_V band around the ideal sample value
        var v0 = Math.sin(2 * Math.PI * F_FAST * t0);
        f.g.append('rect')
            .attr('x', 0).attr('y', y(v0 + sigV))
            .attr('width', f.iw)
            .attr('height', y(v0 - sigV) - y(v0 + sigV))
            .attr('fill', 'var(--c-thresh)').attr('opacity', 0.10);

        f.g.append('text')
            .attr('x', f.iw - 6).attr('y', 14)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-thresh)')
            .text('σ_V = ' + (sigV * 1e3).toFixed(2) + ' mV  (1 MHz sine)');

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5)
                .tickFormat(function (d) { return (d * 1e9).toFixed(0) + ' ns'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([-1, 0, 1])
                .tickFormat(function (d) { return d.toFixed(0); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30)
            .attr('text-anchor', 'middle')
            .text('time');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude');

        rdSv.textContent = (sigV * 1e3).toFixed(2) + ' mV';
    }

    // ─── Charge-injection panel ───
    function drawChargeInjection() {
        var f = makeFrame(svgC, {
            minH: 130,
            margin: { top: 18, right: 28, bottom: 32, left: 60 }
        });
        f.g.selectAll('*').remove();

        var T_W = 1.0;     // arbitrary normalised window centred on the hold transition
        var x = d3.scaleLinear().domain([0, T_W]).range([0, f.iw]);
        var v0 = 1.000;
        var dvCj = state.qch / (2 * C_H);     // V step on v_C
        var vMin = v0 - Math.max(0.01, 1.4 * dvCj);
        var vMax = v0 + 0.005;
        var y = d3.scaleLinear().domain([vMin, vMax]).range([f.ih, 0]);

        // Captured reference
        f.g.append('line')
            .attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(v0)).attr('y2', y(v0))
            .attr('stroke', 'var(--c-input)')
            .attr('stroke-dasharray', '4 4')
            .attr('stroke-width', 1.2)
            .attr('opacity', 0.7);

        // v_C: track at v0 up to t = 0.45T, then step down by ΔV_cj at the hold transition, then flat
        var tEdge = 0.45 * T_W;
        var pts = [
            [0, v0],
            [tEdge, v0],
            [tEdge, v0 - dvCj],
            [T_W, v0 - dvCj]
        ];
        f.g.append('path')
            .datum(pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output)')
            .attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Hold-edge marker
        f.g.append('line')
            .attr('x1', x(tEdge)).attr('x2', x(tEdge))
            .attr('y1', 0).attr('y2', f.ih)
            .attr('stroke', 'var(--accent)')
            .attr('stroke-dasharray', '3 4').attr('stroke-width', 1.0);
        f.g.append('text')
            .attr('x', x(tEdge) + 6).attr('y', 12)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--accent)')
            .text('switch opens');

        // ΔV_cj annotation
        f.g.append('text')
            .attr('x', x(tEdge) + 8).attr('y', y(v0 - dvCj / 2) + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-thresh)')
            .text('ΔV_cj = ' + (dvCj * 1e3).toFixed(1) + ' mV');

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(0).tickSize(0));
        ax.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 22)
            .attr('text-anchor', 'middle')
            .text('time across hold transition');

        rdCj.textContent = (dvCj * 1e3).toFixed(1) + ' mV';
    }

    function randn() {
        // Box-Muller
        var u = 1 - Math.random();
        var v = 1 - Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function refresh() {
        drawDroop();
        drawJitter();
        drawChargeInjection();
    }

    function init() {
        leakI.addEventListener('input', function () {
            state.leak = parseFloat(leakI.value) * 1e-12;
            leakL.textContent = parseFloat(leakI.value).toFixed(0) + ' pA';
            refresh();
        });
        jitI.addEventListener('input', function () {
            state.jit = parseFloat(jitI.value) * 1e-12;
            jitL.textContent = parseFloat(jitI.value).toFixed(1) + ' ps';
            refresh();
        });
        qchI.addEventListener('input', function () {
            state.qch = parseFloat(qchI.value) * 1e-15;
            qchL.textContent = parseFloat(qchI.value).toFixed(0) + ' fC';
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
