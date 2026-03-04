// routes/plants.js
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const db       = require('../db/database');
const { requireAuth, requirePasswordChange } = require('../middleware/auth');

// All plant management routes require auth
router.use(requireAuth);
router.use(requirePasswordChange);

// ── Multer setup ──────────────────────────
// Images saved to public/uploads/plants/:potId/
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(
      __dirname, '..', 'public', 'uploads', 'plants', req.params.potId
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext     = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ── GET /plants ───────────────────────────
router.get('/', (req, res) => {
  const plants = db.getAllPlants();

  // Attach primary image to each plant
  const plantsWithImages = plants.map(plant => {
    const images  = db.getPlantImages(plant.pot_id);
    const primary = images.find(i => i.is_primary) || images[0] || null;
    return {
      ...plant,
      uses:         JSON.parse(plant.uses || '[]'),
      primaryImage: primary
        ? `/uploads/plants/${plant.pot_id}/${primary.filename}`
        : null
    };
  });

  res.render('plants/index', {
    pageTitle:   'Plant Management',
    pageCSS:     'plants.css',
    isPlants:    true,
    plants:      plantsWithImages,
    success:     req.query.success || null,
    error:       req.query.error   || null
  });
});

// ── GET /plants/new ───────────────────────
router.get('/new', (req, res) => {
  const nextPotId = db.getNextPotId();
  res.render('plants/form', {
    pageTitle:  'Add Plant',
    pageCSS:    'plants.css',
    pageCSS2:   'auth.css',
    isPlants:   true,
    plant:      null,
    nextPotId,
    error:      null
  });
});

// ── POST /plants/new ──────────────────────
router.post('/new', (req, res) => {
  const {
    pot_id, plant_name, emoji, species, family,
    description, location, installed_date,
    optimal_moisture_min, optimal_moisture_max,
    optimal_ph_min, optimal_ph_max,
    optimal_temp_min, optimal_temp_max
  } = req.body;

  // Parse uses — comes as comma separated string
  const usesRaw = req.body.uses || '';
  const uses    = JSON.stringify(
    usesRaw.split(',').map(u => u.trim()).filter(Boolean)
  );

  try {
    db.createPlant({
      pot_id, plant_name, emoji: emoji || '🌿',
      species, family, description, uses, location,
      optimal_moisture_min: parseFloat(optimal_moisture_min) || 30,
      optimal_moisture_max: parseFloat(optimal_moisture_max) || 60,
      optimal_ph_min:       parseFloat(optimal_ph_min)       || 6.0,
      optimal_ph_max:       parseFloat(optimal_ph_max)       || 7.0,
      optimal_temp_min:     parseFloat(optimal_temp_min)     || 18,
      optimal_temp_max:     parseFloat(optimal_temp_max)     || 28,
      installed_date:       installed_date || null
    });
    res.redirect(`/plants/${pot_id}?success=Plant added successfully`);
  } catch (err) {
    res.render('plants/form', {
      pageTitle:  'Add Plant',
      pageCSS:    'plants.css',
      pageCSS2:   'auth.css',
      isPlants:   true,
      plant:      null,
      nextPotId:  pot_id,
      error:      err.message.includes('UNIQUE')
                  ? `${pot_id} already exists`
                  : err.message
    });
  }
});

// ── GET /plants/:potId ────────────────────
router.get('/:potId', (req, res) => {
  const plant = db.getPlantByPotId(req.params.potId);
  if (!plant) return res.redirect('/plants');

  const images = db.getPlantImages(plant.pot_id);
  const config = db.getAllConfig();

  res.render('plants/detail', {
    pageTitle:  plant.plant_name,
    pageCSS:    'plants.css',
    pageCSS2:   'auth.css', 
    isPlants:   true,
    plant: {
      ...plant,
      uses:           JSON.parse(plant.uses || '[]'),
      optimalMoisture:[plant.optimal_moisture_min, plant.optimal_moisture_max],
      optimalPh:      [plant.optimal_ph_min,       plant.optimal_ph_max],
      optimalTemp:    [plant.optimal_temp_min,      plant.optimal_temp_max]
    },
    images,
    localUrl:   config.local_url  || '',
    publicUrl:  config.public_url || '',
    success:    req.query.success || null,
    error:      req.query.error   || null
  });
});

// ── GET /plants/:potId/edit ───────────────
router.get('/:potId/edit', (req, res) => {
  const plant = db.getPlantByPotId(req.params.potId);
  if (!plant) return res.redirect('/plants');

  res.render('plants/form', {
    pageTitle:  `Edit ${plant.plant_name}`,
    pageCSS:    'plants.css',
    pageCSS2:   'auth.css',
    isPlants:   true,
    plant: {
      ...plant,
      uses: JSON.parse(plant.uses || '[]').join(', ')
    },
    nextPotId:  plant.pot_id,
    error:      null
  });
});

// ── POST /plants/:potId/edit ──────────────
router.post('/:potId/edit', (req, res) => {
  const {
    plant_name, emoji, species, family,
    description, location, installed_date,
    optimal_moisture_min, optimal_moisture_max,
    optimal_ph_min, optimal_ph_max,
    optimal_temp_min, optimal_temp_max
  } = req.body;

  const usesRaw = req.body.uses || '';
  const uses    = JSON.stringify(
    usesRaw.split(',').map(u => u.trim()).filter(Boolean)
  );

  db.updatePlant(req.params.potId, {
    plant_name, emoji: emoji || '🌿',
    species, family, description, uses, location,
    optimal_moisture_min: parseFloat(optimal_moisture_min) || 30,
    optimal_moisture_max: parseFloat(optimal_moisture_max) || 60,
    optimal_ph_min:       parseFloat(optimal_ph_min)       || 6.0,
    optimal_ph_max:       parseFloat(optimal_ph_max)       || 7.0,
    optimal_temp_min:     parseFloat(optimal_temp_min)     || 18,
    optimal_temp_max:     parseFloat(optimal_temp_max)     || 28,
    installed_date:       installed_date || null
  });

  res.redirect(`/plants/${req.params.potId}?success=Plant updated successfully`);
});

// POST /plants/:potId/images
router.post('/:potId/images', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.redirect(
      `/plants/${req.params.potId}?error=No image uploaded or invalid file type`
    );
  }

  // Check image count limit
  const existing = db.getPlantImages(req.params.potId);
  if (existing.length >= 5) {
    // Delete the uploaded file since we won't use it
    const fs     = require('fs');
    const path   = require('path');
    const uploaded = path.join(
      __dirname, '..', 'public', 'uploads',
      'plants', req.params.potId, req.file.filename
    );
    if (fs.existsSync(uploaded)) fs.unlinkSync(uploaded);

    return res.redirect(
      `/plants/${req.params.potId}?error=Maximum 5 images allowed per plant. Delete an existing image first.`
    );
  }

  const isPrimary = existing.length === 0 ? 1 : 0;
  db.addPlantImage(
    req.params.potId,
    req.file.filename,
    req.body.caption || '',
    isPrimary
  );

  res.redirect(`/plants/${req.params.potId}?success=Image uploaded`);
});

