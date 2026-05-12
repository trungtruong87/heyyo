// voice.js — Web Speech narration for Foundation pages.
//
// Why this module exists:
//   The user studies dense compliance prose while commuting / doing chores.
//   speechSynthesis is built into every browser, free, and uses OS-installed
//   voices (offline once the voice is cached). On macOS, Daniel (en-GB) and
//   Tom (en-US) are male and pleasant. We don't ship audio files.
//
// Two failure modes we have to engineer around:
//   1. Word-by-word robotic delivery. Cause: callers passing micro-strings.
//      Fix: we pass whole paragraphs (or whole sentences for long ones) so
//      the synthesizer has full prosodic context — intonation, pauses,
//      sentence rhythm — exactly like a human reader.
//   2. Acronym mispronunciation ("AWS" → /ɔːz/, "IAM" → "I am").
//      Fix: pre-process text to insert periods between letters (A.W.S.),
//      which forces almost every TTS engine into letter-by-letter spelling.

// ─── Acronym normalization ─────────────────────────────────────────────
// Order matters: longest first, plural variants before singular.
// We use periods between letters because every common TTS engine treats
// "A.W.S." as a spelled-out abbreviation, whereas "AWS" gets phonetized.

const ACRONYM_PATTERNS = [
  // Plural variants first so "SCPs" doesn't get half-rewritten to "SCS"
  [/\bSCPs\b/g, 'S.C.P.s'],
  [/\bOUs\b/g,  'O.U.s'],
  [/\bMGs\b/g,  'M.G.s'],
  [/\bVMs\b/g,  'V.M.s'],
  [/\bAPIs\b/g, 'A.P.I.s'],

  [/\bAWS\b/g,  'A.W.S.'],
  [/\bSCP\b/g,  'S.C.P.'],
  [/\bIAM\b/g,  'I.A.M.'],
  [/\bOU\b/g,   'O.U.'],
  [/\bMG\b/g,   'M.G.'],
  [/\bKQL\b/g,  'K.Q.L.'],
  [/\bARG\b/g,  'A.R.G.'],
  [/\bMCSB\b/g, 'M.C.S.B.'],
  [/\bRBAC\b/g, 'R.B.A.C.'],
  [/\bMFA\b/g,  'M.F.A.'],
  [/\bKMS\b/g,  'K.M.S.'],
  [/\bVPC\b/g,  'V.P.C.'],
  [/\bSSO\b/g,  'S.S.O.'],
  [/\bCLI\b/g,  'C.L.I.'],
  [/\bSDK\b/g,  'S.D.K.'],
  [/\bJSON\b/g, 'jay-son'],
  [/\bYAML\b/g, 'yamel'],
  [/\bS3\b/g,   'S.3.'],
  [/\bEC2\b/g,  'E.C.2.'],
  [/\bp4d\b/g,  'P 4 D'],
  // Generic 2-3-letter ALL-CAPS short tokens — only inside parentheses to
  // avoid clobbering things like "OK" in regular prose.
];

function expandAcronyms(s) {
  for (const [re, rep] of ACRONYM_PATTERNS) s = s.replace(re, rep);
  return s;
}

// ─── HTML → speakable text ─────────────────────────────────────────────
// Strip tags, drop code blocks/tables (they don't narrate), expand
// acronyms, collapse whitespace. Returns either a string (single chunk)
// or [string, string, …] (multiple paragraph chunks).

function htmlToChunks(html) {
  if (!html) return [];
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Remove anything that wouldn't read well aloud.
  tmp.querySelectorAll('pre, table, .fnd-cd-table').forEach(n => n.remove());
  // Strip inline <code> contents that look JSON-like or path-like.
  tmp.querySelectorAll('code').forEach(c => {
    const t = c.textContent.trim();
    const looksTechnical = /[{}\[\];=]|::|\//.test(t) || t.length > 24;
    if (looksTechnical) c.remove();
  });

  // Pull paragraphs / list items / headings as separate chunks so the
  // engine breathes between them and we can highlight current section.
  const blocks = Array.from(tmp.querySelectorAll('p, li, h3, aside'));
  if (blocks.length === 0) {
    return [cleanText(tmp.textContent)].filter(Boolean);
  }
  return blocks
    .map(n => cleanText(n.textContent))
    .filter(t => t && t.length > 1);
}

function cleanText(s) {
  return expandAcronyms(
    s.replace(/\s+/g, ' ')
     .replace(/ /g, ' ')
     .trim()
  );
}

// Some voices stall on utterances over ~500 chars. Split on sentence
// boundaries when needed; never split mid-word.
function splitLongChunk(s, maxLen = 500) {
  if (s.length <= maxLen) return [s];
  const out = [];
  let buf = '';
  for (const sent of s.split(/(?<=[.!?])\s+/)) {
    if ((buf + ' ' + sent).trim().length > maxLen) {
      if (buf) out.push(buf);
      buf = sent;
    } else {
      buf = buf ? buf + ' ' + sent : sent;
    }
  }
  if (buf) out.push(buf);
  return out;
}

// ─── Extract listenable content from a Foundation ──────────────────────
// Returns flat queue: [{label, text, cardKey}, …]
// cardKey is a string the renderer can use to highlight the active card.

