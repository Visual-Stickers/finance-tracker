// theme.js
const Theme = {
  init() {
    const saved = localStorage.getItem('fcc-theme') || 'dark';
    this.apply(saved);
    this._updateBtn();
  },
  apply(t) {
    document.body.classList.toggle('light', t === 'light');
    localStorage.setItem('fcc-theme', t);
    this._updateBtn();
    // Save to Supabase in background
    Auth.getUser().then(user => {
      if (user) getSB().from('profiles').update({ theme: t }).eq('id', user.id).then(() => {});
    }).catch(() => {});
  },
  current() { return document.body.classList.contains('light') ? 'light' : 'dark'; },
  toggle()   { this.apply(this.current() === 'dark' ? 'light' : 'dark'); },
  _updateBtn() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isDark = this.current() === 'dark';
    btn.innerHTML = isDark ? '<i class="fa fa-sun"></i>' : '<i class="fa fa-moon"></i>';
    btn.title = isDark ? 'Switch to Light' : 'Switch to Dark';
  }
};
