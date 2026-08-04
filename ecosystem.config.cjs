// =============================================================================
// ecosystem.config.cjs — PM2 Ecosystem Config
// Menggunakan Node.js --env-file flag (Node 20+) untuk load .env secara langsung
// Jalankan: pm2 start ecosystem.config.cjs
// =============================================================================

module.exports = {
  apps: [
    {
      name: "cpns-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/var/www/tryoutcpns",
      interpreter: "node",
      interpreter_args: "--env-file=/var/www/tryoutcpns/.env",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
};
