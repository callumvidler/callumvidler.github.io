// Section 05 · Elliptic (Cauer): equiripple in both bands.
(function () {
    var splaneSel = '#ellip-splane';
    var bodeSel = '#ellip-bode';
    var sliderN = document.getElementById('ellip-N');
    var valN = document.getElementById('ellip-N-val');
    var view3dButton = document.getElementById('ellip-view-3d');

    var state = { N: 4, view3d: false, probe: { omega: 0, mode: 'off' } };
    var probeCtrl = null;
    var lastSP = null, lastBD = null, lastFilter = null;

    function colors() {
        return {
            pole:  window.AFPlots.getCssVar('--c-ellip'),
            zero:  window.AFPlots.getCssVar('--c-ellip'),
            butter: window.AFPlots.getCssVar('--c-butter')
        };
    }

    function renderSPlane() {
        var T = window.T;
        var col = colors();
        var N = state.N;

        // Square window. Pole pairs sit close to the unit circle; the
        // lowest zero is at about jω = 1.7 to 2.9 depending on N; higher
        // zeros (when N ≥ 4) can sit above ω = 3.5 and are flagged with
        // a small arrow outside the visible window.
        var SP = window.AFPlots.setupSPlane({
            sel: splaneSel,
            xDomain: [-3.0, 3.0],
            yDomain: [-3.0, 3.0]
        });
        lastSP = SP;

        // Reference unit circle (Butterworth)
        SP.g.append('circle')
            .attr('cx', SP.x(0)).attr('cy', SP.y(0))
            .attr('r', SP.x(1) - SP.x(0))
            .attr('fill', 'none')
            .attr('stroke', col.butter)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 5')
            .attr('opacity', 0.35);

        // Reference Chebyshev I ellipse for the same N and ripple
        var epsRef = 0.349;
        var muRef = Math.asinh(1 / epsRef) / N;
        var shRef = Math.sinh(muRef);
        var chRef = Math.cosh(muRef);
        var ellipsePts = [];
        var nSamples = 240;
        for (var i = 0; i <= nSamples; i++) {
            var t = (i / nSamples) * 2 * Math.PI;
            ellipsePts.push([SP.x(shRef * Math.cos(t)), SP.y(chRef * Math.sin(t))]);
        }
        SP.g.append('path')
            .attr('fill', 'none')
            .attr('stroke', window.AFPlots.getCssVar('--c-cheb1'))
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 4')
            .attr('opacity', 0.45)
            .attr('d', d3.line()(ellipsePts));

        var filt = window.FilterMath.elliptic(N);
        lastFilter = filt;
        window.AFPlots.drawMagnitudeUnityContour(SP, filt, window.AFPlots.getCssVar('--c-mark'));
        // Off-window zeros are listed once per |im| magnitude, with a
        // short label at the top edge of the plot just to the right of
        // the imaginary axis. The list is built up first, then rendered
        // as a single line below the others.
        var offWindowKeys = [];
        var seen = {};
        filt.zeros.forEach(function (z) {
            if (z.im < SP.y.domain()[0] || z.im > SP.y.domain()[1]) {
                var key = Math.abs(z.im).toFixed(2);
                if (!seen[key]) { seen[key] = true; offWindowKeys.push(key); }
                return;
            }
            window.AFPlots.drawZero(SP.g, SP.x(z.re), SP.y(z.im), col.zero, 7);
        });
        offWindowKeys.forEach(function (key, idx) {
            SP.g.append('text')
                .attr('x', SP.x(0) + 10).attr('y', 16 + idx * 14)
                .attr('fill', col.zero)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10)
                .attr('text-anchor', 'start')
                .text('zeros ±j' + key + ' (off plot)');
        });
        filt.poles.forEach(function (p) {
            window.AFPlots.drawPole(SP.g, SP.x(p.re), SP.y(p.im), col.pole, 7);
        });

        var entries = [
            { color: col.pole, label: 'elliptic poles (N = ' + N + ')' },
            { color: col.zero, label: 'imaginary-axis zeros' },
            { color: window.AFPlots.getCssVar('--c-cheb1'), label: 'cheb-I ellipse (ref.)' },
            { color: window.AFPlots.getCssVar('--c-mark'), label: '|H(s)| = 1 contour' }
        ];
        window.AFPlots.drawLegend(SP.g,
            SP.innerW - 8,
            SP.innerH - 8 - 18 * (entries.length - 1) - 12,
            entries, T);
    }

    function renderBode() {
        var T = window.T;
        var col = colors();
        var BD = window.AFPlots.setupBodePair({
            sel: bodeSel,
            xDomain: [0.05, 20],
            magDomain: [-80, 6],
            phaseDomain: phaseDomainFor(state.N),
            magTicks: [-80, -60, -40, -20, -3, 0],
            phaseTicks: phaseTicksFor(state.N)
        });

        var filt = window.FilterMath.elliptic(state.N);
        var pts = window.FilterMath.sampleResponse(filt, 0.05, 20, 2000);
        window.AFPlots.drawTrace(BD, pts, 'ellip');
        lastBD = BD;

        // Passband edge marker at ω = 1
        var xc = BD.x(1);
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        BD.gPhase.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        window.renderKatex(BD.gMag, '\\omega_p = 1',
            xc, BD.innerH - 16,
            { width: 80, height: 22, size: 11, pill: true });
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
        if (probeCtrl && lastSP && lastBD && lastFilter) {
            probeCtrl.attach({
                sp: lastSP, bd: lastBD, filter: lastFilter,
                color: colors().pole,
                wMin: 0, wMax: 3.0
            });
        }
        render3D();
    }

    function render3D() {
        if (view3dButton) view3dButton.classList.toggle('active', state.view3d);
        if (!window.AFD3SPlane || !lastFilter) return;
        window.AFD3SPlane.setEnabled({
            svgSelector: splaneSel,
            enabled: state.view3d,
            filter: lastFilter,
            color: colors().pole,
            contourColor: window.AFPlots.getCssVar('--c-mark'),
            xDomain: [-3.0, 3.0],
            yDomain: [-3.0, 3.0],
            probeOmega: state.probe.omega,
            probeActive: state.probe.mode !== 'off',
            probeMode: state.probe.mode
        });
    }

    function onSlider() {
        state.N = parseInt(sliderN.value, 10);
        if (valN) valN.textContent = String(state.N);
        render();
    }

    function init() {
        probeCtrl = window.JwProbe.init({
            slider:      document.getElementById('ellip-probe'),
            valLabel:    document.getElementById('ellip-probe-val'),
            modeButtons: {
                mag:   document.getElementById('ellip-probe-mag'),
                angle: document.getElementById('ellip-probe-angle')
            },
            state: state.probe,
            onChange: render3D
        });
        if (sliderN) sliderN.addEventListener('input', onSlider);
        if (view3dButton) {
            view3dButton.addEventListener('click', function () {
                state.view3d = !state.view3d;
                render();
            });
        }
        if (sliderN) onSlider(); else render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
        window.addEventListener('af-d3-ready', render3D);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
