// Handles the Quick View modal on the dashboard page.
// PLANTS is injected by the server into the page as a JSON array.

// ── Helpers ───────────────────────────────────────────────────

function clamp(val, max) {
  return Math.min(Math.round((val / max) * 100), 100);
}

function healthColor(status) {
  return {
    good: 'var(--green)',
    warn: 'var(--amber)',
    bad:  'var(--red)'
  }[status] || 'var(--muted)';
}

function healthLabel(status) {
  return { good: 'Healthy', warn: 'Needs Attention', bad: 'Critical' }[status] || '';
}

// Returns a color based on value vs the plant's optimal range
// Uses identical thresholds as server-side rangeColor helper
function rangeColor(val, optimalRange) {
  const [min, max] = optimalRange;
  if (val < min - 10 || val > max + 10) return 'var(--red)';
  if (val < min - 2  || val > max + 2)  return 'var(--amber)';
  return 'var(--blue)';
}

function tempRangeColor(val, optimalRange) {
  const [min, max] = optimalRange;
  if (val < min - 5 || val > max + 5) return 'var(--red)';
  if (val < min - 1 || val > max + 1) return 'var(--amber)';
  return 'var(--blue)';
}

// ── Open Modal ────────────────────────────────────────────────

function openModal(potId) {
  const plant = PLANTS.find(p => p.potId === potId);
  if (!plant) return;

  // ── Header ──
  document.getElementById('modal-emoji').textContent        = plant.emoji;
  document.getElementById('modal-plant-name').textContent   = plant.plantName;
  document.getElementById('modal-plant-species').textContent = plant.species;
  document.getElementById('modal-pot-id').textContent       = plant.potId;

  // ── Health banner ──
  const banner = document.getElementById('modal-health-banner');
  banner.style.background   = healthColor(plant.health) + '18'; // 18 = ~10% opacity hex
  banner.style.borderColor  = healthColor(plant.health) + '44';
  banner.style.color        = healthColor(plant.health);
  document.getElementById('modal-health-label').textContent = healthLabel(plant.health);
  document.getElementById('modal-health-score').textContent = `${plant.healthScore}%`;

  // ── 2x2 Metrics grid ──
  const mColor  = rangeColor(plant.moisture, plant.optimalMoisture);
  const atColor = tempRangeColor(plant.airTemp, plant.optimalTemp);
  const stColor = tempRangeColor(plant.soilTemp, plant.optimalTemp);

  document.getElementById('modal-metrics-grid').innerHTML = `
    <div class="modal-metric">
      <div class="modal-metric-icon" style="color:${mColor}">
        <i data-lucide="droplets"></i>
      </div>
      <div>
        <div class="modal-metric-val" style="color:${mColor}">
          ${plant.moisture.toFixed(0)}%
        </div>
        <div class="modal-metric-key">Air Moisture</div>
      </div>
    </div>
    <div class="modal-metric">
      <div class="modal-metric-icon" style="color:${atColor}">
        <i data-lucide="thermometer"></i>
      </div>
      <div>
        <div class="modal-metric-val" style="color:${atColor}">
          ${plant.airTemp.toFixed(1)}°C
        </div>
        <div class="modal-metric-key">Air Temp</div>
      </div>
    </div>
    <div class="modal-metric">
      <div class="modal-metric-icon" style="color:#f0883e">
        <i data-lucide="thermometer"></i>
      </div>
      <div>
        <div class="modal-metric-val" style="color:#f0883e">
          ${plant.soilTemp.toFixed(1)}°C
        </div>
        <div class="modal-metric-key">Soil Temp</div>
      </div>
    </div>
    <div class="modal-metric">
      <div class="modal-metric-icon" style="color:#ffd700">
        <i data-lucide="sun"></i>
      </div>
      <div>
        <div class="modal-metric-val" style="color:#ffd700">
          ${plant.light.toLocaleString()} lux
        </div>
        <div class="modal-metric-key">Light</div>
      </div>
    </div>
  `;

  // ── Gauge bars ──
  // Moisture
  document.getElementById('mg-moisture-val').textContent        = `${plant.moisture.toFixed(0)}%`;
  document.getElementById('mg-moisture-fill').style.width       = `${clamp(plant.moisture, 100)}%`;
  document.getElementById('mg-moisture-fill').style.background  = rangeColor(plant.moisture, plant.optimalMoisture);
  document.getElementById('mg-moisture-range').textContent      = `Optimal: ${plant.optimalMoisture[0]}–${plant.optimalMoisture[1]}%`;

  // Humidity
  document.getElementById('mg-humidity-val').textContent        = `${plant.humidity.toFixed(0)}%`;
  document.getElementById('mg-humidity-fill').style.width       = `${clamp(plant.humidity, 100)}%`;

  // pH
  document.getElementById('mg-ph-val').textContent              = `pH ${plant.ph.toFixed(1)}`;
  document.getElementById('mg-ph-fill').style.width             = `${clamp(plant.ph, 14)}%`;
  document.getElementById('mg-ph-range').textContent            = `Optimal: pH ${plant.optimalPh[0]}–${plant.optimalPh[1]}`;

  // ── Pump info ──
  document.getElementById('modal-last-pump').textContent  = plant.lastPump;
  document.getElementById('modal-next-water').textContent = plant.nextWater;

  // ── Alert chips ──
  const alertsEl = document.getElementById('modal-alerts');
  if (plant.healthIssues && plant.healthIssues.length > 0) {
    alertsEl.innerHTML = plant.healthIssues
      .map(issue => `<span class="alert-chip">${issue}</span>`)
      .join('');
    alertsEl.style.display = 'flex';
  } else {
    alertsEl.innerHTML = '';
    alertsEl.style.display = 'none';
  }

  // ── Dashboard link ──
  document.getElementById('modal-dashboard-link').href = `/plant/${plant.potId}`;

  // ── Show modal ──
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Re-run Lucide so dynamically injected icons render
  lucide.createIcons();
}

// ── Close Modal ───────────────────────────────────────────────

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close on overlay background click
document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// Close buttons
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('modal-close-footer').addEventListener('click', closeModal);

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
