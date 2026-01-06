// CRM JavaScript - Production Ready
let leads = [];

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('eio_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize with empty state - leads are loaded from API/localStorage
    loadLeads();
    renderKanban();
    initializeEventListeners();
    updateStats();
});

function loadLeads() {
    // Try to load from localStorage (will be empty for new users)
    const savedLeads = localStorage.getItem('eio_leads');
    if (savedLeads) {
        leads = JSON.parse(savedLeads);
    } else {
        leads = []; // Empty for new users
    }
}

function saveLeads() {
    localStorage.setItem('eio_leads', JSON.stringify(leads));
}

function updateStats() {
    // Update sidebar stats
    const totalStat = document.querySelector('.eio-stat-mini:nth-child(1) .eio-stat-value');
    const pendingStat = document.querySelector('.eio-stat-mini:nth-child(2) .eio-stat-value');
    const monthStat = document.querySelector('.eio-stat-mini:nth-child(3) .eio-stat-value');

    if (totalStat) totalStat.textContent = leads.length;
    if (pendingStat) pendingStat.textContent = leads.filter(l => l.status === 'new').length;
    if (monthStat) monthStat.textContent = leads.length; // Simplificado para MVP

    // Update column counts
    const statuses = ['new', 'contacted', 'qualified', 'converted'];
    statuses.forEach(status => {
        const badge = document.querySelector(`.eio-kanban-column[data-status="${status}"] .eio-badge-count`);
        if (badge) {
            badge.textContent = leads.filter(l => l.status === status).length;
        }
    });
}

function renderKanban() {
    const statuses = ['new', 'contacted', 'qualified', 'converted'];

    statuses.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (!column) return;

        column.innerHTML = '';

        const statusLeads = leads.filter(lead => lead.status === status);

        if (statusLeads.length === 0) {
            // Empty state for each column
            column.innerHTML = `
                <div class="eio-empty-column" style="padding: 30px 15px; text-align: center; color: rgba(255,255,255,0.3);">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 10px; opacity: 0.3;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                    <p style="font-size: 0.85rem; margin: 0;">Nenhum lead aqui</p>
                </div>
            `;
        } else {
            statusLeads.forEach(lead => {
                const card = createLeadCard(lead);
                column.appendChild(card);
            });
        }
    });

    updateStats();
}

const defaultAvatar = 'https://ui-avatars.com/api/?background=2196F3&color=fff&name=';

function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'eio-lead-card';
    card.draggable = true;
    card.dataset.leadId = lead.id;

    const avatarUrl = lead.avatar || `${defaultAvatar}${encodeURIComponent(lead.name)}`;

    card.innerHTML = `
    <div class="eio-lead-header">
      <img src="${avatarUrl}" alt="${lead.name}" class="eio-lead-avatar" onerror="this.src='${defaultAvatar}${encodeURIComponent(lead.name)}'">
      <div class="eio-lead-info">
        <h5>${lead.name}</h5>
        <span>${lead.username}</span>
      </div>
    </div>
    <div class="eio-lead-tags">
      ${lead.tags.map(tag => `<span class="eio-tag">${tag}</span>`).join('')}
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
    modal.classList.add('active');
    modal.dataset.leadId = lead.id;
    modal.dataset.isNew = lead.isNew ? 'true' : 'false';

    const avatarUrl = lead.avatar || `${defaultAvatar}${encodeURIComponent(lead.name)}`;
    const avatarImg = document.getElementById('leadAvatar');
    avatarImg.src = avatarUrl;
    avatarImg.onerror = () => { avatarImg.src = `${defaultAvatar}${encodeURIComponent(lead.name)}`; };

    document.getElementById('leadName').textContent = lead.name || 'Novo Lead';
    document.getElementById('leadUsername').textContent = lead.username || '@usuario';
    document.getElementById('leadUsername').href = lead.username ? `https://instagram.com/${lead.username.substring(1)}` : '#';
    document.getElementById('leadTags').value = lead.tags ? lead.tags.join(', ') : '';
    document.getElementById('leadNotes').value = lead.notes || '';

    // Timeline - empty for new leads
    const timeline = document.getElementById('leadTimeline');
    if (lead.timeline && lead.timeline.length > 0) {
        timeline.innerHTML = lead.timeline.map(item => `
            <div class="eio-timeline-item">
                <div class="eio-timeline-content">${item.content}</div>
                <div class="eio-timeline-date">${item.date}</div>
            </div>
        `).join('');
    } else {
        timeline.innerHTML = `
            <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.4);">
                <p style="margin: 0; font-size: 0.9rem;">Nenhuma interação registrada</p>
            </div>
        `;
    }
}

