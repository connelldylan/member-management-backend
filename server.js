const fs = require('fs');

const logRequest = (req, body) => {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} - Body: ${JSON.stringify(body)}\n`;
    fs.appendFileSync('request_logs.txt', logMessage);
};

app.use((req, res, next) => {
    logRequest(req, req.body);
    next();
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

app.use('/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

