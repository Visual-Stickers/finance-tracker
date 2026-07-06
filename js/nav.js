// nav.js — injects sidebar + topbar into every page

function buildLayout(pageTitle) {
  const nav = [
    { icon: 'fa-gauge-high',    label: 'Dashboard',    href: 'index.html' },
    { icon: 'fa-arrow-down',    label: 'Income',       href: 'income.html' },
    { icon: 'fa-arrow-up',      label: 'Expenses',     href: 'expenses.html' },
    { icon: 'fa-landmark',      label: 'Loans',        href: 'loans.html' },
    { icon: 'fa-credit-card',   label: 'Credit Cards', href: 'cards.html' },
    { icon: 'fa-chart-pie',     label: 'Reports',      href: 'reports.html' },
  ];

  const page = location.pathname.split('/').pop() || 'index.html';

  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon"><i class="fa-solid fa-indian-rupee-sign"></i></div>
        <div>
          <div class="brand-name">Finance Tracker</div>
          <div class="brand-version">Personal</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Menu</div>
        ${nav.map(n => `
          <a class="nav-item ${n.href === page ? 'active' : ''}" href="${n.href}">
            <i class="fa-solid ${n.icon}"></i> ${n.label}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">Prem's Finance Tracker</div>
    </aside>`;

  const topbarHTML = `
    <div class="topbar">
      <button class="menu-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">
        <i class="fa-solid fa-bars"></i>
      </button>
      <div class="topbar-title">${pageTitle}</div>
      <div class="topbar-date" id="topDate"></div>
    </div>`;

  // Wrap existing body content
  const originalContent = document.body.innerHTML;
  document.body.innerHTML = `
    <div class="layout">
      ${sidebarHTML}
      <div class="main">
        ${topbarHTML}
        <div class="page-content">${originalContent}</div>
      </div>
    </div>
    <div id="_toast" class="toast"></div>`;

  document.getElementById('topDate').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}
