const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const { generatePlants, generateHistory  } = require('./data/dummy');

const app = express();
const PORT = process.env.PORT || 3001;

const hbsHelpers = {
    // Returns a CSS class string based on health status
    // Usage: <div class="card {{healthClass health}}">
    healthClass(status) {
        return { good: 'health-good', warn: 'health-warn', bad: 'health-bad' }[status] || '';
    },

    // Returns health label text
    // Usage: {{healthLabel health}}
    healthLabel(status) {
        return { good: 'Healthy', warn: 'Attention', bad: 'Critical' }[status] || '';
    },

    // Returns health icon name (Lucide)
    // Usage: <i data-lucide="{{healthIcon health}}"></i>
    healthIcon(status) {
        return { good: 'heart-pulse', warn: 'triangle-alert', bad: 'circle-x' }[status] || '';
    },

    // Returns CSS colour variable string for a metric value
    // Usage: <span style="color:{{moistureColor moisture}}">
    moistureColor(val,optimalRange) {
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

    // Converts a number to percentage bar width (capped at 100)
    // Usage: style="width:{{toPercent moisture 100}}%"
    toPercent(value, max) {
        return Math.min(Math.round((value / max) * 100), 100);
    },

    // Rounds a number to fixed decimal places
    // Usage: {{toFixed airTemp 1}}
    toFixed(value, decimals) {
        return Number(value).toFixed(decimals);
    },

    // Formats a large number with comma separator
    // Usage: {{formatNumber light}}
    formatNumber(value) {
        return Number(value).toLocaleString();
    },

    // Returns pH to one decimal place as a string
    // Usage: {{phDisplay ph}}
    phDisplay(value) {
        return `pH ${Number(value).toFixed(1)}`;
    },

    // Boolean check: is health === 'good'
    // Usage: {{#if (isGood health)}} ... {{/if}}
    isGood(status) {
        return status === 'good';
    },

    // Boolean check: is health 'warn' or 'bad'
    isAlert(status) {
        return status === 'warn' || status === 'bad';
    },

    isMoreThanOne(val) {
        return val > 1;
    },

    json(value) {
        return JSON.stringify(value);
    },

    // Calculates gauge stroke-dashoffset for SVG circle gauges
    // circumference = 2 * PI * radius. We use r=46 so C = 289.0
    // Usage: {{gaugeOffset value max}}
    gaugeOffset(value, max) {
        const C = 2 * Math.PI * 46;
        const pct = Math.min(value / max, 1);
        return (C - pct * C).toFixed(1);
    },

    // Full circumference constant for SVG gauge dasharray
    gaugeCircumference() {
        return (2 * Math.PI * 46).toFixed(1);
    },

    // Returns gauge arc color based on value vs optimal range
    gaugeColor(value, optimalRange) {
        const [min, max] = optimalRange;
        if (value < min - 10 || value > max + 10) return '#f85149'; // red
        if (value < min - 2  || value > max + 2)  return '#e3b341'; // amber
        return '#39d353'; // green
    },

    // Checks if a value is within its optimal range
    // Usage: {{#if (inRange ph optimalPh)}} ... {{/if}}
    inRange(value, optimalRange) {
        return value >= optimalRange[0] && value <= optimalRange[1];
    },

    // Returns 'Yes' or 'No' for light active status
    lightStatus(active) {
        return active ? 'Active' : 'Standby';
    },
    // Used for the health ring SVG stroke color
    healthRingColor(status) {
    return { good: '#39d353', warn: '#e3b341', bad: '#f85149' }[status] || '#39d353';
    },
}

// Set up Handlebars as the view engine
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: hbsHelpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/',(req, res)=>{
    const plants  = generatePlants();
    // Shape summary stats here in the route — not in the template
    const totalPots   = plants.length;
    const healthyCount = plants.filter(p => p.health === 'good').length;
    const alertCount  = plants.filter(p => p.health !== 'good').length;
    const needsWater  = plants.filter(p => p.moisture < 30).length;
    const avgTemp     = (plants.reduce((s, p) => s + p.airTemp, 0) / plants.length).toFixed(1);
    res.render('dashboard', {
        pageTitle:    'Dashboard',
        pageCSS:      'dashboard.css',
        pageJS:       'dashboard.js',
        isOverview:   true,
        plants,
        totalPots,
        healthyCount,
        alertCount,
        needsWater,
        avgTemp,
        plantsJSON:   JSON.stringify(plants)
    });
})

// Plant detail page
app.get('/plant/:potId', (req, res) => {
  const plants = generatePlants();
  const plant  = plants.find(p => p.potId === req.params.potId);

  // If pot ID not found redirect home
  if (!plant) return res.redirect('/');

  // Pull base plant data for history generation
  const { generateHistory } = require('./data/dummy');
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

  // Shape gauge data here in the route — not in the template
  const gauges = [
    {
      key:     'moisture',
      label:   'Soil Moisture',
      value:   plant.moisture,
      unit:    '%',
      max:     100,
      icon:    'droplets',
      optimal: plant.optimalMoisture
    },
    {
      key:     'humidity',
      label:   'Air Humidity',
      value:   plant.humidity,
      unit:    '%',
      max:     100,
      icon:    'wind',
      optimal: [40, 70]
    },
    {
      key:     'airTemp',
      label:   'Air Temp',
      value:   plant.airTemp,
      unit:    '°C',
      max:     50,
      icon:    'thermometer',
      optimal: plant.optimalTemp
    },
    {
      key:     'soilTemp',
      label:   'Soil Temp',
      value:   plant.soilTemp,
      unit:    '°C',
      max:     50,
      icon:    'thermometer',
      optimal: [15, 25]
    },
    {
      key:     'ph',
      label:   'pH Level',
      value:   plant.ph,
      unit:    'pH',
      max:     14,
      icon:    'flask-conical',
      optimal: plant.optimalPh
    },
    {
      key:     'light',
      label:   'Light',
      value:   plant.light,
      unit:    'lux',
      max:     8000,
      icon:    'sun',
      optimal: [3000, 7000]
    }
  ];

  res.render('plant-detail', {
    pageTitle:  plant.plantName,
    pageCSS:    'plant-detail.css',
    pageJS:     'plant-detail.js',
    plant,
    gauges,
    historyJSON:  JSON.stringify(history),
    plantJSON:    JSON.stringify(plant)
  });
});

// API — used later for live polling from the browser
app.get('/api/plants', (req, res) => {
  res.json(generatePlants());
});

// API — single plant latest reading
app.get('/api/plant/:potId/latest', (req, res) => {
  const plants = generatePlants();
  const plant  = plants.find(p => p.potId === req.params.potId);
  if (!plant) return res.status(404).json({ error: 'Not found' });
  res.json(plant);
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🌿 HerbGuard running at http://localhost:${PORT}\n`);
});
