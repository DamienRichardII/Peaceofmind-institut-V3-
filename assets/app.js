/* ============================================================
   Peace of Mind® — app.js — V3
   DA premium · Mobile-first · Supabase-ready
   ============================================================ */

window.POM = window.POM || {};

// ── CART (dormant — no boutique) ──────────────────────────
window.POM.cart = {
  items: [],
  add: function() {},
  remove: function() {},
  update: function() {},
  total: function() { return 0; },
  count: function() { return 0; }
};

// ── MOBILE NAV TOGGLE ─────────────────────────────────────
(function initNav() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('siteNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function() {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.textContent = isOpen ? 'Fermer' : 'Menu';
  });

  // Mobile dropdown inside nav
  const ddTrigger = document.getElementById('navMenuTrigger');
  const ddMenu    = document.getElementById('navDropdownMenu');
  if (ddTrigger && ddMenu) {
    ddTrigger.addEventListener('click', function(e) {
      e.stopPropagation();
      const parent = ddTrigger.closest('.nav-dropdown');
      if (parent) parent.classList.toggle('is-open');
    });
  }

  // Close nav on outside click
  document.addEventListener('click', function(e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', false);
      toggle.textContent = 'Menu';
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', false);
      toggle.textContent = 'Menu';
    }
  });
})();

// ── HEADER SCROLL HIDE/SHOW ────────────────────────────────
(function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  let lastY = 0;
  window.addEventListener('scroll', function() {
    const y = window.scrollY;
    if (y > lastY && y > 120) {
      header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = '';
    }
    lastY = y;
  }, { passive: true });
})();

// ── FADE-UP INTERSECTION OBSERVER ─────────────────────────
(function initFadeUp() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  const obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function(el) { obs.observe(el); });
})();

// ── TOAST ─────────────────────────────────────────────────
window.POM.showToast = function(msg, duration) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('is-visible');
  setTimeout(function() { toast.classList.remove('is-visible'); }, duration || 3000);
};

// ── CONTACT FORM FEEDBACK ──────────────────────────────────
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const r = document.getElementById('contactResult');
    if (r) {
      r.textContent = 'Message envoyé. Réponse sous 24h ouvrées.';
      r.style.color = 'var(--accent)';
    }
    form.reset();
  });
})();
