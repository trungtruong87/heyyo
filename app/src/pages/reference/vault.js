// Snippet Vault — every artifact you produced in a ticket, copy-pasteable.

import { html, $, $$, escapeHtml, copyToClipboard, badge } from '../../core/ui.js';
import { getSnippets, deleteSnippet, clearSnippets } from '../../core/storage.js';

export const meta = { title: 'Snippet Vault', cloud: 'home' };

const KIND_LABEL = {
  scp:        'AWS SCP',
  azpolicy:   'Azure Policy',
  lambda:     'Lambda',
  powershell: 'PowerShell',
  kql:        'KQL',
  tf:         'Terraform',
  note:       'Note',
};

function snipCard(s) {
  return `
    <div class="vault-card" data-id="${s.id}">
      <div class="vault-head">
        <span class="vault-kind">${escapeHtml(KIND_LABEL[s.kind] || s.kind)}</span>
        ${badge(s.cloud)}
        <span class="vault-source">${escapeHtml(s.sourceTitle || s.source)}</span>
        <span class="vault-ts">${new Date(s.ts).toLocaleString()}</span>
      </div>
      <div class="vault-title">${escapeHtml(s.title)}</div>
      <pre><code class="vault-body">${escapeHtml(s.body)}</code></pre>
      <div class="btn-row">
        <button class="btn" data-action="copy">Copy</button>
        <button class="btn" data-action="delete" data-id="${s.id}">Delete</button>
      </div>
    </div>`;
}

export function render() {
  const all = getSnippets();
  return html`
    <div class="page-inner vault-page">
      <div class="ph">
        <h1>💼 Snippet Vault</h1>
        <p>Every artifact you produced in a ticket lives here. Copy-pasteable.
           This is your working portfolio at the end of week 2.</p>
      </div>

      <div class="card vault-controls">
        <div class="hint">${all.length} snippet${all.length === 1 ? '' : 's'} saved.</div>
        ${all.length > 0
          ? `<button class="btn" id="vault-clear">Clear all</button>`
          : ''}
      </div>

      <div id="vault-list" class="vault-list">
        ${all.length === 0
          ? `<div class="card hint">Nothing here yet. Complete a <a href="#/tickets/t1">ticket</a> and save its artifact.</div>`
          : all.map(snipCard).join('')}
      </div>
    </div>`;
}

export function mount(root) {
  function rerender() {
    const main = root.closest('main') || document.getElementById('app-root');
    if (!main) return;
    main.innerHTML = render();
    mount(main);
  }

  $('#vault-clear', root)?.addEventListener('click', () => {
    if (confirm('Clear all saved snippets? This cannot be undone.')) {
      clearSnippets();
      rerender();
    }
  });

  $$('.vault-card', root).forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-action="copy"]')?.addEventListener('click', (e) => {
      const code = card.querySelector('.vault-body')?.textContent || '';
      copyToClipboard(code, e.currentTarget);
    });
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      deleteSnippet(id);
      rerender();
    });
  });
}
