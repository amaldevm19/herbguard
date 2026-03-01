// ── Live clock ────────────────────────────
const clockEl = document.getElementById('header-clock');

function updateClock(){
    if (!clockEl) return;
    clockEl.textContent = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

updateClock();
setInterval(updateClock, 1000);

// ── Refresh countdown ─────────────────────
const countdownEl = document.getElementById('refresh-countdown');
let countdown = 30;

setInterval(() => {
  countdown--;
  if (countdownEl) countdownEl.textContent = countdown;
  if (countdown <= 0) countdown = 30;
}, 1000);

// ── Theme toggle ──────────────────────────
const THEME_KEY = 'herbguard-theme';

// Apply saved theme immediately on load
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

// Load saved preference — default is dark
const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
applyTheme(savedTheme);

// Toggle on button click
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    // Re-render Lucide icons after toggle
    lucide.createIcons();
  });
}