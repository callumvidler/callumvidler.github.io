// Scene 03 · Quantisation.
// Top plot: continuous waveform with quantised staircase overlay at N bits.
// Lower plot: residual error v(t) - v_q(t) on the same time axis.
(function () {
    var bI = document.getElementById('q-bits');
    var bL = document.getElementById('q-bits-val');
    var vI = document.getElementById('q-vref');
    var vL = document.getElementById('q-vref-val');
    var rdL = document.getElementById('q-levels');
    var rdLsb = document.getElementById('q-lsb');
    var rdSqnr = document.getElementById('q-sqnr');

    var state = { N: 3, vref: 2.0 };
    var T_VIEW = 1.0;
    var F_IN = 2.0;

    var traceSvg = d3.select('#plot-q-trace').classed('ov', true);
    var errSvg   = d3.select('#plot-q-err').classed('ov', true);

    // The signal is bipolar around 0 to keep the visual centred. The quantiser
    // partitions [-vref/2, +vref/2] into 2^N equal levels.
    function vAt(t, vref) {
        // Slow envelope plus the carrier so the quantisation effect is visible
        // at low bit depths.
        var env = 0.55 + 0.30 * Math.sin(2 * Math.PI * 0.7 * t);
        return env * (vref / 2) * Math.sin(2 * Math.PI * F_IN * t);
    }

    function quantise(v, vref, N) {
        var levels = Math.pow(2, N);
        var lsb = vref / levels;
        // Map [-vref/2, +vref/2] to integer code [0, levels-1] via mid-tread.
        var code = Math.floor((v + vref / 2) / lsb);
        if (code < 0) code = 0;
        if (code > levels - 1) code = levels - 1;
        var vq = (code + 0.5) * lsb - vref / 2;
        return vq;
    }

    function makeFrame(svg, opts) {
        opts = opts || {};
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(opts.minH || 200, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 22, right: 28, bottom: 38, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih };
    }

    function drawTrace() {
        var f = makeFrame(traceSvg);
        f.g.selectAll('*').remove();

        var vref = state.vref;
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-vref / 2 * 1.1, vref / 2 * 1.1]).range([f.ih, 0]);

        // Quantisation level lines
        var levels = Math.pow(2, state.N);
        var lsb = vref / levels;
        var grid = f.g.append('g').attr('class', 'grid');
        for (var lvl = 0; lvl < levels; lvl++) {
            var v = (lvl + 0.5) * lsb - vref / 2;
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--c-output)')
                .attr('opacity', state.N <= 5 ? 0.20 : 0.08);
        }

        // Continuous input
        var contPts = [];
        for (var k = 0; k <= 400; k++) {
            var t = (k / 400) * T_VIEW;
            contPts.push([t, vAt(t, vref)]);
        }
        f.g.append('path')
            .datum(contPts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Quantised step trace (sampled at high rate so steps map to amplitude
        // levels rather than time levels; this is amplitude quantisation only).
        var qPts = [];
        var M = 400;
        for (var k = 0; k < M; k++) {
            var t = (k / M) * T_VIEW;
            qPts.push([t, quantise(vAt(t, vref), vref, state.N)]);
            qPts.push([(k + 1) / M * T_VIEW, quantise(vAt(t, vref), vref, state.N)]);
        }
        f.g.append('path')
            .datum(qPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output)')
            .attr('stroke-width', 2.0)
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); })
                .curve(d3.curveStepAfter));

        // Axes
        var fmtV = function (d) { return d.toFixed(1) + ' V'; };
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(5).tickFormat(fmtV).tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30)
            .attr('text-anchor', 'middle')
            .text('time, seconds');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('voltage, V');

        // Legend in upper right
        var leg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 200) + ',6)');
        leg.append('line').attr('x1', 0).attr('x2', 18).attr('y1', 6).attr('y2', 6)
            .attr('stroke', 'var(--c-input)').attr('stroke-width', 2);
        leg.append('text').attr('x', 24).attr('y', 9).attr('font-size', 10)
            .attr('fill', 'var(--text-dim)').text('analog v(t)');
        leg.append('line').attr('x1', 100).attr('x2', 118).attr('y1', 6).attr('y2', 6)
            .attr('stroke', 'var(--c-output)').attr('stroke-width', 2);
        leg.append('text').attr('x', 124).attr('y', 9).attr('font-size', 10)
            .attr('fill', 'var(--text-dim)').text('quantised');
    }

    function drawErr() {
        var f = makeFrame(errSvg, { minH: 130 });
        f.g.selectAll('*').remove();

        var vref = state.vref;
        var lsb = vref / Math.pow(2, state.N);
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-lsb, lsb]).range([f.ih, 0]);

        // ±LSB/2 bounds
        var grid = f.g.append('g').attr('class', 'grid');
        [-lsb / 2, 0, lsb / 2].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', v === 0 ? 'var(--grid-zero)' : 'var(--c-thresh)')
                .attr('stroke-dasharray', v === 0 ? null : '4 3')
                .attr('opacity', v === 0 ? 1 : 0.6);
        });

        // Error trace
        var ePts = [];
        for (var k = 0; k <= 600; k++) {
            var t = (k / 600) * T_VIEW;
            var v = vAt(t, vref);
            ePts.push([t, v - quantise(v, vref, state.N)]);
        }
        f.g.append('path')
            .datum(ePts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)')
            .attr('stroke-width', 1.6)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([-lsb / 2, 0, lsb / 2])
                .tickFormat(function (d) {
                    if (Math.abs(d) < 1e-9) return '0';
                    return (d > 0 ? '+' : '−') + 'LSB/2';
                })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30)
            .attr('text-anchor', 'middle')
            .text('time, seconds');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('error, V');
    }

    function updateReadout() {
        var levels = Math.pow(2, state.N);
        var lsb = state.vref / levels;
        rdL.textContent = levels;
        rdLsb.textContent = (lsb * 1000).toFixed(lsb < 0.01 ? 2 : 1) + ' mV';
        rdSqnr.textContent = (6.02 * state.N + 1.76).toFixed(1) + ' dB';
    }

    function refresh() {
        drawTrace();
        drawErr();
        updateReadout();
    }

    function init() {
        bI.addEventListener('input', function () {
            state.N = parseInt(bI.value);
            bL.textContent = state.N + ' bit' + (state.N === 1 ? '' : 's');
            refresh();
        });
        vI.addEventListener('input', function () {
            state.vref = parseFloat(vI.value);
            vL.textContent = state.vref.toFixed(1) + ' V';
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
