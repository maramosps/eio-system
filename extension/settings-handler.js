// Função para salvar configurações
window.saveSettings = async function () {
    const speedSetting = document.getElementById('speedSetting')?.value || 'safe';
    const autoStart = document.getElementById('autoStartSetting')?.checked || false;
    const notifications = document.getElementById('notificationsSetting')?.checked || true;

    const settings = {
        speed: speedSetting,
        autoStart: autoStart,
        notifications: notifications,
        savedAt: new Date().toISOString()
    };

    console.log('💾 Salvando configurações:', settings);

    // Salvar no Chrome Storage se disponível
    if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
            await chrome.storage.local.set({ settings });
        } catch (e) {
            console.log('Storage não disponível');
        }
    }

    // Fechar modal
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';

    // Feedback
    if (typeof showToast === 'function') {
        showToast('✅ Configurações salvas com sucesso!', 'success');
    }

    if (typeof addConsoleEntry === 'function') {
        addConsoleEntry('success', '✅ Configurações atualizadas');
    }
};

console.log('✓ Settings functions loaded');
