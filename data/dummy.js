// data/dummy.js
// Simulates sensor readings per plant pot.
// In Phase 8 we replace generatePlants() and generateHistory()
// with real InfluxDB queries — everything else stays the same.
const BASE_PLANTS = [
  {
    potId:       'POT-001',
    plantName:   'Thyme',
    emoji:       '🌿',
    species:     'Thymus vulgaris',
    family:      'Lamiaceae',
    description: 'A hardy Mediterranean herb prized for its aromatic leaves. Used in cooking, teas, and traditional medicine for respiratory and digestive health.',
    uses:        ['Culinary seasoning', 'Antiseptic properties', 'Respiratory relief', 'Digestive aid'],
    optimalMoisture: [35, 55],
    optimalPh:       [6.0, 8.0],
    optimalTemp:     [18, 28],
    base: { moisture: 42, airTemp: 22, soilTemp: 20, humidity: 48, ph: 6.5, light: 4200 }
  },
  {
    potId:       'POT-002',
    plantName:   'Basil',
    emoji:       '🌱',
    species:     'Ocimum basilicum',
    family:      'Lamiaceae',
    description: 'The king of herbs. Thrives in warm, sunny conditions. Essential in Mediterranean and Asian cuisines, known for anti-inflammatory and antibacterial properties.',
    uses:        ['Italian cuisine', 'Stress relief', 'Anti-inflammatory', 'Immune support'],
    optimalMoisture: [50, 70],
    optimalPh:       [6.0, 7.0],
    optimalTemp:     [20, 30],
    base: { moisture: 62, airTemp: 24, soilTemp: 22, humidity: 58, ph: 6.8, light: 3800 }
  },
  {
    potId:       'POT-003',
    plantName:   'Lavender',
    emoji:       '💜',
    species:     'Lavandula angustifolia',
    family:      'Lamiaceae',
    description: 'Famous for its calming fragrance. Prefers dry, well-drained soil and full sun. Widely used in aromatherapy, skincare, and as a natural sleep aid.',
    uses:        ['Aromatherapy', 'Sleep aid', 'Anxiety relief', 'Skin healing'],
    optimalMoisture: [20, 40],
    optimalPh:       [6.5, 7.5],
    optimalTemp:     [15, 25],
    base: { moisture: 22, airTemp: 21, soilTemp: 19, humidity: 38, ph: 7.1, light: 5100 }
  },
  {
    potId:       'POT-004',
    plantName:   'Rosemary',
    emoji:       '🌾',
    species:     'Salvia rosmarinus',
    family:      'Lamiaceae',
    description: 'A robust evergreen herb with needle-like leaves. Used in cooking and natural medicine. Research shows potential cognitive and memory benefits.',
    uses:        ['Memory enhancement', 'Culinary use', 'Hair growth', 'Antioxidant'],
    optimalMoisture: [30, 50],
    optimalPh:       [6.0, 7.0],
    optimalTemp:     [18, 27],
    base: { moisture: 45, airTemp: 23, soilTemp: 21, humidity: 42, ph: 6.2, light: 4600 }
  },
  {
    potId:       'POT-005',
    plantName:   'Mint',
    emoji:       '🍃',
    species:     'Mentha spicata',
    family:      'Lamiaceae',
    description: 'One of the most versatile herbs. Spreads vigorously and thrives in moist conditions. Beloved for its refreshing flavour in beverages and digestive remedies.',
    uses:        ['Digestive health', 'Fresh breath', 'Headache relief', 'IBS treatment'],
    optimalMoisture: [55, 75],
    optimalPh:       [6.0, 7.0],
    optimalTemp:     [18, 26],
    base: { moisture: 15, airTemp: 26, soilTemp: 24, humidity: 35, ph: 5.9, light: 2100 }
  },
  {
    potId:       'POT-006',
    plantName:   'Oregano',
    emoji:       '🌻',
    species:     'Origanum vulgare',
    family:      'Lamiaceae',
    description: 'A cornerstone of Mediterranean cooking with powerful antimicrobial properties. Drought-tolerant once established. Rich in antioxidants and essential oils.',
    uses:        ['Antimicrobial', 'Italian cooking', 'Cold & flu remedy', 'Antioxidant'],
    optimalMoisture: [30, 50],
    optimalPh:       [6.0, 8.0],
    optimalTemp:     [18, 28],
    base: { moisture: 50, airTemp: 22, soilTemp: 20, humidity: 48, ph: 6.7, light: 4900 }
  },
  {
    potId:       'POT-007',
    plantName:   'Chamomile',
    emoji:       '🌼',
    species:     'Matricaria chamomilla',
    family:      'Asteraceae',
    description: 'Gentle and soothing, chamomile is one of the most ancient medicinal herbs. Dried flowers are used for calming teas and skincare formulations.',
    uses:        ['Sleep induction', 'Anti-anxiety', 'Skin soothing', 'Digestive calm'],
    optimalMoisture: [40, 60],
    optimalPh:       [5.6, 7.5],
    optimalTemp:     [16, 24],
    base: { moisture: 52, airTemp: 20, soilTemp: 18, humidity: 52, ph: 6.3, light: 3600 }
  },
  {
    potId:       'POT-008',
    plantName:   'Lemon Balm',
    emoji:       '🍋',
    species:     'Melissa officinalis',
    family:      'Lamiaceae',
    description: 'A lemon-scented herb from the mint family. Traditionally used to reduce stress, improve sleep quality, and ease digestive discomfort.',
    uses:        ['Stress relief', 'Antiviral', 'Thyroid support', 'Cognitive boost'],
    optimalMoisture: [45, 65],
    optimalPh:       [6.0, 7.5],
    optimalTemp:     [18, 28],
    base: { moisture: 58, airTemp: 23, soilTemp: 21, humidity: 55, ph: 6.9, light: 3400 }
  }
];

