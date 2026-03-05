// scripts/simulate-sensors.js
// Simulates sensor readings every 30 seconds
// pm2 start scripts/simulate-sensors.js --name simulator

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const previous = {}; // track last written values

const { writeSensorReading } = require('../db/influx');

const POTS = ['POT-001', 'POT-002', 'POT-003', 'POT-004'];

const BASE = {
  'POT-001': { moisture: 40, airTemp: 22, soilTemp: 20, humidity: 55, ph: 6.5, light: 4500 },
  'POT-002': { moisture: 60, airTemp: 23, soilTemp: 21, humidity: 58, ph: 6.8, light: 3800 },
  'POT-003': { moisture: 30, airTemp: 21, soilTemp: 19, humidity: 50, ph: 7.1, light: 5200 },
  'POT-004': { moisture: 55, airTemp: 24, soilTemp: 22, humidity: 62, ph: 6.2, light: 4100 }
};

// Drift values slowly over time to simulate realistic sensor behavior
const current = JSON.parse(JSON.stringify(BASE));

function drift(val, base, range, step) {
  const newVal = val + (Math.random() - 0.5) * step;
  return +Math.min(Math.max(newVal, base - range), base + range).toFixed(2);
}

function hasChanged(potId, current) {
  const prev = previous[potId];
  if (!prev) return true; // first reading always write

  return (
    Math.abs(current.moisture  - prev.moisture)  >= 0.5  ||
    Math.abs(current.airTemp   - prev.airTemp)   >= 0.1  ||
    Math.abs(current.soilTemp  - prev.soilTemp)  >= 0.1  ||
    Math.abs(current.humidity  - prev.humidity)  >= 0.5  ||
    Math.abs(current.ph        - prev.ph)        >= 0.05 ||
    Math.abs(current.light     - prev.light)     >= 50
  );
}

async function tick() {
  for (const potId of POTS) {
    const b = BASE[potId];
    const c = current[potId];

    c.moisture  = drift(c.moisture,  b.moisture,  15, 1.5);
    c.airTemp   = drift(c.airTemp,   b.airTemp,   3,  0.3);
    c.soilTemp  = drift(c.soilTemp,  b.soilTemp,  2,  0.2);
    c.humidity  = drift(c.humidity,  b.humidity,  8,  0.8);
    c.ph        = drift(c.ph,        b.ph,        0.5, 0.05);
    c.light     = drift(c.light,     b.light,     1200, 100);

    if (hasChanged(potId, c)) {
      await writeSensorReading(potId, c);
      previous[potId] = { ...c }; // update last written
      console.log(`[${new Date().toLocaleTimeString()}] 📝 ${potId} changed — written`);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] ⏭️  ${potId} no change — skipped`);
    }
  }
}

console.log('🌿 Sensor simulator started — writing every 30s');
tick(); // run immediately
setInterval(tick, 30000);