// theme.js
const Theme = {
  async init() {
    const saved = localStorage.getItem('fcc-theme') || 'dark';
    this.apply(saved, { skipSave: true });
    this._updateBtn();
    // FIX: previously the theme was written to Supabase's `profiles.theme`
    // on every change but never read back, so a second device always fell
    // back to its own local default instead of your saved preference. Pull
    // the cloud value once per load and let it win if it's different.
    try {
      const user = await Auth.getUser();
      if (user) {
        const { data } = await getSB().from('profiles').select('theme').eq('id', user.id).single();
        if (data?.theme && data.theme !== saved) {
          this.apply(data.theme, { skipSave: true });
        }
      }
    } catch (e) { /* no profile row yet, or offline — local theme stands */ }
  },
  apply(t, opts = {}) {
    document.body.classList.toggle('light', t === 'light');
    localStorage.setItem('fcc-theme', t);
    this._updateBtn();
    if (opts.skipSave) return;
    // Save to Supabase in background. FIX: was `.update()`, which silently
    // does nothing for a user who has no profiles row yet. `.upsert()`
    // creates it on first use.
    Auth.getUser().then(user => {
      if (user) getSB().from('profiles').upsert({ id: user.id, theme: t }, { onConflict: 'id' }).then(() => {});
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
