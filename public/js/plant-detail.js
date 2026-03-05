// Builds charts and populates the history table.
// HISTORY and PLANT are injected by the server into the page.

// ── Chart.js global defaults ──────────────────────────────────
Chart.defaults.color          = '#7d8590';
Chart.defaults.borderColor    = '#21262d';
Chart.defaults.font.family    = "'DM Mono', monospace";
Chart.defaults.font.size      = 11;

// ── Shared config ─────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#161b22',
  borderColor:     '#30363d',
  borderWidth:     1,
  titleColor:      '#e6edf3',
  bodyColor:       '#7d8590',
  padding:         10,
  cornerRadius:    8
};

let lastHistoryTime = HISTORY.length > 0 ? HISTORY[0]._time : null;

// Show every 4th label to avoid crowding on x-axis
const labels = HISTORY.map(r => r.timeLabel);
const sparseLabels = labels.map((l, i) => i % 4 === 0 ? l : '');

// ── Main Chart — Moisture / Air Temp / Humidity ───────────────
new Chart(
  document.getElementById('main-chart').getContext('2d'),
  {
    type: 'line',
    data: {
      labels: sparseLabels,
      datasets: [
        {
          label:           'Moisture (%)',
          data:            HISTORY.map(r => r.moisture),
          borderColor:     '#58a6ff',
          backgroundColor: 'rgba(88,166,255,0.07)',
          fill:            true,
          tension:         0.4,
          borderWidth:     2,
          pointRadius:     0,
          pointHoverRadius: 4
        },
        {
          label:           'Air Temp (°C)',
          data:            HISTORY.map(r => r.air_temp),
          borderColor:     '#e3b341',
          backgroundColor: 'transparent',
          fill:            false,
          tension:         0.4,
          borderWidth:     2,
          borderDash:      [4, 2],
          pointRadius:     0,
          pointHoverRadius: 4
        },
        {
          label:           'Humidity (%)',
          data:            HISTORY.map(r => r.humidity),
          borderColor:     '#39d353',
          backgroundColor: 'transparent',
          fill:            false,
          tension:         0.4,
          borderWidth:     2,
          borderDash:      [2, 4],
          pointRadius:     0,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend:  { display: false },
        tooltip: tooltipStyle
      },
      scales: {
        x: { grid: { color: '#1c2333' }, ticks: { maxRotation: 0 } },
        y: { grid: { color: '#1c2333' } }
      }
    }
  }
);

// ── pH Chart ──────────────────────────────────────────────────
new Chart(
  document.getElementById('ph-chart').getContext('2d'),
  {
    type: 'line',
    data: {
      labels: sparseLabels,
      datasets: [
        {
          label:           'pH',
          data:            HISTORY.map(r => r.ph),
          borderColor:     '#bc8cff',
          backgroundColor: 'rgba(188,140,255,0.08)',
          fill:            true,
          tension:         0.4,
          borderWidth:     2,
          pointRadius:     0,
          pointHoverRadius: 4
        },
        // Optimal min line
        {
          label:       `Min (${PLANT.optimalPh[0]})`,
          data:        HISTORY.map(() => PLANT.optimalPh[0]),
          borderColor: 'rgba(57,211,83,0.35)',
          borderDash:  [4, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill:        false
        },
        // Optimal max line — fills between min and max
        {
          label:           `Max (${PLANT.optimalPh[1]})`,
          data:            HISTORY.map(() => PLANT.optimalPh[1]),
          borderColor:     'rgba(57,211,83,0.35)',
          borderDash:      [4, 4],
          borderWidth:     1,
          pointRadius:     0,
          fill:            '-1',
          backgroundColor: 'rgba(57,211,83,0.04)'
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: 'index', intersect: false },
      plugins: {
        legend:  { display: false },
        tooltip: tooltipStyle
      },
      scales: {
        x: { grid: { color: '#1c2333' }, ticks: { maxRotation: 0 } },
        y: {
          grid: { color: '#1c2333' },
          min:  Math.max(0,  PLANT.optimalPh[0] - 1.5),
          max:  Math.min(14, PLANT.optimalPh[1] + 1.5)
        }
      }
    }
  }
);

// ── Light Chart ───────────────────────────────────────────────
new Chart(
  document.getElementById('light-chart').getContext('2d'),
  {
    type: 'bar',
    data: {
      labels: sparseLabels,
      datasets: [
        {
          label:           'Light (lux)',
          data:            HISTORY.map(r => r.light),
          backgroundColor: 'rgba(255,215,0,0.25)',
          borderColor:     '#ffd700',
          borderWidth:     1,
          borderRadius:    3
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend:  { display: false },
        tooltip: {
          ...tooltipStyle,
          callbacks: {
            label: ctx => `${ctx.parsed.y.toLocaleString()} lux`
          }
        }
      },
      scales: {
        x: { grid: { color: '#1c2333' }, ticks: { maxRotation: 0 } },
        y: {
          grid: { color: '#1c2333' },
          ticks: { callback: v => (v / 1000).toFixed(1) + 'k' }
        }
      }
    }
  }
);

// ── History Table ─────────────────────────────────────────────
function buildTable() {
  const tbody = document.getElementById('history-tbody');
  // Already newest first from InfluxDB (desc: true)
  const rows = HISTORY.slice(0, 20);

  tbody.innerHTML = rows.map(row => {
    const d = new Date(row._time);
    const timeLabel = d.toLocaleString('en-US', {
        month:  'short',
        day:    '2-digit',
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true
    });
    return `<tr>
      <td class="mono muted">${timeLabel}</td>
      <td class="mono" style="color:#58a6ff">${row.moisture.toFixed(0)}%</td>
      <td class="mono" style="color:#e3b341">${row.air_temp.toFixed(1)}°C</td>
      <td class="mono" style="color:#f0883e">${row.soil_temp.toFixed(1)}°C</td>
      <td class="mono" style="color:#39d353">${row.humidity.toFixed(0)}%</td>
      <td class="mono" style="color:#bc8cff">${row.ph.toFixed(1)}</td>
      <td class="mono muted">${row.light.toLocaleString()}</td>
      <td>
        ${row.pumpEvent
          ? '<span class="pump-event-badge">💧 On</span>'
          : '<span class="muted">—</span>'
        }
      </td>
    </tr>`;
  }).join('');
}

buildTable();

// ── Controls ──────────────────────────────────────────────────
function triggerPump(potId, seconds, btn) {
  const original = btn.textContent.trim();
  btn.textContent = '⏳ Running...';
  btn.disabled    = true;
  btn.style.color = 'var(--blue)';

  // In Phase 8 this will POST to /api/control
  // and Node-RED will publish an MQTT pump command
  console.log(`[PUMP] ${potId} → ${seconds}s`);

  setTimeout(() => {
    btn.textContent = '✓ Done';
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.color = '';
      btn.disabled    = false;
    }, 2000);
  }, seconds * 1000);
}

function toggleLight(potId, btn) {
  const isOn = btn.classList.contains('btn-active');
  btn.classList.toggle('btn-active', !isOn);
  btn.classList.toggle('btn-ghost', isOn);
  btn.innerHTML = isOn
    ? '<i data-lucide="sun-dim"></i> OFF'
    : '<i data-lucide="sun"></i> ON';
  lucide.createIcons();
  console.log(`[LIGHT] ${potId} → ${isOn ? 'OFF' : 'ON'}`);
}

// ── Live polling on detail page ───────────
async function pollDetail() {
  try {
    const res   = await fetch(`/api/plant/${PLANT.potId}/latest`);
    if (!res.ok) throw new Error('Server error');
    const fresh = await res.json();

    // Update gauge SVG arcs
    const C = 2 * Math.PI * 46;
    const gaugeMap = [
      { key: 'moisture', val: fresh.moisture, max: 100  },
      { key: 'humidity', val: fresh.humidity, max: 100  },
      { key: 'airTemp',  val: fresh.airTemp,  max: 50   },
      { key: 'soilTemp', val: fresh.soilTemp, max: 50   },
      { key: 'ph',       val: fresh.ph,       max: 14   },
      { key: 'light',    val: fresh.light,    max: 8000 }
    ];

    const gaugeCards = document.querySelectorAll('.gauge-card');
    gaugeCards.forEach((card, i) => {
      if (!gaugeMap[i]) return;
      const { val, max } = gaugeMap[i];
      const arc   = card.querySelector('circle:last-child');
      const valEl = card.querySelector('.gauge-val');
      if (arc) {
        const offset = C - (Math.min(val / max, 1)) * C;
        arc.style.strokeDashoffset = offset.toFixed(1);
      }
      if (valEl) {
        valEl.textContent = i === 5
          ? Math.round(val).toLocaleString()
          : val.toFixed(i >= 4 ? 1 : 0);
      }
    });

    // ── Update health ring ────────────────
    const C2       = 2 * Math.PI * 46;
    const ringArc  = document.querySelector('.detail-health-ring circle:last-child');
    const ringVal  = document.querySelector('.ring-val');
    const healthTag = document.querySelector('.detail-tag.health-tag-good, .detail-tag.health-tag-warn, .detail-tag.health-tag-bad');

    if (ringArc) {
      const offset = C2 - (Math.min(fresh.healthScore / 100, 1)) * C2;
      ringArc.style.strokeDashoffset = offset.toFixed(1);
      ringArc.style.stroke = fresh.health === 'bad'  ? '#f85149'
                           : fresh.health === 'warn' ? '#e3b341'
                           : '#39d353';
    }
    if (ringVal) ringVal.textContent = fresh.healthScore;

    if (healthTag) {
      healthTag.className   = `detail-tag health-tag-${fresh.health}`;
      healthTag.querySelector('span')?.remove();
      healthTag.textContent = fresh.health === 'bad'  ? 'Critical'
                            : fresh.health === 'warn' ? 'Attention'
                            : 'Healthy';
    }

    // ── Update lastUpdated tag ────────────
    const lastUpdatedTag = document.querySelector('.detail-tag .last-updated-time');
    if (lastUpdatedTag) lastUpdatedTag.textContent = timeAgo(fresh.lastUpdated);

    window.HerbGuard.setConnected(true);
  } catch (err) {
    console.warn('[HerbGuard] Detail poll failed:', err.message);
    window.HerbGuard.setConnected(false);
  }
}

function timeAgo(isoString) {
  if (!isoString) return 'Never recorded';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago ⚠️`;
  return `${Math.floor(diff / 86400)}d ago 🚨`;
}

async function pollHistory() {
  try {
    const res  = await fetch(`/api/plant/${PLANT.potId}/history`);
    const data = await res.json();

    if (!data.length) return;

    // Only update if there are new entries
    if (data[0]._time !== lastHistoryTime) {
      lastHistoryTime = data[0]._time;
      HISTORY.length = 0;
      data.forEach(r => HISTORY.push(r));
      buildTable();
      console.log('[HerbGuard] New history entry detected');
    }
  } catch (err) {
    console.warn('History poll failed:', err);
  }
}



// Start countdown — fires pollDetail every 30s
window.HerbGuard.startCountdown(pollDetail);
window.HerbGuard.startCountdown(pollHistory);