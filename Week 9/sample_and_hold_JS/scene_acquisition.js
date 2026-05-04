// Scene 04 · Acquisition time.
// Step input drives an RC; capacitor voltage follows v_C(t) = V_in (1 − e^{−t/τ}).
// The ½-LSB band for an N-bit converter and the resulting acquisition time are
// drawn on the trace, and the maximum sample rate consistent with full settling
// in a 30% track duty is reported.
(function () {
    var ronI  = document.getElementById('sh-acq-ron');
    var chI   = document.getElementById('sh-acq-ch');
    var bitsI = document.getElementById('sh-acq-bits');
    var ronL  = document.getElementById('sh-acq-ron-val');
    var chL   = document.getElementById('sh-acq-ch-val');
    var bitsL = document.getElementById('sh-acq-bits-val');
    var rdTau = document.getElementById('sh-acq-tau');
    var rdTacq = document.getElementById('sh-acq-tacq');
    var rdFmax = document.getElementById('sh-acq-fmax');

    var state = { ron: 200, ch: 5e-12, bits: 12 };
    var TRACK_DUTY = 0.30;

    var svg = d3.select('#plot-sh-acq-trace').classed('ov', true);

    function makeFrame(svg) {
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(260, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 24, right: 28, bottom: 40, left: 60 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function fmtTime(seconds) {
        if (seconds < 1e-9) return (seconds * 1e12).toFixed(1) + ' ps';
        if (seconds < 1e-6) return (seconds * 1e9).toFixed(1) + ' ns';
        if (seconds < 1e-3) return (seconds * 1e6).toFixed(1) + ' µs';
        return (seconds * 1e3).toFixed(1) + ' ms';
    }

    function fmtFreq(hz) {
        if (hz >= 1e6) return (hz / 1e6).toFixed(1) + ' MS/s';
        if (hz >= 1e3) return (hz / 1e3).toFixed(1) + ' kS/s';
        return hz.toFixed(1) + ' S/s';
    }

    function refresh() {
        var tau   = state.ron * state.ch;          // seconds
        var halfLsb = 1 / Math.pow(2, state.bits + 1);
        // Settling to within ½-LSB: 1 − e^{−t/τ} = 1 − halfLsb  →  t = τ ln(1/halfLsb) = τ (N+1) ln 2
        var tAcq = tau * (state.bits + 1) * Math.LN2;
        var fMax = TRACK_DUTY / tAcq;

        var f = makeFrame(svg);
        f.g.selectAll('*').remove();

        var tView = Math.max(tAcq * 1.6, 8 * tau);
        var x = d3.scaleLinear().domain([0, tView]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, 1.1]).range([f.ih, 0]);

        var grid = f.g.append('g').attr('class', 'grid');
        [0, 0.25, 0.5, 0.75, 1.0].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // ½-LSB settling band around the final value (V_in = 1)
        f.g.append('rect')
            .attr('x', 0).attr('y', y(1 + halfLsb))
            .attr('width', f.iw)
            .attr('height', y(1 - halfLsb) - y(1 + halfLsb))
            .attr('fill', 'var(--c-thresh)')
            .attr('opacity', 0.12);
        f.g.append('line')
            .attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(1)).attr('y2', y(1))
            .attr('stroke', 'var(--c-thresh)')
            .attr('stroke-dasharray', '5 4').attr('stroke-width', 1.2);

        // Charging curve
        var pts = [];
        for (var k = 0; k <= 400; k++) {
            var tt = (k / 400) * tView;
            var vc = 1 - Math.exp(-tt / tau);
            pts.push([tt, vc]);
        }
        f.g.append('path')
            .datum(pts)
            .attr('class', 'trace output')
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); }));

        // Acquisition-time marker
        if (tAcq <= tView) {
            f.g.append('line')
                .attr('x1', x(tAcq)).attr('x2', x(tAcq))
                .attr('y1', y(0)).attr('y2', y(1.05))
                .attr('stroke', 'var(--accent)')
                .attr('stroke-width', 1.4)
                .attr('stroke-dasharray', '4 3');
            f.g.append('text')
                .attr('x', x(tAcq) + 6).attr('y', 14)
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
                .attr('fill', 'var(--accent)')
                .text('t_acq = ' + fmtTime(tAcq));
        }

        // Tau marker
        f.g.append('line')
            .attr('x1', x(tau)).attr('x2', x(tau))
            .attr('y1', y(1 - 1 / Math.E)).attr('y2', y(0))
            .attr('stroke', 'var(--muted)')
            .attr('stroke-dasharray', '2 3').attr('stroke-width', 1);
        f.g.append('text')
            .attr('x', x(tau) + 4).attr('y', y(1 - 1 / Math.E) - 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--muted)')
            .text('τ');

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5)
                .tickFormat(function (d) { return fmtTime(d); })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([0, 0.5, 1.0])
                .tickFormat(function (d) { return d.toFixed(2); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle')
            .text('time after switch closure');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-46) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('v_C / V_in');

        rdTau.textContent = fmtTime(tau);
        rdTacq.textContent = fmtTime(tAcq);
        rdFmax.textContent = fmtFreq(fMax);
    }

    function init() {
        ronI.addEventListener('input', function () {
            state.ron = parseFloat(ronI.value);
            ronL.textContent = state.ron.toFixed(0) + ' Ω';
            refresh();
        });
        chI.addEventListener('input', function () {
            state.ch = parseFloat(chI.value) * 1e-12;
            chL.textContent = parseFloat(chI.value).toFixed(1) + ' pF';
            refresh();
        });
        bitsI.addEventListener('input', function () {
            state.bits = parseInt(bitsI.value, 10);
            bitsL.textContent = state.bits.toString();
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
