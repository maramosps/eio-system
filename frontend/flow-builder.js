// Flow Builder functionality
let flowNodes = [];
let selectedNode = null;
let draggedBlock = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeDragAndDrop();
    initializeButtons();
    initializeCanvas();
});

/**
 * Initialize drag and drop
 */
function initializeDragAndDrop() {
    const blocks = document.querySelectorAll('.eio-block');
    const canvas = document.getElementById('canvasContent');

    // Make blocks draggable
    blocks.forEach(block => {
        block.addEventListener('dragstart', (e) => {
            draggedBlock = {
                type: block.getAttribute('data-block-type'),
                name: block.querySelector('.eio-block-name').textContent,
                icon: block.querySelector('.eio-block-icon').innerHTML
            };
            block.classList.add('eio-dragging');
        });

        block.addEventListener('dragend', () => {
            block.classList.remove('eio-dragging');
        });
    });

    // Canvas drop zone
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.classList.add('eio-drop-zone');
    });

    canvas.addEventListener('dragleave', () => {
        canvas.classList.remove('eio-drop-zone');
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('eio-drop-zone');

        if (!draggedBlock) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + canvas.scrollLeft;
        const y = e.clientY - rect.top + canvas.scrollTop;

        addNodeToCanvas(draggedBlock, x, y);
        draggedBlock = null;
    });
}

/**
 * Add node to canvas
 */
function addNodeToCanvas(blockData, x, y) {
    const nodeId = 'node-' + Date.now();
    const node = {
        id: nodeId,
        type: blockData.type,
        name: blockData.name,
        x,
        y,
        config: getDefaultConfig(blockData.type)
    };

    flowNodes.push(node);
    renderNode(node);

    // Hide empty state
    document.querySelector('.eio-canvas-empty').style.display = 'none';
}

/**
 * Render node on canvas
 */
function renderNode(node) {
    const canvas = document.getElementById('canvasContent');
    const nodeEl = document.createElement('div');
    nodeEl.className = 'eio-flow-node';
    nodeEl.id = node.id;
    nodeEl.style.left = node.x + 'px';
    nodeEl.style.top = node.y + 'px';

    const iconColor = getBlockColor(node.type);

    nodeEl.innerHTML = `
    <div class="eio-node-header">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" fill="${iconColor}"/>
      </svg>
      <span>${node.name}</span>
    </div>
    <div class="eio-node-body">
      ${getNodeBody(node)}
    </div>
    <button class="eio-node-delete">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="2"/>
      </svg>
    </button>
    <div class="eio-node-port eio-port-input"></div>
    <div class="eio-node-port eio-port-output"></div>
  `;

    canvas.appendChild(nodeEl);

    // Make draggable
    makeDraggable(nodeEl, node);

    // Click to select
    nodeEl.addEventListener('click', (e) => {
        if (e.target.closest('.eio-node-delete')) {
            deleteNode(node.id);
            return;
        }
        selectNode(node.id);
    });
}

/**
 * Make node draggable
 */
