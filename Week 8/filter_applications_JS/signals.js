// Signal synthesis and digital filter helpers for the demo plots.
// All filters are causal IIR forms common in textbooks. For zero-phase
// display the filter is run forward then backward (filtfilt) so the
// before/after traces line up visually.
(function () {
    // ─── Deterministic PRNG (mulberry32) ───────────────────────
    function makeRng(seed) {
        var s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Box-Muller white Gaussian noise vector, standard deviation sigma.
    function gaussianNoise(N, sigma, seed) {
        var rng = makeRng(seed || 1);
        var out = new Array(N);
        for (var i = 0; i < N; i += 2) {
            var u1 = Math.max(rng(), 1e-12);
            var u2 = rng();
            var r = Math.sqrt(-2 * Math.log(u1));
            var th = 2 * Math.PI * u2;
            out[i] = sigma * r * Math.cos(th);
            if (i + 1 < N) out[i + 1] = sigma * r * Math.sin(th);
        }
        return out;
    }

    // ─── Simple ECG-like beat train ───────────────────────────
    // Sum of Gaussian-shaped P, Q, R, S, T deflections at each beat.
    function gauss(t, mu, sigma, amp) {
        var z = (t - mu) / sigma;
        return amp * Math.exp(-0.5 * z * z);
    }

    function ecgSignal(t, opts) {
        opts = opts || {};
        var period = opts.period || 0.85;     // ~70 bpm
        var t0     = opts.t0     || 0.4;       // first R peak
        var amp    = opts.amp    || 1.0;
        var nBeats = Math.ceil((t[t.length - 1] - t0) / period) + 2;
        var out = new Array(t.length);
        for (var i = 0; i < t.length; i++) out[i] = 0;

        for (var b = -1; b < nBeats; b++) {
            var tb = t0 + b * period;
            for (var j = 0; j < t.length; j++) {
                var ti = t[j];
                var dt = ti - tb;
                if (dt < -0.30 || dt > 0.45) continue;
                out[j] += gauss(ti, tb - 0.18,  0.022,  0.18 * amp); // P
                out[j] += gauss(ti, tb - 0.028, 0.008, -0.15 * amp); // Q
                out[j] += gauss(ti, tb,         0.012,  1.20 * amp); // R
                out[j] += gauss(ti, tb + 0.028, 0.009, -0.30 * amp); // S
                out[j] += gauss(ti, tb + 0.20,  0.038,  0.32 * amp); // T
            }
        }
        return out;
    }

    function timeAxis(N, fs) {
        var t = new Array(N);
        for (var i = 0; i < N; i++) t[i] = i / fs;
        return t;
    }

    function addArrays() {
        var n = arguments[0].length;
        var out = new Array(n);
        for (var i = 0; i < n; i++) {
            var s = 0;
            for (var k = 0; k < arguments.length; k++) s += arguments[k][i];
            out[i] = s;
        }
        return out;
    }

    function scale(arr, k) {
        var out = new Array(arr.length);
        for (var i = 0; i < arr.length; i++) out[i] = k * arr[i];
        return out;
    }

    function sineWave(t, freq, amp, phase) {
        amp = amp == null ? 1 : amp;
        phase = phase || 0;
        var out = new Array(t.length);
        for (var i = 0; i < t.length; i++) {
            out[i] = amp * Math.sin(2 * Math.PI * freq * t[i] + phase);
        }
        return out;
    }

    // ─── Digital filters ──────────────────────────────────────
    // First-order RC low-pass, exact pole mapping:
    //     alpha = 1 - exp(-2 pi fc / fs)
    //     y[n]  = alpha x[n] + (1 - alpha) y[n-1]
    function firstOrderLPF(x, fc, fs) {
        var alpha = 1 - Math.exp(-2 * Math.PI * fc / fs);
        var y = new Array(x.length);
        var prev = x[0];
        for (var i = 0; i < x.length; i++) {
            prev = alpha * x[i] + (1 - alpha) * prev;
            y[i] = prev;
        }
        return y;
    }

    // First-order RC high-pass:
    //     alpha = exp(-2 pi fc / fs)
    //     y[n]  = alpha (y[n-1] + x[n] - x[n-1])
    function firstOrderHPF(x, fc, fs) {
        var alpha = Math.exp(-2 * Math.PI * fc / fs);
        var y = new Array(x.length);
        y[0] = 0;
        for (var i = 1; i < x.length; i++) {
            y[i] = alpha * (y[i - 1] + x[i] - x[i - 1]);
        }
        return y;
    }

    // RBJ biquad notch coefficients (zero gain at f0, unity elsewhere).
    function notchCoeffs(f0, Q, fs) {
        var w0 = 2 * Math.PI * f0 / fs;
        var alpha = Math.sin(w0) / (2 * Q);
        var cw = Math.cos(w0);
        var b0 = 1, b1 = -2 * cw, b2 = 1;
        var a0 = 1 + alpha, a1 = -2 * cw, a2 = 1 - alpha;
        return {
            b: [b0 / a0, b1 / a0, b2 / a0],
            a: [1, a1 / a0, a2 / a0]
        };
    }

    function biquad(x, c) {
        var y = new Array(x.length);
        var b = c.b, a = c.a;
        var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (var i = 0; i < x.length; i++) {
            var xn = x[i];
            var yn = b[0] * xn + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
            y[i] = yn;
            x2 = x1; x1 = xn;
            y2 = y1; y1 = yn;
        }
        return y;
    }

    // Forward-backward filtering for zero-phase display.
    function filtfiltLPF(x, fc, fs) {
        var f = firstOrderLPF(x, fc, fs);
        f.reverse();
        f = firstOrderLPF(f, fc, fs);
        f.reverse();
        return f;
    }
    function filtfiltHPF(x, fc, fs) {
        var f = firstOrderHPF(x, fc, fs);
        f.reverse();
        f = firstOrderHPF(f, fc, fs);
        f.reverse();
        return f;
    }
    function filtfiltBiquad(x, c) {
        var f = biquad(x, c);
        f.reverse();
        f = biquad(f, c);
        f.reverse();
        return f;
    }

    // ─── Magnitude responses, evaluated at a frequency grid ───
    // First-order LPF |H(f)| = 1 / sqrt(1 + (f/fc)^2)
    function magLPF(f, fc) { var r = f / fc; return 1 / Math.sqrt(1 + r * r); }
    function magHPF(f, fc) { var r = f / fc; return r / Math.sqrt(1 + r * r); }

    // Discrete biquad magnitude response at frequency f, sample rate fs.
    function magBiquad(f, c, fs) {
        var w = 2 * Math.PI * f / fs;
        var cw1 = Math.cos(-w), sw1 = Math.sin(-w);
        var cw2 = Math.cos(-2 * w), sw2 = Math.sin(-2 * w);
        var b = c.b, a = c.a;
        var numRe = b[0] + b[1] * cw1 + b[2] * cw2;
        var numIm =        b[1] * sw1 + b[2] * sw2;
        var denRe = a[0] + a[1] * cw1 + a[2] * cw2;
        var denIm =        a[1] * sw1 + a[2] * sw2;
        var nMag = Math.sqrt(numRe * numRe + numIm * numIm);
        var dMag = Math.sqrt(denRe * denRe + denIm * denIm);
        return nMag / dMag;
    }

    // ─── Naive DFT magnitude (single-sided) ───────────────────
    // Used for the small spectrum panels. N up to a few hundred is fine.
    function dftMagnitude(x, fs, fMax, nBins) {
        var N = x.length;
        nBins = nBins || 200;
        var out = new Array(nBins);
        for (var k = 0; k < nBins; k++) {
            var f = (k / (nBins - 1)) * fMax;
            var w = 2 * Math.PI * f / fs;
            var re = 0, im = 0;
            for (var n = 0; n < N; n++) {
                re += x[n] * Math.cos(w * n);
                im -= x[n] * Math.sin(w * n);
            }
            out[k] = { f: f, mag: Math.sqrt(re * re + im * im) * 2 / N };
        }
        return out;
    }

    window.Signals = {
        makeRng: makeRng,
        gaussianNoise: gaussianNoise,
        ecgSignal: ecgSignal,
        timeAxis: timeAxis,
        addArrays: addArrays,
        scale: scale,
        sineWave: sineWave,
        firstOrderLPF: firstOrderLPF,
        firstOrderHPF: firstOrderHPF,
        notchCoeffs: notchCoeffs,
        biquad: biquad,
        filtfiltLPF: filtfiltLPF,
        filtfiltHPF: filtfiltHPF,
        filtfiltBiquad: filtfiltBiquad,
        magLPF: magLPF,
        magHPF: magHPF,
        magBiquad: magBiquad,
        dftMagnitude: dftMagnitude
    };
})();
