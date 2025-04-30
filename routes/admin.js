const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
        req.adminId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Delete Member
router.post('/delete-member', verifyAdmin, async (req, res) => {
    const { mid } = req.body;
    try {
        const result = await pool.query('DELETE FROM members WHERE MID = $1 RETURNING *', [mid]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Member deleted', member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Belt Level
router.post('/update-belt', verifyAdmin, async (req, res) => {
    const { mid, beltLevel } = req.body;
    try {
        const result = await pool.query('UPDATE Members SET BeltLevel = $1 WHERE MID = $2 RETURNING *', [beltLevel, mid]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Belt level updated', member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Address
router.post('/update-address', verifyAdmin, async (req, res) => {
    const { mid, address } = req.body;
    try {
        const result = await pool.query('UPDATE Members SET Address = $1 WHERE MID = $2 RETURNING *', [address, mid]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Address updated', member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Average Classes Attended by Belt Level
router.get('/avg-classes-by-belt', verifyAdmin, async (req, res) => {
    const { beltLevel } = req.query;
    try {
        const result = await pool.query(
            'SELECT AVG(ClassesAttended) as avgClasses FROM Members WHERE BeltLevel = $1',
            [beltLevel]
        );
        res.json({ avgClasses: result.rows[0].avgclasses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Members with No Referrals and High Subscription Fee
router.get('/no-referrals-high-fee', verifyAdmin, async (req, res) => {
    const { minFee } = req.query;
    try {
        const result = await pool.query(
            `SELECT m.*
             FROM Members m
             LEFT JOIN Referred_By r ON m.MID = r.MID
             JOIN Subscribed_To s ON m.MID = s.MID
             WHERE r.MID IS NULL AND s.SubscriptionFee > $1`,
            [minFee]
        );
        res.json({ members: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Top 5 Members by Classes Attended
router.get('/top-classes', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM Members ORDER BY ClassesAttended DESC LIMIT 5'
        );
        res.json({ topMembers: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Children of a Member
router.get('/children', verifyAdmin, async (req, res) => {
    const { mid } = req.query;
    try {
        const result = await pool.query(
            'SELECT m.* FROM Members m JOIN Parent_Of p ON m.MID = p.ChildID WHERE p.MID = $1',
            [mid]
        );
        res.json({ children: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Total Revenue by Package for a Month
router.get('/package-revenue', verifyAdmin, async (req, res) => {
    const { month, year } = req.query; // e.g., month=04, year=2025
    try {
        const result = await pool.query(
            `SELECT p.PID, p.Description, SUM(s.SubscriptionFee - s.Discount) as TotalRevenue
             FROM Packages p
             JOIN Subscribed_To s ON p.PID = s.PID
             JOIN Members m ON s.MID = m.MID
             WHERE EXTRACT(MONTH FROM m.JoinDate) = $1 AND EXTRACT(YEAR FROM m.JoinDate) = $2
             GROUP BY p.PID, p.Description`,
            [month, year]
        );
        res.json({ revenue: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Members by Name Substring
router.get('/search-name', verifyAdmin, async (req, res) => {
    const { substring } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM Members WHERE Name ILIKE $1 ORDER BY JoinDate',
            [`%${substring}%`]
        );
        res.json({ members: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Discounted Subscriptions with Pagination
router.get('/discounted-subscriptions', verifyAdmin, async (req, res) => {
    const { skip } = req.query; // Number of results to skip
    try {
        const result = await pool.query(
            'SELECT m.*, s.SubscriptionFee FROM Members m JOIN Subscribed_To s ON m.MID = s.MID WHERE s.Discount > 0 ORDER BY s.SubscriptionFee OFFSET $1',
            [skip]
        );
        res.json({ subscriptions: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;