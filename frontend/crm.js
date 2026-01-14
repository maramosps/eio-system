/*
═══════════════════════════════════════════════════════════
  E.I.O - CRM FRONTEND LOGIC
  Gerenciamento de leads e funil de vendas (Kanban)
═══════════════════════════════════════════════════════════
*/

let leads = [];

document.addEventListener('DOMContentLoaded', async () => {
    // ✅ SCROLL AO TOPO
    const pageContent = document.querySelector('.eio-page-content');
    if (pageContent) {
        pageContent.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize
    await refreshLeads();
    initializeEventListeners();
});

// ✅ HELPERS GLOBAIS PARA ONCLICK HANDLERS (INFALÍVEL)
window.updateActiveNav = function (element) {
    document.querySelectorAll('.eio-nav-item').forEach(nav => nav.classList.remove('eio-nav-item-active'));
    element.classList.add('eio-nav-item-active');
};

window.filterKanban = function (view) {
    const columns = document.querySelectorAll('.eio-kanban-column');

    if (view === 'all') {
        columns.forEach(col => {
            // Mostra o container pai da coluna (o wrapper flex item)
            if (col.parentElement && col.parentElement.classList.contains('eio-kanban-col-wrapper')) {
                col.parentElement.style.display = 'flex';
            } else {
                // Fallback se não houver wrapper
                col.style.display = 'flex';
            }
        });
    } else {
        columns.forEach(col => {
            const shouldShow = (col.dataset.status === view);
            const target = (col.parentElement && col.parentElement.classList.contains('eio-kanban-col-wrapper'))
                ? col.parentElement
                : col;

            target.style.display = shouldShow ? 'flex' : 'none';
        });
    }
};

async function refreshLeads() {
    try {
        const response = await api.getLeads();
        if (response.success) {
            leads = response.data.leads || [];
            renderKanban();
            updateStats();
        }
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
        // Fallback for demo
        const savedLeads = localStorage.getItem('eio_leads');
        if (savedLeads) {
            leads = JSON.parse(savedLeads);
            renderKanban();
            updateStats();
        }
    }
}

function renderKanban() {
    const statuses = ['new', 'contacted', 'qualified', 'converted'];

    statuses.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (!column) return;

        // Limpa leads antigos
        const existingCards = column.querySelectorAll('.eio-lead-card, .eio-empty-column');
        existingCards.forEach(card => card.remove());

        const statusLeads = leads.filter(lead => lead.status === status);

        if (statusLeads.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'eio-empty-column';
            emptyState.style.padding = '30px 15px';
            emptyState.style.textAlign = 'center';
            emptyState.style.color = 'rgba(255,255,255,0.2)';
            emptyState.innerHTML = '<p style="font-size: 0.85rem; margin: 0;">Nenhum lead</p>';
            column.appendChild(emptyState);
        } else {
            statusLeads.forEach(lead => {
                const card = createLeadCard(lead);
                column.appendChild(card);
            });
        }
    });
}

function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'eio-lead-card';
    card.draggable = true;
    card.dataset.leadId = lead.id;

    const avatarUrl = lead.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.username}`;

    card.innerHTML = `
    <div class="eio-lead-header">
      <img src="${avatarUrl}" alt="${lead.name}" class="eio-lead-avatar">
      <div class="eio-lead-info">
        <h5>${lead.name || 'Sem nome'}</h5>
        <span>${lead.username}</span>
      </div>
    </div>
    <div class="eio-lead-tags">
      ${(lead.tags || []).map(tag => `<span class="eio-tag">${tag}</span>`).join('')}
    </div>
  `;

    card.addEventListener('click', () => openLeadModal(lead));
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('leadId', lead.id);
    });

    return card;
}

function openLeadModal(lead) {
    const modal = document.getElementById('leadModal');
    if (!modal) return;

    modal.dataset.leadId = lead.id;
    document.getElementById('modalLeadName').textContent = lead.name || lead.username;

    // Populate form
    const tagsInput = document.getElementById('leadTags');
    if (tagsInput) tagsInput.value = (lead.tags || []).join(', ');

    const notesInput = document.getElementById('leadNotes');
    if (notesInput) notesInput.value = lead.notes || '';

    modal.classList.add('active');
}

function updateStats() {
    const statuses = ['new', 'contacted', 'qualified', 'converted'];
    statuses.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (column) {
            const badge = column.parentElement?.querySelector('.eio-badge-count');
            if (badge) {
                badge.textContent = leads.filter(l => l.status === status).length;
            }
        }
    });
    const totalEl = document.getElementById('statTotalLeads');
    if (totalEl) totalEl.textContent = leads.length;
}

function initializeEventListeners() {
    // Modal close
    const closeModal = () => document.getElementById('leadModal').classList.remove('active');

    const closeBtn = document.querySelector('.eio-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const cancelBtn = document.getElementById('btnCloseLead');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Save Lead
    const saveBtn = document.getElementById('btnSaveLead');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const modal = document.getElementById('leadModal');
            const leadId = modal.dataset.leadId;
            const tags = document.getElementById('leadTags').value.split(',').map(t => t.trim()).filter(t => t);
            const notes = document.getElementById('leadNotes').value;

            try {
                const response = await api.updateLead(leadId, { tags, notes });
                if (response.success) {
                    await refreshLeads();
                    closeModal();
                }
            } catch (error) {
                console.error('Erro ao salvar lead:', error);
                alert('Erro ao salvar lead');
            }
        });
    }

    // Drag and Drop zones
    const columns = document.querySelectorAll('.eio-kanban-column');
    columns.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('drag-over');
        });

        col.addEventListener('drop', async e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const leadId = e.dataTransfer.getData('leadId');
            const newStatus = col.dataset.status;
            if (leadId && newStatus) {
                await moveLead(leadId, newStatus);
            }
        });
    });
}

async function moveLead(leadId, newStatus) {
    const lead = leads.find(l => l.id == leadId);
    if (!lead) return;

    const oldStatus = lead.status;
    lead.status = newStatus;
    renderKanban();
    updateStats();

    try {
        await api.updateLead(leadId, { status: newStatus });
    } catch (error) {
        lead.status = oldStatus;
        renderKanban();
        updateStats();
        console.error('Erro ao mover lead:', error);
    }
}
