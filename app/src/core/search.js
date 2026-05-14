// Cmd-K global search. Builds a flat index from the new content layers
// (FOUNDATIONS, TICKETS, MAPPING, GLOSSARY, DECISIONS) plus the NAV route
// table at init time, and shows a modal that filters live as the user types.

import { $, $$, escapeHtml } from './ui.js';
import { navigate } from './router.js';

let index = [];           // [{ title, sub, route, kind, terms }]
let modal, input, results, empty;
let focusIdx = 0;
let currentMatches = [];

export async function initSearch(NAV) {
  // Lazy-load data so the search index doesn't block first paint.
  const [{ FOUNDATIONS }, { TICKETS }, { MAPPING, GLOSSARY }, { DECISIONS }, { ARTIFACTS }] = await Promise.all([
    import('../data/foundations.js').catch(() => ({ FOUNDATIONS: [] })),
    import('../data/tickets.js').catch(()       => ({ TICKETS:     [] })),
    import('../data/mapping.js').catch(()       => ({ MAPPING: [], GLOSSARY: [] })),
    import('../data/decisions.js').catch(()     => ({ DECISIONS:   [] })),
    import('../data/artifacts.js').catch(()     => ({ ARTIFACTS:   {} })),
  ]);

  index = [];

  // Routes (sidebar + mobile-nav) — every page is searchable by name.
  NAV.forEach(section => {
    section.items.forEach(item => {
      index.push({
        title: item.label,
        sub:   section.section,
        route: item.route,
        kind:  'page',
        terms: (item.label + ' ' + section.section).toLowerCase(),
      });
    });
  });

  // Foundations — title + intro + every panel + recap + talking points.
  FOUNDATIONS.forEach(f => {
    const panelText = (f.panels || []).map(p =>
      `${p.service} ${p.plain} ${(p.detail || []).join(' ')}`).join(' ');
    const haystack = [
      f.group, f.title, f.subtitle,
      f.intro?.plain, f.intro?.mnemonic,
      panelText,
      f.conceptDive?.title, f.conceptDive?.body,
      (f.fieldNotes || []).join(' '),
      (f.recap || []).join(' '),
      (f.talkingPoints || []).join(' '),
    ].filter(Boolean).join(' ');
    index.push({
      title: f.title,
      sub:   `Foundations · ${f.group || ''} · ${f.subtitle}`,
      route: `/foundations/${f.id}`,
      kind:  'foundation',
      terms: haystack.toLowerCase(),
    });
  });

  // Tickets — full content searchable.
  TICKETS.forEach(t => {
    const haystack = [
      t.num, t.title, t.topic,
      t.brief?.plain, t.brief?.stakes, t.brief?.reporter,
      t.investigate?.summary, (t.investigate?.steps || []).join(' '),
      t.decide?.question, (t.decide?.options || []).map(o => o.label + ' ' + o.explain).join(' '),
      t.build?.prompt, t.build?.starter, t.build?.sample,
      (t.recap || []).join(' '),
      (t.talkingPoints || []).join(' '),
    ].filter(Boolean).join(' ');
    index.push({
      title: `${t.num}: ${t.title}`,
      sub:   `Ticket · ${t.topic}`,
      route: `/tickets/${t.id.toLowerCase()}`,
      kind:  'ticket',
      terms: haystack.toLowerCase(),
    });
  });

  // Mapping rows — searchable by AWS service, Azure service, concept.
  MAPPING.forEach(r => {
    index.push({
      title: r.concept,
      sub:   `Mapping · ${r.aws.service} ↔ ${r.azure.service}`,
      route: `/reference/wiki`,
      kind:  'mapping',
      terms: `${r.concept} ${r.plain} ${r.aws.service} ${r.azure.service} ${r.differs || ''}`.toLowerCase(),
    });
  });

  // Glossary terms — one entry per term.
  GLOSSARY.forEach(g => {
    index.push({
      title: g.term,
      sub:   `Glossary · ${g.cloud === 'aws' ? 'AWS' : g.cloud === 'azure' ? 'Azure' : g.cloud === 'tf' ? 'Terraform' : 'AWS + Azure'}`,
      route: `/reference/wiki`,
      kind:  'glossary',
      terms: `${g.term} ${g.plain} ${g.detail}`.toLowerCase(),
    });
  });

  // Artifact map — one search entry per artifact type so Cmd-K finds them.
  Object.entries(ARTIFACTS).forEach(([slug, a]) => {
    index.push({
      title: a.name,
      sub:   `Artifact · ${a.extension}`,
      route: `/reference/artifact-map#${slug}`,
      kind:  'artifact',
      terms: `${slug} ${a.name} ${a.extension} ${a.livesIn} ${a.runHow} ${(a.deploy || []).join(' ')} ${a.notes || ''}`.toLowerCase(),
    });
  });

  // Decision trees.
  DECISIONS.forEach(d => {
    const haystack = [
      d.title, d.intro,
      (d.branches || []).map(b => b.q).join(' '),
      (d.examples || []).map(e => e.case + ' ' + e.answer).join(' '),
    ].filter(Boolean).join(' ');
    index.push({
      title: d.title,
      sub:   `Decision tree`,
      route: `/reference/decisions`,
      kind:  'decision',
      terms: haystack.toLowerCase(),
    });
  });

  modal   = $('#search-modal');
  input   = $('#search-input');
  results = $('#search-results');
  empty   = $('#search-empty');

  if (!modal) return;

  input.addEventListener('input', () => render(input.value.trim()));
  input.addEventListener('keydown', onKey);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  results.addEventListener('click', e => {
    const li = e.target.closest('li[data-route]');
    if (li) { navigate(li.dataset.route); close(); }
  });
}

