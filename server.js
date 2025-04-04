require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const pool = require('./db');

const app = express();

const corsOptions = {
    origin: "https://connelldylan.github.io",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.json());

const logRequest = (req, body) => {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} - Body: ${JSON.stringify(body)}\n`;
    fs.appendFileSync('request_logs.txt', logMessage);
};

app.use((req, res, next) => {
    logRequest(req, req.body);
    next();
});

const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ message: 'Database connected', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));