# BJT Semiconductors — Fundamental Operation

**Date:** 2026-03-22
**File:** `Week 4/bjt_semiconductors.html`
**Purpose:** Interactive teaching tool showing how NPN and PNP BJTs work at the fundamental semiconductor level — doping, carriers, depletion regions, and the effect of base current.

---

## Page Structure

- **Style:** Week 4 layout (matches `bjt_switch.html` and `bjt_amplifier.html`)
- **Header:** Back button, title "BJT Semiconductors — Fundamental Operation", subtitle "BMEN90033 · Week 4"
- **Layout:** 4-panel grid (`grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr`, `height: calc(100vh - 42px)`)
- **Fonts:** IBM Plex Sans + IBM Plex Mono (Google Fonts)
- **Theme:** Same CSS variables as bjt_switch (`--bg-deep: #1a1a1e`, `--bg-panel: #222226`, etc.)
- **Self-contained:** Single HTML file, all CSS and JS inline, no dependencies beyond Google Fonts

---

## Panel 1: Top-Left — Transistor Cross-Section

Canvas-drawn 2D cross-section of the BJT.

### Three Doped Regions
- **Emitter (E):** Heavily doped (N⁺ for NPN, P⁺ for PNP). Red-tinted for N-type, blue-tinted for P-type.
- **Base (B):** Lightly doped, drawn visibly thinner than E and C. Opposite type to E and C.
- **Collector (C):** Moderately doped, wider region. Same type as E.
- Each region labeled with doping type and dopant species (e.g., "N⁺ Phosphorus", "P Boron", "N Phosphorus").

### Depletion Regions
- Semi-transparent shaded zones at BE and BC junctions.
- Width changes with bias:
  - BE: narrows as I_B increases (forward bias)
  - BC: widens under reverse bias (active), narrows in saturation
- Clear boundary lines marking depletion edges.

### Fixed Ions (in depletion regions)
- Donor ions: small "+" symbols (exposed positive charge)
- Acceptor ions: small "−" symbols (exposed negative charge)

### Mobile Carriers (animated particles)
- **Electrons:** Small filled yellow dots
- **Holes:** Small open pink/magenta circles
- Behavior by operating region:
  - **Cutoff (I_B = 0):** Carriers remain in majority regions, no flow across junctions
  - **Active (low-moderate I_B):** Electrons injected from emitter into base, most diffuse across thin base to collector (collected by BC field), a few recombine in base (disappear — this IS the base current)
  - **Saturation (high I_B):** Heavy carrier flow, both junctions forward biased, carriers injected from both sides, excess carriers accumulate in base

### Terminal Labels
- E, B, C labels with wire stubs at top/bottom of diagram.

---

## Panel 2: Top-Right — Carrier Concentration Plot

Canvas-drawn plot of carrier concentration vs position.

- **X-axis:** Position from Emitter through Base to Collector. Vertical dashed lines at the two junctions.
- **Y-axis:** Log-scale carrier concentration.
- **Two curves:**
  - n(x) in yellow — electron concentration
  - p(x) in pink/magenta — hole concentration
- **Cutoff:** Flat majority carrier levels in each region, very low minority carriers (thermal equilibrium).
- **Active:** Exponential minority carrier injection at BE junction. Linear decay of minority electrons across thin base (diffusion gradient). Slight extraction at BC junction.
- **Saturation:** Minority carrier injection at both junctions, excess carriers throughout base.
- Curves update smoothly as I_B slider changes.
- Grey vertical shaded bands for depletion regions, matching cross-section panel.

---

## Panel 3: Bottom-Left — Controls & Legend

### NPN / PNP Toggle
- Two-button toggle (same style as bjt_switch toggle buttons).
- Switching flips: all doping labels/colors, carrier types, concentration curves, explanation text, current direction arrows.

### Base Current Slider
- Label: I_B
- Range: 0 to max
- Numeric readout of current value
- Status label indicating operating region: Cutoff / Active / Saturation

### Animation Control
- Play/Pause toggle for carrier movement

### Legend
- Yellow filled dot = Electron
- Pink open circle = Hole
- "+" = Fixed donor ion (exposed)
- "−" = Fixed acceptor ion (exposed)
- Shaded band = Depletion region
- Color key for N-type vs P-type regions

---

## Panel 4: Bottom-Right — Dynamic Explanation

Text panel that updates based on transistor type + I_B level.

### Cutoff (I_B = 0)
> No base current is applied. The base-emitter junction is unbiased, so no minority carriers are injected into the base. Both depletion regions are at their equilibrium width. The transistor is OFF — no collector current flows. In the [NPN/PNP], the emitter's majority [electrons/holes] remain confined to the emitter region.

### Active (moderate I_B)
> A small forward bias is applied to the base-emitter junction, narrowing its depletion region. Majority [electrons/holes] from the heavily-doped emitter are injected into the thin, lightly-doped base as minority carriers. Because the base is very thin, most injected carriers diffuse across before they can recombine with majority carriers in the base. They reach the base-collector depletion region, where the electric field sweeps them into the collector. A small base current controls a much larger collector current — this is transistor action. The few carriers that DO recombine in the base are what constitute the base current I_B. The ratio I_C/I_B ≈ β (current gain, typically 50-300).

### Saturation (high I_B)
> The base current is large enough that both the base-emitter AND base-collector junctions are forward biased. Carriers are injected from both sides into the base. The collector current no longer increases proportionally with base current — the transistor is saturated. Excess minority carriers accumulate in the base region (stored charge), visible in the carrier concentration plot as elevated minority concentration across the entire base.

Each state includes physical mechanism notes (diffusion, drift, recombination).

---

## Scientific Accuracy Requirements

1. **Doping asymmetry:** Emitter heavily doped (N⁺/P⁺), base lightly doped and thin, collector moderately doped and wide.
2. **Thin base is critical:** Most carriers transit without recombining. Base width visibly thinner in drawing.
3. **Asymmetric injection:** Because emitter >> base doping, injection is predominantly emitter→base in active mode.
4. **Base current = recombination:** The small fraction of injected carriers that recombine in the base constitutes I_B. Show a few carriers disappearing.
5. **PNP mirrors NPN:** All carrier types, current directions, and voltage polarities flip. Holes become injected minority carriers.
6. **Depletion widths:** BE narrows under forward bias; BC widens under reverse bias (active mode), narrows in saturation.
7. **Carrier concentration profile:** Must show correct exponential injection at forward-biased junction, linear minority decay across base (diffusion), and extraction at reverse-biased junction.

---

## Index Page Update

Add entry to Week 4 section in `index.html` as a "Preface" item (similar to Week 3's Electron Cloud Model), since this covers the fundamentals before the switch/amplifier pages:

```html
<a href="Week 4/bjt_semiconductors.html" class="topic">
    <span class="topic-number" style="width:auto;margin-right:8px">Preface</span>
    <span class="topic-title">BJT Semiconductors</span>
</a>
```

Inserted before the existing "BJT as a Switch" entry.
