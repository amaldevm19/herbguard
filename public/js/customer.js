// // public/js/customer.js
// // Handles visited plants history in localStorage

// const VISITED_KEY = 'herbguard-visited';
// const MAX_VISITED = 10;

// // ── Save current plant to visited list ────
// function saveVisited(potId, plantName, emoji) {
//   let visited = getVisited();

//   // Remove if already exists — will re-add at front
//   visited = visited.filter(p => p.potId !== potId);

//   // Add to front
//   visited.unshift({ potId, plantName, emoji, visitedAt: Date.now() });

//   // Keep max 10
//   if (visited.length > MAX_VISITED) visited = visited.slice(0, MAX_VISITED);

//   localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
// }

// function getVisited() {
//   try {
//     return JSON.parse(localStorage.getItem(VISITED_KEY) || '[]');
//   } catch {
//     return [];
//   }
// }

// // ── Render visited bar ────────────────────
// function renderVisitedBar(currentPotId) {
//   const visited = getVisited().filter(p => p.potId !== currentPotId);
//   const bar     = document.getElementById('visited-bar');
//   const list    = document.getElementById('visited-list');
//   if (!bar || !list || visited.length === 0) return;

//   list.innerHTML = visited.map(p => `
//     <a href="/p/${p.potId}" class="visited-chip">
//       <span class="visited-chip-emoji">${p.emoji}</span>
//       <span class="visited-chip-name">${p.plantName}</span>
//     </a>
//   `).join('');

//   bar.style.display = 'block';
// }

// // ── Lightbox ──────────────────────────────
// function openLightbox(src) {
//   const lb  = document.getElementById('cp-lightbox');
//   const img = document.getElementById('cp-lightbox-img');
//   if (!lb || !img) return;
//   img.src = src;
//   lb.classList.add('open');
//   document.body.style.overflow = 'hidden';
// }

// function closeLightbox() {
//   const lb = document.getElementById('cp-lightbox');
//   if (lb) lb.classList.remove('open');
//   document.body.style.overflow = '';
// }

// // ── Init ──────────────────────────────────
// if (typeof CURRENT_POT !== 'undefined') {
//   saveVisited(CURRENT_POT.potId, CURRENT_POT.plantName, CURRENT_POT.emoji);
//   renderVisitedBar(CURRENT_POT.potId);
// }

// document.addEventListener('keydown', e => {
//   if (e.key === 'Escape') closeLightbox();
// });

// // ── PWA Service Worker ────────────────────
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//       .then(reg => console.log('[HerbGuard] SW registered'))
//       .catch(err => console.warn('[HerbGuard] SW failed:', err));
//   });
// }

// // ── Install prompt ────────────────────────
// //let deferredPrompt;
// //const installBtn = document.getElementById('pwa-install-btn');

// window.addEventListener('beforeinstallprompt', (e) => {
//   e.preventDefault();
//   deferredPrompt = e;
//   if (installBtn) installBtn.style.display = 'flex';
// });

// if (installBtn) {
//   installBtn.addEventListener('click', async () => {
//     if (!deferredPrompt) return;
//     deferredPrompt.prompt();
//     const { outcome } = await deferredPrompt.userChoice;
//     console.log('[HerbGuard] PWA install outcome:', outcome);
//     deferredPrompt = null;
//     installBtn.style.display = 'none';
//   });
// }

// window.addEventListener('appinstalled', () => {
//   console.log('[HerbGuard] PWA installed!');
//   deferredPrompt = null;
//   if (installBtn) installBtn.style.display = 'none';
// });


// public/js/customer.js
// Theme, PWA install, and SW handled by main.js

const VISITED_KEY = 'herbguard-visited';
const MAX_VISITED = 10;

// ── Visited plants ────────────────────────
function saveVisited(potId, plantName, emoji) {
  let visited = getVisited();
  visited = visited.filter(p => p.potId !== potId);
  visited.unshift({ potId, plantName, emoji, visitedAt: Date.now() });
  if (visited.length > MAX_VISITED) visited = visited.slice(0, MAX_VISITED);
  localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
}

function getVisited() {
  try {
    return JSON.parse(localStorage.getItem(VISITED_KEY) || '[]');
  } catch { return []; }
}

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

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ── Init ──────────────────────────────────
if (typeof CURRENT_POT !== 'undefined') {
  saveVisited(CURRENT_POT.potId, CURRENT_POT.plantName, CURRENT_POT.emoji);
  renderVisitedBar(CURRENT_POT.potId);
}

// ── Customer history table ────────────────
function buildCpTable() {

  const tbody = document.getElementById('cp-history-tbody');
  if (!tbody || !CP_HISTORY || !CP_HISTORY.length) return;

  const rows = CP_HISTORY.slice(0, 15);
  tbody.innerHTML = rows.map(row => {
    const d = new Date(row._time);
    const timeLabel = d.toLocaleString('en-US', {
      month:  'short',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `<tr>
      <td class="mono muted">${timeLabel}</td>
      <td class="mono" style="color:#58a6ff">${row.moisture.toFixed(0)}%</td>
      <td class="mono" style="color:#e3b341">${row.air_temp.toFixed(1)}°C</td>
      <td class="mono" style="color:#39d353">${row.humidity.toFixed(0)}%</td>
      <td class="mono" style="color:#bc8cff">${row.ph.toFixed(1)}</td>
      <td class="mono muted">${Math.round(row.light).toLocaleString()} lux</td>
    </tr>`;
  }).join('');
}

buildCpTable();
