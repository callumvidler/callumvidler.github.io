// Scene 04 · Successive-approximation ADC.
// Visualises the binary search a SAR ADC performs to convert one held input.
// The y-axis is voltage normalised by V_ref; the x-axis is the step index from
// the most-significant trial (k = 0) to the least-significant trial (k = N).
// A red horizontal line marks the input. The thick output trace is the value
// the DAC settles on after each decision; the open marker at each step is the
// tentative trial value that was offered to the comparator at that cycle.
(function () {
    var N = 8;
    var vinI = document.getElementById('sar-vin');
    var vinL = document.getElementById('sar-vin-val');
    var stepI = document.getElementById('sar-step');
    var stepL = document.getElementById('sar-step-val');
    var playBtn = document.getElementById('sar-play');
    var resetBtn = document.getElementById('sar-reset');
    var bitsRow = document.getElementById('sar-bits');
    var rdVin = document.getElementById('sar-rd-vin');
    var rdVdac = document.getElementById('sar-rd-vdac');
    var rdCode = document.getElementById('sar-rd-code');
    var rdDec = document.getElementById('sar-rd-dec');

    var state = { vin: 0.671, step: 8, animating: false };

    function runSearch(vin) {
        // Returns the per-step trace including trial and resolved values.
        // Each entry: { k, trial, resolved, bit }
        var levels = Math.pow(2, N);
        var code = 0;
        var trace = [];
        for (var k = 0; k < N; k++) {
            var bitMask = 1 << (N - 1 - k);                // MSB first
            var trialCode = code | bitMask;
            var trialV = trialCode / levels;
            var keep = vin >= trialV;
            if (keep) code = trialCode;
            var resolvedV = code / levels;
            trace.push({ k: k, trial: trialV, resolved: resolvedV, bit: keep ? 1 : 0 });
        }
        return { trace: trace, finalCode: code, finalV: code / levels };
    }

    var svg = d3.select('#plot-sar-trace').classed('ov', true);

    function makeFrame() {
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(440, rect.width);
        var H = Math.max(280, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 22, right: 90, bottom: 40, left: 60 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function draw() {
        var f = makeFrame();
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([-0.4, N + 0.2]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-0.04, 1.04]).range([f.ih, 0]);

        // Grid lines at quarter points
        var grid = f.g.append('g').attr('class', 'grid');
        [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        var search = runSearch(state.vin);
        var trace = search.trace;

        // V_in line (drawn first so traces sit above it)
        f.g.append('line')
            .attr('x1', 0).attr('x2', f.iw)
            .attr('y1', y(state.vin)).attr('y2', y(state.vin))
            .attr('stroke', 'var(--c-thresh)')
            .attr('stroke-width', 1.8)
            .attr('stroke-dasharray', '5 4');
        f.g.append('text')
            .attr('x', f.iw + 6).attr('y', y(state.vin) + 4)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .attr('font-weight', 600)
            .attr('fill', 'var(--c-thresh)')
            .text('V_in');

        // Above / below legend near top-right
        f.g.append('text')
            .attr('x', f.iw + 6).attr('y', 12)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10)
            .attr('font-weight', 600)
            .attr('fill', 'var(--c-thresh)')
            .text('▲ above');
        f.g.append('text')
            .attr('x', f.iw + 6).attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10)
            .attr('font-weight', 600)
            .attr('fill', 'var(--c-output2)')
            .text('▼ below');

        // Build the resolved staircase up to step state.step.
        var s = state.step;
        var resolvedPts = [[0, 0]];
        for (var i = 0; i < s; i++) {
            resolvedPts.push([i, trace[i].resolved]);
            resolvedPts.push([i + 1, trace[i].resolved]);
        }
        // Tail to last step if fully resolved.
        if (s === N) {
            // Already covered.
        }

        f.g.append('path')
            .datum(resolvedPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output2)')
            .attr('stroke-width', 2.4)
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); })
                .curve(d3.curveStepAfter));

        // Mark each step's trial and the resulting bit decision.
        for (var i = 0; i < s; i++) {
            var t = trace[i];
            var above = t.trial > state.vin;
            var compColor = above ? 'var(--c-thresh)' : 'var(--c-output2)';
            var xMid = x(i + 0.5);

            // Comparison gap: shaded bar between V_in and V_trial
            var gapTop = Math.min(y(state.vin), y(t.trial));
            var gapH = Math.abs(y(state.vin) - y(t.trial));
            if (gapH > 0.5) {
                f.g.append('rect')
                    .attr('x', xMid - 13).attr('y', gapTop)
                    .attr('width', 6).attr('height', gapH)
                    .attr('rx', 2)
                    .attr('fill', compColor)
                    .attr('opacity', 0.30);
            }

            // Vertical drop line from trial to resolved
            f.g.append('line')
                .attr('x1', xMid).attr('x2', xMid)
                .attr('y1', y(t.trial)).attr('y2', y(t.resolved))
                .attr('stroke', compColor)
                .attr('stroke-width', 1.4)
                .attr('stroke-dasharray', t.bit ? null : '3 3')
                .attr('opacity', 0.8);

            // Trial marker, color-coded above (red) / below (green) V_in
            f.g.append('circle')
                .attr('cx', xMid).attr('cy', y(t.trial))
                .attr('r', 5)
                .attr('fill', compColor)
                .attr('stroke', compColor)
                .attr('stroke-width', 1.6);

            // Direction glyph next to marker
            f.g.append('text')
                .attr('x', xMid + 9).attr('y', y(t.trial) + 4)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 12)
                .attr('font-weight', 700)
                .attr('fill', compColor)
                .text(above ? '▲' : '▼');

            // V_trial value label inside the strip (small, above the marker)
            var vLabelY = above ? y(t.trial) - 9 : y(t.trial) + 18;
            f.g.append('text')
                .attr('x', xMid - 8).attr('y', vLabelY)
                .attr('text-anchor', 'end')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 9.5)
                .attr('fill', compColor)
                .text(t.trial.toFixed(3));

            // Decision label above each step (matches above/below colour)
            f.g.append('text')
                .attr('x', xMid).attr('y', y(1) - 6)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 12)
                .attr('font-weight', 700)
                .attr('fill', compColor)
                .text(t.bit ? '1' : '0');
        }

        // Active step indicator (vertical band)
        if (s < N) {
            f.g.append('rect')
                .attr('x', x(s)).attr('y', 0)
                .attr('width', x(s + 1) - x(s))
                .attr('height', f.ih)
                .attr('fill', 'var(--accent)')
                .attr('opacity', 0.07);
        }

        // Axes
        var xt = [];
        for (var i = 0; i <= N; i++) xt.push(i);
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).tickValues(xt).tickFormat(function (d) {
                if (d === 0) return 'start';
                return 'b' + (N - d);  // bit index labelled MSB-first
            }).tickSize(0).tickPadding(8));
        ax.select('.domain').remove();

        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([0, 0.25, 0.5, 0.75, 1])
                .tickFormat(function (d) { return d.toFixed(2); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle')
            .text('clock cycle (bit being tested)');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-46) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('V_DAC / V_ref');
    }

    function buildBits() {
        bitsRow.innerHTML = '';
        var search = runSearch(state.vin);
        for (var k = 0; k < N; k++) {
            var div = document.createElement('div');
            div.className = 'bit';
            if (k < state.step) {
                div.classList.add(search.trace[k].bit ? 'set' : 'unset');
            }
            if (k === state.step) div.classList.add('active');
            div.innerHTML = '<span class="hd">b' + (N - 1 - k) + '</span>'
                + '<span class="vl">' + (k < state.step ? search.trace[k].bit : '·') + '</span>';
            bitsRow.appendChild(div);
        }
    }

    function updateReadout() {
        var search = runSearch(state.vin);
        var s = state.step;
        var vdac = (s === 0) ? 0 : search.trace[s - 1].resolved;
        var code = 0;
        for (var k = 0; k < s; k++) if (search.trace[k].bit) code |= (1 << (N - 1 - k));
        var pad = '';
        for (var k = 0; k < N; k++) {
            if (k < s) pad += search.trace[k].bit;
            else pad += '·';
        }
        rdVin.textContent = state.vin.toFixed(3) + ' V_ref';
        rdVdac.textContent = vdac.toFixed(3) + ' V_ref';
        rdCode.textContent = pad;
        rdDec.textContent = (s === N) ? code + ' / ' + Math.pow(2, N) : '—';
    }

    function refresh() {
        draw();
        buildBits();
        updateReadout();
    }

    function setStep(s) {
        state.step = Math.max(0, Math.min(N, s));
        stepI.value = state.step;
        stepL.textContent = state.step + ' / ' + N;
        refresh();
    }

    var animTimer = null;
    function play() {
        if (state.animating) return;
        state.animating = true;
        playBtn.classList.add('active');
        playBtn.textContent = 'playing';
        if (state.step >= N) setStep(0);
        animTimer = setInterval(function () {
            if (state.step >= N) {
                stop();
                return;
            }
            setStep(state.step + 1);
        }, 520);
    }
    function stop() {
        state.animating = false;
        playBtn.classList.remove('active');
        playBtn.textContent = 'play';
        if (animTimer) { clearInterval(animTimer); animTimer = null; }
    }

    function init() {
        vinI.addEventListener('input', function () {
            state.vin = parseFloat(vinI.value);
            vinL.textContent = state.vin.toFixed(3) + ' V_ref';
            refresh();
        });
        stepI.addEventListener('input', function () {
            stop();
            setStep(parseInt(stepI.value));
        });
        playBtn.addEventListener('click', function () {
            if (state.animating) stop(); else play();
        });
        resetBtn.addEventListener('click', function () {
            stop();
            setStep(0);
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
