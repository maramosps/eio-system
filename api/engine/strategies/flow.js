/**
 * Engine Strategy: Orquestração de Fluxo de Interação
 * Controla a sequência estrita de ações por perfil alvo.
 *
 * Fluxo Obrigatório:
 * 1. follow
 * 2. like (até 3 posts aleatórios)
 * 3. view_story (se disponível)
 * 4. like_story (opcional)
 * 5. comment (opcional, final)
 * 6. switch_profile (troca para próximo alvo)
 */

const supabase = require('../config/supabase');

const FLOW_STEPS = ['follow', 'like', 'view_story', 'like_story', 'comment', 'switch_profile'];

async function getProfileState(userId, targetUsername) {
    if (!supabase) return null;

    if (!userId || !targetUsername) return null;

    const { data } = await supabase
        .from('profile_states')
        .select('*')
        .eq('user_id', userId)
        .eq('target_username', targetUsername)
        .single();

    return data;
}

async function updateProfileState(userId, targetUsername, updateData) {
    if (!supabase) return;
    if (!userId || !targetUsername) return;

    const { error } = await supabase
        .from('profile_states')
        .upsert({
            user_id: userId,
            target_username: targetUsername,
            ...updateData,
            last_action_at: new Date().toISOString()
        }, { onConflict: 'user_id, target_username' });

    if (error) console.error('[Flow] Error updating state:', error);
}

function determineNextAction(currentStep, actionsCount, actionConfig) {
    // Configurações padrão se não passadas
    const config = actionConfig || { maxLikes: 3, viewStories: true, comment: false };

    // 1. Follow (Inicial)
    if (currentStep === 'follow') return 'like';

    // 2. Likes (Múltiplos)
    if (currentStep === 'like') {
        if (actionsCount < config.maxLikes) return 'like'; // Continua dando like
        return 'view_story';
    }

    // 3. Stories
    if (currentStep === 'view_story') {
        if (config.viewStories) return 'like_story';
        return 'comment'; // Pula like story e vai pro comment
    }

    if (currentStep === 'like_story') return 'comment';

    // 4. Comment (Final)
    if (currentStep === 'comment') return 'switch_profile';

    return 'switch_profile'; // Fallback final
}

module.exports = {
    getProfileState,
    updateProfileState,
    determineNextAction,
    FLOW_STEPS
};
