const maxSpeedEl = document.getElementById('max-speed');
const tripDistanceEl = document.getElementById('trip-distance');
const roadNameEl = document.getElementById('road-name');
  const suburbNameEl = document.getElementById('suburb-name');
const hudBtn = document.getElementById('hud-toggle');

// State
@@ -282,7 +283,7 @@ document.addEventListener('DOMContentLoaded', () => {
lastCoords = pos.coords;

// Reverse Geocoding via Nominatim OpenStreetMap API
          fetchRoadName(pos.coords.latitude, pos.coords.longitude);
          fetchLocationInfo(pos.coords.latitude, pos.coords.longitude);
}
},
(err) => console.error('GPS Error:', err),
@@ -292,7 +293,7 @@ document.addEventListener('DOMContentLoaded', () => {

// Reverse Geocode Handler (Debounced)
let lastGeocodeTime = 0;
  async function fetchRoadName(lat, lon) {
  async function fetchLocationInfo(lat, lon) {
const now = Date.now();
if (now - lastGeocodeTime < 10000) return; // Limit requests to once per 10s
lastGeocodeTime = now;
@@ -301,10 +302,12 @@ document.addEventListener('DOMContentLoaded', () => {
const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
const data = await res.json();
if (data && data.address) {
        roadNameEl.textContent = data.address.road || data.address.suburb || 'Unknown Road';
        roadNameEl.textContent = data.address.road || 'Unknown Road';
        suburbNameEl.textContent = data.address.suburb || data.address.neighbourhood || data.address.town || data.address.city || '---';
}
} catch {
roadNameEl.textContent = 'Drive Safe';
      suburbNameEl.textContent = '---';
}
}