function makeDraggable(element, node) {
    let isDragging = false;
    let startX, startY, offsetX, offsetY;

    element.addEventListener('mousedown', (e) => {
        if (e.target.closest('.eio-node-delete') || e.target.closest('.eio-node-port')) {
            return;
        }

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        offsetX = node.x;
        offsetY = node.y;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        node.x = offsetX + dx;
        node.y = offsetY + dy;

        element.style.left = node.x + 'px';
        element.style.top = node.y + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

/**
 * Select node
 */
function selectNode(nodeId) {
    // Remove selection from all nodes
    document.querySelectorAll('.eio-flow-node').forEach(n => {
        n.classList.remove('eio-node-selected');
    });

    // Select this node
    const nodeEl = document.getElementById(nodeId);
    nodeEl.classList.add('eio-node-selected');

    selectedNode = flowNodes.find(n => n.id === nodeId);
    showProperties(selectedNode);
}

/**
 * Show properties panel
 */
function showProperties(node) {
    const panel = document.getElementById('propertiesPanel');
    const body = document.getElementById('propertiesBody');

    panel.classList.add('eio-panel-open');

    body.innerHTML = buildPropertiesForm(node);

    // Add event listeners to inputs
    body.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('change', (e) => {
            const key = e.target.name;
            node.config[key] = e.target.value;
            updateNodeDisplay(node);
        });
    });
}

/**
 * Build properties form
 */
function buildPropertiesForm(node) {
    let html = `<h5>${node.name}</h5>`;

    switch (node.type) {
        case 'search-hashtag':
            html += `
        <div class="eio-property-group">
          <label class="eio-property-label">Hashtag</label>
          <input type="text" name="hashtag" class="eio-input eio-property-input" value="${node.config.hashtag || ''}" placeholder="#fitness">
        </div>
        <div class="eio-property-group">
          <label class="eio-property-label">Quantidade de perfis</label>
          <input type="number" name="count" class="eio-input eio-property-input" value="${node.config.count || 50}" min="1" max="500">
        </div>
      `;
            break;

        case 'action-follow':
            html += `
        <div class="eio-property-group">
          <label class="eio-property-label">Máximo por dia</label>
          <input type="number" name="maxPerDay" class="eio-input eio-property-input" value="${node.config.maxPerDay || 200}" min="1" max="500">
        </div>
        <div class="eio-property-group">
          <label class="eio-property-label">Intervalo (segundos)</label>
          <input type="number" name="interval" class="eio-input eio-property-input" value="${node.config.interval || 5}" min="1" max="60">
        </div>
      `;
            break;

        case 'action-comment':
            html += `
        <div class="eio-property-group">
          <label class="eio-property-label">Mensagens (uma por linha)</label>
          <textarea name="messages" class="eio-input eio-property-input" rows="5">${node.config.messages || 'Adorei! 🔥\nIncrível!\nMuito legal!'}</textarea>
        </div>
      `;
            break;

        case 'control-delay':
            html += `
        <div class="eio-property-group">
          <label class="eio-property-label">Aguardar (segundos)</label>
          <input type="number" name="delay" class="eio-input eio-property-input" value="${node.config.delay || 10}" min="1" max="3600">
        </div>
      `;
            break;

        case 'action-ai-welcome':
            html += `
        <div class="eio-property-group">
          <label class="eio-property-label">Mensagem (Spintax)</label>
          <textarea name="message" class="eio-input eio-property-input" rows="5" placeholder="{Olá|Oi}, tudo bem?">${node.config.message || '{Olá|Oi}, tudo bem? Obrigado por seguir!'}</textarea>
        </div>
        <div class="eio-property-group">
          <label class="eio-property-label">Delay de Segurança (minutos)</label>
          <input type="number" name="delay" class="eio-input eio-property-input" value="${node.config.delay || 15}" min="15" max="60">
        </div>
      `;
            break;
    }

    return html;
}

/**
 * Get default config for block type
 */
function getDefaultConfig(type) {
    const defaults = {
        'search-hashtag': { hashtag: '', count: 50 },
        'action-follow': { maxPerDay: 200, interval: 5 },
        'action-like': { maxPerDay: 500, interval: 3 },
        'action-comment': { messages: 'Adorei! 🔥\nIncrível!', maxPerDay: 100 },
        'control-delay': { delay: 10 },
        'action-ai-welcome': { message: '{Olá|Oi}, tudo bem? Obrigado por seguir!', delay: 15 }
    };

    return defaults[type] || {};
}

/**
 * Get block color
 */
function getBlockColor(type) {
    if (type.startsWith('search-')) return '#2196F3';
    if (type.startsWith('action-')) return '#4CAF50';
    if (type.startsWith('control-')) return '#FF9800';
    return '#9E9E9E';
}

/**
 * Get node body content
 */
function getNodeBody(node) {
    let content = '<div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">';

    switch (node.type) {
        case 'search-hashtag':
            content += `Hashtag: ${node.config.hashtag || 'Não configurado'}`;
            break;
        case 'action-follow':
            content += `Max: ${node.config.maxPerDay || 200}/dia`;
            break;
        case 'control-delay':
            content += `Delay: ${node.config.delay || 10}s`;
            break;
        case 'action-ai-welcome':
            content += `Delay: ${node.config.delay || 15} min`;
            break;
        default:
            content += 'Clique para configurar';
    }

    content += '</div>';
    return content;
}

/**
 * Update node display
 */
function updateNodeDisplay(node) {
    const nodeEl = document.getElementById(node.id);
    if (nodeEl) {
        nodeEl.querySelector('.eio-node-body').innerHTML = getNodeBody(node);
    }
}

/**
 * Delete node
 */
function deleteNode(nodeId) {
    flowNodes = flowNodes.filter(n => n.id !== nodeId);
    document.getElementById(nodeId).remove();

    if (selectedNode && selectedNode.id === nodeId) {
        selectedNode = null;
        document.getElementById('propertiesPanel').classList.remove('eio-panel-open');
    }

    if (flowNodes.length === 0) {
        document.querySelector('.eio-canvas-empty').style.display = 'block';
    }
}

/**
 * Initialize buttons and CTA actions
 */
function initializeButtons() {
    // Back Button (Voltar)
    const btnBack = document.querySelector('a[href="dashboard.html"]');
    if (btnBack) {
        btnBack.addEventListener('click', (e) => {
            if (flowNodes.length > 0) {
                if (!confirm('Existem alterações não salvas. Deseja realmente voltar?')) {
                    e.preventDefault();
                }
            }
        });
    }

    // Close Properties
    const closeBtn = document.getElementById('closeProperties');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('propertiesPanel').classList.remove('eio-panel-open');
            document.querySelectorAll('.eio-flow-node').forEach(n => {
                n.classList.remove('eio-node-selected');
            });
        });
    }

    // Clear Canvas
    const btnClear = document.getElementById('btnClear');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (flowNodes.length > 0) {
                if (confirm('Tem certeza que deseja limpar todo o fluxo?')) {
                    flowNodes = [];
                    // Keep start node, remove others
                    const canvas = document.getElementById('canvasContent');
                    const startNode = canvas.querySelector('.eio-node-start');
                    canvas.innerHTML = '';
                    if (startNode) canvas.appendChild(startNode);

                    document.querySelector('.eio-canvas-empty').style.display = 'block';
                    document.getElementById('propertiesPanel').classList.remove('eio-panel-open');
                    showToast('Fluxo limpo com sucesso!', 'info');
                }
            }
        });
    }

    // Save Draft
    const btnSaveDraft = document.getElementById('btnSaveDraft');
    if (btnSaveDraft) {
        btnSaveDraft.addEventListener('click', () => {
            saveFlow('draft', btnSaveDraft);
        });
    }

    // Save and Activate
    const btnSaveActivate = document.getElementById('btnSaveActivate');
    if (btnSaveActivate) {
        btnSaveActivate.addEventListener('click', () => {
            saveFlow('active', btnSaveActivate);
        });
    }

    // Palette Blocks - Click to Auto-Add Performance improvement
    const blocks = document.querySelectorAll('.eio-block');
    blocks.forEach(block => {
        block.addEventListener('click', () => {
            const blockData = {
                type: block.getAttribute('data-block-type'),
                name: block.querySelector('.eio-block-name').textContent,
                icon: block.querySelector('.eio-block-icon').innerHTML
            };

            // Find a good spot on canvas (center or staggered)
            const canvas = document.getElementById('flowCanvas');
            const rect = canvas.getBoundingClientRect();
            const x = rect.width / 2 + (flowNodes.length * 20) - 100;
            const y = 150 + (flowNodes.length * 20);

            addNodeToCanvas(blockData, x, y);
            showToast(`${blockData.name} adicionado ao fluxo`, 'success');
        });
    });
}

