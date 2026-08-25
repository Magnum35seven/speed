// Persistent Unit Logic & State
let currentUnit = localStorage.getItem('speedUnit') || 'kmh';
let currentSpeedMps = 0;
let isHudFlipped = false;

// DOM Elements
const speedValEls = document.querySelectorAll('.speed-val');
const unitLblEls = document.querySelectorAll('.unit-lbl');
const unitToggleBtn = document.getElementById('unit-toggle');
const hudToggleBtn = document.getElementById('hud-toggle');
const resetBtn = document.getElementById('reset-btn');
const needleEl = document.getElementById('needle');
const sportBarEl = document.getElementById('sport-bar');
const clockEl = document.getElementById('clock');
const roadNameEl = document.getElementById('road-name');
const suburbNameEl = document.getElementById('suburb-name');
const modeButtons = document.querySelectorAll('.mode-btn[data-mode]');
const modeViews = document.querySelectorAll('.mode-view');

// App Initialization
updateUnitUI();
startClock();
initModes();
initControls();

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
            renderSpeed(0);
        });
    }
}

function updateUnitUI() {
    const label = currentUnit === 'kmh' ? 'KM/H' : 'MPH';
    if (unitToggleBtn) unitToggleBtn.textContent = label;
    unitLblEls.forEach(el => el.textContent = label);
}

// Mode Selection Switching (Analog, Minimalist, Sport)
function initModes() {
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedMode = btn.getAttribute('data-mode');
            
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            modeViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === `${selectedMode}-view`) {
                    view.classList.add('active');
                }
            });
        });
    });
}

function renderSpeed(speedMps) {
    currentSpeedMps = speedMps;
    if (speedMps === null || isNaN(speedMps) || speedMps < 0) speedMps = 0;

    const multiplier = currentUnit === 'mph' ? 2.23694 : 3.6;
    const speed = Math.round(speedMps * multiplier);

    // Update Speed Values across all views
    speedValEls.forEach(el => el.textContent = speed);

    // Analog Needle Rotation
    if (needleEl) {
        const maxScale = currentUnit === 'mph' ? 100 : 160;
        const pct = Math.min(speed / maxScale, 1);
        const angle = -135 + (pct * 270);
        
        const rad = (angle - 90) * (Math.PI / 180);
        const x2 = 100 + 60 * Math.cos(rad);
        const y2 = 100 + 60 * Math.sin(rad);
        
        needleEl.setAttribute('x2', x2);
        needleEl.setAttribute('y2', y2);
    }

    // Sport Bar Gradient Dynamics
    if (sportBarEl) {
        const maxScale = currentUnit === 'mph' ? 100 : 160;
        const pct = Math.min((speed / maxScale) * 100, 100);
        sportBarEl.style.width = `${pct}%`;

        // Gradient color thresholds based on speed in km/h
        const speedInKmh = speedMps * 3.6;
        if (speedInKmh <= 40) {
            sportBarEl.style.background = 'linear-gradient(90deg, #007aff, #00c6ff)';
        } else if (speedInKmh <= 80) {
            sportBarEl.style.background = 'linear-gradient(90deg, #007aff, #34c759)';
        } else {
            sportBarEl.style.background = 'linear-gradient(90deg, #34c759, #ff3b30)';
        }
    }
}

// Geolocation Handling
if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
        (position) => {
            const speed = position.coords.speed || 0;
            renderSpeed(speed);

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchLocation(lat, lon);
        },
        (error) => {
            if (roadNameEl) roadNameEl.textContent = 'Location Disabled';
        },
        { enableHighAccuracy: true }
    );
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
