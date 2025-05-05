const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const router = express.Router();

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

router.post('/update-belt', verifyAdmin, async (req, res) => {
    const { mid, beltLevel } = req.body;
    try {
        const result = await pool.query('UPDATE members SET BeltLevel = $1 WHERE MID = $2 RETURNING *', [beltLevel, mid]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Belt level updated', member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/update-address', verifyAdmin, async (req, res) => {
    const { mid, address } = req.body;
    try {
        const result = await pool.query('UPDATE members SET Address = $1 WHERE MID = $2 RETURNING *', [address, mid]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Address updated', member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/add-child', verifyAdmin, async (req, res) => {
    const { parentMid, childMid } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO parent_of (MID, ChildID) VALUES ($1, $2) RETURNING *',
            [parentMid, childMid]
        );
        res.json({ message: 'Child added to member', record: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/increment-classes', verifyAdmin, async (req, res) => {
    const { mid } = req.body;
    try {
        const result = await pool.query(
            'UPDATE members SET ClassesAttended = ClassesAttended + 1 WHERE MID = $1 RETURNING *',
            [mid]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Classes attended incremented', member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/no-waiver', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT MID, Name FROM members WHERE WaiverStatus = FALSE'
        );
        res.json({ members: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 1 advanced
router.get('/avg-classes-by-belt', verifyAdmin, async (req, res) => {
    const { beltLevel } = req.query;
    try {
        const result = await pool.query(
            'SELECT AVG(ClassesAttended) as avgClasses FROM members WHERE BeltLevel = $1',
            [beltLevel]
        );
        res.json({ avgClasses: result.rows[0].avgclasses || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 1 advanced
router.get('/top-classes', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT Name, ClassesAttended FROM members ORDER BY ClassesAttended DESC LIMIT 5'
        );
        res.json({ topMembers: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/children', verifyAdmin, async (req, res) => {
    const { mid } = req.query;
    try {
        const result = await pool.query(
            'SELECT m.Name FROM members m JOIN parent_of p ON m.MID = p.ChildID WHERE p.MID = $1',
            [mid]
        );
        res.json({ children: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 3 advanced
router.get('/package-revenue', verifyAdmin, async (req, res) => {
    const { month, year } = req.query;
    try {
        const result = await pool.query(
            `SELECT p.Description, SUM(st.SubscriptionFee) as totalRevenue
             FROM packages p
             JOIN subscribed_to st ON p.PID = st.PID
             JOIN members m ON st.MID = m.MID
             WHERE EXTRACT(MONTH FROM m.JoinDate) = $1
             AND EXTRACT(YEAR FROM m.JoinDate) = $2
             GROUP BY p.Description`,
            [month, year]
        );
        res.json({ revenue: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 1 advanced
router.get('/search-name', verifyAdmin, async (req, res) => {
    const { substring } = req.query;
    try {
        const result = await pool.query(
            'SELECT Name, JoinDate FROM members WHERE Name ILIKE $1',
            [`%${substring}%`]
        );
        res.json({ members: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 2 advanced
router.get('/discounted-subscriptions', verifyAdmin, async (req, res) => {
    const { skip } = req.query;
    try {
        const result = await pool.query(
            `SELECT m.Name, st.SubscriptionFee
             FROM members m
             JOIN subscribed_to st ON m.MID = st.MID
             WHERE st.Discount > 0
             ORDER BY st.SubscriptionFee
             OFFSET $1 LIMIT 10`,
            [skip]
        );
        res.json({ subscriptions: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 1 advanced
router.get('/count-referrals', verifyAdmin, async (req, res) => {
    const { mid } = req.query;
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as referralCount FROM referred_by WHERE MID = $1',
            [mid]
        );
        res.json({ referralCount: parseInt(result.rows[0].referralcount) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 2 advanced
router.get('/members-with-referrals', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.MID, m.Name, r.MID as ReferrerID
             FROM members m
             LEFT OUTER JOIN referred_by r ON m.MID = r.Referred`
        );
        res.json({ members: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//group 3 advanced
router.get('/high-attendance-members', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT MID, Name, ClassesAttended
             FROM members
             WHERE ClassesAttended > (SELECT AVG(ClassesAttended) FROM members)`
        );
        res.json({ highAttendanceMembers: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;