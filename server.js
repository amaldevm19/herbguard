// server.js
require('dotenv').config();
const express     = require('express');
const session     = require('express-session');
const cookieParser = require('cookie-parser');
const { engine }  = require('express-handlebars');
const path        = require('path');
const config      = require('./config');
const db          = require('./db/database');
const { generatePlants, generateHistory } = require('./data/dummy');
const {requireSetup, requireAuth, requirePasswordChange} = require('./middleware/auth');

const authRoutes     = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const plantsRoutes   = require('./routes/plants');
const customerRoutes = require('./routes/customer');

const influx = require('./db/influx');




const app  = express();
const PORT = process.env.PORT || 3000;

// Before express.static
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// ── Handlebars helpers ────────────────────
const hbsHelpers = {
    moistureColor(val, optimalRange) {
        const [min, max] = optimalRange;
        if (val < min - 10 || val > max + 10) return 'var(--red)';
        if (val < min - 2  || val > max + 2)  return 'var(--amber)';
        return 'var(--blue)';
    },
    tempColor(val, optimalRange) {
        const [min, max] = optimalRange;
        if (val < min - 5 || val > max + 5) return 'var(--red)';
        if (val < min - 1 || val > max + 1) return 'var(--amber)';
        return 'var(--blue)';
    },
    humidityColor(val) {
        if (val < 30) return 'var(--red)';
        if (val < 40) return 'var(--amber)';
        return 'var(--green)';
    },
    healthClass(status) {
        return { good: 'health-good', warn: 'health-warn', bad: 'health-bad' }[status] || '';
    },
    healthLabel(status) {
        return { good: 'Healthy', warn: 'Attention', bad: 'Critical' }[status] || '';
    },
    healthIcon(status) {
        return { good: 'heart-pulse', warn: 'triangle-alert', bad: 'circle-x' }[status] || '';
    },
    healthRingColor(status) {
        return { good: '#39d353', warn: '#e3b341', bad: '#f85149' }[status] || '#39d353';
    },
    toPercent(value, max) {
        return Math.min(Math.round((value / max) * 100), 100);
    },
    toFixed(value, decimals) {
        return Number(value).toFixed(decimals);
    },
    formatNumber(value) {
        return Number(value).toLocaleString();
    },
    phDisplay(value) {
        return `pH ${Number(value).toFixed(1)}`;
    },
    isGood(status)       { return status === 'good'; },
    isAlert(status)      { return status === 'warn' || status === 'bad'; },
    isMoreThanOne(val)   { return val > 1; },
    inRange(value, optimalRange) {
        return value >= optimalRange[0] && value <= optimalRange[1];
    },
    gaugeOffset(value, max) {
        const C = 2 * Math.PI * 46;
        return (C - Math.min(value / max, 1) * C).toFixed(1);
    },
    gaugeCircumference() {
        return (2 * Math.PI * 46).toFixed(1);
    },
    gaugeColor(value, optimalRange) {
        const [min, max] = optimalRange;
        if (value < min - 10 || value > max + 10) return '#f85149';
        if (value < min - 2  || value > max + 2)  return '#e3b341';
        return '#39d353';
    },
    lightStatus(active)  { return active ? 'Active' : 'Standby'; },
    json(value)          { return JSON.stringify(value); },
    isAdmin(role) { return role === 'admin'; },
    isStaff(role) { return role === 'staff'; }, 
    
    timeAgo(isoString) {
      if (!isoString) return 'No data';
      const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
      if (diff < 60)    return `${diff}s ago`;
      if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago ⚠️`;
      return `${Math.floor(diff / 86400)}d ago 🚨`;
    }

};

// ── Engine setup ──────────────────────────
app.engine('hbs', engine({
    extname:       '.hbs',
    defaultLayout: 'main',
    layoutsDir:    path.join(__dirname, 'views/layouts'),
    partialsDir:   path.join(__dirname, 'views/partials'),
    helpers:       hbsHelpers
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));



// ── Manifest routes — dynamic so ngrok header always applies ──

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Customer manifest when ?entry=customer
  if (req.query.entry === 'customer') {
    return res.json({
      name: 'HerbGuard Plants',
      short_name: 'HerbGuard',
      description: 'Scan and explore office plants',
      start_url: '/p/last',
      display: 'standalone',
      orientation: 'portrait',
      theme_color: '#161b22',
      background_color: '#0d1117',
      scope: '/',
      icons: [
        { src: '/icons/icon-72x72.png',  sizes: '72x72',  type: 'image/png', purpose: 'maskable any' },
        { src: '/icons/icon-192x192.png',sizes: '192x192',type: 'image/png', purpose: 'maskable any' },
        { src: '/icons/icon-512x512.png',sizes: '512x512',type: 'image/png', purpose: 'maskable any' }
      ],
      categories: ['lifestyle', 'utilities'],
      lang: 'en'
    });
  }

  // Default client manifest
  res.json({
    name: 'HerbGuard Plant Monitor',
    short_name: 'HerbGuard',
    description: 'Smart plant monitoring dashboard',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#161b22',
    background_color: '#0d1117',
    scope: '/',
    icons: [
      { src: '/icons/icon-72x72.png',  sizes: '72x72',  type: 'image/png', purpose: 'maskable any' },
      { src: '/icons/icon-96x96.png',  sizes: '96x96',  type: 'image/png', purpose: 'maskable any' },
      { src: '/icons/icon-192x192.png',sizes: '192x192',type: 'image/png', purpose: 'maskable any' },
      { src: '/icons/icon-512x512.png',sizes: '512x512',type: 'image/png', purpose: 'maskable any' }
    ],
    shortcuts: [
      { name: 'Dashboard', url: '/',       icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }] },
      { name: 'Plants',    url: '/plants', icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }] }
    ],
    categories: ['productivity', 'utilities'],
    lang: 'en'
  });
});

// ── Static files ──────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));


// ── Session ───────────────────────────────
app.use(session({
    name:   config.session.name,
    secret: process.env.SESSION_SECRET || 'herbguard-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge:   config.session.maxAge,
        httpOnly: true,
        sameSite: 'lax'
    }
}));



// ── Global middleware ─────────────────────
// Every request checks setup first

app.use(requireSetup);

// Make app name available in all templates
app.use((req, res, next) => {
  res.locals.appName = 'HerbGuard';
  next();
});

// ── Auth routes (public) ──────────────────
app.use(authRoutes);

// ── Settings routes (protected) ───────────
app.use('/settings', settingsRoutes);

app.use('/plants', plantsRoutes);
app.use('/p',      customerRoutes);

// ── Protected routes ──────────────────────
// Dashboard overview

app.get('/', requireAuth, requirePasswordChange, async (req, res) => {
    try {
        // Get plant metadata from SQLite
        const sqlitePlants = db.getAllPlants();

        // Get latest sensor readings from InfluxDB
        const readings = await influx.getAllLatestReadings();

        // Merge InfluxDB readings into plant metadata
        const mergedPlants = await Promise.all (sqlitePlants.map(async plant => {

            // Safe parse of uses JSON
            let uses = [];
            try { uses = JSON.parse(plant.uses || '[]'); } catch { uses = []; }

            const merged = {
                potId:           plant.pot_id,
                plantName:       plant.plant_name,
                emoji:           plant.emoji       || '🌿',
                species:         plant.species     || '',
                family:          plant.family      || '',
                location:        plant.location    || '',
                description:     plant.description || '',
                uses,
                optimalMoisture: [
                    plant.optimal_moisture_min ?? 30,
                    plant.optimal_moisture_max ?? 60
                ],
                optimalTemp: [
                    plant.optimal_temp_min ?? 18,
                    plant.optimal_temp_max ?? 28
                ],
                optimalPh: [
                    plant.optimal_ph_min ?? 6.0,
                    plant.optimal_ph_max ?? 7.0
                ],
                // Default to 0 — no reading yet
                moisture:  0,
                airTemp:   0,
                soilTemp:  0,
                humidity:  0,
                ph:        0,
                light:     0,
                lastPump:  null,
                nextWater: null,
            };

            // Only overlay if reading exists
            const reading = readings.find(r => r.pot_id === plant.pot_id);
            if (reading) {
                merged.moisture  = reading.moisture  ?? 0;
                merged.airTemp   = reading.air_temp  ?? 0;
                merged.soilTemp  = reading.soil_temp ?? 0;
                merged.humidity  = reading.humidity  ?? 0;
                merged.ph        = reading.ph        ?? 0;
                merged.light     = reading.light     ?? 0;
            }

            // Only calc health if we have real readings
            if (reading) {
                const { status, healthScore, issues } = calcHealth(merged);
                merged.health      = status;
                merged.healthScore = healthScore;
                merged.issues      = issues;
                merged.lastUpdated = await influx.getLastChangeTime(merged.potId);
            } else {
                // No sensor data yet — show neutral state
                merged.health      = 'good';
                merged.healthScore = 0;
                merged.issues      = [];
                merged.noData      = true; // flag for template
            }

            return merged;
        }));

        const totalPots    = mergedPlants.length;
        const healthyCount = mergedPlants.filter(p => p.health === 'good').length;
        const alertCount   = mergedPlants.filter(p => p.health !== 'good').length;
        const needsWater   = mergedPlants.filter(p => p.moisture < 30).length;
        const avgTemp      = (mergedPlants.reduce((s, p) => s + p.airTemp, 0) / mergedPlants.length).toFixed(1);

        res.render('dashboard', {
            pageTitle:   'Dashboard',
            pageCSS:     'dashboard.css',
            pageJS:      'dashboard.js',
            isOverview:  true,
            plants:      mergedPlants,
            totalPots,
            healthyCount,
            alertCount,
            needsWater,
            avgTemp,
            plantsJSON:  JSON.stringify(mergedPlants)
        });

    } catch (err) {
        console.error('Dashboard error:', err);
        res.render('dashboard', {
            pageTitle:    'Dashboard',
            pageCSS:      'dashboard.css',
            pageJS:       'dashboard.js',
            isOverview:   true,
            plants:       [],
            totalPots:    0,
            healthyCount: 0,
            alertCount:   0,
            needsWater:   0,
            avgTemp:      '0.0',
            plantsJSON:   '[]',
            error:        'Unable to load plant data due to server error. Please try again.'
        });
    }
});


// Plant detail page
app.get('/plant/:potId', requireAuth, requirePasswordChange, async (req, res) => {
    try {
        // Get plant metadata from SQLite
        const sqlitePlant = db.getPlantByPotId(req.params.potId);
        if (!sqlitePlant) return res.redirect('/');

        // Build normalised plant object from SQLite columns
        let uses = [];
        try { uses = JSON.parse(sqlitePlant.uses || '[]'); } catch { uses = []; }

        const plant = {
            potId:           sqlitePlant.pot_id,
            plantName:       sqlitePlant.plant_name,
            emoji:           sqlitePlant.emoji        || '🌿',
            species:         sqlitePlant.species      || '',
            family:          sqlitePlant.family       || '',
            location:        sqlitePlant.location     || '',
            description:     sqlitePlant.description  || '',
            uses,
            optimalMoisture: [sqlitePlant.optimal_moisture_min ?? 30, sqlitePlant.optimal_moisture_max ?? 60],
            optimalTemp:     [sqlitePlant.optimal_temp_min     ?? 18, sqlitePlant.optimal_temp_max     ?? 28],
            optimalPh:       [sqlitePlant.optimal_ph_min       ?? 6.0, sqlitePlant.optimal_ph_max      ?? 7.0],
            // Sensor defaults
            moisture:  0,
            airTemp:   0,
            soilTemp:  0,
            humidity:  0,
            ph:        0,
            light:     0,
            lastPump:  null,
            nextWater: null,
            noData:    true
        };

        // Overlay latest InfluxDB reading
        const reading = await influx.getLatestReading(req.params.potId);
        if (reading) {
            plant.moisture  = reading.moisture  ?? 0;
            plant.airTemp   = reading.air_temp  ?? 0;
            plant.soilTemp  = reading.soil_temp ?? 0;
            plant.humidity  = reading.humidity  ?? 0;
            plant.ph        = reading.ph        ?? 0;
            plant.light     = reading.light     ?? 0;
            plant.noData    = false;
        }

        // Recalculate health with real values
        const { status, healthScore, issues } = calcHealth(plant);
        plant.health      = status;
        plant.healthScore = healthScore;
        plant.issues      = issues;
        plant.lastUpdated = await influx.getLastChangeTime(req.params.potId);
        // Get raw history from InfluxDB — no remapping, keep original keys
        const history = await influx.getSensorHistory(req.params.potId, 48);

        const gauges = [
            { key:'moisture', label:'Soil Moisture', value:plant.moisture, unit:'%',   max:100,  icon:'droplets',      optimal:plant.optimalMoisture },
            { key:'humidity', label:'Air Humidity',  value:plant.humidity, unit:'%',   max:100,  icon:'wind',          optimal:[40,70]               },
            { key:'airTemp',  label:'Air Temp',      value:plant.airTemp,  unit:'°C',  max:50,   icon:'thermometer',   optimal:plant.optimalTemp      },
            { key:'soilTemp', label:'Soil Temp',     value:plant.soilTemp, unit:'°C',  max:50,   icon:'thermometer',   optimal:[15,25]                },
            { key:'ph',       label:'pH Level',      value:plant.ph,       unit:'pH',  max:14,   icon:'flask-conical', optimal:plant.optimalPh        },
            { key:'light',    label:'Light',         value:plant.light,    unit:'lux', max:8000, icon:'sun',           optimal:[3000,7000]            }
        ];

        res.render('plant-detail', {
            pageTitle:   plant.plantName,
            pageCSS:     'plant-detail.css',
            pageJS:      'plant-detail.js',
            plant,
            gauges,
            historyJSON: JSON.stringify(history),
            plantJSON:   JSON.stringify(plant)
        });

    } catch (err) {
        console.error('Plant detail error:', err);
        res.status(500).render('error', {
            pageTitle: 'Something went wrong',
            layout:    'minimal',
            message:   'Unable to load plant data. Please try again.',
            backUrl:   '/'
        });
    }
});

// ── API routes (protected) ────────────────
app.get('/api/plants', requireAuth, async (req, res) => {
  try {
    const sqlitePlants = db.getAllPlants();
    const readings     = await influx.getAllLatestReadings();

    const merged =  await Promise.all (sqlitePlants.map(async plant => {
      let uses = [];
      try { uses = JSON.parse(plant.uses || '[]'); } catch { uses = []; }

      const merged = {
        potId:           plant.pot_id,
        plantName:       plant.plant_name,
        emoji:           plant.emoji       || '🌿',
        species:         plant.species     || '',
        family:          plant.family      || '',
        location:        plant.location    || '',
        description:     plant.description || '',
        uses,
        optimalMoisture: [plant.optimal_moisture_min ?? 30, plant.optimal_moisture_max ?? 60],
        optimalTemp:     [plant.optimal_temp_min     ?? 18, plant.optimal_temp_max     ?? 28],
        optimalPh:       [plant.optimal_ph_min       ?? 6.0, plant.optimal_ph_max      ?? 7.0],
        moisture:  0,
        airTemp:   0,
        soilTemp:  0,
        humidity:  0,
        ph:        0,
        light:     0,
        lastPump:  null,
        nextWater: null,
        noData:    true
      };

      const reading = readings.find(r => r.pot_id === plant.pot_id);
      if (reading) {
        merged.moisture  = reading.moisture  ?? 0;
        merged.airTemp   = reading.air_temp  ?? 0;
        merged.soilTemp  = reading.soil_temp ?? 0;
        merged.humidity  = reading.humidity  ?? 0;
        merged.ph        = reading.ph        ?? 0;
        merged.light     = reading.light     ?? 0;
        merged.noData    = false;
      }

      const { status, healthScore, issues } = calcHealth(merged);
      merged.health      = status;
      merged.healthScore = healthScore;
      merged.issues      = issues;
      merged.lastUpdated = await influx.getLastChangeTime(merged.potId);
      return merged;
    }));

    res.json(merged);

  } catch (err) {
    console.error('/api/plants error:', err);
    res.status(500).json({ error: 'Unable to fetch plant data' });
  }
});

// Get single plant latest reading
app.get('/api/plant/:potId/latest', requireAuth, async (req, res) => {
  try {
    const sqlitePlant = db.getPlantByPotId(req.params.potId);
    if (!sqlitePlant) return res.status(404).json({ error: 'Plant not found' });

    let uses = [];
    try { uses = JSON.parse(sqlitePlant.uses || '[]'); } catch { uses = []; }

    const plant = {
      potId:           sqlitePlant.pot_id,
      plantName:       sqlitePlant.plant_name,
      emoji:           sqlitePlant.emoji       || '🌿',
      species:         sqlitePlant.species     || '',
      family:          sqlitePlant.family      || '',
      location:        sqlitePlant.location    || '',
      description:     sqlitePlant.description || '',
      uses,
      optimalMoisture: [sqlitePlant.optimal_moisture_min ?? 30, sqlitePlant.optimal_moisture_max ?? 60],
      optimalTemp:     [sqlitePlant.optimal_temp_min     ?? 18, sqlitePlant.optimal_temp_max     ?? 28],
      optimalPh:       [sqlitePlant.optimal_ph_min       ?? 6.0, sqlitePlant.optimal_ph_max      ?? 7.0],
      moisture:  0,
      airTemp:   0,
      soilTemp:  0,
      humidity:  0,
      ph:        0,
      light:     0,
      lastPump:  null,
      nextWater: null,
      noData:    true
    };

    const reading = await influx.getLatestReading(req.params.potId);
    if (reading) {
      plant.moisture  = reading.moisture  ?? 0;
      plant.airTemp   = reading.air_temp  ?? 0;
      plant.soilTemp  = reading.soil_temp ?? 0;
      plant.humidity  = reading.humidity  ?? 0;
      plant.ph        = reading.ph        ?? 0;
      plant.light     = reading.light     ?? 0;
      plant.noData    = false;
    }

    const { status, healthScore, issues } = calcHealth(plant);
    plant.health      = status;
    plant.healthScore = healthScore;
    plant.issues      = issues;
    plant.lastUpdated = await influx.getLastChangeTime(req.params.potId);
    res.json(plant);

  } catch (err) {
    console.error('/api/plant/:potId/latest error:', err);
    res.status(500).json({ error: 'Unable to fetch plant data' });
  }
});

// Get sensor history for charts
app.get('/api/plant/:potId/history', requireAuth, async (req, res) => {
  try {
    const hours   = parseInt(req.query.hours) || 24;
    const history = await influx.getSensorHistory(req.params.potId, hours);
    res.json(history);
  } catch (err) {
    console.error('InfluxDB error:', err);
    res.json([]);
  }
});

// Offline fallback page
app.get('/offline', (req, res) => {
  res.render('offline', {
    pageTitle: 'Offline',
    layout:    'minimal'
  });
});

// ── Start ─────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 HerbGuard running at http://localhost:${PORT}\n`);
});


