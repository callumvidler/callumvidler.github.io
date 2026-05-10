// slide_arm_three.js  ·  Slide 2 (ES module)
// Three.js scene with a five-finger robotic hand. Each finger has three
// phalanges driven by the post-chain output of its strain-sensor channel.
// Per-finger curl angles are derived from window.EMGArm.getDrive(i); when a
// finger is disabled (window.EMGArm.isEnabled(i) === false) it relaxes to
// rest. Finger colours match the trace colours used on the page.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const host = document.getElementById('arm-three');
if (host) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(window.T && window.T.sceneBg ? window.T.sceneBg : 0x111111);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(2.6, 2.4, 3.6);
    camera.lookAt(0, 1.6, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.6, 0);
    controls.minDistance = 2.2;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI * 0.95;

    scene.add(new THREE.AmbientLight(0xffffff, 0.30));
    scene.add(new THREE.HemisphereLight(0xe8ecff, 0x1a1a22, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(4, 6, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9bb6ff, 0.45);
    rim.position.set(-4, 3, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe6c2, 0.20);
    fill.position.set(0, 1, 5);
    scene.add(fill);

    const grid = new THREE.GridHelper(8, 16,
        new THREE.Color(0xffffff).multiplyScalar(0.25),
        new THREE.Color(0xffffff).multiplyScalar(0.10));
    grid.position.y = 0;
    scene.add(grid);

    const matBase     = new THREE.MeshStandardMaterial({ color: 0x1d1f27, roughness: 0.45, metalness: 0.55 });
    const matBody     = new THREE.MeshStandardMaterial({ color: 0x2c2f39, roughness: 0.40, metalness: 0.55 });
    const matJoint    = new THREE.MeshStandardMaterial({ color: 0x6f7682, roughness: 0.30, metalness: 0.75 });
    const matKnuckle  = new THREE.MeshStandardMaterial({ color: 0x55596a, roughness: 0.32, metalness: 0.70 });
    const matAccent   = new THREE.MeshStandardMaterial({ color: 0x8e95a8, roughness: 0.25, metalness: 0.70 });

    const root = new THREE.Group();
    scene.add(root);

    // Pedestal — chamfered base.
    const pedestalTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.50, 0.05, 48),
        matBase
    );
    pedestalTop.position.y = 0.18;
    root.add(pedestalTop);
    const pedestalBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.50, 0.58, 0.16, 48),
        matBase
    );
    pedestalBody.position.y = 0.08;
    root.add(pedestalBody);

    // Wrist — slim tapered shaft with a polished cuff at the palm pivot.
    const wristShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.20, 0.42, 32),
        matBody
    );
    wristShaft.position.y = 0.18 + 0.21;
    root.add(wristShaft);
    const wristRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.025, 12, 32),
        matAccent
    );
    wristRing.rotation.x = Math.PI / 2;
    wristRing.position.y = 0.18 + 0.42 - 0.04;
    root.add(wristRing);
    const wristCuff = new THREE.Mesh(
        new THREE.SphereGeometry(0.20, 32, 24),
        matJoint
    );
    wristCuff.scale.set(1.0, 0.55, 1.0);
    wristCuff.position.y = 0.18 + 0.50;
    root.add(wristCuff);

    // Palm  ·  local +Y is the finger growth axis, +Z is the palm side.
    const palm = new THREE.Group();
    palm.position.y = 0.18 + 0.50;
    root.add(palm);

    // Main palm body — rounded box for a smoother silhouette.
    const palmGeom = new RoundedBoxGeometry(0.82, 0.92, 0.22, 6, 0.10);
    const palmBlock = new THREE.Mesh(palmGeom, matBody);
    palmBlock.position.y = 0.46;
    palm.add(palmBlock);

    // Thenar eminence — the thick muscular pad at the base of the thumb.
    // Bulged forward so its apex reaches z ≈ 0.22, where the thumb's CMC
    // joint sits; the thumb base then visually emerges from the pad.
    const thenarPad = new THREE.Mesh(
        new THREE.SphereGeometry(0.20, 28, 20),
        matBody
    );
    thenarPad.scale.set(0.95, 1.55, 0.72);
    thenarPad.position.set(-0.20, 0.32, 0.08);
    palm.add(thenarPad);

    // Hypothenar eminence — the smaller pad along the pinky-side edge.
    const hypoPad = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 24, 18),
        matBody
    );
    hypoPad.scale.set(0.95, 2.20, 0.55);
    hypoPad.position.set(0.30, 0.42, 0.06);
    palm.add(hypoPad);

    // Metacarpal heads — the four knuckle bumps that show on the back of
    // the hand at the base of each long finger. Slightly staggered in
    // height so the silhouette mirrors a real metacarpal arch.
    const metaPositions = [
        { x: -0.27, y: 0.74 },   // index
        { x: -0.08, y: 0.78 },   // middle (highest)
        { x:  0.11, y: 0.74 },   // ring
        { x:  0.28, y: 0.66 }    // pinky (lowest)
    ];
    for (let i = 0; i < metaPositions.length; i++) {
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 20, 14),
            matBody
        );
        head.scale.set(1.45, 1.05, 1.20);
        head.position.set(metaPositions[i].x, metaPositions[i].y, -0.06);
        palm.add(head);
    }

    // Palm hollow — a small darker inset on the palm side, offset away
    // from the thenar pad so it sits where a real palm hollows out.
    const palmInset = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.46, 0.03, 4, 0.10),
        matBase
    );
    palmInset.position.set(0.06, 0.50, 0.106);
    palm.add(palmInset);

    // Distal palm crease — a fine horizontal line just below the
    // metacarpal arch, approximating the natural skin fold.
    const palmCrease = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.50, 8),
        matBase
    );
    palmCrease.rotation.z = Math.PI / 2;
    palmCrease.position.set(0, 0.66, 0.108);
    palm.add(palmCrease);
    // Proximal palm crease — a shorter line lower down.
    const palmCrease2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.010, 0.34, 8),
        matBase
    );
    palmCrease2.rotation.z = Math.PI / 2 + 0.18;
    palmCrease2.position.set(0.02, 0.46, 0.108);
    palm.add(palmCrease2);

    // Status LED on the dorsal side near the wrist.
    const statusLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 14, 10),
        new THREE.MeshStandardMaterial({
            color: 0x7be089, emissive: 0x7be089, emissiveIntensity: 0.9,
            roughness: 0.3, metalness: 0.1
        })
    );
    statusLed.position.set(0, 0.10, -0.115);
    palm.add(statusLed);

    // ─── Finger builder ──────────────────────────────────────────────
    // Returns { mcp, pip, dip, mat } so the animation loop can rotate each
    // joint and tint the material.
    const FINGER_COLORS = [0x58a6ff, 0xfb923c, 0x7be089, 0xff5c7a, 0xffcf5c];

    // Build a phalanx: a capsule tube along +Y rooted at the parent group
    // origin, with a knuckle sphere at the joint and a small accent ring at
    // the segment's distal end.
    function buildPhalanx(parent, length, width, mat) {
        const r = width * 0.5;
        const cylLen = Math.max(0.01, length - 2 * r);
        const cap = new THREE.Mesh(
            new THREE.CapsuleGeometry(r, cylLen, 8, 18),
            mat
        );
        cap.position.y = length / 2;
        parent.add(cap);
        // Subtle joint band near the distal end.
        const band = new THREE.Mesh(
            new THREE.TorusGeometry(r * 1.02, r * 0.10, 8, 18),
            matAccent
        );
        band.rotation.x = Math.PI / 2;
        band.position.y = length - r * 1.2;
        parent.add(band);
    }

    function makeFinger(parent, basePos, baseEuler, lengths, colorHex, widths) {
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0x3b3f4c, roughness: 0.35, metalness: 0.55
        });
        const tipMat = new THREE.MeshStandardMaterial({
            color: colorHex, roughness: 0.35, metalness: 0.20,
            emissive: colorHex, emissiveIntensity: 0.55
        });
        const accentBandMat = new THREE.MeshStandardMaterial({
            color: colorHex, roughness: 0.50, metalness: 0.30,
            emissive: colorHex, emissiveIntensity: 0.10
        });

        const mcp = new THREE.Group();
        mcp.position.copy(basePos);
        mcp.rotation.set(baseEuler.x, baseEuler.y, baseEuler.z);
        parent.add(mcp);

        // MCP knuckle.
        const k1 = new THREE.Mesh(new THREE.SphereGeometry(widths[0] * 0.62, 20, 14), matKnuckle);
        mcp.add(k1);
        buildPhalanx(mcp, lengths[0], widths[0], skinMat);

        // Coloured ring near the proximal tip — the per-finger identifier.
        const idRing = new THREE.Mesh(
            new THREE.TorusGeometry(widths[0] * 0.55, widths[0] * 0.08, 8, 18),
            accentBandMat
        );
        idRing.rotation.x = Math.PI / 2;
        idRing.position.y = lengths[0] * 0.55;
        mcp.add(idRing);

        const pip = new THREE.Group();
        pip.position.y = lengths[0];
        mcp.add(pip);
        const k2 = new THREE.Mesh(new THREE.SphereGeometry(widths[1] * 0.62, 20, 14), matKnuckle);
        pip.add(k2);
        buildPhalanx(pip, lengths[1], widths[1], skinMat);

        const dip = new THREE.Group();
        dip.position.y = lengths[1];
        pip.add(dip);
        const k3 = new THREE.Mesh(new THREE.SphereGeometry(widths[2] * 0.62, 20, 14), matKnuckle);
        dip.add(k3);
        buildPhalanx(dip, lengths[2], widths[2], skinMat);

        // Glowing fingertip cap — the "sensor pad".
        const tip = new THREE.Mesh(
            new THREE.SphereGeometry(widths[2] * 0.62, 20, 14),
            tipMat
        );
        tip.position.y = lengths[2];
        dip.add(tip);

        return { mcp, pip, dip, mat: skinMat, baseEuler: baseEuler.clone() };
    }

    // ─── Build the five fingers ──────────────────────────────────────
    // Index..Pinky grow straight up from the top of the palm.
    // Thumb grows from the side, tilted out so its curl naturally moves the
    // tip across the palm.
    const fingers = [];

    // Thumb — base sits at the forward apex of the thenar pad so the
    // CMC joint is visually anchored to the muscular pad. The curl
    // plane sits in front of the palm body, so a pure in-plane sweep
    // closes the thumb across the palm without intersecting it.
    fingers.push(makeFinger(
        palm,
        new THREE.Vector3(-0.32, 0.24, 0.20),
        new THREE.Euler(0, 0, 0.85),
        [0.32, 0.24, 0.20],
        FINGER_COLORS[0],
        [0.13, 0.12, 0.10]
    ));
    // Index
    fingers.push(makeFinger(
        palm,
        new THREE.Vector3(-0.27, 0.85, 0.0),
        new THREE.Euler(0, 0, 0.05),
        [0.40, 0.30, 0.22],
        FINGER_COLORS[1],
        [0.13, 0.12, 0.10]
    ));
    // Middle
    fingers.push(makeFinger(
        palm,
        new THREE.Vector3(-0.08, 0.85, 0.0),
        new THREE.Euler(0, 0, 0.0),
        [0.45, 0.32, 0.24],
        FINGER_COLORS[2],
        [0.13, 0.12, 0.10]
    ));
    // Ring
    fingers.push(makeFinger(
        palm,
        new THREE.Vector3(0.11, 0.85, 0.0),
        new THREE.Euler(0, 0, -0.04),
        [0.40, 0.30, 0.22],
        FINGER_COLORS[3],
        [0.12, 0.11, 0.09]
    ));
    // Pinky
    fingers.push(makeFinger(
        palm,
        new THREE.Vector3(0.30, 0.78, 0.0),
        new THREE.Euler(0, 0, -0.10),
        [0.32, 0.24, 0.18],
        FINGER_COLORS[4],
        [0.10, 0.09, 0.08]
    ));

    // ─── Resize ──────────────────────────────────────────────────────
    function resize() {
        const r = host.getBoundingClientRect();
        const w = Math.max(200, r.width);
        const h = Math.max(160, r.height);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    window.addEventListener('resize', resize);

    window.addEventListener('themechange', () => {
        scene.background = new THREE.Color(window.T && window.T.sceneBg ? window.T.sceneBg : 0x111111);
    });

    // ─── Animation loop ──────────────────────────────────────────────
    // The chain output sits in roughly [0, 1] when the canonical order is in
    // place (envelope after the LPF, gated by the comparator, smoothed by the
    // servo block). Each finger's curl is the smoothed drive, mapped to MCP,
    // PIP and DIP rotations with realistic per-joint deflection.
    const DRIVE_FULL = 0.75;
    const driveSmooth = [0, 0, 0, 0, 0];
    let last = performance.now();

    const palmTargetQ  = new THREE.Quaternion();
    const palmCurrentQ = new THREE.Quaternion();
    const palmIdentityQ = new THREE.Quaternion();

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

    function tick(now) {
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;

        // Hand-orientation tracking. When the toggle is on and a hand is
        // visible, slerp the palm group toward the detected quaternion;
        // otherwise ease back to the identity rest pose.
        const rotOn = window.EMGArm && window.EMGArm.isRotationEnabled && window.EMGArm.isRotationEnabled();
        const r = rotOn && window.HandPose ? window.HandPose.getRotation() : null;
        if (r) {
            palmTargetQ.set(r.x, r.y, r.z, r.w).normalize();
        } else {
            palmTargetQ.copy(palmIdentityQ);
        }
        palmCurrentQ.slerp(palmTargetQ, Math.min(1, dt * 5));
        palm.quaternion.copy(palmCurrentQ);

        for (let i = 0; i < fingers.length; i++) {
            const target = window.EMGArm
                ? (window.EMGArm.isEnabled(i) ? window.EMGArm.getDrive(i) : 0)
                : 0;
            driveSmooth[i] += (target - driveSmooth[i]) * Math.min(1, dt * 6);

            const c = clamp(driveSmooth[i] / DRIVE_FULL, 0, 1.1);
            const f = fingers[i];

            const mcpAngle = c * 1.10;
            const pipAngle = c * 1.45;
            const dipAngle = c * 0.95;

            if (i === 0) {
                // Thumb closure is essentially a planar motion when
                // viewed from the palm side: the segments sweep across
                // the palm in the XY plane. Because the thumb base sits
                // forward of the palm body (on the thenar apex at
                // z≈0.20), pure Z-axis rotation at every joint folds
                // the thumb across the palm without lifting it off the
                // palm and without intersecting it.
                f.mcp.rotation.z = f.baseEuler.z - mcpAngle * 0.55;
                f.mcp.rotation.x = 0;
                f.pip.rotation.z = -pipAngle * 0.50;
                f.pip.rotation.x = 0;
                f.dip.rotation.z = -dipAngle * 0.45;
                f.dip.rotation.x = 0;
            } else {
                f.mcp.rotation.x = f.baseEuler.x + mcpAngle;
                f.pip.rotation.x = pipAngle;
                f.dip.rotation.x = dipAngle;
            }

            // Dim disabled fingers a little so the user can see which are off.
            const targetEmissive = (window.EMGArm && !window.EMGArm.isEnabled(i)) ? 0.0 : 0.0;
            void targetEmissive;
            const targetOpacity = (window.EMGArm && !window.EMGArm.isEnabled(i)) ? 0.35 : 1.0;
            if (f.mat.opacity !== targetOpacity) {
                f.mat.transparent = targetOpacity < 1.0;
                f.mat.opacity = targetOpacity;
                f.mat.needsUpdate = true;
            }
        }

        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
