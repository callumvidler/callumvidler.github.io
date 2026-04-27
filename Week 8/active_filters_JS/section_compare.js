// Section 06 · Side-by-side comparison of all four families.
(function () {
    var splaneSel = '#cmp-splane';
    var bodeSel = '#cmp-bode';
    var sliderN = document.getElementById('cmp-N');
    var valN = document.getElementById('cmp-N-val');

    var state = { N: 4 };

    function colors() {
        return {
            butter: window.AFPlots.getCssVar('--c-butter'),
            cheb1:  window.AFPlots.getCssVar('--c-cheb1'),
            cheb2:  window.AFPlots.getCssVar('--c-cheb2'),
            ellip:  window.AFPlots.getCssVar('--c-ellip')
        };
    }

    function buildFilters(N) {
        var list = [
            { name: 'butterworth',  filt: window.FilterMath.butterworth(N),     css: 'butter' },
            { name: 'chebyshev I',  filt: window.FilterMath.chebyshev1(N, 0.35), css: 'cheb1' },
            { name: 'chebyshev II', filt: window.FilterMath.chebyshev2(N, 0.10), css: 'cheb2' }
        ];
        // Elliptic is tabulated for N ∈ {2,3,4,5}
        if (N >= 2 && N <= 5) {
            list.push({ name: 'elliptic', filt: window.FilterMath.elliptic(N), css: 'ellip' });
        }
        return list;
    }

    function renderSPlane() {
        var T = window.T;
        var col = colors();
        var families = buildFilters(state.N);

        // Square window large enough for the elliptic zeros at the
        // current order, while keeping the reference unit circle visible.
        var SP = window.AFPlots.setupSPlane({
            sel: splaneSel,
            xDomain: [-3.0, 3.0],
            yDomain: [-3.0, 3.0]
        });

        // Faint unit circle (Butterworth reference)
        SP.g.append('circle')
            .attr('cx', SP.x(0)).attr('cy', SP.y(0))
            .attr('r', SP.x(1) - SP.x(0))
            .attr('fill', 'none')
            .attr('stroke', col.butter)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 5')
            .attr('opacity', 0.35);

        var colorMap = { butter: col.butter, cheb1: col.cheb1, cheb2: col.cheb2, ellip: col.ellip };

        families.forEach(function (f) {
            var c = colorMap[f.css];
            window.AFPlots.drawMagnitudeUnityContour(SP, f.filt, c);
            (f.filt.zeros || []).forEach(function (z) {
                if (z.im < SP.y.domain()[0] || z.im > SP.y.domain()[1]) return;
                window.AFPlots.drawZero(SP.g, SP.x(z.re), SP.y(z.im), c, 6);
            });
            f.filt.poles.forEach(function (p) {
                window.AFPlots.drawPole(SP.g, SP.x(p.re), SP.y(p.im), c, 6);
            });
        });

        // Legend in the bottom-right corner.
        var legend = families.map(function (f) {
            return { color: colorMap[f.css], label: f.name };
        });
        window.AFPlots.drawLegend(SP.g,
            SP.innerW - 8,
            SP.innerH - 8 - 18 * (legend.length - 1) - 12,
            legend, T);
    }

    function renderBode() {
        var T = window.T;
        var families = buildFilters(state.N);

        var BD = window.AFPlots.setupBodePair({
            sel: bodeSel,
            xDomain: [0.05, 20],
            magDomain: [-80, 6],
            phaseDomain: phaseDomainFor(state.N),
            magTicks: [-80, -60, -40, -20, -3, 0],
            phaseTicks: phaseTicksFor(state.N)
        });

        families.forEach(function (f) {
            var pts = window.FilterMath.sampleResponse(f.filt, 0.05, 20, 1500);
            window.AFPlots.drawTrace(BD, pts, f.css);
        });

        // Reference markers
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', 0).attr('x2', BD.innerW)
            .attr('y1', BD.yMag(-3)).attr('y2', BD.yMag(-3));
        var xc = BD.x(1);
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        BD.gPhase.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        window.renderKatex(BD.gMag, '\\omega_{\\mathrm{edge}} = 1',
            xc, BD.innerH - 16,
            { width: 120, height: 22, size: 11, pill: true });
    }

    function phaseDomainFor(N) { return [-90 * N - 30, 10]; }
    function phaseTicksFor(N) {
        var ticks = [];
        for (var v = 0; v >= -90 * N; v -= 90) ticks.push(v);
        return ticks;
    }

    function render() {
        renderSPlane();
        renderBode();
    }

    function onSlider() {
        state.N = parseInt(sliderN.value, 10);
        if (valN) valN.textContent = String(state.N);
        render();
    }

    function init() {
        if (sliderN) sliderN.addEventListener('input', onSlider);
        if (sliderN) onSlider(); else render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