// Work out health status based on whether readings are in optimal range
function calcHealth(plant) {
  const issues = [];

  const [minM, maxM] = plant.optimalMoisture;
  const [minP, maxP] = plant.optimalPh;
  const [minT, maxT] = plant.optimalTemp;

  // Critical = more than 10 units outside range
  // Warning  = outside range but within 10 units
  // The jitter is now so small (±1.5 max) that a base value
  // inside the range will NEVER randomly cross into warning
  if      (plant.moisture < minM - 10) issues.push('Moisture critical');
  else if (plant.moisture < minM - 2)  issues.push('Moisture low');
  else if (plant.moisture > maxM + 10) issues.push('Moisture critical');
  else if (plant.moisture > maxM + 2)  issues.push('Moisture high');

  if      (plant.airTemp < minT - 5)   issues.push('Temperature critical');
  else if (plant.airTemp < minT - 1)   issues.push('Temperature low');
  else if (plant.airTemp > maxT + 5)   issues.push('Temperature critical');
  else if (plant.airTemp > maxT + 1)   issues.push('Temperature high');

  if      (plant.ph < minP - 1)        issues.push('pH critical');
  else if (plant.ph < minP - 0.3)      issues.push('pH low');
  else if (plant.ph > maxP + 1)        issues.push('pH critical');
  else if (plant.ph > maxP + 0.3)      issues.push('pH high');

  const hasCritical = issues.some(i => i.includes('critical'));

  return {
    status:      hasCritical ? 'bad' : issues.length > 0 ? 'warn' : 'good',
    healthScore: hasCritical ? 40 + Math.floor(Math.random() * 15): issues.length > 0 ? 65 + Math.floor(Math.random() * 15): 88 + Math.floor(Math.random() * 12),
    issues
  };
}