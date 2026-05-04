// Section 02 · Time-domain comparator plot.
// Top panel: sinusoidal input with adjustable amplitude / frequency, plus a
// horizontal threshold V_ref. Bottom panel: comparator output saturating to
// the rails on each crossing of V_ref. Single-quadrant in t (t >= 0).
(function () {
    var sel = '#plot-time-comparator';

    var Vsat = 5;        // rails for the time-domain plot, V
    var Tend = 4.0;      // seconds shown on the x-axis

    var state = { vref: 0.0, vm: 1.2, freq: 1.5 };

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 420;

        var margin = { top: 36, right: 28, bottom: 60, left: 76 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;
        var gap = 12;
        var panelH = (innerH - gap) / 2;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var x = d3.scaleLinear().domain([0, Tend]).range([0, innerW]);
        var yTop = d3.scaleLinear().domain([-2.2, 2.2]).range([panelH, 0]);
        var yBot = d3.scaleLinear().domain([-Vsat - 1.5, Vsat + 1.5]).range([panelH, 0]);

        // Top panel · input + threshold
        var gTop = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        window.CMP.drawGrid(gTop, x, yTop, innerW, panelH, {
            xTicks: d3.range(0, Tend + 0.5, 0.5),
            yTicks: [-2, -1, 0, 1, 2]
        });

        // Bottom panel · output
        var gBot = svg.append('g').attr('transform',
            'translate(' + margin.left + ',' + (margin.top + panelH + gap) + ')');
        window.CMP.drawGrid(gBot, x, yBot, innerW, panelH, {
            xTicks: d3.range(0, Tend + 0.5, 0.5),
            yTicks: [-Vsat, -Vsat / 2, 0, Vsat / 2, Vsat]
        });

        // Threshold line on top
        gTop.append('line')
            .attr('class', 'trace thresh')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', yTop(state.vref)).attr('y2', yTop(state.vref));

        // Saturation rails on bottom
        [Vsat, -Vsat].forEach(function (v) {
            gBot.append('line')
                .attr('class', 'trace rail')
                .attr('x1', 0).attr('x2', innerW)
                .attr('y1', yBot(v)).attr('y2', yBot(v));
        });

        // Build input + output samples
        var n = 1200;
        var inPts = [];
        var outPts = [];
        for (var i = 0; i <= n; i++) {
            var t = i * Tend / n;
            var vin = state.vm * Math.sin(2 * Math.PI * state.freq * t);
            inPts.push([t, vin]);
            // For square output use a small numeric tolerance; if |Vref| > Vm
            // the output stays at one rail.
            var vout = vin > state.vref ? Vsat : -Vsat;
            outPts.push([t, vout]);
        }

        var lineTop = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return yTop(d[1]); });
        gTop.append('path')
            .datum(inPts).attr('class', 'trace input').attr('d', lineTop);

        // Output drawn as a step so the rail transitions are vertical.
        var lineBot = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return yBot(d[1]); })
            .curve(d3.curveStepAfter);
        gBot.append('path')
            .datum(outPts).attr('class', 'trace output').attr('d', lineBot);

        // Crossing markers (where vin crosses vref). Drawn as faint vertical
        // guide lines spanning both panels.
        for (var k = 1; k < outPts.length; k++) {
            var prev = outPts[k - 1][1], cur = outPts[k][1];
            if (prev !== cur) {
                var tCross = outPts[k][0];
                var px = x(tCross);
                gTop.append('line')
                    .attr('x1', px).attr('x2', px)
                    .attr('y1', 0).attr('y2', panelH)
                    .attr('stroke', window.T.fg(0.18))
                    .attr('stroke-width', 1).attr('stroke-dasharray', '2 4');
                gBot.append('line')
                    .attr('x1', px).attr('x2', px)
                    .attr('y1', 0).attr('y2', panelH)
                    .attr('stroke', window.T.fg(0.18))
                    .attr('stroke-width', 1).attr('stroke-dasharray', '2 4');
            }
        }

        // Axes. Top panel: x ticks but no labels. Bottom panel: full x axis.
        var xAxisTop = gTop.append('g')
            .attr('transform', 'translate(0,' + panelH + ')')
            .call(d3.axisBottom(x).ticks(8).tickSizeOuter(0).tickFormat(function () { return ''; }));
        var yAxisTop = gTop.append('g')
            .call(d3.axisLeft(yTop).tickValues([-2, -1, 0, 1, 2]).tickSizeOuter(0));

        var xAxisBot = gBot.append('g')
            .attr('transform', 'translate(0,' + panelH + ')')
            .call(d3.axisBottom(x).ticks(8).tickSizeOuter(0));
        var yAxisBot = gBot.append('g')
            .call(d3.axisLeft(yBot).tickValues([-Vsat, 0, Vsat]).tickSizeOuter(0));

        [xAxisTop, yAxisTop, xAxisBot, yAxisBot].forEach(window.CMP.styleAxis);

        // Threshold label on top panel, anchored just inside the right edge
        // and offset vertically so it never overlaps the line.
        var refY = yTop(state.vref);
        var labelDy = (state.vref >= 0) ? -10 : 14;
        window.renderKatex(svg,
            'V_\\text{ref} = ' + state.vref.toFixed(2) + '\\,\\text{V}',
            margin.left + innerW - 70, margin.top + refY + labelDy,
            { width: 150, height: 18, size: 11, color: window.CMP.cssVar('--c-thresh') });

        // Rail labels on bottom panel
        window.renderKatex(svg, '+V_\\text{sat}',
            margin.left + 36, margin.top + panelH + gap + yBot(Vsat) - 10,
            { width: 80, height: 18, size: 11, color: window.T.textDim });
        window.renderKatex(svg, '-V_\\text{sat}',
            margin.left + 36, margin.top + panelH + gap + yBot(-Vsat) + 12,
            { width: 80, height: 18, size: 11, color: window.T.textDim });

        // Axis titles · single-quadrant rule
        // y-axis (top panel): rotated -90, centred on top panel
        window.renderKatex(svg, 'v_\\text{in} \\, [\\mathrm{V}]',
            22, margin.top + panelH / 2,
            { width: 140, height: 22, rotate: -90, size: 14 });
        // y-axis (bottom panel): rotated -90, centred on bottom panel
        window.renderKatex(svg, 'v_\\text{out} \\, [\\mathrm{V}]',
            22, margin.top + panelH + gap + panelH / 2,
            { width: 140, height: 22, rotate: -90, size: 14 });
        // x-axis (single, below bottom panel)
        window.renderKatex(svg, 't \\, [\\mathrm{s}]',
            margin.left + innerW / 2, H - 16,
            { width: 100, height: 22, size: 14 });
    }

    function bind() {
        var vref = document.getElementById('time-vref');
        var vm   = document.getElementById('time-vm');
        var freq = document.getElementById('time-freq');
        var vrefLab = document.getElementById('time-vref-val');
        var vmLab   = document.getElementById('time-vm-val');
        var freqLab = document.getElementById('time-freq-val');

        function update() {
            state.vref = parseFloat(vref.value);
            state.vm   = parseFloat(vm.value);
            state.freq = parseFloat(freq.value);
            vrefLab.textContent = state.vref.toFixed(2) + ' V';
            vmLab.textContent   = state.vm.toFixed(2) + ' V';
            freqLab.textContent = state.freq.toFixed(2) + ' Hz';
            render();
        }
        [vref, vm, freq].forEach(function (el) { el.addEventListener('input', update); });
        update();
    }

    function init() {
        bind();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
