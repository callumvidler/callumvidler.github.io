// scene_problem.js  ·  Slide 1
// Live EEG read-out with coloured phase bands behind the trace, optional
// raw / filtered toggle, draggable LPF cutoff and ground-truth peak
// annotations. The window is sized to show one full cycle of the simulated
// recording (normal → pre → seizure → recovery).
(function () {
    var SVG = '#plot-eeg-trace';
    var WINDOW = 28;            // seconds shown
    var Y_DOMAIN = [-3.4, 3.4];

    var svg = d3.select(SVG).classed('ov', true);
    var W = 800, H = 320;
    var margin = { top: 48, right: 28, bottom: 42, left: 56 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gBands = gRoot.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gAnno = gRoot.append('g');
    var gTrace = gRoot.append('g');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gPhaseLab = gRoot.append('g');

    var ui = {
        anno: document.getElementById('eeg-anno'),
        count: document.getElementById('eeg-count'),
        amp: document.getElementById('eeg-amp'),
        trend: document.getElementById('eeg-trend'),
        nowPhase: document.getElementById('eeg-now-phase')
    };

    var local = {
        showRaw: true,
        showAnno: true
    };

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(420, rect.width);
        H = Math.max(240, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        x = d3.scaleLinear().domain([-WINDOW, 0]).range([0, iw]);
        y = d3.scaleLinear().domain(Y_DOMAIN).range([ih, 0]);
    }

    function drawStatic() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        [-2, 0, 2].forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });
        var yAxis = d3.axisLeft(y).tickValues([-3, -2, -1, 0, 1, 2, 3]).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();

        var xt = [];
        for (var k = -WINDOW; k <= 0; k += Math.round(WINDOW / 7)) xt.push(k);
        var xAxis = d3.axisBottom(x).tickValues(xt)
            .tickFormat(function (d) { return d + 's'; }).tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(xAxis).select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 32)
            .attr('text-anchor', 'middle')
            .text('time relative to now, s');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-42) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude, mV');
    }

    function drawPhaseBands(nowT) {
        gBands.selectAll('*').remove();
        gPhaseLab.selectAll('*').remove();
        var bands = EEG.phaseBands(WINDOW);
        for (var i = 0; i < bands.length; i++) {
            var b = bands[i];
            var x0 = x(b.t0 - nowT);
            var x1 = x(b.t1 - nowT);
            if (x1 <= x0) continue;
            gBands.append('rect')
                .attr('class', 'phase-band ' + b.id)
                .attr('x', x0).attr('y', 0)
                .attr('width', x1 - x0).attr('height', ih);
            // Label only if the band is wide enough to fit the text.
            if (x1 - x0 > 50) {
                gPhaseLab.append('text')
                    .attr('class', 'phase-label')
                    .attr('x', (x0 + x1) / 2)
                    .attr('y', 14)
                    .attr('text-anchor', 'middle')
                    .text(b.id === 'pre' ? 'pre-state'
                        : b.id === 'seizure' ? 'seizure'
                            : b.id === 'recovery' ? 'recovery'
                                : 'normal');
            }
        }
    }

    function classifyTrend(spikes) {
        if (spikes.length < 3) return '—';
        var n = spikes.length;
        var xm = 0, ym = 0;
        for (var i = 0; i < n; i++) { xm += spikes[i].t; ym += spikes[i].amp; }
        xm /= n; ym /= n;
        var num = 0, den = 0;
        for (var j = 0; j < n; j++) {
            num += (spikes[j].t - xm) * (spikes[j].amp - ym);
            den += (spikes[j].t - xm) * (spikes[j].t - xm);
        }
        if (den < 1e-6) return '—';
        var slope = num / den;
        if (slope > 0.05) return 'rising';
        if (slope < -0.05) return 'falling';
        return 'flat';
    }

    function drawFrame() {
        var data = EEG.recent(WINDOW);
        if (data.length === 0) return;
        var nowT = data[data.length - 1].t;

        drawPhaseBands(nowT);

        var line = d3.line()
            .x(function (d) { return x(d.t - nowT); })
            .y(function (d) {
                var v = local.showRaw ? d.raw : d.filt;
                return y(Math.max(Y_DOMAIN[0], Math.min(Y_DOMAIN[1], v)));
            });

        gTrace.selectAll('*').remove();
        gTrace.append('path').datum(data)
            .attr('class', 'trace input')
            .attr('stroke-width', local.showRaw ? 0.9 : 1.3)
            .attr('opacity', local.showRaw ? 0.85 : 1)
            .attr('d', line);

        // Annotations: ground-truth pre-state spikes inside the visible window.
        gAnno.selectAll('*').remove();
        if (local.showAnno) {
            var sp = EEG.spikesRecent(WINDOW);
            for (var i = 0; i < sp.length; i++) {
                var rel = sp[i].t - nowT;
                if (rel < -WINDOW || rel > 0) continue;
                var px = x(rel);
                var py = y(sp[i].amp);
                gAnno.append('line')
                    .attr('x1', px).attr('x2', px)
                    .attr('y1', py - 6).attr('y2', py - 18)
                    .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1.1);
                gAnno.append('circle')
                    .attr('cx', px).attr('cy', py)
                    .attr('r', 3.0)
                    .attr('class', 'peak-anno');
                gAnno.append('text')
                    .attr('x', px).attr('y', py - 22)
                    .attr('text-anchor', 'middle')
                    .attr('class', 'peak-anno-label')
                    .text(sp[i].amp.toFixed(2));
            }
        }

        var allSpikes = EEG.spikesRecent(WINDOW);
        ui.count.textContent = allSpikes.length;
        if (allSpikes.length) {
            var last = allSpikes[allSpikes.length - 1];
            ui.amp.textContent = last.amp.toFixed(2) + ' mV';
        } else {
            ui.amp.textContent = '— mV';
        }
        var trendLabel = classifyTrend(allSpikes);
        ui.trend.textContent = trendLabel;
        ui.trend.classList.toggle('on', trendLabel === 'rising');
        ui.trend.classList.toggle('warn', trendLabel === 'falling');

        // Current phase pill
        var ph = EEG.phaseAt(nowT);
        var label = ph.id === 'pre' ? 'pre-state' : ph.id;
        ui.nowPhase.textContent = 'phase: ' + label;
    }

    function init() {
        layout();
        drawStatic();
        ui.anno.addEventListener('click', function () {
            local.showAnno = !local.showAnno;
            ui.anno.classList.toggle('active', local.showAnno);
        });
        // Other slides still rely on the band-limited trace; keep a sensible
        // default cutoff so those scenes show clean spikes.
        EEG.setCutoff(5);

        EEG.onTick(drawFrame);
        window.addEventListener('themechange', function () { drawStatic(); drawFrame(); });
        window.addEventListener('resize', function () { layout(); drawStatic(); drawFrame(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
