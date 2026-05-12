// Home dashboard — surfaces the next foundation day, the next ticket, and a
// snapshot of progress + snippets. Optimized for a "where do I pick up?" cold
// start.

import { html, $, $$, badge } from '../../core/ui.js';
import { FOUNDATIONS } from '../../data/foundations.js';
import { TICKETS } from '../../data/tickets.js';
import { getFndDone, getTktDone, getSnippets } from '../../core/storage.js';
import { navigate } from '../../core/router.js';

export const meta = { title: 'Dashboard', cloud: 'home' };

function nextFoundation() {
  const done = getFndDone();
  for (const f of FOUNDATIONS) if (!done.has(f.id)) return f;
  return null;
}

function nextTicket() {
  const done = getTktDone();
  for (const t of TICKETS) if (!done.has(t.id)) return t;
  return null;
}

const QUICK_LINKS = [
  { route: '/foundations/org-structure', icon: '📚', name: 'Foundations',     type: 'Start here' },
  { route: '/tickets/t1',                icon: '🎫', name: 'Ticket Queue',    type: 'Phase 2' },
  { route: '/reference/wiki',            icon: '📖', name: 'Wiki',            type: 'Reference' },
  { route: '/reference/decisions',       icon: '🌳', name: 'Decision trees',  type: 'Reference' },
  { route: '/reference/vault',           icon: '💼', name: 'Snippet Vault',   type: 'Your work' },
  { route: '/practice/scp',              icon: '🏛️', name: 'SCP lab bench',   type: 'AWS' },
  { route: '/practice/kql',              icon: '🔍', name: 'KQL lab bench',   type: 'Azure' },
  { route: '/practice/azure-policy',     icon: '📋', name: 'Azure Policy lab', type: 'Azure' },
];

export function render() {
  const f = nextFoundation();
  const t = nextTicket();
  const snippetCount = getSnippets().length;
  const fDoneCount = getFndDone().size;
  const tDoneCount = getTktDone().size;

  return html`
    <div class="page-inner">
      <div class="ph">
        <h1>🛡️ DevOps Compliance Workbench</h1>
        <p>Topic-grouped Foundations + a 9-ticket queue. Built to (a) follow
           compliance meetings without freezing on terminology, and (b) make
           real progress on a first ticket. Plain-English first, working
           detail second.</p>
      </div>

      <div class="dash-hero">
        <div class="dash-hero-icon">🛡️</div>
        <div>
          <div class="dash-hero-title">Where to next</div>
          <div class="dash-hero-sub">Foundations build the mental model · Tickets build the muscle.</div>
        </div>
      </div>

      <div class="grid-2">
        ${f ? `
          <div class="card today-card">
            <div class="today-label">Foundations — next topic${f.group ? ` · ${f.group}` : ''}</div>
            <div class="today-day">${f.title}</div>
            <div class="today-focus">${f.subtitle}</div>
            <div class="btn-row">
              <button class="btn btn-green" data-go="/foundations/${f.id}">Open topic →</button>
            </div>
          </div>` : `
          <div class="card today-card">
            <div class="today-label">Foundations — done ✓</div>
            <div class="today-day">All ${FOUNDATIONS.length} topics completed.</div>
            <div class="today-focus">Move to Tickets if you haven't already.</div>
          </div>`}

        ${t ? `
          <div class="card today-card">
            <div class="today-label">Phase 2 — next ticket</div>
            <div class="today-day">${badge(t.cloud)} ${t.num}: ${t.title}</div>
            <div class="today-focus">Topic: ${t.topic}</div>
            <div class="btn-row">
              <button class="btn btn-${t.cloud === 'aws' ? 'aws' : t.cloud === 'azure' ? 'azure' : t.cloud === 'tf' ? 'tf' : 'green'}"
                      data-go="/tickets/${t.id.toLowerCase()}">Open ${t.id} →</button>
            </div>
          </div>` : `
          <div class="card today-card">
            <div class="today-label">Phase 2 — done ✓</div>
            <div class="today-day">All 9 tickets completed.</div>
            <div class="today-focus">Open the Snippet Vault to see your portfolio.</div>
            <div class="btn-row">
              <button class="btn btn-green" data-go="/reference/vault">Open vault →</button>
            </div>
          </div>`}
      </div>

      <div class="section-head"><h2>📊 Progress</h2></div>
      <div class="progress-overview">
        <div class="plan-prog-row">
          <span class="plan-prog-label">Foundations</span>
          <div class="plan-prog-track">
            <div class="plan-prog-fill" style="width:${(fDoneCount/FOUNDATIONS.length)*100}%;background:var(--green)"></div>
          </div>
          <span style="font-size:12px;color:var(--text3);min-width:52px;text-align:right">${fDoneCount} / ${FOUNDATIONS.length}</span>
        </div>
        <div class="plan-prog-row">
          <span class="plan-prog-label">Tickets</span>
          <div class="plan-prog-track">
            <div class="plan-prog-fill" style="width:${(tDoneCount/TICKETS.length)*100}%;background:var(--blue)"></div>
          </div>
          <span style="font-size:12px;color:var(--text3);min-width:52px;text-align:right">${tDoneCount} / ${TICKETS.length}</span>
        </div>
        <div class="plan-prog-row">
          <span class="plan-prog-label">Snippets saved</span>
          <div class="plan-prog-track">
            <div class="plan-prog-fill" style="width:${Math.min(100, snippetCount * 11)}%;background:var(--purple)"></div>
          </div>
          <span style="font-size:12px;color:var(--text3);min-width:52px;text-align:right">${snippetCount}</span>
        </div>
      </div>

      <div class="section-head"><h2>⚡ Jump to</h2></div>
      <div class="quick-links">
        ${QUICK_LINKS.map(q => `
          <button class="quick-link" data-route="${q.route}">
            <div class="quick-link-icon">${q.icon}</div>
            <div class="quick-link-name">${q.name}</div>
            <div class="quick-link-type">${q.type}</div>
          </button>`).join('')}
      </div>
    </div>`;
}

export function mount(root) {
  $$('[data-go]', root).forEach(b => {
    b.addEventListener('click', () => navigate(b.dataset.go));
  });
  $$('.quick-link', root).forEach(b => {
    b.addEventListener('click', () => navigate(b.dataset.route));
  });
}
