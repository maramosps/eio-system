// CRM JavaScript
let leads = [];

document.addEventListener('DOMContentLoaded', () => {
    loadMockLeads();
    renderKanban();
    initializeEventListeners();
});

function loadMockLeads() {
    leads = [
        { id: 1, name: 'João Silva', username: '@joaosilva', status: 'new', tags: ['cliente', 'fitness'], notes: 'Interessado em consultoria', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joao' },
        { id: 2, name: 'Maria Santos', username: '@mariasantos', status: 'contacted', tags: ['lead', 'nutrição'], notes: 'Respondeu DM', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria' },
        { id: 3, name: 'Pedro Costa', username: '@pedrocosta', status: 'qualified', tags: ['hot', 'premium'], notes: 'Pediu proposta', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pedro' },
        { id: 4, name: 'Ana Lima', username: '@analima', status: 'converted', tags: ['cliente', 'vip'], notes: 'Fechou pacote premium', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana' },
        { id: 5, name: 'Carlos Souza', username: '@carlossouza', status: 'new', tags: ['lead'], notes: 'Curtiu vários posts', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos' },
        { id: 6, name: 'Julia Ferreira', username: '@juliaferreira', status: 'contacted', tags: ['cliente', 'iniciante'], notes: 'Marcou reunião', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=julia' }
    ];
}

function renderKanban() {
    const statuses = ['new', 'contacted', 'qualified', 'converted'];

    statuses.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        column.innerHTML = '';

        const statusLeads = leads.filter(lead => lead.status === status);

        statusLeads.forEach(lead => {
            const card = createLeadCard(lead);
            column.appendChild(card);
        });
    });
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

    const avatarUrl = lead.avatar || `${defaultAvatar}${encodeURIComponent(lead.name)}`;
    const avatarImg = document.getElementById('leadAvatar');
    avatarImg.src = avatarUrl;
    avatarImg.onerror = () => { avatarImg.src = `${defaultAvatar}${encodeURIComponent(lead.name)}`; };

    document.getElementById('leadName').textContent = lead.name;
    document.getElementById('leadUsername').textContent = lead.username;
    document.getElementById('leadUsername').href = `https://instagram.com/${lead.username.substring(1)}`;
    document.getElementById('leadTags').value = lead.tags.join(', ');
    document.getElementById('leadNotes').value = lead.notes;

    // Mock timeline
    document.getElementById('leadTimeline').innerHTML = `
    <div class="eio-timeline-item">
      <div class="eio-timeline-content">Enviado DM de boas-vindas</div>
      <div class="eio-timeline-date">23/12/2024 10:30</div>
    </div>
    <div class="eio-timeline-item">
      <div class="eio-timeline-content">Lead respondeu mensagem</div>
      <div class="eio-timeline-date">23/12/2024 15:45</div>
    </div>
    <div class="eio-timeline-item">
      <div class="eio-timeline-content">Curtiu últimos 3 posts</div>
      <div class="eio-timeline-date">22/12/2024 18:20</div>
    </div>
  `;
}

function initializeEventListeners() {
    // Modal close
    document.querySelector('.eio-modal-close').addEventListener('click', () => {
        document.getElementById('leadModal').classList.remove('active');
    });

    document.getElementById('btnCloseLead').addEventListener('click', () => {
        document.getElementById('leadModal').classList.remove('active');
    });

    // Open Add Lead Modal
    document.getElementById('btnAddLead').addEventListener('click', () => {
        const newLead = {
            id: Date.now(),
            name: 'Novo Lead',
            username: '@novo_usuario',
            status: 'new',
            tags: [],
            notes: '',
            avatar: ''
        };
        openLeadModal(newLead);
    });

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
}

