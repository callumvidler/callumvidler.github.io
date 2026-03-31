(function () {
    var saved = localStorage.getItem('theme');
    var theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // Theme-aware color helper for canvas/JS drawing code.
    // Usage: T.text, T.grid, T.plotBg, etc. Always reads live theme.
    window.T = {
        get isDark() { return document.documentElement.getAttribute('data-theme') !== 'light'; },
        // Plot / canvas backgrounds
        get plotBg()     { return this.isDark ? 'rgba(0,0,0,0.85)'       : 'rgba(245,245,247,0.95)'; },
        get plotBg2()    { return this.isDark ? 'rgba(0,0,0,0.9)'        : 'rgba(240,240,242,0.95)'; },
        get panelBg()    { return this.isDark ? 'rgba(20,20,20,0.85)'    : 'rgba(255,255,255,0.92)'; },
        get panelBg2()   { return this.isDark ? 'rgba(30,30,35,0.9)'     : 'rgba(248,248,250,0.95)'; },
        get cardBg()     { return this.isDark ? 'rgba(26,26,30,0.85)'    : 'rgba(248,248,250,0.95)'; },
        // Grid lines
        get gridFine()   { return this.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'; },
        get gridLight()  { return this.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'; },
        get grid()       { return this.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'; },
        get gridMed()    { return this.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; },
        get gridStrong() { return this.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'; },
        get gridBold()   { return this.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'; },
        get gridHeavy()  { return this.isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.25)'; },
        get gridAxis()   { return this.isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.35)'; },
        get gridMax()    { return this.isDark ? 'rgba(255,255,255,0.5)'  : 'rgba(0,0,0,0.4)'; },
        // Text
        get text()       { return this.isDark ? '#ffffff' : '#1a1a1e'; },
        get textLight()  { return this.isDark ? '#e2e8f0' : '#2a2a2f'; },
        get textSub()    { return this.isDark ? '#cccccc' : '#333333'; },
        get textMid()    { return this.isDark ? '#bbbbbb' : '#444444'; },
        get textDim()    { return this.isDark ? '#aaaaaa' : '#555555'; },
        get textDimmer() { return this.isDark ? '#999999' : '#555555'; },
        get textMuted()  { return this.isDark ? '#888888' : '#666666'; },
        get textFaint()  { return this.isDark ? '#777777' : '#666666'; },
        get textQuiet()  { return this.isDark ? '#666666' : '#777777'; },
        get textSlate()  { return this.isDark ? '#8892a4' : '#555555'; },
        get textGray()   { return this.isDark ? '#505868' : '#777777'; },
        // Overlays (white on dark, dark on light)
        get overlay02()  { return this.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'; },
        get overlay03()  { return this.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'; },
        get overlay05()  { return this.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; },
        get overlay08()  { return this.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; },
        get overlay10()  { return this.isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.1)'; },
        get overlay15()  { return this.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'; },
        get overlay20()  { return this.isDark ? 'rgba(255,255,255,0.2)'  : 'rgba(0,0,0,0.15)'; },
        get overlay25()  { return this.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'; },
        get overlay30()  { return this.isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.2)'; },
        get overlay35()  { return this.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'; },
        get overlay40()  { return this.isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.3)'; },
        get overlay50()  { return this.isDark ? 'rgba(255,255,255,0.5)'  : 'rgba(0,0,0,0.35)'; },
        get overlay60()  { return this.isDark ? 'rgba(255,255,255,0.6)'  : 'rgba(0,0,0,0.45)'; },
        get overlay70()  { return this.isDark ? 'rgba(255,255,255,0.7)'  : 'rgba(0,0,0,0.55)'; },
        get overlay80()  { return this.isDark ? 'rgba(255,255,255,0.8)'  : 'rgba(0,0,0,0.7)'; },
        // Dynamic foreground alpha: T.fg(0.5) -> 'rgba(255,255,255,0.5)' or 'rgba(0,0,0,0.5)'
        fg: function(a) { return this.isDark ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'; },
        // Three.js scene background
        get sceneBg()    { return this.isDark ? 0x111111 : 0xf0f0f2; },
        get sceneBg2()   { return this.isDark ? 0x1a1a1e : 0xf5f5f7; },
        // Wire / stroke colors for circuit diagrams
        get wire()       { return this.isDark ? '#ffffff' : '#1a1a1e'; },
        get wireDim()    { return this.isDark ? '#cccccc' : '#444444'; },
        // Canvas clear color (for fillRect backgrounds)
        get canvasBg()   { return this.isDark ? '#111111' : '#f0f0f2'; },
        get canvasBg2()  { return this.isDark ? '#1a1a1e' : '#f5f5f7'; },
        // Semantic accent: yellow/gold (bright on dark, dark goldenrod on light)
        get yellow()     { return this.isDark ? '#ffcc44' : '#b8860b'; },
        get yellow2()    { return this.isDark ? '#ffc832' : '#b8860b'; },
        get yellow3()    { return this.isDark ? '#ffd700' : '#b8860b'; },
        get yellowF()    { return this.isDark ? '#f59e0b' : '#b57600'; },
        yellowA: function(a) { return this.isDark ? 'rgba(255,204,68,' + a + ')' : 'rgba(184,134,11,' + a + ')'; },
        // Three.js yellow (hex int)
        get yellow3js()  { return this.isDark ? 0xffd700 : 0xb8860b; },
        get yellow3js2() { return this.isDark ? 0xffc832 : 0xb8860b; },
        get yellow3js3() { return this.isDark ? 0xffcc44 : 0xb8860b; },
        // Dark overlay backgrounds (used for some plot regions)
        get darkOverlay() { return this.isDark ? 'rgba(0,0,0,0.45)' : 'rgba(245,245,247,0.6)'; },
        get darkOverlay2(){ return this.isDark ? 'rgba(0,0,0,0.5)'  : 'rgba(240,240,242,0.65)'; },
    };

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.createElement('button');
        btn.id = 'theme-toggle';
        btn.setAttribute('aria-label', 'Toggle light/dark mode');

        function setIcon(t) {
            btn.innerHTML = t === 'dark'
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        }
        setIcon(theme);

        var style = document.createElement('style');
        style.textContent = '#theme-toggle{position:fixed;top:12px;right:12px;z-index:9999;width:34px;height:34px;border-radius:8px;border:1px solid rgba(128,128,128,0.3);background:rgba(128,128,128,0.15);backdrop-filter:blur(8px);color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;padding:0;}#theme-toggle:hover{background:rgba(128,128,128,0.3);border-color:rgba(128,128,128,0.5);}';
        document.head.appendChild(style);
        document.body.appendChild(btn);

        btn.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            setIcon(next);
            // Dispatch event so pages can redraw canvases with new colors
            window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
        });
    });
})();
