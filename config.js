// config.js
module.exports = {
  // Flip to true when client wants multiple users
  // Settings page will show User Management section automatically
  multiUserEnabled: false,

  // Session config
  session: {
    name:   'herbguard.sid',
    maxAge: 1000 * 60 * 60 * 8  // 8 hours
  }
};