/**
 * Show a professional toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `eio-toast eio-toast-${type}`;
    toast.innerHTML = `
        <div class="eio-toast-content">
            <span class="eio-toast-icon">${type === 'success' ? '✓' : 'ℹ'}</span>
            <span class="eio-toast-message">${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('eio-toast-active'), 100);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('eio-toast-active');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for toast dynamically if not exists
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    .eio-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--bg-card);
        border-left: 4px solid #4CAF50;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        z-index: 10000;
    }
    .eio-toast-active {
        transform: translateY(0);
        opacity: 1;
    }
    .eio-toast-info { border-left-color: #2196F3; }
    .eio-toast-success { border-left-color: #4CAF50; }
    .eio-toast-content { display: flex; align-items: center; gap: 12px; }
    .eio-toast-icon { font-weight: bold; font-size: 1.2rem; }
    .eio-toast-message { color: white; font-weight: 500; }
`;
document.head.appendChild(toastStyle);

/**
 * Save flow
 */
function saveFlow(status, btn) {
    const flowName = document.getElementById('flowName').value;

    if (flowNodes.length === 0) {
        showToast('Adicione pelo menos um bloco ao fluxo antes de salvar', 'info');
        return;
    }

    // Show loading state on button
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="eio-loader-sm"></span> Salvando...`;

    const flowData = {
        name: flowName,
        status: status,
        config: {
            nodes: flowNodes,
            connections: [] // TODO: Implement connections
        }
    };

    console.log('Saving flow:', flowData);

    // Simulate API Call
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        showToast(`Fluxo "${flowName}" ${status === 'draft' ? 'salvo como rascunho' : 'ativado'} com sucesso!`);
    }, 1000);
}

/**
 * Initialize canvas
 */
function initializeCanvas() {
    // Canvas is ready
    console.log('Flow Builder initialized');
}
