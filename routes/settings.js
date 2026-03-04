// routes/settings.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const config  = require('../config');
const {requireAuth,requireAdmin, requirePasswordChange}      = require('../middleware/auth');

// All settings routes require auth
router.use(requireAuth);
router.use(requirePasswordChange);

// ── GET /settings ─────────────────────────
router.get('/', (req, res) => {
    const users = config.multiUserEnabled ? db.getAllUsers() : [];
    res.render('settings/index', {
        pageTitle:        'Settings',
        pageCSS:          'settings.css',
        //pageCSS2:         'auth.css',
        isSettings:       true,
        multiUserEnabled: config.multiUserEnabled,
        users,
        success:          req.query.success || null,
        error:            req.query.error   || null
    });
});

// ── GET /settings/change-password ─────────
// Handles forced password change on first login
router.get('/change-password', (req, res) => {
    res.render('settings/change-password', {
        pageTitle:  'Change Password',
        pageCSS:    'settings.css',
        //pageCSS2:   'auth.css',
        isSettings: true,
        forced:     req.user.must_change_password === 1,
        error:      null,
        success:    null
    })
})

// ── POST /settings/change-password ────────
router.post('/change-password', (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];
    // Verify current password
    const valid = db.verifyPassword(req.user.username, currentPassword);
    if (!valid) errors.push('Current password is incorrect');
    if (!newPassword || newPassword.length < 8) errors.push('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) errors.push('New passwords do not match');
    if (currentPassword === newPassword) errors.push('New password must be different from current password');
    if (errors.length > 0) {
        return res.render('settings/change-password', {
            pageTitle:  'Change Password',
            pageCSS:    'settings.css',
            //pageCSS2:   'auth.css',
            isSettings: true,
            forced:     req.user.must_change_password === 1,
            error:      errors[0],
            success:    null
        });
    }
    db.updatePassword(req.user.id, newPassword);
    res.redirect('/settings?success=Password updated successfully');
});

// ── POST /settings/users/add ──────────────
// Only available when multiUserEnabled = true
router.post('/users/add', requireAdmin, (req, res) => {
    if (!config.multiUserEnabled) return res.redirect('/settings');
    const { username, password, role } = req.body;
    const errors = [];
    if (!username || username.length < 3) errors.push('Username must be at least 3 characters');
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters');

    // Check if username already exists
    const existing = db.getUserByUsername(username);
    if (existing) errors.push('Username already exists');
    if (errors.length > 0) return res.redirect(`/settings?error=${encodeURIComponent(errors[0])}`);

    db.createUser(username, password, role || 'staff');
    res.redirect('/settings?success=User created successfully');

})

// ── POST /settings/users/delete ───────────
router.post('/users/delete', requireAdmin, (req, res) => {
    if (!config.multiUserEnabled) return res.redirect('/settings');
    const { userId } = req.body;
    db.deleteUser(userId);
    res.redirect('/settings?success=User deleted');
});

module.exports = router;