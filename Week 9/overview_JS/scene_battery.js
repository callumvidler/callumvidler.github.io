// Scene 01 · Battery low-voltage cutoff comparator.
// A discharging lithium cell traces V_cell(t). A draggable horizontal line is
// the comparator threshold. A live "now" marker walks along the curve; once it
// drops below the threshold the load reads DISCONNECTED.
(function () {
    var svgSel = '#plot-bat-trace';
    var rateInp = document.getElementById('bat-rate');
    var rateLab = document.getElementById('bat-rate-val');
    var runPill = document.getElementById('bat-run');
    var resetBtn = document.getElementById('bat-reset');
    var rdVcell = document.getElementById('bat-vcell');
    var rdVcut = document.getElementById('bat-vcut');
    var rdLoad = document.getElementById('bat-load');

    var V_FULL = 4.20;
    var V_NOMINAL = 3.70;
    var V_END = 2.50;
    var T_FULL = 60; // seconds for full discharge at rate 1.0
    var Y_DOMAIN = [2.4, 4.3];
    var THRESH_MIN = 2.6, THRESH_MAX = 4.1;

    var state = {
        t: 0,            // simulated time in seconds
        rate: 1.0,
        running: true,
        vcut: 3.20,
        last: performance.now()
    };

    var svg = d3.select(svgSel).classed('ov', true);
    var W = 600, H = 280;
    var margin = { top: 22, right: 78, bottom: 38, left: 56 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gCurveBg = gRoot.append('g');
    var gCurveFg = gRoot.append('g');
    var gNow = gRoot.append('g');
    var gThresh = gRoot.append('g');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');

    function vAt(t) {
        // Smooth discharge curve: high plateau, knee, drop.
        var tn = Math.max(0, Math.min(t / T_FULL, 1));
        // Logistic-like profile mapped to [V_FULL, V_END]
        var s = 1 / (1 + Math.exp(-(tn - 0.78) * 9));
        var plateau = V_FULL - (V_FULL - V_NOMINAL) * Math.pow(tn, 0.6) * 0.55;
        return plateau * (1 - s) + V_END * s;
    }

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(360, rect.width);
        H = Math.max(220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        x = d3.scaleLinear().domain([0, T_FULL]).range([0, iw]);
        y = d3.scaleLinear().domain(Y_DOMAIN).range([ih, 0]);
    }

    function drawStatic() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        // y gridlines
        [2.5, 3.0, 3.5, 4.0].forEach(function (v) {
            gGrid.append('line')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });
        // axis ticks
        var yAxis = d3.axisLeft(y).tickValues([2.5, 3.0, 3.5, 4.0]).tickFormat(function (d) { return d.toFixed(1); }).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();
        var xAxis = d3.axisBottom(x).tickValues([0, 15, 30, 45, 60]).tickFormat(function (d) { return d + 's'; }).tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')').call(xAxis).select('.domain').remove();

        // axis titles (positive quadrant; x centred below, y rotated 90 CCW)
        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 30)
            .attr('text-anchor', 'middle')
            .text('time, seconds');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-40) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('cell voltage, V');

        // background full discharge curve (faint)
        var pts = [];
        for (var k = 0; k <= 240; k++) {
            var tt = (k / 240) * T_FULL;
            pts.push([tt, vAt(tt)]);
        }
        var line = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); })
            .curve(d3.curveMonotoneX);
        gCurveBg.selectAll('*').remove();
        gCurveBg.append('path').datum(pts)
            .attr('class', 'trace input')
            .attr('opacity', 0.25)
            .attr('stroke-width', 1.4)
            .attr('d', line);
    }

    function drawLive() {
        // foreground curve up to current time
        var pts = [];
        var tNow = state.t;
        var n = Math.max(2, Math.round(240 * (tNow / T_FULL)));
        for (var k = 0; k <= n; k++) {
            var tt = (k / n) * tNow;
            pts.push([tt, vAt(tt)]);
        }
        var line = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); })
            .curve(d3.curveMonotoneX);
        gCurveFg.selectAll('*').remove();
        gCurveFg.append('path').datum(pts)
            .attr('class', 'trace input')
            .attr('d', line);

        // now marker
        gNow.selectAll('*').remove();
        var vNow = vAt(tNow);
        gNow.append('line')
            .attr('x1', x(tNow)).attr('x2', x(tNow))
            .attr('y1', 0).attr('y2', ih)
            .style('stroke', 'var(--c-output)')
            .attr('stroke-width', 1).attr('opacity', 0.55)
            .attr('stroke-dasharray', '3 3');
        gNow.append('circle')
            .attr('cx', x(tNow)).attr('cy', y(vNow))
            .attr('r', 5)
            .style('fill', 'var(--c-output)')
            .style('stroke', 'var(--bg-2)').attr('stroke-width', 1.5);
        gNow.append('text')
            .attr('x', Math.min(iw - 6, x(tNow) + 8))
            .attr('y', Math.max(12, y(vNow) - 8))
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .style('fill', 'var(--c-output)')
            .text(vNow.toFixed(2) + ' V');

        // threshold line + draggable grab on right
        gThresh.selectAll('*').remove();
        var yT = y(state.vcut);
        gThresh.append('line')
            .attr('class', 'thresh-line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', yT).attr('y2', yT);
        var grab = gThresh.append('g')
            .style('cursor', 'ns-resize');
        grab.append('rect')
            .attr('x', iw + 4).attr('y', yT - 11)
            .attr('width', 56).attr('height', 22)
            .attr('rx', 4)
            .style('fill', 'var(--c-thresh)').attr('opacity', 0.18);
        grab.append('text')
            .attr('class', 'thresh-label')
            .attr('x', iw + 32).attr('y', yT + 4)
            .attr('text-anchor', 'middle')
            .text('V_cut');
        grab.append('circle')
            .attr('cx', iw).attr('cy', yT).attr('r', 5)
            .style('fill', 'var(--c-thresh)')
            .style('stroke', 'var(--bg-2)').attr('stroke-width', 1.5);
        grab.call(d3.drag().on('drag', function (event) {
            var ny = Math.max(0, Math.min(ih, event.y));
            var nv = y.invert(ny);
            state.vcut = Math.max(THRESH_MIN, Math.min(THRESH_MAX, nv));
            drawLive();
            updateReadout();
        }));

        // also allow dragging anywhere on the line itself
        gThresh.select('line').style('cursor', 'ns-resize')
            .call(d3.drag().on('drag', function (event) {
                var ny = Math.max(0, Math.min(ih, event.y));
                state.vcut = Math.max(THRESH_MIN, Math.min(THRESH_MAX, y.invert(ny)));
                drawLive();
                updateReadout();
            }));
    }

    function updateReadout() {
        var v = vAt(state.t);
        var on = v > state.vcut;
        rdVcell.textContent = v.toFixed(2) + ' V';
        rdVcut.textContent = state.vcut.toFixed(2) + ' V';
        rdLoad.textContent = on ? 'CONNECTED' : 'DISCONNECTED';
        rdLoad.className = 'v ' + (on ? 'on' : 'warn');
        updateCircuit(v, on);
    }

    // ════════════════════════════════════════════════════════
    //  CIRCUIT  ·  schematic drawn beside the trace and
    //  animated from the same simulation state.
    //
    //   ┌── top rail ─────────────────────────────────┐
    //   │              tap → +                        │
    //   ●           ┌──────► CMP ──── ctrl ───►       ●  switch top
    //  V_cell       │       triangle               (pivot)
    //   ●         tap2 → −                          ╲   arm: straight (closed) /
    //   │                                            ╲  rotated outward (open)
    //   │           ●  V_ref                          ●  switch bottom
    //   │           │                                 │
    //   │           │                              ┌──┴──┐
    //   │           │                              │ LOAD│
    //   │           │                              └──┬──┘
    //   └── bot rail ─────────────────────────────────┘
    // ════════════════════════════════════════════════════════
    var cSvg = d3.select('#plot-bat-circuit').classed('ov', true);
    var cElems = {};
    // Schematic coordinates (viewBox units). Aspect 3.2 : 1 → 660 × 206.
    var CW = 660, CH = 206;

    // Layout constants reused by buildCircuit and updateCircuit.
    var TOP = 38, BOT = 188;
    var BAT_X = 80, BAT_Y = 113, BAT_R = 22;            // spans 91 – 135
    var REF_X = 230, REF_Y = 150, REF_R = 18;           // spans 132 – 168
    var CMP_LX = 310, CMP_RX = 396, CMP_TY = 70, CMP_BY = 140;
    var CMP_OY = (CMP_TY + CMP_BY) / 2;                 // = 105
    var CMP_PIN_HI = 88, CMP_PIN_LO = 122;              // input wire heights
    var SW_X = 506, SW_TOP_Y = 60, SW_BOT_Y = 130;
    var LOAD_X = 478, LOAD_W = 56, LOAD_TY = 144, LOAD_BY = 174;
    var GATE_X = 470;                                   // ctrl arrow tip

    function buildCircuit() {
        cSvg.selectAll('*').remove();
        cSvg.attr('viewBox', '0 0 ' + CW + ' ' + CH)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var stroke = 'var(--text-dim)';
        var muted  = 'var(--muted)';
        var label  = 'var(--text-dim)';

        var gWire = cSvg.append('g');   // baseline wires
        var gPow  = cSvg.append('g');   // power-path (animated)
        var gComp = cSvg.append('g');   // component bodies
        var gLbl  = cSvg.append('g');   // text labels

        // ── Always-on baseline wiring ───────────────────────
        // Battery + → top rail ; Battery − → bottom rail.
        gWire.append('line').attr('x1', BAT_X).attr('y1', TOP)
            .attr('x2', BAT_X).attr('y2', BAT_Y - BAT_R).attr('stroke', stroke);
        gWire.append('line').attr('x1', BAT_X).attr('y1', BAT_Y + BAT_R)
            .attr('x2', BAT_X).attr('y2', BOT).attr('stroke', stroke);
        // Top rail.
        gWire.append('line').attr('x1', BAT_X).attr('y1', TOP)
            .attr('x2', SW_X).attr('y2', TOP).attr('stroke', stroke);
        // Bottom rail.
        gWire.append('line').attr('x1', BAT_X).attr('y1', BOT)
            .attr('x2', SW_X).attr('y2', BOT).attr('stroke', stroke);

        // Tap from top rail to comparator + input.
        var TAP1_X = 180;
        gWire.append('line').attr('x1', TAP1_X).attr('y1', TOP)
            .attr('x2', TAP1_X).attr('y2', CMP_PIN_HI).attr('stroke', stroke);
        gWire.append('line').attr('x1', TAP1_X).attr('y1', CMP_PIN_HI)
            .attr('x2', CMP_LX).attr('y2', CMP_PIN_HI).attr('stroke', stroke);
        // Tap junction dot.
        gWire.append('circle').attr('cx', TAP1_X).attr('cy', TOP).attr('r', 2.6).attr('fill', stroke);

        // V_ref + → comparator − input.
        gWire.append('line').attr('x1', REF_X).attr('y1', REF_Y - REF_R)
            .attr('x2', REF_X).attr('y2', CMP_PIN_LO).attr('stroke', stroke);
        gWire.append('line').attr('x1', REF_X).attr('y1', CMP_PIN_LO)
            .attr('x2', CMP_LX).attr('y2', CMP_PIN_LO).attr('stroke', stroke);
        // V_ref − → bottom rail.
        gWire.append('line').attr('x1', REF_X).attr('y1', REF_Y + REF_R)
            .attr('x2', REF_X).attr('y2', BOT).attr('stroke', stroke);
        // Junction dot on bottom rail under V_ref.
        gWire.append('circle').attr('cx', REF_X).attr('cy', BOT).attr('r', 2.6).attr('fill', stroke);

        // ── Power-path wires (highlighted when load is on) ──
        // Top rail tap → switch top contact.
        gPow.append('circle').attr('cx', SW_X).attr('cy', TOP).attr('r', 2.6).attr('fill', stroke);
        cElems.railSw = gPow.append('line')
            .attr('x1', SW_X).attr('y1', TOP).attr('x2', SW_X).attr('y2', SW_TOP_Y)
            .attr('stroke', muted).attr('stroke-width', 1.6);
        // Switch contacts (small filled circles).
        gPow.append('circle').attr('cx', SW_X).attr('cy', SW_TOP_Y).attr('r', 3).attr('fill', stroke);
        gPow.append('circle').attr('cx', SW_X).attr('cy', SW_BOT_Y).attr('r', 3).attr('fill', stroke);
        // Switch arm — pivot is at the TOP contact so opening lifts the
        // bottom end AWAY from the load. Closed = vertical.
        cElems.arm = gPow.append('line')
            .attr('x1', SW_X).attr('y1', SW_TOP_Y)
            .attr('x2', SW_X).attr('y2', SW_BOT_Y)
            .attr('stroke', muted).attr('stroke-width', 2.2)
            .attr('stroke-linecap', 'round');
        // Switch bottom contact → load top.
        cElems.swLoad = gPow.append('line')
            .attr('x1', SW_X).attr('y1', SW_BOT_Y).attr('x2', SW_X).attr('y2', LOAD_TY)
            .attr('stroke', muted).attr('stroke-width', 1.6);
        // Load body (animated fill).
        cElems.load = gPow.append('rect')
            .attr('x', LOAD_X).attr('y', LOAD_TY)
            .attr('width', LOAD_W).attr('height', LOAD_BY - LOAD_TY)
            .attr('rx', 3)
            .attr('fill', 'var(--bg-2)').attr('stroke', muted).attr('stroke-width', 1.4);
        // Load bottom → bottom rail.
        cElems.loadBot = gPow.append('line')
            .attr('x1', SW_X).attr('y1', LOAD_BY).attr('x2', SW_X).attr('y2', BOT)
            .attr('stroke', muted).attr('stroke-width', 1.6);
        // Junction dot on bottom rail under load.
        gPow.append('circle').attr('cx', SW_X).attr('cy', BOT).attr('r', 2.6).attr('fill', stroke);

        // Comparator output → switch control (animated colour).
        cElems.outWire = gPow.append('line')
            .attr('x1', CMP_RX).attr('y1', CMP_OY)
            .attr('x2', GATE_X).attr('y2', CMP_OY)
            .attr('stroke', muted).attr('stroke-width', 1.6);
        // Small filled triangle at the control input pointing at the arm.
        cElems.gateArrow = gPow.append('polygon')
            .attr('points',
                  GATE_X       + ',' + (CMP_OY - 5) + ' ' +
                  GATE_X       + ',' + (CMP_OY + 5) + ' ' +
                  (GATE_X + 8) + ',' + CMP_OY)
            .attr('fill', muted);
        // Dashed control line connecting the arrow to the arm midpoint.
        cElems.ctrlLine = gPow.append('line')
            .attr('x1', GATE_X + 8).attr('y1', CMP_OY)
            .attr('x2', SW_X - 4).attr('y2', CMP_OY)
            .attr('stroke', muted).attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '3 3');

        // ── Component bodies ────────────────────────────────
        // Battery: circle with +/-.
        gComp.append('circle').attr('cx', BAT_X).attr('cy', BAT_Y).attr('r', BAT_R)
            .attr('fill', 'var(--bg-2)').attr('stroke', stroke).attr('stroke-width', 1.4);
        gComp.append('text').attr('x', BAT_X).attr('y', BAT_Y - 4).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', label).text('+');
        gComp.append('text').attr('x', BAT_X).attr('y', BAT_Y + 13).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', label).text('−');

        // V_ref source.
        gComp.append('circle').attr('cx', REF_X).attr('cy', REF_Y).attr('r', REF_R)
            .attr('fill', 'var(--bg-2)').attr('stroke', stroke).attr('stroke-width', 1.4);
        gComp.append('text').attr('x', REF_X).attr('y', REF_Y - 3).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', label).text('+');
        gComp.append('text').attr('x', REF_X).attr('y', REF_Y + 12).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', label).text('−');

        // Comparator triangle.
        gComp.append('polygon')
            .attr('points', CMP_LX + ',' + CMP_TY + ' ' +
                            CMP_LX + ',' + CMP_BY + ' ' +
                            CMP_RX + ',' + CMP_OY)
            .attr('fill', 'var(--bg-2)').attr('stroke', stroke).attr('stroke-width', 1.4);
        gComp.append('text').attr('x', CMP_LX + 8).attr('y', CMP_PIN_HI + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', label).text('+');
        gComp.append('text').attr('x', CMP_LX + 8).attr('y', CMP_PIN_LO + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', label).text('−');

        // GND symbol on bottom rail between battery and V_ref.
        var gndX = (BAT_X + REF_X) / 2;
        gComp.append('line').attr('x1', gndX).attr('y1', BOT)
            .attr('x2', gndX).attr('y2', BOT + 6).attr('stroke', stroke);
        gComp.append('line').attr('x1', gndX - 8).attr('y1', BOT + 6)
            .attr('x2', gndX + 8).attr('y2', BOT + 6).attr('stroke', stroke).attr('stroke-width', 1.4);
        gComp.append('line').attr('x1', gndX - 5).attr('y1', BOT + 10)
            .attr('x2', gndX + 5).attr('y2', BOT + 10).attr('stroke', stroke).attr('stroke-width', 1.2);
        gComp.append('line').attr('x1', gndX - 2).attr('y1', BOT + 14)
            .attr('x2', gndX + 2).attr('y2', BOT + 14).attr('stroke', stroke);

        // ── Labels (some animated) ──────────────────────────
        // Battery label and live value (left of circle).
        gLbl.append('text').attr('x', BAT_X - BAT_R - 8).attr('y', BAT_Y - 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', label).text('V_cell');
        cElems.vcellTxt = gLbl.append('text').attr('x', BAT_X - BAT_R - 8).attr('y', BAT_Y + 11)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--c-input)').attr('font-weight', '600').text('— V');

        // V_ref label and live value (right of circle).
        gLbl.append('text').attr('x', REF_X + REF_R + 8).attr('y', REF_Y - 3)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', label).text('V_cut');
        cElems.vcutTxt = gLbl.append('text').attr('x', REF_X + REF_R + 8).attr('y', REF_Y + 12)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--c-thresh)').attr('font-weight', '600').text('— V');

        // Comparator label inside the triangle.
        gLbl.append('text').attr('x', CMP_LX + 28).attr('y', CMP_OY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', muted).text('CMP');

        // Comparator output label above the wire.
        cElems.outLabel = gLbl.append('text')
            .attr('x', (CMP_RX + GATE_X) / 2).attr('y', CMP_OY - 7)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', muted).text('—');

        // Switch label (above the top contact).
        gLbl.append('text').attr('x', SW_X + 14).attr('y', SW_TOP_Y - 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', muted).text('switch');

        // Load label inside the rectangle.
        gLbl.append('text').attr('x', LOAD_X + LOAD_W / 2)
            .attr('y', (LOAD_TY + LOAD_BY) / 2 + 4).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', label).text('LOAD');
    }

    function updateCircuit(v, on) {
        if (!cElems.arm) return;

        if (cElems.vcellTxt) cElems.vcellTxt.text(v.toFixed(2) + ' V');
        if (cElems.vcutTxt)  cElems.vcutTxt.text(state.vcut.toFixed(2) + ' V');

        // Switch arm rotates about the TOP pivot. Closed: arm hangs straight
        // down to the bottom contact. Open: arm pivots ~32° to the right so
        // the free end clearly separates from the bottom contact.
        if (on) {
            cElems.arm
                .attr('x1', SW_X).attr('y1', SW_TOP_Y)
                .attr('x2', SW_X).attr('y2', SW_BOT_Y);
        } else {
            var L = SW_BOT_Y - SW_TOP_Y;
            var theta = 32 * Math.PI / 180;
            var tipX = SW_X + L * Math.sin(theta);
            var tipY = SW_TOP_Y + L * Math.cos(theta);
            cElems.arm
                .attr('x1', SW_X).attr('y1', SW_TOP_Y)
                .attr('x2', tipX).attr('y2', tipY);
        }

        // Power-path wires: green and slightly thicker when current flows.
        var pathCol = on ? 'var(--c-high)' : 'var(--muted)';
        var pathW   = on ? 2.0 : 1.6;
        [cElems.railSw, cElems.swLoad, cElems.loadBot].forEach(function (sel) {
            sel.attr('stroke', pathCol).attr('stroke-width', pathW);
        });
        cElems.arm.attr('stroke', pathCol).attr('stroke-width', on ? 2.4 : 2.0);

        // Comparator output line + control arrow + label.
        var ctrlCol = on ? 'var(--c-high)' : 'var(--c-thresh)';
        cElems.outWire.attr('stroke', ctrlCol).attr('stroke-width', on ? 2.0 : 1.6);
        cElems.gateArrow.attr('fill', ctrlCol);
        cElems.ctrlLine.attr('stroke', ctrlCol);
        cElems.outLabel.text(on ? 'HIGH' : 'LOW').attr('fill', ctrlCol);

        // Load fill: glow when powered, else blank with a muted outline.
        cElems.load
            .attr('fill', on ? 'var(--c-high)' : 'var(--bg-2)')
            .attr('fill-opacity', on ? 0.30 : 1)
            .attr('stroke', on ? 'var(--c-high)' : 'var(--muted)')
            .attr('stroke-width', on ? 1.8 : 1.4);
    }

    function tick(now) {
        var dt = (now - state.last) / 1000;
        state.last = now;
        if (state.running && dt < 0.25) {
            state.t = Math.min(T_FULL, state.t + dt * state.rate);
            drawLive();
            updateReadout();
        }
        requestAnimationFrame(tick);
    }

    function init() {
        layout();
        drawStatic();
        drawLive();
        buildCircuit();
        updateReadout();

        rateInp.addEventListener('input', function () {
            state.rate = parseFloat(rateInp.value);
            rateLab.textContent = state.rate.toFixed(1) + ' ×';
        });
        runPill.addEventListener('click', function () {
            state.running = !state.running;
            runPill.classList.toggle('active', state.running);
            runPill.textContent = state.running ? 'running' : 'paused';
        });
        resetBtn.addEventListener('click', function () {
            state.t = 0;
            drawLive();
            updateReadout();
        });
        window.addEventListener('themechange', function () {
            drawStatic(); drawLive(); buildCircuit(); updateReadout();
        });
        window.addEventListener('resize', function () {
            layout(); drawStatic(); drawLive();
        });

        state.last = performance.now();
        requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
