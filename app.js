/* Peace of Mind® — app.js — V3 */

// ─ API backend ──────────────────────────────────────────────
// En production, remplacer l'URL ci-dessous par l'URL Railway/Render du backend + /api.
// Exemple : https://peaceofmind-backend-production.up.railway.app/api
const API_BASE_URL = window.POM_API_BASE_URL || 'http://localhost:3000/api';


// ─ Book loader ──────────────────────────────────────────────
const loader = document.getElementById('bookLoader');

if (loader) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('is-hidden');
    }, 2000);
  });
}


// ─ Mobile nav toggle ────────────────────────────────────────
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');

    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.textContent = isOpen ? 'Fermer' : 'Menu';
  });

  document.addEventListener('click', (event) => {
    if (!navToggle.contains(event.target) && !siteNav.contains(event.target)) {
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

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          const delta = y - lastY;

          if (y < 120) {
            header.style.transform = 'translateY(0)';
          } else if (delta > 8) {
            header.style.transform = 'translateY(-110%)';
          } else if (delta < -8) {
            header.style.transform = 'translateY(0)';
          }

          lastY = y;
          ticking = false;
        });

        ticking = true;
      }
    },
    { passive: true }
  );
}


// ─ Active nav link ──────────────────────────────────────────
const page = location.pathname.split('/').pop() || 'index.html';

document.querySelectorAll('.site-nav a').forEach((link) => {
  if (link.getAttribute('href') === page) {
    link.classList.add('is-active');
  }
});


// ─ Booking form — validation & envoi backend ────────────────
const bookingForm = document.getElementById('bookingForm');

if (bookingForm) {
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const result = document.getElementById('formResult');
    const requiredFields = bookingForm.querySelectorAll('[required]');
    let valid = true;

    requiredFields.forEach((field) => {
      field.style.outline = '';
      field.style.borderColor = '';

      if (field.type === 'checkbox' && !field.checked) {
        valid = false;
        field.style.outline = '2px solid #c8a07a';
      } else if (field.type !== 'checkbox' && !String(field.value || '').trim()) {
        valid = false;
        field.style.borderColor = '#c8a07a';
      }
    });

    if (!valid) {
      if (result) {
        result.textContent = 'Merci de compléter tous les champs obligatoires et de cocher les consentements.';
        result.style.color = '#9b5a3a';
      }
      return;
    }

    const formData = new FormData(bookingForm);
    const payload = Object.fromEntries(formData.entries());

    bookingForm.querySelectorAll('input[type="checkbox"]').forEach((field) => {
      payload[field.name || field.id] = field.checked;
    });

    try {
      if (result) {
        result.textContent = 'Transmission de votre demande...';
        result.style.color = 'var(--muted, #8f7f75)';
      }

      const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erreur API réservation : ${response.status}`);
      }

      if (result) {
        result.textContent = '✓ Votre demande de réservation a bien été transmise. Un email de confirmation vous sera envoyé sous peu.';
        result.style.color = 'var(--accent)';
      }

      bookingForm.querySelectorAll('input, select, textarea').forEach((field) => {
        field.style.outline = '';
        field.style.borderColor = '';
      });
    } catch (error) {
      console.error(error);

      if (result) {
        result.textContent = 'Une erreur est survenue. Vous pouvez nous écrire directement à peaceofmindinstitut@gmail.com.';
        result.style.color = '#9b5a3a';
      }
    }
  });
}


// ─ Contact form — envoi backend ─────────────────────────────
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const result = document.getElementById('contactResult');
    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      if (result) {
        result.textContent = 'Transmission de votre message...';
        result.style.color = 'var(--muted, #8f7f75)';
      }

      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erreur API contact : ${response.status}`);
      }

      if (result) {
        result.textContent = 'Votre message a bien été transmis. Nous vous répondrons sous 24h ouvrées.';
        result.style.color = 'var(--accent)';
      }

      contactForm.reset();
    } catch (error) {
      console.error(error);

      if (result) {
        result.textContent = 'Une erreur est survenue. Vous pouvez nous écrire directement à peaceofmindinstitut@gmail.com.';
        result.style.color = '#9b5a3a';
      }
    }
  });
}


// ─ Booking summary dynamique ────────────────────────────────
const serviceSelect = document.getElementById('service');
const dateInput = document.getElementById('date');
const slotSelect = document.getElementById('slot');

if (serviceSelect && dateInput && slotSelect) {
  const serviceNames = {
    'hair-growth': 'Hair Growth — 190 €',
    'pre-consultation': 'Pré-consultation — 50 €',
    'rituel-matiere': 'Soin matière & équilibre — 120 €'
  };

  const updateSummary = () => {
    const summaryService = document.getElementById('summaryService');
    const summaryDate = document.getElementById('summaryDate');
    const summarySlot = document.getElementById('summarySlot');

    if (summaryService) {
      summaryService.textContent = serviceNames[serviceSelect.value] || '—';
    }

    if (summaryDate) {
      summaryDate.textContent = dateInput.value
        ? new Date(`${dateInput.value}T00:00:00`).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        : '—';
    }

    if (summarySlot) {
      summarySlot.textContent = slotSelect.value || '—';
    }
  };

  serviceSelect.addEventListener('change', updateSummary);
  dateInput.addEventListener('change', updateSummary);
  slotSelect.addEventListener('change', updateSummary);

  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);

  const params = new URLSearchParams(window.location.search);

  if (params.get('service')) {
    serviceSelect.value = params.get('service');
    updateSummary();
  }
}

const API_BASE_URL = "https://peaceofmind-backend-production.up.railway.app/api";
