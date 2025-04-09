const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { name, email, password, address, birthdate, joindate, waiverstatus, beltlevel, referredBy, pid, discount } = req.body;
    if (!name || !email || !password || !pid) return res.status(400).json({ error: "Missing required fields (name, email, password, pid)" });

    try {
        // Start a transaction to ensure all inserts succeed or fail together
        await pool.query('BEGIN');

        // Insert into Members
        const memberResult = await pool.query(
            `INSERT INTO Members (Name, Email, Password, Address, Birthdate, JoinDate, WaiverStatus, BeltLevel)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING MID`,
            [name, email, password, address, birthdate, joindate || null, waiverstatus, beltlevel]
        );
        const mid = memberResult.rows[0].mid;

        // Insert into Referred_By (if provided)
        if (referredBy) {
            await pool.query(
                'INSERT INTO Referred_By (MID, Referred) VALUES ($1, $2)',
                [referredBy, mid] // MID is the referrer, Referred is the new member
            );
        }

        // Insert into Subscribed_To
        await pool.query(
            'INSERT INTO Subscribed_To (MID, PID, Discount, SubscriptionFee) VALUES ($1, $2, $3, $4)',
            [mid, pid, discount || 0, 0] // SubscriptionFee set to 0 for now; adjust if you have cost logic
        );

        await pool.query('COMMIT');
        res.json({ message: 'User registered', mid });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    }
});

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
