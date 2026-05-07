(() => {
  const up = document.querySelector('[data-scroll="up"]');
  const down = document.querySelector('[data-scroll="down"]');
  if (!up || !down) return;

  const doc = document.documentElement;

  const update = () => {
    const y = window.scrollY || doc.scrollTop || 0;
    const max = (doc.scrollHeight - window.innerHeight);
    up.classList.toggle('is-disabled', y <= 8);
    down.classList.toggle('is-disabled', y >= max - 8);
  };

  up.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  down.addEventListener('click', () => window.scrollTo({ top: doc.scrollHeight, behavior: 'smooth' }));

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();