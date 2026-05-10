// Scene 01 · Simple diode and capacitor peak detector.
// The capacitor charges to v_in - V_F whenever the diode is forward-biased
// and is otherwise isolated. There is no discharge path, so the output is the
// running maximum of v_in - V_F since reset.
(function () {
    var ampI = document.getElementById('pp-s-amp');
    var vfI  = document.getElementById('pp-s-vf');
    var ampL = document.getElementById('pp-s-amp-val');
    var vfL  = document.getElementById('pp-s-vf-val');
    var btnR = document.getElementById('pp-s-reset');
    var rdVp = document.getElementById('pp-s-vp');
    var rdVo = document.getElementById('pp-s-vo');
    var rdVd = document.getElementById('pp-s-vd');
    var rdSt = document.getElementById('pp-s-st');

    var state = {
        amp: 1.6, vf: 0.7,
        vCap: 0,
        t: 0,
        f: 1.2,
        buf: []
    };
    var T_VIEW = 4.0;       // seconds shown
    var DT = 0.012;         // simulation step (s)

    var traceSvg = d3.select('#plot-pp-s-trace').classed('ov', true);
    var circSvg  = d3.select('#plot-pp-s-circ').classed('ov', true);

    function vIn(t) { return state.amp * Math.sin(2 * Math.PI * state.f * t); }

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

        var src = { x: 100, y: 200 };
        var dIn = { x: 240, y: 200 };
        var dOut = { x: 360, y: 200 };
        var cap = { x: 480, y: 200 };
        var gnd = { x: 480, y: 320 };
        var out = { x: 620, y: 200 };

        // Top rail: source -> diode -> cap node -> output
        wire(g, src.x + 24, src.y, dIn.x, dIn.y);
        diode(g, dIn.x, dIn.y, dOut.x, dOut.y);
        wire(g, dOut.x, dOut.y, out.x - 14, out.y);

        // Capacitor drops from the rail down to ground
        capacitor(g, cap.x, cap.y, gnd.x, gnd.y);
        ground(g, gnd.x, gnd.y);

        // Source on the input
        source(g, src.x, src.y, 'v_in');

        // Output dot and label
        g.append('circle').attr('cx', out.x - 14).attr('cy', out.y).attr('r', 4)
            .attr('fill', 'var(--c-output)');
        g.append('text').attr('x', out.x).attr('y', out.y + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--c-output)').text('v_out');

        // Junction dot where the cap branches off the top rail
        g.append('circle').attr('cx', cap.x).attr('cy', cap.y).attr('r', 3.5)
            .attr('fill', 'var(--text-dim)');

        // Diode label
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
                .attr('fill', 'none')
                .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        }
    }

    function diode(g, x1, y, x2, y2) {
        // Connecting leads, then triangle pointing right with cathode bar.
        var cx = (x1 + x2) / 2;
        g.append('line').attr('x1', x1).attr('y1', y).attr('x2', cx - 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx + 14).attr('y1', y).attr('x2', x2).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('polygon')
            .attr('class', 'diode-body')
            .attr('points', (cx - 14) + ',' + (y - 12) + ' ' + (cx - 14) + ',' + (y + 12) + ' ' + (cx + 14) + ',' + y)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line')
            .attr('class', 'diode-bar')
            .attr('x1', cx + 14).attr('y1', y - 14)
            .attr('x2', cx + 14).attr('y2', y + 14)
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
        g.append('text').attr('x', x + 22).attr('y', midY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text('C');
    }

    function ground(g, x, y) {
        g.append('line').attr('x1', x - 14).attr('y1', y).attr('x2', x + 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', x - 9).attr('y1', y + 5).attr('x2', x + 9).attr('y2', y + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line').attr('x1', x - 4).attr('y1', y + 10).attr('x2', x + 4).attr('y2', y + 10)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }

    function highlightDiode(active) {
        circSvg.select('.diode-body')
            .attr('fill', active ? 'var(--c-output)' : 'var(--bg-panel)')
            .attr('opacity', active ? 0.55 : 1.0);
    }

    function step(dt) {
        state.t += dt;
        var v = vIn(state.t);
        var conducting = (v - state.vf) > state.vCap;
        if (conducting) state.vCap = v - state.vf;
        state.buf.push({ t: state.t, vIn: v, vOut: state.vCap, on: conducting });
        var tMin = state.t - T_VIEW;
        while (state.buf.length && state.buf[0].t < tMin) state.buf.shift();
        return conducting;
    }

    function drawTrace() {
        var f = makeFrame(traceSvg);
        f.g.selectAll('*').remove();

        var yMax = Math.max(2.6, state.amp + 0.4);
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-yMax, yMax]).range([f.ih, 0]);

        // Gridlines at zero and at amp - vf (the steady-state output)
        var grid = f.g.append('g').attr('class', 'grid');
        [-state.amp, 0, state.amp].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--grid-line)');
        });
        grid.append('line')
            .attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        // Theoretical hold line at A - V_F
        var ssOut = Math.max(0, state.amp - state.vf);
        f.g.append('line')
            .attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(ssOut)).attr('y2', y(ssOut))
            .attr('stroke', 'var(--c-output)').attr('stroke-width', 1.0)
            .attr('stroke-dasharray', '4 4').attr('opacity', 0.4);
        f.g.append('text')
            .attr('x', f.iw - 8).attr('y', y(ssOut) - 6)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--c-output)')
            .text('A − V_F');

        // Convert buffer t into a relative time in view (t_rel = t - (current_t - T_VIEW))
        var t0 = Math.max(0, state.t - T_VIEW);
        var pts = state.buf.map(function (p) { return [p.t - t0, p.vIn, p.vOut]; });

        if (pts.length > 1) {
            f.g.append('path')
                .datum(pts)
                .attr('class', 'trace input')
                .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
            f.g.append('path')
                .datum(pts)
                .attr('class', 'trace output')
                .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[2]); }));
        }

        // Axes
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

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle')
            .text('Time');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Voltage (V)');

        // Legend (top right)
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',8)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('v_in(t)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('v_out(t)');
    }

    function updateReadout(conducting) {
        var ssOut = Math.max(0, state.amp - state.vf);
        rdVp.textContent = state.amp.toFixed(2) + ' V';
        rdVo.textContent = state.vCap.toFixed(2) + ' V';
        rdVd.textContent = state.vf.toFixed(2) + ' V';
        if (state.amp <= state.vf) {
            rdSt.textContent = 'V_F blocked';
            rdSt.className = 'v warn';
        } else if (state.vCap < ssOut - 1e-3 && conducting) {
            rdSt.textContent = 'charging';
            rdSt.className = 'v on';
        } else if (state.vCap >= ssOut - 1e-3) {
            rdSt.textContent = 'held';
            rdSt.className = 'v on';
        } else {
            rdSt.textContent = 'isolated';
            rdSt.className = 'v off';
        }
    }

    function reset() {
        state.vCap = 0;
        state.t = 0;
        state.buf = [];
    }

    function tick() {
        var conducting = step(DT);
        drawTrace();
        highlightDiode(conducting);
        updateReadout(conducting);
        requestAnimationFrame(tick);
    }

    function init() {
        drawCircuit();
        ampI.addEventListener('input', function () {
            state.amp = parseFloat(ampI.value);
            ampL.textContent = state.amp.toFixed(2) + ' V';
            // Allow output to follow when amplitude is reduced and the held value
            // can no longer be reached; the diode still blocks discharge so the
            // visible behaviour is that v_out exceeds (A - V_F) until the input
            // somehow rises higher. To keep the demo legible we clamp.
            if (state.vCap > state.amp - state.vf) state.vCap = Math.max(0, state.amp - state.vf);
        });
        vfI.addEventListener('input', function () {
            state.vf = parseFloat(vfI.value);
            vfL.textContent = state.vf.toFixed(2) + ' V';
        });
        btnR.addEventListener('click', reset);
        window.addEventListener('themechange', function () { drawCircuit(); });
        window.addEventListener('resize', function () { drawCircuit(); });
        requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
