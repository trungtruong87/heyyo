// Wiki — AWS↔Azure mapping table + glossary. Plain-English first.

import { html, $, $$, badge, escapeHtml } from '../../core/ui.js';
import { MAPPING, GLOSSARY } from '../../data/mapping.js';

export const meta = { title: 'Wiki', cloud: 'home' };

let activeTab = 'mapping';
let filterText = '';

function mappingRow(r) {
  const rels = [];
  if (r.foundationDay) rels.push(`<a class="chip chip-fnd" href="#/foundations/${r.foundationDay}">Day ${r.foundationDay}</a>`);
  (r.tickets || []).forEach(t => rels.push(`<a class="chip chip-tkt" href="#/tickets/${t.toLowerCase()}">${t}</a>`));

  return `
    <tr class="map-row">
      <td class="map-concept">
        <div class="map-concept-name">${escapeHtml(r.concept)}</div>
        <div class="map-concept-plain">${escapeHtml(r.plain)}</div>
      </td>
      <td class="map-aws">
        <div class="map-srv">${badge('aws')} ${escapeHtml(r.aws.service)}</div>
        ${r.aws.link ? `<a class="map-link" href="${r.aws.link}" target="_blank" rel="noopener">Docs ↗</a>` : ''}
      </td>
      <td class="map-azure">
        <div class="map-srv">${badge('azure')} ${escapeHtml(r.azure.service)}</div>
        ${r.azure.link ? `<a class="map-link" href="${r.azure.link}" target="_blank" rel="noopener">Docs ↗</a>` : ''}
      </td>
      <td class="map-differs">${escapeHtml(r.differs || '—')}</td>
      <td class="map-rels">${rels.join(' ')}</td>
    </tr>`;
}

function glossaryItem(g) {
  return `
    <div class="gloss-item" data-cloud="${g.cloud}">
      <div class="gloss-head">
        <span class="gloss-term">${escapeHtml(g.term)}</span>
        ${badge(g.cloud)}
      </div>
      <p class="gloss-plain">${escapeHtml(g.plain)}</p>
      <p class="gloss-detail">${g.detail}</p>
    </div>`;
}

function matchesFilter(text, ...fields) {
  if (!filterText) return true;
  const f = filterText.toLowerCase();
  return fields.some(s => String(s || '').toLowerCase().includes(f));
}

export function render() {
  return html`
    <div class="page-inner wiki-page">
      <div class="ph">
        <h1>📖 Wiki</h1>
        <p>AWS↔Azure mapping and glossary. Plain-English first; precise vocabulary second.
           Skim before a meeting, search during one.</p>
      </div>

      <div class="card wiki-controls">
        <div class="wiki-tabs">
          <button class="wiki-tab ${activeTab === 'mapping' ? 'active' : ''}" data-tab="mapping">AWS ↔ Azure mapping</button>
          <button class="wiki-tab ${activeTab === 'glossary' ? 'active' : ''}" data-tab="glossary">Glossary</button>
        </div>
        <input type="search" class="wiki-search" id="wiki-search"
               placeholder="Filter — type a term or service name…"
               value="${escapeHtml(filterText)}">
      </div>

      <div class="card wiki-body" id="wiki-body"></div>
    </div>`;
}

function paint(root) {
  const body = $('#wiki-body', root);
  if (!body) return;

  if (activeTab === 'mapping') {
    const rows = MAPPING.filter(r =>
      matchesFilter(filterText, r.concept, r.plain, r.aws.service, r.azure.service, r.differs));
    body.innerHTML = `
      <table class="map-table">
        <thead>
          <tr>
            <th>Concept</th>
            <th>${badge('aws')} AWS</th>
            <th>${badge('azure')} Azure</th>
            <th>How they differ</th>
            <th>Where it shows up</th>
          </tr>
        </thead>
        <tbody>${rows.map(mappingRow).join('') || `<tr><td colspan="5" class="hint">No matches.</td></tr>`}</tbody>
      </table>`;
  } else {
    const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
    const items = sorted.filter(g => matchesFilter(filterText, g.term, g.plain, g.detail));
    body.innerHTML = `
      <div class="gloss-grid">
        ${items.map(glossaryItem).join('') || `<div class="hint">No matches.</div>`}
      </div>`;
  }
}

export function mount(root) {
  $$('.wiki-tab', root).forEach(b => {
    b.addEventListener('click', () => {
      activeTab = b.dataset.tab;
      $$('.wiki-tab', root).forEach(x => x.classList.toggle('active', x === b));
      paint(root);
    });
  });
  $('#wiki-search', root)?.addEventListener('input', (e) => {
    filterText = e.target.value;
    paint(root);
  });
  paint(root);
}
