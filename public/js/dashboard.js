// public/js/dashboard.js
// Handles:
// 1. Quick View modal
// 2. Live polling — updates card values every 30s without page reload

// ── Colour helpers ────────────────────────
// Mirror the server-side Handlebars helpers exactly

function rangeColor(val, optimalRange) {
  const [min, max] = optimalRange;
  if (val < min - 10 || val > max + 10) return 'var(--red)';
  if (val < min - 2  || val > max + 2)  return 'var(--amber)';
  return 'var(--blue)';
}

function tempColor(val, optimalRange) {
  const [min, max] = optimalRange;
  if (val < min - 5 || val > max + 5) return 'var(--red)';
  if (val < min - 1 || val > max + 1) return 'var(--amber)';
  return 'var(--blue)';
}

function healthColor(status) {
  return { good: 'var(--green)', warn: 'var(--amber)', bad: 'var(--red)' }[status] || 'var(--muted)';
}

function healthLabel(status) {
  return { good: 'Healthy', warn: 'Needs Attention', bad: 'Critical' }[status] || '';
}

function healthIcon(status) {
  return { good: 'heart-pulse', warn: 'triangle-alert', bad: 'circle-x' }[status] || 'heart-pulse';
}

function clamp(val, max) {
  return Math.min(Math.round((val / max) * 100), 100);
}

