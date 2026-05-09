// App entry. Wires:
//   - hash router
//   - sidebar nav (rendered from the route table)
//   - mobile bottom-nav with section-sheet
//   - theme toggle (light / dark)
//   - Cmd-K / Ctrl-K global search
//   - sub-page registration for every page
//
// The route table here is the single source of truth for what shows up in the
// sidebar and mobile nav. Add a route module → import it → push into NAV.

import { startRouter, registerRoute, onNavigate, navigate } from './core/router.js';
import { $, $$ } from './core/ui.js';
import { getTheme, setTheme, markVisited } from './core/storage.js';
import { initSearch, openSearch } from './core/search.js';

// ─── Pages ──────────────────────────────────────────
import * as homePage from './pages/study/home.js';

// Foundations (Phase 1: Days 1–5)
import * as fnd1 from './pages/foundations/day1.js';
import * as fnd2 from './pages/foundations/day2.js';
import * as fnd3 from './pages/foundations/day3.js';
import * as fnd4 from './pages/foundations/day4.js';
import * as fnd5 from './pages/foundations/day5.js';

// Tickets (Phase 2: Days 6–14)
import * as t1 from './pages/tickets/t1.js';
import * as t2 from './pages/tickets/t2.js';
import * as t3 from './pages/tickets/t3.js';
import * as t4 from './pages/tickets/t4.js';
import * as t5 from './pages/tickets/t5.js';
import * as t6 from './pages/tickets/t6.js';
import * as t7 from './pages/tickets/t7.js';
import * as t8 from './pages/tickets/t8.js';
import * as t9 from './pages/tickets/t9.js';

// Reference
import * as wikiPage      from './pages/reference/wiki.js';
import * as decisionsPage from './pages/reference/decisions.js';
import * as vaultPage     from './pages/reference/vault.js';
import * as quickrefPage  from './pages/reference/quickref.js';

// Lab Bench (kept simulators with real eval logic — used inside ticket steps)
import * as scpSim      from './pages/practice/scp.js';
import * as kqlSim      from './pages/practice/kql.js';
import * as azpolicySim from './pages/practice/azpolicy.js';

// ─── Navigation table (source of truth) ─────────────
const NAV = [
  {
    section: 'Home', icon: '🏠', cloud: 'home',
    items: [
      { route: '/study/home', label: 'Dashboard', icon: '🏠', mod: homePage, cloud: 'home' },
    ],
  },
  {
    section: 'Foundations', icon: '📚', cloud: 'home',
    items: [
      { route: '/foundations/1', label: 'Day 1 · Org structure',           icon: '🌳', mod: fnd1, cloud: 'home' },
      { route: '/foundations/2', label: 'Day 2 · Guardrails',              icon: '🚧', mod: fnd2, cloud: 'home' },
      { route: '/foundations/3', label: 'Day 3 · Detection',               icon: '🔍', mod: fnd3, cloud: 'home' },
      { route: '/foundations/4', label: 'Day 4 · Landing Zone',            icon: '🛬', mod: fnd4, cloud: 'home' },
      { route: '/foundations/5', label: 'Day 5 · Terraform',               icon: '🌍', mod: fnd5, cloud: 'tf'   },
    ],
  },
  {
    section: 'Tickets', icon: '🎫', cloud: 'both',
    items: [
      { route: '/tickets/t1', label: 'T1 · IAM user blocked',              icon: '🏛️', mod: t1, cloud: 'aws' },
      { route: '/tickets/t2', label: 'T2 · Custom Config rule',            icon: '⚙️', mod: t2, cloud: 'aws' },
      { route: '/tickets/t3', label: 'T3 · Verify CT controls',            icon: '🏗️', mod: t3, cloud: 'aws' },
      { route: '/tickets/t4', label: 'T4 · Policy exemption',              icon: '📋', mod: t4, cloud: 'azure' },
      { route: '/tickets/t5', label: 'T5 · Defender triage',               icon: '🛡️', mod: t5, cloud: 'azure' },
      { route: '/tickets/t6', label: 'T6 · PowerShell Runbook',            icon: '⚡', mod: t6, cloud: 'azure' },
      { route: '/tickets/t7', label: 'T7 · KQL audit query',               icon: '🔍', mod: t7, cloud: 'azure' },
      { route: '/tickets/t8', label: 'T8 · Drift via Terraform',           icon: '🌍', mod: t8, cloud: 'tf' },
      { route: '/tickets/t9', label: 'T9 · Audit evidence',                icon: '📑', mod: t9, cloud: 'both' },
    ],
  },
  {
    section: 'Reference', icon: '📎', cloud: 'home',
    items: [
      { route: '/reference/wiki',          label: 'Wiki (mapping + glossary)', icon: '📖', mod: wikiPage,        cloud: 'home' },
      { route: '/reference/decisions',     label: 'Decision trees',            icon: '🌳', mod: decisionsPage,   cloud: 'home' },
      { route: '/reference/vault',         label: 'Snippet Vault',             icon: '💼', mod: vaultPage,       cloud: 'home' },
      { route: '/reference/quickref',      label: 'Quick Reference',           icon: '⚡', mod: quickrefPage,     cloud: 'both' },
    ],
  },
  {
    section: 'Lab Bench', icon: '🧪', cloud: 'both',
    items: [
      { route: '/practice/scp',          label: 'SCP + IAM evaluator', icon: '🏛️', mod: scpSim,      cloud: 'aws' },
      { route: '/practice/kql',          label: 'KQL playground',      icon: '🔍', mod: kqlSim,      cloud: 'azure' },
      { route: '/practice/azure-policy', label: 'Azure Policy effect', icon: '📋', mod: azpolicySim, cloud: 'azure' },
    ],
  },
];

