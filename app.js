/**
 * HUD Speedometer - Complete PWA Engine
 */

// --- 1. Accelerometer / G-Force Module ---
class GForceTracker {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.isListening = false;
  }

  async requestPermissionAndStart() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState === 'granted') {
          this.start();
        }
      } catch (err) {
        console.error('DeviceMotion permission denied:', err);
      }
    } else {
      this.start();
    }
  }

  start() {
    if (this.isListening) return;
    window.addEventListener('devicemotion', (e) => this.handleMotion(e), true);
    this.isListening = true;
  }

  handleMotion(event) {
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel) return;

    // Normalize m/s^2 to G-Force (1G = 9.80665 m/s^2)
    const xG = (accel.x || 0) / 9.80665;
    const yG = (accel.y || 0) / 9.80665;
    const zG = (accel.z || 0) / 9.80665;
    const totalG = Math.sqrt(xG * xG + yG * yG + zG * zG);

    this.onUpdate({
      x: xG.toFixed(2),
      y: yG.toFixed(2),
      total: totalG.toFixed(2)
    });
  }
}

// --- 2. Canvas Render Engine (Themes + Smoothing) ---
class SpeedometerRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.targetSpeed = 0;    // Filtered GPS target speed (km/h)
    this.displayedSpeed = 0;  // Interpolated animation speed
    this.maxSpeed = 160;     // Gauge ceiling mark
    this.smoothingFactor = 0.15; // Low-pass EMA weight
    this.theme = 'analog';   // 'analog' | 'minimalist' | 'sport'

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.render();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  updateGpsSpeed(speedMps) {
    if (speedMps === null || speedMps < 0) return;
    const speedKmh = speedMps * 3.6;
    // Exponential Moving Average low-pass filter to strip GPS jitter
    this.targetSpeed = (speedKmh * this.smoothingFactor) + (this.targetSpeed * (1 - this.smoothingFactor));
  }

  setTheme(themeName) {
    this.theme = themeName;
  }

  render() {
    // Smooth frame-by-frame needle animation (Linear Interpolation)
    this.displayedSpeed += (this.targetSpeed - this.displayedSpeed) * 0.12;

    this.ctx.clearRect(0, 0, this.width, this.height);

    switch (this.theme) {
      case 'minimalist':
        this.drawMinimalist();
        break;
      case 'sport':
        this.drawSport();
        break;
      case 'analog':
      default:
        this.drawAnalog();
        break;
    }

    requestAnimationFrame(() => this.render());
  }

  getAngle(speed) {
    const pct = Math.min(Math.max(speed, 0), this.maxSpeed) / this.maxSpeed;
    return (0.75 + pct * 1.5) * Math.PI;
  }

  // --- Theme 1: Analog Gauge ---
  drawAnalog() {
    const { ctx, width, height, displayedSpeed } = this;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;

    // Background Arc Track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2c2c2e';
    ctx.stroke();

    // Ticks
    for (let i = 0; i <= this.maxSpeed; i += 20) {
      const angle = this.getAngle(i);
      const x1 = cx + Math.cos(angle) * (radius - 12);
      const y1 = cy + Math.sin(angle) * (radius - 12);
      const x2 = cx + Math.cos(angle) * radius;
      const y2 = cy + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#8e8e93';
      ctx.stroke();
    }

    // Dynamic Needle
    const needleAngle = this.getAngle(displayedSpeed);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 10), cy + Math.sin(needleAngle) * (radius - 10));
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ff3b30';
    ctx.stroke();

    // Hub Cap
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3b30';
    ctx.fill();

    // Center Readout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(displayedSpeed)}`, cx, cy + radius * 0.55);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('KM/H', cx, cy + radius * 0.55 + 18);
  }

  // --- Theme 2: Minimalist ---
  drawMinimalist() {
    const { ctx, width, height, displayedSpeed } = this;
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = '#0a84ff';
    ctx.font = 'bold 100px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(displayedSpeed)}`, cx, cy - 10);

    ctx.fillStyle = '#8e8e93';
    ctx.font = '16px sans-serif';
    ctx.fillText('KM/H', cx, cy + 60);
  }

  // --- Theme 3: Sport Telemetry ---
  drawSport() {
    const { ctx, width, height, displayedSpeed } = this;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;

    // Glowing Speed Bar Accent
    const activeAngle = this.getAngle(displayedSpeed);
    const gradient = ctx.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, '#30d158');
    gradient.addColorStop(0.6, '#ffd60a');
    gradient.addColorStop(1, '#ff453a');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0.75 * Math.PI, activeAngle);
    ctx.lineWidth = 18;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(displayedSpeed)}`, cx, cy + 12);

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ff453a';
    ctx.fillText('SPORT', cx, cy + 38);
  }
}

// --- 3. App Controller ---
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const canvas = document.getElementById('speedometerCanvas');
  const clockEl = document.getElementById('clock');
  const maxSpeedEl = document.getElementById('max-speed');
  const tripDistanceEl = document.getElementById('trip-distance');
  const roadNameEl = document.getElementById('road-name');
  const hudBtn = document.getElementById('hud-toggle');
  
  // State
  let maxSpeedKmh = 0;
  let totalDistanceKm = 0;
  let lastCoords = null;

  // Initialize Canvas Renderer
  const renderer = new SpeedometerRenderer(canvas);

  // Clock Update
  setInterval(() => {
    const now = new Date();
    clockEl.textContent = now.toTimeString().split(' ')[0];
  }, 1000);

  // HUD Mirror Mode Toggle
  hudBtn.addEventListener('click', () => {
    document.body.classList.toggle('hud-mode');
    hudBtn.classList.toggle('active');
  });

  // Screen Wake Lock API
  if ('wakeLock' in navigator) {
    navigator.wakeLock.request('screen').catch((err) => console.log('Wake Lock Error:', err));
  }

  // Geolocation Observer
  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const speedMps = pos.coords.speed;
        renderer.updateGpsSpeed(speedMps);

        if (speedMps !== null && speedMps > 0) {
          const currentKmh = speedMps * 3.6;
          
          // Track Max Speed
          if (currentKmh > maxSpeedKmh) {
            maxSpeedKmh = currentKmh;
            maxSpeedEl.textContent = Math.round(maxSpeedKmh);
          }

          // Distance calculation (Haversine formula)
          if (lastCoords) {
            const dist = calcDistanceKm(
              lastCoords.latitude,
              lastCoords.longitude,
              pos.coords.latitude,
              pos.coords.longitude
            );
            totalDistanceKm += dist;
            tripDistanceEl.textContent = totalDistanceKm.toFixed(1);
          }
          lastCoords = pos.coords;

          // Reverse Geocoding via Nominatim OpenStreetMap API
          fetchRoadName(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }

  // Reverse Geocode Handler (Debounced)
  let lastGeocodeTime = 0;
  async function fetchRoadName(lat, lon) {
    const now = Date.now();
    if (now - lastGeocodeTime < 10000) return; // Limit requests to once per 10s
    lastGeocodeTime = now;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data && data.address) {
        roadNameEl.textContent = data.address.road || data.address.suburb || 'Unknown Road';
      }
    } catch {
      roadNameEl.textContent = 'Drive Safe';
    }
  }

  // Distance Utility
  function calcDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  // Theme Switching Navigation Event Handlers
  const themeBtns = document.querySelectorAll('.theme-btn:not(#btn-gforce-toggle)');
  themeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      themeBtns.forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');

      const themeMap = {
        'btn-analog': 'analog',
        'btn-minimalist': 'minimalist',
        'btn-sport': 'sport'
      };
      renderer.setTheme(themeMap[e.target.id]);
    });
  });

  // G-Force Panel Handler
  const gTracker = new GForceTracker((data) => {
    document.getElementById('g-x').textContent = data.x;
    document.getElementById('g-y').textContent = data.y;
    document.getElementById('g-total').textContent = `${data.total} G`;
  });

  const gforceBtn = document.getElementById('btn-gforce-toggle');
  gforceBtn.addEventListener('click', () => {
    const panel = document.getElementById('gforce-panel');
    panel.classList.toggle('hidden');
    gforceBtn.classList.toggle('active');

    if (!panel.classList.contains('hidden')) {
      gTracker.requestPermissionAndStart();
    }
  });

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.log('SW registration failed:', err));
  }
});
