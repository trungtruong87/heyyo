// KQL Practice. Three pieces:
//   - left: clickable table browser (schemas)
//   - top: current exercise prompt
//   - main: query editor + results panel
//
// The query engine is intentionally small — it supports the exact pipe
// operators used by the 10 bundled exercises (where, project, summarize,
// count, take, order by, isnull, ago()).

import { html, escapeHtml, copyToClipboard } from '../../core/ui.js';
import { KQL_DATA, KQL_SCHEMA, KQL_EXERCISES } from '../../data/kql.js';

export const meta = { title: 'KQL Practice', cloud: 'azure' };

let exerciseIdx = 0;

export function render() {
  exerciseIdx = 0;
  return html`
    <div class="page-inner">
      <div class="ph">
        <div class="ph-meta"><span class="badge-azure">Azure</span></div>
        <h1>🔍 KQL Practice</h1>
        <p>Write Kusto queries against three sample Azure tables. Work through the 10 exercises — hint and solution available on each.</p>
      </div>

      <div class="exercise-bar" id="kql-exercise"></div>

      <div class="grid-2">
        <div class="card">
          <div class="panel-title pt-azure">Sample tables</div>
          <div class="data-browser" id="kql-browser"></div>
          <div style="margin-top:1rem;font-size:11px;color:var(--text3)">Click a table name to expand its columns.</div>
        </div>
        <div class="card">
          <div class="panel-title pt-azure">Query editor</div>
          <textarea class="code-editor" id="kql-input" rows="9" spellcheck="false" placeholder="SecurityAlert | take 10"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="btn btn-azure" id="kql-run">▶ Run query</button>
            <button class="btn btn-sm" id="kql-hint-btn">💡 Hint</button>
            <button class="btn btn-sm" id="kql-solution">Show solution</button>
            <button class="btn btn-sm" id="kql-clear">Clear</button>
          </div>
          <div class="kql-hint-box" id="kql-hint"></div>
        </div>
      </div>

      <div class="card" id="kql-results-panel" style="display:none;margin-top:10px">
        <div class="panel-title pt-azure">Results</div>
        <div id="kql-results"></div>
      </div>

      <div class="btn-row" style="margin-top:1rem">
        <button class="btn" id="kql-prev">◀ Previous exercise</button>
        <button class="btn btn-azure" id="kql-next">Next exercise ▶</button>
      </div>
    </div>
  `;
}

export function mount(root) {
  paintBrowser(root);
  paintExercise(root);

  root.querySelector('#kql-run').addEventListener('click', () => runQuery(root));
  root.querySelector('#kql-hint-btn').addEventListener('click', () => {
    root.querySelector('#kql-hint').classList.toggle('show');
  });
  root.querySelector('#kql-solution').addEventListener('click', () => {
    root.querySelector('#kql-input').value = KQL_EXERCISES[exerciseIdx].solution;
  });
  root.querySelector('#kql-clear').addEventListener('click', () => {
    root.querySelector('#kql-input').value = '';
    root.querySelector('#kql-results-panel').style.display = 'none';
  });
  root.querySelector('#kql-prev').addEventListener('click', () => {
    exerciseIdx = Math.max(0, exerciseIdx - 1); paintExercise(root);
  });
  root.querySelector('#kql-next').addEventListener('click', () => {
    exerciseIdx = Math.min(KQL_EXERCISES.length - 1, exerciseIdx + 1); paintExercise(root);
  });
}

function paintBrowser(root) {
  const wrap = root.querySelector('#kql-browser');
  wrap.innerHTML = Object.keys(KQL_SCHEMA).map(tbl => `
    <div>
      <div class="kql-tbl-name" data-tbl="${tbl}">📊 ${tbl}</div>
      <div class="kql-tbl-cols" data-tbl-cols="${tbl}">
        ${KQL_SCHEMA[tbl].map(c => `<div>└ ${escapeHtml(c)}</div>`).join('')}
      </div>
    </div>
  `).join('');
  wrap.querySelectorAll('.kql-tbl-name').forEach(el => {
    el.addEventListener('click', () => {
      const cols = wrap.querySelector(`[data-tbl-cols="${el.dataset.tbl}"]`);
      el.classList.toggle('open');
      cols.classList.toggle('show');
    });
  });
}

