// safeStorage — wraps localStorage with an in-memory fallback so the app
// keeps working in private-browsing modes / sandboxed iframes that throw
// when accessing localStorage. The original devops-hub-FINAL.html had a
// self-delegation bug (it called itself instead of localStorage), which
// silently broke persistence; this version actually persists.

const memory = new Map();

let localOk = false;
try {
  const probeKey = '__dsHub_probe__';
  window.localStorage.setItem(probeKey, '1');
  window.localStorage.removeItem(probeKey);
  localOk = true;
} catch {
  localOk = false;
}

export const storage = {
  get(key) {
    if (localOk) {
      try { return window.localStorage.getItem(key); } catch { /* fall through */ }
    }
    return memory.has(key) ? memory.get(key) : null;
  },
  set(key, value) {
    if (localOk) {
      try { window.localStorage.setItem(key, value); return; } catch { /* fall through */ }
    }
    memory.set(key, String(value));
  },
  remove(key) {
    if (localOk) {
      try { window.localStorage.removeItem(key); return; } catch { /* fall through */ }
    }
    memory.delete(key);
  },
  // JSON helpers — most callers want structured data
  getJSON(key, fallback = null) {
    const raw = this.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },
  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },
};

// Per-domain helpers used by pages that need persistence.
const PLAN_DONE_KEY = 'dsHub_planDone';
const VISITED_KEY   = 'dsHub_visited';
const FC_KNOWN_KEY  = 'dsHub_fcKnown';
const QUIZ_BEST_KEY = 'dsHub_quizBest';
const THEME_KEY     = 'dsHub_theme';

export function getPlanDone()  { return new Set(storage.getJSON(PLAN_DONE_KEY, [])); }
export function setPlanDone(s) { storage.setJSON(PLAN_DONE_KEY, Array.from(s)); }

export function getVisited()  { return new Set(storage.getJSON(VISITED_KEY, [])); }
export function markVisited(route) {
  const s = getVisited();
  s.add(route);
  storage.setJSON(VISITED_KEY, Array.from(s));
}

export function getFcKnown()  { return new Set(storage.getJSON(FC_KNOWN_KEY, [])); }
export function setFcKnown(s) { storage.setJSON(FC_KNOWN_KEY, Array.from(s)); }

export function getQuizBest()  { return storage.getJSON(QUIZ_BEST_KEY, {}); }
export function setQuizBest(v) { storage.setJSON(QUIZ_BEST_KEY, v); }

export function getTheme()  { return storage.get(THEME_KEY); }
export function setTheme(t) { t == null ? storage.remove(THEME_KEY) : storage.set(THEME_KEY, t); }

// New rewrite — Foundations / Tickets / Snippets / Explain-it-back
const FND_DONE_KEY    = 'dsHub_fndDone';
const TKT_DONE_KEY    = 'dsHub_tktDone';
const SNIPPETS_KEY    = 'dsHub_snippets';
const EXPLAIN_KEY     = 'dsHub_explainBack';

export function getFndDone()  { return new Set(storage.getJSON(FND_DONE_KEY, [])); }
export function setFndDone(s) { storage.setJSON(FND_DONE_KEY, Array.from(s)); }

export function getTktDone()  { return new Set(storage.getJSON(TKT_DONE_KEY, [])); }
export function setTktDone(s) { storage.setJSON(TKT_DONE_KEY, Array.from(s)); }

// Snippets are stored as an array of { id, ts, source, kind, title, body }.
export function getSnippets() { return storage.getJSON(SNIPPETS_KEY, []); }
export function addSnippet(snip) {
  const arr = getSnippets();
  arr.unshift({ id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                ts: new Date().toISOString(), ...snip });
  storage.setJSON(SNIPPETS_KEY, arr);
}
export function deleteSnippet(id) {
  const arr = getSnippets().filter(s => s.id !== id);
  storage.setJSON(SNIPPETS_KEY, arr);
}
export function clearSnippets() { storage.remove(SNIPPETS_KEY); }

// Explain-it-back: keyed by concept slug. The value is the user's own paragraph.
export function getExplain(key) {
  const all = storage.getJSON(EXPLAIN_KEY, {});
  return all[key] || '';
}
export function setExplain(key, value) {
  const all = storage.getJSON(EXPLAIN_KEY, {});
  if (value && value.trim()) all[key] = value;
  else delete all[key];
  storage.setJSON(EXPLAIN_KEY, all);
}
