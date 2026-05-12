// Shared renderer for Foundation topic pages. Each /foundations/<slug> route
// mounts a thin module that calls into here with its topic id.

import { html, $, badge, escapeHtml, copyToClipboard } from '../../core/ui.js';
import { FOUNDATIONS, foundationById } from '../../data/foundations.js';
import { getFndDone, setFndDone, getExplain, setExplain } from '../../core/storage.js';

function cloudClass(cloud) {
  return cloud === 'aws' ? 'aws' :
         cloud === 'azure' ? 'azure' :
         cloud === 'tf' ? 'tf' : 'green';
}

function handsOnStepHtml(step, f) {
  const cc = cloudClass(f.cloud);
  const stored = getExplain('handson_' + f.id + '_' + step.label);
  const value = stored || step.starter || '';
  const labelEsc = escapeHtml(step.label);
  return `
    <section class="handson-step handson-step-${cc}">
      <div class="handson-step-head">
        <strong class="handson-step-label">${labelEsc}</strong>
        <span class="handson-question">${step.question}</span>
      </div>
      ${step.hint ? `
        <button class="btn handson-hint-toggle" data-action="toggle-hint">💡 Hint</button>
        <div class="handson-hint hidden">${step.hint}</div>
      ` : ''}
      <textarea class="handson-step-area" data-step-key="handson_${f.id}_${labelEsc}"
                placeholder="${escapeHtml('Your answer…')}"
                rows="5">${escapeHtml(value)}</textarea>
      <div class="btn-row handson-tools">
        <button class="btn btn-${cc}" data-action="show-answer">Show model answer</button>
        <button class="btn" data-action="copy-answer">Copy answer</button>
        <span class="hint" data-saved-step></span>
      </div>
      <div class="handson-answer hidden">
        <span class="layer-label">Model answer</span>
        <div class="handson-answer-body">${step.answer}</div>
      </div>
    </section>`;
}

function renderHandsOnCard(f) {
  const ho = f.handsOn || {};
  return `
    <div class="card fnd-handson">
      <h2>🔧 Hands-on</h2>
      ${ho.intro ? `<p class="handson-intro">${escapeHtml(ho.intro)}</p>` : ''}
      ${ho.labLinks ? `
        <div class="btn-row handson-labs">
          ${ho.labLinks.map(labLinkHtml).join('')}
        </div>` : ''}
      <div class="handson-steps">
        ${(ho.steps || []).map(s => handsOnStepHtml(s, f)).join('')}
      </div>
      ${ho.selfCheck ? handsOnSelfCheckHtml(ho.selfCheck, f) : ''}
    </div>`;
}

function handsOnSelfCheckHtml(items, f) {
  const cc = cloudClass(f.cloud);
  return `
    <div class="handson-selfcheck handson-selfcheck-${cc}">
      <h3>✅ Self-check — can you say each of these out loud?</h3>
      <ul class="handson-checklist">
        ${items.map((t, i) => {
          const checked = getExplain('handson_' + f.id + '_check_' + i) ? 'checked' : '';
          return `<li>
            <label>
              <input type="checkbox" data-check-idx="${i}" ${checked}>
              <span>${escapeHtml(t)}</span>
            </label>
          </li>`;
        }).join('')}
      </ul>
    </div>`;
}

function panelHtml(p) {
  const cloudCls = p.cloud === 'aws' ? 'aws' :
                   p.cloud === 'azure' ? 'azure' :
                   p.cloud === 'tf' ? 'tf' : 'home';
  return `
    <div class="card fnd-panel fnd-panel-${cloudCls}">
      <div class="pt pt-${cloudCls}">${badge(p.cloud)} <strong>${escapeHtml(p.service)}</strong></div>
      <div class="fnd-plain"><span class="layer-label">Plain</span>
        <p>${p.plain}</p>
      </div>
      <div class="fnd-detail"><span class="layer-label">Working detail</span>
        <ul>${p.detail.map(d => `<li>${d}</li>`).join('')}</ul>
      </div>
      ${p.example ? `
        <div class="fnd-example">
          <span class="layer-label">Example</span>
          <pre><code>${escapeHtml(p.example)}</code></pre>
        </div>` : ''}
    </div>`;
}

function labLinkHtml(l) {
  return `<a class="btn btn-${l.route.includes('azure') ? 'azure' :
                                l.route.includes('scp') ? 'aws' :
                                l.route.includes('kql') ? 'azure' : 'green'}"
            href="#${l.route}">${escapeHtml(l.label)} →</a>`;
}

// Find the prev/next topic by array position. Returns the topic object or null.
function neighbor(f, delta) {
  const idx = FOUNDATIONS.findIndex(x => x.id === f.id);
  if (idx < 0) return null;
  const j = idx + delta;
  if (j < 0 || j >= FOUNDATIONS.length) return null;
  return FOUNDATIONS[j];
}

