// SCP + IAM Policy evaluator. Two JSON editors. Type an action / resource
// and see the decision tree: SCP first, then IAM, then final outcome.

import { html, escapeHtml } from '../../core/ui.js';
import { SCP_TEMPLATES, IAM_TEMPLATES } from '../../data/scp.js';

export const meta = { title: 'SCP + IAM', cloud: 'aws' };

const ACTIONS = [
  's3:DeleteBucket','s3:GetObject','s3:PutObject',
  'ec2:RunInstances','ec2:TerminateInstances','ec2:DescribeInstances',
  'iam:CreateUser','iam:DeleteUser',
  'cloudtrail:DeleteTrail','cloudtrail:StopLogging',
];

const RESOURCES = [
  'arn:aws:s3:::production-data',
  'arn:aws:ec2:us-east-1:*:instance/i-1234',
  'arn:aws:iam::123456789012:user/some-user',
  '*',
];

function pretty(json) {
  try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; }
}

function evaluatePolicy(policy, action) {
  if (!policy || !Array.isArray(policy.Statement)) return { effect:'NoMatch', reason:'Invalid policy' };
  for (const stmt of policy.Statement) {
    const actions = Array.isArray(stmt.Action) ? stmt.Action : (stmt.Action ? [stmt.Action] : []);
    const matches = actions.some(a => a === '*' || a === action || (a.includes('*') && action.startsWith(a.split('*')[0])) || action.startsWith(a.split(':')[0] + ':') && a.endsWith(':*'));
    if (stmt.NotAction) {
      const notActions = Array.isArray(stmt.NotAction) ? stmt.NotAction : [stmt.NotAction];
      const inNot = notActions.some(a => a === action || action.startsWith(a.split(':')[0] + ':'));
      if (!inNot) return { effect: stmt.Effect, reason: `Action not in NotAction list — statement applies` };
      continue;
    }
    if (matches) return { effect: stmt.Effect, reason: `Matched action "${actions.join(', ')}"` };
  }
  return { effect:'NoMatch', reason:'No matching statement' };
}

