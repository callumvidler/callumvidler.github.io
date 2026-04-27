// Section 02 · Buffered RC cascade Bode response.
// With unity-gain buffers between stages the composite transfer function
// is the exact product (1+sRC)^N. Plotted against the loaded passive
// cascade for the same R, C to show that the loading error is removed.
(function () {
    var T = window.T;
    var sel = '#plot-bode-buffered';
    var H_helpers = window.BodeHelpers;

    function bufferedSamples(n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var mag = 1 / (1 + w * w);                   // |1/(1+jw)^2|
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

        var pPts = passiveSamples();
        var bPts = bufferedSamples();

        H.gMag.append('path').datum(pPts).attr('class', 'trace passive faint').attr('d', lineMag);
        H.gPhase.append('path').datum(pPts).attr('class', 'trace passive faint').attr('d', linePhase);
        H.gMag.append('path').datum(bPts).attr('class', 'trace buffered').attr('d', lineMag);
        H.gPhase.append('path').datum(bPts).attr('class', 'trace buffered').attr('d', linePhase);

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
            .text('1 / RC');

        H_helpers.attachHover(H, [
            { name: 'buffered cascade',  cssClass: 'buffered', pts: bPts },
            { name: 'passive cascade',   cssClass: 'passive',  pts: pPts }
        ]);

        var entries = [
            { c: 'buffered', label: 'buffered  (1+sRC)²' },
            { c: 'passive',  label: 'passive  (loaded)' }
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