export function renderFoundation(id) {
  const f = foundationById(id);
  if (!f) return `<div class="page-inner"><div class="card"><h1>Topic not found</h1></div></div>`;

  const done = getFndDone().has(f.id);
  const prev = neighbor(f, -1);
  const next = neighbor(f, +1);

  return html`
    <div class="page-inner foundation-page">
      <div class="ph">
        <div class="phase-pill">${escapeHtml(f.group || 'Foundations')}</div>
        <h1>${escapeHtml(f.title)}</h1>
        <p>${escapeHtml(f.subtitle)}</p>
      </div>

      <div class="card fnd-intro">
        <span class="layer-label">Plain-English (read aloud test)</span>
        <p class="fnd-plain-text">${f.intro.plain}</p>
        <div class="fnd-mnemonic">🧠 <strong>Remember:</strong> ${escapeHtml(f.intro.mnemonic)}</div>
      </div>

      <div class="fnd-panels grid-${f.panels.length === 1 ? '1' : '2'}">
        ${f.panels.map(panelHtml).join('')}
      </div>

      ${f.diagram ? `
        <div class="card fnd-diagram">
          <span class="layer-label">Mental model</span>
          <pre>${escapeHtml(f.diagram)}</pre>
        </div>` : ''}

      ${f.conceptDive ? `
        <div class="card fnd-concept">
          <span class="layer-label">Concept dive — ${escapeHtml(f.conceptDive.title)}</span>
          <div class="fnd-concept-body">${f.conceptDive.body}</div>
        </div>` : ''}

      ${f.fieldNotes ? `
        <div class="card fnd-fieldnotes">
          <span class="layer-label">Field notes — on the job</span>
          <p class="hint">Quirks, costs, pushback you'll meet. The stuff the docs skip.</p>
          <ul class="fnd-fieldnotes-list">${f.fieldNotes.map(n => `<li>${n}</li>`).join('')}</ul>
        </div>` : ''}

      ${renderHandsOnCard(f)}

      <div class="card fnd-recap">
        <h2>📌 Recap — what you should now believe</h2>
        <ul>${f.recap.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>

      <div class="card fnd-talking">
        <h2>🗣️ Meeting talking points</h2>
        <p class="hint">Phrases you could actually say in a standup or to an auditor.</p>
        <ol>${f.talkingPoints.map(t => `<li>${t}</li>`).join('')}</ol>
      </div>

      <div class="fnd-footer">
        <div class="btn-row">
          ${prev
            ? `<a class="btn" href="#/foundations/${prev.id}">← ${escapeHtml(prev.title)}</a>`
            : '<span></span>'}
          <button class="btn ${done ? 'btn-tf' : 'btn-green'}" data-action="toggle-done">
            ${done ? '✓ Marked done' : 'Mark this topic done'}
          </button>
          ${next
            ? `<a class="btn btn-${cloudClass(next.cloud)}" href="#/foundations/${next.id}">${escapeHtml(next.title)} →</a>`
            : `<a class="btn btn-azure" href="#/tickets/t1">Ticket Queue →</a>`}
        </div>
      </div>
    </div>`;
}

export function mountFoundation(root, id) {
  const f = foundationById(id);
  if (!f) return;

  // Toggle done
  root.querySelector('[data-action="toggle-done"]')?.addEventListener('click', () => {
    const done = getFndDone();
    if (done.has(f.id)) done.delete(f.id); else done.add(f.id);
    setFndDone(done);
    // Re-render in place
    const main = root.closest('main') || document.getElementById('app-root');
    if (main) main.innerHTML = renderFoundation(f.id);
    if (main) mountFoundation(main, f.id);
  });

  // Hands-on: delegated click handlers for hint/answer/copy
  const handsonRoot = root.querySelector('.fnd-handson');
  if (handsonRoot) {
    handsonRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const step = btn.closest('.handson-step');
      const action = btn.dataset.action;

      if (action === 'toggle-hint' && step) {
        const hint = step.querySelector('.handson-hint');
        if (hint) hint.classList.toggle('hidden');
      } else if (action === 'show-answer' && step) {
        const ans = step.querySelector('.handson-answer');
        if (ans) {
          ans.classList.toggle('hidden');
          btn.textContent = ans.classList.contains('hidden') ? 'Show model answer' : 'Hide model answer';
        }
      } else if (action === 'copy-answer' && step) {
        const body = step.querySelector('.handson-answer-body');
        if (body) copyToClipboard(body.textContent.trim(), btn);
      }
    });

    // Auto-save per-step textareas (debounced)
    const saveTimers = {};
    handsonRoot.addEventListener('input', (e) => {
      const ta = e.target.closest('.handson-step-area');
      if (!ta) return;
      const key = ta.dataset.stepKey;
      if (!key) return;
      clearTimeout(saveTimers[key]);
      saveTimers[key] = setTimeout(() => {
        setExplain(key, ta.value);
        const note = ta.closest('.handson-step')?.querySelector('[data-saved-step]');
        if (note) { note.textContent = '✓ Saved'; setTimeout(() => { note.textContent = ''; }, 1500); }
      }, 400);
    });

    // Persist self-check checkboxes
    handsonRoot.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-check-idx]');
      if (!cb) return;
      setExplain('handson_' + f.id + '_check_' + cb.dataset.checkIdx, cb.checked ? '1' : '');
    });
  }
}
