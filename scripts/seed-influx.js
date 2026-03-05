// scripts/seed-influx.js
// Run once to seed InfluxDB with dummy historical data
// node scripts/seed-influx.js

require('dotenv').config();
const { writeSensorReading } = require('../db/influx');

const POTS = ['POT-001', 'POT-002', 'POT-003', 'POT-004'];

// Base values per pot
const BASE = {
  'POT-001': { moisture: 45, airTemp: 22, soilTemp: 20, humidity: 55, ph: 6.5, light: 4500 },
  'POT-002': { moisture: 60, airTemp: 23, soilTemp: 21, humidity: 58, ph: 6.8, light: 3800 },
  'POT-003': { moisture: 30, airTemp: 21, soilTemp: 19, humidity: 50, ph: 7.1, light: 5200 },
  'POT-004': { moisture: 55, airTemp: 24, soilTemp: 22, humidity: 62, ph: 6.2, light: 4100 }
};

function randomVariation(base, range) {
  return +(base + (Math.random() - 0.5) * range * 2).toFixed(2);
}

async function seed() {
  console.log('🌱 Seeding InfluxDB with dummy data...');

  const now     = Date.now();
  const hours   = 48;
  const interval = 30 * 60 * 1000; // 30 minutes
  const points  = (hours * 60 * 60 * 1000) / interval;

  for (const potId of POTS) {
    const base = BASE[potId];
    console.log(`  Writing ${points} points for ${potId}...`);

    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now - i * interval);
      await writeSensorReading(potId, {
        moisture:  randomVariation(base.moisture,  8),
        airTemp:   randomVariation(base.airTemp,   2),
        soilTemp:  randomVariation(base.soilTemp,  1.5),
        humidity:  randomVariation(base.humidity,  5),
        ph:        randomVariation(base.ph,        0.3),
        light:     randomVariation(base.light,     800)
      });
    }

    console.log(`  ✅ ${potId} done`);
  }

  console.log('\n✅ Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});