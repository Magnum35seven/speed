(function () {
    'use strict';

    /* ──────────────────────────
       DOM refs
    ────────────────────────── */
    const $ = (id) => document.getElementById(id);

    const elSpd    = $('spd');
    const elFill   = $('barFill');
    const elDot    = $('barDot');
    const elMax    = $('vMax');
    const elDst    = $('vDst');
    const elRoad   = $('road');
    const elClock  = $('clock');
    const elLoader = $('loader');
    const elFlash  = $('flash');
    const bStart   = $('bStart');
    const bReset   = $('bReset');
    const bMirror  = $('bMirror');
    const elMirrorWrap = $('mirrorWrap');

    /* ──────────────────────────
       State
    ────────────────────────── */
    let on       = false;
    let wid      = null;   // geolocation watch id
    let wl       = null;   // wake lock
    let raw      = 0;      // latest speed km/h
    let disp     = 0;      // animated display speed
    let mx       = 0;      // max speed
    let dst      = 0;      // distance km
    let tLat     = null;   // last lat for distance
    let tLon     = null;   // last lon for distance
    let rLat     = null;   // last road-lookup lat
    let rLon     = null;   // last road-lookup lon
    let rT       = 0;      // last road-lookup time
    let fix      = false;  // got first GPS fix

    /* ──────────────────────────
       Colour ramp for speed number
    ────────────────────────── */
    const RAMP = [
        [0, 240, 255],   // cyan
        [0, 255, 136],   // green
        [255, 204, 0],   // yellow
        [255, 102, 0],   // orange
        [255, 0, 68]     // red
    ];

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function rampColour(speed) {
        const p = Math.min(Math.max(speed / 160, 0), 1) * (RAMP.length - 1);
        const i = Math.min(Math.floor(p), RAMP.length - 2);
        const t = p - i;
        const r = Math.round(lerp(RAMP[i][0], RAMP[i + 1][0], t));
        const g = Math.round(lerp(RAMP[i][1], RAMP[i + 1][1], t));
        const b = Math.round(lerp(RAMP[i][2], RAMP[i + 1][2], t));
        return { r, g, b, css: `rgb(${r},${g},${b})` };
    }

    /* ──────────────────────────
       Haversine (km)
    ────────────────────────── */
    function haversine(lat1, lon1, lat2, lon2) {
        const EARTH = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /* ──────────────────────────
       Clock
    ────────────────────────── */
    function tick() {
        const d = new Date();
        elClock.textContent = [d.getHours(), d.getMinutes()]
            .map((n) => String(n).padStart(2, '0'))
            .join(':');
    }
    setInterval(tick, 1000);
    tick();

    /* ──────────────────────────
       Flash message
    ────────────────────────── */
    function flash(msg) {
        elFlash.textContent = msg;
        elFlash.classList.add('on');
        setTimeout(() => elFlash.classList.remove('on'), 1800);
    }

    /* ──────────────────────────
       Wake lock
    ────────────────────────── */
    async function acquireLock() {
        try {
            wl = await navigator.wakeLock.request('screen');
            wl.addEventListener('release', () => {
                wl = null;
            });
        } catch (_) { /* unsupported */ }
    }

    function releaseLock() {
        if (wl) {
            wl.release();
            wl = null;
        }
    }

    // Re-acquire the wake lock whenever the page becomes visible again.
    // The browser auto-releases it on backgrounding (app switch, screen
    // lock, phone call, etc.) — this restores it as soon as we're back
    // in the foreground, as long as tracking is still meant to be on.
    document.addEventListener('visibilitychange', () => {
        if (on && document.visibilityState === 'visible' && !wl) {
            acquireLock();
        }
    });

    /* ──────────────────────────
       Road name (Nominatim — free, no key)
    ────────────────────────── */
    async function fetchRoad(lat, lon) {
        const now = Date.now();
        if (now - rT < 6000) return;                  // throttle
        if (rLat !== null && haversine(rLat, rLon, lat, lon) < 0.005) return;
        rT = now;

        try {
            elRoad.classList.add('scan');
            const url =
                `https://nominatim.openstreetmap.org/reverse` +
                `?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`;
            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en' }
            });
            const data = await res.json();

            if (data.error) {
                elRoad.textContent = '\u2014';
                elRoad.classList.remove('scan');
                return;
            }

            const addr = data.address || {};
            const name =
                addr.road       ||
                addr.pedestrian ||
                addr.footway    ||
                addr.cycleway   ||
                addr.neighbourhood ||
                addr.suburb     ||
                '';

            elRoad.textContent = name || (data.display_name || '').split(',')[0] || '\u2014';
            elRoad.classList.remove('scan');
            rLat = lat;
            rLon = lon;
        } catch (_) {
            elRoad.textContent = 'Signal weak';
            elRoad.classList.remove('scan');
        }
    }

    /* ──────────────────────────
       Geolocation handler
    ────────────────────────── */
    function onPosition(pos) {
        const { latitude: lat, longitude: lon, speed, accuracy } = pos.coords;

        if (accuracy > 50) return;                    // too inaccurate

        if (!fix) {
            fix = true;
            elLoader.classList.add('out');
            flash('GPS LOCKED');
        }

        const kmh = (speed != null && speed >= 0) ? speed * 3.6 : 0;
        raw = Math.round(kmh);

        if (raw > mx) {
            mx = raw;
            elMax.textContent = mx;
        }

        if (raw > 3 && tLat !== null) {
            const d = haversine(tLat, tLon, lat, lon);
            if (d > 0.0005 && d < 0.5) dst += d;
        }

        tLat = lat;
        tLon = lon;
        elDst.textContent = dst < 100 ? dst.toFixed(1) : Math.round(dst);

        fetchRoad(lat, lon);
    }

    function onError(err) {
        if (err.code === 1) {
            elRoad.textContent = 'Location denied';
        }
    }

    /* ──────────────────────────
       Render loop
    ────────────────────────── */
    function frame() {
        // smooth lerp toward raw value
        disp += (raw - disp) * 0.12;
        if (Math.abs(disp - raw) < 0.5) disp = raw;

        const v = Math.round(disp);
        elSpd.textContent = v;

        // bar position
        const pct = Math.min(v / 160 * 100, 100);
        elFill.style.width = pct + '%';
        elDot.style.left   = pct + '%';

        // yellow glow intensity grows with speed
        const glow = Math.min(0.35 + pct / 100 * 0.65, 1);
        elFill.style.boxShadow = `0 0 ${8 + pct * 0.12}px rgba(255,204,0,${glow})`;
        elDot.style.boxShadow  =
            `0 0 10px 3px rgba(255,204,0,${glow}),` +
            `0 0 ${20 + pct * 0.1}px ${4 + pct * 0.04}px rgba(255,204,0,${glow * 0.45})`;

        // speed number colour ramp
        const c = rampColour(v);
        elSpd.style.color      = c.css;
        elSpd.style.textShadow =
            `0 0 18px ${c.css}55, 0 0 50px ${c.css}18`;

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* ──────────────────────────
       Controls
    ────────────────────────── */
    bStart.addEventListener('click', () => {
        if (on) {
            if (wid) navigator.geolocation.clearWatch(wid);
            wid = null;
            on  = false;
            raw = 0;
            bStart.textContent = 'Start';
            bStart.classList.add('go');
            releaseLock();
        } else {
            if (!navigator.geolocation) {
                flash('NO GPS');
                return;
            }
            elRoad.textContent = 'Scanning GPS\u2026';
            elRoad.classList.add('scan');
            wid = navigator.geolocation.watchPosition(onPosition, onError, {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 15000
            });
            on = true;
            bStart.textContent = 'Stop';
            bStart.classList.remove('go');
            acquireLock();
        }
    });

    bReset.addEventListener('click', () => {
        mx  = 0;
        dst = 0;
        elMax.textContent = '0';
        elDst.textContent = '0.0';
        flash('RESET');
    });

    /* ──────────────────────────
       Mirror mode (windshield reflection)
    ────────────────────────── */
    function setMirror(state) {
        elMirrorWrap.classList.toggle('mirrored', state);
        bMirror.classList.toggle('go', state);
        try { localStorage.setItem('hud-mirror', state ? '1' : '0'); } catch (_) {}
    }

    bMirror.addEventListener('click', () => {
        setMirror(!elMirrorWrap.classList.contains('mirrored'));
    });

    try {
        if (localStorage.getItem('hud-mirror') === '1') setMirror(true);
    } catch (_) {}

    /* ──────────────────────────
       Hide loader once fonts ready
    ────────────────────────── */
    document.fonts.ready.then(() => {
        setTimeout(() => {
            if (!fix) elLoader.classList.add('out');
        }, 2000);
    });

    /* ──────────────────────────
       Register service worker
    ────────────────────────── */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

})();