/**
 * Engine Tasks Endpoint - Serverless Function
 * Permite que a extensão busque tarefas agendadas (Dispatcher Request).
 * 
 * Rota: GET /api/engine/tasks?userId=...
 */
const { getAndLockPendingActions } = require('./services/scheduler');
// Nota: supabase é usado internamente pelo scheduler, não precisa importar aqui

module.exports = async (req, res) => {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    // 2. Extrair parâmetros
    const userId = req.query.userId || req.body?.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    try {
        // 3. Buscar e Bloquear tarefas (Dispatcher)
        const tasks = await getAndLockPendingActions(userId, 1); // Pegar 1 por vez para não sobrecarregar

        return res.json({
            success: true,
            tasks: tasks.map(t => ({
                taskId: t.id, // ID para usar no ACK depois
                type: t.action_type,
                targetUsername: t.target_username,
                payload: t.payload,
                executeAfter: t.execute_after
            }))
        });

    } catch (err) {
        console.error('[Engine Tasks] Error:', err);
        return res.status(500).json({ success: false, message: 'Internal Error' });
    }
};
