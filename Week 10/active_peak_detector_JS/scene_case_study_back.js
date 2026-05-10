// Scene 05 · Back to the seizure case study.
// A synthetic pre-state EEG segment is presented to two amplitude branches:
// the passive D + C with a leak resistor that the case study originally
// proposed, and the precision peak detector with a storage capacitor inside
// the op-amp feedback loop, a unity-gain buffer, and periodic reset. The
// passive branch loses every spike below V_F and droops between events; the
// precision branch reports each spike as a held step regardless of V_F and
// holds it flat until the next reset, recovering the rising-envelope shape
// the case study clinician asked for.
(function () {
    var vfI  = document.getElementById('ap-cs-vf');
    var tauI = document.getElementById('ap-cs-tau');
    var winI = document.getElementById('ap-cs-win');
    var vfL  = document.getElementById('ap-cs-vf-val');
    var tauL = document.getElementById('ap-cs-tau-val');
    var winL = document.getElementById('ap-cs-win-val');
    var rdPres = document.getElementById('ap-cs-pres');
    var rdPas  = document.getElementById('ap-cs-pas');
    var rdPre  = document.getElementById('ap-cs-pre');
    var rdEnv  = document.getElementById('ap-cs-env');

    var state = {
        vf:  0.60,
        tau: 0.900,
        win: 0.900
    };

    var T_VIEW = 7.0;
    var DT = 1 / 4000;

    // Eight pre-seizure spikes whose amplitudes grow over the segment. The
    // first four sit below a typical silicon V_F so the passive branch
    // discards them; the last four exceed V_F so the passive branch can
    // partially register them but still droops and masks.
    var SPIKES = [
        { t: 0.55, amp: 0.08 },
        { t: 1.20, amp: 0.18 },
        { t: 1.95, amp: 0.32 },
        { t: 2.65, amp: 0.50 },
        { t: 3.45, amp: 0.78 },
        { t: 4.25, amp: 1.05 },
        { t: 5.15, amp: 1.30 },
        { t: 6.05, amp: 1.50 }
    ];
    var SPIKE_W = 0.075;   // Gaussian half-width in seconds

    function drift(t) {
        return 0.025 * Math.sin(2 * Math.PI * 0.18 * t)
             + 0.018 * Math.sin(2 * Math.PI * 0.41 * t + 1.1);
    }

    function vIn(t) {
        var v = drift(t);
        for (var i = 0; i < SPIKES.length; i++) {
            var s = SPIKES[i];
            var dt = (t - s.t) / SPIKE_W;
            v += s.amp * Math.exp(-dt * dt);
        }
        return v;
    }

    function simulate() {
        var n = Math.round(T_VIEW / DT);
        var pts = new Array(n);
        var vPas = 0, vPre = 0;
        var rstW = 0.014;
        var seenPas = SPIKES.map(function () { return false; });
        var seenPre = SPIKES.map(function () { return false; });

        for (var i = 0; i < n; i++) {
            var t = i * DT;
            var v = vIn(t);

            // Passive simple with leak resistor: charges through the diode to
            // (v - V_F)+ when the input is rising above the held value,
            // otherwise decays exponentially with time constant tau_leak.
            var target = v - state.vf;
            if (target > vPas) {
                vPas = target;
            } else {
                vPas -= vPas * (DT / state.tau);
            }
            if (vPas < 0) vPas = 0;

            // Precision active with periodic reset window. Within each window
            // the held value tracks the maximum of v; at the window boundary
            // a short reset pulse empties the storage capacitor.
            var phase = t % state.win;
            if (phase < rstW) {
                vPre = 0;
            } else if (v > vPre) {
                vPre = v;
            }

            // Score capture per spike at the spike time.
            for (var k = 0; k < SPIKES.length; k++) {
                if (Math.abs(t - SPIKES[k].t) < 0.04) {
                    if (vPas > 0.01) seenPas[k] = true;
                    if (vPre > 0.01) seenPre[k] = true;
                }
            }

            pts[i] = [t, v, vPas, vPre];
        }

        var nPas = 0, nPre = 0;
        for (var m = 0; m < SPIKES.length; m++) {
            if (seenPas[m]) nPas++;
            if (seenPre[m]) nPre++;
        }
        return { pts: pts, nPas: nPas, nPre: nPre };
    }

    var inputSvg = d3.select('#plot-ap-cs-input').classed('ov', true);
    var outSvg   = d3.select('#plot-ap-cs-out').classed('ov', true);

    function makeFrame(svg) {
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 24, right: 28, bottom: 44, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function commonAxes(f, x, y, yMax) {
        var grid = f.g.append('g').attr('class', 'grid');
        var step = yMax > 1.6 ? 0.5 : 0.25;
        for (var v = 0; v <= yMax + 1e-6; v += step) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', 'var(--grid-line)');
        }
        grid.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', 'var(--grid-zero)').attr('stroke-width', 1.0);

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(7)
                .tickFormat(function (d) { return d.toFixed(1) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();

        var tickVals = [];
        for (var tv = 0; tv <= yMax + 1e-6; tv += step) tickVals.push(tv);
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues(tickVals)
                .tickFormat(function (d) { return d.toFixed(2); })
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

        var yMax = Math.max(1.6, d3.max(sim.pts, function (p) { return p[1]; }) + 0.2);
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, yMax]).range([f.ih, 0]);

        // V_F band shading and dashed line, to show which spikes the passive
        // branch can even see in principle.
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
            .text('V_F · the passive diode never conducts below this line');

        commonAxes(f, x, y, yMax);

        f.g.append('path')
            .datum(sim.pts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Mark each spike with a small tick on the time axis, annotated with
        // its true peak amplitude. Stays out of the trace area.
        var tg = f.g.append('g').attr('class', 'spike-marks');
        for (var i = 0; i < SPIKES.length; i++) {
            var s = SPIKES[i];
            tg.append('line')
                .attr('x1', x(s.t)).attr('x2', x(s.t))
                .attr('y1', f.ih).attr('y2', f.ih + 6)
                .attr('stroke', 'var(--muted)').attr('stroke-width', 1);
            tg.append('text')
                .attr('x', x(s.t)).attr('y', y(s.amp) - 8)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 9)
                .attr('fill', 'var(--muted)')
                .text(s.amp.toFixed(2));
        }
    }

    function drawOutputs(sim) {
        var f = makeFrame(outSvg);
        f.g.selectAll('*').remove();

        var yMax = Math.max(1.6, d3.max(sim.pts, function (p) {
            return Math.max(p[1], p[2], p[3]);
        }) + 0.2);
        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, yMax]).range([f.ih, 0]);

        commonAxes(f, x, y, yMax);

        // Faint reset window markers for the precision branch.
        for (var t = state.win; t < T_VIEW; t += state.win) {
            f.g.append('line').attr('x1', x(t)).attr('x2', x(t))
                .attr('y1', 0).attr('y2', f.ih)
                .attr('stroke', 'var(--c-precision)').attr('stroke-width', 1.0)
                .attr('stroke-dasharray', '2 4').attr('opacity', 0.25);
        }

        // Faint input behind for context.
        f.g.append('path')
            .datum(sim.pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-input)').attr('stroke-width', 1.2).attr('opacity', 0.30)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Passive D + C with leak resistor (amber).
        f.g.append('path')
            .datum(sim.pts)
            .attr('class', 'trace passive-simple')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[2]); }));

        // Precision active with reset (green).
        f.g.append('path')
            .datum(sim.pts)
            .attr('class', 'trace precision')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[3]); }));

        // Legend in the upper-right.
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',8)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('input EEG');
        lg.append('text').attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-passive)').text('passive: D + C ∥ R_leak');
        lg.append('text').attr('text-anchor', 'end').attr('y', 42)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-precision)').text('precision: storage cap + buffer + reset');
    }

    function updateReadout(sim) {
        rdPres.textContent = SPIKES.length;

        rdPas.textContent = sim.nPas + ' / ' + SPIKES.length;
        rdPas.className = 'v ' + (sim.nPas === 0 ? 'warn'
            : sim.nPas < SPIKES.length ? 'amber' : 'on');

        rdPre.textContent = sim.nPre + ' / ' + SPIKES.length;
        rdPre.className = 'v ' + (sim.nPre === SPIKES.length ? 'on'
            : sim.nPre === 0 ? 'warn' : 'amber');

        if (sim.nPre === SPIKES.length && sim.nPas < SPIKES.length) {
            rdEnv.textContent = 'visible (precision only)';
            rdEnv.className = 'v on';
        } else if (sim.nPre === SPIKES.length) {
            rdEnv.textContent = 'visible';
            rdEnv.className = 'v on';
        } else {
            rdEnv.textContent = 'partial';
            rdEnv.className = 'v amber';
        }
    }

    function refresh() {
        var sim = simulate();
        drawInput(sim);
        drawOutputs(sim);
        updateReadout(sim);
    }

    function init() {
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
