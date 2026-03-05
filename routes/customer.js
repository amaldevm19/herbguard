// routes/customer.js
const express      = require('express');
const router       = express.Router();
const db           = require('../db/database');
const influx       = require('../db/influx');

// ── GET /p/last ───────────────────────────
router.get('/last', (req, res) => {
  const lastPot = req.cookies && req.cookies['hg_last_plant'];
  if (lastPot) return res.redirect(`/p/${lastPot}`);
  res.render('customer/landing', {
    pageTitle: 'HerbGuard Plants',
    layout:    'customer'
  });
});

// ── GET /p/:potId ─────────────────────────
router.get('/:potId', async (req, res) => {
  try {
    const plant = db.getPlantByPotId(req.params.potId);

    if (!plant || !plant.active) {
      return res.render('customer/not-found', {
        pageTitle: 'Plant Not Found',
        layout:    'customer',
        potId:     req.params.potId
      });
    }

    res.cookie('hg_last_plant', req.params.potId, {
      maxAge:   30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax'
    });

    const images  = db.getPlantImages(plant.pot_id);
    const uses    = JSON.parse(plant.uses || '[]');

    // Fetch sensor data from InfluxDB
    const reading = await influx.getLatestReading(req.params.potId);
    const history = await influx.getSensorHistory(req.params.potId, 24);
    const lastUpdated = await influx.getLastChangeTime(req.params.potId);

    const sensorData = {
      moisture:  reading?.moisture  ?? null,
      airTemp:   reading?.air_temp  ?? null,
      soilTemp:  reading?.soil_temp ?? null,
      humidity:  reading?.humidity  ?? null,
      ph:        reading?.ph        ?? null,
      light:     reading?.light     ?? null,
      hasData:   !!reading
    };

    res.render('customer/plant', {
      pageTitle: plant.plant_name,
      layout:    'customer',
      plant: {
        ...plant,
        uses,
        optimalMoisture: [plant.optimal_moisture_min, plant.optimal_moisture_max],
        optimalPh:       [plant.optimal_ph_min,       plant.optimal_ph_max],
        optimalTemp:     [plant.optimal_temp_min,      plant.optimal_temp_max]
      },
      images,
      primaryImage: images.find(i => i.is_primary) || images[0] || null,
      sensor:       sensorData,
      historyJSON:  JSON.stringify(history),
      lastUpdated
    });

  } catch (err) {
    console.error('Customer plant error:', err);
    res.render('customer/not-found', {
      pageTitle: 'Plant Not Found',
      layout:    'customer',
      potId:     req.params.potId
    });
  }
});

module.exports = router;