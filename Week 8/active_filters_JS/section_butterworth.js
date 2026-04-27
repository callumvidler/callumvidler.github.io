// Section 02 · Butterworth: poles on a circle.
// Draws the s-plane pole pattern and the corresponding Bode response.
(function () {
    var splaneSel = '#butter-splane';
    var bodeSel = '#butter-bode';
    var slider = document.getElementById('butter-N');
    var valLabel = document.getElementById('butter-N-val');
    var view3dButton = document.getElementById('butter-view-3d');

    var state = { N: 4, view3d: false, probe: { omega: 0, mode: 'off' } };
    var probeCtrl = null;
    var lastSP = null, lastBD = null, lastFilter = null;

    function colors() {
        return {
            butter: window.AFPlots.getCssVar('--c-butter'),
            ref:    window.AFPlots.getCssVar('--c-mark')
        };
    }

    function renderSPlane() {
        var T = window.T;
        var col = colors();
        var N = state.N;
        // Square data window centred on the origin so the unit circle
        // renders as a true circle and the plot fills the canvas.
        var SP = window.AFPlots.setupSPlane({
            sel: splaneSel,
            xDomain: [-1.5, 1.5],
            yDomain: [-1.5, 1.5]
        });
        lastSP = SP;

        // Unit circle: the locus on which all Butterworth poles sit.
        SP.g.append('circle')
            .attr('cx', SP.x(0)).attr('cy', SP.y(0))
            .attr('r', SP.x(1) - SP.x(0))
            .attr('class', 'pole-circle')
            .attr('stroke', col.butter)
            .attr('stroke-dasharray', '4 4')
            .attr('fill', 'none');

        // Filter poles
        var filt = window.FilterMath.butterworth(N);
        lastFilter = filt;
        window.AFPlots.drawMagnitudeUnityContour(SP, filt, col.ref);
        filt.poles.forEach(function (p) {
            window.AFPlots.drawPole(SP.g, SP.x(p.re), SP.y(p.im), col.butter, 7);
        });

        // Annotate one pole with its angle from the negative real axis.
        // Pick the pole closest to the imaginary axis in the upper half.
        var poleTop = filt.poles.reduce(function (best, p) {
            if (p.im > 0 && (!best || p.im > best.im)) return p;
            return best;
        }, null);
        if (poleTop) {
            var ang = Math.atan2(poleTop.im, poleTop.re) * 180 / Math.PI;
            // Angle measured from the +Re direction; show as a dashed
            // radial line and a text pill near the pole.
            SP.g.append('line')
                .attr('x1', SP.x(0)).attr('y1', SP.y(0))
                .attr('x2', SP.x(poleTop.re)).attr('y2', SP.y(poleTop.im))
                .attr('stroke', col.butter).attr('stroke-width', 1)
                .attr('stroke-dasharray', '3 3').attr('opacity', 0.5);
            SP.g.append('text')
                .attr('x', SP.x(poleTop.re) - 14).attr('y', SP.y(poleTop.im) - 10)
                .attr('text-anchor', 'end')
                .attr('fill', T.text)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text('θ = ' + ang.toFixed(0) + '°');
        }

        // Legend in the bottom-right corner of the inner plot, where the
        // RHP/im-negative quadrant is empty for any LHP filter.
        var entries = [
            { color: col.butter, label: 'butterworth poles (N = ' + N + ')' },
            { color: col.ref, label: '|H(s)| = 1 contour' }
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
            phaseDomain: [-90 * state.N - 30, 10],
            magTicks: [-80, -60, -40, -20, -3, 0],
            phaseTicks: phaseTicksFor(state.N)
        });

        var filt = window.FilterMath.butterworth(state.N);
        var pts = window.FilterMath.sampleResponse(filt, 0.05, 20, 600);
        window.AFPlots.drawTrace(BD, pts, 'butter');
        lastBD = BD;

        // Reference: -3 dB line and ω = 1 marker
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', 0).attr('x2', BD.innerW)
            .attr('y1', BD.yMag(-3)).attr('y2', BD.yMag(-3));
        var xc = BD.x(1);
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        BD.gPhase.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        window.renderKatex(BD.gMag, '\\omega_c = 1',
            xc, BD.innerH - 16,
            { width: 80, height: 22, size: 11, pill: true });

        // Slope annotation in the stopband
        BD.gMag.append('text')
            .attr('x', BD.innerW - 12).attr('y', BD.innerH - 12)
            .attr('text-anchor', 'end')
            .attr('fill', T.fg(0.6))
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .text('−' + (20 * state.N) + ' dB/dec');
    }

    function phaseTicksFor(N) {
        var minPhase = -90 * N;
        var ticks = [];
        for (var v = 0; v >= minPhase; v -= 90) ticks.push(v);
        return ticks;
    }

    function render() {
        renderSPlane();
        renderBode();
        if (probeCtrl && lastSP && lastBD && lastFilter) {
            probeCtrl.attach({
                sp: lastSP, bd: lastBD, filter: lastFilter,
                color: colors().butter,
                wMin: 0, wMax: 1.5
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
            color: colors().butter,
            contourColor: colors().ref,
            xDomain: [-1.5, 1.5],
            yDomain: [-1.5, 1.5],
            probeOmega: state.probe.omega,
            probeActive: state.probe.mode !== 'off',
            probeMode: state.probe.mode
        });
    }

    function onSlider() {
        state.N = parseInt(slider.value, 10);
        if (valLabel) valLabel.textContent = String(state.N);
        render();
    }

    function init() {
        probeCtrl = window.JwProbe.init({
            slider:      document.getElementById('butter-probe'),
            valLabel:    document.getElementById('butter-probe-val'),
            modeButtons: {
                mag:   document.getElementById('butter-probe-mag'),
                angle: document.getElementById('butter-probe-angle')
            },
            state: state.probe,
            onChange: render3D
        });
        if (slider) slider.addEventListener('input', onSlider);
        if (view3dButton) {
            view3dButton.addEventListener('click', function () {
                state.view3d = !state.view3d;
                render();
            });
        }
        if (slider) onSlider(); else render();
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
