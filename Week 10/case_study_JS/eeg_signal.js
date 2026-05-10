// eeg_signal.js
// Shared EEG simulator. The signal follows a four-phase cycle that mirrors a
// clinical seizure recording:
//   • normal   — low-amplitude alpha/beta background
//   • pre      — same background plus a small number of growing spikes (the
//                feature the case study asks the student to detect)
//   • seizure  — high-amplitude rhythmic activity with broadband content
//   • recovery — post-ictal suppression
// One rAF loop maintains a ring buffer of raw samples, a 2-pole low-pass
// version, the ground-truth spike list, and a phase function. Per-scene
// drawing functions register a tick callback and read window slices.
(function () {
    var FS = 240;
    var HISTORY = 32;          // seconds in ring buffer (must cover slide-1 window)
    var N = HISTORY * FS;

    // Phase plan (all values in seconds within one cycle).
    var P_NORMAL = 9;
    var P_PRE = 8;
    var P_SEIZURE = 10;
    var P_REC = 4;
    var CYCLE_LEN = P_NORMAL + P_PRE + P_SEIZURE + P_REC;   // 31 s
    var T_PRE = P_NORMAL;                                   // 9
    var T_SEIZ = P_NORMAL + P_PRE;                          // 17
    var T_REC = P_NORMAL + P_PRE + P_SEIZURE;               // 27

    var buf = {
        raw: new Float32Array(N),
        filt: new Float32Array(N),
        t: new Float32Array(N),
        head: 0
    };

    var state = {
        t: 0,
        last: 0,
        seed: 13371337,
        fc: 5.0,
        lpf1: 0, lpf2: 0,
        spikes: [],            // ground-truth events {t, amp}
        scheduledCycles: -1    // last cycle index for which we scheduled spikes
    };

    var listeners = [];

    function rng() {
        state.seed = (state.seed + 0x6D2B79F5) | 0;
        var x = state.seed;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    }

    // Phase descriptor for an absolute time t.
    function phaseAt(t) {
        var T = ((t % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;
        if (T < T_PRE) return { id: 'normal', start: 0, dur: P_NORMAL, t: T };
        if (T < T_SEIZ) return { id: 'pre', start: T_PRE, dur: P_PRE, t: T - T_PRE };
        if (T < T_REC) return { id: 'seizure', start: T_SEIZ, dur: P_SEIZURE, t: T - T_SEIZ };
        return { id: 'recovery', start: T_REC, dur: P_REC, t: T - T_REC };
    }

    // Pre-compute spike events for the pre-state of a given cycle. Spikes
    // grow in amplitude over the phase, with irregular inter-spike intervals.
    function scheduleSpikesForCycle(cycleIdx) {
        var preStart = cycleIdx * CYCLE_LEN + T_PRE;
        var preEnd = cycleIdx * CYCLE_LEN + T_SEIZ;
        var t = preStart + 0.5 + rng() * 0.6;
        var n = 0;
        while (t < preEnd - 0.4 && n < 8) {
            var p = (t - preStart) / P_PRE;
            var amp = 0.32 + p * 1.25 + (rng() * 0.10 - 0.05);
            state.spikes.push({ t: t, amp: amp });
            t += 1.2 + rng() * 1.6;
            n++;
        }
    }

    function ensureScheduledThrough(t) {
        var ci = Math.floor(t / CYCLE_LEN);
        while (state.scheduledCycles < ci) {
            state.scheduledCycles++;
            scheduleSpikesForCycle(state.scheduledCycles);
        }
        // Trim history of spikes we'll never need again.
        var cutoff = t - HISTORY * 1.4;
        while (state.spikes.length && state.spikes[0].t < cutoff) {
            state.spikes.shift();
        }
    }

    // Slow drift component (delta band) — present in every phase, always
    // small relative to the spikes and the seizure.
    function drift(t) {
        var v = 0;
        v += 0.05 * Math.sin(2 * Math.PI * 1.3 * t + 2.1);
        v += 0.04 * Math.sin(2 * Math.PI * 2.7 * t);
        return v;
    }

    // Alpha/beta oscillations and broadband noise. amplitude is the per-phase
    // scaling factor.
    function backgroundHF(t, amp) {
        if (amp <= 0) return 0;
        var v = 0;
        v += 0.18 * Math.sin(2 * Math.PI * 10.1 * t);
        v += 0.13 * Math.sin(2 * Math.PI * 14.6 * t + 1.2);
        v += 0.09 * Math.sin(2 * Math.PI * 22.0 * t + 2.5);
        v += 0.16 * (rng() * 2 - 1);
        return amp * v;
    }

    // Asymmetric pre-state spike: fast rise (Gaussian σ ≈ 35 ms), slower
    // decay (σ ≈ 80 ms).
    function spikeShape(dt, amp) {
        if (dt < 0) return amp * Math.exp(-(dt / 0.035) * (dt / 0.035));
        return amp * Math.exp(-(dt / 0.080) * (dt / 0.080));
    }

    // Seizure activity: rhythmic sum of harmonics with broadband noise on top.
    // Amplitude is gated by an envelope that ramps in over ~1.5 s and ramps
    // out over the last ~2 s of the seizure phase.
    function seizureWave(t, phaseT) {
        var envelope = Math.min(1, phaseT / 1.5) * Math.min(1, (P_SEIZURE - phaseT) / 2.0);
        if (envelope <= 0) return 0;
        var v = 0;
        v += 1.40 * Math.sin(2 * Math.PI * 3.4 * t);
        v += 0.85 * Math.sin(2 * Math.PI * 6.9 * t + 0.5);
        v += 0.55 * Math.sin(2 * Math.PI * 11.5 * t + 1.2);
        v += 0.35 * Math.sin(2 * Math.PI * 18.3 * t + 2.1);
        v += 0.55 * (rng() * 2 - 1);
        return envelope * v;
    }

    function rawSample(t) {
        var ph = phaseAt(t);
        var bgAmp;
        if (ph.id === 'normal') {
            bgAmp = 0.55;
        } else if (ph.id === 'pre') {
            // Background creeps up slightly through pre.
            bgAmp = 0.55 + 0.20 * (ph.t / ph.dur);
        } else if (ph.id === 'seizure') {
            bgAmp = 1.40;
        } else {
            // Post-ictal suppression — background scaled right down, then
            // recovers in the last second of the recovery phase.
            var recRamp = Math.max(0, ph.t - (P_REC - 1.5)) / 1.5;
            bgAmp = 0.18 + 0.37 * recRamp;
        }

        var v = drift(t) + backgroundHF(t, bgAmp);

        // Pre-state spikes
        for (var i = 0; i < state.spikes.length; i++) {
            var s = state.spikes[i];
            var dt = t - s.t;
            if (dt < -0.20) break;
            if (dt > 0.40) continue;
            v += spikeShape(dt, s.amp);
        }

        // Seizure waveform
        if (ph.id === 'seizure') {
            v += seizureWave(t, ph.t);
        }

        return v;
    }

    function lpfStep(raw, dt) {
        var tau = 1 / (2 * Math.PI * state.fc);
        var a = dt / (tau + dt);
        state.lpf1 += (raw - state.lpf1) * a;
        state.lpf2 += (state.lpf1 - state.lpf2) * a;
        return state.lpf2;
    }

    function step(now) {
        if (!state.last) state.last = now;
        var dt = (now - state.last) / 1000;
        state.last = now;
        if (dt > 0.1) dt = 0.1;
        var nNew = Math.max(1, Math.round(dt * FS));
        var dts = dt / nNew;
        for (var i = 0; i < nNew; i++) {
            state.t += dts;
            ensureScheduledThrough(state.t + 1);
            var raw = rawSample(state.t);
            var filt = lpfStep(raw, dts);
            buf.raw[buf.head] = raw;
            buf.filt[buf.head] = filt;
            buf.t[buf.head] = state.t;
            buf.head = (buf.head + 1) % N;
        }
        for (var k = 0; k < listeners.length; k++) {
            try { listeners[k](); } catch (e) { /* keep loop running */ }
        }
        requestAnimationFrame(step);
    }

    function prefill() {
        var dt = 1 / FS;
        for (var i = 0; i < N; i++) {
            state.t += dt;
            ensureScheduledThrough(state.t + 1);
            var raw = rawSample(state.t);
            var filt = lpfStep(raw, dt);
            buf.raw[buf.head] = raw;
            buf.filt[buf.head] = filt;
            buf.t[buf.head] = state.t;
            buf.head = (buf.head + 1) % N;
        }
    }

    function recent(windowSec) {
        var sec = Math.min(windowSec, HISTORY);
        var cnt = Math.round(sec * FS);
        var out = new Array(cnt);
        for (var i = 0; i < cnt; i++) {
            var idx = (buf.head - cnt + i + N) % N;
            out[i] = { t: buf.t[idx], raw: buf.raw[idx], filt: buf.filt[idx] };
        }
        return out;
    }

    function spikesRecent(windowSec) {
        var minT = state.t - windowSec;
        var out = [];
        for (var i = 0; i < state.spikes.length; i++) {
            if (state.spikes[i].t >= minT && state.spikes[i].t <= state.t) {
                out.push(state.spikes[i]);
            }
        }
        return out;
    }

    // Returns the list of phase bands {id, t0, t1} that intersect the visible
    // window [nowT - windowSec, nowT]. Used by slide 1 to colour the plot.
    function phaseBands(windowSec) {
        var t0 = state.t - windowSec;
        var t1 = state.t;
        // Step through all phase boundaries between t0 and t1.
        var out = [];
        var t = t0;
        while (t < t1) {
            var ph = phaseAt(t);
            var phaseAbsStart = Math.floor(t / CYCLE_LEN) * CYCLE_LEN + ph.start;
            var phaseAbsEnd = phaseAbsStart + ph.dur;
            var seg0 = Math.max(phaseAbsStart, t0);
            var seg1 = Math.min(phaseAbsEnd, t1);
            if (seg1 > seg0) out.push({ id: ph.id, t0: seg0, t1: seg1 });
            t = phaseAbsEnd + 1e-6;
        }
        return out;
    }

    window.EEG = {
        FS: FS,
        HISTORY: HISTORY,
        CYCLE_LEN: CYCLE_LEN,
        get t() { return state.t; },
        get fc() { return state.fc; },
        setCutoff: function (fc) {
            state.fc = Math.max(0.5, fc);
        },
        recent: recent,
        spikesRecent: spikesRecent,
        phaseAt: phaseAt,
        phaseBands: phaseBands,
        onTick: function (cb) { listeners.push(cb); }
    };

    function init() {
        prefill();
        state.last = 0;
        requestAnimationFrame(step);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
