/*
═══════════════════════════════════════════════════════════
  E.I.O - LANDING PAGE INTERACTIONS
  Animações e Interatividade Premium
═══════════════════════════════════════════════════════════
*/

// Intersection Observer para animações ao scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('eio-animate-fade-in');
    }
  });
}, observerOptions);

// Observar elementos que devem animar
document.addEventListener('DOMContentLoaded', () => {
  // Animar cards ao scroll
  const cards = document.querySelectorAll('.eio-feature-card, .eio-step-card, .eio-pricing-card');
  cards.forEach(card => observer.observe(card));

  // Smooth scroll para links de navegação
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Navbar transparente ao topo
  const navbar = document.querySelector('.eio-navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
      navbar.style.background = 'rgba(10, 10, 15, 0.8)';
    } else {
      navbar.style.background = 'rgba(10, 10, 15, 0.95)';
    }

    lastScroll = currentScroll;
  });

  // Parallax effect nos gradient orbs
  window.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.eio-gradient-orb');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;

    orbs.forEach((orb, index) => {
      const speed = (index + 1) * 20;
      const x = (mouseX - 0.5) * speed;
      const y = (mouseY - 0.5) * speed;

      orb.style.transform = `translate(${x}px, ${y}px)`;
    });
  });

  // Adicionar shimmer effect nos botões
  const buttons = document.querySelectorAll('.eio-btn-primary, .eio-btn-secondary, .eio-btn-accent');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', function (e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        pointer-events: none;
        animation: eio-ripple 0.6s ease-out;
      `;

      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  });

  // Stats counter animation
  animateStats();
});



// Animar contadores de estatísticas
function animateStats() {
  const stats = document.querySelectorAll('.eio-stat-value');

  const observerStats = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const text = target.textContent;
        const isNumber = /\d/.test(text);

        if (isNumber) {
          animateValue(target, 0, text, 2000);
        }

        observerStats.unobserve(target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(stat => observerStats.observe(stat));
}

function animateValue(element, start, end, duration) {
  const endValue = parseFloat(end.replace(/[^0-9.]/g, ''));
  const suffix = end.replace(/[0-9.]/g, '');
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const current = start + (endValue - start) * easeOutQuart(progress);
    element.textContent = formatNumber(current) + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1);
  } else if (num >= 1000) {
    return Math.round(num / 1000);
  }
  return Math.round(num);
}

function easeOutQuart(x) {
  return 1 - Math.pow(1 - x, 4);
}

// Adicionar animação CSS para ripple
const style = document.createElement('style');
style.textContent = `
  @keyframes eio-ripple {
    to {
      width: 200px;
      height: 200px;
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Adicionar cursor customizado nos botões principais
document.querySelectorAll('.eio-btn-primary, .eio-btn-secondary').forEach(btn => {
  btn.style.cursor = 'pointer';
});
