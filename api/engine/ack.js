/**
 * Engine ACK Endpoint - Serverless Function
 * Rota para confirmar execução de ações.
 *
 * Rota esperada: POST /api/engine/ack
 * Body: { userId: string, actionType: string, success: boolean, metadata: object, error: string }
 */
const { processAck } = require('./core/ack');
const supabase = require('./config/supabase');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { userId, actionType, success, metadata, error } = req.body || {};

    try {
        const result = await processAck(userId, actionType, success, metadata, error);

        return res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('[Engine ACK] Error:', err);
        return res.status(500).json({ success: false, message: 'Internal Error' });
    }
};
