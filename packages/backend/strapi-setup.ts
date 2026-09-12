/**
 * Strapi CMS Setup for mutabe3
 *
 * Strapi provides:
 * - Article management UI
 * - Media library
 * - User permissions
 * - Content scheduling
 * - REST API for frontend
 */

// Strapi will run on port 1337
// Admin: http://localhost:1337/admin
// API: http://localhost:1337/api

const STRAPI_CONFIG = {
  database: {
    client: 'postgres',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'mutabe3_strapi',
      user: 'mutabe3_user',
      password: process.env.DATABASE_PASSWORD || 'mutabe3_secure_pass',
    },
  },
  admin: {
    auth: {
      secret: process.env.ADMIN_JWT_SECRET || 'strapi_admin_secret_key',
    },
  },
  api: {
    rest: {
      prefix: '/api',
      defaultLimit: 25,
      maxLimit: 100,
    },
  },
};

export default STRAPI_CONFIG;
