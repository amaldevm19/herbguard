// db/database.js
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const db = new Database(path.join(__dirname, '..', 'herbguard.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ── Schema ────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    username             TEXT UNIQUE NOT NULL,
    password             TEXT NOT NULL,
    role                 TEXT NOT NULL DEFAULT 'staff',
    must_change_password INTEGER NOT NULL DEFAULT 0,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    last_login           TEXT
  );

  CREATE TABLE IF NOT EXISTS plants (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    pot_id               TEXT UNIQUE NOT NULL,
    plant_name           TEXT NOT NULL,
    emoji                TEXT DEFAULT '🌿',
    species              TEXT,
    family               TEXT,
    description          TEXT,
    uses                 TEXT DEFAULT '[]',
    location             TEXT,
    optimal_moisture_min REAL DEFAULT 30,
    optimal_moisture_max REAL DEFAULT 60,
    optimal_ph_min       REAL DEFAULT 6.0,
    optimal_ph_max       REAL DEFAULT 7.0,
    optimal_temp_min     REAL DEFAULT 18,
    optimal_temp_max     REAL DEFAULT 28,
    qr_local_url         TEXT,
    qr_public_url        TEXT,
    active               INTEGER DEFAULT 1,
    installed_date       TEXT,
    created_at           TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plant_images (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pot_id      TEXT NOT NULL,
    filename    TEXT NOT NULL,
    caption     TEXT,
    is_primary  INTEGER DEFAULT 0,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_config (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ── Seed default app config ───────────────
const seedConfig = db.prepare(
  'INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)'
);
seedConfig.run('local_url',  '');
seedConfig.run('public_url', '');
seedConfig.run('app_name',   'HerbGuard');

// ══════════════════════════════════════════
// USER OPERATIONS
// ══════════════════════════════════════════

function isSetupComplete() {
  return db.prepare('SELECT COUNT(*) as count FROM users').get().count > 0;
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getAllUsers() {
  return db.prepare(
    'SELECT id, username, role, must_change_password, created_at, last_login FROM users ORDER BY created_at ASC'
  ).all();
}

function createAdmin(password) {
  const hashed   = bcrypt.hashSync(password, 12);
  const username = 'admin';
  const role     = 'admin';
  return db.prepare(
    'INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, 0)'
  ).run(username, hashed, role);
}

function createUser(username, password, role = 'staff') {
  const hashed = bcrypt.hashSync(password, 12);
  return db.prepare(
    'INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, 1)'
  ).run(username, hashed, role);
}

function verifyPassword(username, plainPassword) {
  const user = getUserByUsername(username);
  if (!user) return null;
  return bcrypt.compareSync(plainPassword, user.password) ? user : null;
}

function updatePassword(userId, newPassword) {
  const hashed = bcrypt.hashSync(newPassword, 12);
  return db.prepare(
    'UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?'
  ).run(hashed, userId);
}

function updateLastLogin(userId) {
  return db.prepare(
    'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?'
  ).run(userId);
}

function deleteUser(userId) {
  return db.prepare(
    'DELETE FROM users WHERE id = ? AND role != \'admin\''
  ).run(userId);
}

// ══════════════════════════════════════════
// PLANT OPERATIONS
// ══════════════════════════════════════════

function getAllPlants() {
  return db.prepare(
    'SELECT * FROM plants WHERE active = 1 ORDER BY pot_id ASC'
  ).all();
}

function getPlantByPotId(potId) {
  return db.prepare(
    'SELECT * FROM plants WHERE pot_id = ?'
  ).get(potId);
}

function createPlant(data) {
  return db.prepare(`
    INSERT INTO plants (
      pot_id, plant_name, emoji, species, family,
      description, uses, location,
      optimal_moisture_min, optimal_moisture_max,
      optimal_ph_min, optimal_ph_max,
      optimal_temp_min, optimal_temp_max,
      installed_date
    ) VALUES (
      @pot_id, @plant_name, @emoji, @species, @family,
      @description, @uses, @location,
      @optimal_moisture_min, @optimal_moisture_max,
      @optimal_ph_min, @optimal_ph_max,
      @optimal_temp_min, @optimal_temp_max,
      @installed_date
    )
  `).run(data);
}

function updatePlant(potId, data) {
  return db.prepare(`
    UPDATE plants SET
      plant_name           = @plant_name,
      emoji                = @emoji,
      species              = @species,
      family               = @family,
      description          = @description,
      uses                 = @uses,
      location             = @location,
      optimal_moisture_min = @optimal_moisture_min,
      optimal_moisture_max = @optimal_moisture_max,
      optimal_ph_min       = @optimal_ph_min,
      optimal_ph_max       = @optimal_ph_max,
      optimal_temp_min     = @optimal_temp_min,
      optimal_temp_max     = @optimal_temp_max,
      installed_date       = @installed_date
    WHERE pot_id = ?
  `).run({ ...data }, potId);
}

function updatePlantQR(potId, localUrl, publicUrl) {
  return db.prepare(
    'UPDATE plants SET qr_local_url = ?, qr_public_url = ? WHERE pot_id = ?'
  ).run(localUrl, publicUrl, potId);
}

function deletePlant(potId) {
  return db.prepare(
    'UPDATE plants SET active = 0 WHERE pot_id = ?'
  ).run(potId);
}

// Next available pot ID — auto increments
function getNextPotId() {
  const last = db.prepare(
    'SELECT pot_id FROM plants ORDER BY id DESC LIMIT 1'
  ).get();
  if (!last) return 'POT-001';
  const num = parseInt(last.pot_id.replace('POT-', '')) + 1;
  return `POT-${String(num).padStart(3, '0')}`;
}

// ══════════════════════════════════════════
// PLANT IMAGE OPERATIONS
// ══════════════════════════════════════════

function getPlantImages(potId) {
  return db.prepare(
    'SELECT * FROM plant_images WHERE pot_id = ? ORDER BY is_primary DESC, uploaded_at ASC'
  ).all(potId);
}

function addPlantImage(potId, filename, caption = '', isPrimary = 0) {
  // If setting as primary, unset others first
  if (isPrimary) {
    db.prepare(
      'UPDATE plant_images SET is_primary = 0 WHERE pot_id = ?'
    ).run(potId);
  }
  return db.prepare(
    'INSERT INTO plant_images (pot_id, filename, caption, is_primary) VALUES (?, ?, ?, ?)'
  ).run(potId, filename, caption, isPrimary);
}

function setPrimaryImage(imageId, potId) {
  db.prepare(
    'UPDATE plant_images SET is_primary = 0 WHERE pot_id = ?'
  ).run(potId);
  return db.prepare(
    'UPDATE plant_images SET is_primary = 1 WHERE id = ?'
  ).run(imageId);
}

function deletePlantImage(imageId) {
  return db.prepare(
    'DELETE FROM plant_images WHERE id = ?'
  ).get(imageId);
}

// ══════════════════════════════════════════
// APP CONFIG OPERATIONS
// ══════════════════════════════════════════

function getConfig(key) {
  const row = db.prepare(
    'SELECT value FROM app_config WHERE key = ?'
  ).get(key);
  return row ? row.value : null;
}

function setConfig(key, value) {
  return db.prepare(
    'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)'
  ).run(key, value);
}

function getAllConfig() {
  const rows = db.prepare('SELECT key, value FROM app_config').all();
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

function getImageById(id) {
  return db.prepare('SELECT * FROM plant_images WHERE id = ?').get(id);
}

module.exports = {
  // Users
  isSetupComplete, getUserByUsername, getUserById,
  getAllUsers, createAdmin, createUser,
  verifyPassword, updatePassword, updateLastLogin, deleteUser,
  // Plants
  getAllPlants, getPlantByPotId, createPlant,
  updatePlant, updatePlantQR, deletePlant, getNextPotId,
  // Images
  getPlantImages, addPlantImage, setPrimaryImage, deletePlantImage, getImageById,
  // Config
  getConfig, setConfig, getAllConfig, 
};