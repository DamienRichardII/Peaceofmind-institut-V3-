/* Peace of Mind® — assets/intro.js — Intro overlay */

(function () {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  // Durée d'affichage de l'intro
  const DELAY = 1800;

  function hideIntro() {
    overlay.classList.add('is-hidden');
    overlay.style.pointerEvents = 'none';
  }

  // Masquer après DELAY ms une fois la page chargée
  if (document.readyState === 'complete') {
    setTimeout(hideIntro, DELAY);
  } else {
    window.addEventListener('load', () => {
      setTimeout(hideIntro, DELAY);
    });
  }

  // Fallback : masquer après 4s quoi qu'il arrive
  setTimeout(hideIntro, 4000);

  // Canvas grain animé
  const canvas = document.getElementById('introCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animFrame;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawGrain() {
    if (overlay.classList.contains('is-hidden')) {
      cancelAnimationFrame(animFrame);
      return;
    }
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 180 + 60;
      data[i]     = v;
      data[i + 1] = v - 10;
      data[i + 2] = v - 20;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    animFrame = requestAnimationFrame(drawGrain);
  }

  resize();
  window.addEventListener('resize', resize);
  drawGrain();
})();
