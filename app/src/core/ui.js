// Small UI primitives shared across all pages.

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Tagged template for HTML strings — currently a passthrough but lets editors
// syntax-highlight the strings (e.g. via es6-string-html) and gives us a
// hook to add escaping later if any user-supplied content is ever rendered.
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += values[i] == null ? '' : values[i];
  });
  return out;
}

// Provider → badge HTML.
export function badge(provider) {
  if (provider === 'aws')        return `<span class="badge-aws">AWS</span>`;
  if (provider === 'azure')      return `<span class="badge-azure">Azure</span>`;
  if (provider === 'terraform' || provider === 'tf')
                                  return `<span class="badge-tf">Terraform</span>`;
  if (provider === 'both')       return `<span class="badge-both">AWS + Azure</span>`;
  return `<span class="badge-both">General</span>`;
}

// Filter a pool of items by `provider` field. 'all' returns the full pool.
export function filtered(pool, filter) {
  if (!filter || filter === 'all') return pool;
  return pool.filter(it => it.provider === filter);
}

// Map provider → CSS class name suffix (matches sidebar active-* classes).
export const cloudClass = {
  home: 'home',
  aws: 'aws',
  azure: 'azure',
  tf: 'tf',
  terraform: 'tf',
  both: 'both',
};

// Escape HTML — used when injecting user-typed strings (e.g. KQL queries) into the DOM.
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Highlight a code example by wrapping the tokens listed in `annotations` with
// colored spans. Reuses the curated token list the data author already wrote
// for the "What's what" section — no syntax parser, no language detection,
// no dependency. Two colors: platform keywords vs your values.
//
//   text         the raw code example string
//   annotations  array of { token, type: 'keyword' | 'user', note }
//
// Returns escaped HTML with <span class="tok-keyword|tok-user"> wrappers
// around each non-overlapping match. Longest tokens win on conflict so
// "NotAction" wraps before the substring "Action" does.
export function highlightExampleHtml(text, annotations) {
  if (text == null) return '';
  if (!Array.isArray(annotations) || !annotations.length) return escapeHtml(text);

  // Tokens can be a slash-separated list ("X / Y / Z") meaning "annotate each
  // of these the same way." Split on " / " and treat each variant individually.
  const expanded = [];
  for (const ann of annotations) {
    if (!ann || !ann.token) continue;
    const parts = String(ann.token).split(/\s*\/\s*/).filter(Boolean);
    for (const t of parts) expanded.push({ token: t, type: ann.type });
  }

  // Longest-first to avoid shorter tokens winning conflicts. Find all matches,
  // claim non-overlapping ranges, then walk the text emitting segments.
  expanded.sort((a, b) => b.token.length - a.token.length);

  const ranges = []; // { start, end, type }
  const claimed = []; // [start, end] sorted by start, non-overlapping

  function overlapsClaimed(s, e) {
    for (const [cs, ce] of claimed) if (s < ce && e > cs) return true;
    return false;
  }

  for (const { token, type } of expanded) {
    let i = 0;
    while ((i = text.indexOf(token, i)) !== -1) {
      const end = i + token.length;
      if (!overlapsClaimed(i, end)) {
        claimed.push([i, end]);
        ranges.push({ start: i, end, type: type === 'keyword' ? 'keyword' : 'user' });
      }
      i = end;
    }
  }

  ranges.sort((a, b) => a.start - b.start);

  let html = '';
  let cursor = 0;
  for (const r of ranges) {
    if (cursor < r.start) html += escapeHtml(text.slice(cursor, r.start));
    const cls = r.type === 'keyword' ? 'tok-keyword' : 'tok-user';
    html += `<span class="${cls}">${escapeHtml(text.slice(r.start, r.end))}</span>`;
    cursor = r.end;
  }
  if (cursor < text.length) html += escapeHtml(text.slice(cursor));
  return html;
}

// Shuffle in-place (Fisher-Yates).
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Copy to clipboard with a visual confirmation on the clicked button.
export async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    }
  } catch {
    // clipboard API blocked; ignore silently
  }
}
