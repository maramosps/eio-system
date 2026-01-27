/**
 * Engine Endpoint: Schedule Action
 * Permite agendar uma ação explicitamente.
 * POST /api/engine/schedule
 */
const { scheduleAction } = require('./services/scheduler');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { userId, actionType, targetUsername, delayMs, payload } = req.body || {};

    if (!userId || !actionType || !delayMs) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const executeAfter = new Date(Date.now() + delayMs).toISOString();

    const result = await scheduleAction(userId, actionType, targetUsername, executeAfter, payload);

    return res.json(result);
};
