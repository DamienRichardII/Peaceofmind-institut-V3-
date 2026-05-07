/* Peace of Mind® — app.js — V3 */

// ─ Book loader ──────────────────────────────────────────────
const loader = document.getElementById('bookLoader');
if (loader) {
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('is-hidden'), 2000);
  });
}

// ─ Mobile nav toggle ────────────────────────────────────────
const navToggle = document.querySelector('.nav-toggle');
const siteNav   = document.querySelector('.site-nav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.textContent = isOpen ? 'Fermer' : 'Menu';
  });
  document.addEventListener('click', e => {
    if (\!navToggle.contains(e.target) && \!siteNav.contains(e.target)) {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.textContent = 'Menu';
    }
  });
}

// ─ Header — masquer au scroll bas, révéler au scroll haut ───
const header = document.querySelector('.site-header');
if (header) {
  let lastY = 0;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (\!ticking) {
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 120) {
          header.style.transform = 'translateY(0)';      // toujours visible en haut
        } else if (delta > 8) {
          header.style.transform = 'translateY(-110%)';  // masquer en descendant
        } else if (delta < -8) {
          header.style.transform = 'translateY(0)';      // révéler en remontant
        }
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ─ Active nav link ──────────────────────────────────────────
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-nav a').forEach(a => {
  if (a.getAttribute('href') === page) a.classList.add('is-active');
});

// ─ Booking form — validation & feedback ─────────────────────
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', e => {
    e.preventDefault();
    const result = document.getElementById('formResult');
    const required = bookingForm.querySelectorAll('[required]');
    let valid = true;

    required.forEach(field => {
      field.style.outline = '';
      field.style.borderColor = '';
      if (field.type === 'checkbox' && \!field.checked) {
        valid = false;
        field.style.outline = '2px solid #c8a07a';   // fix: pas de ; parasite
      } else if (field.type \!== 'checkbox' && \!field.value.trim()) {
        valid = false;
        field.style.borderColor = '#c8a07a';
      }
    });

    if (\!valid) {
      result.textContent = 'Merci de compléter tous les champs obligatoires et de cocher les consentements.';
      result.style.color = '#9b5a3a';
    } else {
      result.textContent = '✓ Votre demande de réservation a bien été enregistrée. Un email de confirmation vous sera envoyé sous peu.';
      result.style.color = 'var(--accent)';
      bookingForm.querySelectorAll('input, select, textarea').forEach(f => {
        f.style.outline = ''; f.style.borderColor = '';
      });
    }
  });
}

// ─ Contact form — feedback ───────────────────────────────────
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const result = document.getElementById('contactResult');
    result.textContent = 'Votre message a bien été envoyé. Nous vous répondrons sous 24h ouvrées.';
    result.style.color = 'var(--accent)';
    contactForm.reset();
  });
}

// ─ Booking summary dynamique ─────────────────────────────────
const serviceSelect = document.getElementById('service');
const dateInput     = document.getElementById('date');
const slotSelect    = document.getElementById('slot');
if (serviceSelect && dateInput && slotSelect) {
  const serviceNames = {
    'hair-growth':      'Hair Growth — 190 €',
    'pre-consultation': 'Pré-consultation — 50 €',
    'rituel-matiere':   'Soin matière & équilibre — 120 €'
  };
  const updateSummary = () => {
    const s = document.getElementById('summaryService');
    const d = document.getElementById('summaryDate');
    const sl = document.getElementById('summarySlot');
    if (s)  s.textContent  = serviceNames[serviceSelect.value] || '—';
    if (d)  d.textContent  = dateInput.value
      ? new Date(dateInput.value + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    if (sl) sl.textContent = slotSelect.value || '—';
  };
  serviceSelect.addEventListener('change', updateSummary);
  dateInput.addEventListener('change', updateSummary);
  slotSelect.addEventListener('change', updateSummary);

  // Date minimum = aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);

  // Pré-remplir depuis URL ?service=
  const params = new URLSearchParams(window.location.search);
  if (params.get('service')) {
    serviceSelect.value = params.get('service');
    updateSummary();
  }
}