export function render() {
  return html`
    <div class="page-inner">
      <div class="ph">
        <div class="ph-meta"><span class="badge-aws">AWS</span></div>
        <h1>🏛️ SCP + IAM evaluator</h1>
        <p>Edit both policies on the left, then pick an action and see how AWS evaluates them. <strong>Both</strong> the SCP and the IAM policy must allow an action — and an explicit SCP <strong>Deny</strong> always wins.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="panel-title pt-aws">Service Control Policy</div>
          <div class="form-row">
            <label>Load template</label>
            <select id="scp-template">
              <option value="">— Choose a template —</option>
              ${Object.entries(SCP_TEMPLATES).map(([k, t]) => `<option value="${k}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
          <textarea class="code-editor" id="scp-input" rows="10" spellcheck="false"></textarea>
        </div>
        <div class="card">
          <div class="panel-title pt-aws">IAM Policy</div>
          <div class="form-row">
            <label>Load template</label>
            <select id="iam-template">
              <option value="">— Choose a template —</option>
              ${Object.entries(IAM_TEMPLATES).map(([k, t]) => `<option value="${k}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
          <textarea class="code-editor" id="iam-input" rows="10" spellcheck="false"></textarea>
        </div>
      </div>

      <div class="card" style="margin-top:10px">
        <div class="panel-title pt-aws">Action attempt</div>
        <div class="grid-2">
          <div class="form-row">
            <label>Action</label>
            <select id="aws-action">
              ${ACTIONS.map(a => `<option value="${a}">${a}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Resource</label>
            <select id="aws-resource">
              ${RESOURCES.map(r => `<option value="${r}">${escapeHtml(r)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:10px"><button class="btn btn-aws" id="scp-evaluate">▶ Evaluate</button></div>
      </div>

      <div id="scp-result"></div>
    </div>
  `;
}

export function mount(root) {
  // pre-load first templates so the user has something to play with immediately
  const firstScp = Object.keys(SCP_TEMPLATES)[0];
  const firstIam = Object.keys(IAM_TEMPLATES)[0];
  root.querySelector('#scp-input').value = pretty(SCP_TEMPLATES[firstScp].json);
  root.querySelector('#iam-input').value = pretty(IAM_TEMPLATES[firstIam].json);
  root.querySelector('#scp-template').value = firstScp;
  root.querySelector('#iam-template').value = firstIam;

  root.querySelector('#scp-template').addEventListener('change', e => {
    const t = SCP_TEMPLATES[e.target.value];
    if (t) root.querySelector('#scp-input').value = pretty(t.json);
  });
  root.querySelector('#iam-template').addEventListener('change', e => {
    const t = IAM_TEMPLATES[e.target.value];
    if (t) root.querySelector('#iam-input').value = pretty(t.json);
  });

  root.querySelector('#scp-evaluate').addEventListener('click', () => evaluate(root));
}

function evaluate(root) {
  const action = root.querySelector('#aws-action').value;
  const resource = root.querySelector('#aws-resource').value;
  const out = root.querySelector('#scp-result');

  let scp, iam;
  try { scp = JSON.parse(root.querySelector('#scp-input').value); }
  catch (e) { return showError(out, 'SCP JSON invalid: ' + e.message); }
  try { iam = JSON.parse(root.querySelector('#iam-input').value); }
  catch (e) { return showError(out, 'IAM JSON invalid: ' + e.message); }

  const scpRes = evaluatePolicy(scp, action);
  const iamRes = evaluatePolicy(iam, action);

  const path = [
    { type:'info',  text:`Action attempted: <strong>${escapeHtml(action)}</strong> on <strong>${escapeHtml(resource)}</strong>` },
    { type: iamRes.effect === 'Allow' ? 'allow' : 'deny',
      text:`IAM policy says: <strong>${iamRes.effect}</strong>${iamRes.reason ? ' — ' + escapeHtml(iamRes.reason) : ''}` },
    { type: scpRes.effect === 'Deny' ? 'deny' : 'allow',
      text:`SCP says: <strong>${scpRes.effect === 'Deny' ? 'DENY' : 'ALLOW'}</strong>${scpRes.reason ? ' — ' + escapeHtml(scpRes.reason) : ''}` },
  ];

  let title, cls;
  if (scpRes.effect === 'Deny') {
    title = '🔴 DENIED — by SCP'; cls = 'deny';
    path.push({ type:'deny', text:'Rule: an explicit SCP Deny <strong>always wins</strong>, regardless of what IAM allows.' });
    path.push({ type:'deny', text:'Final decision: <strong>DENIED</strong>.' });
  } else if (iamRes.effect !== 'Allow') {
    title = '🔴 DENIED — no IAM allow'; cls = 'deny';
    path.push({ type:'deny', text:'Rule: SCP does not deny, but IAM does not explicitly allow either.' });
    path.push({ type:'deny', text:'Final decision: <strong>DENIED</strong> — IAM must explicitly allow for an action to succeed.' });
  } else {
    title = '✅ ALLOWED'; cls = 'allow';
    path.push({ type:'allow', text:'Rule: SCP does not deny AND IAM explicitly allows. Both conditions met.' });
    path.push({ type:'allow', text:'Final decision: <strong>ALLOWED</strong>.' });
  }

  out.innerHTML = `
    <div class="result result-${cls}">
      <div class="result-title">${title}</div>
      <ul class="decision-path">
        ${path.map(p => `<li class="dp-${p.type}">${p.text}</li>`).join('')}
      </ul>
    </div>`;
}

function showError(out, msg) {
  out.innerHTML = `
    <div class="result result-deny">
      <div class="result-title">⚠️ ${escapeHtml(msg)}</div>
      <div class="result-body">Fix the JSON and try again.</div>
    </div>`;
}
