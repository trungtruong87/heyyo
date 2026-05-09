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
