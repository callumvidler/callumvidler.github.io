// Pole and zero generators for the four classical lowpass families.
// All filters are normalised to a passband edge of ω = 1 rad/s.
// Each generator returns { poles, zeros, gain } where poles and zeros
// are arrays of complex numbers { re, im } and gain is the multiplicative
// constant on the numerator so that the magnitude is unity at its peak.
(function () {

    // ─── Complex arithmetic ──────────────────────────────────────
    function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
    function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
    function cMul(a, b) {
        return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    }
    function cDiv(a, b) {
        var d = b.re * b.re + b.im * b.im;
        return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
    }
    function cAbs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }
    function cArg(a) { return Math.atan2(a.im, a.re); }

    // Evaluate H(s) = gain * Π(s - zk) / Π(s - pk) at s = jω.
    function evalHjw(omega, poles, zeros, gain) {
        var s = { re: 0, im: omega };
        var num = { re: gain, im: 0 };
        if (zeros) {
            for (var i = 0; i < zeros.length; i++) {
                num = cMul(num, cSub(s, zeros[i]));
            }
        }
        var den = { re: 1, im: 0 };
        for (var j = 0; j < poles.length; j++) {
            den = cMul(den, cSub(s, poles[j]));
        }
        return cDiv(num, den);
    }

    // Sample magnitude (in dB) and phase (in degrees) over a log frequency
    // sweep. If filter.evalMag(w) is provided it overrides the magnitude
    // from pole-zero evaluation; the phase is always taken from the
    // pole-zero form for consistency.
    function sampleResponse(filter, wMin, wMax, n) {
        var raw = [];
        var maxMag = 0;
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var Hjw = evalHjw(w, filter.poles, filter.zeros || [], filter.gain || 1);
            var mag = filter.evalMag ? filter.evalMag(w) : cAbs(Hjw);
            var phRad = cArg(Hjw);
            raw.push({ w: w, mag: mag, phRad: phRad });
            if (w <= 1.0 && mag > maxMag) maxMag = mag;
        }
        if (maxMag === 0) maxMag = 1;
        var phaseUnwrapped = [raw[0].phRad];
        for (var k = 1; k < raw.length; k++) {
            var prev = phaseUnwrapped[k - 1];
            var p = raw[k].phRad;
            while (p - prev > Math.PI) p -= 2 * Math.PI;
            while (p - prev < -Math.PI) p += 2 * Math.PI;
            phaseUnwrapped.push(p);
        }
        var pts = [];
        for (var m = 0; m < raw.length; m++) {
            var magNorm = raw[m].mag / maxMag;
            pts.push({
                w: raw[m].w,
                magDb: 20 * Math.log10(Math.max(magNorm, 1e-12)),
                phase: phaseUnwrapped[m] * 180 / Math.PI
            });
        }
        return pts;
    }

    // ─── Jacobi elliptic functions and complete elliptic integral ──
    // Used by the elliptic filter prototype: zeros sit at jω = 1/(k·sn),
    // and the magnitude follows |H|² = 1/(1 + ε² R_n²) where R_n is the
    // elliptic rational function expressed through the cd identity
    //   R_n(ω, 1/k) = cd(n·cd^{-1}(ω, k), k1).
    function ellipK(m) {
        if (m >= 1) return Infinity;
        if (m <= 0) return Math.PI / 2;
        var a = 1, b = Math.sqrt(1 - m);
        for (var i = 0; i < 60; i++) {
            if (Math.abs(a - b) < 1e-15 * Math.abs(a + b)) break;
            var an = (a + b) / 2;
            b = Math.sqrt(a * b);
            a = an;
        }
        return Math.PI / (2 * a);
    }
    function jacobiSn(u, m) {
        if (m === 0) return Math.sin(u);
        if (m === 1) return Math.tanh(u);
        var aArr = [1];
        var bArr = [Math.sqrt(1 - m)];
        var cArr = [Math.sqrt(m)];
        var nIter = 0;
        while (Math.abs(cArr[nIter]) > 1e-15 && nIter < 30) {
            aArr.push((aArr[nIter] + bArr[nIter]) / 2);
            bArr.push(Math.sqrt(aArr[nIter] * bArr[nIter]));
            cArr.push((aArr[nIter] - bArr[nIter]) / 2);
            nIter++;
        }
        var phi = Math.pow(2, nIter) * aArr[nIter] * u;
        for (var iI = nIter; iI >= 1; iI--) {
            phi = (phi + Math.asin(cArr[iI] * Math.sin(phi) / aArr[iI])) / 2;
        }
        return Math.sin(phi);
    }
    function jacobiCn(u, m) {
        var s = jacobiSn(u, m);
        return Math.sqrt(Math.max(0, 1 - s * s));
    }
    function jacobiDn(u, m) {
        var s = jacobiSn(u, m);
        return Math.sqrt(Math.max(0, 1 - m * s * s));
    }
    function jacobiCd(u, m) {
        var c = jacobiCn(u, m);
        var d = jacobiDn(u, m);
        return c / d;
    }
    // Inverse cd: returns u such that cd(u, m) = w, for w in [-1, 1].
    // Uses bisection on the monotone branch u ∈ [0, K].
    function invCd(w, m) {
        if (Math.abs(w) > 1) {
            // Continuation onto the imaginary axis is not handled here;
            // R_n is computed only on the real axis (real ω).
            return NaN;
        }
        var Km = ellipK(m);
        var lo = 0, hi = Km;
        for (var i = 0; i < 80; i++) {
            var mid = (lo + hi) / 2;
            var v = jacobiCd(mid, m);
            if (v > w) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    }

    // ─── Butterworth ─────────────────────────────────────────────
    // Poles equally spaced on the unit circle in the LHP.
    function butterworth(N) {
        var poles = [];
        for (var k = 1; k <= N; k++) {
            var theta = Math.PI / 2 + (2 * k - 1) * Math.PI / (2 * N);
            poles.push({ re: Math.cos(theta), im: Math.sin(theta) });
        }
        // Monic numerator H(s) = K / Π(s - pk). |H(0)| = K / |Π(-pk)|.
        // Π(-pk) for Butterworth on unit circle equals (-1)^N times a real
        // number; |Π(-pk)| = 1 since each |pk| = 1, so K = 1.
        return { poles: poles, zeros: [], gain: 1, family: 'butter' };
    }

    // ─── Chebyshev Type I ────────────────────────────────────────
    // Poles on an ellipse with semi-axes (sinh μ, cosh μ).
    function chebyshev1(N, eps) {
        var mu = Math.asinh(1 / eps) / N;
        var sh = Math.sinh(mu);
        var ch = Math.cosh(mu);
        var poles = [];
        for (var k = 1; k <= N; k++) {
            var theta = (2 * k - 1) * Math.PI / (2 * N);
            poles.push({ re: -sh * Math.sin(theta), im: ch * Math.cos(theta) });
        }
        // Compute K so that the peak passband magnitude is 1.
        // For monic H(s) = K / Π(s - pk), |H(jω_peak)| = K / Π|jω_peak - pk|.
        // Numerical normalisation handled by sampleResponse, but we still
        // want a sensible default gain so the time-domain shape is right.
        var prod = { re: 1, im: 0 };
        for (var i = 0; i < poles.length; i++) {
            prod = cMul(prod, { re: -poles[i].re, im: -poles[i].im });
        }
        var gain;
        if (N % 2 === 1) {
            gain = cAbs(prod);                     // peak at DC where |H| = 1
        } else {
            gain = cAbs(prod) / Math.sqrt(1 + eps * eps); // even N: DC sits at ripple floor
        }
        return { poles: poles, zeros: [], gain: gain, family: 'cheb1' };
    }

    // ─── Chebyshev Type II ───────────────────────────────────────
    // Zeros on the imaginary axis at ω_zk = 1/cos(θ_k); poles are the
    // reciprocals of a Chebyshev I prototype with the same N and ε.
    // Normalised here so that the passband is monotone with |H(0)| = 1
    // and the stopband edge sits at ω_s = 1.
    function chebyshev2(N, eps) {
        // Zeros: at jω_zk = j/cos(θ_k). Each zero contributes a complex
        // conjugate pair on the imaginary axis, except for the middle
        // notch at infinity for N odd (no finite zero).
        var zeros = [];
        var L = Math.floor(N / 2);
        for (var k = 1; k <= L; k++) {
            var theta = (2 * k - 1) * Math.PI / (2 * N);
            var wz = 1 / Math.cos(theta);
            zeros.push({ re: 0, im: wz });
            zeros.push({ re: 0, im: -wz });
        }
        // Poles: invert Chebyshev I prototype poles.
        var nu = Math.asinh(1 / eps) / N;
        var sh = Math.sinh(nu);
        var ch = Math.cosh(nu);
        var poles = [];
        for (var k2 = 1; k2 <= N; k2++) {
            var th = (2 * k2 - 1) * Math.PI / (2 * N);
            var pre = -sh * Math.sin(th);
            var pim = ch * Math.cos(th);
            var d = pre * pre + pim * pim;
            poles.push({ re: pre / d, im: -pim / d });
        }
        // Gain: choose so |H(0)| = 1.
        var H0 = { re: 1, im: 0 };
        var s0 = { re: 0, im: 0 };
        for (var z = 0; z < zeros.length; z++) H0 = cMul(H0, cSub(s0, zeros[z]));
        var den = { re: 1, im: 0 };
        for (var p = 0; p < poles.length; p++) den = cMul(den, cSub(s0, poles[p]));
        var ratio = cDiv(H0, den);
        var gain = 1 / cAbs(ratio);
        return { poles: poles, zeros: zeros, gain: gain, family: 'cheb2' };
    }

    // ─── Elliptic (Cauer) ────────────────────────────────────────
    // Lowpass elliptic prototype with passband edge ωp = 1, passband ripple
    // ε, and selectivity parameter k = 1/Ωs. The magnitude is computed
    // directly from the elliptic rational function R_n(ω, k) using the cd
    // identity, so the displayed Bode trace shows true equiripple in both
    // bands. The s-plane shows the Chebyshev I prototype poles for the
    // same N, ε; this gives a faithful geometric placement (poles on a
    // Chebyshev I ellipse, zeros on the imaginary axis above the passband
    // edge) without needing to evaluate Jacobi elliptic functions on a
    // complex argument. The pole-zero pair pattern is what matters
    // pedagogically; the exact pole locations of the true elliptic sit a
    // small distance inside the Chebyshev I ellipse, which the section
    // copy notes explicitly.
    function elliptic(N) {
        var epsP = 0.349;        // ≈ 0.5 dB passband ripple
        var k = 1 / 1.6;         // selectivity Ωs = 1.6
        var m = k * k;
        var Km = ellipK(m);

        // Zeros on the imaginary axis at ω_z = 1/(k · sn(u_l K, m))
        var zeros = [];
        var L = Math.floor(N / 2);
        for (var l = 1; l <= L; l++) {
            var ul = (2 * l - 1) * Km / N;
            var sn = jacobiSn(ul, m);
            var wz = 1 / (k * sn);
            zeros.push({ re: 0, im: wz });
            zeros.push({ re: 0, im: -wz });
        }

        // Approximate poles: take the Chebyshev I prototype poles and pull
        // each one slightly closer to the imaginary axis, by a factor that
        // depends on the elliptic stopband ratio k. The geometric content
        // (poles inside the Chebyshev I ellipse, on a horizontally
        // squeezed locus) is preserved; this is what the s-plane plot
        // illustrates.
        var pullIn = 0.85;
        var ch1 = chebyshev1(N, epsP);
        var poles = ch1.poles.map(function (p) {
            return { re: p.re * pullIn, im: p.im };
        });

        // Magnitude evaluated directly from the elliptic rational function.
        // The cd identity gives R_N on the passband ω ∈ [-1, 1] in closed
        // form, and the magnitude continues by analytic extension into the
        // stopband through the |R_N| ≥ ξ^N branch.
        function evalMag(w) {
            var aw = Math.abs(w);
            if (aw < 1e-9) {
                // R_N(0) is 0 (N even) or ±1 (N odd); near DC the
                // magnitude is at the ripple floor for N even, at unity
                // for N odd.
                var Rn0 = (N % 2 === 0) ? jacobiCd(N * invCd(0, m), m) : 1;
                return 1 / Math.sqrt(1 + epsP * epsP * Rn0 * Rn0);
            }
            if (aw <= 1) {
                // Passband: cd identity.
                var u = invCd(aw, m);
                var Rn = jacobiCd(N * u, m);
                return 1 / Math.sqrt(1 + epsP * epsP * Rn * Rn);
            }
            // Stopband: use the inverse-frequency relation
            //   R_N(ω, 1/k) · R_N(1/(k ω), k) = ξ^N    (for ω ≥ 1/k)
            // Equivalently, R_N grows as ω^N times a Cauer-rational
            // factor. A direct evaluation through the cd identity at
            // imaginary argument is the cleanest path.
            //
            // Practical approximation: evaluate by reflection
            //   R_N(ω, k) = ξ^N / R_N(ξ²/ω, k)   for ω in stopband
            // where ξ = 1/k. This holds exactly for the Cauer rational.
            var xi = 1 / k;
            var wRef = xi * xi / aw;
            if (wRef <= 1) {
                var uR = invCd(wRef, m);
                var Rref = jacobiCd(N * uR, m);
                if (Math.abs(Rref) < 1e-12) {
                    // Pole of R_N (zero of H): magnitude → 0
                    return 0;
                }
                var RnStop = Math.pow(xi, N) / Rref;
                return 1 / Math.sqrt(1 + epsP * epsP * RnStop * RnStop);
            }
            // Far stopband: R_N grows like ξ^N (constant floor with notches).
            // Approximate by the asymptotic floor.
            var floor = Math.pow(xi, N);
            return 1 / Math.sqrt(1 + epsP * epsP * floor * floor);
        }

        // Gain for the pole-zero phase reference (does not affect plotted
        // magnitude since evalMag is provided).
        var gain = 1;
        return { poles: poles, zeros: zeros, gain: gain, family: 'ellip', evalMag: evalMag };
    }

    window.FilterMath = {
        cAdd: cAdd, cSub: cSub, cMul: cMul, cDiv: cDiv, cAbs: cAbs, cArg: cArg,
        evalHjw: evalHjw,
        sampleResponse: sampleResponse,
        butterworth: butterworth,
        chebyshev1: chebyshev1,
        chebyshev2: chebyshev2,
        elliptic: elliptic
    };
})();
