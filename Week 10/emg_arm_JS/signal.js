// signal.js  ·  Synthetic strain-bridge signal source and per-block chain.
// Exposes window.EMGSignal with:
//   makeChainRunner()  -> independent chain runner with rolling buffers
// Each runner samples a synthetic Wheatstone-bridge signal at FS=2000 Hz over
// a 2 s rolling window. The bridge output combines a small DC bias, an AC
// strain-activity component whose amplitude scales with the finger curl, mains
// interference, and broadband noise.
(function () {
    var FS = 2000;
    var T_WIN = 2.0;
    var BUF = Math.round(FS * T_WIN);

    // ─── Synthetic strain-bridge source ─────────────────────────────
    function makeSource() {
        var phase50 = 0;
        var driftPhase = 0;
        return function step(dt, params) {
            phase50 += 2 * Math.PI * 50 * dt;
            driftPhase += 2 * Math.PI * 0.4 * dt;
            var strain = params.strain;       // 0..1 finger curl
            var fc = params.fc;               // centre of strain-activity band (Hz)
            // AC activity in the bridge as the strained beam vibrates and the
            // user's finger micro-tremors modulate the gauge resistance. Six
            // randomly-phased tones fake band-limited noise around fc.
            var ac = 0;
            for (var k = 0; k < 6; k++) {
                var f = fc * (0.6 + 0.15 * k);
                ac += (Math.random() - 0.5) * Math.sin(2 * Math.PI * f * Math.random());
            }
            ac *= 0.4 * (0.05 + strain);
            // Slow temperature/posture drift on the bridge bias.
            var drift = 0.05 * Math.sin(driftPhase);
            // Bridge DC bias, plus a small strain-proportional offset.
            var dcBias = 0.18 + 0.10 * strain;
            // 50 Hz mains coupling.
            var mains = 0.03 * Math.sin(phase50);
            // Broadband electronic noise.
            var noise = 0.02 * (Math.random() - 0.5);
            return dcBias + drift + ac + mains + noise;
        };
    }

    // ─── Per-block transfer functions ───────────────────────────────
    function makeBlockState() {
        return {
            amp:     { },
            hpf:     { y: 0, x_prev: 0 },
            bpf:     { lp: 0, hp_y: 0, hp_x: 0 },
            notch:   { x1: 0, x2: 0, y1: 0, y2: 0 },
            rect:    { },
            lpf:     { y: 0 },
            peak:    { y: 0 },
            comp:    { },
            schmitt: { y: 0 },
            pwm:     { phase: 0 },
            servo:   { y: 0 }    // implicit actuator endpoint
        };
    }

    var GAIN = 80;       // bridge instrumentation amp gain
    var HPF_FC = 1.5;    // Hz, removes DC bias and thermal drift
    var BPF_LO = 1.5;    // Hz
    var BPF_HI = 500;    // Hz
    var LPF_FC = 6;      // Hz, envelope detector
    var COMP_TH = 0.18;
    var COMP_HYST = 0.05;
    var PWM_FREQ = 60;   // Hz pulse rate

    // Notch filter (biquad) at 50 Hz. Coefficients are pre-computed for
    // the fixed sample rate so the per-sample inner loop stays cheap.
    var NOTCH_F   = 50;
    var NOTCH_Q   = 8;
    var _nW0 = 2 * Math.PI * NOTCH_F / FS;
    var _nA  = Math.sin(_nW0) / (2 * NOTCH_Q);
    var _nC  = Math.cos(_nW0);
    var _nA0 = 1 + _nA;
    var NB0 =  1 / _nA0;
    var NB1 = -2 * _nC / _nA0;
    var NB2 =  1 / _nA0;
    var NA1 = -2 * _nC / _nA0;
    var NA2 = (1 - _nA) / _nA0;

    // Peak detector decay (passive-style): time constant of the resistor /
    // capacitor leak that pulls the held peak back down toward zero.
    var PEAK_TAU = 0.10;

    function alpha(fc, dt) {
        var rc = 1 / (2 * Math.PI * fc);
        return dt / (rc + dt);
    }

    function applyBlock(id, x, st, dt) {
        var s = st[id];
        var a;
        switch (id) {
            case 'amp':
                return GAIN * x;
            case 'hpf': {
                a = 1 - alpha(HPF_FC, dt);
                var y = a * (s.y + x - s.x_prev);
                s.x_prev = x;
                s.y = y;
                return y;
            }
            case 'bpf': {
                a = 1 - alpha(BPF_LO, dt);
                var hp = a * (s.hp_y + x - s.hp_x);
                s.hp_x = x;
                s.hp_y = hp;
                var aL = alpha(BPF_HI, dt);
                s.lp = s.lp + aL * (hp - s.lp);
                return s.lp;
            }
            case 'notch': {
                // Direct-form-I biquad: y = b0*x + b1*x1 + b2*x2 - a1*y1 - a2*y2
                var ny = NB0 * x + NB1 * s.x1 + NB2 * s.x2
                       - NA1 * s.y1 - NA2 * s.y2;
                s.x2 = s.x1; s.x1 = x;
                s.y2 = s.y1; s.y1 = ny;
                return ny;
            }
            case 'rect':
                return Math.abs(x);
            case 'lpf':
                a = alpha(LPF_FC, dt);
                s.y = s.y + a * (x - s.y);
                return s.y;
            case 'peak': {
                // Active-style peak detector: charges instantly to |x|
                // when the input exceeds the held value, then leaks down
                // exponentially with PEAK_TAU.
                var ax = Math.abs(x);
                if (ax > s.y) {
                    s.y = ax;
                } else {
                    var d = dt / PEAK_TAU;
                    s.y -= s.y * d;
                    if (s.y < 0) s.y = 0;
                }
                return s.y;
            }
            case 'comp':
                // Plain single-threshold comparator (no hysteresis).
                // Chatters near threshold when the input is noisy.
                return x > COMP_TH ? 1 : 0;
            case 'schmitt': {
                // Hysteretic comparator (Schmitt trigger).
                var on = s.y > 0.5;
                if (!on && x > COMP_TH + COMP_HYST) on = true;
                else if (on && x < COMP_TH - COMP_HYST) on = false;
                s.y = on ? 1 : 0;
                return s.y;
            }
            case 'pwm': {
                s.phase += PWM_FREQ * dt;
                if (s.phase >= 1) s.phase -= 1;
                var duty = Math.max(0, Math.min(1, x));
                return s.phase < duty ? 1 : 0;
            }
            case 'servo': {
                // Mechanical first-order response of the servo.  Raised
                // from a textbook ~3 Hz to 25 Hz so that bridge-band
                // noise still reaches the output when the upstream chain
                // is empty or incomplete; the chain's LPF / peak detector
                // is then visibly responsible for the smoothing.
                a = alpha(25, dt);
                s.y = s.y + a * (x - s.y);
                return s.y;
            }
        }
        return x;
    }

    // ─── Live chain runner ───────────────────────────────────────────
    function makeChainRunner() {
        var src = makeSource();
        var st = makeBlockState();
        var bufs = {
            raw:   new Float32Array(BUF),    // unprocessed bridge signal
            env:   new Float32Array(BUF),    // post-LPF envelope (or final if no LPF)
            drive: new Float32Array(BUF)     // final post-chain signal
        };
        var head = 0;

        function step(dt, order, params) {
            var x = src(dt, params);
            bufs.raw[head] = x;

            var v = x;
            var envCapture = null;
            for (var i = 0; i < order.length; i++) {
                v = applyBlock(order[i], v, st, dt);
                // Capture the envelope at the LPF output, or at the peak
                // detector output when that path is used instead.
                if (order[i] === 'lpf' || order[i] === 'peak') envCapture = v;
            }
            if (envCapture === null) envCapture = v;
            // Implicit actuator endpoint: the servo's mechanical first-
            // order response is always present, regardless of whether the
            // upstream chain produced something sensible.
            v = applyBlock('servo', v, st, dt);
            bufs.env[head] = envCapture;
            bufs.drive[head] = v;
            head = (head + 1) % BUF;
            return { x: x, env: envCapture, drive: v };
        }

        function read(arr) {
            var out = new Float32Array(BUF);
            for (var i = 0; i < BUF; i++) out[i] = arr[(head + i) % BUF];
            return out;
        }

        return {
            step: step,
            read: function () {
                return { raw: read(bufs.raw), env: read(bufs.env), drive: read(bufs.drive) };
            },
            reset: function () {
                src = makeSource();
                st = makeBlockState();
                head = 0;
                bufs.raw.fill(0); bufs.env.fill(0); bufs.drive.fill(0);
            }
        };
    }

    window.EMGSignal = {
        FS: FS,
        T_WIN: T_WIN,
        BUF: BUF,
        makeChainRunner: makeChainRunner
    };
})();
