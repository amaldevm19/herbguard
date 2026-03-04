// public/js/customer.js
// Handles visited plants history in localStorage

const VISITED_KEY = 'herbguard-visited';
const MAX_VISITED = 10;

// ── Save current plant to visited list ────
function saveVisited(potId, plantName, emoji) {
  let visited = getVisited();

  // Remove if already exists — will re-add at front
  visited = visited.filter(p => p.potId !== potId);

  // Add to front
  visited.unshift({ potId, plantName, emoji, visitedAt: Date.now() });

  // Keep max 10
  if (visited.length > MAX_VISITED) visited = visited.slice(0, MAX_VISITED);

  localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
}

function getVisited() {
  try {
    return JSON.parse(localStorage.getItem(VISITED_KEY) || '[]');
  } catch {
    return [];
  }
}

// ── Render visited bar ────────────────────
function renderVisitedBar(currentPotId) {
  const visited = getVisited().filter(p => p.potId !== currentPotId);
  const bar     = document.getElementById('visited-bar');
  const list    = document.getElementById('visited-list');
  if (!bar || !list || visited.length === 0) return;

  list.innerHTML = visited.map(p => `
    <a href="/p/${p.potId}" class="visited-chip">
      <span class="visited-chip-emoji">${p.emoji}</span>
      <span class="visited-chip-name">${p.plantName}</span>
    </a>
  `).join('');

  bar.style.display = 'block';
}

// ── Lightbox ──────────────────────────────
function openLightbox(src) {
  const lb  = document.getElementById('cp-lightbox');
  const img = document.getElementById('cp-lightbox-img');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('cp-lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Init ──────────────────────────────────
if (typeof CURRENT_POT !== 'undefined') {
  saveVisited(CURRENT_POT.potId, CURRENT_POT.plantName, CURRENT_POT.emoji);
  renderVisitedBar(CURRENT_POT.potId);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ── PWA ───────────────────────────────────
// Theme toggle
//const THEME_KEY    = 'herbguard-theme';
// const themeToggle  = document.getElementById('theme-toggle');

// function applyTheme(theme) {
//   document.body.classList.toggle('light-theme', theme === 'light');
//   const metaTheme = document.getElementById('theme-color-meta');
//   if (metaTheme) {
//     metaTheme.content = theme === 'light' ? '#ffffff' : '#161b22';
//   }
// }

// //const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
// applyTheme(savedTheme);

// if (themeToggle) {
//   themeToggle.addEventListener('click', () => {
//     const isLight  = document.body.classList.contains('light-theme');
//     const newTheme = isLight ? 'dark' : 'light';
//     applyTheme(newTheme);
//     localStorage.setItem(THEME_KEY, newTheme);
//     lucide.createIcons();
//   });
// }

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.warn('[HerbGuard] SW failed:', err));
  });
}

// Install prompt
//let deferredPrompt = null;
//const installBtn   = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'flex';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  if (installBtn) installBtn.style.display = 'none';
});