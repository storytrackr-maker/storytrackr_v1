/* StoryTrackr Marketing Site JS */
(function () {
  'use strict';

  // ── Mobile nav toggle ────────────────────────────────────────
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks  = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    // Close nav when link clicked
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // ── Active nav link ──────────────────────────────────────────
  const normalizePath = path => {
    if (!path) return '/';
    let out = path.replace(/\/$/, '') || '/';
    if (out.endsWith('/index.html')) out = out.slice(0, -11) || '/';
    if (out.endsWith('.html')) out = out.slice(0, -5) || '/';
    return out;
  };
  const currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = normalizePath(a.getAttribute('href'));
    if (href === currentPath) a.classList.add('active');
  });

  // ── Try Demo button ──────────────────────────────────────────
  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      btn.classList.add('loading');
      btn.textContent = 'Starting demo';

      try {
        const res  = await fetch('https://app.storytrackr.app/api/demo-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();

        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          alert('Could not start demo. Please try again.');
          btn.classList.remove('loading');
          btn.textContent = 'Try Demo';
        }
      } catch (err) {
        alert('Could not connect. Please try again.');
        btn.classList.remove('loading');
        btn.textContent = 'Try Demo';
      }
    });
  });

  // ── FAQ accordion ────────────────────────────────────────────
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const answer = q.nextElementSibling;
      const isOpen = answer.classList.contains('open');
      document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
      if (!isOpen) answer.classList.add('open');
    });
  });
})();
