/* ── Shared utilities for KINETIC ─────────────────────────────────── */

export const API = '';
export const AGENT = '';

export async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export function $(sel) { return document.querySelector(sel); }
export function $$(sel) { return document.querySelectorAll(sel); }
export function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }
export function setHtml(sel, html) { const el = $(sel); if (el) el.innerHTML = html; }

/* ── Notification toast ──────────────────────────────────────────── */
export function toast(msg, type = 'info') {
  const existing = document.getElementById('kinetic-toast');
  if (existing) existing.remove();

  const colors = {
    info: 'border-cyan-500/40 bg-cyan-950/90 text-cyan-200',
    success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200',
    error: 'border-red-500/40 bg-red-950/90 text-red-200',
  };

  const el = document.createElement('div');
  el.id = 'kinetic-toast';
  el.className = `fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl border backdrop-blur-lg text-sm font-medium shadow-2xl transition-all duration-500 ${colors[type] || colors.info}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 4000);
}

/* ── Render the shared navbar ────────────────────────────────────── */
export function renderNav(activePage = '') {
  const pages = [
    { href: '/', label: 'Hub', id: 'home' },
    { href: '/explore.html', label: 'Explore GPUs', id: 'explore' },
    { href: '/submit.html', label: 'Submit Job', id: 'submit' },
    { href: '/jobs.html', label: 'My Jobs', id: 'jobs' },
    { href: '/dashboard.html', label: 'Dashboard', id: 'dashboard' },
    { href: '/provide.html', label: 'Provide', id: 'provide' },
    { href: '/activity.html', label: 'Activity', id: 'activity' },
  ];

  const navLinks = pages.map(p => {
    const isActive = p.id === activePage;
    const cls = isActive
      ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-1'
      : 'text-slate-400 hover:text-cyan-200 transition-colors';
    return `<a class="${cls}" href="${p.href}">${p.label}</a>`;
  }).join('');

  return `
  <header class="kinetic-nav w-full top-0 sticky z-50 border-b border-white/5" style="background:rgba(11,13,16,0.92);backdrop-filter:blur(16px)">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-10">
        <a href="/" class="text-2xl font-black italic tracking-tight text-cyan-400" style="font-family:'Space Grotesk',sans-serif">KINETIC</a>
        <nav class="hidden md:flex items-center gap-7 text-sm font-medium" style="font-family:'Space Grotesk',sans-serif">
          ${navLinks}
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <span class="hidden sm:inline text-[10px] tracking-widest uppercase text-slate-500 font-mono border border-slate-700/50 px-3 py-1 rounded-full">Algorand TestNet</span>
        <button id="connectWalletBtn" class="bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 px-5 py-2 rounded-lg font-semibold text-sm hover:brightness-110 transition-all">
          Connect Wallet
        </button>
      </div>
    </div>
  </header>`;
}

/* ── Render footer ───────────────────────────────────────────────── */
export function renderFooter() {
  return `
  <footer class="w-full py-6 border-t border-white/5 mt-auto" style="background:#08090b">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-6">
        <span class="font-bold text-cyan-400 text-sm tracking-tight" style="font-family:'Space Grotesk',sans-serif">KINETIC</span>
        <p class="text-[10px] uppercase tracking-widest text-slate-600">&copy; 2026 Kinetic Marketplace &middot; Powered by Algorand</p>
      </div>
      <div class="flex gap-6 text-[10px] uppercase tracking-widest text-slate-600">
        <a class="hover:text-cyan-300 transition-colors" href="https://github.com/Shivanikinagi/KINETIC" target="_blank">GitHub</a>
        <a class="hover:text-cyan-300 transition-colors" href="/docs">Docs</a>
      </div>
    </div>
  </footer>`;
}
