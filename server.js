require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const pool = require('./db'); // Import pool from db.js

const app = express();

// CORS Configuration
const corsOptions = {
    origin: "https://connelldylan.github.io",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
};
app.use(cors(corsOptions));

// Middleware to parse JSON requests
app.use(express.json()); 
app.use(bodyParser.json()); 

// Function to log incoming requests
const logRequest = (req, body) => {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} - Body: ${JSON.stringify(body)}\n`;
    fs.appendFileSync('request_logs.txt', logMessage);
};

// Log every request before processing
app.use((req, res, next) => {
    logRequest(req, req.body);
    next();
});

// Import routes AFTER initializing app
const userRoutes = require('./routes/users');
app.use('/users', userRoutes);

// Default route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// Test database connection route
app.get('/test-db', async (req, res) => {
    try {
        console.log('Attempting to connect to database...');
        const result = await pool.query('SELECT NOW()');
        console.log('Query successful:', result.rows[0]);
        res.json({ message: 'Database connected', time: result.rows[0].now });
    } catch (err) {
        console.error('Test DB Error:', err.stack);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));