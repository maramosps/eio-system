/**
 * Engine Strategy: Orquestração de Agentes IA
 * Verifica se um agente autônomo deve intervir na ação
 */

const AGENT_SKILLS = {
    'comment-writer': 0.85,  // Confidence score
    'smart-dm': 0.90,
    'spam-filter': 0.75
};

async function needsAgentIntervention(actionType, messageContent) {
    if (actionType === 'send_dm' || actionType === 'comment') {
        // Se houver conteúdo de mensagem, ativar verificação de spam ou melhoria
        if (messageContent && messageContent.length < 5) {
            return {
                intervention: true,
                agent: 'smart-dm',
                reason: 'Mensagem muito curta, sugerida expansão via IA.'
            };
        }
    }

    return { intervention: false };
}

module.exports = {
    needsAgentIntervention,
    AGENT_SKILLS
};
