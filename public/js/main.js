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