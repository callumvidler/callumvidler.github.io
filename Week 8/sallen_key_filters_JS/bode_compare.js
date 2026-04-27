// Section 03 · Comparison Bode plot.
// Three responses on shared axes:
//   passive 2-stage RC (loaded)              — dashed red, the unaided baseline
//   buffered cascade (1+sRC)^2               — blue, two op-amps, real coincident poles, Q = 0.5
//   Sallen-Key Butterworth (Q = 1/√2)        — amber, single op-amp, complex pole pair
// All three share ω = 1 rad/s as the natural-frequency reference so the
// curves can be read on the same axis.
(function () {
    var T = window.T;
    var sel = '#plot-bode-compare';
    var H_helpers = window.BodeHelpers;

    function biquadSamples(Q, n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var re = 1 - w * w;
            var im = w / Q;
            var mag = 1 / Math.sqrt(re * re + im * im);
            var phRad = -Math.atan2(im, re);
            pts.push({ w: w, magDb: 20 * Math.log10(mag) });
            phaseRads.push(phRad);
        }
        var unwrapped = H_helpers.unwrapPhase(phaseRads);
        for (var j = 0; j < pts.length; j++) {
            pts[j].phase = unwrapped[j] * 180 / Math.PI;
        }
        return pts;
    }

    function bufferedSamples(n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var mag = 1 / (1 + w * w);
            var phRad = -2 * Math.atan(w);
            pts.push({ w: w, magDb: 20 * Math.log10(mag) });
            phaseRads.push(phRad);
        }
        var unwrapped = H_helpers.unwrapPhase(phaseRads);
        for (var j = 0; j < pts.length; j++) {
            pts[j].phase = unwrapped[j] * 180 / Math.PI;
        }
        return pts;
    }

    function passiveSamples(n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var stages = [{ R: 1, C: 1 }, { R: 1, C: 1 }];
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var Hjw = H_helpers.cascadeABCD(w, stages);
            pts.push({ w: w, magDb: 20 * Math.log10(H_helpers.cAbs(Hjw)) });
            phaseRads.push(H_helpers.cArg(Hjw));
        }
        var unwrapped = H_helpers.unwrapPhase(phaseRads);
        for (var j = 0; j < pts.length; j++) {
            pts[j].phase = unwrapped[j] * 180 / Math.PI;
        }
        return pts;
    }

    function render() {
        var H = H_helpers.setupBode({
            sel: sel,
            xDomain: [0.01, 100],
            magDomain: [-80, 6],
            phaseDomain: [-200, 10],
            magTicks: [-80, -60, -40, -20, -6, -3, 0],
            phaseTicks: [-180, -135, -90, -45, 0]
        });

        var x = H.x, yMag = H.yMag, yPhase = H.yPhase;
        var magMin = yMag.domain()[0];
        var magMax = yMag.domain()[1];
        var clipM = function (d) { return Math.min(Math.max(d, magMin), magMax); };

        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(clipM(d.magDb)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        var passivePts = passiveSamples();
        var bufferedPts = bufferedSamples();
        var skPts = biquadSamples(1 / Math.sqrt(2));

        H.gMag.append('path').datum(passivePts).attr('class', 'trace passive faint').attr('d', lineMag);
        H.gPhase.append('path').datum(passivePts).attr('class', 'trace passive faint').attr('d', linePhase);
        H.gMag.append('path').datum(bufferedPts).attr('class', 'trace buffered').attr('d', lineMag);
        H.gPhase.append('path').datum(bufferedPts).attr('class', 'trace buffered').attr('d', linePhase);
        H.gMag.append('path').datum(skPts).attr('class', 'trace active').attr('d', lineMag);
        H.gPhase.append('path').datum(skPts).attr('class', 'trace active').attr('d', linePhase);

        // ω = 1 reference marker
        var x0 = x(1);
        H.gMag.append('line')
            .attr('x1', x0).attr('x2', x0)
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', T.fg(0.35)).attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');
        H.gPhase.append('line')
            .attr('x1', x0).attr('x2', x0)
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', T.fg(0.35)).attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');
        H.gMag.append('text')
            .attr('x', x0 - 6).attr('y', 14)
            .attr('text-anchor', 'end')
            .attr('fill', T.fg(0.55))
            .attr('font-size', 11)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text('ω0');

        H_helpers.attachHover(H, [
            { name: 'Sallen-Key  Q = 0.71', cssClass: 'active',   pts: skPts },
            { name: 'buffered cascade',     cssClass: 'buffered', pts: bufferedPts },
            { name: 'passive 2RC',          cssClass: 'passive',  pts: passivePts }
        ]);

        var entries = [
            { c: 'active',   label: 'Sallen-Key  (1 op-amp, Q = 0.71)' },
            { c: 'buffered', label: 'buffered cascade  (2 op-amps, Q = 0.50)' },
            { c: 'passive',  label: 'passive 2RC  (no op-amps)' }
        ];
        var lg = H.gMag.append('g').attr('transform', 'translate(' + (H.innerW - 12) + ',12)');
        entries.forEach(function (e, idx) {
            var row = lg.append('g').attr('transform', 'translate(0,' + (idx * 18) + ')');
            row.append('line').attr('class', 'trace ' + e.c)
                .attr('x1', -36).attr('x2', -8)
                .attr('y1', 8).attr('y2', 8);
            row.append('text')
                .attr('x', -42).attr('y', 11)
                .attr('text-anchor', 'end')
                .attr('fill', T.text)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(e.label);
        });
    }

    function init() {
        render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
