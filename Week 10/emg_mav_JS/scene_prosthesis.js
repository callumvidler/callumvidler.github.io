// scene_prosthesis.js  ·  Slide 6
// Live myoelectric prosthesis demo. Synthetic EMG (noise modulated by the
// effort slider) feeds a precision-rectifier + first-order LPF chain. The
// MAV output is compared against a threshold and drives a stylised
// two-finger gripper that closes when the user "contracts" the muscle.
(function () {
    var SVG_TRACE = '#plot-prst-emg';
    var SVG_HAND  = '#plot-prst-hand';
    if (d3.select(SVG_TRACE).empty()) return;

    // ─── Trace plot ──────────────────────────────────────────────────
    var svg = d3.select(SVG_TRACE).classed('ov', true);
    var W = 800, H = 320;
    var margin = { top: 48, right: 28, bottom: 48, left: 60 };
    var iw, ih, x, y;

    var T_WIN = 3.0;        // 3 s rolling window
    var Y_MAX = 1.30;       // V (signed both directions)
    var FS = 600;           // synthetic sample rate (Hz)
    var BUF = Math.round(T_WIN * FS);

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gEmg = gRoot.append('g');
    var gMav = gRoot.append('g');
    var gThr = gRoot.append('g');
    var gLegend = gRoot.append('g');

    // ─── Hand SVG ────────────────────────────────────────────────────
    var hand = d3.select(SVG_HAND);
    var hVB_W = 980, hVB_H = 360;
    hand.attr('viewBox', '0 0 ' + hVB_W + ' ' + hVB_H)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    var gHand = hand.append('g');

    // ─── UI ──────────────────────────────────────────────────────────
    var ui = {
        eff:    document.getElementById('prst-effort'),
        effv:   document.getElementById('prst-effort-val'),
        fc:     document.getElementById('prst-fc'),
        fcv:    document.getElementById('prst-fc-val'),
        thr:    document.getElementById('prst-thr'),
        thrv:   document.getElementById('prst-thr-val'),
        mavOut: document.getElementById('prst-mav'),
        grip:   document.getElementById('prst-grip'),
        state:  document.getElementById('prst-state'),
        modeLpf:    document.getElementById('prst-mode-lpf'),
        modeMavg:   document.getElementById('prst-mode-mavg'),
        modeKalman: document.getElementById('prst-mode-kalman')
    };

    // ─── Buffers and filter state ────────────────────────────────────
    var emgBuf = new Float32Array(BUF);   // raw EMG
    var mavBuf = new Float32Array(BUF);   // selected smoother output
    var absBuf = new Float32Array(BUF);   // |EMG|, used by moving avg
    var head = 0;

    // 1st-order LPF
    var lpfState = 0;

    // Moving-window average state. msSum holds the sum over the last
    // `msWindow` |EMG| samples. We keep msSum incrementally as samples
    // come in and out.
    var msSum = 0;
    var msWindow = Math.round(0.30 * FS);   // initial 300 ms window
    var msFilled = 0;                       // running sample count, capped at BUF

    // 1-D Kalman filter (scalar state x, variance P).
    // Plain scalar Kalman with constant Q,R is equivalent to a 1st-order
    // LPF in steady state, so we make it adaptive: a slow IIR estimate of
    // the innovation bias (kRMean) detects when the input mean is really
    // shifting, and Q is boosted while that bias is non-zero. In quiet
    // periods Q drops back to a small base value, so the filter rejects
    // far more noise than the LPF at the same nominal fc.
    var kS = 0;
    var kP = 1.0;
    var kR = 0.50;          // measurement noise variance for |EMG|
    var kRMean = 0;         // running mean of innovation (z - x)

    var mode = 'lpf';       // 'lpf' | 'mavg' | 'kalman'

    var lastEffort = 0;
    var lastTime = null;

    // Cap how much grip the gripper actually delivers, so saturation maps
    // to a clear "fully closed" pose. 2A_max / pi for A_max=1.0 ≈ 0.637 V.
    var MAV_FULL = 0.637;

    // Map fc (Hz) to a moving-average window length in samples. fc=0 maps
    // to the longest sensible window (2 s).
    function fcToMsWindow(fc) {
        if (fc <= 0) return Math.min(BUF, Math.round(2.0 * FS));
        var Tw = 1 / (2 * fc);              // half-period at fc
        Tw = Math.min(2.0, Math.max(0.02, Tw));
        return Math.round(Tw * FS);
    }

    // When the moving-avg window changes, recompute msSum from absBuf so
    // the running sum stays exact.
    function setMsWindow(w) {
        w = Math.max(1, Math.min(BUF, w));
        if (w === msWindow) return;
        msWindow = w;
        msSum = 0;
        var n = Math.min(msWindow, msFilled);
        for (var i = 1; i <= n; i++) {
            var idx = (head - i + BUF) % BUF;
            msSum += absBuf[idx];
        }
    }

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(420, rect.width);
        H = Math.max(240, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        x = d3.scaleLinear().domain([-T_WIN, 0]).range([0, iw]);
        y = d3.scaleLinear().domain([-Y_MAX, Y_MAX]).range([ih, 0]);
    }

    function drawAxes() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        [-1, -0.5, 0, 0.5, 1].forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });
        gAxis.append('g')
            .call(d3.axisLeft(y).tickValues([-1, -0.5, 0, 0.5, 1])
                .tickFormat(function (d) { return d.toFixed(1); })
                .tickSize(0).tickPadding(8))
            .select('.domain').remove();

        var xt = [-3, -2.5, -2, -1.5, -1, -0.5, 0];
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickValues(xt)
                .tickFormat(function (d) { return d.toFixed(1) + ' s'; })
                .tickSize(0).tickPadding(8))
            .select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 38)
            .attr('text-anchor', 'middle')
            .text('time relative to now, s');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-46) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude, V');
    }

    function drawLegend() {
        gLegend.selectAll('*').remove();
        var lx = 8, ly = 8, dy = 14;
        function lg(i, color, label) {
            gLegend.append('line')
                .attr('x1', lx).attr('x2', lx + 18)
                .attr('y1', ly + i * dy + 6).attr('y2', ly + i * dy + 6)
                .attr('stroke', color).attr('stroke-width', 2.2);
            gLegend.append('text')
                .attr('x', lx + 24).attr('y', ly + i * dy + 9)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10).attr('fill', 'var(--text-dim)')
                .text(label);
        }
        var modeLabel = mode === 'lpf' ? '1st-order LPF'
                       : mode === 'mavg' ? 'moving avg'
                       : 'kalman';
        lg(0, 'var(--c-input)',   'EMG x(t)');
        lg(1, 'var(--c-output2)', 'MAV · ' + modeLabel);
        lg(2, 'var(--c-thresh)',  'threshold');
    }

    // Bandlimited EMG sample. Effort scales burst amplitude; baseline noise
    // floor is fixed. Two-pole IIR low-pass on white noise gives a passable
    // EMG-like waveform without a real spectral model.
    var noiseLpf = { y1: 0, y2: 0 };
    function emgSample(effort) {
        var w = (Math.random() - 0.5) * 2;       // ±1 white
        // Cheap two-pole low-pass to roll off above ~150 Hz at FS=600
        noiseLpf.y2 = noiseLpf.y1;
        noiseLpf.y1 = 0.55 * noiseLpf.y1 + 0.45 * w;
        var burst = noiseLpf.y1 * effort;
        var floor = 0.04 * (Math.random() - 0.5) * 2;
        return 1.4 * burst + floor;
    }

    function drawTraces(thr) {
        gEmg.selectAll('*').remove();
        gMav.selectAll('*').remove();
        gThr.selectAll('*').remove();

        // Walk the buffer in temporal order and decimate for D3.
        var step = Math.max(1, Math.floor(BUF / 600));
        var emgPts = [], mavPts = [];
        for (var i = 0; i < BUF; i += step) {
            var idx = (head + i) % BUF;
            var ageSamples = BUF - 1 - i;
            var t = -ageSamples / FS;
            emgPts.push([t, emgBuf[idx]]);
            mavPts.push([t, mavBuf[idx]]);
        }

        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        gEmg.append('path').datum(emgPts).attr('class', 'trace input').attr('d', line)
            .attr('opacity', 0.65);
        gMav.append('path').datum(mavPts).attr('class', 'trace output2').attr('d', line)
            .attr('stroke-width', 2.6);

        gThr.append('line')
            .attr('class', 'thresh-line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', y(thr)).attr('y2', y(thr))
            .style('cursor', 'default');
        gThr.append('text')
            .attr('class', 'thresh-label')
            .attr('x', iw - 6).attr('y', y(thr) - 5)
            .attr('text-anchor', 'end')
            .text('threshold = ' + thr.toFixed(2) + ' V');
    }

    // ─── Gripper drawing ─────────────────────────────────────────────
    function drawHand(grip01, mav, thr) {
        gHand.selectAll('*').remove();

        // Caption
        gHand.append('text')
            .attr('x', hVB_W / 2).attr('y', 24)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10.5)
            .attr('letter-spacing', '0.18em')
            .attr('fill', 'var(--muted)')
            .text('GRIPPER · MAV → JAW ANGLE');

        // Centre of the device in the SVG
        var cx = 360, cy = 200;

        // Wrist / chassis block
        gHand.append('rect')
            .attr('x', cx - 70).attr('y', cy + 60)
            .attr('width', 140).attr('height', 70)
            .attr('rx', 8)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.6);
        gHand.append('text')
            .attr('x', cx).attr('y', cy + 102)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .attr('fill', 'var(--text-dim)')
            .text('actuator');

        // Pivot points for two jaws
        var pivotL = { x: cx - 44, y: cy + 60 };
        var pivotR = { x: cx + 44, y: cy + 60 };

        var openDeg = 60;        // open angle from vertical (relaxed)
        var closeDeg = 6;        // closed angle from vertical
        var ang = openDeg - (openDeg - closeDeg) * grip01;
        var rad = ang * Math.PI / 180;
        var jawLen = 130;

        var tipL = { x: pivotL.x - Math.sin(rad) * jawLen, y: pivotL.y - Math.cos(rad) * jawLen };
        var tipR = { x: pivotR.x + Math.sin(rad) * jawLen, y: pivotR.y - Math.cos(rad) * jawLen };

        function jaw(p, tip) {
            // Build a tapered rectangle along the pivot→tip axis.
            var dx = tip.x - p.x, dy = tip.y - p.y;
            var len = Math.sqrt(dx * dx + dy * dy);
            var ux = dx / len, uy = dy / len;       // unit along jaw
            var nx = -uy, ny = ux;                  // unit normal
            var hb = 16, ht = 8;                    // half-widths at base and tip
            var pts = [
                [p.x + nx * hb, p.y + ny * hb],
                [tip.x + nx * ht, tip.y + ny * ht],
                [tip.x - nx * ht, tip.y - ny * ht],
                [p.x - nx * hb, p.y - ny * hb]
            ].map(function (q) { return q.join(','); }).join(' ');
            gHand.append('polygon')
                .attr('points', pts)
                .attr('fill', grip01 > 0.05 ? 'color-mix(in srgb, var(--c-output2) 30%, var(--bg-2))' : 'var(--bg-2)')
                .attr('stroke', 'var(--text)').attr('stroke-width', 1.6)
                .attr('stroke-linejoin', 'round');
        }
        jaw(pivotL, tipL);
        jaw(pivotR, tipR);

        // Pivot dots
        [pivotL, pivotR].forEach(function (q) {
            gHand.append('circle').attr('cx', q.x).attr('cy', q.y).attr('r', 4)
                .attr('fill', 'var(--text)');
        });

        // Object being gripped (only when above threshold)
        if (mav > thr) {
            var gap = (tipR.x - tipL.x) / 2 - 6;
            gap = Math.max(8, gap);
            var ox = (tipL.x + tipR.x) / 2;
            var oy = (tipL.y + tipR.y) / 2 + 8;
            gHand.append('rect')
                .attr('x', ox - gap).attr('y', oy - 22)
                .attr('width', 2 * gap).attr('height', 44)
                .attr('rx', 6)
                .attr('fill', 'color-mix(in srgb, var(--c-thresh) 25%, var(--bg-2))')
                .attr('stroke', 'var(--c-thresh)')
                .attr('stroke-width', 1.4);
        }

        // Force gauge on the right
        var gaugeX = 720, gaugeY = 80, gaugeW = 220, gaugeH = 18;
        gHand.append('text')
            .attr('x', gaugeX).attr('y', gaugeY - 10)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10.5).attr('fill', 'var(--muted)')
            .attr('letter-spacing', '0.12em')
            .text('GRIP FORCE');
        gHand.append('rect')
            .attr('x', gaugeX).attr('y', gaugeY)
            .attr('width', gaugeW).attr('height', gaugeH)
            .attr('rx', 4)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--border)').attr('stroke-width', 1);
        gHand.append('rect')
            .attr('x', gaugeX).attr('y', gaugeY)
            .attr('width', gaugeW * grip01).attr('height', gaugeH)
            .attr('rx', 4)
            .attr('fill', mav > thr ? 'var(--c-output2)' : 'var(--c-low)')
            .attr('opacity', 0.85);
        gHand.append('text')
            .attr('x', gaugeX + gaugeW).attr('y', gaugeY + gaugeH + 16)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 12).attr('fill', 'var(--text)')
            .text((100 * grip01).toFixed(0) + ' %');

        // State pill
        var stateOn = mav > thr;
        var pillY = gaugeY + 70;
        gHand.append('rect')
            .attr('x', gaugeX).attr('y', pillY)
            .attr('width', gaugeW).attr('height', 36)
            .attr('rx', 18)
            .attr('fill', stateOn
                ? 'color-mix(in srgb, var(--c-output2) 18%, var(--bg-2))'
                : 'var(--bg-2)')
            .attr('stroke', stateOn ? 'var(--c-output2)' : 'var(--border)')
            .attr('stroke-width', 1.4);
        gHand.append('circle')
            .attr('cx', gaugeX + 18).attr('cy', pillY + 18)
            .attr('r', 6)
            .attr('fill', stateOn ? 'var(--c-output2)' : 'var(--c-low)');
        gHand.append('text')
            .attr('x', gaugeX + 36).attr('y', pillY + 22)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 13)
            .attr('fill', stateOn ? 'var(--c-output2)' : 'var(--text-dim)')
            .attr('letter-spacing', '0.10em')
            .text(stateOn ? 'GRIPPING' : 'RELAXED');

        // MAV vs threshold annotation (left side)
        gHand.append('text')
            .attr('x', 60).attr('y', 80)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10.5).attr('fill', 'var(--muted)')
            .attr('letter-spacing', '0.12em')
            .text('MAV');
        gHand.append('text')
            .attr('x', 60).attr('y', 102)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 18).attr('fill', 'var(--c-output2)')
            .text(mav.toFixed(3) + ' V');
        gHand.append('text')
            .attr('x', 60).attr('y', 130)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10.5).attr('fill', 'var(--muted)')
            .text('threshold ' + thr.toFixed(2) + ' V');
    }

    // ─── Animation loop ──────────────────────────────────────────────
    function step(now) {
        if (lastTime === null) lastTime = now;
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.25) dt = 0.25;     // clamp big tab-switch jumps

        var effort = parseFloat(ui.eff.value);
        var fc = parseFloat(ui.fc.value);
        var thr = parseFloat(ui.thr.value);

        // Smooth the slider to avoid step changes in the EMG envelope.
        lastEffort += (effort - lastEffort) * Math.min(1, dt * 8);

        var ts = 1 / FS;

        // 1st-order LPF: tau = 1/(2π fc); fc=0 → tau very large (≈ 2 s).
        var tau = fc > 0 ? 1 / (2 * Math.PI * fc) : 2.0;
        var alpha = ts / (tau + ts);

        // Kalman: base process noise is much smaller than the LPF
        // equivalent so quiet-period smoothing is heavier. The adaptive
        // term (added per-sample below) brings Q up only when the
        // innovation bias indicates a real shift in the EMG envelope.
        var fcKal = Math.max(0.05, fc);
        var Qbase = 0.06 * kR * Math.pow(2 * Math.PI * fcKal * ts, 2);

        // Moving avg: re-compute window length if the slider moved.
        var newWindow = fcToMsWindow(fc);
        if (newWindow !== msWindow) setMsWindow(newWindow);

        var nSamples = Math.max(1, Math.min(BUF, Math.round(dt * FS)));

        for (var i = 0; i < nSamples; i++) {
            var s = emgSample(lastEffort);
            var a = Math.abs(s);

            // 1st-order LPF
            lpfState = lpfState + alpha * (a - lpfState);

            // Moving average: evict the sample that just fell out of the
            // window, push the new one, update the running sum.
            var evict = 0;
            if (msFilled >= msWindow) {
                var oldIdx = (head + BUF - msWindow) % BUF;
                evict = absBuf[oldIdx];
            }
            absBuf[head] = a;
            msSum += a - evict;
            msFilled = Math.min(BUF, msFilled + 1);
            var maOut = msSum / Math.min(msWindow, msFilled);

            // 1-D Kalman with adaptive Q. Track running mean of the
            // innovation; when its magnitude grows the filter believes
            // the underlying mean is shifting, so Q is boosted to let
            // the state catch up.
            var innov = a - kS;
            kRMean = kRMean * 0.995 + innov * 0.005;
            var Q = Qbase + 80 * kRMean * kRMean;
            kP = kP + Q;
            var K = kP / (kP + kR);
            kS = kS + K * innov;
            kP = (1 - K) * kP;

            var out = mode === 'lpf' ? lpfState
                    : mode === 'mavg' ? maOut
                    : kS;

            emgBuf[head] = s;
            mavBuf[head] = out;
            head = (head + 1) % BUF;
        }

        // Latest output of the active filter
        var mav = mode === 'lpf' ? lpfState
                : mode === 'mavg' ? (msFilled > 0 ? msSum / Math.min(msWindow, msFilled) : 0)
                : kS;

        ui.effv.textContent = (100 * effort).toFixed(0) + ' %';
        ui.fcv.textContent = fc.toFixed(1) + ' Hz';
        ui.thrv.textContent = thr.toFixed(2) + ' V';
        if (ui.mavOut) ui.mavOut.textContent = mav.toFixed(3) + ' V';

        var grip01 = mav <= thr ? 0 : Math.min(1, (mav - thr) / (MAV_FULL - thr));
        if (ui.grip) ui.grip.textContent = (100 * grip01).toFixed(0) + ' %';
        if (ui.state) {
            ui.state.textContent = mav > thr ? 'GRIPPING' : 'RELAXED';
            ui.state.classList.toggle('on', mav > thr);
            ui.state.classList.toggle('off', mav <= thr);
        }

        drawTraces(thr);
        drawHand(grip01, mav, thr);

        requestAnimationFrame(step);
    }

    // ─── Mode toggle wiring ──────────────────────────────────────────
    function setMode(m) {
        mode = m;
        ui.modeLpf.classList.toggle('active', m === 'lpf');
        ui.modeMavg.classList.toggle('active', m === 'mavg');
        ui.modeKalman.classList.toggle('active', m === 'kalman');
        // Seed the new filter's state from the current outputs of the
        // others, so switching does not snap to zero.
        var seed = mode === 'lpf' ? lpfState
                 : mode === 'mavg' ? (msFilled > 0 ? msSum / Math.min(msWindow, msFilled) : 0)
                 : kS;
        if (m === 'lpf') lpfState = seed;
        else if (m === 'kalman') { kS = seed; kP = 0.5; }
        drawLegend();
    }

    function onResize() {
        layout();
        drawAxes();
        drawLegend();
    }

    function init() {
        layout();
        drawAxes();
        drawLegend();
        if (ui.modeLpf)    ui.modeLpf.addEventListener('click', function () { setMode('lpf'); });
        if (ui.modeMavg)   ui.modeMavg.addEventListener('click', function () { setMode('mavg'); });
        if (ui.modeKalman) ui.modeKalman.addEventListener('click', function () { setMode('kalman'); });
        window.addEventListener('resize', onResize);
        window.addEventListener('themechange', onResize);
        requestAnimationFrame(step);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