function paintExercise(root) {
  const ex = KQL_EXERCISES[exerciseIdx];
  root.querySelector('#kql-exercise').innerHTML = `
    <div class="ex-title">Exercise ${exerciseIdx + 1} of ${KQL_EXERCISES.length}: ${escapeHtml(ex.title)}</div>
    <div class="ex-desc">${escapeHtml(ex.desc)}</div>
    <div class="ex-progress">${exerciseIdx + 1} / ${KQL_EXERCISES.length} · use the hint or solution buttons if you get stuck</div>
  `;
  root.querySelector('#kql-hint').textContent = '💡 Hint: ' + ex.hint;
  root.querySelector('#kql-hint').classList.remove('show');
  root.querySelector('#kql-input').value = '';
  root.querySelector('#kql-results-panel').style.display = 'none';
}

// ─────────────────────────────────────────────────────────────
// Tiny KQL engine — handles the operators used by the exercises.
// ─────────────────────────────────────────────────────────────
function runQuery(root) {
  const input = root.querySelector('#kql-input').value.trim();
  const panel = root.querySelector('#kql-results-panel');
  const out = root.querySelector('#kql-results');
  panel.style.display = 'block';
  if (!input) { out.innerHTML = '<div style="font-size:13px;color:var(--text3)">Type a query and click Run.</div>'; return; }

  try {
    const result = executeKQL(input);
    if (result.error) { out.innerHTML = `<div class="warn-box">⚠️ ${escapeHtml(result.error)}</div>`; return; }
    if (!result.rows.length) { out.innerHTML = '<div style="font-size:13px;color:var(--text3)">No rows returned.</div>'; return; }
    const cols = Object.keys(result.rows[0]);
    out.innerHTML = `
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">${result.rows.length} record${result.rows.length === 1 ? '' : 's'}</div>
      <div style="overflow-x:auto"><table class="sim-table">
        <thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
        <tbody>${result.rows.map(r => `<tr>${cols.map(c => `<td>${formatVal(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
  } catch (e) {
    out.innerHTML = `<div class="warn-box">⚠️ ${escapeHtml(e.message)}</div>`;
  }
}

function formatVal(v) {
  if (v == null) return '<span style="color:var(--text3)">null</span>';
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return escapeHtml(s.length > 80 ? s.slice(0, 77) + '…' : s);
  }
  return escapeHtml(String(v));
}

function executeKQL(query) {
  // Strip line comments, split on lines and pipes.
  const lines = query.split(/\r?\n/).map(l => l.replace(/\/\/.*$/, '').trim()).filter(Boolean);
  if (!lines.length) return { rows: [] };
  const tableName = lines[0];
  const data = KQL_DATA[tableName];
  if (!data) return { error: `Table "${tableName}" not found. Available: ${Object.keys(KQL_DATA).join(', ')}` };

  let rows = JSON.parse(JSON.stringify(data));
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (!line.startsWith('|')) continue;
    line = line.slice(1).trim();
    rows = applyOp(rows, line);
    if (rows && rows.error) return rows;
  }
  return { rows };
}

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function applyOp(rows, op) {
  if (op.startsWith('where ')) return rows.filter(r => evalWhere(r, op.slice(6)));
  if (op.startsWith('project ')) {
    const exprs = splitArgs(op.slice(8));
    return rows.map(r => {
      const out = {};
      exprs.forEach(e => {
        const m = e.match(/^([\w.]+)\s*=\s*(.+)$/);   // alias = expression
        if (m) out[m[1]] = get(r, m[2].trim());
        else   out[e]   = get(r, e);
      });
      return out;
    });
  }
  if (op.startsWith('take ') || op.startsWith('limit ')) {
    const n = parseInt(op.split(/\s+/)[1], 10);
    return rows.slice(0, n);
  }
  if (op.startsWith('order by ')) {
    const m = op.slice(9).match(/^([\w.]+)\s*(asc|desc)?/i);
    if (!m) return rows;
    const field = m[1], dir = (m[2] || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    return rows.slice().sort((a, b) => {
      const av = get(a, field), bv = get(b, field);
      if (av == null) return 1; if (bv == null) return -1;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }
  if (op.startsWith('summarize ')) {
    const body = op.slice(10);
    const byIdx = body.toLowerCase().lastIndexOf(' by ');
    const aggPart = byIdx === -1 ? body : body.slice(0, byIdx);
    const byPart  = byIdx === -1 ? null : body.slice(byIdx + 4);
    const aggs = splitArgs(aggPart);   // alias = count() / count() etc.
    const groups = byPart ? splitArgs(byPart) : [];
    const buckets = new Map();
    rows.forEach(r => {
      const key = groups.map(g => JSON.stringify(get(r, g))).join('||');
      const list = buckets.get(key) || [];
      list.push(r);
      buckets.set(key, list);
    });
    const out = [];
    buckets.forEach((bucketRows, key) => {
      const row = {};
      groups.forEach((g, i) => row[g] = JSON.parse((key.split('||')[i] || '"null"')));
      aggs.forEach(a => {
        const m = a.match(/^([\w.]+)\s*=\s*(\w+)\(\s*\)\s*$/) || a.match(/^(\w+)\(\s*\)\s*$/);
        if (m) {
          const alias = m[3] ? m[1] : (m[1].endsWith('count') ? 'Count' : m[1]);
          const fn    = m[2] || m[1];
          if (fn === 'count') row[alias] = bucketRows.length;
          else                row[alias] = bucketRows.length;
        }
      });
      out.push(row);
    });
    return out;
  }
  if (op.startsWith('count')) return [{ Count: rows.length }];
  if (op.startsWith('mv-expand ')) {
    // very small subset: mv-expand x = properties.array
    const m = op.slice(10).match(/^([\w.]+)\s*=\s*([\w.]+)/) || op.slice(10).match(/^([\w.]+)$/);
    if (!m) return rows;
    const alias = m[1]; const path = m[2] || m[1];
    const out = [];
    rows.forEach(r => {
      const arr = get(r, path);
      if (Array.isArray(arr)) arr.forEach(item => out.push({ ...r, [alias]: item }));
      else out.push({ ...r, [alias]: arr });
    });
    return out;
  }
  return rows;
}

// `Resources, where, type == "..."` — parse simple boolean expressions.
function evalWhere(row, expr) {
  // and/or splits
  const orParts = splitTop(expr, /\s+or\s+/i);
  if (orParts.length > 1) return orParts.some(p => evalWhere(row, p));
  const andParts = splitTop(expr, /\s+and\s+/i);
  if (andParts.length > 1) return andParts.every(p => evalWhere(row, p));

  // isnull(x), isnotnull(x)
  let m = expr.match(/^isnull\(\s*([\w.]+)\s*\)$/i);
  if (m) return get(row, m[1]) == null;
  m = expr.match(/^isnotnull\(\s*([\w.]+)\s*\)$/i);
  if (m) return get(row, m[1]) != null;

  // x in (a,b,c)
  m = expr.match(/^([\w.]+)\s+in\s+\(([^)]*)\)$/i);
  if (m) {
    const v = get(row, m[1]);
    const list = m[2].split(',').map(s => parseLiteral(s.trim()));
    return list.some(x => x === v);
  }

  // x op y
  m = expr.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (m) {
    const left = get(row, m[1]);
    const right = parseLiteral(m[3]);
    switch (m[2]) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>':  return left >  right;
      case '<':  return left <  right;
      case '>=': return left >= right;
      case '<=': return left <= right;
    }
  }
  return false;
}

function splitTop(s, re) {
  // split only on top-level (not inside parens / strings)
  const parts = []; let depth = 0, last = 0, m;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0) {
      const tail = s.slice(i);
      const match = tail.match(re);
      if (match && match.index === 0) {
        parts.push(s.slice(last, i));
        i += match[0].length - 1;
        last = i + 1;
      }
    }
  }
  parts.push(s.slice(last));
  return parts;
}

function splitArgs(s) {
  const parts = []; let depth = 0, last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) { parts.push(s.slice(last, i).trim()); last = i + 1; }
  }
  const tail = s.slice(last).trim();
  if (tail) parts.push(tail);
  return parts;
}

function parseLiteral(s) {
  s = s.trim();
  if (s === 'true')  return true;
  if (s === 'false') return false;
  if (s === '""' || s === "''") return '';
  if (/^".*"$/.test(s) || /^'.*'$/.test(s)) return s.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}
