// Scene 02 · Precision peak detector.
// Op-amp A1 drives diode D1 into the storage capacitor C. A unity-gain buffer
// A2 presents the capacitor voltage to the load and supplies feedback to A1's
// inverting input, so the loop forces V_C = V_in whenever V_in is rising.
// When V_in falls, A1 saturates negative, D1 reverse-biases, and C holds the
// peak with no V_F offset and no droop from the load. An n-channel MOSFET
// across C empties the capacitor when the reset gate is asserted, defining
// independent measurement windows.
(function () {
    var ampI = document.getElementById('ap-a-amp');
    var vfI  = document.getElementById('ap-a-vf');
    var winI = document.getElementById('ap-a-win');
    var fcI  = document.getElementById('ap-a-fc');
    var ampL = document.getElementById('ap-a-amp-val');
    var vfL  = document.getElementById('ap-a-vf-val');
    var winL = document.getElementById('ap-a-win-val');
    var fcL  = document.getElementById('ap-a-fc-val');
    var rdVp  = document.getElementById('ap-a-vp');
    var rdPas = document.getElementById('ap-a-pas');
    var rdPre = document.getElementById('ap-a-pre');
    var rdW   = document.getElementById('ap-a-w');

    var state = {
        amp: 0.30, vf: 0.60,
        win: 0.300, fc: 14.0,
        rstW: 0.012
    };
    var T_VIEW = 1.5;
    var DT = 1 / 4000;

    var traceSvg = d3.select('#plot-ap-a-trace').classed('ov', true);
    var rstSvg   = d3.select('#plot-ap-a-rst').classed('ov', true);
    var circSvg  = d3.select('#plot-ap-a-circ').classed('ov', true);

    function vIn(t) {
        // A modulated burst that rises and decays across the view: small
        // amplitude on the slider sits below V_F when V_F is large, so the
        // contrast with the passive variant is visible.
        var env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.6 * t - 0.4);
        return state.amp * env * Math.sin(2 * Math.PI * state.fc * t);
    }
    function rstActive(t) {
        // Reset pulses every state.win, narrow pulse of state.rstW seconds.
        var phase = t % state.win;
        return phase < state.rstW;
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
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', 22)
            .attr('fill', 'var(--bg-2)').attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('path').attr('d',
            'M ' + (x - 13) + ',' + y + ' Q ' + (x - 6.5) + ',' + (y - 11) + ' ' + x + ',' + y +
            ' T ' + (x + 13) + ',' + y)
            .attr('fill', 'none').attr('stroke', 'var(--c-input)').attr('stroke-width', 1.6);
        g.append('text').attr('x', x).attr('y', y + 42).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text(label);
    }
    function diodeH(g, cx, cy, label) {
        g.append('polygon')
            .attr('points', (cx - 12) + ',' + (cy - 11) + ' ' + (cx - 12) + ',' + (cy + 11) + ' ' + (cx + 12) + ',' + cy)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx + 12).attr('y1', cy - 13).attr('x2', cx + 12).attr('y2', cy + 13)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.2);
        if (label) {
            g.append('text').attr('x', cx).attr('y', cy - 20).attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
                .attr('fill', 'var(--muted)').text(label);
        }
    }
    function capV(g, x, y0, y1, label) {
        var midY = (y0 + y1) / 2;
        g.append('line').attr('x1', x).attr('y1', y0).attr('x2', x).attr('y2', midY - 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', x - 14).attr('y1', midY - 5).attr('x2', x + 14).attr('y2', midY - 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.4);
        g.append('line').attr('x1', x - 14).attr('y1', midY + 5).attr('x2', x + 14).attr('y2', midY + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.4);
        g.append('line').attr('x1', x).attr('y1', midY + 5).attr('x2', x).attr('y2', y1)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        if (label) {
            g.append('text').attr('x', x - 18).attr('y', midY + 4).attr('text-anchor', 'end')
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
                .attr('fill', 'var(--muted)').text(label);
        }
    }
    function ground(g, x, y) {
        // Earth-ground symbol: a short vertical stub from the connection point
        // down to three horizontal lines of decreasing width.
        g.append('line').attr('x1', x).attr('y1', y).attr('x2', x).attr('y2', y + 4)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', x - 12).attr('y1', y + 4).attr('x2', x + 12).attr('y2', y + 4)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', x - 8).attr('y1', y + 8).attr('x2', x + 8).attr('y2', y + 8)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line').attr('x1', x - 4).attr('y1', y + 12).attr('x2', x + 4).attr('y2', y + 12)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }
    function opAmp(g, lx, cy, opts) {
        opts = opts || {};
        var w = opts.w || 56;
        var halfH = opts.halfH || 30;
        var rx = lx + w;
        g.append('polygon')
            .attr('points', lx + ',' + (cy - halfH) + ' ' + lx + ',' + (cy + halfH) + ' ' + rx + ',' + cy)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        var topY    = cy - halfH * 0.45;
        var botY    = cy + halfH * 0.45;
        var inPlusY  = opts.flipInputs ? botY : topY;
        var inMinusY = opts.flipInputs ? topY : botY;
        g.append('text').attr('x', lx + 6).attr('y', inPlusY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--text-dim)').text('+');
        g.append('text').attr('x', lx + 6).attr('y', inMinusY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--text-dim)').text('−');
        if (opts.label) {
            g.append('text').attr('x', lx + w / 2 - 4).attr('y', cy + halfH + 14)
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
    // n-channel MOSFET (enhancement). Drain on top, source on bottom. The
    // channel is a thicker vertical bar at cx and the gate is a parallel
    // vertical line offset to the chosen side, capacitively coupled to the
    // channel via a small gap. The source arrow points toward the channel
    // (NMOS convention). Optional opts.midY positions the channel along the
    // drain-to-source span; opts.gateSide selects 'left' or 'right'.
    function mosfet(g, cx, drainY, sourceY, opts) {
        opts = opts || {};
        var gateSide = opts.gateSide === 'right' ? 'right' : 'left';
        var hh = 12;
        var gap = 5;
        var midY = typeof opts.midY === 'number' ? opts.midY : (drainY + sourceY) / 2;
        var insX  = gateSide === 'right' ? cx + gap : cx - gap;
        var exitX = gateSide === 'right' ? insX + 5 : insX - 5;

        g.append('line').attr('x1', cx).attr('y1', drainY).attr('x2', cx).attr('y2', midY - hh)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx).attr('y1', midY + hh).attr('x2', cx).attr('y2', sourceY)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx).attr('y1', midY - hh).attr('x2', cx).attr('y2', midY + hh)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.6);
        g.append('line').attr('x1', insX).attr('y1', midY - hh - 1).attr('x2', insX).attr('y2', midY + hh + 1)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', insX).attr('y1', midY).attr('x2', exitX).attr('y2', midY)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        var aTip  = midY + hh + 2;
        var aBase = midY + hh + 8;
        g.append('polygon')
            .attr('points',
                cx + ',' + aTip + ' ' +
                (cx - 4) + ',' + aBase + ' ' +
                (cx + 4) + ',' + aBase)
            .attr('fill', 'var(--text-dim)');
        return { gate: { x: exitX, y: midY }, drain: { x: cx, y: drainY }, source: { x: cx, y: sourceY } };
    }
    function dot(g, x, y) {
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', 3.2)
            .attr('fill', 'var(--text-dim)');
    }

    function drawCircuit() {
        var W0 = 800, H0 = 460;
        circSvg.attr('viewBox', '0 0 ' + W0 + ' ' + H0);
        circSvg.selectAll('*').remove();
        var g = circSvg.append('g');

        // ---- Layout constants -------------------------------------------------
        var yRail = 180;        // storage rail (op-amp axis)
        var yGnd  = 360;        // ground rail
        var yBufFb  = 130;      // small buffer-feedback loop above A2
        var yOuterFb = 420;     // outer feedback loop below the bottom rail
        var srcX = 60;
        var capX = 320, mosX = 420, a2X = 520;
        var outX = 660;

        // ---- Functional region panels (drawn first as soft backgrounds) ------
        // labelDy lifts a panel's caption further above its rectangle when
        // needed to clear neighbouring panels or wires.
        var panels = [
            { x: 100, y: 145, w: 168, h:  90, label: 'super diode',    color: 'var(--c-output)' },
            { x: 288, y: 145, w:  72, h: 175, label: 'storage',        color: 'var(--accent)'   },
            { x: 370, y: 145, w: 110, h: 175, label: 'reset',          color: 'var(--c-thresh)' },
            { x: 500, y: 145, w: 110, h:  90, label: 'output buffer',  color: 'var(--c-buffer)', labelDy: -20 }
        ];
        panels.forEach(function (p) {
            g.append('rect').attr('x', p.x).attr('y', p.y).attr('width', p.w).attr('height', p.h)
                .attr('rx', 6).attr('ry', 6)
                .attr('fill', p.color).attr('fill-opacity', 0.05)
                .attr('stroke', p.color).attr('stroke-opacity', 0.30)
                .attr('stroke-width', 1).attr('stroke-dasharray', '3 3');
            // Panel label sits in the margin above each rectangle so it never
            // overlaps the component drawn inside.
            g.append('text').attr('x', p.x + 4).attr('y', p.y - 6 + (p.labelDy || 0))
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
                .attr('letter-spacing', '0.10em')
                .attr('fill', p.color).attr('opacity', 0.95)
                .text(p.label);
        });

        // ---- Source ----------------------------------------------------------
        source(g, srcX, yRail, 'v_in');

        // ---- A1 (super diode) -----------------------------------------------
        var op1 = opAmp(g, 130, yRail, { label: 'A1', w: 58 });
        // v_in to A1 (+)
        wire(g, srcX + 22, yRail, op1.inPlus.x - 12, yRail);
        wire(g, op1.inPlus.x - 12, yRail, op1.inPlus.x - 12, op1.inPlus.y);
        wire(g, op1.inPlus.x - 12, op1.inPlus.y, op1.inPlus.x, op1.inPlus.y);

        // ---- D1 -------------------------------------------------------------
        var dCx = 232;
        wire(g, op1.out.x, yRail, dCx - 12, yRail);
        diodeH(g, dCx, yRail, 'D1');

        // ---- A2 (output buffer) ---------------------------------------------
        var op2 = opAmp(g, a2X, yRail, { label: 'A2', w: 58, flipInputs: true });
        // Storage rail from D1 cathode to A2 (+) input (which is at the bottom
        // input pin because the symbol is drawn flipped).
        wire(g, dCx + 12, yRail, op2.inPlus.x - 12, yRail);
        wire(g, op2.inPlus.x - 12, yRail, op2.inPlus.x - 12, op2.inPlus.y);
        wire(g, op2.inPlus.x - 12, op2.inPlus.y, op2.inPlus.x, op2.inPlus.y);

        // Junction dots where the cap and the MOSFET tap the storage rail
        dot(g, capX, yRail);
        dot(g, mosX, yRail);

        // ---- Storage capacitor C --------------------------------------------
        capV(g, capX, yRail, yGnd, 'C');

        // ---- Reset MOSFET ---------------------------------------------------
        // Channel placed in the upper half of the drain-source span so the
        // gate exit sits clear of the bottom rail.
        var mos = mosfet(g, mosX, yRail, yGnd, { gateSide: 'left', midY: 220 });
        // Gate lead extends further left to the φ_rst signal terminal, kept
        // entirely inside the reset panel.
        var phiX = 388;
        wire(g, mos.gate.x, mos.gate.y, phiX + 4, mos.gate.y);
        g.append('circle').attr('cx', phiX).attr('cy', mos.gate.y).attr('r', 4)
            .attr('fill', 'var(--c-thresh)');
        g.append('text').attr('x', phiX).attr('y', mos.gate.y - 10).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--c-thresh)').text('φ_rst');
        // M_rst body label, placed to the right of the channel
        g.append('text').attr('x', mosX + 22).attr('y', mos.gate.y + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--muted)').text('M_rst');

        // ---- Bottom rail (cap bottom + MOSFET source to a single ground) ----
        wire(g, capX, yGnd, mosX, yGnd);
        var gndX = (capX + mosX) / 2;
        wire(g, gndX, yGnd, gndX, yGnd + 12);
        ground(g, gndX, yGnd + 12);

        // ---- A2 output to v_out terminal ------------------------------------
        wire(g, op2.out.x, op2.out.y, outX, op2.out.y);
        g.append('circle').attr('cx', outX).attr('cy', op2.out.y).attr('r', 4)
            .attr('fill', 'var(--c-output)');
        g.append('text').attr('x', outX + 10).attr('y', op2.out.y + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--c-output)').text('v_out');

        // Tap node where both feedback paths leave the buffer output
        var fbTapX = op2.out.x + 14;
        dot(g, fbTapX, op2.out.y);

        // ---- Buffer feedback: A2 output -> A2 (−) input ---------------------
        // (A2 is drawn flipped, so its (−) input is on the top pin.)
        wire(g, fbTapX, op2.out.y, fbTapX, yBufFb);
        wire(g, fbTapX, yBufFb, op2.inMinus.x - 10, yBufFb);
        wire(g, op2.inMinus.x - 10, yBufFb, op2.inMinus.x - 10, op2.inMinus.y);
        wire(g, op2.inMinus.x - 10, op2.inMinus.y, op2.inMinus.x, op2.inMinus.y);

        // ---- Outer feedback: A2 output -> A1 (−) input ----------------------
        // Drawn as a single highlighted polyline along the bottom of the
        // diagram so the global feedback path is visible at a glance.
        var outerLeadX = op1.inMinus.x - 24;
        g.append('polyline')
            .attr('points',
                fbTapX + ',' + op2.out.y + ' ' +
                fbTapX + ',' + yOuterFb + ' ' +
                outerLeadX + ',' + yOuterFb + ' ' +
                outerLeadX + ',' + op1.inMinus.y + ' ' +
                op1.inMinus.x + ',' + op1.inMinus.y)
            .attr('fill', 'none')
            .attr('stroke', 'var(--accent)').attr('stroke-width', 1.8);
        g.append('text')
            .attr('x', (fbTapX + outerLeadX) / 2)
            .attr('y', yOuterFb - 10)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('letter-spacing', '0.06em')
            .attr('fill', 'var(--accent)')
            .text('outer feedback · absorbs V_F and buffer offset');
    }

    // ---- simulation --------------------------------------------------------
    function simulate() {
        var n = Math.round(T_VIEW / DT);
        var pts = new Array(n);
        var vcAct = 0;        // precision peak detector cap voltage (held)
        var vcPas = 0;        // passive RC peak detector
        var tau = 0.250;
        for (var i = 0; i < n; i++) {
            var t = i * DT;
            var v = vIn(t);
            // Precision peak detector with reset
            if (rstActive(t)) {
                vcAct = 0;
            } else if (v > vcAct) {
                vcAct = v;    // V_F is inside the loop; capacitor follows v
            }
            // Passive simple peak detector for visual contrast
            var target = v - state.vf;
            if (target > vcPas) vcPas = target;
            else vcPas -= vcPas * (DT / tau);
            if (vcPas < 0) vcPas = 0;

            pts[i] = [t, v, vcAct, vcPas, rstActive(t) ? 1 : 0];
        }
        return pts;
    }

    function drawTrace() {
        var pts = simulate();
        var f = makeFrame(traceSvg, { margin: { top: 44, right: 28, bottom: 44, left: 56 } });
        f.g.selectAll('*').remove();

        var yMax = Math.max(0.6, state.amp + 0.2);
        var yMin = -yMax;
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([yMin, yMax]).range([f.ih, 0]);

        // Gridlines
        var grid = f.g.append('g').attr('class', 'grid');
        var step = (yMax > 1.5) ? 1 : (yMax > 0.5 ? 0.5 : 0.2);
        for (var v = -Math.ceil(yMax / step) * step; v <= yMax + 1e-9; v += step) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--grid-line)');
        }
        grid.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        var line = function (idx) {
            return d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[idx]); });
        };

        // Reset bands (faint vertical strips). The first band is labelled so
        // the link between φ_rst on the circuit and the strips on the trace
        // is visible at a glance.
        var rb = f.g.append('g');
        var winS = state.win;
        var firstLabelled = false;
        for (var t0 = 0; t0 < T_VIEW; t0 += winS) {
            var x0 = x(t0);
            var x1 = x(Math.min(T_VIEW, t0 + state.rstW));
            rb.append('rect').attr('x', x0).attr('width', Math.max(1, x1 - x0))
                .attr('y', 0).attr('height', f.ih)
                .attr('fill', 'var(--c-thresh)').attr('opacity', 0.12);
            if (!firstLabelled && t0 + state.rstW < T_VIEW) {
                rb.append('text')
                    .attr('x', x1 + 4).attr('y', 12)
                    .attr('font-family', "'JetBrains Mono', monospace")
                    .attr('font-size', 10).attr('letter-spacing', '0.10em')
                    .attr('fill', 'var(--c-thresh)').text('reset');
                firstLabelled = true;
            }
        }

        f.g.append('path').datum(pts).attr('class', 'trace input').attr('d', line(1));
        f.g.append('path').datum(pts).attr('class', 'trace passive-simple').attr('d', line(3));
        f.g.append('path').datum(pts).attr('class', 'trace precision').attr('d', line(2));

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + y(0) + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(5)
                .tickFormat(function (d) { return d.toFixed(2); })
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
            .attr('fill', 'var(--c-passive)').text('passive RC peak');
        lg.append('text').attr('text-anchor', 'end').attr('y', 42)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-precision)').text('precision active peak');

        return pts;
    }

    function drawReset() {
        var f = makeFrame(rstSvg, { margin: { top: 18, right: 28, bottom: 32, left: 56 }, minH: 90 });
        f.g.selectAll('*').remove();
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-0.2, 1.3]).range([f.ih, 0]);

        f.g.append('line')
            .attr('x1', 0).attr('x2', f.iw).attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        // Build the reset waveform
        var n = 1200;
        var pts = [];
        for (var i = 0; i <= n; i++) {
            var t = (i / n) * T_VIEW;
            pts.push([t, rstActive(t) ? 1 : 0]);
        }
        f.g.append('path').datum(pts)
            .attr('class', 'trace amber')
            .attr('stroke', 'var(--c-thresh)')
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); })
                .curve(d3.curveStepAfter));

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + y(0) + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();

        f.g.append('text').attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 26)
            .attr('text-anchor', 'middle').text('Time');
    }

    function updateReadout(pts) {
        rdVp.textContent = state.amp.toFixed(2) + ' V';
        rdW.textContent  = (state.win * 1000).toFixed(0) + ' ms';
        // Get the last sample of each held trace
        var last = pts[pts.length - 1];
        rdPas.textContent = last[3].toFixed(2) + ' V';
        rdPre.textContent = last[2].toFixed(2) + ' V';
        if (state.amp <= state.vf) {
            rdPas.className = 'v warn';
        } else {
            rdPas.className = 'v amber';
        }
        rdPre.className = 'v on';
    }

    function refresh() {
        var pts = drawTrace();
        drawReset();
        updateReadout(pts);
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
        winI.addEventListener('input', function () {
            state.win = parseFloat(winI.value) / 1000;
            winL.textContent = parseFloat(winI.value).toFixed(0) + ' ms';
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
