/*
═══════════════════════════════════════════════════════════
  E.I.O - PREMIUM LANDING PAGE INTERACTIONS
  Professional UI Logic & Animations
═══════════════════════════════════════════════════════════
*/

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navbar Scroll Effect
  const navbar = document.querySelector('.eio-navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 2. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    document.querySelectorAll('.eio-mobile-link, .eio-mobile-menu .eio-btn').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // 3. Smooth Scroll for Anchors
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80; // Navbar height
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = target.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // 4. Reveal Animations on Scroll
  const revealOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, revealOptions);

  // Initial classes for reveal
  const revealElements = document.querySelectorAll('.eio-card, .eio-solution-card, .eio-pricing-card, .eio-split-content, .eio-faq-item');
  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    revealObserver.observe(el);
  });

  // CSS class for visible state
  const revealStyle = document.createElement('style');
  revealStyle.textContent = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
  document.head.appendChild(revealStyle);

  // 5. Parallax for Gradient Orbs
  window.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.eio-gradient-orb');
    const x = (e.clientX - window.innerWidth / 2) / 50;
    const y = (e.clientY - window.innerHeight / 2) / 50;

    orbs.forEach((orb, index) => {
      const speed = (index + 1) * 0.5;
      orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
  });

  // 6. Stats Random Increment Simulation (Psychological Trigger)
  const stats = document.querySelectorAll('.eio-social-stat strong');
  stats.forEach(stat => {
    let val = stat.innerText;
    if (val.includes('+')) {
      // Animation for numbers
    }
  });

});