// ── Helpers ───────────────────────────────────────────────────
// Add small random variation to simulate live sensor fluctuation
function jitter(value, range) {
  const result = value + (Math.random() * range * 2 - range);
  return parseFloat(result.toFixed(1));
}

// Format a time offset from now
function timeOffset(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  return d.toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit'
  });
}


// Work out health status based on whether readings are in optimal range
function calcHealth(plant, readings) {
  const issues = [];

  const [minM, maxM] = plant.optimalMoisture;
  const [minP, maxP] = plant.optimalPh;
  const [minT, maxT] = plant.optimalTemp;

  // Critical = more than 10 units outside range
  // Warning  = outside range but within 10 units
  // The jitter is now so small (±1.5 max) that a base value
  // inside the range will NEVER randomly cross into warning
  if      (readings.moisture < minM - 10) issues.push('Moisture critical');
  else if (readings.moisture < minM - 2)  issues.push('Moisture low');
  else if (readings.moisture > maxM + 10) issues.push('Moisture critical');
  else if (readings.moisture > maxM + 2)  issues.push('Moisture high');

  if      (readings.airTemp < minT - 5)   issues.push('Temperature critical');
  else if (readings.airTemp < minT - 1)   issues.push('Temperature low');
  else if (readings.airTemp > maxT + 5)   issues.push('Temperature critical');
  else if (readings.airTemp > maxT + 1)   issues.push('Temperature high');

  if      (readings.ph < minP - 1)        issues.push('pH critical');
  else if (readings.ph < minP - 0.3)      issues.push('pH low');
  else if (readings.ph > maxP + 1)        issues.push('pH critical');
  else if (readings.ph > maxP + 0.3)      issues.push('pH high');

  const hasCritical = issues.some(i => i.includes('critical'));

  return {
    status:      hasCritical ? 'bad' : issues.length > 0 ? 'warn' : 'good',
    healthScore: hasCritical ? 40 + Math.floor(Math.random() * 15): issues.length > 0 ? 65 + Math.floor(Math.random() * 15): 88 + Math.floor(Math.random() * 12),
    issues
  };
}

// ── Public API ────────────────────────────────────────────────

function generatePlants() {
  return BASE_PLANTS.map(plant => {
    const readings = {
        moisture:  jitter(plant.base.moisture,  1.5),
        airTemp:   jitter(plant.base.airTemp,   0.8),
        soilTemp:  jitter(plant.base.soilTemp,  0.5),
        humidity:  jitter(plant.base.humidity,  2),
        ph:        jitter(plant.base.ph,        0.1),
        light:     Math.round(jitter(plant.base.light, 150))
    };

    const health     = calcHealth(plant, readings);
    const minsAgo    = Math.floor(Math.random() * 4) + 1;
    const lastPumpAt = -(Math.floor(Math.random() * 180) + 30);
    const nextWaterIn = Math.floor(Math.random() * 240) + 60;

    return {
      // Identity
      potId:       plant.potId,
      plantName:   plant.plantName,
      emoji:       plant.emoji,
      species:     plant.species,
      family:      plant.family,
      description: plant.description,
      uses:        plant.uses,

      // Optimal ranges (kept as arrays for route logic)
      optimalMoisture: plant.optimalMoisture,
      optimalPh:       plant.optimalPh,
      optimalTemp:     plant.optimalTemp,

      // Live readings
      moisture:  readings.moisture,
      airTemp:   readings.airTemp,
      soilTemp:  readings.soilTemp,
      humidity:  readings.humidity,
      ph:        readings.ph,
      light:     readings.light,

      // Health
      health:       health.status,
      healthScore:  health.healthScore,
      healthIssues: health.issues,

      // Pump / light
      lastPump:    timeOffset(lastPumpAt),
      nextWater:   timeOffset(nextWaterIn),
      lightActive: readings.light < 3000,

      // Meta
      lastUpdated: `${minsAgo} min${minsAgo !== 1 ? 's' : ''} ago`
    };
  });
}

function generateHistory(plant, points = 48) {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(now - (points - i) * 30 * 60000); // every 30 min
    return {
      timeLabel: t.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      }),
      timeISO:   t.toISOString(),
      moisture:  parseFloat(jitter(plant.base.moisture,  8).toFixed(1)),
      airTemp:   parseFloat(jitter(plant.base.airTemp,   2).toFixed(1)),
      soilTemp:  parseFloat(jitter(plant.base.soilTemp,  1.5).toFixed(1)),
      humidity:  parseFloat(jitter(plant.base.humidity,  6).toFixed(1)),
      ph:        parseFloat(jitter(plant.base.ph,        0.3).toFixed(2)),
      light:     Math.round(jitter(plant.base.light,     500)),
      pumpEvent: Math.random() > 0.85
    };
  });
}

module.exports = { generatePlants, generateHistory };