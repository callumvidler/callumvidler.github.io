// Wires the division scene. Mirrors plot_multiplication.js with the
// quotient rule in place of the product rule.
(function () {
    const DEG = Math.PI / 180;

    const initial = {
        r1: 1.40, t1: 80 * DEG,
        r2: 0.90, t2: 40 * DEG
    };

    const state = {
        r1: initial.r1, t1: initial.t1,
        r2: initial.r2, t2: initial.t2,
        unitLock: false
    };

    const btnAnim = document.getElementById('div-animate');
    const btnUnit = document.getElementById('div-unit');
    const btnReset = document.getElementById('div-reset');
    const tbody = document.getElementById('div-readout');

    function fmtAngle(rad) {
        let d = rad * 180 / Math.PI;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        const sign = d >= 0 ? '+' : '−';
        return sign + Math.abs(d).toFixed(0) + '°';
    }

    function fmtCart(re, im) {
        const s = im >= 0 ? '+' : '−';
        return re.toFixed(2) + ' ' + s + ' ' + Math.abs(im).toFixed(2) + 'i';
    }

    function updateReadout() {
        const z1re = state.r1 * Math.cos(state.t1);
        const z1im = state.r1 * Math.sin(state.t1);
        const z2re = state.r2 * Math.cos(state.t2);
        const z2im = state.r2 * Math.sin(state.t2);
        const rR = state.r1 / state.r2;
        const tR = state.t1 - state.t2;
        const rRe = rR * Math.cos(tR);
        const rIm = rR * Math.sin(tR);

        tbody.innerHTML =
            '<tr class="r-z1"><td class="lab">z₁</td><td>' + state.r1.toFixed(2) + '</td><td>'
            + fmtAngle(state.t1) + '</td><td>' + fmtCart(z1re, z1im) + '</td></tr>'
            + '<tr class="r-z2"><td class="lab">z₂</td><td>' + state.r2.toFixed(2) + '</td><td>'
            + fmtAngle(state.t2) + '</td><td>' + fmtCart(z2re, z2im) + '</td></tr>'
            + '<tr class="r-out"><td class="lab">z₁/z₂</td><td>'
            + state.r1.toFixed(2) + ' / ' + state.r2.toFixed(2) + ' = ' + rR.toFixed(2)
            + '</td><td>' + fmtAngle(state.t1) + ' − ' + fmtAngle(state.t2) + ' = ' + fmtAngle(tR)
            + '</td><td>' + fmtCart(rRe, rIm) + '</td></tr>';
    }

    const plot = window.createArgandPlot({
        selector: '#plot-div',
        mode: 'div',
        state: state,
        onChange: updateReadout
    });

    btnAnim.addEventListener('click', function () { plot.animate(); });

    btnUnit.addEventListener('click', function () {
        state.unitLock = !state.unitLock;
        btnUnit.classList.toggle('active', state.unitLock);
        if (state.unitLock) { state.r2 = 1.0; updateReadout(); plot.render(); }
    });

    btnReset.addEventListener('click', function () {
        state.r1 = initial.r1; state.t1 = initial.t1;
        state.r2 = initial.r2; state.t2 = initial.t2;
        state.unitLock = false;
        btnUnit.classList.remove('active');
        updateReadout();
        plot.render();
    });

    updateReadout();
})();
