module.exports = {
  apps: [
  // Real server
  {
    name: 'rossi-portal-api',
    script: 'dist-server/server/index.js',
    interpreter: 'node',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'C:\\logs\\rossi-portal\\err.log',
    out_file: 'C:\\logs\\rossi-portal\\out.log',
    log_file: 'C:\\logs\\rossi-portal\\combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  },
  // Dummy server
  {
    name: 'rossi-portal-dummy',
    script: 'dist-server/server/dummy-server.js',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      DUMMY_PORT: 3002
    },
    error_file: 'C:\\logs\\rossi-portal\\dummy-err.log',
    out_file: 'C:\\logs\\rossi-portal\\dummy-out.log',
    log_file: 'C:\\logs\\rossi-portal\\dummy-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist']
  }]
};