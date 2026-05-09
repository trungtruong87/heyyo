// Decision trees — "when do I reach for X vs Y?"

import { html, $, $$, escapeHtml, badge } from '../../core/ui.js';
import { DECISIONS } from '../../data/decisions.js';

export const meta = { title: 'Decision trees', cloud: 'home' };

let activeId = DECISIONS[0]?.id || null;

function leafHtml(leaf) {
  return `
    <div class="dec-leaf">
      <div class="dec-leaf-answer">→ ${escapeHtml(leaf.leaf)}</div>
      <div class="dec-leaf-why">${escapeHtml(leaf.why)}</div>
    </div>`;
}

function branchHtml(b, idx, total) {
  const yesIsLeaf = b.yes && typeof b.yes === 'object' && b.yes.leaf;
  const noIsLeaf  = b.no  && typeof b.no  === 'object' && b.no.leaf;
  return `
    <div class="dec-branch">
      <div class="dec-q">Q${idx + 1}. ${escapeHtml(b.q)}</div>
      <div class="dec-options">
        <div class="dec-opt">
          <span class="dec-opt-tag yes">Yes</span>
          ${yesIsLeaf ? leafHtml(b.yes) :
            (b.yes ? `<span class="dec-next">→ go to Q${idx + 2}</span>` : '')}
        </div>
        <div class="dec-opt">
          <span class="dec-opt-tag no">No</span>
          ${noIsLeaf ? leafHtml(b.no) :
            (b.no ? `<span class="dec-next">→ go to Q${idx + 2}</span>` : '')}
        </div>
      </div>
    </div>`;
}

function treeHtml(d) {
  return `
    <div class="card dec-tree" data-id="${d.id}">
      <div class="dec-head">
        <h2>${escapeHtml(d.title)}</h2>
        ${badge(d.cloud)}
      </div>
      <p class="hint">${escapeHtml(d.intro)}</p>

      <div class="dec-branches">
        ${d.branches.map((b, i) => branchHtml(b, i, d.branches.length)).join('')}
      </div>

      <div class="dec-examples">
        <h3>Worked examples</h3>
        <ul>
          ${d.examples.map(e => `<li><strong>${escapeHtml(e.case)}</strong> — ${escapeHtml(e.answer)}</li>`).join('')}
        </ul>
      </div>
    </div>`;
}

export function render() {
  const tree = DECISIONS.find(d => d.id === activeId) || DECISIONS[0];
  return html`
    <div class="page-inner decisions-page">
      <div class="ph">
        <h1>🌳 Decision trees</h1>
        <p>30-second answers to questions design reviews always ask.</p>
      </div>

      <div class="card dec-tabs-card">
        <div class="dec-tabs">
          ${DECISIONS.map(d => `
            <button class="dec-tab ${d.id === tree.id ? 'active' : ''}" data-id="${d.id}">
              ${escapeHtml(d.title)}
            </button>`).join('')}
        </div>
      </div>

      <div id="dec-body">${treeHtml(tree)}</div>
    </div>`;
}

export function mount(root) {
  $$('.dec-tab', root).forEach(b => {
    b.addEventListener('click', () => {
      activeId = b.dataset.id;
      $$('.dec-tab', root).forEach(x => x.classList.toggle('active', x === b));
      const tree = DECISIONS.find(d => d.id === activeId);
      const body = $('#dec-body', root);
      if (body && tree) body.innerHTML = treeHtml(tree);
    });
  });
}