function render(query) {
  const q = query.toLowerCase();
  if (!q) {
    currentMatches = [];
    results.innerHTML = '';
    empty.textContent = 'Start typing to search…';
    empty.style.display = 'block';
    return;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  currentMatches = index
    .map(item => ({ item, score: scoreItem(item, tokens) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(x => x.item);

  if (currentMatches.length === 0) {
    results.innerHTML = '';
    empty.textContent = 'No matches.';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  focusIdx = 0;
  results.innerHTML = currentMatches.map((m, i) => `
    <li data-route="${m.route}" class="${i === 0 ? 'focused' : ''}">
      <span class="sr-title">${escapeHtml(m.title)}</span>
      <span class="sr-meta"><span class="sr-kind">${m.kind}</span> · ${escapeHtml(m.sub)}</span>
    </li>
  `).join('');
}

function scoreItem(item, tokens) {
  let s = 0;
  for (const t of tokens) {
    if (item.terms.includes(t)) s += 1;
    if (item.title.toLowerCase().includes(t)) s += 2;   // title hits beat body hits
  }
  // require all tokens to match somewhere
  return tokens.every(t => item.terms.includes(t)) ? s : 0;
}

function onKey(e) {
  if (e.key === 'Escape') { close(); return; }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusIdx = Math.min(focusIdx + 1, currentMatches.length - 1);
    updateFocus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusIdx = Math.max(focusIdx - 1, 0);
    updateFocus();
  } else if (e.key === 'Enter' && currentMatches[focusIdx]) {
    e.preventDefault();
    navigate(currentMatches[focusIdx].route);
    close();
  }
}

function updateFocus() {
  $$('#search-results li').forEach((li, i) => {
    li.classList.toggle('focused', i === focusIdx);
    if (i === focusIdx) li.scrollIntoView({ block: 'nearest' });
  });
}

export function openSearch() {
  if (!modal) return;
  modal.classList.add('open');
  input.value = '';
  render('');
  input.focus();
}

export function close() {
  modal?.classList.remove('open');
}
