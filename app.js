/**
 * HUD Speedometer - Complete PWA Engine
 */

// --- 1. Accelerometer / Smoothed G-Force Module ---
class GForceTracker {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.isListening = false;
    this.smoothedG = 1.0;
    this.alpha = 0.15; // Low-pass filter weight (prevents jitter)
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

    const xG = (accel.x || 0) / 9.80665;
    const yG = (accel.y || 0) / 9.80665;
    const zG = (accel.z || 0) / 9.80665;
    const rawTotalG = Math.sqrt(xG * xG + yG * yG + zG * zG);

    // Apply Low-pass filter to smooth out sensor noise
    this.smoothedG = (rawTotalG * this.alpha) + (this.smoothedG * (1 - this.alpha));

    this.onUpdate({
      total: this.smoothedG.toFixed(2)
    });
  }
}

// --- 2. Canvas Render Engine ---
class SpeedometerRenderer {
  constructor(canvas, frameElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.frameElement = frameElement;
    
    this.targetSpeed = 0;    
    this.displayedSpeed = 0;  
    this.maxSpeed = 160;     
    this.smoothingFactor = 0.15; 
    this.theme = 'analog';   

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
    this.targetSpeed = (speedKmh * this.smoothingFactor) + (this.targetSpeed * (1 - this.smoothingFactor));
  }

  setTheme(themeName) {
    this.theme = themeName;
  }

  getSpeedColor(speed) {
    if (speed > 80) return '#ff453a'; // Warning Red
    if (speed > 60) return '#30d158'; // Moderate Green
    return '#0a84ff';                // Standard Blue
  }

  updateThemeBracket(speed) {
    if (!this.frameElement) return;

    this.frameElement.classList.remove('border-normal', 'border-moderate', 'border-warning');
    if (speed > 80) {
      this.frameElement.classList.add('border-warning');
    } else if (speed > 60) {
      this.frameElement.classList.add('border-moderate');
    } else {
      this.frameElement.classList.add('border-normal');
    }
  }

  render() {
    this.displayedSpeed += (this.targetSpeed - this.displayedSpeed) * 0.12;

    this.updateThemeBracket(this.displayedSpeed);

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
    const activeColor = this.getSpeedColor(displayedSpeed);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2c2c2e';
    ctx.stroke();

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

      const tx = cx + Math.cos(angle) * (radius - 28);
      const ty = cy + Math.sin(angle) * (radius - 28);
      ctx.fillStyle = '#8e8e93';
      ctx.font = '600 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i}`, tx, ty);
    }

    const needleAngle = this.getAngle(displayedSpeed);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 10), cy + Math.sin(needleAngle) * (radius - 10));
    ctx.lineWidth = 4;
    ctx.strokeStyle = activeColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = activeColor;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
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
    const activeColor = this.getSpeedColor(displayedSpeed);

    ctx.fillStyle = activeColor;
    ctx.font = '900 130px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(displayedSpeed)}`, cx, cy - 10);

    ctx.fillStyle = '#8e8e93';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('KM/H', cx, cy + 70);
  }

  // --- Theme 3: Sport Telemetry ---
  drawSport() {
    const { ctx, width, height, displayedSpeed } = this;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const activeColor = this.getSpeedColor(displayedSpeed);

    const startAngle = 0.75 * Math.PI;
    const maxAngle = 2.25 * Math.PI;
    const pct = Math.min(Math.max(displayedSpeed, 0), this.maxSpeed) / this.maxSpeed;
    const currentAngle = startAngle + pct * (maxAngle - startAngle);

    // Track Background
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, maxAngle);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#1c1c1e';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Speed Progress Arc
    if (displayedSpeed > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, currentAngle);
      ctx.lineWidth = 18;
      ctx.strokeStyle = activeColor;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 95px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(displayedSpeed)}`, cx, cy - 10);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = activeColor;
    ctx.fillText('SPORT KM/H', cx, cy + 60);
  }
}

// --- 3. App Controller ---
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('speedometerCanvas');
  const frameElement = document.getElementById('gauge-frame');
  const clockEl = document.getElementById('clock');
  const maxSpeedEl = document.getElementById('max-speed');
  const tripDistanceEl = document.getElementById('trip-distance');
  const roadNameEl = document.getElementById('road-name');
  const suburbNameEl = document.getElementById('suburb-name');
  const hudBtn = document.getElementById('hud-toggle');
  const resetBtn = document.getElementById('reset-btn');
  
  let maxSpeedKmh = 0;
  let totalDistanceKm = 0;
  let lastCoords = null;

  const renderer = new SpeedometerRenderer(canvas, frameElement);

  const updateClock = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}`;
  };
  updateClock();
  setInterval(updateClock, 1000);

  hudBtn.addEventListener('click', () => {
    document.body.classList.toggle('hud-mode');
    hudBtn.classList.toggle('active');
  });

  resetBtn.addEventListener('click', () => {
    maxSpeedKmh = 0;
    totalDistanceKm = 0;
    maxSpeedEl.textContent = '0';
    tripDistanceEl.textContent = '0.0';
  });

  if ('wakeLock' in navigator) {
    navigator.wakeLock.request('screen').catch((err) => console.log('Wake Lock Error:', err));
  }

  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const speedMps = pos.coords.speed;
        renderer.updateGpsSpeed(speedMps);

        if (pos.coords.latitude && pos.coords.longitude) {
          fetchLocationInfo(pos.coords.latitude, pos.coords.longitude);
        }

        if (speedMps !== null && speedMps > 0) {
          const currentKmh = speedMps * 3.6;
          
          if (currentKmh > maxSpeedKmh) {
            maxSpeedKmh = currentKmh;
            maxSpeedEl.textContent = Math.round(maxSpeedKmh);
          }

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
        }
      },
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }

  let lastGeocodeTime = 0;
  async function fetchLocationInfo(lat, lon) {
    const now = Date.now();
    if (now - lastGeocodeTime < 10000) return;
    lastGeocodeTime = now;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data && data.address) {
        roadNameEl.textContent = data.address.road || 'Unknown Road';
        suburbNameEl.textContent = data.address.suburb || data.address.neighbourhood || data.address.town || data.address.city || '---';
      }
    } catch {
      roadNameEl.textContent = 'Drive Safe';
      suburbNameEl.textContent = '---';
    }
  }

  function calcDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

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

  const gTracker = new GForceTracker((data) => {
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

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.log('SW registration failed:', err));
  }
});
