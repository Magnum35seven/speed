// Persistent Unit Logic & State
let currentUnit = localStorage.getItem('speedUnit') || 'kmh';
let currentSpeedMps = 0;
let isHudFlipped = false;
let maxSpeedMps = 0;
let totalDistanceKm = 0;
let lastLat = null;
let lastLon = null;

// DOM element references (populated on DOMContentLoaded)
let speedValEls = null;
let unitLblEls = null;
let unitToggleBtn = null;
let hudToggleBtn = null;
let resetBtn = null;
let needleEl = null;
let sportBarEl = null;
let clockEl = null;
let roadNameEl = null;
let suburbNameEl = null;
let modeButtons = null;
let modeViews = null;
let maxSpeedEl = null;
let maxSpeedUnitEl = null;
let distanceEl = null;
let distanceUnitEl = null;

// App Initialization after DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    // Query DOM elements now that the document is ready
    speedValEls = document.querySelectorAll('.speed-val');
    unitLblEls = document.querySelectorAll('.unit-lbl');
    unitToggleBtn = document.getElementById('unit-toggle');
    hudToggleBtn = document.getElementById('hud-toggle');
    resetBtn = document.getElementById('reset-btn');
    needleEl = document.getElementById('needle');
    sportBarEl = document.getElementById('sport-bar');
    clockEl = document.getElementById('clock');
    roadNameEl = document.getElementById('road-name');
    suburbNameEl = document.getElementById('suburb-name');
    modeButtons = document.querySelectorAll('.mode-btn[data-mode]');
    modeViews = document.querySelectorAll('.mode-view');
    maxSpeedEl = document.getElementById('max-speed');
    maxSpeedUnitEl = document.getElementById('max-speed-unit');
    distanceEl = document.getElementById('distance');
    distanceUnitEl = document.getElementById('distance-unit');

    // Ensure UI matches persisted unit and initial rendering
    updateUnitUI();
    startClock();
    initModes();
    initControls();
    initGeolocation();

    // Render initial zero speed so all views show a default value
    renderSpeed(currentSpeedMps);
});

// Event Controls Setup
function initControls() {
    // 1. KM/H <-> MPH Toggle Button with Persistence
    if (unitToggleBtn) {
        unitToggleBtn.addEventListener('click', () => {
            currentUnit = currentUnit === 'kmh' ? 'mph' : 'kmh';
            localStorage.setItem('speedUnit', currentUnit);
            updateUnitUI();
            renderSpeed(currentSpeedMps);
        });
    }

    // 2. HUD Mirror Screen Toggle
    if (hudToggleBtn) {
        hudToggleBtn.addEventListener('click', () => {
            isHudFlipped = !isHudFlipped;
            document.body.style.transform = isHudFlipped ? 'scaleX(-1)' : 'none';
            hudToggleBtn.style.backgroundColor = isHudFlipped ? '#007aff' : '#1a1b1e';
            hudToggleBtn.style.color = isHudFlipped ? '#ffffff' : '#007aff';
        });
    }

    // 3. Reset Button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset to zero and reset stats
            currentSpeedMps = 0;
            maxSpeedMps = 0;
            totalDistanceKm = 0;
            lastLat = null;
            lastLon = null;
            renderSpeed(0);
            updateStats();
        });
    }
}

function updateUnitUI() {
    const label = currentUnit === 'kmh' ? 'KM/H' : 'MPH';
    if (unitToggleBtn) unitToggleBtn.textContent = label;
    if (unitLblEls && unitLblEls.forEach) unitLblEls.forEach(el => el.textContent = label);
    if (maxSpeedUnitEl) maxSpeedUnitEl.textContent = label;
    updateStats();
}

// Mode Selection Switching (Analog, Minimalist, Sport)
function initModes() {
    if (!modeButtons || modeButtons.length === 0) return;

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedMode = btn.getAttribute('data-mode');

            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (modeViews) {
                modeViews.forEach(view => {
                    view.classList.remove('active');
                    if (view.id === `${selectedMode}-view`) {
                        view.classList.add('active');
                    }
                });
            }
        });
    });

    // If no mode is active, activate the first one (fallback)
    const anyActive = Array.from(modeButtons).some(b => b.classList.contains('active'));
    if (!anyActive) {
        const first = modeButtons[0];
        first.classList.add('active');
        const selectedMode = first.getAttribute('data-mode');
        if (modeViews) {
            modeViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === `${selectedMode}-view`) view.classList.add('active');
            });
        }
    }
}

