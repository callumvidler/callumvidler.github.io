// jω probe overlay for the active-filter family s-plane plots.
//
// Adds a draggable disc on the imaginary axis at s = jω₀, with line
// segments from every pole and zero to that disc. A toggle in the
// section toolbar switches between three states:
//   off · |·|  · ∠·
// In |·| mode each vector is labelled with its length; in ∠· mode
// each vector is labelled with its angle from the +Re axis. A linked
// vertical cursor and small numeric pill on the matching Bode magnitude
// and phase panels show |H(jω₀)| and ∠H(jω₀) at the same ω, so the
// geometric vectors and the response curve move together.
//
// Usage:
//   var ctrl = window.JwProbe.init({
//       slider:      document.getElementById('butter-probe'),
//       valLabel:    document.getElementById('butter-probe-val'),
//       modeButtons: { mag: ..., angle: ... },
//       state:       state.probe   // { omega, mode }
//   });
//   // … then on every render(), once sp and bd are built:
//   ctrl.attach({ sp: SP, bd: BD, filter: filt, color: col.butter });
(function () {

    var controllers = new WeakMap();

    function init(opts) {
        var slider      = opts.slider;
        var valLabel    = opts.valLabel;
        var modeButtons = opts.modeButtons || {};
        var state       = opts.state;
        var onChange    = opts.onChange;

        if (slider && controllers.has(slider)) return controllers.get(slider);

        var ctrl = { ctx: null, state: state };

        function updateLabel() {
            if (!valLabel) return;
            if (state.mode === 'off') valLabel.textContent = 'off';
            else valLabel.textContent = state.omega.toFixed(2);
        }
        function updateButtons() {
            if (modeButtons.mag)   modeButtons.mag.classList.toggle('active', state.mode === 'mag');
            if (modeButtons.angle) modeButtons.angle.classList.toggle('active', state.mode === 'angle');
        }
        function setMode(m) {
            state.mode = (state.mode === m) ? 'off' : m;
            updateButtons();
            updateLabel();
            redraw();
            notifyChange();
        }

        function redraw() {
            if (!ctrl.ctx) return;
            drawProbe(ctrl.ctx, state);
        }
        function notifyChange() {
            if (typeof onChange === 'function') onChange(state);
        }

        if (slider) {
            slider.addEventListener('input', function () {
                state.omega = parseFloat(slider.value);
                // Touching the slider implies the user wants to see the
                // probe; auto-promote out of 'off' so the marker appears.
                if (state.mode === 'off') state.mode = 'mag';
                updateButtons();
                updateLabel();
                redraw();
                notifyChange();
            });
        }
        if (modeButtons.mag)   modeButtons.mag.addEventListener('click',   function () { setMode('mag'); });
        if (modeButtons.angle) modeButtons.angle.addEventListener('click', function () { setMode('angle'); });

        ctrl.attach = function (ctx) {
            ctrl.ctx = ctx;
            // Allow each section to declare a different probe range; clamp
            // the slider extent to the visible imaginary-axis domain.
            if (slider) {
                var wMax = ctx.wMax != null ? ctx.wMax : ctx.sp.y.domain()[1];
                var wMin = ctx.wMin != null ? ctx.wMin : 0;
                slider.min = String(wMin);
                slider.max = String(wMax);
                if (state.omega < wMin) state.omega = wMin;
                if (state.omega > wMax) state.omega = wMax;
                slider.value = String(state.omega);
            }
            updateButtons();
            updateLabel();
            redraw();
            notifyChange();
        };

        if (slider) controllers.set(slider, ctrl);
        return ctrl;
    }

    // ─── Drawing ─────────────────────────────────────────────────
    function drawProbe(ctx, state) {
        var sp     = ctx.sp;
        var bd     = ctx.bd;
        var filter = ctx.filter;
        var color  = ctx.color;

        // Tear down any prior probe overlay on this s-plane / bode pair.
        sp.g.selectAll('.jw-probe-layer').remove();
        if (bd) {
            bd.gMag.selectAll('.jw-cursor').remove();
            bd.gPhase.selectAll('.jw-cursor').remove();
        }
        sp.g.selectAll('.mag-unity-contour')
            .style('display', state.mode === 'mag' ? null : 'none');

        if (state.mode === 'off') return;

        var T = window.T;
        var probeColor = window.AFPlots.getCssVar('--c-mark');
        var posAngleColor = window.AFPlots.getCssVar('--c-cheb2');
        var negAngleColor = window.AFPlots.getCssVar('--c-cheb1');
        var w = state.omega;

        var layer = sp.g.append('g').attr('class', 'jw-probe-layer');

        var poles = filter.poles || [];
        var zeros = filter.zeros || [];

        // ─── Vectors from poles and zeros to jω₀ ─────────────────
        // The pole vector is (jω - p), the zero vector is (jω - z).
        // Lengths multiply (poles divide) into |H|, and the angles add
        // (poles subtract) into ∠H. Geometric content of the s-plane.
        var probePt = { re: 0, im: w };
        var pxJ = sp.x(0);
        var pyJ = sp.y(w);
        var sum = computeVectorSum(probePt, filter);
        var magNormMax = 1;
        if (bd) {
            var magDomain = bd.x.domain();
            magNormMax = computeNormMax(filter, magDomain[0], magDomain[1]);
            var HjwForSum = window.FilterMath.evalHjw(w, filter.poles, filter.zeros || [], filter.gain || 1);
            var magForSum = filter.evalMag ? filter.evalMag(w) : window.FilterMath.cAbs(HjwForSum);
            sum.magLinear = magForSum / (magNormMax || 1);
            sum.magDb = 20 * Math.log10(Math.max(sum.magLinear, 1e-12));
        }
        var bodePhaseDeg = null;
        if (bd && w > 0) {
            var phaseDomain = bd.x.domain();
            if (w >= phaseDomain[0] && w <= phaseDomain[1]) {
                bodePhaseDeg = computeUnwrappedPhaseAt(filter, w, phaseDomain[0]);
                sum.angleDeg = bodePhaseDeg;
            }
        }

        function drawVector(s, kind) {
            var v   = window.FilterMath.cSub(probePt, s);
            var len = window.FilterMath.cAbs(v);
            var ang = window.FilterMath.cArg(v) * 180 / Math.PI;
            var contribution = kind === 'zero' ? ang : -ang;
            var vectorColor = state.mode === 'angle'
                ? contributionColor(contribution, posAngleColor, negAngleColor, color)
                : color;

            // Skip vector to a singularity that sits off the visible
            // window (elliptic has off-window zeros): the line would
            // run far outside the plot frame and clip awkwardly.
            var xDom = sp.x.domain();
            var yDom = sp.y.domain();
            if (s.re < xDom[0] || s.re > xDom[1] ||
                s.im < yDom[0] || s.im > yDom[1]) return;

            var x1 = sp.x(s.re), y1 = sp.y(s.im);
            var x2 = pxJ,         y2 = pyJ;

            layer.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', vectorColor)
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', kind === 'zero' ? '4 3' : null)
                .attr('opacity', 0.7)
                .attr('pointer-events', 'none');

            if (state.mode === 'mag') {
                // Length pill centred on the vector midpoint so the
                // measured segment is visually unambiguous.
                renderZoomFixedKatex(layer, len.toFixed(2),
                    (x1 + x2) / 2,
                    (y1 + y2) / 2,
                    { width: 56, height: 20, size: 10.5, pill: true, color: '#1a1a1e' });
            } else if (state.mode === 'angle') {
                // The math angle ang is measured CCW from +Re. SVG y is
                // flipped, so on screen the same vector points at angle
                // -ang from +x. Draw a short arc from +x to that screen
                // angle and pin a pill on the bisector.
                var screenAng = -ang * Math.PI / 180;
                var arcR  = 16;
                var pillR = 30;
                layer.append('path')
                    .attr('d', describeArc(x1, y1, arcR, 0, screenAng))
                    .attr('fill', 'none')
                    .attr('stroke', vectorColor)
                    .attr('stroke-width', 1.2)
                    .attr('opacity', 0.7);
                var px = x1 + pillR * Math.cos(screenAng / 2);
                var py = y1 + pillR * Math.sin(screenAng / 2);
                renderZoomFixedKatex(layer, formatSignedAngleDeg(contribution) + '^{\\circ}',
                    px, py,
                    { width: 60, height: 20, size: 10.5, pill: true, color: '#1a1a1e' });
            }
        }

        poles.forEach(function (p) { drawVector(p, 'pole'); });
        zeros.forEach(function (z) { drawVector(z, 'zero'); });

        drawSummedReadout(layer, sp, state.mode, sum);

        // ─── Probe disc on the jω axis ────────────────────────────
        layer.append('line')
            .attr('x1', pxJ).attr('x2', pxJ)
            .attr('y1', sp.y(0)).attr('y2', pyJ)
            .attr('stroke', probeColor).attr('stroke-width', 1.2)
            .attr('opacity', 0.6)
            .attr('stroke-dasharray', '2 3');
        layer.append('circle')
            .attr('cx', pxJ).attr('cy', pyJ).attr('r', 6)
            .attr('fill', probeColor)
            .attr('stroke', T.text).attr('stroke-width', 1.2)
            .attr('opacity', 0.95);
        // Numeric ω label, anchored just to the right of the disc.
        layer.append('text')
            .attr('x', pxJ + 11).attr('y', pyJ + 4)
            .attr('fill', T.text)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .text('jω = ' + w.toFixed(2));

        // ─── Linked Bode cursor and readout ──────────────────────
        // All cursor visuals (line + pill) live inside a single g.jw-cursor
        // so the prior frame's foreignObjects get cleaned up alongside the
        // line on every slider tick.
        if (bd && w > 0) {
            var xDomain = bd.x.domain();
            if (w >= xDomain[0] && w <= xDomain[1]) {
                var bx = bd.x(w);
                var magCursor = bd.gMag.append('g').attr('class', 'jw-cursor');
                var phCursor  = bd.gPhase.append('g').attr('class', 'jw-cursor');
                magCursor.append('line')
                    .attr('x1', bx).attr('x2', bx)
                    .attr('y1', 0).attr('y2', bd.innerH)
                    .attr('stroke', probeColor).attr('stroke-width', 1.4)
                    .attr('opacity', 0.85);
                phCursor.append('line')
                    .attr('x1', bx).attr('x2', bx)
                    .attr('y1', 0).attr('y2', bd.innerH)
                    .attr('stroke', probeColor).attr('stroke-width', 1.4)
                    .attr('opacity', 0.85);

                // Numeric readouts: |H|, ∠H. The displayed Bode trace is
                // normalised by sampleResponse so its peak in [0,1] is 0 dB;
                // mirror that normalisation here so the pill matches the
                // curve at the same ω.
                var Hjw = window.FilterMath.evalHjw(w, filter.poles, filter.zeros || [], filter.gain || 1);
                var rawMag = filter.evalMag ? filter.evalMag(w) : window.FilterMath.cAbs(Hjw);
                var maxMag = magNormMax || computeNormMax(filter, xDomain[0], xDomain[1]);
                var magNorm = rawMag / (maxMag || 1);
                var magDb = 20 * Math.log10(Math.max(magNorm, 1e-12));
                var phDeg = bodePhaseDeg == null ? window.FilterMath.cArg(Hjw) * 180 / Math.PI : bodePhaseDeg;

                // Pill anchored just to the right of the cursor at the top
                // of each panel; flipped to the left if the cursor sits
                // close to the right edge.
                var pillW = 100;
                var pillX = bx + 6;
                if (pillX + pillW > bd.innerW) pillX = bx - 6 - pillW;
                window.renderKatex(magCursor,
                    '|H| = ' + magDb.toFixed(1) + '\\,\\mathrm{dB}',
                    pillX + pillW / 2, 14,
                    { width: pillW, height: 20, size: 10.5, pill: true, color: '#1a1a1e' });
                window.renderKatex(phCursor,
                    '\\angle H = ' + formatAngleDeg(phDeg) + '^{\\circ}',
                    pillX + pillW / 2, 14,
                    { width: pillW, height: 20, size: 10.5, pill: true, color: '#1a1a1e' });
            }
        }
    }

    function computeVectorSum(probePt, filter) {
        var poles = filter.poles || [];
        var zeros = filter.zeros || [];
        var gain = filter.gain || 1;
        var magLinear = Math.abs(gain);
        var magDb = 20 * Math.log10(Math.max(Math.abs(gain), 1e-12));
        var angleDeg = gain < 0 ? 180 : 0;

        zeros.forEach(function (z) {
            var vz = window.FilterMath.cSub(probePt, z);
            var zLen = window.FilterMath.cAbs(vz);
            magLinear *= zLen;
            magDb += 20 * Math.log10(Math.max(zLen, 1e-12));
            angleDeg += window.FilterMath.cArg(vz) * 180 / Math.PI;
        });
        poles.forEach(function (p) {
            var vp = window.FilterMath.cSub(probePt, p);
            var pLen = window.FilterMath.cAbs(vp);
            magLinear /= Math.max(pLen, 1e-12);
            magDb -= 20 * Math.log10(Math.max(pLen, 1e-12));
            angleDeg -= window.FilterMath.cArg(vp) * 180 / Math.PI;
        });

        return { magLinear: magLinear, magDb: magDb, angleDeg: angleDeg };
    }

    function computeUnwrappedPhaseAt(filter, targetW, startW) {
        var lo = Math.max(startW || 0.001, 0.001);
        var hi = Math.max(targetW, lo);
        var n = Math.max(24, Math.min(360, Math.ceil(90 * Math.log10(hi / lo + 1))));
        var phases = [];

        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = lo * Math.pow(hi / lo, t);
            phases.push(rawPhaseRad(filter, w));
        }
        phases.push(rawPhaseRad(filter, targetW));

        var unwrapped = phases[0];
        for (var k = 1; k < phases.length; k++) {
            var p = phases[k];
            while (p - unwrapped > Math.PI) p -= 2 * Math.PI;
            while (p - unwrapped < -Math.PI) p += 2 * Math.PI;
            unwrapped = p;
        }
        return unwrapped * 180 / Math.PI;
    }

    function rawPhaseRad(filter, omega) {
        var Hjw = window.FilterMath.evalHjw(omega, filter.poles, filter.zeros || [], filter.gain || 1);
        return window.FilterMath.cArg(Hjw);
    }

    function drawSummedReadout(layer, sp, mode, sum) {
        var label;
        var width;
        if (mode === 'mag') {
            label = '|H| = ' + formatLinearMag(sum.magLinear);
            width = 120;
        } else if (mode === 'angle') {
            label = '\\Sigma\\angle v = ' + formatAngleDeg(sum.angleDeg) + '^{\\circ}';
            width = 150;
        } else {
            return;
        }

        renderZoomFixedKatex(layer, label,
            sp.innerW - width / 2 - 8, 14,
            { width: width, height: 22, size: 10.5, pill: true, color: '#1a1a1e' });
    }

    function renderZoomFixedKatex(parent, latex, x, y, opts) {
        var fo = window.renderKatex(parent, latex, x, y, opts)
            .attr('class', function () {
                var existing = this.getAttribute('class');
                return existing ? existing + ' zoom-fixed-label' : 'zoom-fixed-label';
            })
            .attr('data-anchor-x', x)
            .attr('data-anchor-y', y);
        applyCurrentZoomCompensation(fo, parent, x, y);
        return fo;
    }

    function applyCurrentZoomCompensation(fo, parent, x, y) {
        var k = currentZoomScale(parent.node());
        var inv = labelZoomCompensation(k);
        fo.attr('transform', 'translate(' + x + ' ' + y + ') scale(' + inv + ') translate(' + (-x) + ' ' + (-y) + ')');
    }

    function labelZoomCompensation(zoomK) {
        var k = zoomK || 1;
        return 1 / (k * Math.sqrt(k));
    }

    function currentZoomScale(node) {
        var n = node;
        while (n) {
            if (n.classList && n.classList.contains('zoom-content')) {
                var transform = n.getAttribute('transform') || '';
                var match = transform.match(/scale\(([^)]+)\)/);
                return match ? parseFloat(match[1]) : 1;
            }
            n = n.parentNode;
        }
        return 1;
    }

    function formatAngleDeg(angleDeg) {
        var sign = angleDeg < 0 ? '-' : '';
        var rounded = Math.round(Math.abs(angleDeg) + 1e-9);
        if (rounded === 0) return '0';
        return sign + String(rounded);
    }

    function formatSignedAngleDeg(angleDeg) {
        var rounded = Math.round(Math.abs(angleDeg) + 1e-9);
        if (rounded === 0) return '0';
        return (angleDeg < 0 ? '-' : '+') + String(rounded);
    }

    function contributionColor(value, positive, negative, neutral) {
        if (value > 0.5) return positive;
        if (value < -0.5) return negative;
        return neutral;
    }

    function formatLinearMag(value) {
        if (!isFinite(value)) return '\\infty';
        if (value === 0) return '0';
        if (value >= 1000 || value < 0.01) return value.toExponential(2).replace('e', '\\times 10^{') + '}';
        return value.toFixed(value >= 10 ? 1 : 2);
    }

    // Replicate sampleResponse's normalisation: peak |H(jω)| over the
    // passband [wMin, 1]. Coarse sampling is enough; the readout is
    // pinned to one decimal place.
    function computeNormMax(filter, wMin, wMax) {
        var n = 200;
        var wTop = Math.min(1, wMax);
        var wLo  = Math.max(1e-3, wMin);
        var maxMag = 0;
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wLo * Math.pow(wTop / wLo, t);
            var Hjw = window.FilterMath.evalHjw(w, filter.poles, filter.zeros || [], filter.gain || 1);
            var m = filter.evalMag ? filter.evalMag(w) : window.FilterMath.cAbs(Hjw);
            if (m > maxMag) maxMag = m;
        }
        return maxMag || 1;
    }

    // SVG arc from one angle to another, both measured in radians from
    // +x, counter-clockwise positive. Used to draw the angle indicator
    // at the base of each vector in ∠· mode.
    function describeArc(cx, cy, r, a0, a1) {
        var x0 = cx + r * Math.cos(a0);
        var y0 = cy + r * Math.sin(a0);
        var x1 = cx + r * Math.cos(a1);
        var y1 = cy + r * Math.sin(a1);
        var sweepDelta = a1 - a0;
        var largeArc = Math.abs(sweepDelta) > Math.PI ? 1 : 0;
        var sweep = sweepDelta > 0 ? 1 : 0;
        return 'M ' + x0 + ' ' + y0 +
               ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' ' + sweep + ' ' + x1 + ' ' + y1;
    }

    window.JwProbe = { init: init };
})();
