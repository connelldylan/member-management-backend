const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Ensure SSL is enabled
    connectionTimeoutMillis: 10000, // Increase timeout to 10s
    idleTimeoutMillis: 30000 // Keep connection open longer
});

module.exports = pool;

