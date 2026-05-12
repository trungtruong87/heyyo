// Shared renderer for tickets. Each /tickets/tN route mounts a thin module
// that calls into here with its ticket id. A ticket has 5 sections:
// Brief → Investigate → Decide → Build → Recap + Talking points.

import { html, $, $$, badge, escapeHtml, copyToClipboard } from '../../core/ui.js';
import { TICKETS, ticketById } from '../../data/tickets.js';
import { getTktDone, setTktDone, addSnippet } from '../../core/storage.js';

function cloudCls(c) {
  if (c === 'aws') return 'aws';
  if (c === 'azure') return 'azure';
  if (c === 'tf') return 'tf';
  return 'green';
}

const KIND_LABEL = {
  scp:        'AWS SCP (JSON)',
  azpolicy:   'Azure Policy (JSON)',
  lambda:     'Lambda handler (JS)',
  powershell: 'PowerShell Runbook',
  kql:        'KQL query',
  tf:         'Terraform (HCL)',
  note:       'Note (markdown / plain text)',
};

export function renderTicket(id) {
  const t = ticketById(id);
  if (!t) return `<div class="page-inner"><div class="card"><h1>Ticket not found</h1></div></div>`;

  const done = getTktDone().has(t.id);
  const cc = cloudCls(t.cloud);
  const order = TICKETS.map(x => x.id);
  const idx = order.indexOf(t.id);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx < order.length - 1 ? order[idx + 1] : null;

  return html`
    <div class="page-inner ticket-page">
      <div class="ph">
        <div class="phase-pill">Phase 2 · Ticket queue</div>
        <h1>${badge(t.cloud)} <span class="ticket-num">${t.num}</span></h1>
        <h2 class="ticket-title">${escapeHtml(t.title)}</h2>
        <p class="hint">Topic: ${escapeHtml(t.topic)}</p>
      </div>

      <!-- Brief -->
      <div class="card ticket-step">
        <div class="step-head">1 · Brief</div>
        <p class="hint">Reporter: ${escapeHtml(t.brief.reporter)}</p>
        <div class="ticket-plain"><span class="layer-label">What's going on</span>
          <p>${t.brief.plain}</p>
        </div>
        ${t.brief.primer ? `
          <div class="ticket-plain"><span class="layer-label">First, the vocabulary</span>
            <p>${t.brief.primer}</p>
          </div>` : ''}
        <div class="ticket-stakes"><span class="layer-label">What's at stake</span>
          <p>${t.brief.stakes}</p>
        </div>
      </div>

      ${t.doneWhen ? `
        <div class="card ticket-donewhen">
          <div class="step-head">✅ Done when</div>
          <p class="hint">Concrete acceptance criteria. Check each off before marking the ticket done.</p>
          <ul class="donewhen-list">${t.doneWhen.map(d => `<li>${d}</li>`).join('')}</ul>
        </div>` : ''}

      <!-- Investigate -->
      <div class="card ticket-step">
        <div class="step-head">2 · Investigate</div>
        <p>${escapeHtml(t.investigate.summary)}</p>
        <ol class="ticket-steps">${t.investigate.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        ${t.investigate.labLink ? `
          <div class="btn-row">
            <a class="btn btn-${cc}" href="#${t.investigate.labLink.route}">${escapeHtml(t.investigate.labLink.label)} →</a>
          </div>` : ''}
      </div>

      <!-- Decide -->
      <div class="card ticket-step">
        <div class="step-head">3 · Decide</div>
        <p class="ticket-question">${escapeHtml(t.decide.question)}</p>
        <div class="ticket-options">
          ${t.decide.options.map((o, i) => `
            <button class="ticket-option" data-idx="${i}">
              <span class="opt-label">${escapeHtml(o.label)}</span>
              <span class="opt-explain hidden">${o.explain}</span>
            </button>`).join('')}
        </div>
        <p class="hint">Click each option to see the reasoning.</p>
      </div>

      <!-- Build -->
      <div class="card ticket-step">
        <div class="step-head">4 · Build the artifact</div>
        <p>${t.build.prompt}</p>
        <p class="hint">Artifact kind: <strong>${escapeHtml(KIND_LABEL[t.build.artifactKind] || t.build.artifactKind)}</strong></p>

        ${t.build.steps ? `
          <div class="build-scaffold">
            <p class="hint">Stuck? Reveal the build in 3 steps — write each step yourself before clicking the next.</p>
            <ol class="build-steps">
              ${t.build.steps.map((s, i) => `
                <li class="build-step">
                  <button class="build-step-toggle" data-step="${i}">
                    <span class="build-step-num">Step ${i + 1}</span>
                    <span class="build-step-label">${escapeHtml(s.label)}</span>
                    <span class="build-step-chev">▸</span>
                  </button>
                  <div class="build-step-body hidden">${s.body}</div>
                </li>`).join('')}
            </ol>
          </div>` : ''}

        <textarea class="ticket-build-area" data-key="build_${t.id}"
                  rows="14"
                  spellcheck="false">${escapeHtml(t.build.starter)}</textarea>
        <div class="btn-row">
          <button class="btn btn-${cc}" data-action="save-build">Save my artifact → Snippet Vault</button>
          <button class="btn" data-action="show-sample">Show worked example</button>
          <span class="hint" data-saved-build></span>
        </div>
        <div class="ticket-sample hidden">
          <span class="layer-label">Worked example</span>
          <pre><code class="ticket-sample-code">${escapeHtml(t.build.sample)}</code></pre>
          <div class="btn-row">
            <button class="btn" data-action="copy-sample">Copy to clipboard</button>
          </div>
        </div>
      </div>

      <!-- Recap + Talking -->
      <div class="card ticket-recap">
        <h2>📌 Recap</h2>
        <ul>${t.recap.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>

      <div class="card ticket-talking">
        <h2>🗣️ Meeting talking points</h2>
        <ol>${t.talkingPoints.map(p => `<li>${p}</li>`).join('')}</ol>
      </div>

      ${t.production ? `
        <div class="card ticket-production">
          <h2>🛠️ Production reality check</h2>
          <p class="hint">What experienced engineers add — beyond the textbook fix.</p>
          <ul>${t.production.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>` : ''}

      <div class="fnd-footer">
        <div class="btn-row">
          ${prev ? `<a class="btn" href="#/tickets/${prev.toLowerCase()}">← ${prev}</a>` : '<span></span>'}
          <button class="btn ${done ? 'btn-tf' : 'btn-green'}" data-action="toggle-done">
            ${done ? '✓ Marked done' : 'Mark this ticket done'}
          </button>
          ${next
            ? `<a class="btn btn-${cc}" href="#/tickets/${next.toLowerCase()}">${next} →</a>`
            : `<a class="btn btn-green" href="#/reference/vault">Open Snippet Vault →</a>`}
        </div>
      </div>
    </div>`;
}

export function mountTicket(root, id) {
  const t = ticketById(id);
  if (!t) return;

  // Decide options — toggle reasoning on click
  $$('.ticket-option', root).forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('open');
      const explain = btn.querySelector('.opt-explain');
      explain?.classList.toggle('hidden');
    });
  });

  // Save build → snippet vault
  root.querySelector('[data-action="save-build"]')?.addEventListener('click', () => {
    const ta = root.querySelector('.ticket-build-area');
    const body = (ta?.value || '').trim();
    if (!body) return;
    addSnippet({
      source: t.id,
      sourceTitle: t.num + ' — ' + t.title,
      kind: t.build.artifactKind,
      title: t.title,
      cloud: t.cloud,
      body,
    });
    const note = root.querySelector('[data-saved-build]');
    if (note) { note.textContent = '✓ Saved to vault'; setTimeout(() => note.textContent = '', 2000); }
  });

  // Show sample
  root.querySelector('[data-action="show-sample"]')?.addEventListener('click', () => {
    root.querySelector('.ticket-sample')?.classList.toggle('hidden');
  });

  // Build scaffold — click-to-reveal per step
  $$('.build-step-toggle', root).forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.parentElement.querySelector('.build-step-body');
      const open = !body.classList.contains('hidden');
      body.classList.toggle('hidden');
      btn.classList.toggle('open', !open);
    });
  });

  // Copy sample
  root.querySelector('[data-action="copy-sample"]')?.addEventListener('click', (e) => {
    const code = root.querySelector('.ticket-sample-code')?.textContent || '';
    copyToClipboard(code, e.currentTarget);
  });

  // Toggle done
  root.querySelector('[data-action="toggle-done"]')?.addEventListener('click', () => {
    const done = getTktDone();
    if (done.has(t.id)) done.delete(t.id); else done.add(t.id);
    setTktDone(done);
    const main = root.closest('main') || document.getElementById('app-root');
    if (main) main.innerHTML = renderTicket(t.id);
    if (main) mountTicket(main, t.id);
  });
}
