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
/*
app.get('/manifest.json', (req, res) => {
  console.log('✅ manifest.json requested');
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if(req.query.entry === 'customer') {
        return res.json({
            name: 'HerbGuard Plant Monitor',
            short_name: 'HerbGuard',
            description: 'Smart plant monitoring dashboard',
            start_url: '/p/last',
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
    } 

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
*/

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

app.get('/', requireAuth, requirePasswordChange, (req, res) => {
    const plants       = generatePlants();
    const totalPots    = plants.length;
    const healthyCount = plants.filter(p => p.health === 'good').length;
    const alertCount   = plants.filter(p => p.health !== 'good').length;
    const needsWater   = plants.filter(p => p.moisture < 30).length;
    const avgTemp      = (plants.reduce((s, p) => s + p.airTemp, 0) / plants.length).toFixed(1);
    res.render('dashboard', {
        pageTitle:   'Dashboard',
        pageCSS:     'dashboard.css',
        pageJS:      'dashboard.js',
        isOverview:  true,
        plants,
        totalPots,
        healthyCount,
        alertCount,
        needsWater,
        avgTemp,
        plantsJSON:  JSON.stringify(plants)
    });
});

// Plant detail page
app.get('/plant/:potId', requireAuth, requirePasswordChange, (req, res) => {
    const plants = generatePlants();
    const plant  = plants.find(p => p.potId === req.params.potId);
    if (!plant) return res.redirect('/');
    const history = generateHistory(
        { base: {
            moisture: plant.moisture,
            airTemp:  plant.airTemp,
            soilTemp: plant.soilTemp,
            humidity: plant.humidity,
            ph:       plant.ph,
            light:    plant.light
        }},
        48
    );
    const gauges = [
        { key:'moisture', label:'Soil Moisture', value:plant.moisture, unit:'%',   max:100,  icon:'droplets',      optimal:plant.optimalMoisture },
        { key:'humidity', label:'Air Humidity',  value:plant.humidity, unit:'%',   max:100,  icon:'wind',          optimal:[40,70] },
        { key:'airTemp',  label:'Air Temp',      value:plant.airTemp,  unit:'°C',  max:50,   icon:'thermometer',   optimal:plant.optimalTemp },
        { key:'soilTemp', label:'Soil Temp',     value:plant.soilTemp, unit:'°C',  max:50,   icon:'thermometer',   optimal:[15,25] },
        { key:'ph',       label:'pH Level',      value:plant.ph,       unit:'pH',  max:14,   icon:'flask-conical', optimal:plant.optimalPh },
        { key:'light',    label:'Light',         value:plant.light,    unit:'lux', max:8000, icon:'sun',           optimal:[3000,7000] }
    ];
    res.render('plant-detail', {
        pageTitle:   plant.plantName,
        pageCSS:     'plant-detail.css',
        pageJS:      'plant-detail.js',
        plant,
        gauges,
        historyJSON: JSON.stringify(history),
        plantJSON:   JSON.stringify(plant)
    })
});

// ── API routes (protected) ────────────────
app.get('/api/plants', requireAuth, (req, res) => {
  res.json(generatePlants());
});

app.get('/api/plant/:potId/latest', requireAuth, (req, res) => {
  const plants = generatePlants();
  const plant  = plants.find(p => p.potId === req.params.potId);
  if (!plant) return res.status(404).json({ error: 'Not found' });
  res.json(plant);
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
