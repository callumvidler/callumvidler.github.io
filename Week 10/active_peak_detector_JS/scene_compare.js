// Scene 03 · Comparison on a biopotential-like signal.
// The same input from the passive page failure scene is run through three
// detectors: a passive simple D + C, a passive RC envelope detector, and a
// precision active peak detector with periodic reset. The active detector
// removes V_F from the signal path and is buffered, so it captures every
// peak in each window with no offset and no droop.
(function () {
    var smI  = document.getElementById('ap-c-sm');
    var vfI  = document.getElementById('ap-c-vf');
    var tauI = document.getElementById('ap-c-tau');
    var winI = document.getElementById('ap-c-win');
    var smL  = document.getElementById('ap-c-sm-val');
    var vfL  = document.getElementById('ap-c-vf-val');
    var tauL = document.getElementById('ap-c-tau-val');
    var winL = document.getElementById('ap-c-win-val');
    var rdSmall  = document.getElementById('ap-c-small');
    var rdSimple = document.getElementById('ap-c-simple');
    var rdRc     = document.getElementById('ap-c-rc');
    var rdAct    = document.getElementById('ap-c-act');

    var state = {
        sm: 0.35,
        vf: 0.55,
        tau: 0.400,
        win: 0.600
    };

    var T_VIEW = 6.0;
    var DT = 1 / 4000;

    // Spike specification: list of {t, amp, w}
    function buildSpikes() {
        var spikes = [];
        // Four small early spikes; their amplitude is set by the slider so the
        // user can drive them above or below V_F.
        for (var i = 0; i < 4; i++) {
            spikes.push({ t: 0.30 + i * 0.30, amp: state.sm, w: 0.04 });
        }
        // Six larger spikes whose envelope rises then decays
        var lateT0 = 2.4;
        var ampsLate = [1.4, 2.0, 1.9, 1.4, 1.0, 0.7];
        var dt = 0.50;
        for (var j = 0; j < ampsLate.length; j++) {
            spikes.push({ t: lateT0 + j * dt, amp: ampsLate[j], w: 0.03 });
        }
        return spikes;
    }

    function vIn(t, spikes) {
        var v = 0.04 * Math.sin(2 * Math.PI * 0.12 * t);
        for (var i = 0; i < spikes.length; i++) {
            var s = spikes[i];
            var dt = (t - s.t) / s.w;
            v += s.amp * Math.exp(-dt * dt * 4);
        }
        return v;
    }

    function simulate() {
        var spikes = buildSpikes();
        var n = Math.round(T_VIEW / DT);
        var pts = new Array(n);
        var vSimple = 0, vRc = 0, vAct = 0;
        var rstW = 0.012;
        var smallSeen = 0;
        var smallSeenAct = 0;
        var smallTimes = spikes.slice(0, 4).map(function (s) { return s.t; });
        var seenPas = [false, false, false, false];
        var seenAct = [false, false, false, false];

        for (var i = 0; i < n; i++) {
            var t = i * DT;
            var v = vIn(t, spikes);

            // Passive simple
            var target = v - state.vf;
            if (target > vSimple) vSimple = target;

            // Passive RC
            if (target > vRc) vRc = target;
            else vRc -= vRc * (DT / state.tau);
            if (vRc < 0) vRc = 0;

            // Precision active with periodic reset
            var phase = t % state.win;
            if (phase < rstW) {
                vAct = 0;
            } else if (v > vAct) {
                vAct = v;
            }

            for (var k = 0; k < 4; k++) {
                if (Math.abs(t - smallTimes[k]) < 0.06) {
                    if (target > 0.005) seenPas[k] = true;
                    if (v > 0.005) seenAct[k] = true;
                }
            }

            pts[i] = [t, v, vSimple, vRc, vAct];
        }
        for (var m = 0; m < 4; m++) {
            if (seenPas[m]) smallSeen++;
            if (seenAct[m]) smallSeenAct++;
        }
        return { pts: pts, smallSeen: smallSeen, smallSeenAct: smallSeenAct, spikes: spikes };
    }

    var inputSvg = d3.select('#plot-ap-c-input').classed('ov', true);
    var outSvg   = d3.select('#plot-ap-c-out').classed('ov', true);

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

    function commonAxes(f, x, y, yMax) {
        var grid = f.g.append('g').attr('class', 'grid');
        d3.range(0, yMax + 0.1, 1).forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--grid-line)');
        });
        grid.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return d.toFixed(1) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues(d3.range(0, Math.floor(yMax) + 1, 1))
                .tickFormat(function (d) { return d.toFixed(0); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text').attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle').text('Time');
        f.g.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle').text('Voltage (V)');
    }

    function drawInput(sim) {
        var f = makeFrame(inputSvg);
        f.g.selectAll('*').remove();

        var yMax = Math.max(2.6, d3.max(sim.pts, function (p) { return p[1]; }) + 0.4);
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, yMax]).range([f.ih, 0]);

        // V_F band
        f.g.append('rect').attr('x', 0).attr('y', y(state.vf))
            .attr('width', f.iw).attr('height', f.ih - y(state.vf))
            .attr('fill', 'var(--c-thresh)').attr('opacity', 0.06);
        f.g.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(state.vf)).attr('y2', y(state.vf))
            .attr('stroke', 'var(--c-thresh)').attr('stroke-dasharray', '4 3')
            .attr('stroke-width', 1.2).attr('opacity', 0.7);
        f.g.append('text')
            .attr('x', 6).attr('y', y(state.vf) - 6)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--c-thresh)')
            .text('V_F · diode-drop floor for the passive variants');

        commonAxes(f, x, y, yMax);

        f.g.append('path')
            .datum(sim.pts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
    }

    function drawOutputs(sim) {
        var f = makeFrame(outSvg);
        f.g.selectAll('*').remove();

        var yMax = Math.max(2.6, d3.max(sim.pts, function (p) {
            return Math.max(p[2], p[3], p[4], p[1]);
        }) + 0.4);
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, yMax]).range([f.ih, 0]);

        commonAxes(f, x, y, yMax);

        // Reset window markers
        for (var t = state.win; t < T_VIEW; t += state.win) {
            f.g.append('line').attr('x1', x(t)).attr('x2', x(t))
                .attr('y1', 0).attr('y2', f.ih)
                .attr('stroke', 'var(--c-precision)').attr('stroke-width', 1.0)
                .attr('stroke-dasharray', '2 4').attr('opacity', 0.30);
        }

        // Faint input
        f.g.append('path')
            .datum(sim.pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-input)').attr('stroke-width', 1.2).attr('opacity', 0.30)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Passive simple (amber)
        f.g.append('path')
            .datum(sim.pts)
            .attr('class', 'trace passive-simple')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[2]); }));

        // Passive RC (purple, dashed)
        f.g.append('path')
            .datum(sim.pts)
            .attr('class', 'trace passive-rc')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[3]); }));

        // Precision active (green)
        f.g.append('path')
            .datum(sim.pts)
            .attr('class', 'trace precision')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[4]); }));

        // Legend
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',8)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('input');
        lg.append('text').attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-passive)').text('passive simple');
        lg.append('text').attr('text-anchor', 'end').attr('y', 42)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-rc)').text('passive RC');
        lg.append('text').attr('text-anchor', 'end').attr('y', 58)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-precision)').text('precision active');
    }

    function updateReadout(sim) {
        rdSmall.textContent = sim.smallSeen + ' / 4 (passive) · ' + sim.smallSeenAct + ' / 4 (active)';
        rdSmall.className = 'v ' + (sim.smallSeen === 0 ? 'warn'
            : sim.smallSeen < 4 ? 'amber' : 'on');

        var pts = sim.pts;
        var lastSimple = pts[pts.length - 1][2];
        var maxSimple = d3.max(pts, function (p) { return p[2]; });
        var inputAtEnd = pts[pts.length - 1][1];
        if (lastSimple > inputAtEnd + 0.4) {
            rdSimple.textContent = 'latched';
            rdSimple.className = 'v warn';
        } else if (Math.abs(lastSimple - maxSimple) < 0.02 && maxSimple > 0.05) {
            rdSimple.textContent = 'tracking';
            rdSimple.className = 'v on';
        } else {
            rdSimple.textContent = 'blocked';
            rdSimple.className = 'v warn';
        }

        var ratio = state.tau / 0.5;
        if (ratio > 1.2) {
            rdRc.textContent = 'lags';
            rdRc.className = 'v warn';
        } else if (ratio < 0.2) {
            rdRc.textContent = 'ripples';
            rdRc.className = 'v warn';
        } else {
            rdRc.textContent = 'ok';
            rdRc.className = 'v amber';
        }

        rdAct.textContent = 'tracking';
        rdAct.className = 'v on';
    }

    function refresh() {
        var sim = simulate();
        drawInput(sim);
        drawOutputs(sim);
        updateReadout(sim);
    }

    function init() {
        smI.addEventListener('input', function () {
            state.sm = parseFloat(smI.value);
            smL.textContent = state.sm.toFixed(2) + ' V';
            refresh();
        });
        vfI.addEventListener('input', function () {
            state.vf = parseFloat(vfI.value);
            vfL.textContent = state.vf.toFixed(2) + ' V';
            refresh();
        });
        tauI.addEventListener('input', function () {
            state.tau = parseFloat(tauI.value) / 1000;
            tauL.textContent = parseFloat(tauI.value).toFixed(0) + ' ms';
            refresh();
        });
        winI.addEventListener('input', function () {
            state.win = parseFloat(winI.value) / 1000;
            winL.textContent = parseFloat(winI.value).toFixed(0) + ' ms';
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
