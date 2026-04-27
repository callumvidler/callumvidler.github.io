// Section 02 · Ideal cascade of N first-order LPF stages.
// Plots the composite response and (optionally) the individual stage curves.
(function () {
    var T = window.T;
    var sel = '#plot-bode-cascade';
    var slider = document.getElementById('nstage-slider');
    var valLabel = document.getElementById('nstage-val');
    var togglePill = document.getElementById('show-stages');

    var state = { N: 3, showStages: true, wc: 10 };

    function render() {
        var N = state.N;
        var H = window.BodeHelpers.setupBode({
            sel: sel,
            xDomain: [0.1, 1000],
            magDomain: [-120, 6],
            phaseDomain: [-540, 10],
            magTicks: [-120, -100, -80, -60, -40, -20, -3, 0],
            phaseTicks: [-540, -450, -360, -270, -180, -90, 0]
        });

        var x = H.x, yMag = H.yMag, yPhase = H.yPhase;
        var wc = state.wc;
        var wMin = 0.1, wMax = 1000;
        var nSamples = 480;

        // Compose magnitude+phase samples.
        var pts = [];
        var stagePts = [];
        for (var k = 0; k < N; k++) stagePts.push([]);

        for (var i = 0; i <= nSamples; i++) {
            var t = i / nSamples;
            var w = wMin * Math.pow(wMax / wMin, t);
            var u = w / wc;
            var stageMag = 1 / Math.sqrt(1 + u * u);
            var stagePhase = -Math.atan(u) * 180 / Math.PI;
            var compMag = Math.pow(stageMag, N);
            var compPhase = stagePhase * N;
            pts.push({ w: w, magDb: 20 * Math.log10(compMag), phase: compPhase });
            for (var k2 = 0; k2 < N; k2++) {
                stagePts[k2].push({ w: w, magDb: 20 * Math.log10(Math.pow(stageMag, k2 + 1)), phase: stagePhase * (k2 + 1) });
            }
        }

        var magMin = yMag.domain()[0];
        var clip = function (d) { return Math.max(d, magMin); };
        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(clip(d.magDb)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        // Individual stage traces (faint), one for each k from 1 to N-1.
        if (state.showStages) {
            for (var s = 0; s < N - 1; s++) {
                H.gMag.append('path').datum(stagePts[s])
                    .attr('class', 'trace stage').attr('d', lineMag);
                H.gPhase.append('path').datum(stagePts[s])
                    .attr('class', 'trace stage').attr('d', linePhase);
            }
        }

        // Composite trace (the N-th cascade).
        H.gMag.append('path').datum(pts).attr('class', 'trace ideal').attr('d', lineMag);
        H.gPhase.append('path').datum(pts).attr('class', 'trace ideal').attr('d', linePhase);

        // ── Composite −3 dB marker ─────────────────────────────
        var w3 = wc * Math.sqrt(Math.pow(2, 1 / N) - 1);
        var xc = x(wc);
        var x3 = x(w3);

        // single-stage cutoff (green dashed verticals)
        H.gMag.append('line').attr('class', 'cutoff-single')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', H.innerH);
        H.gPhase.append('line').attr('class', 'cutoff-single')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', H.innerH);

        // composite -3 dB marker (line on both panels, dot on magnitude only)
        H.gMag.append('line').attr('class', 'marker-line')
            .attr('x1', x3).attr('x2', x3)
            .attr('y1', 0).attr('y2', H.innerH);
        H.gPhase.append('line').attr('class', 'marker-line')
            .attr('x1', x3).attr('x2', x3)
            .attr('y1', 0).attr('y2', H.innerH);
        H.gMag.append('circle').attr('class', 'marker-dot')
            .attr('cx', x3).attr('cy', yMag(-3)).attr('r', 5);

        // Composite cutoff pill centred on the cutoff line. Generous
        // foreignObject; the inner pill auto-sizes to its no-wrap content.
        var pillCx = Math.max(60,
            Math.min(H.innerW - 60, x3));
        window.renderKatex(H.gMag, '\\text{composite}\\ -3\\,\\mathrm{dB}',
            pillCx, 14,
            { width: 200, height: 22, size: 9, pill: true, pillPad: '1px 6px' });

        // single-stage label rendered as a KaTeX pill at the bottom of the phase panel
        window.renderKatex(H.gPhase, '\\text{single-stage}\\ \\omega_c',
            xc, H.innerH - 16,
            { width: 130, height: 22, size: 12, pill: true });

        // ── Legend (top-right inside magnitude panel) ──────────
        var legendData = [
            { c: 'ideal', label: 'composite |H_N|' }
        ];
        if (state.showStages && N > 1) legendData.push({ c: 'stage', label: 'k = 1 … N−1' });

        // Hover only on the composite curve to avoid clutter.
        window.BodeHelpers.attachHover(H, [
            { name: 'composite', cssClass: 'ideal', pts: pts }
        ]);

        var lg = H.gMag.append('g').attr('transform', 'translate(' + (H.innerW - 12) + ',12)');
        legendData.forEach(function (e, idx) {
            var row = lg.append('g').attr('transform', 'translate(0,' + (idx * 18) + ')');
            row.append('line')
                .attr('x1', -36).attr('x2', -8)
                .attr('y1', 8).attr('y2', 8)
                .attr('class', 'trace ' + e.c)
                .attr('stroke-dasharray', e.c === 'stage' ? null : null);
            row.append('text')
                .attr('x', -42).attr('y', 11)
                .attr('text-anchor', 'end')
                .attr('fill', T.text)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(e.label);
        });
    }

    function onSlider() {
        state.N = parseInt(slider.value, 10);
        if (valLabel) valLabel.textContent = String(state.N);
        render();
    }

    function init() {
        if (slider) {
            slider.addEventListener('input', onSlider);
        }
        if (togglePill) {
            togglePill.addEventListener('click', function () {
                state.showStages = !state.showStages;
                togglePill.classList.toggle('active', state.showStages);
                render();
            });
        }
        if (slider) onSlider(); else render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