// Register every route with the router
NAV.forEach(section => {
  section.items.forEach(item => {
    registerRoute(item.route, item.mod);
  });
});

// ─── Sidebar render ─────────────────────────────────
function renderSidebar() {
  const nav = $('#sb-nav');
  if (!nav) return;
  nav.innerHTML = NAV.map(section => `
    <div class="sb-section">${section.icon} ${section.section}</div>
    ${section.items.map(item => `
      <button class="snb" data-route="${item.route}" data-cloud="${item.cloud}">
        <span class="ni">${item.icon}</span>
        <span class="lbl">${item.label}</span>
      </button>
    `).join('')}
  `).join('<div class="sb-sep"></div>');

  nav.addEventListener('click', e => {
    const btn = e.target.closest('.snb');
    if (!btn) return;
    navigate(btn.dataset.route);
  });
}

function highlightSidebar(path) {
  $$('.snb').forEach(btn => {
    btn.className = 'snb';
    if (btn.dataset.route === path) {
      btn.classList.add('active-' + (btn.dataset.cloud || 'home'));
    }
  });
}

// ─── Mobile bottom-nav ──────────────────────────────
function renderMobileNav() {
  const nav = $('#mobile-nav');
  if (!nav) return;
  nav.innerHTML = NAV.map((section, i) => `
    <button class="mn-tab" data-section="${i}">
      <span class="mn-icon">${section.icon}</span>
      <span class="mn-label">${section.section}</span>
    </button>
  `).join('');
  nav.addEventListener('click', e => {
    const btn = e.target.closest('.mn-tab');
    if (!btn) return;
    openSheet(parseInt(btn.dataset.section, 10));
  });
}

function openSheet(idx) {
  const sheet = $('#mn-sheet');
  const section = NAV[idx];
  if (!section || !sheet) return;
  sheet.innerHTML = section.items.map(item => `
    <button class="snb" data-route="${item.route}" data-cloud="${item.cloud}">
      <span class="ni">${item.icon}</span>
      <span class="lbl">${item.label}</span>
    </button>
  `).join('');
  sheet.classList.add('open');
  sheet.onclick = e => {
    const b = e.target.closest('.snb');
    if (!b) return;
    navigate(b.dataset.route);
    sheet.classList.remove('open');
  };
}

function highlightMobileTab(path) {
  $$('.mn-tab').forEach((tab, idx) => {
    tab.className = 'mn-tab';
    const section = NAV[idx];
    if (section && section.items.some(it => it.route === path)) {
      const item = section.items.find(it => it.route === path);
      tab.classList.add('active');
      if (item) tab.classList.add('t-' + item.cloud);
    }
  });
}

// ─── Theme toggle ───────────────────────────────────
function applyTheme(t) {
  if (t === 'dark' || t === 'light') {
    document.documentElement.setAttribute('data-theme', t);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function currentEffectiveTheme() {
  const stored = getTheme();
  if (stored) return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleTheme() {
  const next = currentEffectiveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  applyTheme(next);
  updateThemeButton();
}

function updateThemeButton() {
  const btn = $('#theme-btn');
  if (!btn) return;
  const t = currentEffectiveTheme();
  btn.innerHTML = t === 'dark' ? '☀️ Light' : '🌙 Dark';
}

onNavigate((path) => {
  highlightSidebar(path);
  highlightMobileTab(path);
  markVisited(path);
});

// ─── Bootstrap ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply persisted theme before first paint
  const stored = getTheme();
  if (stored) applyTheme(stored);

  renderSidebar();
  renderMobileNav();
  updateThemeButton();

  $('#theme-btn')?.addEventListener('click', toggleTheme);
  $('#cmdk-btn')?.addEventListener('click', () => openSearch());

  // Cmd-K / Ctrl-K opens search
  window.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  initSearch(NAV);

  startRouter($('#app-root'));
});
