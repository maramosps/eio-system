/*
═══════════════════════════════════════════════════════════
  E.I.O - FLOW MANAGEMENT SYSTEM
  Sistema completo de gerenciamento de fluxos
═══════════════════════════════════════════════════════════
*/

// Armazenamento de fluxos (simulado localmente)
let savedFlows = [];
let activeFlows = [
    { id: 1, name: 'Engajamento Orgânico #1', status: 'active', steps: [] },
    { id: 2, name: 'Boas-vindas para Seguidores', status: 'paused', steps: [] }
];

// Carregar fluxos ativos e exibir
async function loadActiveFlows() {
    const list = document.getElementById('activeFlowsList');
    const noFlows = document.getElementById('noFlowsMessage');

    if (!list) {
        console.warn('activeFlowsList não encontrado');
        return;
    }

    let flows = activeFlows;

    // Tentar buscar do Chrome Storage se disponível
    if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
            const result = await chrome.storage.local.get(['activeFlows']);
            if (result.activeFlows && result.activeFlows.length > 0) {
                flows = result.activeFlows;
                activeFlows = flows;
            }
        } catch (e) {
            console.log('Usando fluxos mock');
        }
    }

    if (flows.length === 0) {
        list.style.display = 'none';
        if (noFlows) noFlows.style.display = 'flex';
    } else {
        list.style.display = 'block';
        if (noFlows) noFlows.style.display = 'none';

        list.innerHTML = flows.map(flow => `
            <div class="eio-flow-card" data-flow-id="${flow.id}">
                <div class="eio-flow-info">
                    <span class="eio-flow-name">${flow.name}</span>
                    <span class="eio-flow-status" style="color: ${flow.status === 'active' ? '#4CAF50' : '#FF9800'}">
                        ${flow.status === 'active' ? '✓ Rodando' : '⏳ Pausado'}
                    </span>
                </div>
                <div class="eio-flow-actions">
                    <button class="eio-btn-mini ${flow.status === 'active' ? 'eio-btn-pause' : 'eio-btn-resume'}" 
                            onclick="toggleFlow(${flow.id})">
                        ${flow.status === 'active' ? 'Pausar' : 'Retomar'}
                    </button>
                    <button class="eio-btn-mini eio-btn-stop" onclick="stopFlow(${flow.id})">
                        Parar
                    </button>
                </div>
            </div>
        `).join('');
    }

    console.log('✓ Fluxos ativos carregados:', flows.length);
}

// Toggle flow (Pausar/Retomar)
window.toggleFlow = async function (id) {
    console.log('Toggle flow:', id);

    const flow = activeFlows.find(f => f.id === id);
    if (!flow) {
        console.error('Fluxo não encontrado:', id);
        return;
    }

    // Alternar status
    flow.status = flow.status === 'active' ? 'paused' : 'active';

    // Salvar no storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
            await chrome.storage.local.set({ activeFlows });
        } catch (e) {
            console.log('Storage não disponível');
        }
    }

    // Feedback visual
    const action = flow.status === 'active' ? 'retomado' : 'pausado';
    showToast(`✓ Fluxo "${flow.name}" ${action} com sucesso!`, 'success');

    if (typeof addConsoleEntry === 'function') {
        addConsoleEntry('info', `Fluxo "${flow.name}" ${action}`);
    }

    // Recarregar lista
    await loadActiveFlows();
};

// Parar flow
window.stopFlow = async function (id) {
    console.log('Stop flow:', id);

    const flow = activeFlows.find(f => f.id === id);
    if (!flow) {
        console.error('Fluxo não encontrado:', id);
        return;
    }

    if (!confirm(`Deseja realmente parar o fluxo "${flow.name}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    // Remover do array
    activeFlows = activeFlows.filter(f => f.id !== id);

    // Salvar no storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
            await chrome.storage.local.set({ activeFlows });
        } catch (e) {
            console.log('Storage não disponível');
        }
    }

    // Feedback visual
    showToast(`🛑 Fluxo "${flow.name}" parado e removido`, 'info');

    if (typeof addConsoleEntry === 'function') {
        addConsoleEntry('warning', `Fluxo "${flow.name}" foi parado`);
    }

    // Recarregar lista
    await loadActiveFlows();
};

// Sistema de Toast Notifications
function showToast(message, type = 'info') {
    // Criar toast se não existir
    let toast = document.getElementById('eio-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'eio-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 14px 20px;
            background: linear-gradient(135deg, #1976D2 0%, #00ACC1 100%);
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-size: 0.875rem;
            font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            max-width: 300px;
        `;
        document.body.appendChild(toast);
    }

    // Cores por tipo
    const colors = {
        success: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
        error: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
        warning: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        info: 'linear-gradient(135deg, #1976D2 0%, #00ACC1 100%)'
    };

    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;

    // Mostrar
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Esconder após 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }, 3000);
}

// Inicializar quando DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(loadActiveFlows, 300);
    });
} else {
    setTimeout(loadActiveFlows, 300);
}

// Exportar funções globalmente
window.loadActiveFlows = loadActiveFlows;
window.showToast = showToast;

console.log('✓ Flow Management System carregado');
