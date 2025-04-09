const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

// Regular User Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields" });
    try {
        const result = await pool.query(
            'INSERT INTO Members (Name, Email, Password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, password] // Password stored as plain text
        );
        res.json({ message: 'User registered', user: result.rows[0] });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Regular User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM Members WHERE Email = $1', [email]);
        if (user.rows.length === 0) return res.status(400).json({ message: 'User not found' });
        if (password !== user.rows[0].password) return res.status(400).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user.rows[0].mid, role: 'member' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: user.rows[0] });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await pool.query('SELECT * FROM Admins WHERE Email = $1', [email]);
        if (admin.rows.length === 0) return res.status(400).json({ message: 'Admin not found' });
        if (password !== admin.rows[0].password) return res.status(400).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: admin.rows[0].aid, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, admin: admin.rows[0] });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
