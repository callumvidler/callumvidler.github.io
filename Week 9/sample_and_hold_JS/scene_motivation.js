// Scene 01 · Why hold the sample.
// An 8-bit SAR conversion runs across one window. The input drifts linearly
// through that window. With S/H on, the SAR sees the value at t=0; with S/H
// off, the SAR sees v_in(t) at every comparison. The DAC trajectory and the
// final code error are drawn for whichever mode is active.
(function () {
    var slewI = document.getElementById('sh-motiv-slew');
    var slewL = document.getElementById('sh-motiv-slew-val');
    var btnOn  = document.getElementById('sh-motiv-on');
    var btnStep = document.getElementById('sh-motiv-step');
    var btnReset = document.getElementById('sh-motiv-reset');
    var rdV0   = document.getElementById('sh-motiv-v0');
    var rdV1   = document.getElementById('sh-motiv-v1');
    var rdCode = document.getElementById('sh-motiv-code');
    var rdErr  = document.getElementById('sh-motiv-err');

    var N_BITS = 8;
    var V_REF  = 1.0;
    var T_VIEW = 1.0;        // arbitrary normalised window
    var V_START = 0.42;

    var state = { slew: 0.45, shOn: true, t: 0, playing: true };
    var svg = d3.select('#plot-sh-motiv-trace').classed('ov', true);

    function makeFrame(svg) {
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(260, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 24, right: 28, bottom: 40, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function vIn(t) {
        // Linear drift with wraparound; saturate to [0, V_REF]
        var v = V_START + state.slew * t;
        if (v > V_REF) v = V_REF;
        if (v < 0) v = 0;
        return v;
    }

    // SAR algorithm: returns the code and the DAC value sequence.
    // probeFn(stepIndex) returns the analog value to compare against.
    function runSar(probeFn) {
        var code = 0;
        var dacSeq = [];   // {t, dac, accept}
        for (var i = 0; i < N_BITS; i++) {
            var trial = code | (1 << (N_BITS - 1 - i));
            var dacV = trial / (1 << N_BITS) * V_REF;
            var probe = probeFn(i);
            var accept = probe >= dacV;
            if (accept) code = trial;
            var finalDac = code / (1 << N_BITS) * V_REF;
            dacSeq.push({ step: i, dac: finalDac, accept: accept });
        }
        return { code: code, seq: dacSeq };
    }

    function draw() {
        var f = makeFrame(svg);
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, V_REF]).range([f.ih, 0]);

        // Grid
        var grid = f.g.append('g').attr('class', 'grid');
        [0, 0.25, 0.5, 0.75, 1.0].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Continuous input v_in(t)
        var inPts = [];
        for (var k = 0; k <= 200; k++) {
            var tt = (k / 200) * T_VIEW;
            inPts.push([tt, vIn(tt)]);
        }
        f.g.append('path')
            .datum(inPts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Captured / probed values
        var v0 = vIn(0);
        var v1 = vIn(T_VIEW);

        // SAR run: probe at the start (S/H on) or at the corresponding sub-time of each step (S/H off)
        var probeFn = state.shOn
            ? function () { return v0; }
            : function (i) {
                var ti = (i + 0.5) / N_BITS * T_VIEW;
                return vIn(ti);
              };
        var sarRes = runSar(probeFn);

        // Captured value horizontal line (only meaningful when S/H on)
        if (state.shOn) {
            f.g.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v0)).attr('y2', y(v0))
                .attr('stroke', 'var(--c-output2)')
                .attr('stroke-width', 1.6)
                .attr('stroke-dasharray', '4 4')
                .attr('opacity', 0.85);
            f.g.append('text')
                .attr('x', 6).attr('y', y(v0) - 6)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .attr('fill', 'var(--c-output2)')
                .text('captured  V₀ = ' + v0.toFixed(3) + ' V');
        }

        // DAC trajectory: stairstep across the conversion window
        var dacPts = [[0, 0]];
        sarRes.seq.forEach(function (p) {
            var ti = (p.step + 1) / N_BITS * T_VIEW;
            dacPts.push([ti, p.dac]);
        });
        f.g.append('path')
            .datum(dacPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output)')
            .attr('stroke-width', 2.4)
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); })
                .curve(d3.curveStepAfter));

        // Step markers and bit accept/reject
        sarRes.seq.forEach(function (p) {
            var ti = (p.step + 0.5) / N_BITS * T_VIEW;
            f.g.append('circle')
                .attr('cx', x(ti)).attr('cy', y(p.dac))
                .attr('r', 3.2)
                .attr('fill', p.accept ? 'var(--c-output)' : 'var(--c-low)')
                .attr('stroke', 'var(--bg-2)').attr('stroke-width', 1);
        });

        // Final-code marker on the right edge
        var finalDac = sarRes.code / (1 << N_BITS) * V_REF;
        f.g.append('circle')
            .attr('cx', x(T_VIEW)).attr('cy', y(finalDac))
            .attr('r', 5)
            .attr('fill', 'var(--c-output)')
            .attr('stroke', 'var(--bg-2)').attr('stroke-width', 1.5);

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5)
                .tickFormat(function (d) { return d.toFixed(1); })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(4)
                .tickFormat(function (d) { return d.toFixed(2); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle')
            .text('conversion progress');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('voltage');

        // Update readout
        var target = state.shOn ? v0 : v1;
        var targetCode = Math.round(target / V_REF * (1 << N_BITS));
        if (targetCode > (1 << N_BITS) - 1) targetCode = (1 << N_BITS) - 1;
        var err = sarRes.code - targetCode;

        rdV0.textContent = v0.toFixed(3) + ' V';
        rdV1.textContent = v1.toFixed(3) + ' V';
        rdCode.textContent = sarRes.code;
        rdErr.textContent = (err >= 0 ? '+' : '') + err + ' LSB';
        rdErr.className = 'v ' + (Math.abs(err) <= 1 ? 'on' : 'warn');
    }

    function init() {
        slewI.addEventListener('input', function () {
            state.slew = parseFloat(slewI.value);
            slewL.textContent = state.slew.toFixed(2) + ' V/T';
            draw();
        });
        btnOn.addEventListener('click', function () {
            state.shOn = !state.shOn;
            btnOn.classList.toggle('active', state.shOn);
            btnOn.textContent = state.shOn ? 'S/H on' : 'S/H off';
            draw();
        });
        btnStep.addEventListener('click', function () { draw(); });
        btnReset.addEventListener('click', function () {
            state.slew = 0.45;
            slewI.value = 0.45;
            slewL.textContent = '0.45 V/T';
            state.shOn = true;
            btnOn.classList.add('active');
            btnOn.textContent = 'S/H on';
            draw();
        });
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', draw);
        draw();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
