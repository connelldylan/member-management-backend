const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Supabase pooler accepts this for simplicity
    connectionTimeoutMillis: 20000, // 20 seconds timeout
    idleTimeoutMillis: 30000, // 30 seconds idle timeout
    max: 10, // Max 10 clients in the pool
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;
