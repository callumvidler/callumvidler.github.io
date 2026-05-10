// scene_chain.js  ·  Slide 5
// Two-panel view of the full chain: filtered EEG input on top, held envelope
// (the system output a clinician reads) on the bottom. The Schmitt and
// monostable signals are still computed for the readouts but no longer drawn.
// User-controlled parameters: Schmitt upper threshold V_T+, hysteresis width
// (V_T+ − V_T−), and the peak-detector leak time constant τ_leak.
(function () {
    var SVG = '#plot-chain-trace';
    var WINDOW = 10;          // seconds of trace shown
    var COMPUTE_WINDOW = 26;  // seconds of history fed into the peak detector
                              // so the leftmost visible sample has had ~16 s of
                              // warm-up — long enough that τ_leak ≤ 8 s decays
                              // any earlier transient to ~0 before it scrolls
                              // into view, eliminating the rollover jitter.
    var EEG_DOMAIN = [-1.0, 3.4];
    var OUT_DOMAIN = [0, 3.0];

    var MONO_WIDTH = 0.18;
    var V_DROP = 0.30;

    var state = {
        vtp: 0.55,
        hw: 0.20,
        tau: 2.2
    };

    var svg = d3.select(SVG).classed('ov', true);
    var W = 700, H = 460;
    var margin = { top: 44, right: 26, bottom: 44, left: 60 };

    var gRoot = svg.append('g');
    var gAxisX = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gPanel = {
        eeg: gRoot.append('g'),
        out: gRoot.append('g')
    };

    var ui = {
        rPulses: document.getElementById('chain-pulses'),
        rPeak: document.getElementById('chain-peak'),
        rEnv: document.getElementById('chain-env'),
        th: document.getElementById('chain-th'),
        thVal: document.getElementById('chain-th-val'),
        hw: document.getElementById('chain-hw'),
        hwVal: document.getElementById('chain-hw-val'),
        tau: document.getElementById('chain-tau'),
        tauVal: document.getElementById('chain-tau-val')
    };

    var L = {};

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(420, rect.width);
        H = Math.max(360, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var iw = W - margin.left - margin.right;
        var ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var hEeg = ih * 0.50;
        var hOut = ih * 0.42;
        var gap = ih - hEeg - hOut;

        L.iw = iw; L.ih = ih;
        L.x = d3.scaleLinear().domain([-WINDOW, 0]).range([0, iw]);

        L.eeg = {
            top: 0, h: hEeg,
            y: d3.scaleLinear().domain(EEG_DOMAIN).range([hEeg, 0])
        };
        L.out = {
            top: hEeg + gap, h: hOut,
            y: d3.scaleLinear().domain(OUT_DOMAIN).range([hOut, 0])
        };

        gPanel.eeg.attr('transform', 'translate(0,' + L.eeg.top + ')');
        gPanel.out.attr('transform', 'translate(0,' + L.out.top + ')');
    }

    function drawStatic() {
        gAxisX.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        Object.keys(gPanel).forEach(function (k) {
            gPanel[k].selectAll('.panel-bg').remove();
            gPanel[k].insert('rect', ':first-child')
                .attr('class', 'panel-bg')
                .attr('x', 0).attr('y', 0)
                .attr('width', L.iw).attr('height', L[k].h)
                .attr('fill', 'transparent');
        });

        gPanel.eeg.selectAll('.grid').remove();
        var eegGrid = gPanel.eeg.append('g').attr('class', 'grid');
        [-1, 0, 1, 2, 3].forEach(function (v) {
            eegGrid.append('line').attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', L.iw)
                .attr('y1', L.eeg.y(v)).attr('y2', L.eeg.y(v));
        });
        gPanel.eeg.selectAll('.axis').remove();
        gPanel.eeg.append('g').attr('class', 'axis')
            .call(d3.axisLeft(L.eeg.y).tickValues([-1, 0, 1, 2, 3]).tickSize(0).tickPadding(8))
            .select('.domain').remove();
        gPanel.eeg.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (L.eeg.h / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('v_in (mV)');

        gPanel.out.selectAll('.grid').remove();
        var outGrid = gPanel.out.append('g').attr('class', 'grid');
        [0, 1, 2, 3].forEach(function (v) {
            outGrid.append('line').attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', L.iw)
                .attr('y1', L.out.y(v)).attr('y2', L.out.y(v));
        });
        gPanel.out.selectAll('.axis').remove();
        gPanel.out.append('g').attr('class', 'axis')
            .call(d3.axisLeft(L.out.y).tickValues([0, 1, 2, 3]).tickSize(0).tickPadding(8))
            .select('.domain').remove();
        gPanel.out.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (L.out.h / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('V_held (mV)');

        gAxisX.attr('transform', 'translate(0,' + (L.out.top + L.out.h) + ')');
        gAxisX.call(d3.axisBottom(L.x).tickValues([-10, -8, -6, -4, -2, 0])
            .tickFormat(function (d) { return d + 's'; }).tickSize(0).tickPadding(8))
            .select('.domain').remove();
        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', L.iw / 2)
            .attr('y', L.out.top + L.out.h + 30)
            .attr('text-anchor', 'middle')
            .text('time relative to now, s');
    }

    function evaluateChain(data) {
        var vtp = state.vtp;
        var vtm = Math.max(0, vtp - state.hw);
        var tau = state.tau;

        var schmittRise = [];
        var outHigh = false;
        var prev = data[0] ? data[0].filt : 0;
        for (var i = 1; i < data.length; i++) {
            var v = data[i].filt;
            if (!outHigh && prev <= vtp && v > vtp) {
                outHigh = true;
                schmittRise.push(data[i].t);
            } else if (outHigh && prev >= vtm && v < vtm) {
                outHigh = false;
            }
            prev = v;
        }
        var dt = (data.length > 1) ? (data[1].t - data[0].t) : 1 / EEG.FS;
        var alpha = Math.exp(-dt / tau);
        var held = new Float32Array(data.length);
        var hv = 0;
        for (var j = 0; j < data.length; j++) {
            var x = data[j].filt - V_DROP;
            if (x > hv) hv = x; else hv *= alpha;
            if (hv < 0) hv = 0;
            held[j] = hv;
        }
        return { held: held, rises: schmittRise };
    }

    function drawFrame() {
        // Compute over the long window so the visible portion is stable, then
        // slice the last WINDOW seconds for display.
        var dataAll = EEG.recent(COMPUTE_WINDOW);
        if (dataAll.length === 0) return;
        var ev = evaluateChain(dataAll);
        var nowT = dataAll[dataAll.length - 1].t;
        var visibleStart = nowT - WINDOW;
        var firstVisible = 0;
        for (var i = 0; i < dataAll.length; i++) {
            if (dataAll[i].t >= visibleStart) { firstVisible = i; break; }
        }
        var data = dataAll.slice(firstVisible);
        var heldVis = ev.held.slice(firstVisible);

        var lineEEG = d3.line()
            .x(function (d) { return L.x(d.t - nowT); })
            .y(function (d) { return L.eeg.y(Math.max(EEG_DOMAIN[0], Math.min(EEG_DOMAIN[1], d.filt))); });
        gPanel.eeg.selectAll('.dyn').remove();
        var dynEeg = gPanel.eeg.append('g').attr('class', 'dyn');

        // Threshold lines on the input panel
        dynEeg.append('line').attr('class', 'thresh-line')
            .attr('x1', 0).attr('x2', L.iw)
            .attr('y1', L.eeg.y(state.vtp)).attr('y2', L.eeg.y(state.vtp));
        var vtm = Math.max(0, state.vtp - state.hw);
        dynEeg.append('line').attr('class', 'thresh-line')
            .attr('stroke', 'var(--c-output2)')
            .attr('x1', 0).attr('x2', L.iw)
            .attr('y1', L.eeg.y(vtm)).attr('y2', L.eeg.y(vtm));

        dynEeg.append('path').datum(data)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.6)
            .attr('opacity', 0.9)
            .attr('d', lineEEG);
        dynEeg.append('text')
            .attr('x', 6).attr('y', 14)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-input)')
            .text('input · v_in (filtered EEG)');
        dynEeg.append('text')
            .attr('x', L.iw - 6).attr('y', L.eeg.y(state.vtp) - 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-output)')
            .text('V_T+');
        dynEeg.append('text')
            .attr('x', L.iw - 6).attr('y', L.eeg.y(vtm) + 12)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-output2)')
            .text('V_T−');

        var hd = data.map(function (d, i) { return { t: d.t, v: heldVis[i] }; });
        var lineHold = d3.line()
            .x(function (d) { return L.x(d.t - nowT); })
            .y(function (d) { return L.out.y(Math.max(OUT_DOMAIN[0], Math.min(OUT_DOMAIN[1], d.v))); });
        gPanel.out.selectAll('.dyn').remove();
        var dynOut = gPanel.out.append('g').attr('class', 'dyn');
        dynOut.append('path').datum(hd)
            .attr('class', 'trace output2')
            .attr('stroke-width', 2.4)
            .attr('d', lineHold);
        dynOut.append('text')
            .attr('x', 6).attr('y', 14)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-output2)')
            .text('output · V_held (peak envelope)');

        // Readouts use rises that fall in the last 4 s
        var pulses4s = ev.rises.filter(function (t) { return t >= nowT - 4; }).length;
        ui.rPulses.textContent = pulses4s;
        ui.rPeak.textContent = ev.held[ev.held.length - 1].toFixed(2) + ' mV';

        // Envelope direction over the last 5 s of the visible window.
        var midIdx = Math.max(0, ev.held.length - Math.round(EEG.FS * (WINDOW / 2)));
        var dHeld = ev.held[ev.held.length - 1] - ev.held[midIdx];
        var label = 'flat';
        if (dHeld > 0.10) label = 'rising';
        else if (dHeld < -0.10) label = 'falling';
        ui.rEnv.textContent = label;
        ui.rEnv.classList.toggle('on', label === 'rising');
        ui.rEnv.classList.toggle('warn', label === 'falling');
        ui.rEnv.classList.toggle('off', label === 'flat');
    }

    function bindControls() {
        ui.th.addEventListener('input', function () {
            state.vtp = parseFloat(ui.th.value);
            ui.thVal.textContent = state.vtp.toFixed(2);
            drawFrame();
        });
        ui.hw.addEventListener('input', function () {
            state.hw = parseFloat(ui.hw.value);
            ui.hwVal.textContent = state.hw.toFixed(2);
            drawFrame();
        });
        ui.tau.addEventListener('input', function () {
            state.tau = parseFloat(ui.tau.value);
            ui.tauVal.textContent = state.tau.toFixed(2) + ' s';
            drawFrame();
        });
    }

    function init() {
        layout();
        drawStatic();
        bindControls();
        EEG.onTick(drawFrame);
        window.addEventListener('themechange', function () { drawStatic(); drawFrame(); });
        window.addEventListener('resize', function () { layout(); drawStatic(); drawFrame(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
