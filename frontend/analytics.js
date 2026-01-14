// Analytics JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // ✅ SCROLL AO TOPO: Garante que o conteúdo sempre apareça no início
    const pageContent = document.querySelector('.eio-page-content');
    if (pageContent) {
        pageContent.scrollTo({ top: 0, behavior: 'auto' });
    }

    initializeCharts();
    loadTopPosts();
    initializeNavigation();
});

function initializeCharts() {
    // Sparklines
    createSparkline('followersSparkline', [100, 120, 115, 134, 145, 160, 175, 182]);
    createSparkline('engagementSparkline', [3.2, 3.5, 3.8, 4.1, 4.3, 4.5, 4.7, 4.8]);
    createSparkline('reachSparkline', [180, 195, 210, 234, 250, 265, 275, 284]);
    createSparkline('postsSparkline', [15, 12, 18, 14, 16, 19, 17, 16]);

    // Growth Chart
    new Chart(document.getElementById('growthChart'), {
        type: 'line',
        data: {
            labels: ['1 Jan', '5 Jan', '10 Jan', '15 Jan', '20 Jan', '25 Jan', '30 Jan'],
            datasets: [{
                label: 'Seguidores',
                data: [11200, 11450, 11680, 11920, 12100, 12350, 12547],
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                }
            }
        }
    });

    // Engagement Pie
    new Chart(document.getElementById('engagementPieChart'), {
        type: 'doughnut',
        data: {
            labels: ['Curtidas', 'Comentários', 'Compartilhamentos'],
            datasets: [{
                data: [68, 22, 10],
                backgroundColor: ['#2196F3', '#4CAF50', '#FF9800']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Heatmap (simplified as bar chart)
    new Chart(document.getElementById('heatmapChart'), {
        type: 'bar',
        data: {
            labels: ['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'],
            datasets: [{
                label: 'Engajamento Médio',
                data: [12, 8, 15, 45, 78, 92, 85, 56],
                backgroundColor: 'rgba(33, 150, 243, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                }
            }
        }
    });
}

function createSparkline(canvasId, data) {
    new Chart(document.getElementById(canvasId), {
        type: 'line',
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                data,
                borderColor: '#2196F3',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { display: false }
            }
        }
    });
}

function loadTopPosts() {
    const grid = document.getElementById('topPostsGrid');
    const posts = [
        { image: 'https://picsum.photos/400/400?random=1', likes: 1250, comments: 89 },
        { image: 'https://picsum.photos/400/400?random=2', likes: 1100, comments: 76 },
        { image: 'https://picsum.photos/400/400?random=3', likes: 980, comments: 65 },
        { image: 'https://picsum.photos/400/400?random=4', likes: 890, comments: 54 }
    ];

    grid.innerHTML = posts.map(post => `
    <div class="eio-post-card">
      <img src="${post.image}" alt="Post" class="eio-post-image">
      <div class="eio-post-overlay">
        <div class="eio-post-stats">
          <span class="eio-post-stat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11 3C9.34 3 8 4.34 8 6C8 4.34 6.66 3 5 3C3.34 3 2 4.34 2 6C2 9 8 13 8 13C8 13 14 9 14 6C14 4.34 12.66 3 11 3Z" fill="currentColor"/>
            </svg>
            ${post.likes}
          </span>
          <span class="eio-post-stat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 6C14 9.31 11.31 12 8 12C7 12 6 11.8 5 11.4L2 12L3 9C2 8 1 6.8 1 6C1 2.69 3.69 0 7 0C10.31 0 14 2.69 14 6Z" fill="currentColor"/>
            </svg>
            ${post.comments}
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.eio-nav-item[data-page]');
    const sections = document.querySelectorAll('.eio-content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');

            navItems.forEach(n => n.classList.remove('eio-nav-item-active'));
            sections.forEach(s => s.classList.remove('eio-content-active'));

            item.classList.add('eio-nav-item-active');
            document.querySelector(`[data-section="${page}"]`).classList.add('eio-content-active');

            // ✅ SCROLL AO TOPO: Garante que o conteúdo sempre apareça no início
            const pageContent = document.querySelector('.eio-page-content');
            if (pageContent) {
                pageContent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    });
}