// ── POST /plants/:potId/images/:id/primary
router.post('/:potId/images/:id/primary', (req, res) => {
  db.setPrimaryImage(req.params.id, req.params.potId);
  res.redirect(`/plants/${req.params.potId}?success=Primary image updated`);
});


// ── POST /plants/:potId/images/:id/delete
router.post('/:potId/images/:id/delete', (req, res) => {
  const imgRow = db.getImageById(req.params.id);
  if (imgRow) {
    const filePath = path.join(
      __dirname, '..', 'public', 'uploads',
      'plants', req.params.potId, imgRow.filename
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.deletePlantImage(req.params.id);
  }
  res.redirect(`/plants/${req.params.potId}?success=Image deleted`);
});

// ── POST /plants/:potId/qr ────────────────
router.post('/:potId/qr', (req, res) => {
  const { local_url, public_url } = req.body;
  const potId = req.params.potId;

  const localFull  = local_url  ? `${local_url}/p/${potId}`  : '';
  const publicFull = public_url ? `${public_url}/p/${potId}` : '';

  db.updatePlantQR(potId, localFull, publicFull);

  // Also save base URLs to config
  if (local_url)  db.setConfig('local_url',  local_url);
  if (public_url) db.setConfig('public_url', public_url);

  res.json({ localUrl: localFull, publicUrl: publicFull });
});

// ── POST /plants/:potId/delete ────────────
router.post('/:potId/delete', (req, res) => {
  db.deletePlant(req.params.potId);
  res.redirect('/plants?success=Plant removed');
});

module.exports = router;