// Shared renderer for Foundation topic pages. Each /foundations/<slug> route
// mounts a thin module that calls into here with its topic id.

import { html, $, badge, escapeHtml } from '../../core/ui.js';
import { FOUNDATIONS, foundationById } from '../../data/foundations.js';
import { getFndDone, setFndDone, getExplain, setExplain, getVoicePref, setVoicePref } from '../../core/storage.js';
import { extractListenable, getVoices, pickDefaultVoice, play, cancelAll } from '../../core/voice.js';

function cloudClass(cloud) {
  return cloud === 'aws' ? 'aws' :
         cloud === 'azure' ? 'azure' :
         cloud === 'tf' ? 'tf' : 'green';
}

function handsOnStepHtml(step, f) {
  const cc = cloudClass(f.cloud);
  const labelEsc = escapeHtml(step.label);
  return `
    <section class="handson-step handson-step-${cc}" data-listen-card="handson-${labelEsc}">
      <div class="handson-step-head">
        <strong class="handson-step-label">${labelEsc}</strong>
        <span class="handson-question">${step.question}</span>
      </div>
      ${step.hint ? `
        <button class="btn handson-hint-toggle" data-action="toggle-hint">💡 Hint</button>
        <div class="handson-hint hidden">${step.hint}</div>
      ` : ''}
      <div class="btn-row handson-tools">
        <button class="btn btn-${cc}" data-action="show-answer">Show model answer</button>
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
          ${exampleAnnotationsHtml(p.exampleAnnotations)}
        </div>` : ''}
    </div>`;
}

function exampleAnnotationsHtml(anns) {
  if (!Array.isArray(anns) || !anns.length) return '';
  return `
    <details class="fnd-example-annotations">
      <summary class="layer-label">What's what (${anns.length})</summary>
      <ul>
        ${anns.map(a => `
          <li class="ann-${a.type === 'keyword' ? 'keyword' : 'user'}">
            <code>${escapeHtml(a.token)}</code>
            <span class="ann-tag">${a.type === 'keyword' ? 'platform keyword' : 'your value'}</span>
            <span class="ann-note">${escapeHtml(a.note)}</span>
          </li>`).join('')}
      </ul>
    </details>`;
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

      <div class="card fnd-listen" data-listen-root>
        <div class="fnd-listen-row">
          <button class="btn btn-green" data-action="listen-play">▶ Listen</button>
          <button class="btn" data-action="listen-pause" hidden>⏸ Pause</button>
          <button class="btn" data-action="listen-resume" hidden>▶ Resume</button>
          <button class="btn" data-action="listen-stop" hidden>■ Stop</button>
          <span class="fnd-listen-status" data-listen-status>Reads plain-English layers, recap, talking points, and hands-on Q&amp;A aloud — code &amp; tables skipped.</span>
        </div>
        <details class="fnd-listen-details">
          <summary>Voice settings</summary>
          <div class="fnd-listen-controls">
            <label>Voice <select data-listen-voice></select></label>
            <label>Speed <input type="range" min="0.85" max="1.5" step="0.05" data-listen-rate></label>
            <span data-listen-rate-val>1.0×</span>
          </div>
        </details>
      </div>

      <div class="card fnd-intro" data-listen-card="intro">
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
        <div class="card fnd-concept" data-listen-card="concept">
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

      <div class="card fnd-recap" data-listen-card="recap">
        <h2>📌 Recap — what you should now believe</h2>
        <ul>${f.recap.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>

      <div class="card fnd-talking" data-listen-card="talking">
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

  // Stop any narration left running from a previous foundation page.
  cancelAll();

  // Toggle done
  root.querySelector('[data-action="toggle-done"]')?.addEventListener('click', () => {
    const done = getFndDone();
    if (done.has(f.id)) done.delete(f.id); else done.add(f.id);
    setFndDone(done);
    // Re-render in place
    cancelAll();
    const main = root.closest('main') || document.getElementById('app-root');
    if (main) main.innerHTML = renderFoundation(f.id);
    if (main) mountFoundation(main, f.id);
  });

  mountListenBar(root, f);

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
      }
    });

    // Persist self-check checkboxes
    handsonRoot.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-check-idx]');
      if (!cb) return;
      setExplain('handson_' + f.id + '_check_' + cb.dataset.checkIdx, cb.checked ? '1' : '');
    });
  }
}

// ─── Listen bar ──────────────────────────────────────────────────────────
// Wires the play/pause/stop buttons, voice picker, and rate slider.
// Highlights the card that's currently being narrated.

let activeController = null;

function mountListenBar(root, f) {
  const bar = root.querySelector('[data-listen-root]');
  if (!bar) return;
  if (!('speechSynthesis' in window)) {
    bar.querySelector('[data-listen-status]').textContent =
      'Your browser does not support speech synthesis.';
    bar.querySelector('[data-action="listen-play"]').disabled = true;
    return;
  }

  const btnPlay   = bar.querySelector('[data-action="listen-play"]');
  const btnPause  = bar.querySelector('[data-action="listen-pause"]');
  const btnResume = bar.querySelector('[data-action="listen-resume"]');
  const btnStop   = bar.querySelector('[data-action="listen-stop"]');
  const statusEl  = bar.querySelector('[data-listen-status]');
  const voiceSel  = bar.querySelector('[data-listen-voice]');
  const rateInput = bar.querySelector('[data-listen-rate]');
  const rateVal   = bar.querySelector('[data-listen-rate-val]');

  const pref = getVoicePref();
  rateInput.value = String(pref.rate || 1.0);
  rateVal.textContent = Number(rateInput.value).toFixed(2).replace(/\.?0+$/, '') + '×';

  let voicesLoaded = [];
  let currentVoice = null;

  getVoices().then(voices => {
    voicesLoaded = voices;
    // Populate the dropdown with English voices first, others below.
    const en = voices.filter(v => /^en[-_]/i.test(v.lang));
    const rest = voices.filter(v => !/^en[-_]/i.test(v.lang));
    voiceSel.innerHTML =
      [...en, ...rest]
        .map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)} — ${escapeHtml(v.lang)}</option>`)
        .join('');
    const saved = pref.voiceName && voices.find(v => v.name === pref.voiceName);
    currentVoice = saved || pickDefaultVoice(voices);
    if (currentVoice) voiceSel.value = currentVoice.name;
    if (!voices.length) {
      statusEl.textContent = 'No voices available — speech synthesis disabled.';
      btnPlay.disabled = true;
    }
  });

  voiceSel.addEventListener('change', () => {
    currentVoice = voicesLoaded.find(v => v.name === voiceSel.value) || currentVoice;
    setVoicePref({ voiceName: voiceSel.value, rate: Number(rateInput.value) });
  });

  rateInput.addEventListener('input', () => {
    const r = Number(rateInput.value);
    rateVal.textContent = r.toFixed(2).replace(/\.?0+$/, '') + '×';
    setVoicePref({ voiceName: voiceSel.value || null, rate: r });
  });

  function setPlaying(state) {
    // state: 'idle' | 'playing' | 'paused'
    btnPlay.hidden   = state !== 'idle';
    btnPause.hidden  = state !== 'playing';
    btnResume.hidden = state !== 'paused';
    btnStop.hidden   = state === 'idle';
  }

  function clearHighlights() {
    root.querySelectorAll('[data-listen-card]').forEach(el => el.classList.remove('fnd-listen-active'));
  }

  btnPlay.addEventListener('click', () => {
    const queue = extractListenable(f);
    if (!queue.length) {
      statusEl.textContent = 'Nothing to read on this page.';
      return;
    }
    if (activeController) activeController.stop();
    // Auto-expand every hands-on answer panel so the reader can follow
    // along while Listen narrates the Q & A.
    root.querySelectorAll('.handson-answer.hidden').forEach(el => el.classList.remove('hidden'));
    root.querySelectorAll('[data-action="show-answer"]').forEach(btn => {
      btn.textContent = 'Hide model answer';
    });
    activeController = play(queue, {
      voice: currentVoice,
      rate: Number(rateInput.value) || 1.0,
      onChunk: (i, chunk) => {
        statusEl.textContent = `Reading: ${chunk.label} (${i + 1}/${queue.length})`;
        clearHighlights();
        const card = root.querySelector(`[data-listen-card="${chunk.cardKey}"]`);
        if (card) card.classList.add('fnd-listen-active');
      },
      onEnd: () => {
        statusEl.textContent = 'Done.';
        clearHighlights();
        setPlaying('idle');
      },
    });
    setPlaying('playing');
  });

  btnPause.addEventListener('click', () => {
    if (!activeController) return;
    activeController.pause();
    setPlaying('paused');
    statusEl.textContent = statusEl.textContent.replace('Reading:', 'Paused:');
  });

  btnResume.addEventListener('click', () => {
    if (!activeController) return;
    activeController.resume();
    setPlaying('playing');
    statusEl.textContent = statusEl.textContent.replace('Paused:', 'Reading:');
  });

  btnStop.addEventListener('click', () => {
    if (activeController) { activeController.stop(); activeController = null; }
    clearHighlights();
    statusEl.textContent = 'Stopped.';
    setPlaying('idle');
  });
}

// Global hashchange guard: if the user navigates away from a Foundation
// page mid-narration, kill the voice immediately.
if (typeof window !== 'undefined' && !window.__fndVoiceHookInstalled) {
  window.__fndVoiceHookInstalled = true;
  window.addEventListener('hashchange', () => {
    cancelAll();
    if (activeController) { activeController.stop(); activeController = null; }
  });
}
