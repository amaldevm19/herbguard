// middleware/auth.js
// Three middleware functions used across routes

const { isSetupComplete, getUserById } = require('../db/database');

// ── requireSetup ──────────────────────────
// Redirects to /setup if no admin exists yet
// Attach to ALL routes including login

function requireSetup(req, res, next) {
    // Skip check for setup route itself
    if (req.path === '/setup') return next();
    if (!isSetupComplete()) {
        return res.redirect('/setup');
    }
    next();
}

// ── requireAuth ───────────────────────────
// Redirects to /login if no session
// Attach to all protected routes

function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        // Save where they were trying to go
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }

    // Attach fresh user object to req
    const user = getUserById(req.session.userId);
    if (!user) {
        req.session.destroy();
        return res.redirect('/login');
    }
    req.user = user;
    res.locals.user = user; // Available in all templates
    next();
}

// ── requirePasswordChange ─────────────────
// Forces password change if must_change_password = 1
// Runs after requireAuth

function requirePasswordChange(req, res, next) {
    // Skip for the change-password route itself
    if (req.path === '/settings/change-password') return next();
    if (req.user && req.user.must_change_password === 1) {
        return res.redirect('/settings/change-password');
    }
    next();
}

// ── requireAdmin ──────────────────────────
// Only admin role can access — for user management
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).render('error', {
            pageTitle: 'Access Denied',
            message:   'You do not have permission to access this page.'
        })
    }
    next();
}

module.exports = {
  requireSetup,
  requireAuth,
  requirePasswordChange,
  requireAdmin
};