function initializeEventListeners() {
    // Modal close
    const closeBtn = document.querySelector('.eio-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('leadModal').classList.remove('active');
        });
    }

    const closeLead = document.getElementById('btnCloseLead');
    if (closeLead) {
        closeLead.addEventListener('click', () => {
            document.getElementById('leadModal').classList.remove('active');
        });
    }

    // Save Lead
    const saveLead = document.getElementById('btnSaveLead');
    if (saveLead) {
        saveLead.addEventListener('click', () => {
            const modal = document.getElementById('leadModal');
            const leadId = parseInt(modal.dataset.leadId);
            const isNew = modal.dataset.isNew === 'true';

            const updatedData = {
                tags: document.getElementById('leadTags').value.split(',').map(t => t.trim()).filter(t => t),
                notes: document.getElementById('leadNotes').value
            };

            if (isNew) {
                // Add new lead
                const newLead = {
                    id: leadId,
                    name: document.getElementById('leadName').textContent,
                    username: document.getElementById('leadUsername').textContent,
                    status: 'new',
                    ...updatedData,
                    timeline: [{
                        content: 'Lead adicionado ao CRM',
                        date: new Date().toLocaleString('pt-BR')
                    }]
                };
                leads.push(newLead);
            } else {
                // Update existing
                const lead = leads.find(l => l.id === leadId);
                if (lead) {
                    Object.assign(lead, updatedData);
                }
            }

            saveLeads();
            renderKanban();
            modal.classList.remove('active');
        });
    }

    // Open Add Lead Modal
    const addLead = document.getElementById('btnAddLead');
    if (addLead) {
        addLead.addEventListener('click', () => {
            const username = prompt("Digite o @ do usuário do Instagram:", "@");
            if (username && username !== '@') {
                const newLead = {
                    id: Date.now(),
                    name: username.replace('@', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    username: username.startsWith('@') ? username : '@' + username,
                    status: 'new',
                    tags: [],
                    notes: '',
                    avatar: '',
                    isNew: true,
                    timeline: []
                };
                openLeadModal(newLead);
            }
        });
    }

    // Drag and drop between columns
    const columns = document.querySelectorAll('.eio-column-content');
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('eio-drop-zone');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('eio-drop-zone');
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('eio-drop-zone');

            const leadId = parseInt(e.dataTransfer.getData('leadId'));
            const newStatus = column.closest('.eio-kanban-column').dataset.status;

            const lead = leads.find(l => l.id === leadId);
            if (lead) {
                lead.status = newStatus;
                saveLeads();
                renderKanban();
            }
        });
    });

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.eio-nav-item[data-view]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active state
            navItems.forEach(nav => nav.classList.remove('eio-nav-item-active'));
            item.classList.add('eio-nav-item-active');

            const view = item.dataset.view;
            const columns = document.querySelectorAll('.eio-kanban-column');

            columns.forEach(col => {
                if (view === 'all') {
                    col.style.display = 'flex';
                    col.style.flex = '0 0 300px';
                } else {
                    if (col.dataset.status === view) {
                        col.style.display = 'flex';
                        col.style.flex = '1';
                    } else {
                        col.style.display = 'none';
                    }
                }
            });
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchLeads');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.eio-lead-card').forEach(card => {
                const name = card.querySelector('h5')?.textContent.toLowerCase() || '';
                const username = card.querySelector('.eio-lead-info span')?.textContent.toLowerCase() || '';
                if (name.includes(query) || username.includes(query)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}
