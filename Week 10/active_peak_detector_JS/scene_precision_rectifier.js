// Scene 01 · Precision half-wave rectifier (super diode).
// V_in drives the (+) input. The op-amp output drives the diode anode and the
// diode cathode is the output node. Negative feedback from the output node to
// the (-) input forces V_out = V_in for V_in > 0. For V_in < 0 the op-amp
// saturates and the diode blocks, so V_out = 0. The diode drop V_F is
// absorbed inside the loop and does not appear on the output.
(function () {
    var ampI = document.getElementById('ap-r-amp');
    var vfI  = document.getElementById('ap-r-vf');
    var fI   = document.getElementById('ap-r-f');
    var ampL = document.getElementById('ap-r-amp-val');
    var vfL  = document.getElementById('ap-r-vf-val');
    var fL   = document.getElementById('ap-r-f-val');
    var rdVp     = document.getElementById('ap-r-vp');
    var rdVpPas  = document.getElementById('ap-r-vp-pas');
    var rdVpPre  = document.getElementById('ap-r-vp-pre');
    var rdSmall  = document.getElementById('ap-r-small');

    var state = { amp: 1.4, vf: 0.65, f: 1.2 };
    var T_VIEW = 4.0;

    var traceSvg = d3.select('#plot-ap-r-trace').classed('ov', true);
    var circSvg  = d3.select('#plot-ap-r-circ').classed('ov', true);

    function vIn(t) { return state.amp * Math.sin(2 * Math.PI * state.f * t); }

    // Passive half-wave rectifier (single diode + load): output is max(0, v - V_F).
    function passiveOut(v) { return Math.max(0, v - state.vf); }
    // Precision half-wave rectifier: output is max(0, v) (V_F is divided by A_OL).
    function precisionOut(v) { return Math.max(0, v); }

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

    // ---- circuit primitives ------------------------------------------------
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
    function source(g, x, y, label) {
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', 24)
            .attr('fill', 'var(--bg-2)').attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('path').attr('d',
            'M ' + (x - 14) + ',' + y + ' Q ' + (x - 7) + ',' + (y - 12) + ' ' + x + ',' + y +
            ' T ' + (x + 14) + ',' + y)
            .attr('fill', 'none').attr('stroke', 'var(--c-input)').attr('stroke-width', 1.6);
        g.append('text').attr('x', x).attr('y', y + 46).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text(label);
    }
    function diodeH(g, cx, cy, label) {
        // Triangle pointing right with cathode bar; anode on left, cathode on right.
        g.append('polygon').attr('class', 'diode-body')
            .attr('points', (cx - 14) + ',' + (cy - 12) + ' ' + (cx - 14) + ',' + (cy + 12) + ' ' + (cx + 14) + ',' + cy)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx + 14).attr('y1', cy - 14).attr('x2', cx + 14).attr('y2', cy + 14)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.4);
        if (label) {
            g.append('text').attr('x', cx).attr('y', cy - 24).attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
                .attr('fill', 'var(--muted)').text(label);
        }
    }
    function resistorV(g, x, y0, y1, label) {
        var topY = (y0 + y1) / 2 - 22;
        var botY = (y0 + y1) / 2 + 22;
        g.append('line').attr('x1', x).attr('y1', y0).attr('x2', x).attr('y2', topY)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('rect').attr('x', x - 12).attr('y', topY).attr('width', 24).attr('height', botY - topY)
            .attr('fill', 'var(--bg-panel)').attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', x).attr('y1', botY).attr('x2', x).attr('y2', y1)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        if (label) {
            g.append('text').attr('x', x + 22).attr('y', (topY + botY) / 2 + 4)
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
                .attr('fill', 'var(--muted)').text(label);
        }
    }
    function ground(g, x, y) {
        g.append('line').attr('x1', x - 14).attr('y1', y).attr('x2', x + 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', x - 9).attr('y1', y + 5).attr('x2', x + 9).attr('y2', y + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line').attr('x1', x - 4).attr('y1', y + 10).attr('x2', x + 4).attr('y2', y + 10)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }
    // Op-amp drawn as a triangle. (+) is the top input, (-) the bottom input.
    // Returns the connection nodes the caller should wire to.
    function opAmp(g, lx, cy, opts) {
        opts = opts || {};
        var w = opts.w || 64;
        var halfH = opts.halfH || 36;
        var rx = lx + w;
        g.append('polygon')
            .attr('points', lx + ',' + (cy - halfH) + ' ' + lx + ',' + (cy + halfH) + ' ' + rx + ',' + cy)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        var inPlusY  = cy - halfH * 0.45;
        var inMinusY = cy + halfH * 0.45;
        g.append('text').attr('x', lx + 8).attr('y', inPlusY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--text-dim)').text('+');
        g.append('text').attr('x', lx + 8).attr('y', inMinusY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 14)
            .attr('fill', 'var(--text-dim)').text('−');
        if (opts.label) {
            g.append('text').attr('x', lx + w / 2 - 4).attr('y', cy + halfH + 16)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
                .attr('fill', 'var(--muted)').text(opts.label);
        }
        return {
            inPlus:  { x: lx, y: inPlusY },
            inMinus: { x: lx, y: inMinusY },
            out:     { x: rx, y: cy }
        };
    }
    function dot(g, x, y) {
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', 3.2)
            .attr('fill', 'var(--text-dim)');
    }

    // ---- circuit drawing ---------------------------------------------------
    function drawCircuit() {
        var W0 = 720, H0 = 400;
        circSvg.attr('viewBox', '0 0 ' + W0 + ' ' + H0);
        circSvg.selectAll('*').remove();
        var g = circSvg.append('g');

        var srcX = 80, srcY = 200;
        var op = opAmp(g, 200, 200, { label: 'A1' });
        var dCx = op.out.x + 60;
        var dY  = op.out.y;
        var fbX  = dCx + 70;     // feedback tap on the rail
        var loadX = fbX + 70;    // load resistor sits to the right of the tap
        var termX = loadX + 70;  // output terminal sits at the far right
        var gndY = 340;

        // Source to (+)
        wire(g, srcX + 24, srcY, op.inPlus.x - 8, srcY);
        wire(g, op.inPlus.x - 8, srcY, op.inPlus.x - 8, op.inPlus.y);
        wire(g, op.inPlus.x - 8, op.inPlus.y, op.inPlus.x, op.inPlus.y);
        source(g, srcX, srcY, 'v_in');

        // Op-amp output to diode anode
        wire(g, op.out.x, op.out.y, dCx - 14, dY);
        diodeH(g, dCx, dY, 'D1');

        // Diode cathode through feedback tap and load tap to the output terminal
        wire(g, dCx + 14, dY, termX, dY);
        dot(g, fbX, dY);
        dot(g, loadX, dY);

        // Load resistor to ground at its own tap
        resistorV(g, loadX, dY, gndY, 'R_L');
        ground(g, loadX, gndY + 4);

        // Output terminal
        g.append('circle').attr('cx', termX).attr('cy', dY).attr('r', 4)
            .attr('fill', 'var(--c-output)');
        g.append('text').attr('x', termX + 10).attr('y', dY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--c-output)').text('v_out');

        // Feedback: tap drops below the circuit then returns to the (-) input
        var fbY = op.inMinus.y + 70;
        wire(g, fbX, dY, fbX, fbY);
        wire(g, fbX, fbY, op.inMinus.x - 16, fbY);
        wire(g, op.inMinus.x - 16, fbY, op.inMinus.x - 16, op.inMinus.y);
        wire(g, op.inMinus.x - 16, op.inMinus.y, op.inMinus.x, op.inMinus.y);

        // V_F annotation across the diode
        g.append('text').attr('x', dCx).attr('y', dY + 32).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-thresh)').text('V_F absorbed');
    }

    // ---- trace drawing -----------------------------------------------------
    function drawTrace() {
        var f = makeFrame(traceSvg);
        f.g.selectAll('*').remove();

        var yMax = Math.max(2.6, state.amp + 0.4);
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-yMax, yMax]).range([f.ih, 0]);

        // Gridlines
        var grid = f.g.append('g').attr('class', 'grid');
        d3.range(-Math.floor(yMax), Math.floor(yMax) + 1).forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--grid-line)');
        });
        grid.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        // Sample the three traces
        var n = 800;
        var inPts = new Array(n + 1);
        var pasPts = new Array(n + 1);
        var prePts = new Array(n + 1);
        for (var i = 0; i <= n; i++) {
            var t = (i / n) * T_VIEW;
            var v = vIn(t);
            inPts[i] = [t, v];
            pasPts[i] = [t, passiveOut(v)];
            prePts[i] = [t, precisionOut(v)];
        }

        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });

        // Input
        f.g.append('path').datum(inPts).attr('class', 'trace input').attr('d', line);
        // Passive (offset, smaller)
        f.g.append('path').datum(pasPts).attr('class', 'trace passive-simple').attr('d', line);
        // Precision
        f.g.append('path').datum(prePts).attr('class', 'trace precision').attr('d', line);

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

        f.g.append('text').attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle').text('Time');
        f.g.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle').text('Voltage (V)');

        // Legend (top right)
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',8)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('v_in(t)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-passive)').text('passive half-wave');
        lg.append('text').attr('text-anchor', 'end').attr('y', 42)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-precision)').text('precision half-wave');
    }

    function updateReadout() {
        rdVp.textContent     = state.amp.toFixed(2) + ' V';
        rdVpPas.textContent  = Math.max(0, state.amp - state.vf).toFixed(2) + ' V';
        rdVpPre.textContent  = state.amp.toFixed(2) + ' V';
        if (state.amp <= state.vf) {
            rdSmall.textContent = 'V_F blocks passive';
            rdSmall.className = 'v warn';
        } else {
            rdSmall.textContent = 'passes';
            rdSmall.className = 'v on';
        }
    }

    function refresh() {
        drawTrace();
        updateReadout();
    }

    function init() {
        drawCircuit();
        ampI.addEventListener('input', function () {
            state.amp = parseFloat(ampI.value);
            ampL.textContent = state.amp.toFixed(2) + ' V';
            refresh();
        });
        vfI.addEventListener('input', function () {
            state.vf = parseFloat(vfI.value);
            vfL.textContent = state.vf.toFixed(2) + ' V';
            refresh();
        });
        fI.addEventListener('input', function () {
            state.f = parseFloat(fI.value);
            fL.textContent = state.f.toFixed(1) + ' Hz';
            refresh();
        });
        window.addEventListener('themechange', function () { drawCircuit(); refresh(); });
        window.addEventListener('resize', function () { drawCircuit(); refresh(); });
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
