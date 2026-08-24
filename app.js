// Persistent State Management
let currentUnit = localStorage.getItem('speedUnit') || 'kmh'; // 'kmh' or 'mph'
let lastKnownSpeedMps = 0;

// DOM Elements
const speedValueEl = document.getElementById('speed-value');
const unitLabelEl = document.getElementById('unit-label');
const unitToggleBtn = document.getElementById('unit-toggle');
const needleEl = document.getElementById('needle');
const clockEl = document.getElementById('clock');

// Initialize UI state
updateUnitUI();
startClock();

// Toggle Unit Event Listener
if (unitToggleBtn) {
    unitToggleBtn.addEventListener('click', () => {
        currentUnit = currentUnit === 'kmh' ? 'mph' : 'kmh';
        localStorage.setItem('speedUnit', currentUnit);
        updateUnitUI();
        updateSpeedDisplay(lastKnownSpeedMps);
    });
}

function updateUnitUI() {
    const label = currentUnit === 'kmh' ? 'KM/H' : 'MPH';
    if (unitToggleBtn) unitToggleBtn.textContent = label;
    if (unitLabelEl) unitLabelEl.textContent = label;
}

function formatSpeed(speedInMps) {
    if (!speedInMps || isNaN(speedInMps) || speedInMps < 0) return 0;
    const multiplier = currentUnit === 'mph' ? 2.23694 : 3.6;
    return Math.round(speedInMps * multiplier);
}

function updateSpeedDisplay(speedMps) {
    lastKnownSpeedMps = speedMps;
    const formattedSpeed = formatSpeed(speedMps);
    
    if (speedValueEl) speedValueEl.textContent = formattedSpeed;
    
    // Update gauge needle rotation (max scale assumed at 160)
    if (needleEl) {
        const maxScale = currentUnit === 'mph' ? 100 : 160;
        const angle = Math.min(Math.max((formattedSpeed / maxScale) * 180 - 90, -90), 90);
        needleEl.style.transform = `rotate(${angle}deg)`;
    }
}

// Clock Functionality
function startClock() {
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        if (clockEl) clockEl.textContent = `${hours}:${minutes}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// Geolocation Tracking
if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
        (position) => {
            const speedMps = position.coords.speed || 0;
            updateSpeedDisplay(speedMps);
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true }
    );
}
