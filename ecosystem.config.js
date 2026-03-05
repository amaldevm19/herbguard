module.exports = {
  apps: [
    {
      name:   'herbguard',
      script: 'server.js',
      watch:  ['server.js', 'routes', 'views', 'data', 'db', 'middleware', 'public'],
      ignore_watch: ['node_modules', 'public/uploads', 'herbguard.db'],
      env: {
        NODE_ENV: 'development',
        PORT:     3001
      }
    },
    {
      name:    'ngrok',
      script:  'ngrok',
      args:    'http 3001',
      interpreter: 'none'   // not a node script
    },
    {
      name:        'simulator',
      script:      'scripts/simulate-sensors.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};