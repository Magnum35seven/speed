// Persistent State Management
let currentUnit = localStorage.getItem('speedUnit') || 'kmh'; // Options: 'kmh' or 'mph'

// DOM Elements
const speedValueEl = document.getElementById('speed-value');
const unitLabelEl = document.getElementById('unit-label');
const unitToggleBtn = document.getElementById('unit-toggle');
const maxSpeedEl = document.getElementById('max-speed');

let rawMaxSpeedMps = 0;

// Initialize UI on load
updateUnitUI();

// Event Listener for Unit Toggle
unitToggleBtn.addEventListener('click', () => {
    currentUnit = currentUnit === 'kmh' ? 'mph' : 'kmh';
    localStorage.setItem('speedUnit', currentUnit);
    updateUnitUI();
    
    // Refresh displayed stats with new unit immediately
    if (window.lastKnownSpeed !== undefined) {
        speedValueEl.textContent = formatSpeed(window.lastKnownSpeed);
    }
    maxSpeedEl.textContent = formatSpeed(rawMaxSpeedMps);
});

// Update UI elements dependent on active unit
function updateUnitUI() {
    const displayLabel = currentUnit === 'kmh' ? 'km/h' : 'mph';
    unitToggleBtn.textContent = displayLabel;
    if (unitLabelEl) {
        unitLabelEl.textContent = displayLabel;
    }
}

// Convert m/s to chosen unit
function formatSpeed(speedInMps) {
    if (!speedInMps || isNaN(speedInMps) || speedInMps < 0) return 0;
    
    const multiplier = currentUnit === 'mph' ? 2.23694 : 3.6;
    return Math.round(speedInMps * multiplier);
}

// Geolocation Handling
if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
        (position) => {
            const speedMps = position.coords.speed || 0;
            window.lastKnownSpeed = speedMps;
            
            // Track maximum speed in m/s
            if (speedMps > rawMaxSpeedMps) {
                rawMaxSpeedMps = speedMps;
                maxSpeedEl.textContent = formatSpeed(rawMaxSpeedMps);
            }

            // Display current formatted speed
            speedValueEl.textContent = formatSpeed(speedMps);
        },
        (error) => {
            console.error('Error retrieving location:', error);
        },
        { enableHighAccuracy: true }
    );
}
