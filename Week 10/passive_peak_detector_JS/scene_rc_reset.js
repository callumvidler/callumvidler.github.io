// Scene 02 · Self-resetting peak detector with a bleed resistor.
// Capacitor charges to v_in - V_F whenever the diode conducts; otherwise it
// discharges through R with time constant tau = R*C. The output therefore
// follows the input envelope, with ripple on the carrier scale and lag on
// the envelope scale.
(function () {
    var tauI = document.getElementById('pp-r-tau');
    var fcI  = document.getElementById('pp-r-fc');
    var feI  = document.getElementById('pp-r-fe');
    var tauL = document.getElementById('pp-r-tau-val');
    var fcL  = document.getElementById('pp-r-fc-val');
    var feL  = document.getElementById('pp-r-fe-val');
    var rdRatio  = document.getElementById('pp-r-ratio');
    var rdRipple = document.getElementById('pp-r-ripple');
    var rdLag    = document.getElementById('pp-r-lag');

    // tau slider gives milliseconds.
    var state = {
        tau: 0.120, fc: 12.0, fe: 1.0,
        amp: 1.6, vf: 0.4
    };
    var T_VIEW = 4.0;

    var traceSvg = d3.select('#plot-pp-r-trace').classed('ov', true);
    var circSvg  = d3.select('#plot-pp-r-circ').classed('ov', true);

    function envelope(t) {
        // A modulating envelope that rises and falls within the window.
        return 0.55 + 0.40 * Math.sin(2 * Math.PI * state.fe * t);
    }
    function vIn(t) {
        return state.amp * envelope(t) * Math.sin(2 * Math.PI * state.fc * t);
    }

    function simulate() {
        var dt = 1 / 4000;
        var n = Math.round(T_VIEW / dt);
        var pts = new Array(n);
        var vc = 0;
        for (var i = 0; i < n; i++) {
            var t = i * dt;
            var v = vIn(t);
            // Diode conducts when v - V_F > vc; if so, capacitor follows v - V_F
            // (assume small source impedance, so charging is effectively instant
            // compared with discharge through R).
            var target = v - state.vf;
            if (target > vc) vc = target;
            else vc -= vc * (dt / state.tau);
            if (vc < 0) vc = 0;
            pts[i] = [t, v, vc];
        }
        return pts;
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
        var W0 = 720, H0 = 400;
        circSvg.attr('viewBox', '0 0 ' + W0 + ' ' + H0);
        circSvg.selectAll('*').remove();
        var g = circSvg.append('g');

        var src = { x: 90, y: 200 };
        var dIn = { x: 220, y: 200 };
        var dOut = { x: 340, y: 200 };
        var capX = 460, resX = 560;
        var gnd = { y: 320 };
        var out = { x: 660, y: 200 };

        // Top rail: source -> diode -> capacitor node -> resistor node -> output
        wire(g, src.x + 24, src.y, dIn.x, dIn.y);
        diode(g, dIn.x, dIn.y, dOut.x, dOut.y);
        wire(g, dOut.x, dOut.y, out.x - 14, src.y);

        // Capacitor and resistor in parallel between the rail and ground
        capacitor(g, capX, src.y, capX, gnd.y);
        resistor(g, resX, src.y, resX, gnd.y);

        // Single bottom rail joining cap bottom and resistor bottom
        g.append('line').attr('x1', capX).attr('y1', gnd.y).attr('x2', resX).attr('y2', gnd.y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        var gndX = (capX + resX) / 2;
        var gndY = gnd.y + 12;
        g.append('line').attr('x1', gndX).attr('y1', gnd.y).attr('x2', gndX).attr('y2', gndY)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        ground(g, gndX, gndY);

        source(g, src.x, src.y, 'v_in');

        // Output dot and label
        g.append('circle').attr('cx', out.x - 14).attr('cy', out.y).attr('r', 4)
            .attr('fill', 'var(--c-output)');
        g.append('text').attr('x', out.x).attr('y', out.y + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--c-output)').text('v_out');

        // Junction dots where cap and resistor branch off the rail and join ground rail
        [[capX, src.y], [resX, src.y], [capX, gnd.y], [resX, gnd.y]].forEach(function (p) {
            g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 3.5)
                .attr('fill', 'var(--text-dim)');
        });

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
        // Connecting leads
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

    function resistor(g, x, y0, gx, gy) {
        // Vertical wire-rectangle-wire, per project convention
        var topY = (y0 + gy) / 2 - 22;
        var botY = (y0 + gy) / 2 + 22;
        g.append('line').attr('x1', x).attr('y1', y0).attr('x2', x).attr('y2', topY)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('rect').attr('x', x - 12).attr('y', topY).attr('width', 24).attr('height', botY - topY)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', x).attr('y1', botY).attr('x2', x).attr('y2', gy)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('text').attr('x', x + 22).attr('y', (topY + botY) / 2 + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text('R');
    }

    function ground(g, x, y) {
        g.append('line').attr('x1', x - 14).attr('y1', y).attr('x2', x + 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', x - 9).attr('y1', y + 5).attr('x2', x + 9).attr('y2', y + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line').attr('x1', x - 4).attr('y1', y + 10).attr('x2', x + 4).attr('y2', y + 10)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }

    function drawTrace() {
        var f = makeFrame(traceSvg);
        f.g.selectAll('*').remove();

        var pts = simulate();
        var yMax = state.amp + 0.4;
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-yMax, yMax]).range([f.ih, 0]);

        var grid = f.g.append('g').attr('class', 'grid');
        [-1, 0, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--grid-line)');
        });
        grid.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        // True envelope (peak of v_in)
        var envPts = [];
        var nE = 200;
        for (var k = 0; k <= nE; k++) {
            var t = (k / nE) * T_VIEW;
            envPts.push([t, state.amp * envelope(t)]);
        }
        f.g.append('path')
            .datum(envPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '4 3').attr('opacity', 0.7)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

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
            .call(d3.axisBottom(x).ticks(5)
                .tickFormat(function (d) { return d.toFixed(1) + ' s'; })
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

        // Legend
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',8)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('v_in(t)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('v_out(t)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 42)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-thresh)').text('true envelope');

        return pts;
    }

    function updateReadout(pts) {
        var Tc = 1 / state.fc;
        var ratio = state.tau / Tc;
        rdRatio.textContent = ratio.toFixed(2);

        // Estimate ripple: peak-to-peak of the output across the last second
        var t0 = T_VIEW - 1.0;
        var lo = Infinity, hi = -Infinity;
        for (var i = 0; i < pts.length; i++) {
            if (pts[i][0] >= t0) {
                if (pts[i][2] < lo) lo = pts[i][2];
                if (pts[i][2] > hi) hi = pts[i][2];
            }
        }
        var ripple = isFinite(hi - lo) ? (hi - lo) : 0;
        rdRipple.textContent = ripple.toFixed(2) + ' V';

        var Te = 1 / state.fe;
        if (state.tau < 0.5 * Tc) {
            rdLag.textContent = 'noisy';
            rdLag.className = 'v warn';
        } else if (state.tau > 0.5 * Te) {
            rdLag.textContent = 'severe';
            rdLag.className = 'v warn';
        } else if (state.tau > 0.2 * Te) {
            rdLag.textContent = 'moderate';
            rdLag.className = 'v amber';
        } else {
            rdLag.textContent = 'low';
            rdLag.className = 'v on';
        }
    }

    function refresh() {
        var pts = drawTrace();
        updateReadout(pts);
    }

    function init() {
        drawCircuit();
        tauI.addEventListener('input', function () {
            state.tau = parseFloat(tauI.value) / 1000;
            tauL.textContent = parseFloat(tauI.value).toFixed(0) + ' ms';
            refresh();
        });
        fcI.addEventListener('input', function () {
            state.fc = parseFloat(fcI.value);
            fcL.textContent = state.fc.toFixed(1) + ' Hz';
            refresh();
        });
        feI.addEventListener('input', function () {
            state.fe = parseFloat(feI.value);
            feL.textContent = state.fe.toFixed(1) + ' Hz';
            refresh();
        });
        window.addEventListener('themechange', function () { drawCircuit(); refresh(); });
        window.addEventListener('resize', function () { drawCircuit(); refresh(); });
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