export function extractListenable(f) {
  const queue = [];

  // 1. Plain-English intro + mnemonic
  if (f.intro?.plain) {
    const plain = cleanText(stripTags(f.intro.plain));
    for (const part of splitLongChunk(plain)) {
      queue.push({ label: 'Plain English', text: part, cardKey: 'intro' });
    }
  }
  if (f.intro?.mnemonic) {
    queue.push({
      label: 'Plain English',
      text: 'Remember: ' + cleanText(f.intro.mnemonic),
      cardKey: 'intro',
    });
  }

  // 2. Concept dive — prose only, code/tables stripped
  if (f.conceptDive?.body) {
    const title = f.conceptDive.title ? cleanText(f.conceptDive.title) : '';
    if (title) {
      queue.push({ label: 'Concept dive', text: 'Concept dive. ' + title + '.', cardKey: 'concept' });
    }
    for (const para of htmlToChunks(f.conceptDive.body)) {
      for (const part of splitLongChunk(para)) {
        queue.push({ label: 'Concept dive', text: part, cardKey: 'concept' });
      }
    }
  }

  // 3. Recap bullets
  if (Array.isArray(f.recap) && f.recap.length) {
    queue.push({ label: 'Recap', text: 'Recap. What you should now believe.', cardKey: 'recap' });
    f.recap.forEach((line, i) => {
      queue.push({
        label: 'Recap',
        text: `Point ${i + 1}. ${cleanText(stripTags(line))}`,
        cardKey: 'recap',
      });
    });
  }

  // 4. Meeting talking points
  if (Array.isArray(f.talkingPoints) && f.talkingPoints.length) {
    queue.push({ label: 'Talking points', text: 'Meeting talking points.', cardKey: 'talking' });
    f.talkingPoints.forEach((line, i) => {
      queue.push({
        label: 'Talking points',
        text: `Point ${i + 1}. ${cleanText(stripTags(line))}`,
        cardKey: 'talking',
      });
    });
  }

  return queue;
}

function stripTags(s) {
  const tmp = document.createElement('div');
  tmp.innerHTML = s;
  return tmp.textContent;
}

// ─── Voice selection ───────────────────────────────────────────────────

let voicesCache = null;

export function getVoices() {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve([]); return; }
    const synth = window.speechSynthesis;
    const v = synth.getVoices();
    if (v && v.length) { voicesCache = v; resolve(v); return; }
    // Some browsers load voices asynchronously after first call.
    let settled = false;
    synth.addEventListener('voiceschanged', function once() {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', once);
      voicesCache = synth.getVoices();
      resolve(voicesCache);
    });
    // Fallback timeout — return whatever we have after 700ms.
    setTimeout(() => {
      if (settled) return;
      settled = true;
      voicesCache = synth.getVoices();
      resolve(voicesCache || []);
    }, 700);
  });
}

const FEMALE_HINTS = ['female', 'samantha', 'karen', 'victoria', 'tessa', 'moira', 'allison', 'ava', 'susan', 'zoe', 'serena'];

export function pickDefaultVoice(voices) {
  if (!voices || !voices.length) return null;
  const en = voices.filter(v => /^en[-_]/i.test(v.lang));
  const pool = en.length ? en : voices;

  // Preferred specific male voices (macOS / common Windows / Linux espeak).
  const preferOrder = ['Daniel', 'Tom', 'Aaron', 'Fred', 'Reed', 'Rocko', 'Albert', 'Bruce', 'Lee', 'Oliver', 'George', 'James', 'Arthur', 'Microsoft David', 'Microsoft Mark', 'Google UK English Male', 'Google US English'];
  for (const name of preferOrder) {
    const hit = pool.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
    if (hit) return hit;
  }
  // Generic: any name containing "male" but not "female".
  const maleHit = pool.find(v => /male/i.test(v.name) && !/female/i.test(v.name));
  if (maleHit) return maleHit;
  // Avoid obviously-female names.
  const neutral = pool.find(v => !FEMALE_HINTS.some(h => v.name.toLowerCase().includes(h)));
  return neutral || pool[0];
}

// ─── Playback controller ───────────────────────────────────────────────

export function play(queue, opts = {}) {
  if (!('speechSynthesis' in window) || !queue.length) {
    opts.onEnd?.();
    return { pause() {}, resume() {}, stop() {}, isActive: () => false };
  }
  const synth = window.speechSynthesis;
  synth.cancel(); // clear any previous queue

  let index = 0;
  let stopped = false;

  function speakNext() {
    if (stopped) return;
    if (index >= queue.length) { opts.onEnd?.(); return; }
    const chunk = queue[index];
    const u = new SpeechSynthesisUtterance(chunk.text);
    if (opts.voice) u.voice = opts.voice;
    if (opts.lang) u.lang = opts.lang;
    u.rate  = clamp(opts.rate ?? 1.0, 0.5, 2.0);
    u.pitch = 1.0;
    u.volume = 1.0;

    u.onstart = () => opts.onChunk?.(index, chunk);
    u.onend = () => {
      if (stopped) return;
      index += 1;
      speakNext();
    };
    u.onerror = (e) => {
      // Some browsers fire "interrupted" when we cancel — that's fine.
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('speechSynthesis error:', e.error);
      index += 1;
      speakNext();
    };
    synth.speak(u);
  }

  speakNext();

  return {
    pause()  { try { synth.pause(); } catch {} },
    resume() { try { synth.resume(); } catch {} },
    stop()   { stopped = true; try { synth.cancel(); } catch {} },
    isActive: () => !stopped && index < queue.length,
  };
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Convenience: kill any in-flight narration (e.g., on route change).
export function cancelAll() {
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}
