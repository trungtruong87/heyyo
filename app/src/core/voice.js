// voice.js — Web Speech narration for Foundation pages.
//
// Why this module exists:
//   The user studies dense compliance prose while commuting / doing chores.
//   speechSynthesis is built into every browser, free, and uses OS-installed
//   voices (offline once the voice is cached). User listens in Chrome on
//   macOS — that environment exposes the macOS system voices plus Google's,
//   all of which pronounce common cloud acronyms (AWS/SCP/IAM/OU) naturally
//   without help. We don't ship audio files.
//
// Two failure modes we engineer around:
//   1. Word-by-word robotic delivery. Cause: callers passing micro-strings,
//      OR over-aggressive acronym preprocessing forcing letter-spelling.
//      Fix: pass whole paragraphs so the synth has full prosodic context;
//      keep acronym preprocessing minimal (phonetic respelling only for
//      true words like JSON/YAML/CIDR that get mangled otherwise).
//   2. Em-dashes, "e.g.", "vs", and slash-separators cause stilted pacing
//      because Web Speech ignores or mispaces them. Fix: light prosodic
//      pre-pass that swaps them for punctuation the synth respects.

// ─── Phonetic respelling (small list, only true mispronunciations) ─────
// We DO NOT letter-space common acronyms (AWS, SCP, IAM, OU, MFA, KMS,
// VPC, etc.) — modern Chrome voices say them correctly on their own, and
// forcing "A.W.S." makes the engine spell letter-by-letter which kills
// sentence rhythm.

const ACRONYM_PATTERNS = [
  [/\bJSON\b/g,  'jay-son'],
  [/\bYAML\b/g,  'yamel'],
  [/\bCIDR\b/g,  'sider'],
  [/\bIaC\b/g,   'I a C'],
];

function expandAcronyms(s) {
  for (const [re, rep] of ACRONYM_PATTERNS) s = s.replace(re, rep);
  return s;
}

// ─── Prosodic hints — make pacing podcast-grade ────────────────────────
// Targeted substitutions that swap punctuation Web Speech ignores for
// punctuation it respects. Each transform exists because, without it,
// the synth either rushes through a beat or stalls mid-clause.

function addProsodicHints(s) {
  return s
    // Em-dash / en-dash with spaces → ellipsis. Web Speech treats em-dash
    // as a non-pause; ellipsis gives a real beat. Keep the spacing.
    .replace(/ [—–] /g, ', … ')
    // Hyphen between words (space-hyphen-space) → comma. Preserves
    // hyphenated words like "us-east-1" and "built-in" because those
    // have no surrounding spaces.
    .replace(/ - /g, ', ')
    // Common Latin abbreviations — engines often skip the period and
    // smush them into the next word.
    .replace(/\be\.g\./gi, 'for example,')
    .replace(/\bi\.e\./gi, 'that is,')
    .replace(/\betc\./gi, 'and so on')
    // "vs" / "vs." → "versus" — both spellings, optional period.
    .replace(/\bvs\.?\b/gi, 'versus')
    // Symbols read aloud — % gets silently dropped by some voices.
    .replace(/(\d)\s*%/g, '$1 percent')
    .replace(/ & /g, ' and ')
    // "/" between full words (not in URLs or short ids like us-east-1)
    // → " or ". Only when both sides are 3+ letter words.
    .replace(/([a-z]{3,})\/([a-z]{3,})/gi, '$1 or $2');
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
  return addProsodicHints(expandAcronyms(
    s.replace(/\s+/g, ' ')
     .replace(/ /g, ' ')
     .trim()
  ));
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

  // 5. Hands-on Q & A. Each step gets its own cardKey so the renderer
  // can highlight (and auto-expand the answer panel for) the active step.
  if (f.handsOn?.steps?.length) {
    queue.push({ label: 'Hands-on', text: 'Hands on. Try answering these out loud.', cardKey: 'handson' });
    f.handsOn.steps.forEach(step => {
      const cardKey = `handson-${step.label}`;
      const qText = cleanText(stripTags(step.question));
      for (const part of splitLongChunk(qText)) {
        queue.push({ label: 'Hands-on', text: `Question ${step.label}. ${part}`, cardKey });
      }
      if (step.answer) {
        const aText = cleanText(stripTags(step.answer));
        let first = true;
        for (const part of splitLongChunk(aText)) {
          queue.push({ label: 'Hands-on', text: first ? `Answer. ${part}` : part, cardKey });
          first = false;
        }
      }
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
