/*
═══════════════════════════════════════════════════════════
  E.I.O - FLOW CONTROLLER
  Controlador completo de fluxos de automação
═══════════════════════════════════════════════════════════
*/

const { Flow, Execution, User } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { sendExecutionStatus } = require('../services/socket.service');

/**
 * Listar todos os fluxos do usuário
 */
exports.getFlows = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const where = { user_id: req.user.id };
        if (status) where.status = status;

        const offset = (page - 1) * limit;

        const { rows: flows, count } = await Flow.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['updated_at', 'DESC']],
            include: [
                {
                    model: Execution,
                    as: 'executions',
                    limit: 1,
                    order: [['created_at', 'DESC']]
                }
            ]
        });

        res.json({
            success: true,
            data: {
                flows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Criar novo fluxo
 */
exports.createFlow = async (req, res, next) => {
    try {
        const { name, description, config, schedule } = req.body;

        const flow = await Flow.create({
            user_id: req.user.id,
            name,
            description,
            config,
            schedule,
            status: 'draft'
        });

        res.status(201).json({
            success: true,
            message: 'Fluxo criado com sucesso',
            data: { flow }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Obter fluxo específico
 */
exports.getFlow = async (req, res, next) => {
    try {
        const { id } = req.params;

        const flow = await Flow.findOne({
            where: { id, user_id: req.user.id },
            include: [
                {
                    model: Execution,
                    as: 'executions',
                    order: [['created_at', 'DESC']],
                    limit: 10
                }
            ]
        });

        if (!flow) {
            throw new AppError('Fluxo não encontrado', 404);
        }

        res.json({
            success: true,
            data: { flow }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Atualizar fluxo
 */
exports.updateFlow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, config, schedule, status } = req.body;

        const flow = await Flow.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!flow) {
            throw new AppError('Fluxo não encontrado', 404);
        }

        await flow.update({
            ...(name && { name }),
            ...(description && { description }),
            ...(config && { config }),
            ...(schedule && { schedule }),
            ...(status && { status })
        });

        res.json({
            success: true,
            message: 'Fluxo atualizado com sucesso',
            data: { flow }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deletar fluxo
 */
exports.deleteFlow = async (req, res, next) => {
    try {
        const { id } = req.params;

        const flow = await Flow.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!flow) {
            throw new AppError('Fluxo não encontrado', 404);
        }

        await flow.destroy();

        res.json({
            success: true,
            message: 'Fluxo deletado com sucesso'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Iniciar execução de fluxo
 */
exports.startFlow = async (req, res, next) => {
    try {
        const { id } = req.params;

        const flow = await Flow.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!flow) {
            throw new AppError('Fluxo não encontrado', 404);
        }

        // Verificar se já existe execução rodando
        const runningExecution = await Execution.findOne({
            where: {
                flow_id: id,
                status: 'running'
            }
        });

        if (runningExecution) {
            throw new AppError('Já existe uma execução em andamento para este fluxo', 400);
        }

        // Criar nova execução
        const execution = await Execution.create({
            flow_id: id,
            user_id: req.user.id,
            status: 'running',
            stats: {
                follows: 0,
                likes: 0,
                comments: 0,
                stories_liked: 0,
                unfollows: 0,
                errors: 0
            },
            progress: 0
        });

        // Atualizar status do fluxo
        await flow.update({ status: 'active' });

        // Notificar via WebSocket
        sendExecutionStatus(execution.id, {
            status: 'running',
            progress: 0
        });

        res.json({
            success: true,
            message: 'Fluxo iniciado com sucesso',
            data: { execution }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Pausar execução de fluxo
 */
exports.pauseFlow = async (req, res, next) => {
    try {
        const { id } = req.params;

        const execution = await Execution.findOne({
            where: {
                flow_id: id,
                user_id: req.user.id,
                status: 'running'
            }
        });

        if (!execution) {
            throw new AppError('Nenhuma execução em andamento encontrada', 404);
        }

        await execution.update({ status: 'paused' });

        const flow = await Flow.findByPk(id);
        await flow.update({ status: 'paused' });

        sendExecutionStatus(execution.id, { status: 'paused' });

        res.json({
            success: true,
            message: 'Fluxo pausado com sucesso'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Parar execução de fluxo
 */
exports.stopFlow = async (req, res, next) => {
    try {
        const { id } = req.params;

        const execution = await Execution.findOne({
            where: {
                flow_id: id,
                user_id: req.user.id,
                status: ['running', 'paused']
            }
        });

        if (!execution) {
            throw new AppError('Nenhuma execução encontrada', 404);
        }

        await execution.update({
            status: 'canceled',
            completed_at: new Date()
        });

        const flow = await Flow.findByPk(id);
        await flow.update({ status: 'draft' });

        sendExecutionStatus(execution.id, { status: 'canceled' });

        res.json({
            success: true,
            message: 'Fluxo cancelado com sucesso'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Duplicar fluxo
 */
exports.duplicateFlow = async (req, res, next) => {
    try {
        const { id } = req.params;

        const flow = await Flow.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!flow) {
            throw new AppError('Fluxo não encontrado', 404);
        }

        const newFlow = await Flow.create({
            user_id: req.user.id,
            name: `${flow.name} (Cópia)`,
            description: flow.description,
            config: flow.config,
            schedule: flow.schedule,
            status: 'draft'
        });

        res.status(201).json({
            success: true,
            message: 'Fluxo duplicado com sucesso',
            data: { flow: newFlow }
        });
    } catch (error) {
        next(error);
    }
};
