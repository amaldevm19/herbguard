// routes/auth.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// ── GET /setup ────────────────────────────
router.get('/setup', (req, res) => {
    // If already setup, redirect to login
    if (db.isSetupComplete()) return res.redirect('/login');
    res.render('auth/setup', {
        pageTitle:  'Setup HerbGuard',
        layout:     'auth',      // Uses auth layout — no header/footer
        error:      null
    })
})

// ── POST /setup ───────────────────────────
router.post('/setup', (req, res) => {
    if (db.isSetupComplete()) return res.redirect('/login');
    const { password, confirmPassword } = req.body;
    const errors = [];
    if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
    if (password !== confirmPassword) errors.push('Passwords do not match');
    if (errors.length > 0) {
        return res.render('auth/setup', {
            pageTitle: 'Setup HerbGuard',
            layout:    'auth',
            error:     errors[0]
        })
    }
    db.createAdmin(password);
    res.redirect('/login?setup=done');
})

// ── GET /login ────────────────────────────
router.get('/login', (req, res) => {
    if (req.session && req.session.userId) return res.redirect('/');
    res.render('auth/login', {
        pageTitle: 'Login',
        layout:    'auth',
        error:     null,
        success:   req.query.setup === 'done' ? 'Admin account created. Please log in.' : null
    })
})

// ── POST /login ───────────────────────────
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.render('auth/login', {
            pageTitle: 'Login',
            layout:    'auth',
            error:     'Please enter username and password',
            success: null
        })
    }
    const user = db.verifyPassword(username, password);

    if (!user) {
        return res.render('auth/login', {
            pageTitle: 'Login',
            layout: 'auth',
            error: 'Invalid username or password',
            success: null
        })
    }

    // Save user to session
    req.session.userId = user.id;
    db.updateLastLogin(user.id);

    // Redirect to original destination or dashboard
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
})

// ── GET /logout ───────────────────────────
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;