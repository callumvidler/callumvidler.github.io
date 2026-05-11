// handpose.js  ·  Webcam hand-pose tracker via ML5 handPose.
// Converts the 21-keypoint hand skeleton into one curl value in [0,1] per
// finger. The curl is the deficit between cumulative bone length and the
// straight-line distance from wrist to fingertip, normalised so a flat hand
// reads near 0 and a closed fist reads near 1.
//
// Exposes window.HandPose with:
//   start(host)        attach an off-screen video and a visible preview
//                      canvas into `host`, request webcam, load the ml5
//                      model, and start detection.
//   stop()             release the camera and tear down the preview.
//   getStrain(i)       smoothed curl in [0,1] for finger i (0=thumb..4=pinky).
//   getRawStrain(i)    unsmoothed curl in [0,1].
//   update(dt)         step the smoothing filter; call once per render frame.
//   isReady()          true once the model has loaded.
//   isVisible()        true when at least one hand is currently detected.
//   onStatus(cb)       register a status callback receiving short strings
//                      ('idle','starting','model','running','error:...').

(function () {
    var FINGER_CHAINS = [
        [0,  1,  2,  3,  4],   // thumb
        [0,  5,  6,  7,  8],   // index
        [0,  9, 10, 11, 12],   // middle
        [0, 13, 14, 15, 16],   // ring
        [0, 17, 18, 19, 20]    // pinky
    ];
    // Per-finger curl gain. The thumb has a smaller anatomical curl range than
    // the long fingers, so its raw deficit reads low; boost it slightly so a
    // natural thumb flexion drives the simulated channel comparably.
    var FINGER_GAIN = [1.35, 1.0, 1.0, 1.0, 1.0];

    var raw = [0, 0, 0, 0, 0];
    var smoothed = [0, 0, 0, 0, 0];
    var hands = [];
    var visible = false;
    var lastQuat = null;   // {x,y,z,w} computed from the last detected hand

    var model = null;
    var video = null;
    var stream = null;
    var canvas = null, ctx = null;
    var ready = false;
    var status = 'idle';
    var statusCb = null;
    var rafId = null;

    function setStatus(s) {
        if (status === s) return;
        status = s;
        if (statusCb) try { statusCb(s); } catch (e) { }
        if (s.indexOf('error') === 0) console.warn('[HandPose]', s);
        else console.log('[HandPose]', s);
    }

    function dist(a, b) {
        var dx = a.x - b.x, dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ML5 v1 returns hands with `keypoints` (21 objects with .x .y .z .name).
    // Older builds may use `landmarks` (array of [x,y,z] tuples).
    function getKeypoints(hand) {
        if (!hand) return null;
        if (hand.keypoints && hand.keypoints.length >= 21) return hand.keypoints;
        if (hand.landmarks && hand.landmarks.length >= 21) {
            return hand.landmarks.map(function (a) {
                return Array.isArray(a) ? { x: a[0], y: a[1], z: a[2] || 0 } : a;
            });
        }
        return null;
    }

    function fingerCurl(kp, chain) {
        var total = 0;
        for (var i = 0; i < chain.length - 1; i++) {
            total += dist(kp[chain[i]], kp[chain[i + 1]]);
        }
        if (total < 1e-6) return 0;
        var direct = dist(kp[chain[0]], kp[chain[chain.length - 1]]);
        // Straight finger: direct/total approaches 1.
        // Closed fist: direct/total falls toward ~0.45.
        var c = (1 - direct / total) / 0.55;
        if (c < 0) return 0;
        if (c > 1) return 1;
        return c;
    }

    var firstHandLogged = false;
    var totalHandFrames = 0;
    var totalCallbacks = 0;
    var lastCallbackAt = 0;
    function onHands(results) {
        hands = results || [];
        visible = hands.length > 0;
        totalCallbacks++;
        lastCallbackAt = performance.now();
        if (!firstHandLogged) {
            firstHandLogged = true;
            console.log('[HandPose] first detect callback, hands=', hands.length, 'shape=', hands[0]);
        }
        if (!visible) return;
        totalHandFrames++;
        var kp = getKeypoints(hands[0]);
        if (!kp) return;
        for (var f = 0; f < 5; f++) {
            var c = fingerCurl(kp, FINGER_CHAINS[f]) * FINGER_GAIN[f];
            if (c < 0) c = 0;
            if (c > 1) c = 1;
            raw[f] = c;
        }
        lastQuat = computeRotation(hands[0], kp);
    }

    // ─── Hand orientation ───────────────────────────────────────────
    // Build a right-handed basis from the wrist (kp[0]), middle MCP (kp[9]),
    // index MCP (kp[5]) and pinky MCP (kp[17]). We mirror the X axis so the
    // rotation matches the mirrored webcam preview, and flip Y / Z to map
    // ml5's image-space frame (X right, Y down, Z into screen) into the
    // three.js scene frame (X right, Y up, Z toward viewer). Net effect on
    // every coordinate is a sign flip on all three components.
    function computeRotation(hand, kp) {
        var k3 = (hand && (hand.keypoints3D || hand.worldLandmarks)) || null;
        var src = (k3 && k3.length >= 21) ? k3 : kp;
        if (!src) return null;
        function P(i) {
            var p = src[i];
            if (!p) return null;
            return { x: -p.x, y: -p.y, z: -(p.z || 0) };
        }
        var w = P(0), mid = P(9), idx = P(5), pky = P(17);
        if (!w || !mid || !idx || !pky) return null;

        // Y axis: along the hand from wrist to middle-finger MCP.
        var yx = mid.x - w.x, yy = mid.y - w.y, yz = mid.z - w.z;
        var yLen = Math.sqrt(yx * yx + yy * yy + yz * yz);
        if (yLen < 1e-6) return null;
        yx /= yLen; yy /= yLen; yz /= yLen;

        // Provisional X: across the palm from index to pinky MCP. Project
        // out the Y component so X is exactly perpendicular to Y.
        var ux = pky.x - idx.x, uy = pky.y - idx.y, uz = pky.z - idx.z;
        var dot = ux * yx + uy * yy + uz * yz;
        var xx = ux - dot * yx, xy = uy - dot * yy, xz = uz - dot * yz;
        var xLen = Math.sqrt(xx * xx + xy * xy + xz * xz);
        if (xLen < 1e-6) return null;
        xx /= xLen; xy /= xLen; xz /= xLen;

        // Z axis: palm normal = X × Y (right-handed).
        var zx = xy * yz - xz * yy;
        var zy = xz * yx - xx * yz;
        var zz = xx * yy - xy * yx;

        // Rotation matrix with columns [X | Y | Z]. Convert to a unit
        // quaternion using Shepperd's method for numerical stability.
        var trace = xx + yy + zz;
        var qx, qy, qz, qw, s;
        if (trace > 0) {
            s = Math.sqrt(trace + 1.0) * 2;
            qw = 0.25 * s;
            qx = (yz - zy) / s;
            qy = (zx - xz) / s;
            qz = (xy - yx) / s;
        } else if (xx > yy && xx > zz) {
            s = Math.sqrt(1.0 + xx - yy - zz) * 2;
            qw = (yz - zy) / s;
            qx = 0.25 * s;
            qy = (yx + xy) / s;
            qz = (zx + xz) / s;
        } else if (yy > zz) {
            s = Math.sqrt(1.0 + yy - xx - zz) * 2;
            qw = (zx - xz) / s;
            qx = (yx + xy) / s;
            qy = 0.25 * s;
            qz = (zy + yz) / s;
        } else {
            s = Math.sqrt(1.0 + zz - xx - yy) * 2;
            qw = (xy - yx) / s;
            qx = (zx + xz) / s;
            qy = (zy + yz) / s;
            qz = 0.25 * s;
        }
        return { x: qx, y: qy, z: qz, w: qw };
    }

    function drawSpinner(label) {
        var cx = canvas.width / 2;
        var cy = canvas.height / 2;
        var r = Math.min(canvas.width, canvas.height) * 0.07;
        var t = performance.now() / 1000;
        var a = (t * 2.4) % (Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Faint full ring.
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Bright moving arc.
        ctx.strokeStyle = '#7be089';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r, a, a + Math.PI * 1.4);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, cy + r + 22);
        ctx.textAlign = 'start';
    }

    function drawLoop() {
        if (!canvas || !ctx) { rafId = null; return; }
        var hasVideo = video && video.readyState >= 2;
        if (hasVideo) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (visible && hands.length) {
            var kp = getKeypoints(hands[0]);
            if (kp) {
                var mx = function (p) { return canvas.width - p.x; };
                ctx.lineWidth = 2.4;
                ctx.lineCap = 'round';
                var FCOLOR = ['#58a6ff', '#fb923c', '#7be089', '#ff5c7a', '#ffcf5c'];
                for (var f = 0; f < FINGER_CHAINS.length; f++) {
                    var chain = FINGER_CHAINS[f];
                    ctx.strokeStyle = FCOLOR[f];
                    ctx.beginPath();
                    for (var i = 0; i < chain.length; i++) {
                        var p = kp[chain[i]];
                        if (!p) continue;
                        if (i === 0) ctx.moveTo(mx(p), p.y);
                        else ctx.lineTo(mx(p), p.y);
                    }
                    ctx.stroke();
                }
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                for (var k = 0; k < kp.length; k++) {
                    if (!kp[k]) continue;
                    ctx.beginPath();
                    ctx.arc(mx(kp[k]), kp[k].y, 2.6, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }

        // Loading spinner while we wait for the camera or the model.
        if (!ready) {
            var label = 'loading model';
            if (status === 'starting' || !hasVideo) label = 'starting camera';
            drawSpinner(label);
        }

        if (status === 'starting' || status === 'model' || status === 'running') {
            rafId = requestAnimationFrame(drawLoop);
        } else {
            rafId = null;
        }
    }

    function loadModel() {
        // ml5 v1.3.x's `ml5.handPose()` returns a Promise that resolves to
        // the loaded HandPose instance. The p5 example works because p5's
        // preload() awaits it; in plain JS we have to .then() it ourselves.
        var ret;
        try {
            ret = ml5.handPose();
        } catch (e) {
            console.error('[HandPose] handPose constructor failed', e);
            setStatus('error:model');
            return;
        }

        function attach(instance) {
            if (!instance || typeof instance.detectStart !== 'function') {
                console.warn('[HandPose] instance is missing detectStart. instance=', instance);
                setStatus('error:detect');
                return;
            }
            model = instance;
            ready = true;
            setStatus('running');
            try {
                instance.detectStart(video, onHands);
            } catch (e) {
                console.error('[HandPose] detectStart failed', e);
                setStatus('error:detect');
            }
        }

        if (ret && typeof ret.then === 'function') {
            ret.then(attach).catch(function (err) {
                console.error('[HandPose] handPose promise rejected', err);
                setStatus('error:model');
            });
        } else {
            attach(ret);
        }
    }

    function start(host) {
        console.log('[HandPose] start, status=', status, 'ml5=', typeof ml5);
        if (status === 'starting' || status === 'running' || status === 'model') return;
        if (typeof ml5 === 'undefined') {
            setStatus('error:ml5');
            return;
        }
        if (typeof ml5.handPose !== 'function') {
            console.warn('[HandPose] ml5.handPose missing. ml5 keys:', Object.keys(ml5 || {}));
            setStatus('error:ml5');
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus('error:nocam');
            return;
        }

        host.innerHTML = '';

        // The video must remain in the document and decoding frames for ML5
        // to read it; we keep it off-screen rather than display:none.
        video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.style.cssText =
            'position:absolute;left:-99999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
        document.body.appendChild(video);

        canvas = document.createElement('canvas');
        canvas.className = 'handpose-canvas';
        canvas.width = 320;
        canvas.height = 240;
        host.appendChild(canvas);
        ctx = canvas.getContext('2d');

        setStatus('starting');
        navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
            audio: false
        })
            .then(function (s) {
                stream = s;
                video.srcObject = s;
                var started = false;
                function begin() {
                    if (started) return;
                    started = true;
                    canvas.width = video.videoWidth || 320;
                    canvas.height = video.videoHeight || 240;
                    setStatus('model');
                    loadModel();
                    rafId = requestAnimationFrame(drawLoop);
                }
                video.onloadedmetadata = function () {
                    // Some ml5 builds key off video.width / video.height
                    // attributes rather than videoWidth / videoHeight; set
                    // them explicitly so the model receives a sized frame.
                    video.width  = video.videoWidth  || 320;
                    video.height = video.videoHeight || 240;
                    var p = video.play();
                    if (p && typeof p.then === 'function') {
                        p.then(begin).catch(function (err) {
                            console.warn('[HandPose] video.play rejected', err);
                            begin();
                        });
                    } else {
                        begin();
                    }
                };
            })
            .catch(function (err) {
                console.error('[HandPose] getUserMedia error', err);
                setStatus('error:permission');
            });
    }

    function stop() {
        try { if (model && model.detectStop) model.detectStop(); } catch (e) { }
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (stream) {
            stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { } });
            stream = null;
        }
        if (video) {
            try { video.pause(); } catch (e) { }
            if (video.parentNode) video.parentNode.removeChild(video);
            video = null;
        }
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        canvas = null; ctx = null;
        hands = []; visible = false; ready = false;
        for (var i = 0; i < 5; i++) { raw[i] = 0; smoothed[i] = 0; }
        setStatus('idle');
    }

    window.HandPose = {
        start: start,
        stop: stop,
        getStrain:    function (i) { return smoothed[i] || 0; },
        getRawStrain: function (i) { return raw[i] || 0; },
        getRotation:  function () { return visible ? lastQuat : null; },
        update: function (dt) {
            // First-order smoothing; ~0.10 s time constant. When no hand is
            // currently in view, target zero so the robotic hand relaxes to
            // rest rather than holding the last observed curl.
            var a = Math.min(1, dt * 10);
            for (var i = 0; i < 5; i++) {
                var target = visible ? raw[i] : 0;
                smoothed[i] += (target - smoothed[i]) * a;
            }
        },
        isReady:   function () { return ready; },
        isVisible: function () { return visible; },
        onStatus:  function (cb) { statusCb = cb; if (cb) cb(status); }
    };
})();
