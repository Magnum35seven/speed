// Persistent Unit Selection
let currentUnit = localStorage.getItem('speedUnit') || 'kmh';
let currentSpeedMps = 0;

const speedValueEl = document.getElementById('speed-value');
const unitLabelEl = document.getElementById('unit-label');
const unitToggleBtn = document.getElementById('unit-toggle');
const clockEl = document.getElementById('clock');
const roadNameEl = document.getElementById('road-name');

// Initialize UI
updateUnitUI();
startClock();

// Toggle Button Click Handler
if (unitToggleBtn) {
    unitToggleBtn.addEventListener('click', () => {
        currentUnit = currentUnit === 'kmh' ? 'mph' : 'kmh';
        localStorage.setItem('speedUnit', currentUnit);
        updateUnitUI();
        renderSpeed(currentSpeedMps);
    });
}

function updateUnitUI() {
    const label = currentUnit === 'kmh' ? 'km/h' : 'mph';
    if (unitToggleBtn) unitToggleBtn.textContent = label;
    if (unitLabelEl) unitLabelEl.textContent = label.toUpperCase();
}

function renderSpeed(speedMps) {
    currentSpeedMps = speedMps;
    if (!speedValueEl) return;
    
    if (speedMps === null || isNaN(speedMps) || speedMps < 0) {
        speedValueEl.textContent = '0';
        return;
    }

    const multiplier = currentUnit === 'mph' ? 2.23694 : 3.6;
    speedValueEl.textContent = Math.round(speedMps * multiplier);
}

// Live Geolocation Tracking
if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
        (position) => {
            const speed = position.coords.speed || 0;
            renderSpeed(speed);

            // Reverse Geocoding for Road Name
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchRoadName(lat, lon);
        },
        (error) => {
            if (roadNameEl) roadNameEl.textContent = 'Location access denied';
            console.error('Geolocation error:', error);
        },
        { enableHighAccuracy: true }
    );
} else if (roadNameEl) {
    roadNameEl.textContent = 'Geolocation unavailable';
}

function fetchRoadName(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            if (roadNameEl && data.address) {
                const road = data.address.road || data.address.suburb || data.address.city || 'Unknown Road';
                roadNameEl.textContent = road;
            }
        })
        .catch(() => {
            if (roadNameEl) roadNameEl.textContent = 'Location signal weak';
        });
}

// Clock Display
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
