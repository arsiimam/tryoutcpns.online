// =============================================================================
// ecosystem.config.cjs — PM2 Ecosystem Config
// Jalankan: source .env && pm2 start ecosystem.config.cjs
// atau via deploy.sh / install.sh yang sudah otomatis load .env
// =============================================================================

module.exports = {
  apps: [
    {
      name: "cpns-api",
      script: "./artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: process.env.API_PORT || "3001",
        DATABASE_URL: process.env.DATABASE_URL || "",
        SESSION_SECRET: process.env.SESSION_SECRET || "",
        APP_URL: process.env.APP_URL || "",
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
        DUITKU_MERCHANT_CODE: process.env.DUITKU_MERCHANT_CODE || "",
        DUITKU_API_KEY: process.env.DUITKU_API_KEY || "",
        DUITKU_ENVIRONMENT: process.env.DUITKU_ENVIRONMENT || "sandbox",
      },
    },
  ],
};
