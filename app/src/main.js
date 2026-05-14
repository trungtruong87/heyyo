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

// Foundations — topic-grouped pages (see data/foundations.js)
import * as fndOrg              from './pages/foundations/org-structure.js';
import * as fndAwsScp           from './pages/foundations/aws-scp.js';
import * as fndAwsConfig        from './pages/foundations/aws-config.js';
import * as fndAwsCT            from './pages/foundations/aws-control-tower.js';
import * as fndAzurePolicy      from './pages/foundations/azure-policy.js';
import * as fndAzureAnatomy     from './pages/foundations/azure-policy-anatomy.js';
import * as fndAzureMcsb        from './pages/foundations/azure-mcsb.js';
import * as fndAzureRunbooks    from './pages/foundations/azure-runbooks.js';
import * as fndKql              from './pages/foundations/kql.js';
import * as fndResourceGraph    from './pages/foundations/resource-graph.js';
import * as fndDefenderCloud    from './pages/foundations/defender-cloud.js';
import * as fndDefenderEndpoint from './pages/foundations/defender-endpoint.js';
import * as fndTerraform        from './pages/foundations/terraform.js';

// Tickets
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
import * as wikiPage       from './pages/reference/wiki.js';
import * as decisionsPage  from './pages/reference/decisions.js';
import * as vaultPage      from './pages/reference/vault.js';
import * as quickrefPage   from './pages/reference/quickref.js';
import * as cheatsheetPage from './pages/reference/cheatsheet.js';
import * as readingListPage from './pages/reference/readinglist.js';
import * as artifactMapPage from './pages/reference/artifactmap.js';

// Lab Bench (kept simulators with real eval logic — used inside ticket steps)
import * as scpSim      from './pages/practice/scp.js';
import * as kqlSim      from './pages/practice/kql.js';
import * as azpolicySim from './pages/practice/azpolicy.js';

// ─── Navigation table (source of truth) ─────────────
// Foundations items have a `group` field that drives the sub-header rendering
// in both the sidebar and the mobile sheet.
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
      // Orientation
      { route: '/foundations/org-structure',       label: 'Org structure & checkpoints',   icon: '🌳', mod: fndOrg,              cloud: 'home',  group: 'Orientation' },
      // AWS Governance
      { route: '/foundations/aws-scp',             label: 'SCPs',                          icon: '🏛️', mod: fndAwsScp,           cloud: 'aws',   group: 'AWS Governance' },
      { route: '/foundations/aws-config',          label: 'Config & Config Rules',         icon: '🔍', mod: fndAwsConfig,        cloud: 'aws',   group: 'AWS Governance' },
      { route: '/foundations/aws-control-tower',   label: 'Control Tower & Landing Zones', icon: '🛬', mod: fndAwsCT,            cloud: 'aws',   group: 'AWS Governance' },
      // Azure Governance
      { route: '/foundations/azure-policy',          label: 'Azure Policy',                  icon: '📋', mod: fndAzurePolicy,      cloud: 'azure', group: 'Azure Governance' },
      { route: '/foundations/azure-policy-anatomy',  label: 'Azure Policy: anatomy',         icon: '🧬', mod: fndAzureAnatomy,     cloud: 'azure', group: 'Azure Governance' },
      { route: '/foundations/azure-mcsb',            label: 'MCSB',                          icon: '🎯', mod: fndAzureMcsb,        cloud: 'azure', group: 'Azure Governance' },
      { route: '/foundations/azure-runbooks',        label: 'Automation Runbooks',           icon: '⚡', mod: fndAzureRunbooks,    cloud: 'azure', group: 'Azure Governance' },
      // Inventory & Query
      { route: '/foundations/kql',                   label: 'KQL',                           icon: '🔎', mod: fndKql,              cloud: 'azure', group: 'Inventory & Query' },
      { route: '/foundations/resource-graph',        label: 'Azure Resource Graph',          icon: '📊', mod: fndResourceGraph,    cloud: 'azure', group: 'Inventory & Query' },
      // Defender Stack
      { route: '/foundations/defender-cloud',        label: 'Defender for Cloud',            icon: '🛡️', mod: fndDefenderCloud,    cloud: 'azure', group: 'Defender Stack' },
      { route: '/foundations/defender-endpoint',     label: 'Defender for Endpoint',         icon: '💻', mod: fndDefenderEndpoint, cloud: 'azure', group: 'Defender Stack' },
      // Terraform
      { route: '/foundations/terraform',             label: 'Terraform basics',              icon: '🌍', mod: fndTerraform,        cloud: 'tf',    group: 'Terraform' },
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
      { route: '/reference/artifact-map',  label: 'Artifact Map (where code lives)', icon: '📁', mod: artifactMapPage, cloud: 'home' },
      { route: '/reference/decisions',     label: 'Decision trees',            icon: '🌳', mod: decisionsPage,   cloud: 'home' },
      { route: '/reference/vault',         label: 'Snippet Vault',             icon: '💼', mod: vaultPage,       cloud: 'home' },
      { route: '/reference/quickref',      label: 'Quick Reference',           icon: '⚡', mod: quickrefPage,     cloud: 'both' },
      { route: '/reference/cheatsheet',    label: 'A4 Cheatsheet',             icon: '📄', mod: cheatsheetPage,  cloud: 'both' },
      { route: '/reference/readinglist',   label: 'Reading list ↔ Hub map',    icon: '🗺️', mod: readingListPage, cloud: 'home' },
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

// Render one section's items, inserting a sub-group header when item.group changes.
function renderItems(items) {
  let lastGroup = null;
  let out = '';
  for (const item of items) {
    if (item.group && item.group !== lastGroup) {
      out += `<div class="sb-subgroup">${escape(item.group)}</div>`;
      lastGroup = item.group;
    }
    out += `
      <button class="snb" data-route="${item.route}" data-cloud="${item.cloud}">
        <span class="ni">${item.icon}</span>
        <span class="lbl">${escape(item.label)}</span>
      </button>`;
  }
  return out;
}

// Minimal escape for attribute and text contexts.
function escape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Sidebar render ─────────────────────────────────
function renderSidebar() {
  const nav = $('#sb-nav');
  if (!nav) return;
  nav.innerHTML = NAV.map(section => `
    <div class="sb-section">${section.icon} ${section.section}</div>
    ${renderItems(section.items)}
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
  sheet.innerHTML = renderItems(section.items);
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
