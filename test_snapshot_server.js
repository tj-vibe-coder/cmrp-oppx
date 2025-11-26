const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3001; // Using different port since 3000 is taken

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
    connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ status: 'Snapshot API server running', timestamp: new Date().toISOString() });
});

// Snapshot routes (our custom endpoints)
app.get('/api/snapshots/:type', async (req, res) => {
    try {
        const { type } = req.params;
        
        if (type !== 'weekly' && type !== 'monthly') {
            return res.status(400).json({ error: 'Invalid snapshot type' });
        }

        const result = await pool.query(
            'SELECT * FROM dashboard_snapshots WHERE snapshot_type = $1 ORDER BY created_at DESC LIMIT 1',
            [type]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching snapshot:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/snapshots', async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(`
            INSERT INTO dashboard_snapshots (
                snapshot_type, total_opportunities, submitted_count, submitted_amount,
                op100_count, op100_amount, op90_count, op90_amount, op60_count, op60_amount,
                op30_count, op30_amount, lost_count, lost_amount, inactive_count,
                ongoing_count, pending_count, declined_count, revised_count
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
            ) ON CONFLICT (snapshot_type) DO UPDATE SET
                total_opportunities = EXCLUDED.total_opportunities,
                submitted_count = EXCLUDED.submitted_count,
                submitted_amount = EXCLUDED.submitted_amount,
                saved_date = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            data.snapshot_type, data.total_opportunities, data.submitted_count, data.submitted_amount,
            data.op100_count, data.op100_amount, data.op90_count, data.op90_amount,
            data.op60_count, data.op60_amount, data.op30_count, data.op30_amount,
            data.lost_count, data.lost_amount, data.inactive_count, data.ongoing_count,
            data.pending_count, data.declined_count, data.revised_count
        ]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error saving snapshot:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy all other API calls to the main server on port 3000
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    logLevel: 'debug'
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Testing server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔗 Snapshots: http://localhost:${PORT}/api/snapshots/weekly`);
    console.log(`🔄 Proxying other API calls to http://localhost:3000`);
});

module.exports = app;
