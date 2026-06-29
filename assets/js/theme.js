// theme.js - Dark / Light mode manager

const Theme = (() => {

  async function init() {
    // Apply cached theme instantly to avoid flash
    const cached = localStorage.getItem('fcc-theme') || 'dark';
    apply(cached);
    updateIcon();
    // Sync from Supabase in background
    try {
      const settings = await Storage.getSettings();
      if (settings && settings.theme && settings.theme !== cached) {
        apply(settings.theme);
        localStorage.setItem('fcc-theme', settings.theme);
        updateIcon();
      }
    } catch(e) {}
  }

  function apply(theme) {
    document.body.classList.toggle('light-mode', theme === 'light');
  }

  function current() {
    return document.body.classList.contains('light-mode') ? 'light' : 'dark';
  }

  async function toggle() {
    const next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    updateIcon();
    localStorage.setItem('fcc-theme', next);
    try { await Storage.saveSettings({ theme: next, currency: '₹' }); } catch(e) {}
  }

  function updateIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.innerHTML = current() === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    btn.title = current() === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }

  return { init, toggle, current, apply, updateIcon };
})();
