// Scene 06 · Noise immunity through digitisation.
// Two parallel chains take the same clean square wave through three stages
// that each add Gaussian noise of standard deviation σ.
// Top plot: fully analog. The noise on the wire accumulates and the trace
// drifts further from the clean reference at each successive stage.
// Bottom plot: digitised after stage one. Each subsequent stage threshold-
// regenerates the bit pattern; the only failure mode is a noise burst large
// enough to push the wire across the digital threshold, which counts as a
// decision error.
(function () {
    var sigI = document.getElementById('nse-sigma');
    var sigL = document.getElementById('nse-sigma-val');
    var thrI = document.getElementById('nse-thr');
    var thrL = document.getElementById('nse-thr-val');
    var rdSnr = document.getElementById('nse-asnr');
    var rdErr = document.getElementById('nse-derr');

    var state = { sigma: 0.06, thr: 0.45 };
    var T_VIEW = 1.0;
    var N = 600;

    var aSvg = d3.select('#plot-nse-analog').classed('ov', true);
    var dSvg = d3.select('#plot-nse-digital').classed('ov', true);

    // Reproducible Gaussian noise per draw call.
    function rng(seed) {
        var s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function gauss(rand) {
        var u = rand(), v = rand();
        if (u < 1e-9) u = 1e-9;
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function clean(t) {
        // Square-wave-like pulse train with finite rise time.
        var f = 4;     // 4 Hz base
        var phase = (t * f) % 1;
        var shape;
        if (phase < 0.45) shape = 1;
        else if (phase < 0.50) shape = 1 - (phase - 0.45) / 0.05;
        else if (phase < 0.95) shape = 0;
        else shape = (phase - 0.95) / 0.05;
        return shape;
    }

    function makeFrame(svg) {
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(440, rect.width);
        var H = Math.max(220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 22, right: 28, bottom: 38, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih };
    }

    function drawAnalog() {
        var f = makeFrame(aSvg);
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-0.6, 1.6]).range([f.ih, 0]);

        var grid = f.g.append('g').attr('class', 'grid');
        [0, 0.5, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Build three stage traces. Each stage adds independent Gaussian noise
        // on top of the *previous stage's* signal (so noise compounds).
        var prev = [];
        for (var k = 0; k < N; k++) {
            var t = (k / (N - 1)) * T_VIEW;
            prev.push([t, clean(t)]);
        }
        var stages = [];
        var seeds = [0xa1, 0xb2, 0xc3];
        for (var s = 0; s < 3; s++) {
            var rand = rng(seeds[s]);
            var pts = [];
            for (var k = 0; k < N; k++) {
                pts.push([prev[k][0], prev[k][1] + state.sigma * gauss(rand)]);
            }
            stages.push(pts);
            prev = pts;
        }

        // Reference clean signal (faint)
        var clr = [];
        for (var k = 0; k < N; k++) {
            var t = (k / (N - 1)) * T_VIEW;
            clr.push([t, clean(t)]);
        }
        f.g.append('path').datum(clr)
            .attr('fill', 'none').attr('stroke', 'var(--c-low)')
            .attr('stroke-width', 1.2).attr('stroke-dasharray', '4 4').attr('opacity', 0.55)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Plot each stage at a vertical offset (same y-domain, but small alpha
        // ramp so the worst stage is most visible). All on a shared axis.
        var palette = ['rgba(88,166,255,0.55)', 'rgba(88,166,255,0.85)', 'var(--c-thresh)'];
        var labels = ['stage 1', 'stage 2', 'stage 3'];
        var widths = [1.2, 1.5, 1.8];
        for (var s = 0; s < 3; s++) {
            f.g.append('path').datum(stages[s])
                .attr('fill', 'none').attr('stroke', palette[s])
                .attr('stroke-width', widths[s])
                .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
        }

        // Legend
        var leg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 200) + ',6)');
        for (var s = 0; s < 3; s++) {
            leg.append('line').attr('x1', s * 65).attr('x2', s * 65 + 18).attr('y1', 6).attr('y2', 6)
                .attr('stroke', palette[s]).attr('stroke-width', 2);
            leg.append('text').attr('x', s * 65 + 22).attr('y', 9).attr('font-size', 10)
                .attr('fill', 'var(--text-dim)').text(labels[s]);
        }

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([0, 0.5, 1])
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text').attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30).attr('text-anchor', 'middle')
            .text('time, seconds');
        f.g.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('voltage, normalised');

        // Compute analog SNR (signal power = 0.5; noise power = 3 σ² for sum of three stages).
        var noisePow = 3 * state.sigma * state.sigma;
        var snr = noisePow > 0 ? 10 * Math.log10(0.5 / noisePow) : 99;
        rdSnr.textContent = snr.toFixed(1) + ' dB';
    }

    function drawDigital() {
        var f = makeFrame(dSvg);
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-0.6, 1.6]).range([f.ih, 0]);

        var grid = f.g.append('g').attr('class', 'grid');
        [0, 0.5, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Threshold line
        f.g.append('line')
            .attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(state.thr)).attr('y2', y(state.thr))
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '5 4');
        f.g.append('text')
            .attr('x', f.iw - 6).attr('y', y(state.thr) - 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--c-thresh)').text('threshold');

        // Generate noisy stage 1 (analog wire), threshold to digital, then
        // re-generate noisy at each subsequent stage (regeneration).
        var rand = rng(0xa1);
        var stage1 = [];
        for (var k = 0; k < N; k++) {
            var t = (k / (N - 1)) * T_VIEW;
            stage1.push([t, clean(t) + state.sigma * gauss(rand)]);
        }
        // Threshold to bits at stage 1
        var bits1 = stage1.map(function (p) { return p[1] >= state.thr ? 1 : 0; });

        // Stage 2: take bits1, drive a clean line + add fresh noise
        var rand2 = rng(0xb2);
        var stage2 = bits1.map(function (b, i) {
            return [stage1[i][0], b + state.sigma * gauss(rand2)];
        });
        var bits2 = stage2.map(function (p) { return p[1] >= state.thr ? 1 : 0; });

        var rand3 = rng(0xc3);
        var stage3 = bits2.map(function (b, i) {
            return [stage1[i][0], b + state.sigma * gauss(rand3)];
        });
        var bits3 = stage3.map(function (p) { return p[1] >= state.thr ? 1 : 0; });

        // Reference (intended bit at clean threshold = 0.5)
        var refBits = [];
        for (var k = 0; k < N; k++) {
            var t = (k / (N - 1)) * T_VIEW;
            refBits.push(clean(t) >= 0.5 ? 1 : 0);
        }

        // Plot the analog wire at stage 3 (after two regenerations)
        f.g.append('path').datum(stage3)
            .attr('fill', 'none').attr('stroke', 'var(--c-input)')
            .attr('stroke-width', 1.2).attr('opacity', 0.7)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Plot the resolved bit pattern at stage 3 as a step
        var bitPath = bits3.map(function (b, i) { return [stage1[i][0], b]; });
        f.g.append('path').datum(bitPath)
            .attr('fill', 'none').attr('stroke', 'var(--c-output2)')
            .attr('stroke-width', 2.2)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })
                .curve(d3.curveStepAfter));

        // Mark errors against the reference
        var errs = 0;
        for (var i = 0; i < bits3.length; i++) {
            if (bits3[i] !== refBits[i]) {
                errs++;
                if (i % 4 === 0) {
                    f.g.append('circle')
                        .attr('cx', x(stage1[i][0])).attr('cy', y(bits3[i] ? 1.18 : -0.18))
                        .attr('r', 2.2).attr('fill', 'var(--c-hot)').attr('opacity', 0.85);
                }
            }
        }

        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([0, 0.5, 1])
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text').attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30).attr('text-anchor', 'middle')
            .text('time, seconds');
        f.g.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('voltage, normalised');

        // Legend
        var leg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 220) + ',6)');
        leg.append('line').attr('x1', 0).attr('x2', 18).attr('y1', 6).attr('y2', 6)
            .attr('stroke', 'var(--c-input)').attr('stroke-width', 2);
        leg.append('text').attr('x', 22).attr('y', 9).attr('font-size', 10)
            .attr('fill', 'var(--text-dim)').text('wire (stage 3)');
        leg.append('line').attr('x1', 110).attr('x2', 128).attr('y1', 6).attr('y2', 6)
            .attr('stroke', 'var(--c-output2)').attr('stroke-width', 2);
        leg.append('text').attr('x', 132).attr('y', 9).attr('font-size', 10)
            .attr('fill', 'var(--text-dim)').text('decoded bit');

        rdErr.textContent = errs;
        rdErr.className = 'v ' + (errs === 0 ? 'on' : (errs > 30 ? 'warn' : 'off'));
    }

    function refresh() {
        drawAnalog();
        drawDigital();
    }

    function init() {
        sigI.addEventListener('input', function () {
            state.sigma = parseFloat(sigI.value);
            sigL.textContent = state.sigma.toFixed(3);
            refresh();
        });
        thrI.addEventListener('input', function () {
            state.thr = parseFloat(thrI.value);
            thrL.textContent = state.thr.toFixed(2);
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
