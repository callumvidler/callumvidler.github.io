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

    // Bayesian envelope estimator after Sanger (2007), "Bayesian filtering of
    // myoelectric signals". The underlying EMG is modelled as zero-mean
    // Gaussian with slowly varying variance σ²(n), so x²(n) = σ²(n)·χ²₁.
    // Taking logs linearises the problem:
    //     z(n) = log(x²(n)) = log(σ²(n)) + log(χ²₁),
    // where log(χ²₁) is approximately Gaussian with mean ψ(½)+log 2 ≈ −1.27
    // and variance π²/2. A standard 1-D Kalman on the bias-corrected
    // measurement z − (−1.27) recovers the latent state s = log σ². The
    // output is converted back to a MAV-scale envelope via E[|x|] = σ·√(2/π).
    var skS = -7;          // log(σ²), seeded near a quiet baseline σ ≈ 0.03
    var skP = 4.0;         // initial state variance (wide prior)
    var SK_MEAN = -1.27036;             // E[log χ²₁]
    var SK_R = Math.PI * Math.PI / 2;   // Var[log χ²₁]
    var SK_EPS = 1e-6;                  // floor inside log to avoid log(0)

    var mode = 'lpf';       // 'lpf' | 'mavg' | 'kalman'

    var lastEffort = 0;
    var lastTime = null;

    // MAV value that maps to a fully closed gripper. The synthetic EMG is
    // bandlimited Gaussian-like noise rather than a sine, so its MAV ceiling
    // is σ·√(2/π) (about 0.34 at effort=1), not 2A/π. Setting the cap near
    // that empirical ceiling lets full slider effort actually saturate grip.
    var MAV_FULL = 0.32;

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
        var modeLabel = mode === 'lpf' ? '1st-order LPF'
                       : mode === 'mavg' ? 'moving avg'
                       : 'kalman';
        var items = [
            { color: 'var(--c-input)',   label: 'EMG x(t)'         },
            { color: 'var(--c-output2)', label: 'MAV · ' + modeLabel },
            { color: 'var(--c-thresh)',  label: 'threshold'        }
        ];
        var lineLen = 18, labelPad = 6, gap = 18;
        var groups = [];
        var totalW = 0;
        items.forEach(function (it) {
            var sub = gLegend.append('g');
            sub.append('line')
                .attr('x1', 0).attr('x2', lineLen)
                .attr('y1', 7).attr('y2', 7)
                .attr('stroke', it.color).attr('stroke-width', 2.2);
            sub.append('text')
                .attr('x', lineLen + labelPad).attr('y', 10)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10).attr('fill', 'var(--text-dim)')
                .text(it.label);
            var w = sub.node().getBBox().width;
            groups.push({ sub: sub, w: w });
            totalW += w;
        });
        totalW += gap * (items.length - 1);
        var cursor = iw - totalW;
        groups.forEach(function (grp) {
            grp.sub.attr('transform', 'translate(' + cursor + ',-22)');
            cursor += grp.w + gap;
        });
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

        var stateOn = mav > thr;
        var bodyFill = stateOn
            ? 'color-mix(in srgb, var(--c-output2) 18%, var(--bg-2))'
            : 'var(--bg-2)';

        // Cap grip01 visually so the two fingers do not cross when fully closed.
        var g = Math.min(0.94, grip01);

        // Centre of the device
        var cx = 360;

        // ─── Wrist coupler ───────────────────────────────────────────
        var wristY = 296, wristH = 50, wristHW = 56;
        gHand.append('rect')
            .attr('x', cx - wristHW).attr('y', wristY)
            .attr('width', 2 * wristHW).attr('height', wristH)
            .attr('rx', 4)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.4);
        // Decorative bands across the coupler
        [0.28, 0.62, 0.86].forEach(function (f) {
            gHand.append('line')
                .attr('x1', cx - wristHW + 4).attr('x2', cx + wristHW - 4)
                .attr('y1', wristY + f * wristH).attr('y2', wristY + f * wristH)
                .attr('stroke', 'var(--border)').attr('stroke-width', 0.7);
        });
        // Bolt heads on the flange line
        [-34, -12, 12, 34].forEach(function (dx) {
            gHand.append('circle')
                .attr('cx', cx + dx).attr('cy', wristY + 0.28 * wristH).attr('r', 2.2)
                .attr('fill', 'var(--bg-1)')
                .attr('stroke', 'var(--text)').attr('stroke-width', 0.7);
        });

        // ─── Palm / housing ──────────────────────────────────────────
        var palmW = 168, palmH = 78;
        var palmX = cx - palmW / 2, palmY = 220;
        gHand.append('rect')
            .attr('x', palmX).attr('y', palmY)
            .attr('width', palmW).attr('height', palmH)
            .attr('rx', 14)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.6);
        // Inner bezel
        gHand.append('rect')
            .attr('x', palmX + 6).attr('y', palmY + 6)
            .attr('width', palmW - 12).attr('height', palmH - 12)
            .attr('rx', 9)
            .attr('fill', 'none')
            .attr('stroke', 'var(--border)').attr('stroke-width', 0.8);
        // Mounting screws at corners
        [[palmX + 12, palmY + 12], [palmX + palmW - 12, palmY + 12],
         [palmX + 12, palmY + palmH - 12], [palmX + palmW - 12, palmY + palmH - 12]
        ].forEach(function (pt) {
            gHand.append('circle')
                .attr('cx', pt[0]).attr('cy', pt[1]).attr('r', 2.2)
                .attr('fill', 'var(--bg-1)')
                .attr('stroke', 'var(--text)').attr('stroke-width', 0.7);
            gHand.append('line')
                .attr('x1', pt[0] - 1.4).attr('x2', pt[0] + 1.4)
                .attr('y1', pt[1]).attr('y2', pt[1])
                .attr('stroke', 'var(--text)').attr('stroke-width', 0.5);
        });
        // Status LED on the palm
        var ledY = palmY + palmH / 2 - 4;
        gHand.append('circle')
            .attr('cx', cx).attr('cy', ledY).attr('r', 8)
            .attr('fill', 'var(--bg-1)')
            .attr('stroke', 'var(--border)').attr('stroke-width', 0.8);
        gHand.append('circle')
            .attr('cx', cx).attr('cy', ledY).attr('r', 4.5)
            .attr('fill', stateOn ? 'var(--c-output2)' : 'var(--c-low)')
            .attr('opacity', stateOn ? 1 : 0.45);
        if (stateOn) {
            gHand.append('circle')
                .attr('cx', cx).attr('cy', ledY).attr('r', 11)
                .attr('fill', 'none')
                .attr('stroke', 'var(--c-output2)').attr('stroke-width', 0.9)
                .attr('opacity', 0.5);
        }
        // Brand label
        gHand.append('text')
            .attr('x', cx).attr('y', palmY + palmH - 14)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 7.5).attr('letter-spacing', '0.22em')
            .attr('fill', 'var(--muted)')
            .text('MYO-2 · ACTUATOR');

        // ─── Articulated fingers ─────────────────────────────────────
        var pivotL = { x: cx - 56, y: palmY + 4 };
        var pivotR = { x: cx + 56, y: palmY + 4 };

        // Angle convention: angle from vertical, positive = outward (away from
        // palm centre), negative = inward. Open pose has both segments spread
        // outward; closed pose has the proximal tilted inward and the distal
        // curled further inward (curl is the inward bend at the knuckle).
        var proxOpen = 32, proxClose = -10;
        var curlOpen = 0,  curlClose = 30;
        var prox = proxOpen + (proxClose - proxOpen) * g;
        var curl = curlOpen + (curlClose - curlOpen) * g;
        var distAbs = prox - curl;     // distal absolute angle from vertical

        var proxLen = 72;
        var distLen = 56;

        function segment(p1, p2, hb, ht, fill) {
            var ddx = p2.x - p1.x, ddy = p2.y - p1.y;
            var L = Math.sqrt(ddx * ddx + ddy * ddy);
            if (L < 0.001) return;
            var ux = ddx / L, uy = ddy / L;
            var nx = -uy, ny = ux;
            var pts = [
                [p1.x + nx * hb, p1.y + ny * hb],
                [p2.x + nx * ht, p2.y + ny * ht],
                [p2.x - nx * ht, p2.y - ny * ht],
                [p1.x - nx * hb, p1.y - ny * hb]
            ].map(function (q) { return q.join(','); }).join(' ');
            gHand.append('polygon')
                .attr('points', pts)
                .attr('fill', fill)
                .attr('stroke', 'var(--text)').attr('stroke-width', 1.4)
                .attr('stroke-linejoin', 'round');
        }

        function joint(p, r) {
            gHand.append('circle')
                .attr('cx', p.x).attr('cy', p.y).attr('r', r)
                .attr('fill', 'var(--bg-1)')
                .attr('stroke', 'var(--text)').attr('stroke-width', 1.1);
            gHand.append('circle')
                .attr('cx', p.x).attr('cy', p.y).attr('r', r * 0.35)
                .attr('fill', 'var(--text)');
        }

        function gripPad(p1, p2, innerNx, innerNy) {
            var ddx = p2.x - p1.x, ddy = p2.y - p1.y;
            var L = Math.sqrt(ddx * ddx + ddy * ddy);
            if (L < 0.001) return;
            var ux = ddx / L, uy = ddy / L;
            // Pad runs along most of the distal segment, offset inward.
            var off = 4;
            var t0 = 0.18, t1 = 0.92;
            var b = { x: p1.x + ux * (L * t0) + innerNx * off,
                      y: p1.y + uy * (L * t0) + innerNy * off };
            var e = { x: p1.x + ux * (L * t1) + innerNx * off,
                      y: p1.y + uy * (L * t1) + innerNy * off };
            var hw = 4.5;
            var pts = [
                [b.x + innerNx * hw, b.y + innerNy * hw],
                [e.x + innerNx * hw, e.y + innerNy * hw],
                [e.x - innerNx * hw, e.y - innerNy * hw],
                [b.x - innerNx * hw, b.y - innerNy * hw]
            ].map(function (q) { return q.join(','); }).join(' ');
            gHand.append('polygon')
                .attr('points', pts)
                .attr('fill', 'var(--bg-1)')
                .attr('stroke', 'var(--text)').attr('stroke-width', 0.8)
                .attr('opacity', 0.95);
            // Ridges across the pad surface
            for (var ri = 0.12; ri < 0.95; ri += 0.16) {
                var rx = b.x + (e.x - b.x) * ri;
                var ry = b.y + (e.y - b.y) * ri;
                gHand.append('line')
                    .attr('x1', rx + innerNx * (hw - 0.5)).attr('y1', ry + innerNy * (hw - 0.5))
                    .attr('x2', rx - innerNx * (hw - 0.5)).attr('y2', ry - innerNy * (hw - 0.5))
                    .attr('stroke', 'var(--text)').attr('stroke-width', 0.5)
                    .attr('opacity', 0.45);
            }
        }

        function fingerGeom(pivot, side) {
            // side: -1 left, +1 right. Positive angle = outward.
            var radProx = prox * Math.PI / 180;
            var radDist = distAbs * Math.PI / 180;
            var jx = pivot.x + side * Math.sin(radProx) * proxLen;
            var jy = pivot.y - Math.cos(radProx) * proxLen;
            var tx = jx + side * Math.sin(radDist) * distLen;
            var ty = jy - Math.cos(radDist) * distLen;
            var ddx = tx - jx, ddy = ty - jy;
            var L = Math.sqrt(ddx * ddx + ddy * ddy);
            var ux = ddx / L, uy = ddy / L;
            var n1x = -uy, n1y = ux;
            var midX = (jx + tx) / 2;
            var innerNx, innerNy;
            if (n1x * (cx - midX) > 0) { innerNx = n1x; innerNy = n1y; }
            else { innerNx = -n1x; innerNy = -n1y; }
            return { jx: jx, jy: jy, tx: tx, ty: ty,
                     innerNx: innerNx, innerNy: innerNy,
                     ux: ux, uy: uy, L: L };
        }

        function drawFinger(pivot, geom) {
            segment(pivot, { x: geom.jx, y: geom.jy }, 13, 10, bodyFill);
            segment({ x: geom.jx, y: geom.jy }, { x: geom.tx, y: geom.ty }, 10, 6.5, bodyFill);
            gripPad({ x: geom.jx, y: geom.jy }, { x: geom.tx, y: geom.ty }, geom.innerNx, geom.innerNy);
            joint({ x: geom.jx, y: geom.jy }, 4.2);
            gHand.append('circle')
                .attr('cx', geom.tx).attr('cy', geom.ty).attr('r', 4.5)
                .attr('fill', bodyFill)
                .attr('stroke', 'var(--text)').attr('stroke-width', 1.2);
        }

        var leftG = fingerGeom(pivotL, -1);
        var rightG = fingerGeom(pivotR, 1);

        // ─── Ball (always visible, deforms when compressed) ──────────
        // Fixed natural radius and resting position centred between the
        // pivots. The ball deforms only when an inner pad surface comes
        // closer to the ball centre than R; otherwise it is a perfect
        // circle. Compression preserves volume of a 3D sphere squashed
        // into an oblate spheroid (equal minor axes), so b = R·√(R/a).
        var R_ball = 50;
        var ball_y = 100;
        var pad_off = 8.5;     // inner pad surface offset from segment line

        function ballToInnerPadDist(g) {
            var t0 = 0.18, t1 = 0.92;
            var p0x = g.jx + g.ux * t0 * g.L + g.innerNx * pad_off;
            var p0y = g.jy + g.uy * t0 * g.L + g.innerNy * pad_off;
            var p1x = g.jx + g.ux * t1 * g.L + g.innerNx * pad_off;
            var p1y = g.jy + g.uy * t1 * g.L + g.innerNy * pad_off;
            var sx = p1x - p0x, sy = p1y - p0y;
            var slen2 = sx * sx + sy * sy;
            var tt = ((cx - p0x) * sx + (ball_y - p0y) * sy) / slen2;
            tt = Math.max(0, Math.min(1, tt));
            var qx = p0x + tt * sx, qy = p0y + tt * sy;
            return Math.sqrt((cx - qx) * (cx - qx) + (ball_y - qy) * (ball_y - qy));
        }

        var dPad = Math.min(ballToInnerPadDist(leftG), ballToInnerPadDist(rightG));
        var aBall = Math.min(R_ball, dPad);
        var bBall = aBall < R_ball ? R_ball * Math.sqrt(R_ball / aBall) : R_ball;

        // Ball body
        gHand.append('ellipse')
            .attr('cx', cx).attr('cy', ball_y)
            .attr('rx', aBall).attr('ry', bBall)
            .attr('fill', 'color-mix(in srgb, var(--c-thresh) 24%, var(--bg-2))')
            .attr('stroke', 'var(--c-thresh)')
            .attr('stroke-width', 1.6);
        // Specular highlight (also follows the deformation)
        gHand.append('ellipse')
            .attr('cx', cx - aBall * 0.35).attr('cy', ball_y - bBall * 0.4)
            .attr('rx', aBall * 0.32).attr('ry', bBall * 0.16)
            .attr('fill', 'var(--bg-1)')
            .attr('opacity', 0.5);
        // Subtle shadow at the bottom
        gHand.append('ellipse')
            .attr('cx', cx).attr('cy', ball_y + bBall * 0.55)
            .attr('rx', aBall * 0.55).attr('ry', bBall * 0.10)
            .attr('fill', 'var(--c-thresh)')
            .attr('opacity', 0.18);

        // Fingers drawn on top of the ball so contact looks clean.
        drawFinger(pivotL, leftG);
        drawFinger(pivotR, rightG);

        // Base knuckle pivots last
        joint(pivotL, 5);
        joint(pivotR, 5);

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

        // Bayesian filter: pick the random-walk process variance q so the
        // steady-state Kalman gain on log σ² matches the 1st-order LPF gain
        // at the same fc. For random walk + Gaussian observation, K∞ ≈ √(q/R)
        // when q ≪ R, so q = R·α² with α = ts/(τ+ts), τ = 1/(2π fc).
        var fcKal = Math.max(0.05, fc);
        var sk_alpha = ts / (1 / (2 * Math.PI * fcKal) + ts);
        var sk_Q = SK_R * sk_alpha * sk_alpha;

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

            // Sanger Bayesian filter: 1-D Kalman on bias-corrected log(x²).
            skP = skP + sk_Q;
            var sk_z = Math.log(s * s + SK_EPS) - SK_MEAN;
            var sk_K = skP / (skP + SK_R);
            skS = skS + sk_K * (sk_z - skS);
            skP = (1 - sk_K) * skP;
            // MAV-scale output: E[|x|] = σ · √(2/π) = √(exp(skS) · 2/π).
            var sangerOut = Math.sqrt(Math.exp(skS) * 2 / Math.PI);

            var out = mode === 'lpf' ? lpfState
                    : mode === 'mavg' ? maOut
                    : sangerOut;

            emgBuf[head] = s;
            mavBuf[head] = out;
            head = (head + 1) % BUF;
        }

        // Latest output of the active filter
        var mav = mode === 'lpf' ? lpfState
                : mode === 'mavg' ? (msFilled > 0 ? msSum / Math.min(msWindow, msFilled) : 0)
                : Math.sqrt(Math.exp(skS) * 2 / Math.PI);

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
                 : Math.sqrt(Math.exp(skS) * 2 / Math.PI);
        if (m === 'lpf') lpfState = seed;
        else if (m === 'kalman') {
            // Seed log(σ²) from the MAV-scale value: σ = seed·√(π/2).
            var sigma2 = Math.max(SK_EPS, seed * seed * Math.PI / 2);
            skS = Math.log(sigma2);
            skP = 1.0;
        }
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
