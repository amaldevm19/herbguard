// public/js/main.js
// Exposes window.HerbGuard for use by page-specific scripts

window.HerbGuard = window.HerbGuard || {};

// ── Live clock ────────────────────────────
const clockEl = document.getElementById('header-clock');

function updateClock() {
  if (!clockEl) return;
  clockEl.textContent = new Date().toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
updateClock();
setInterval(updateClock, 1000);

// ── Countdown ─────────────────────────────
// Page scripts call HerbGuard.startCountdown(callbackFn)
// callback fires when countdown hits zero

const countdownEl = document.getElementById('refresh-countdown');

window.HerbGuard.startCountdown = function(onZero) {
  let seconds = 30;
  if (countdownEl) countdownEl.textContent = seconds;

  return setInterval(() => {
    seconds--;
    if (countdownEl) countdownEl.textContent = seconds;
    if (seconds <= 0) {
      seconds = 30;
      if (countdownEl) countdownEl.textContent = seconds;
      onZero();
    }
  }, 1000);
};

// ── Connection status helper ──────────────
const statusDot  = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');

window.HerbGuard.setConnected = function(isConnected) {
  if (!statusDot || !statusText) return;
  if (isConnected) {
    statusDot.style.background         = '';
    statusText.textContent             = 'Live';
    statusDot.style.animationPlayState = 'running';
  } else {
    statusDot.style.background         = 'var(--amber)';
    statusText.textContent             = 'Reconnecting...';
    statusDot.style.animationPlayState = 'paused';
  }
};

// ── Theme toggle ──────────────────────────
const THEME_KEY = 'herbguard-theme';

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');

  // Update PWA theme color meta tag
  const metaTheme = document.getElementById('theme-color-meta');
  if (metaTheme) {
    metaTheme.content = theme === 'light' ? '#ffffff' : '#161b22';
  }
}

const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
applyTheme(savedTheme);

const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isLight  = document.body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    lucide.createIcons();
  });
}

// ── Mobile nav ────────────────────────────
const hamburgerBtn     = document.getElementById('hamburger-btn');
const mobileNav        = document.getElementById('mobile-nav');
const mobileNavOverlay = document.getElementById('mobile-nav-overlay');

function openMobileNav() {
  mobileNav.classList.add('open');
  mobileNavOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  mobileNav.classList.remove('open');
  mobileNavOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    isOpen ? closeMobileNav() : openMobileNav();
  });
}

if (mobileNavOverlay) {
  mobileNavOverlay.addEventListener('click', closeMobileNav);
}

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMobileNav();
});

// ── Service Worker registration ───────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[HerbGuard] SW registered:', reg.scope);

        // Check for updates every 60 seconds
        setInterval(() => reg.update(), 60000);

        // When new SW is waiting — notify user
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              showUpdateBanner();
            }
          });
        });
      })
      .catch(err => console.warn('[HerbGuard] SW registration failed:', err));
  });
}

// ── Update banner ─────────────────────────
function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.className = 'sw-update-banner';
  banner.innerHTML = `
    <span>
      <i data-lucide="refresh-cw"></i>
      A new version of HerbGuard is available
    </span>
    <button onclick="reloadApp()">Update Now</button>
  `;
  document.body.appendChild(banner);
  lucide.createIcons();
}

window.reloadApp = function() {
  navigator.serviceWorker.getRegistration()
    .then(reg => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
      }
      window.location.reload();
    });
};

// ── PWA Install prompt ────────────────────
let deferredPrompt = null;
const installBtn   = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install button in header
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[HerbGuard] PWA install outcome:', outcome);
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  console.log('[HerbGuard] PWA installed!');
  deferredPrompt = null;
  if (installBtn) installBtn.style.display = 'none';
});