// ── Live card update ──────────────────────
function updateCard(plant) {
  const card = document.querySelector(`[data-pot="${plant.potId}"]`);
  if (!card) return;

  // Moisture
  const moistureVal  = card.querySelector('.mm-val[data-metric="moisture"]');
  const moistureFill = card.querySelector('.mm-fill[data-metric="moisture"]');
  if (moistureVal) {
    moistureVal.textContent  = `${Math.round(plant.moisture)}%`;
    moistureVal.style.color  = rangeColor(plant.moisture, plant.optimalMoisture);
  }
  if (moistureFill) moistureFill.style.width = `${clamp(plant.moisture, 100)}%`;

  // Air temp
  const tempVal  = card.querySelector('.mm-val[data-metric="airTemp"]');
  const tempFill = card.querySelector('.mm-fill[data-metric="airTemp"]');
  if (tempVal) {
    tempVal.textContent = `${plant.airTemp.toFixed(1)}°`;
    tempVal.style.color = tempColor(plant.airTemp, plant.optimalTemp);
  }
  if (tempFill) tempFill.style.width = `${clamp(plant.airTemp, 50)}%`;

  // Humidity
  const humVal  = card.querySelector('.mm-val[data-metric="humidity"]');
  const humFill = card.querySelector('.mm-fill[data-metric="humidity"]');
  if (humVal) {
    humVal.textContent = `${Math.round(plant.humidity)}%`;
  }
  if (humFill) humFill.style.width = `${clamp(plant.humidity, 100)}%`;

  // Extra metrics
  const phEl   = card.querySelector('.em-item[data-metric="ph"]');
  const luxEl  = card.querySelector('.em-item[data-metric="light"]');
  const stEl   = card.querySelector('.em-item[data-metric="soilTemp"]');
  if (phEl)  phEl.querySelector('span').textContent  = `pH ${plant.ph.toFixed(1)}`;
  if (luxEl) luxEl.querySelector('span').textContent = `${plant.light.toLocaleString()} lux`;
  if (stEl)  stEl.querySelector('span').textContent  = `${plant.soilTemp.toFixed(1)}° soil`;

  // Health badge
  const badge = card.querySelector('.card-health-badge');
  if (badge) {
    badge.className     = `card-health-badge health-${plant.health}`;
    badge.querySelector('span').textContent = healthLabel(plant.health);
  }

  // Health score
  const score = card.querySelector('.health-score');
  if (score) {
    score.className  = `health-score health-${plant.health}`;
    score.childNodes[0].textContent = plant.healthScore;
  }

  // Alert chips
  const alertsEl = card.querySelector('.card-alerts');
  if (alertsEl) {
    if (plant.issues && plant.issues.length > 0) {
      alertsEl.innerHTML = plant.issues
        .map(i => `<span class="alert-chip">${i}</span>`)
        .join('');
      alertsEl.style.display = 'flex';
    } else {
      alertsEl.innerHTML     = '';
      alertsEl.style.display = 'none';
    }
  }

  // Display last updated time in "time ago" format
  function timeAgo(isoString) {
    if (!isoString) return 'No data';
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago ⚠️`;
    return `${Math.floor(diff / 86400)}d ago 🚨`;
  }

  // Last updated
  const updEl = card.querySelector('.card-footer-meta');
  if (updEl) {
    updEl.innerHTML = `
      <i data-lucide="clock"></i>
     Last sensor response was: ${timeAgo(plant.lastUpdated)}
    `;
  }

  // Pulse animation to show card just refreshed
  card.classList.remove('card-refreshed');
  void card.offsetWidth; // force reflow to restart animation
  card.classList.add('card-refreshed');

  // Update global PLANTS array so modal stays fresh
  const idx = PLANTS.findIndex(p => p.potId === plant.potId);
  if (idx !== -1) PLANTS[idx] = plant;
}

// ── Update summary stats row ──────────────
function updateSummaryStats(plants) {
  const healthyCount = plants.filter(p => p.health === 'good').length;
  const alertCount   = plants.filter(p => p.health !== 'good').length;
  const needsWater   = plants.filter(p => p.moisture < 30).length;
  const avgTemp      = (plants.reduce((s, p) => s + p.airTemp, 0) / plants.length).toFixed(1);

  const scVals = document.querySelectorAll('.sc-val');
  if (scVals[0]) scVals[0].textContent = `${healthyCount}/${plants.length}`;
  if (scVals[1]) scVals[1].textContent = needsWater;
  if (scVals[2]) scVals[2].textContent = `${avgTemp}°C`;
  if (scVals[3]) scVals[3].textContent = alertCount;
}

// ── Poll the API ──────────────────────────
async function pollPlants() {
  try {
    const res    = await fetch('/api/plants');
    if (!res.ok) throw new Error('Server error');
    const plants = await res.json();

    plants.forEach(updateCard);
    updateSummaryStats(plants);
    lucide.createIcons();

    window.HerbGuard.setConnected(true);
  } catch (err) {
    console.warn('[HerbGuard] Poll failed:', err.message);
    window.HerbGuard.setConnected(false);
  }
}

// ── Start polling when page loads ─────────
// HerbGuard.startCountdown fires pollPlants every 30s
window.HerbGuard.startCountdown(pollPlants);

// ── Modal ─────────────────────────────────
function healthLabelFull(status) {
  return { good: 'Healthy', warn: 'Needs Attention', bad: 'Critical' }[status] || '';
}

function openModal(potId) {
  const plant = PLANTS.find(p => p.potId === potId);
  if (!plant) return;

  document.getElementById('modal-emoji').textContent         = plant.emoji;
  document.getElementById('modal-plant-name').textContent    = plant.plantName;
  document.getElementById('modal-plant-species').textContent = plant.species;
  document.getElementById('modal-pot-id').textContent        = plant.potId;

  // Health banner
  const banner = document.getElementById('modal-health-banner');
  banner.style.background  = healthColor(plant.health) + '18';
  banner.style.borderColor = healthColor(plant.health) + '44';
  banner.style.color       = healthColor(plant.health);
  document.getElementById('modal-health-label').textContent = healthLabelFull(plant.health);
  document.getElementById('modal-health-score').textContent = `${plant.healthScore}%`;

  // 2x2 metrics
  const mColor  = rangeColor(plant.moisture, plant.optimalMoisture);
  const atColor = tempColor(plant.airTemp,   plant.optimalTemp);

  document.getElementById('modal-metrics-grid').innerHTML = `
    <div class="modal-metric">
      <div class="modal-metric-icon" style="color:${mColor}">
        <i data-lucide="droplets"></i>
      </div>
      <div>
        <div class="modal-metric-val" style="color:${mColor}">
          ${plant.moisture.toFixed(0)}%
        </div>
        <div class="modal-metric-key">Soil Moisture</div>
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

  // Gauge bars
  document.getElementById('mg-moisture-val').textContent       = `${plant.moisture.toFixed(0)}%`;
  document.getElementById('mg-moisture-fill').style.width      = `${clamp(plant.moisture, 100)}%`;
  document.getElementById('mg-moisture-fill').style.background = rangeColor(plant.moisture, plant.optimalMoisture);
  document.getElementById('mg-moisture-range').textContent     = `Optimal: ${plant.optimalMoisture[0]}–${plant.optimalMoisture[1]}%`;

  document.getElementById('mg-humidity-val').textContent       = `${plant.humidity.toFixed(0)}%`;
  document.getElementById('mg-humidity-fill').style.width      = `${clamp(plant.humidity, 100)}%`;

  document.getElementById('mg-ph-val').textContent             = `pH ${plant.ph.toFixed(1)}`;
  document.getElementById('mg-ph-fill').style.width            = `${clamp(plant.ph, 14)}%`;
  document.getElementById('mg-ph-range').textContent           = `Optimal: pH ${plant.optimalPh[0]}–${plant.optimalPh[1]}`;

  // Pump info
  document.getElementById('modal-last-pump').textContent  = plant.lastPump  || '—';
  document.getElementById('modal-next-water').textContent = plant.nextWater || '—';

  // Alerts
  const alertsEl = document.getElementById('modal-alerts');
  if (plant.issues && plant.issues.length > 0) {
    alertsEl.innerHTML     = plant.issues.map(i => `<span class="alert-chip">${i}</span>`).join('');
    alertsEl.style.display = 'flex';
  } else {
    alertsEl.innerHTML     = '';
    alertsEl.style.display = 'none';
  }

  // Dashboard link
  document.getElementById('modal-dashboard-link').href = `/plant/${plant.potId}`;

  // Show modal
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('modal-close-footer').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });