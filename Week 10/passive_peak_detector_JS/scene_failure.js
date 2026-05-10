// Scene 04 · Where passive peak detection fails.
// A test input combines a baseline drift, four small early spikes (whose
// amplitude is comparable to V_F) and a sequence of larger spikes whose
// amplitude later decays. The same input is run through three detectors:
//   simple    : diode + capacitor, no discharge path
//   rc        : diode + capacitor + bleed resistor with time constant tau
//   tx-reset  : diode + capacitor with a transistor that resets every T_win
// All three traces are overlaid so the failure modes are visible side by side.
(function () {
    var ampI = document.getElementById('pp-f-amp');
    var vfI  = document.getElementById('pp-f-vf');
    var tauI = document.getElementById('pp-f-tau');
    var ampL = document.getElementById('pp-f-amp-val');
    var vfL  = document.getElementById('pp-f-vf-val');
    var tauL = document.getElementById('pp-f-tau-val');
    var rdSmall  = document.getElementById('pp-f-small');
    var rdSimple = document.getElementById('pp-f-simple');
    var rdRc     = document.getElementById('pp-f-rc');

    var state = {
        amp: 0.45,           // amplitude of the late spikes (the small ones are 0.5 * amp)
        vf: 0.55,
        tau: 0.400,
        winReset: 0.6        // transistor reset window
    };

    // Time-domain test signal
    var T_VIEW = 6.0;
    var DT = 1 / 4000;

    // Spike specification: list of {t, amp, width}
    function buildSpikes() {
        var spikes = [];
        // Four small early spikes (amplitude proportional to the slider, scaled
        // to be near V_F so the diode-drop failure is visible).
        var smallAmp = 0.5 * state.amp;
        for (var i = 0; i < 4; i++) {
            spikes.push({ t: 0.30 + i * 0.30, amp: smallAmp, w: 0.04 });
        }
        // Six larger spikes whose envelope rises then decays
        var lateT0 = 2.4;
        var ampsLate = [0.7, 1.0, 0.95, 0.7, 0.5, 0.35].map(function (k) { return k * state.amp * 2.4; });
        var dt = 0.50;
        for (var j = 0; j < ampsLate.length; j++) {
            spikes.push({ t: lateT0 + j * dt, amp: ampsLate[j], w: 0.03 });
        }
        return spikes;
    }

    function vIn(t, spikes) {
        // Slow baseline drift
        var v = 0.04 * Math.sin(2 * Math.PI * 0.12 * t);
        for (var i = 0; i < spikes.length; i++) {
            var s = spikes[i];
            var dt = (t - s.t) / s.w;
            // Smooth bell with quick rise and slower fall
            v += s.amp * Math.exp(-dt * dt * 4);
        }
        return v;
    }

    function simulate() {
        var spikes = buildSpikes();
        var n = Math.round(T_VIEW / DT);
        var pts = new Array(n);
        var vSimple = 0, vRc = 0, vTx = 0;
        var tauOn = 0.0015;
        var smallSeen = 0;
        var smallSpikeTimes = spikes.slice(0, 4).map(function (s) { return s.t; });
        var smallSeenAt = [false, false, false, false];

        for (var i = 0; i < n; i++) {
            var t = i * DT;
            var v = vIn(t, spikes);

            // SIMPLE: charge to v - V_F if larger, never discharge
            var target = v - state.vf;
            if (target > vSimple) vSimple = target;
            // SIMPLE has no discharge path, so it stays at the running max.

            // RC: charge to v - V_F if larger; otherwise exponential discharge
            if (target > vRc) vRc = target;
            else vRc -= vRc * (DT / state.tau);
            if (vRc < 0) vRc = 0;

            // TX RESET: charge to v - V_F if larger; once per window, reset
            var phase = (t / state.winReset) - Math.floor(t / state.winReset);
            var resetting = phase < 0.04; // 4 percent of the window is the reset pulse
            if (resetting) {
                vTx -= vTx * (DT / tauOn);
                if (vTx < 0) vTx = 0;
            } else {
                if (target > vTx) vTx = target;
            }

            // Track which small spikes turned the diode on
            for (var k = 0; k < 4; k++) {
                if (!smallSeenAt[k] && Math.abs(t - smallSpikeTimes[k]) < 0.1) {
                    if (target > 0.005) {
                        smallSeenAt[k] = true;
                    }
                }
            }

            pts[i] = [t, v, vSimple, vRc, vTx];
        }
        for (var m = 0; m < 4; m++) if (smallSeenAt[m]) smallSeen++;

        return { pts: pts, smallSeen: smallSeen, spikes: spikes };
    }

    var inputSvg = d3.select('#plot-pp-f-input').classed('ov', true);
    var outSvg   = d3.select('#plot-pp-f-out').classed('ov', true);

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

        // V_F threshold band
        f.g.append('rect').attr('x', 0).attr('y', y(state.vf))
            .attr('width', f.iw).attr('height', f.ih - y(state.vf))
            .attr('fill', 'var(--c-thresh)').attr('opacity', 0.08);
        f.g.append('line').attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(state.vf)).attr('y2', y(state.vf))
            .attr('stroke', 'var(--c-thresh)').attr('stroke-dasharray', '4 3')
            .attr('stroke-width', 1.2).attr('opacity', 0.7);
        f.g.append('text')
            .attr('x', 6).attr('y', y(state.vf) - 6)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--c-thresh)')
            .text('V_F · diode does not conduct below here');

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

        // Faint input (greyed)
        f.g.append('path')
            .datum(sim.pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-input)').attr('stroke-width', 1.2).attr('opacity', 0.35)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Simple detector (amber, latches)
        f.g.append('path')
            .datum(sim.pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-amber)').attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[2]); }));

        // RC detector (red dashed, droops)
        f.g.append('path')
            .datum(sim.pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 2.0)
            .attr('stroke-dasharray', '6 3')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[3]); }));

        // Transistor-reset detector (green)
        f.g.append('path')
            .datum(sim.pts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output)').attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[4]); }));

        // Reset window markers (faint vertical lines)
        for (var t = state.winReset; t < T_VIEW; t += state.winReset) {
            f.g.append('line').attr('x1', x(t)).attr('x2', x(t))
                .attr('y1', 0).attr('y2', f.ih)
                .attr('stroke', 'var(--c-output)').attr('stroke-width', 1.0)
                .attr('stroke-dasharray', '2 4').attr('opacity', 0.35);
        }

        // Legend (top right, in two rows for legibility)
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',8)');
        lg.append('text').attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('input');
        lg.append('text').attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-amber)').text('simple D + C');
        lg.append('text').attr('text-anchor', 'end').attr('y', 42)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-thresh)').text('RC envelope');
        lg.append('text').attr('text-anchor', 'end').attr('y', 58)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('transistor reset');
    }

    function updateReadout(sim) {
        rdSmall.textContent = sim.smallSeen + ' / 4';
        rdSmall.className = 'v ' + (sim.smallSeen === 0 ? 'warn'
            : sim.smallSeen < 4 ? 'amber' : 'on');

        // The simple detector latches on the largest historical peak. Compare
        // the final v_simple with the simulated max early-time peak; if they
        // are within 5 percent the detector is definitively latched on the
        // largest historical peak.
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

        // Compare RC detector to the late-spike envelope to assess lag/ripple
        var lateSpikes = sim.spikes.slice(4);
        var maxAmpLate = d3.max(lateSpikes, function (s) { return s.amp; });
        var rcTrack = d3.max(pts, function (p) { return p[3]; });
        var ratio = state.tau / 0.5;  // inter-spike spacing of the late spikes
        if (ratio > 1.2) {
            rdRc.textContent = 'lags';
            rdRc.className = 'v warn';
        } else if (ratio < 0.2) {
            rdRc.textContent = 'ripples';
            rdRc.className = 'v warn';
        } else {
            rdRc.textContent = 'ok';
            rdRc.className = 'v on';
        }
    }

    function refresh() {
        var sim = simulate();
        drawInput(sim);
        drawOutputs(sim);
        updateReadout(sim);
    }

    function init() {
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
        tauI.addEventListener('input', function () {
            state.tau = parseFloat(tauI.value) / 1000;
            tauL.textContent = parseFloat(tauI.value).toFixed(0) + ' ms';
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
