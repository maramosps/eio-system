/*
═══════════════════════════════════════════════════════════
  E.I.O - EXECUTION ENGINE SERVICE
  Motor de execução humano e consciente
  
  🧠 LÓGICA DE EXECUÇÃO:
  
  1. Verificar saúde da Account (health_score >= 40)
  2. Verificar cooldown do Flow
  3. Aplicar delay humanizado
  4. Decidir se pula ação (random skip)
  5. Executar ação
  6. Atualizar stats
  7. Se bloqueado → reduzir health + cooldown
  
  ✅ Consciente do estado da conta
  ✅ Delays humanizados
  ✅ Recuperação automática
  ✅ Prevenção de bloqueios
═══════════════════════════════════════════════════════════
*/

const { Account, Flow, Execution, Lead, Log } = require('../models');
const { Op } = require('sequelize');

class ExecutionEngine {

    // ═══════════════════════════════════════════════════════════
    // 🚀 INICIAR EXECUÇÃO
    // ═══════════════════════════════════════════════════════════
    static async startExecution(flowId, userId) {
        const flow = await Flow.findByPk(flowId, {
            include: [{ model: Account, as: 'account' }]
        });

        if (!flow) {
            throw new Error('Flow not found');
        }

        const account = flow.account;

        // ═══════════════════════════════════════════════════════════
        // 🏥 VERIFICAR SAÚDE DA CONTA
        // ═══════════════════════════════════════════════════════════
        if (!account.isHealthy()) {
            return {
                success: false,
                reason: 'Account not healthy',
                health_score: account.health_score,
                suggestion: 'Wait for health recovery or reduce activity'
            };
        }

        // ═══════════════════════════════════════════════════════════
        // ⏰ VERIFICAR COOLDOWN DO FLOW
        // ═══════════════════════════════════════════════════════════
        const canRun = flow.canRunNow();
        if (!canRun.can) {
            return {
                success: false,
                reason: canRun.reason
            };
        }

        // ═══════════════════════════════════════════════════════════
        // 📝 CRIAR EXECUÇÃO
        // ═══════════════════════════════════════════════════════════
        const execution = await Execution.create({
            flow_id: flowId,
            account_id: account.id,
            user_id: userId,
            status: 'running',
            started_at: new Date()
        });

        // Atualizar flow
        flow.status = 'active';
        flow.last_run_at = new Date();
        await flow.save();

        return {
            success: true,
            execution_id: execution.id,
            message: 'Execution started'
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ⚡ EXECUTAR PRÓXIMA AÇÃO
    // ═══════════════════════════════════════════════════════════
    static async executeNextAction(executionId) {
        const execution = await Execution.findByPk(executionId, {
            include: [
                { model: Account, as: 'account' },
                { model: Flow, as: 'flow' }
            ]
        });

        if (!execution) {
            throw new Error('Execution not found');
        }

        const account = execution.account;
        const flow = execution.flow;

        // ═══════════════════════════════════════════════════════════
        // 🚦 VERIFICAÇÕES PRÉ-AÇÃO
        // ═══════════════════════════════════════════════════════════

        // 1. Verificar saúde
        if (!account.isHealthy()) {
            await execution.enterCooldown(1800, 'Account health too low');
            return { action: 'paused', reason: 'Account unhealthy' };
        }

        // 2. Verificar cooldown da conta
        if (account.isInCooldown()) {
            return { action: 'waiting', reason: 'Account in cooldown' };
        }

        // 3. Verificar se pode executar
        const canExecute = execution.canExecuteNext();
        if (!canExecute.can) {
            return { action: 'waiting', reason: canExecute.reason, waitMs: canExecute.waitMs };
        }

        // 4. Verificar fila
        const queue = execution.queue || [];
        if (queue.length === 0) {
            await execution.complete(true);
            await flow.updateStats({
                actions: execution.stats.total_success,
                follows: execution.stats.follow?.success || 0,
                likes: execution.stats.like?.success || 0,
                comments: execution.stats.comment?.success || 0,
                errors: execution.stats.total_failed
            });
            return { action: 'completed', stats: execution.stats };
        }

        // ═══════════════════════════════════════════════════════════
        // 🎲 HUMANIZAÇÃO - DECIDIR SE PULA
        // ═══════════════════════════════════════════════════════════
        if (flow.shouldSkipAction()) {
            // Pular esta ação (humanização)
            queue.shift();
            execution.queue = queue;
            execution.stats.profiles_skipped++;
            await execution.save();

            return { action: 'skipped', reason: 'Random skip for humanization' };
        }

        // ═══════════════════════════════════════════════════════════
        // ⚡ EXECUTAR AÇÃO
        // ═══════════════════════════════════════════════════════════
        const currentAction = queue.shift();
        execution.current_action = currentAction;
        execution.queue = queue;

        try {
            // Simular execução (aqui seria a integração real com Instagram)
            const result = await this.performAction(currentAction, account);

            // ═══════════════════════════════════════════════════════════
            // ✅ AÇÃO BEM-SUCEDIDA
            // ═══════════════════════════════════════════════════════════
            if (result.success) {
                await execution.recordAction(currentAction.type, true, false);
                await account.incrementTodayStat(currentAction.type + 's');

                // Delay humanizado para próxima ação
                const delay = flow.getHumanDelay();
                await execution.setNextAction(delay);

                return {
                    action: 'executed',
                    type: currentAction.type,
                    target: currentAction.target,
                    nextIn: delay
                };
            }

            // ═══════════════════════════════════════════════════════════
            // 🚫 BLOQUEIO DETECTADO
            // ═══════════════════════════════════════════════════════════
            if (result.blocked) {
                await execution.recordAction(currentAction.type, false, true);

                // Reduzir saúde da conta
                const newHealth = await account.reduceHealth(15, `Blocked on ${currentAction.type}`);

                // Atualizar stats da conta
                const accountStats = account.stats;
                accountStats.total_blocks++;
                accountStats.last_block_at = new Date().toISOString();
                account.stats = accountStats;
                account.changed('stats', true);

                // Ativar cooldown baseado no ai_limits
                const cooldownTime = account.ai_limits.pause_after_block || 1800;
                account.cooldown_until = new Date(Date.now() + cooldownTime * 1000);
                account.cooldown_reason = `Action blocked: ${currentAction.type}`;
                await account.save();

                // Marcar execução como bloqueada
                await execution.markBlocked(result.blockType, result.message);

                return {
                    action: 'blocked',
                    type: currentAction.type,
                    newHealth: newHealth,
                    cooldownMinutes: Math.round(cooldownTime / 60)
                };
            }

            // ═══════════════════════════════════════════════════════════
            // ❌ FALHA (não bloqueio)
            // ═══════════════════════════════════════════════════════════
            await execution.recordAction(currentAction.type, false, false);

            // Verificar se deve retry
            const config = flow.config?.limits || {};
            if (execution.stats.total_failed < (config.retry_on_error || 3)) {
                // Retry com delay maior
                const delay = flow.getHumanDelay() * 2;
                await execution.setNextAction(delay);
                return { action: 'failed', retry: true, nextIn: delay };
            } else {
                // Muitas falhas, parar
                await execution.complete(false);
                return { action: 'failed', reason: 'Too many errors' };
            }

        } catch (error) {
            console.error('Execution error:', error);
            execution.error = error.message;
            execution.status = 'failed';
            await execution.save();

            return { action: 'error', message: error.message };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 EXECUTAR AÇÃO ESPECÍFICA
    // ═══════════════════════════════════════════════════════════
    static async performAction(action, account) {
        // TODO: Integração real com Instagram via extensão/puppeteer
        // Por ora, simulação para dev/teste

        console.log(`[EXEC] ${action.type} → ${action.target} (Account: @${account.instagram_username})`);

        // Simular tempo de execução
        await this.sleep(500 + Math.random() * 1000);

        // Simular taxa de sucesso baseada na saúde
        const successRate = account.health_score / 100;
        const success = Math.random() < successRate;

        // Simular bloqueio (raro)
        const blockChance = account.health_score < 40 ? 0.1 : 0.02;
        const blocked = !success && Math.random() < blockChance;

        return {
            success: success && !blocked,
            blocked: blocked,
            blockType: blocked ? 'action_block' : null,
            message: blocked ? 'Action temporarily blocked' : (success ? 'OK' : 'Failed')
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 🔄 RECUPERAR SAÚDE (job diário)
    // ═══════════════════════════════════════════════════════════
    static async recoverHealthJob() {
        const accounts = await Account.findAll({
            where: {
                health_score: { [Op.lt]: 100 },
                is_active: true
            }
        });

        for (const account of accounts) {
            // Recuperar 5 pontos por hora sem atividade
            const lastActivity = new Date(account.last_activity_at || 0);
            const hoursSinceActivity = (Date.now() - lastActivity) / 3600000;

            if (hoursSinceActivity >= 1) {
                const recovery = Math.min(5 * Math.floor(hoursSinceActivity), 20);
                await account.recoverHealth(recovery);
                console.log(`[HEALTH] @${account.instagram_username}: +${recovery} (now ${account.health_score})`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 🛠️ UTILITÁRIOS
    // ═══════════════════════════════════════════════════════════
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async getExecutionStatus(executionId) {
        const execution = await Execution.findByPk(executionId, {
            include: [
                { model: Account, as: 'account', attributes: ['instagram_username', 'health_score'] },
                { model: Flow, as: 'flow', attributes: ['name', 'status'] }
            ]
        });

        if (!execution) return null;

        return {
            id: execution.id,
            status: execution.status,
            progress: execution.progress,
            stats: execution.stats,
            account: execution.account,
            flow: execution.flow,
            started_at: execution.started_at,
            duration: execution.duration_seconds,
            queue_size: (execution.queue || []).length
        };
    }
}

module.exports = ExecutionEngine;
