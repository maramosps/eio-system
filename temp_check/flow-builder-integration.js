// ===== FLOW BUILDER INTEGRADO NA EXTENSÃO =====
// Versão 1.1.0 - Com debug aprimorado

let flowSteps = [];

function initializeFlowBuilder() {
    console.log('🔧 [FlowBuilder] Iniciando inicialização...');

    const blocks = document.querySelectorAll('.eio-mini-block');
    const flowStepsContainer = document.getElementById('flowSteps');
    const placeholder = document.querySelector('.eio-canvas-placeholder');

    console.log('🔧 [FlowBuilder] Blocos encontrados:', blocks.length);
    console.log('🔧 [FlowBuilder] Container flowSteps:', flowStepsContainer ? 'OK' : 'NÃO ENCONTRADO');
    console.log('🔧 [FlowBuilder] Placeholder:', placeholder ? 'OK' : 'NÃO ENCONTRADO');

    if (!blocks.length) {
        console.warn('⚠️ [FlowBuilder] Nenhum bloco .eio-mini-block encontrado no DOM');
        return;
    }

    // Adicionar evento de clique nos blocos
    blocks.forEach((block, index) => {
        console.log(`🔧 [FlowBuilder] Configurando bloco ${index + 1}:`, block.getAttribute('data-block-type'));

        block.style.cursor = 'pointer';

        block.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('🖱️ [FlowBuilder] Clique detectado no bloco:', this.getAttribute('data-block-type'));

            const blockType = this.getAttribute('data-block-type');
            const emojiEl = this.querySelector('.eio-block-emoji');
            const labelEl = this.querySelector('.eio-block-label');

            if (!emojiEl || !labelEl) {
                console.error('❌ [FlowBuilder] Elementos emoji ou label não encontrados no bloco');
                return;
            }

            const emoji = emojiEl.textContent;
            const label = labelEl.textContent;

            console.log(`✅ [FlowBuilder] Adicionando: ${emoji} ${label} (${blockType})`);

            // Feedback visual no bloco
            this.style.transform = 'scale(0.9)';
            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.transform = '';
                this.style.opacity = '';
            }, 200);

            // Adicionar step ao fluxo
            flowSteps.push({ type: blockType, emoji, label });
            console.log('📋 [FlowBuilder] Steps atuais:', flowSteps.length);

            // Esconder placeholder se houver steps
            if (placeholder && flowSteps.length > 0) {
                placeholder.style.display = 'none';
            }

            // Renderizar step
            const stepEl = document.createElement('div');
            stepEl.className = 'eio-flow-step';
            stepEl.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(98, 70, 234, 0.15); border: 1px solid rgba(98, 70, 234, 0.3); border-radius: 8px; margin-bottom: 8px;';
            stepEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2rem;">${emoji}</span>
                    <span style="color: white; font-size: 0.9rem;">${label}</span>
                </div>
                <button class="eio-step-remove" data-index="${flowSteps.length - 1}" style="background: rgba(255,100,100,0.2); border: none; color: #ff6b6b; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px;">×</button>
            `;

            if (flowStepsContainer) {
                flowStepsContainer.appendChild(stepEl);
                console.log('✅ [FlowBuilder] Step renderizado no container');
            } else {
                console.error('❌ [FlowBuilder] Container flowSteps não encontrado para renderizar');
            }

            // Adicionar evento de remoção
            const removeBtn = stepEl.querySelector('.eio-step-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', function (evt) {
                    evt.preventDefault();
                    evt.stopPropagation();

                    const idx = parseInt(this.getAttribute('data-index'));
                    flowSteps.splice(idx, 1);
                    stepEl.remove();
                    console.log('🗑️ [FlowBuilder] Step removido. Steps restantes:', flowSteps.length);

                    // Mostrar placeholder se não houver mais steps
                    if (flowSteps.length === 0 && placeholder) {
                        placeholder.style.display = 'flex';
                    }

                    // Reindexar botões
                    document.querySelectorAll('.eio-step-remove').forEach((btn, i) => {
                        btn.setAttribute('data-index', i);
                    });

                    if (typeof showToast === 'function') {
                        showToast('Bloco removido do fluxo', 'info');
                    }
                });
            }

            // Feedback visual
            if (typeof showToast === 'function') {
                showToast(`✓ ${label} adicionado`, 'success');
            }

            if (typeof addConsoleEntry === 'function') {
                addConsoleEntry('info', `Bloco "${label}" adicionado ao fluxo`);
            }
        });
    });

    // Botão Limpar Fluxo
    const clearBtn = document.getElementById('clearFlowBtn');
    if (clearBtn) {
        console.log('🔧 [FlowBuilder] Configurando botão Limpar');
        clearBtn.addEventListener('click', () => {
            if (flowSteps.length === 0) {
                if (typeof showToast === 'function') {
                    showToast('Fluxo já está vazio', 'info');
                }
                return;
            }

            if (confirm('Deseja limpar todo o fluxo?')) {
                flowSteps = [];
                if (flowStepsContainer) flowStepsContainer.innerHTML = '';
                if (placeholder) placeholder.style.display = 'flex';

                if (typeof showToast === 'function') {
                    showToast('Fluxo limpo', 'info');
                }

                if (typeof addConsoleEntry === 'function') {
                    addConsoleEntry('info', 'Fluxo limpo');
                }
                console.log('🗑️ [FlowBuilder] Fluxo limpo completamente');
            }
        });
    }

    // Botão Salvar Fluxo
    const saveBtn = document.getElementById('saveFlowBtn');
    if (saveBtn) {
        console.log('🔧 [FlowBuilder] Configurando botão Salvar');
        saveBtn.addEventListener('click', async () => {
            const flowNameInput = document.getElementById('flowName');
            const flowName = flowNameInput?.value.trim() || 'Sem nome';

            console.log('💾 [FlowBuilder] Tentando salvar fluxo:', flowName);
            console.log('💾 [FlowBuilder] Steps:', flowSteps.length);

            if (flowSteps.length === 0) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ Adicione pelo menos um bloco', 'warning');
                }
                alert('Adicione pelo menos um bloco ao fluxo antes de salvar!');
                return;
            }

            const flowData = {
                id: Date.now(),
                name: flowName,
                steps: [...flowSteps],
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            console.log('💾 [FlowBuilder] Dados do fluxo:', flowData);

            // Animação de salvamento
            saveBtn.disabled = true;
            const originalHTML = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Salvando...';

            try {
                // Carregar fluxos existentes do storage
                let existingFlows = [];

                if (typeof chrome !== 'undefined' && chrome.storage) {
                    try {
                        const result = await chrome.storage.local.get(['activeFlows']);
                        existingFlows = result.activeFlows || [];
                        console.log('💾 [FlowBuilder] Fluxos existentes:', existingFlows.length);
                    } catch (e) {
                        console.log('⚠️ [FlowBuilder] Storage read error:', e);
                    }
                }

                // Adicionar novo fluxo
                existingFlows.push(flowData);

                // Salvar no Chrome Storage
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    await chrome.storage.local.set({ activeFlows: existingFlows });
                    console.log('✅ [FlowBuilder] Fluxos salvos no storage:', existingFlows.length);
                }

                setTimeout(() => {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalHTML;

                    if (typeof showToast === 'function') {
                        showToast(`✅ Fluxo "${flowName}" salvo e ativado!`, 'success');
                    }

                    alert(`Fluxo "${flowName}" salvo com sucesso!`);

                    if (typeof addConsoleEntry === 'function') {
                        addConsoleEntry('success', `✅ Fluxo "${flowName}" salvo e ativado!`);
                    }

                    // Limpar formulário
                    flowSteps = [];
                    if (flowStepsContainer) flowStepsContainer.innerHTML = '';
                    if (placeholder) placeholder.style.display = 'flex';
                    if (flowNameInput) flowNameInput.value = 'Meu Fluxo';

                    // Recarregar lista de fluxos ativos
                    if (typeof loadActiveFlows === 'function') {
                        loadActiveFlows();
                    }
                }, 1000);

            } catch (error) {
                console.error('❌ [FlowBuilder] Erro ao salvar fluxo:', error);
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalHTML;

                if (typeof showToast === 'function') {
                    showToast('❌ Erro ao salvar fluxo', 'error');
                }
                alert('Erro ao salvar fluxo: ' + error.message);
            }
        });
    }

    console.log('✅ [FlowBuilder] Inicialização completa!');
}

// Adicionar animação de spin via CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .eio-mini-block {
        cursor: pointer !important;
        transition: transform 0.15s, opacity 0.15s !important;
    }
    .eio-mini-block:hover {
        transform: scale(1.05) !important;
        opacity: 0.9 !important;
    }
    .eio-mini-block:active {
        transform: scale(0.95) !important;
    }
`;
document.head.appendChild(style);

// Auto-inicialização quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeFlowBuilder, 500);
    });
} else {
    setTimeout(initializeFlowBuilder, 500);
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.initializeFlowBuilder = initializeFlowBuilder;
    window.flowSteps = flowSteps;
}

console.log('✓ [FlowBuilder] Script carregado');
