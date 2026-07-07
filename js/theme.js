// theme.js
// IMPORTANT: this file must be included as the very first thing in <head>,
// before the stylesheet link — this code runs synchronously and sets the
// class on <html> before the browser paints, so there's no flash of the
// wrong theme on load.
(function () {
  var saved = localStorage.getItem('ft-theme') || 'light';
  if (saved === 'dark') document.documentElement.classList.add('dark');
})();

const Theme = {
  current() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  },
  toggle() {
    const next = this.current() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ft-theme', next);
    // A full reload is simplest and most reliable here — it guarantees
    // everything repaints correctly, including already-rendered Chart.js
    // canvases (which don't otherwise pick up new CSS variable colors
    // without being redrawn).
    location.reload();
  }
};
