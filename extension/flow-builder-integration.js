// ===== FLOW BUILDER INTEGRADO NA EXTENSÃO =====
let flowSteps = [];
let flowIdCounter = 3; // Começar após os fluxos mock

function initializeFlowBuilder() {
    const blocks = document.querySelectorAll('.eio-mini-block');
    const flowStepsContainer = document.getElementById('flowSteps');
    const placeholder = document.querySelector('.eio-canvas-placeholder');

    if (!blocks.length) {
        console.warn('Blocos do Flow Builder não encontrados');
        return;
    }

    console.log('✓ Flow Builder inicializado com', blocks.length, 'blocos');

    // Adicionar evento de clique nos blocos
    blocks.forEach(block => {
        block.addEventListener('click', () => {
            const blockType = block.getAttribute('data-block-type');
            const emoji = block.querySelector('.eio-block-emoji').textContent;
            const label = block.querySelector('.eio-block-label').textContent;

            // Feedback visual no bloco
            block.style.transform = 'scale(0.95)';
            setTimeout(() => {
                block.style.transform = '';
            }, 150);

            // Adicionar step ao fluxo
            flowSteps.push({ type: blockType, emoji, label });

            // Esconder placeholder se houver steps
            if (placeholder && flowSteps.length > 0) {
                placeholder.style.display = 'none';
            }

            // Renderizar step
            const stepEl = document.createElement('div');
            stepEl.className = 'eio-flow-step';
            stepEl.innerHTML = `
                <div class="eio-step-info">
                    <span class="eio-step-emoji">${emoji}</span>
                    <span class="eio-step-label">${label}</span>
                </div>
                <button class="eio-step-remove" data-index="${flowSteps.length - 1}">×</button>
            `;

            if (flowStepsContainer) {
                flowStepsContainer.appendChild(stepEl);
            }

            // Adicionar evento de remoção
            const removeBtn = stepEl.querySelector('.eio-step-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', function () {
                    const index = parseInt(this.getAttribute('data-index'));
                    flowSteps.splice(index, 1);
                    stepEl.remove();

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
            }
        });
    }

    // Botão Salvar Fluxo
    const saveBtn = document.getElementById('saveFlowBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const flowNameInput = document.getElementById('flowName');
            const flowName = flowNameInput?.value.trim() || 'Sem nome';

            if (flowSteps.length === 0) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ Adicione pelo menos um bloco', 'warning');
                }
                return;
            }

            // Validar nome
            if (flowName === 'Sem nome' || flowName === 'Meu Fluxo') {
                if (!confirm('Deseja salvar o fluxo sem um nome personalizado?')) {
                    flowNameInput?.focus();
                    return;
                }
            }

            const flowData = {
                id: flowIdCounter++,
                name: flowName,
                steps: [...flowSteps],
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            console.log('💾 Salvando fluxo:', flowData);

            // Animação de salvamento
            saveBtn.disabled = true;
            const originalHTML = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Salvando...';

            // Adicionar ao array de fluxos ativos
            if (typeof window.activeFlows !== 'undefined') {
                window.activeFlows = window.activeFlows || [];
                window.activeFlows.push(flowData);

                // Salvar no Chrome Storage se disponível
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    try {
                        await chrome.storage.local.set({ activeFlows: window.activeFlows });
                    } catch (e) {
                        console.log('Storage não disponível');
                    }
                }
            }

            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalHTML;

                if (typeof showToast === 'function') {
                    showToast(`✅ Fluxo "${flowName}" salvo e ativado!`, 'success');
                }

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
                    setTimeout(loadActiveFlows, 300);
                }
            }, 1500);
        });
    }
}

// Adicionar animação de spin
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.initializeFlowBuilder = initializeFlowBuilder;
}

console.log('✓ Flow Builder Integration carregado');
