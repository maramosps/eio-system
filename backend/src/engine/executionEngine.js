/*
═══════════════════════════════════════════════════════════
  E.I.O – EXECUTION ENGINE (FINAL)
  Motor de execução consciente e humanizado
  Com integração à IA Adaptativa
═══════════════════════════════════════════════════════════
*/

const { Flow, Execution, Account, Log } = require('../models');
const { adaptLimits } = require('./adaptiveAiEngine');
const dayjs = require('dayjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function canRun(account) {
    return account.is_active && account.health_score >= 40;
}

async function runExecution(executionId) {
    const execution = await Execution.findByPk(executionId, {
        include: ['flow', 'account']
    });
    if (!execution) return;

    const { flow, account } = execution;

    if (!canRun(account)) {
        execution.status = 'paused';
        return execution.save();
    }

    execution.status = 'running';
    await execution.save();

    const { actions, delays, humanization } = flow.config;

    for (const action of actions) {
        if (Math.random() < (humanization?.random_skip || 0.15)) continue;

        const delay = rand(delays.min, delays.max);
        await sleep(delay * 1000);

        execution.stats[action].attempted++;

        // 🔌 plugar integração real com Instagram aqui
        const roll = Math.random();

        if (roll < 0.06) {
            execution.stats[action].blocked++;
            execution.status = 'blocked';
            account.health_score -= 10;
            flow.cooldown_until = dayjs().add(account.ai_limits.pause_after_block, 'second');
            await adaptLimits(account, execution);
            await Promise.all([execution.save(), account.save(), flow.save()]);
            return;
        }

        execution.stats[action].success++;
        account.health_score = Math.min(account.health_score + 1, 100);

        account.last_activity_at = new Date();
        await Promise.all([execution.save(), account.save()]);
    }

    execution.status = 'completed';
    execution.completed_at = new Date();

    await adaptLimits(account, execution);
    await Promise.all([execution.save(), flow.save()]);
}

module.exports = { runExecution };