function renderSpeed(speedMps) {
    currentSpeedMps = speedMps;
    if (speedMps === null || isNaN(speedMps) || speedMps < 0) speedMps = 0;

    // Track max speed
    if (speedMps > maxSpeedMps) {
        maxSpeedMps = speedMps;
    }

    const multiplier = currentUnit === 'mph' ? 2.23694 : 3.6;
    const displaySpeed = Math.round(speedMps * multiplier);

    // Update Speed Values across all views
    if (speedValEls && speedValEls.forEach) {
        speedValEls.forEach(el => el.textContent = displaySpeed);
    }

    // Update analog-specific elements
    const analogSpeed = document.getElementById('analog-speed');
    const minimalistSpeed = document.getElementById('minimalist-speed');
    const sportSpeed = document.getElementById('sport-speed');
    if (analogSpeed) analogSpeed.textContent = displaySpeed;
    if (minimalistSpeed) minimalistSpeed.textContent = displaySpeed;
    if (sportSpeed) sportSpeed.textContent = displaySpeed;

    // Analog Needle Rotation
    // The needle SVG shape is drawn pointing straight up (12 o'clock) at rest.
    // Rotating it -135deg..+135deg around the hub (100,100) sweeps it across
    // the "0" label (bottom-left) through to the "160"/"100" label (bottom-right).
    if (needleEl) {
        const maxScale = currentUnit === 'mph' ? 100 : 160;
        const pct = Math.min(displaySpeed / maxScale, 1);
        const angle = -135 + (pct * 270);
        // Use the SVG rotate(angle, cx, cy) attribute form directly instead of a
        // CSS transform, so the rotation pivot is always the gauge hub regardless
        // of transform-origin/transform-box support in the host browser.
        needleEl.setAttribute('transform', `rotate(${angle.toFixed(2)} 100 100)`);
    }

    // Sport Bar Gradient Dynamics
    if (sportBarEl) {
        const maxScale = currentUnit === 'mph' ? 100 : 160;
        const pct = Math.min((displaySpeed / maxScale) * 100, 100);
        sportBarEl.style.width = `${pct}%`;

        // Gradient color thresholds based on speed in km/h (user-facing thresholds)
        const speedInKmh = speedMps * 3.6;
        if (speedInKmh <= 40) {
            sportBarEl.style.background = 'linear-gradient(90deg, #007aff, #00c6ff)';
        } else if (speedInKmh <= 80) {
            sportBarEl.style.background = 'linear-gradient(90deg, #00c6ff, #34c759)';
        } else if (speedInKmh <= 120) {
            sportBarEl.style.background = 'linear-gradient(90deg, #34c759, #ffcc00)';
        } else if (speedInKmh <= 150) {
            sportBarEl.style.background = 'linear-gradient(90deg, #ffcc00, #ff6600)';
        } else {
            sportBarEl.style.background = 'linear-gradient(90deg, #ff6600, #ff3300)';
        }
    }

    updateStats();
}

function updateStats() {
    if (maxSpeedEl) {
        const multiplier = currentUnit === 'mph' ? 2.23694 : 3.6;
        const displayMaxSpeed = Math.round(maxSpeedMps * multiplier);
        maxSpeedEl.textContent = displayMaxSpeed;
    }
    if (distanceEl) {
        // Distance is tracked internally in km; convert to miles for display when in MPH mode
        const displayDistance = currentUnit === 'mph' ? totalDistanceKm * 0.621371 : totalDistanceKm;
        distanceEl.textContent = displayDistance.toFixed(1);
    }
    if (distanceUnitEl) {
        distanceUnitEl.textContent = currentUnit === 'mph' ? 'MI' : 'KM';
    }
}

// Geolocation Handling (initialized after DOM is ready)
function initGeolocation() {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.watchPosition(
        (position) => {
            const speed = position.coords && typeof position.coords.speed === 'number' ? position.coords.speed : 0;
            renderSpeed(speed);

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            // Calculate distance traveled
            if (lastLat !== null && lastLon !== null && speed > 0.5) {
                const distKm = calculateDistance(lastLat, lastLon, lat, lon);
                totalDistanceKm += distKm;
            }

            lastLat = lat;
            lastLon = lon;

            fetchLocation(lat, lon);
        },
        (error) => {
            if (roadNameEl) roadNameEl.textContent = 'Location Disabled';
        },
        { enableHighAccuracy: true }
    );
}

// Haversine formula to calculate distance between two GPS points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function fetchLocation(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.address) {
                const road = data.address.road || data.address.pedestrian || 'Current Location';
                const suburb = data.address.suburb || data.address.town || data.address.city || '';

                if (roadNameEl) roadNameEl.textContent = road;
                if (suburbNameEl) suburbNameEl.textContent = suburb;
            }
        })
        .catch(() => {});
}

// Clock Setup
function startClock() {
    function tick() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        if (clockEl) clockEl.textContent = `${h} : ${m}`;
    }
    tick();
    setInterval(tick, 1000);
}
