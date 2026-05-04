// Scene 02 · Track and hold.
// Top plot: continuous v_in(t) with the capacitor voltage v_C(t) overlaid.
// During the track phase v_C follows v_in through an RC; during the hold phase
// v_C is frozen. Bottom plot: the clock phi(t) that drives the switch.
(function () {
    var finI  = document.getElementById('sh-track-fin');
    var fsI   = document.getElementById('sh-track-fs');
    var dutyI = document.getElementById('sh-track-duty');
    var finL  = document.getElementById('sh-track-fin-val');
    var fsL   = document.getElementById('sh-track-fs-val');
    var dutyL = document.getElementById('sh-track-duty-val');
    var rdTs  = document.getElementById('sh-track-Ts');
    var rdTtr = document.getElementById('sh-track-Ttr');
    var rdThd = document.getElementById('sh-track-Thd');

    var state = { fin: 2.0, fs: 20.0, duty: 0.30 };
    var T_VIEW = 0.5;        // seconds shown
    var TAU_FRAC = 0.06;     // tau as a fraction of one period: tight tracking

    var traceSvg = d3.select('#plot-sh-track-trace').classed('ov', true);
    var clockSvg = d3.select('#plot-sh-track-clock').classed('ov', true);

    function makeFrame(svg, opts) {
        opts = opts || {};
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(opts.minH || 220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = opts.margin || { top: 22, right: 28, bottom: 38, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function vIn(t) { return Math.sin(2 * Math.PI * state.fin * t); }
    function inTrack(t) {
        var Ts = 1 / state.fs;
        var phase = (t / Ts) - Math.floor(t / Ts);
        return phase < state.duty;
    }

    function simulateVc() {
        // Forward Euler with small dt; reset to track on each track phase entry.
        var Ts = 1 / state.fs;
        var tau = TAU_FRAC * Ts;
        var dt = Ts / 200;
        var t = 0;
        var vc = vIn(0);
        var pts = [];
        var prevTracking = inTrack(0);
        while (t <= T_VIEW) {
            var tracking = inTrack(t);
            if (tracking) {
                vc += dt * (vIn(t) - vc) / tau;
            }
            // hold: vc unchanged
            pts.push([t, vc]);
            t += dt;
            prevTracking = tracking;
        }
        return pts;
    }

    function drawTrace() {
        var f = makeFrame(traceSvg);
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-1.25, 1.25]).range([f.ih, 0]);

        // Hold-phase shading
        var Ts = 1 / state.fs;
        var n = 0;
        while (n * Ts < T_VIEW) {
            var t0 = n * Ts + state.duty * Ts;
            var t1 = Math.min((n + 1) * Ts, T_VIEW);
            if (t1 > t0) {
                f.g.append('rect')
                    .attr('x', x(t0)).attr('y', 0)
                    .attr('width', x(t1) - x(t0)).attr('height', f.ih)
                    .attr('fill', 'var(--accent)')
                    .attr('opacity', 0.05);
            }
            n++;
        }

        var grid = f.g.append('g').attr('class', 'grid');
        [-1, 0, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Continuous input
        var inPts = [];
        for (var k = 0; k <= 400; k++) {
            var t = (k / 400) * T_VIEW;
            inPts.push([t, vIn(t)]);
        }
        f.g.append('path')
            .datum(inPts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Capacitor voltage
        var vcPts = simulateVc();
        f.g.append('path')
            .datum(vcPts)
            .attr('class', 'trace output')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return (d * 1000).toFixed(0) + ' ms'; })
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
            .attr('transform', 'translate(' + (-40) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude');

        // Legend
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',6)');
        lg.append('text')
            .attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('v_in(t)');
        lg.append('text')
            .attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('v_C(t)');
    }

    function drawClock() {
        var f = makeFrame(clockSvg, { minH: 110, margin: { top: 18, right: 28, bottom: 32, left: 56 } });
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-0.2, 1.2]).range([f.ih, 0]);

        // Clock as step waveform
        var Ts = 1 / state.fs;
        var pts = [];
        var n = 0;
        var t = 0;
        while (t <= T_VIEW + 1e-9) {
            var t0 = n * Ts;
            var t1 = t0 + state.duty * Ts;
            var t2 = (n + 1) * Ts;
            pts.push([Math.min(t0, T_VIEW), 1]);
            pts.push([Math.min(t1, T_VIEW), 1]);
            pts.push([Math.min(t1, T_VIEW), 0]);
            pts.push([Math.min(t2, T_VIEW), 0]);
            t = t2;
            n++;
        }
        f.g.append('path')
            .datum(pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)')
            .attr('stroke-width', 2.0)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Labels for high/low
        f.g.append('text')
            .attr('x', -8).attr('y', y(1) + 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--muted)').text('TRACK');
        f.g.append('text')
            .attr('x', -8).attr('y', y(0) + 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--muted)').text('HOLD');

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return (d * 1000).toFixed(0) + ' ms'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 28)
            .attr('text-anchor', 'middle')
            .text('time');
    }

    function updateReadout() {
        var Ts = 1 / state.fs;
        rdTs.textContent  = (Ts * 1000).toFixed(1) + ' ms';
        rdTtr.textContent = (Ts * state.duty * 1000).toFixed(1) + ' ms';
        rdThd.textContent = (Ts * (1 - state.duty) * 1000).toFixed(1) + ' ms';
    }

    function refresh() {
        drawTrace();
        drawClock();
        updateReadout();
    }

    function init() {
        finI.addEventListener('input', function () {
            state.fin = parseFloat(finI.value);
            finL.textContent = state.fin.toFixed(1) + ' Hz';
            refresh();
        });
        fsI.addEventListener('input', function () {
            state.fs = parseFloat(fsI.value);
            fsL.textContent = state.fs.toFixed(1) + ' Hz';
            refresh();
        });
        dutyI.addEventListener('input', function () {
            state.duty = parseFloat(dutyI.value);
            dutyL.textContent = state.duty.toFixed(2);
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
