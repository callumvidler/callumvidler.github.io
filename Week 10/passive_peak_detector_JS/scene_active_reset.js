// Scene 03 · Transistor-controlled reset peak detector.
// A diode charges the capacitor on every rising excursion, but instead of a
// continuous bleed resistor the discharge path is gated by an n-channel MOSFET
// across C. While the reset line is low the capacitor holds the running peak;
// when the reset goes high the MOSFET shorts C through R_on, emptying it
// before the next window begins.
(function () {
    var winI = document.getElementById('pp-a-win');
    var rstI = document.getElementById('pp-a-rst');
    var fcI  = document.getElementById('pp-a-fc');
    var winL = document.getElementById('pp-a-win-val');
    var rstL = document.getElementById('pp-a-rst-val');
    var fcL  = document.getElementById('pp-a-fc-val');
    var rdW  = document.getElementById('pp-a-w');
    var rdPk = document.getElementById('pp-a-pk');
    var rdSw = document.getElementById('pp-a-sw');

    var state = {
        win: 0.240,        // seconds: full reset window period
        rst: 0.010,        // seconds: reset pulse width
        fc: 20.0,
        amp: 1.5, vf: 0.4,
        tauOn: 0.0015      // R_on * C effective discharge time constant
    };
    var T_VIEW = 1.6;

    var traceSvg = d3.select('#plot-pp-a-trace').classed('ov', true);
    var rstSvg   = d3.select('#plot-pp-a-rst').classed('ov', true);
    var circSvg  = d3.select('#plot-pp-a-circ').classed('ov', true);

    function envelope(t) {
        // A slowly varying envelope so the "captured peak per window" idea reads.
        return 0.5 + 0.45 * Math.sin(2 * Math.PI * 0.6 * t);
    }
    function vIn(t) {
        return state.amp * envelope(t) * Math.sin(2 * Math.PI * state.fc * t);
    }
    function inReset(t) {
        var phase = (t / state.win) - Math.floor(t / state.win);
        return phase < (state.rst / state.win);
    }

    function simulate() {
        var dt = 1 / 5000;
        var n = Math.round(T_VIEW / dt);
        var pts = new Array(n);
        var rstPts = new Array(n);
        var vc = 0;
        for (var i = 0; i < n; i++) {
            var t = i * dt;
            var v = vIn(t);
            var resetting = inReset(t);
            if (resetting) {
                vc -= vc * (dt / state.tauOn);
                if (vc < 0) vc = 0;
            } else {
                var target = v - state.vf;
                if (target > vc) vc = target;
                // Otherwise hold; no leakage path while MOSFET is off.
            }
            pts[i] = [t, v, vc];
            rstPts[i] = [t, resetting ? 1 : 0];
        }
        return { sig: pts, rst: rstPts };
    }

    function makeFrame(svg, opts) {
        opts = opts || {};
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(opts.minH || 220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = opts.margin || { top: 24, right: 28, bottom: 44, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function drawCircuit() {
        var W0 = 820, H0 = 440;
        circSvg.attr('viewBox', '0 0 ' + W0 + ' ' + H0);
        circSvg.selectAll('*').remove();
        var g = circSvg.append('g');

        var src = { x: 90, y: 210 };
        var dIn = { x: 220, y: 210 };
        var dOut = { x: 340, y: 210 };
        var capX = 460;
        var mosX = 580, mosY = 270;
        var gnd = { y: 340 };
        var out = { x: 720, y: 210 };

        // Top rail: source -> diode -> output (cap top and mosfet drain branch off this rail)
        wire(g, src.x + 24, src.y, dIn.x, dIn.y);
        diode(g, dIn.x, dIn.y, dOut.x, dOut.y);
        wire(g, dOut.x, dOut.y, out.x - 14, src.y);

        // Capacitor drops from rail to ground
        capacitor(g, capX, src.y, capX, gnd.y);

        // MOSFET reset path: drain branches off the rail, source ties to ground
        wire(g, mosX, src.y, mosX, mosY - 30);
        mosfetVertical(g, mosX, mosY);
        wire(g, mosX, mosY + 30, mosX, gnd.y);

        // Single bottom rail joining cap bottom and mosfet source
        g.append('line').attr('x1', capX).attr('y1', gnd.y).attr('x2', mosX).attr('y2', gnd.y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        var gndX = (capX + mosX) / 2;
        var gndY = gnd.y + 12;
        g.append('line').attr('x1', gndX).attr('y1', gnd.y).attr('x2', gndX).attr('y2', gndY)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        ground(g, gndX, gndY);

        // Output dot and label
        g.append('circle').attr('cx', out.x - 14).attr('cy', out.y).attr('r', 4)
            .attr('fill', 'var(--c-output)');
        g.append('text').attr('x', out.x).attr('y', out.y + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--c-output)').text('v_out');

        // Reset signal source block, drawn to the right of the mosfet
        var rstBoxX = mosX + 70;       // left edge of the block
        var rstY = mosY;
        var rstBoxW = 70;
        g.append('rect').attr('x', rstBoxX).attr('y', rstY - 20)
            .attr('width', rstBoxW).attr('height', 40).attr('rx', 5)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        var pCx = rstBoxX + rstBoxW / 2;
        g.append('path').attr('d',
            'M ' + (pCx - 18) + ',' + (rstY + 8) +
            ' L ' + (pCx - 18) + ',' + (rstY - 6) +
            ' L ' + (pCx - 6)  + ',' + (rstY - 6) +
            ' L ' + (pCx - 6)  + ',' + (rstY + 8) +
            ' L ' + (pCx + 6)  + ',' + (rstY + 8) +
            ' L ' + (pCx + 6)  + ',' + (rstY - 6) +
            ' L ' + (pCx + 18) + ',' + (rstY - 6))
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1.6);
        g.append('text').attr('x', pCx).attr('y', rstY + 38).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--muted)').text('φ_rst');

        // Gate wire from the mosfet gate pin (mosX + 38, mosY) to the reset block left edge
        wire(g, mosX + 38, rstY, rstBoxX, rstY);

        // Junction dots at the cap and mosfet branches off the rails
        [[capX, src.y], [mosX, src.y], [capX, gnd.y], [mosX, gnd.y]].forEach(function (p) {
            g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 3.5)
                .attr('fill', 'var(--text-dim)');
        });

        source(g, src.x, src.y, 'v_in');

        g.append('text').attr('x', (dIn.x + dOut.x) / 2).attr('y', dIn.y - 26)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text('D1');
    }

    function source(g, x, y, label) {
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', 24)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('path').attr('d', 'M ' + (x - 14) + ',' + y + ' Q ' + (x - 7) + ',' + (y - 12) + ' ' + x + ',' + y + ' T ' + (x + 14) + ',' + y)
            .attr('fill', 'none').attr('stroke', 'var(--c-input)').attr('stroke-width', 1.6);
        g.append('text').attr('x', x).attr('y', y + 46).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text(label);
    }

    function wire(g, x1, y1, x2, y2) {
        if (x1 === x2 || y1 === y2) {
            g.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        } else {
            g.append('polyline')
                .attr('points', x1 + ',' + y1 + ' ' + x2 + ',' + y1 + ' ' + x2 + ',' + y2)
                .attr('fill', 'none').attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        }
    }

    function diode(g, x1, y, x2, y2) {
        var cx = (x1 + x2) / 2;
        g.append('line').attr('x1', x1).attr('y1', y).attr('x2', cx - 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx + 14).attr('y1', y).attr('x2', x2).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('polygon')
            .attr('points', (cx - 14) + ',' + (y - 12) + ' ' + (cx - 14) + ',' + (y + 12) + ' ' + (cx + 14) + ',' + y)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx + 14).attr('y1', y - 14).attr('x2', cx + 14).attr('y2', y + 14)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.4);
    }

    function capacitor(g, x, y0, gx, gy) {
        var midY = (y0 + gy) / 2;
        g.append('line').attr('x1', x).attr('y1', y0).attr('x2', x).attr('y2', midY - 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', x - 16).attr('y1', midY - 5).attr('x2', x + 16).attr('y2', midY - 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.4);
        g.append('line').attr('x1', x - 16).attr('y1', midY + 5).attr('x2', x + 16).attr('y2', midY + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.4);
        g.append('line').attr('x1', x).attr('y1', midY + 5).attr('x2', x).attr('y2', gy)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('text').attr('x', x - 22).attr('y', midY + 4).attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text('C');
    }

    function mosfetVertical(g, x, y) {
        // Vertical orientation: drain at top, source at bottom, gate to the right.
        // Drain pin sits at (x, y - 30); source pin at (x, y + 30); gate pin at (x + 38, y).
        g.append('line').attr('x1', x).attr('y1', y - 30).attr('x2', x).attr('y2', y - 14)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', x).attr('y1', y + 14).attr('x2', x).attr('y2', y + 30)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        // Channel bars (drain-side and source-side; the gap between them is the channel)
        g.append('line').attr('class', 'mos-ch')
            .attr('x1', x - 14).attr('y1', y - 14).attr('x2', x + 14).attr('y2', y - 14)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.0);
        g.append('line').attr('class', 'mos-ch')
            .attr('x1', x - 14).attr('y1', y + 14).attr('x2', x + 14).attr('y2', y + 14)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.0);
        // Gate plate (offset right, separated from the channel by the dielectric gap)
        g.append('rect').attr('x', x + 18).attr('y', y - 14).attr('width', 4).attr('height', 28)
            .attr('fill', 'var(--text-dim)');
        // Gate connector lead
        g.append('line').attr('x1', x + 22).attr('y1', y).attr('x2', x + 38).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        // Label
        g.append('text').attr('x', x - 22).attr('y', y - 10).attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--muted)').text('M1');
    }

    function ground(g, x, y) {
        g.append('line').attr('x1', x - 14).attr('y1', y).attr('x2', x + 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', x - 9).attr('y1', y + 5).attr('x2', x + 9).attr('y2', y + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line').attr('x1', x - 4).attr('y1', y + 10).attr('x2', x + 4).attr('y2', y + 10)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }

    function drawTrace(pts) {
        var f = makeFrame(traceSvg);
        f.g.selectAll('*').remove();

        var yMax = state.amp + 0.4;
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-yMax, yMax]).range([f.ih, 0]);

        // Reset windows shaded
        var n = Math.ceil(T_VIEW / state.win);
        for (var i = 0; i < n; i++) {
            var t0 = i * state.win;
            var t1 = Math.min(T_VIEW, t0 + state.rst);
            f.g.append('rect').attr('x', x(t0)).attr('y', 0)
                .attr('width', x(t1) - x(t0)).attr('height', f.ih)
                .attr('fill', 'var(--c-thresh)').attr('opacity', 0.10);
        }

        var grid = f.g.append('g').attr('class', 'grid');
        [-1, 0, 1].forEach(function (v) {
            grid.append('line').attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--grid-line)');
        });
        grid.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        f.g.append('path')
            .datum(pts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
        f.g.append('path')
            .datum(pts)
            .attr('class', 'trace output')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[2]); }));

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + y(0) + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return (d * 1000).toFixed(0) + ' ms'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues(d3.range(-Math.floor(yMax), Math.floor(yMax) + 1, 1))
                .tickFormat(function (d) { return d.toFixed(0); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text').attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle').text('Time');
        f.g.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle').text('Voltage (V)');

        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',8)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('v_in(t)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('v_out(t)');
    }

    function drawReset(rstPts) {
        var f = makeFrame(rstSvg, { minH: 110, margin: { top: 18, right: 28, bottom: 32, left: 56 } });
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-0.2, 1.2]).range([f.ih, 0]);

        // Build step waveform
        var stepPts = [];
        var prev = -1;
        for (var i = 0; i < rstPts.length; i++) {
            if (rstPts[i][1] !== prev) {
                if (stepPts.length) stepPts.push([rstPts[i][0], prev]);
                stepPts.push([rstPts[i][0], rstPts[i][1]]);
                prev = rstPts[i][1];
            }
        }
        stepPts.push([T_VIEW, prev]);

        f.g.append('path')
            .datum(stepPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 2.0)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        f.g.append('text').attr('x', -8).attr('y', y(1) + 4).attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--muted)').text('RESET');
        f.g.append('text').attr('x', -8).attr('y', y(0) + 4).attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--muted)').text('HOLD');

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return (d * 1000).toFixed(0) + ' ms'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        f.g.append('text').attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 28)
            .attr('text-anchor', 'middle').text('Time');
    }

    function highlightMosfet(active) {
        circSvg.selectAll('.mos-ch')
            .attr('stroke', active ? 'var(--c-thresh)' : 'var(--text-dim)')
            .attr('opacity', active ? 1.0 : 0.85);
    }

    function refresh() {
        var sim = simulate();
        drawTrace(sim.sig);
        drawReset(sim.rst);

        rdW.textContent = (state.win * 1000).toFixed(0) + ' ms';
        var lastPeak = 0;
        // Find the peak captured in the current window: scan since last reset edge
        // before T_VIEW.
        var nWin = Math.floor(T_VIEW / state.win);
        var t0 = nWin * state.win + state.rst;
        for (var j = 0; j < sim.sig.length; j++) {
            if (sim.sig[j][0] >= t0) {
                if (sim.sig[j][2] > lastPeak) lastPeak = sim.sig[j][2];
            }
        }
        rdPk.textContent = lastPeak.toFixed(2) + ' V';

        var resetting = inReset(T_VIEW - 1e-6);
        rdSw.textContent = resetting ? 'on' : 'off';
        rdSw.className = 'v ' + (resetting ? 'warn' : 'on');
        highlightMosfet(resetting);
    }

    function init() {
        drawCircuit();
        winI.addEventListener('input', function () {
            state.win = parseFloat(winI.value) / 1000;
            winL.textContent = parseFloat(winI.value).toFixed(0) + ' ms';
            refresh();
        });
        rstI.addEventListener('input', function () {
            state.rst = parseFloat(rstI.value) / 1000;
            rstL.textContent = parseFloat(rstI.value).toFixed(1) + ' ms';
            refresh();
        });
        fcI.addEventListener('input', function () {
            state.fc = parseFloat(fcI.value);
            fcL.textContent = state.fc.toFixed(1) + ' Hz';
            refresh();
        });
        window.addEventListener('themechange', function () { drawCircuit(); refresh(); });
        window.addEventListener('resize', function () { drawCircuit(); refresh(); });
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
