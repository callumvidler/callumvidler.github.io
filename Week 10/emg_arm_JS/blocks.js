// blocks.js  ·  Shared block definitions for the strain-sensing hand case study.
// Exposes window.EMGBlocks: list of the eight signal-processing blocks with a
// canonical order, short descriptions, and short labels for the UI.
// Block ids and canonical order are preserved from the EMG-arm version so the
// per-block transfer functions in signal.js continue to apply unchanged.
(function () {
    // Ten signal-conditioning blocks. The Servo is the chain endcap (the
    // actuator), so it is not a tile here; its mechanical smoothing is
    // applied implicitly after the chain runs.
    var BLOCKS = [
        { id: 'amp',     short: 'AMP', name: 'Bridge Amp',     help: 'Instrumentation amp on the Wheatstone bridge; lifts mV to V.' },
        { id: 'hpf',     short: 'HPF', name: 'High-pass',      help: 'Removes the bridge DC bias and slow thermal drift.' },
        { id: 'bpf',     short: 'BPF', name: 'Band-pass',      help: 'Selects the finger-flexion band, keeping mechanical noise out.' },
        { id: 'notch',   short: 'NCH', name: 'Notch (50 Hz)',  help: 'Narrow band-stop; rejects 50 Hz mains coupling left over from the bridge.' },
        { id: 'rect',    short: 'REC', name: 'Rectifier',      help: 'Full-wave |x|; converts AC strain activity to a magnitude.' },
        { id: 'lpf',     short: 'LPF', name: 'Low-pass',       help: 'Smooths the rectified signal to extract a flexion envelope.' },
        { id: 'peak',    short: 'PKD', name: 'Peak Detector',  help: 'Active envelope detector; charges to the peak fast and decays slowly. Replaces REC + LPF.' },
        { id: 'comp',    short: 'CMP', name: 'Comparator',     help: 'Single-threshold gate; chatters near the threshold under noise.' },
        { id: 'schmitt', short: 'SCH', name: 'Schmitt Trigger',help: 'Hysteretic comparator; clean gating even with a noisy envelope.' },
        { id: 'pwm',     short: 'PWM', name: 'PWM',            help: 'Converts the gated envelope into a servo duty cycle.' }
    ];

    // Canonical chain — eight stages with mains rejection and the
    // rectifier/low-pass envelope path. Peak Detector and Comparator stay
    // in the tray as alternatives (PKD replaces REC+LPF; CMP replaces SCH).
    var CANONICAL = ['amp', 'hpf', 'bpf', 'notch', 'rect', 'lpf', 'schmitt', 'pwm'];

    var BY_ID = {};
    BLOCKS.forEach(function (b, i) { BY_ID[b.id] = { idx: i, def: b }; });

    window.EMGBlocks = {
        list: BLOCKS,
        canonicalOrder: CANONICAL,
        byId: function (id) { return BY_ID[id] ? BY_ID[id].def : null; },
        positionOf: function (id) { return BY_ID[id] ? BY_ID[id].idx : -1; }
    };
})();
