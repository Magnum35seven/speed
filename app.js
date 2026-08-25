* HUD Speedometer - Complete PWA Engine
*/

// --- 1. Accelerometer / G-Force Module ---
// --- 1. Accelerometer / Smoothed G-Force Module ---
class GForceTracker {
constructor(onUpdate) {
this.onUpdate = onUpdate;
this.isListening = false;
    this.smoothedG = 1.0;
    this.alpha = 0.15; // Low-pass filter weight (prevents jitter)
}

async requestPermissionAndStart() {
@@ -37,12 +39,13 @@ class GForceTracker {
const xG = (accel.x || 0) / 9.80665;
const yG = (accel.y || 0) / 9.80665;
const zG = (accel.z || 0) / 9.80665;
    const totalG = Math.sqrt(xG * xG + yG * yG + zG * zG);
    const rawTotalG = Math.sqrt(xG * xG + yG * yG + zG * zG);

    // Apply Low-pass filter to smooth out sensor noise
    this.smoothedG = (rawTotalG * this.alpha) + (this.smoothedG * (1 - this.alpha));

this.onUpdate({
      x: xG.toFixed(2),
      y: yG.toFixed(2),
      total: totalG.toFixed(2)
      total: this.smoothedG.toFixed(2)
});
}
}
@@ -210,7 +213,7 @@ class SpeedometerRenderer {
ctx.fillText('KM/H', cx, cy + 70);
}

  // --- Theme 3: Sport Telemetry (Fixed Arc rendering) ---
  // --- Theme 3: Sport Telemetry ---
drawSport() {
const { ctx, width, height, displayedSpeed } = this;
const cx = width / 2;
@@ -231,7 +234,7 @@ class SpeedometerRenderer {
ctx.lineCap = 'round';
ctx.stroke();

    // Active Speed Progress Arc
    // Speed Progress Arc
if (displayedSpeed > 0) {
ctx.beginPath();
ctx.arc(cx, cy, radius, startAngle, currentAngle);
@@ -241,7 +244,6 @@ class SpeedometerRenderer {
ctx.stroke();
}

    // Central Speed readout
ctx.fillStyle = '#ffffff';
ctx.font = '900 95px sans-serif';
ctx.textAlign = 'center';
@@ -378,8 +380,6 @@ document.addEventListener('DOMContentLoaded', () => {
});

const gTracker = new GForceTracker((data) => {
    document.getElementById('g-x').textContent = data.x;
    document.getElementById('g-y').textContent = data.y;
document.getElementById('g-total').textContent = `${data.total} G`;
});
