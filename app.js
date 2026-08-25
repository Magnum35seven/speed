// Persistent Unit Selection State
let currentUnit = localStorage.getItem('speedUnit') || 'kmh';
let currentSpeedMps = 0;

// Elements
const speedValueEl = document.getElementById('speed-value');
const unitLabelEl = document.getElementById('unit-label');
const unitToggleBtn = document.getElementById('unit-toggle');
const needleEl = document.getElementById('needle');
const clockEl = document.getElementById('clock');
const roadNameEl = document.getElementById('road-name');
const suburbNameEl = document.getElementById('suburb-name');
const modeButtons = document.querySelectorAll('.mode-btn[data-mode]');

// Initialize App State
updateUnitUI();
startClock();
initModeSelector();

// Unit Switch Event
if (unitToggleBtn) {
    unitToggleBtn.addEventListener('click', () => {
        currentUnit = currentUnit === 'kmh' ? 'mph' : 'kmh';
        localStorage.setItem('speedUnit', currentUnit);
        updateUnitUI();
        updateDisplay(currentSpeedMps);
    });
}

function updateUnitUI() {
    const label = currentUnit === 'kmh' ? 'KM/H' : 'MPH';
    if (unitToggleBtn) unitToggleBtn.textContent = label;
    if (unitLabelEl) unitLabelEl.textContent = label;
}

function updateDisplay(speedMps) {
    currentSpeedMps = speedMps;
    if (speedMps === null || isNaN(speedMps) || speedMps < 0) speedMps = 0;

    // Convert Speed
    const multiplier = currentUnit === 'mph' ? 2.23694 : 3.6;
    const speed = Math.round(speedMps * multiplier);

    if (speedValueEl) speedValueEl.textContent = speed;

    // Calculate Gauge Needle Rotation (-135deg to +135deg)
    if (needleEl) {
        const maxScale = currentUnit === 'mph' ? 100 : 160;
        const percentage = Math.min(speed / maxScale, 1);
        const angle = -135 + (percentage * 270);
        
        // Calculate needle position coordinates
        const rad = (angle - 90) * (Math.PI / 180);
        const x2 = 100 + 65 * Math.cos(rad);
        const y2 = 100 + 65 * Math.sin(rad);
        
        needleEl.setAttribute('x2', x2);
        needleEl.setAttribute('y2', y2);
    }
}

// Mode Selector Buttons
function initModeSelector() {
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Geolocation Handling
if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
        (position) => {
            const speed = position.coords.speed || 0;
            updateDisplay(speed);

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchLocationDetails(lat, lon);
        },
        (error) => {
            if (roadNameEl) roadNameEl.textContent = 'Location unavailable';
            console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true }
    );
}

function fetchLocationDetails(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.address) {
                const road = data.address.road || data.address.pedestrian || 'Unknown Road';
                const suburb = data.address.suburb || data.address.town || data.address.city || '';
                
                if (roadNameEl) roadNameEl.textContent = road;
                if (suburbNameEl) suburbNameEl.textContent = suburb;
            }
        })
        .catch(() => {});
}

// Clock Setup
function startClock() {
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        if (clockEl) clockEl.textContent = `${h}:${m}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
}
