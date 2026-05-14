// Artifact Map — single browsable index of every code artifact the tool shows:
// where it lives in a real repo, how it's deployed, how it's run, how to test.
//
// Data lives in src/data/artifacts.js (shared with the inline callouts).

import { html, badge, escapeHtml } from '../../core/ui.js';
import { ARTIFACTS } from '../../data/artifacts.js';

export const meta = { title: 'Artifact Map', cloud: 'home' };

function cloudCls(c) {
  return c === 'aws' ? 'aws' :
         c === 'azure' ? 'azure' :
         c === 'tf' ? 'tf' : 'home';
}

function rowHtml(slug, a) {
  const cc = cloudCls(a.cloud);
  return `
    <article id="${escapeHtml(slug)}" class="artifact-row artifact-row-${cc}">
      <header class="artifact-row-head">
        ${badge(a.cloud)}
        <h2>${escapeHtml(a.name)}</h2>
        <code class="artifact-ext">${escapeHtml(a.extension)}</code>
      </header>
      <dl class="artifact-row-body">
        <dt>Lives in</dt><dd>${escapeHtml(a.livesIn)}</dd>
        <dt>Run / Evaluate</dt><dd>${escapeHtml(a.runHow)}</dd>
        <dt>Deploy</dt>
        <dd>
          <ul class="artifact-deploy-list">
            ${(a.deploy || []).map(d => `<li>${escapeHtml(d)}</li>`).join('')}
          </ul>
        </dd>
        ${a.test ? `<dt>Test locally</dt><dd>${escapeHtml(a.test)}</dd>` : ''}
        ${a.notes ? `<dt>Notes</dt><dd>${escapeHtml(a.notes)}</dd>` : ''}
      </dl>
    </article>`;
}

export function render() {
  const entries = Object.entries(ARTIFACTS);
  const toc = entries.map(([slug, a]) =>
    `<a href="#/reference/artifact-map#${escapeHtml(slug)}" class="artifact-toc-link artifact-toc-${cloudCls(a.cloud)}">${escapeHtml(a.name)}</a>`
  ).join('');

  return html`
    <div class="page-inner artifact-map-page">
      <div class="ph">
        <div class="phase-pill">Reference</div>
        <h1>📁 Artifact Map</h1>
        <p>Every code snippet in this tool maps to a real file in a real repo. This page tells you which one — and how it's deployed and run. Click an entry below to jump, or scroll the full list.</p>
      </div>

      <nav class="artifact-toc">${toc}</nav>

      <div class="artifact-rows">
        ${entries.map(([slug, a]) => rowHtml(slug, a)).join('')}
      </div>

      <div class="fnd-footer">
        <p class="hint">Want this artifact added? Check <code>app/src/data/artifacts.js</code>.</p>
      </div>
    </div>`;
}

export function mount(root) {
  // After render, jump to any sub-anchor passed in the URL fragment
  // (the hash router strips the second '#', so we recover it from window.location.hash
  // which looks like "#/reference/artifact-map#cfn-guard").
  const raw = window.location.hash || '';
  const parts = raw.split('#').filter(Boolean);
  if (parts.length >= 2) {
    const anchor = parts[1];
    const target = root.querySelector(`#${CSS.escape(anchor)}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
