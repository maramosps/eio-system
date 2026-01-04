// Calendar JavaScript
let currentDate = new Date();
let scheduledContent = [];

document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    initializeEventListeners();
    initializeDragDrop();
});

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update header
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // Get first day and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        const cell = createCalendarCell(prevMonthDays - i, true);
        calendarBody.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const cell = createCalendarCell(day, false, isToday);
        calendarBody.appendChild(cell);
    }

    // Next month days
    const remainingCells = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        const cell = createCalendarCell(day, true);
        calendarBody.appendChild(cell);
    }
}

function createCalendarCell(day, isOtherMonth, isToday = false) {
    const cell = document.createElement('div');
    cell.className = 'eio-calendar-cell';
    if (isOtherMonth) cell.classList.add('other-month');
    if (isToday) cell.classList.add('today');

    cell.innerHTML = `
    <div class="eio-cell-date">${day}</div>
    <div class="eio-cell-content"></div>
  `;

    cell.addEventListener('click', () => openContentModal(day));
    cell.addEventListener('dragover', (e) => e.preventDefault());
    cell.addEventListener('drop', (e) => handleDrop(e, day));

    return cell;
}

function initializeEventListeners() {
    document.getElementById('btnPrevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('btnNextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('btnToday').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    document.querySelector('.eio-modal-close').addEventListener('click', closeModal);
    document.getElementById('btnCancelContent').addEventListener('click', closeModal);
    document.getElementById('btnSaveContent').addEventListener('click', saveContent);
}

function initializeDragDrop() {
    const items = document.querySelectorAll('.eio-library-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('contentType', item.dataset.type);
        });
    });
}

function handleDrop(e, day) {
    e.preventDefault();
    const contentType = e.dataTransfer.getData('contentType');
    openContentModal(day, contentType);
}

function openContentModal(day, type = 'post') {
    const modal = document.getElementById('contentModal');
    modal.classList.add('active');
    document.getElementById('contentType').value = type;

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00`;
    document.getElementById('contentDateTime').value = dateStr;
}

function closeModal() {
    document.getElementById('contentModal').classList.remove('active');
}

function saveContent() {
    const content = {
        type: document.getElementById('contentType').value,
        dateTime: document.getElementById('contentDateTime').value,
        caption: document.getElementById('contentCaption').value,
        hashtags: document.getElementById('contentHashtags').value,
        status: document.getElementById('contentStatus').value
    };

    scheduledContent.push(content);
    closeModal();
    alert('Conteúdo agendado com sucesso!');
    // TODO: Render content on calendar
}
