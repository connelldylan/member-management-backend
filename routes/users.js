const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

// Register User
router.post('/register', async (req, res) => {
    console.log("🔥 Incoming signup request:", req.body); // Debugging log

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        console.error("⚠️ Missing fields:", req.body);
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, hashedPassword]
        );

        console.log("✅ User inserted:", result.rows[0]); // Debugging log
        res.json({ message: 'User registered', user: result.rows[0] });
    } catch (err) {
        console.error("❌ Database Error:", err); // Log the full error object
        res.status(400).json({ error: err.message }); // Send full error message to frontend
    }
});


// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: user.rows[0] });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
