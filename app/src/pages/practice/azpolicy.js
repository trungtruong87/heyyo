// Azure Policy effect simulator. Pick a resource type + property + condition,
// pick an Effect, then evaluate against a synthetic resource you configure.

import { html, escapeHtml } from '../../core/ui.js';

export const meta = { title: 'Azure Policy', cloud: 'azure' };

const AZ_PROPS = {
  storageaccounts: {
    allowBlobPublicAccess:      ['true','false'],
    supportsHttpsTrafficOnly:   ['true','false'],
    location:                   ['eastus','westus','eastus2','westeurope'],
    'tags.Owner':               ['TeamA','TeamB','','Ops'],
  },
  virtualmachines: {
    'storageProfile.osDisk.encryptionSettings.enabled': ['true','false'],
    location:        ['eastus','westus','eastus2','westeurope'],
    'tags.Owner':    ['TeamA','TeamB','','Ops'],
    'tags.Environment': ['Production','Dev','Staging',''],
  },
  networksecuritygroups: {
    location:     ['eastus','westus','eastus2'],
    'tags.Owner': ['TeamA','TeamB',''],
  },
  keyvaults: {
    enableSoftDelete:       ['true','false'],
    enablePurgeProtection:  ['true','false'],
    location:               ['eastus','westus'],
  },
};

const EFFECTS = ['Audit','Deny','Append','Modify','DeployIfNotExists'];

let state = { resType: 'storageaccounts', property: '', value: 'true', effect: 'Audit', enforcement: 'Default', actual: 'true' };

export function render() {
  state = { resType: 'storageaccounts', property: 'allowBlobPublicAccess', value: 'true', effect: 'Audit', enforcement: 'Default', actual: 'true' };
  return html`
    <div class="page-inner">
      <div class="ph">
        <div class="ph-meta"><span class="badge-azure">Azure</span></div>
        <h1>📋 Azure Policy effect simulator</h1>
        <p>Build a policy condition, pick an effect, then evaluate against a synthetic resource. See the decision path that leads to <em>compliant</em>, <em>denied</em>, <em>audited</em>, or <em>modified</em>.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="panel-title pt-azure">Policy definition</div>
          <div class="form-row">
            <label>Resource type</label>
            <select id="az-res-type">
              ${Object.keys(AZ_PROPS).map(k => `<option value="${k}">microsoft.${k.includes('account') ? 'storage' : k.includes('virtualmach') ? 'compute' : k.includes('network') ? 'network' : 'keyvault'}/${k}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Property to check</label>
            <select id="az-property"></select>
          </div>
          <div class="form-row">
            <label>Condition value</label>
            <select id="az-value"></select>
          </div>
          <div class="form-row">
            <label>Effect</label>
            <select id="az-effect">
              ${EFFECTS.map(e => `<option value="${e}">${e}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Enforcement mode</label>
            <select id="az-enforcement">
              <option value="Default">Default (enforce)</option>
              <option value="DoNotEnforce">DoNotEnforce (audit-only)</option>
            </select>
          </div>
        </div>

        <div class="card">
          <div class="panel-title pt-azure">Resource being evaluated</div>
          <div class="form-row">
            <label>Resource name</label>
            <input type="text" id="az-res-name" value="test-resource-01">
          </div>
          <div id="az-resource-props"></div>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:1rem 0">
        <button class="btn btn-azure" id="az-evaluate">▶ Evaluate</button>
      </div>

      <div id="az-result"></div>
    </div>
  `;
}

export function mount(root) {
  const typeSel = root.querySelector('#az-res-type');
  const propSel = root.querySelector('#az-property');
  const valSel  = root.querySelector('#az-value');

  function refreshProps() {
    const props = AZ_PROPS[typeSel.value] || {};
    propSel.innerHTML = Object.keys(props).map(p => `<option value="${p}">${escapeHtml(p)}</option>`).join('');
    refreshValues();
    paintActualPropForm();
  }
  function refreshValues() {
    const vals = (AZ_PROPS[typeSel.value] || {})[propSel.value] || ['true','false'];
    valSel.innerHTML = vals.map(v => `<option value="${v}">${v || '(empty)'}</option>`).join('');
  }
  function paintActualPropForm() {
    const props = AZ_PROPS[typeSel.value] || {};
    const wrap = root.querySelector('#az-resource-props');
    wrap.innerHTML = Object.entries(props).map(([p, vals]) => {
      const id = 'az-actual-' + p.replace(/\./g, '-');
      return `
        <div class="form-row">
          <label>${escapeHtml(p)}</label>
          <select id="${id}" data-prop="${p}">
            ${vals.map(v => `<option value="${v}">${v || '(empty)'}</option>`).join('')}
          </select>
        </div>`;
    }).join('');
  }

  typeSel.addEventListener('change', refreshProps);
  propSel.addEventListener('change', refreshValues);
  refreshProps();

  root.querySelector('#az-evaluate').addEventListener('click', () => evaluate(root));
}

function evaluate(root) {
  const type = root.querySelector('#az-res-type').value;
  const prop = root.querySelector('#az-property').value;
  const condVal = root.querySelector('#az-value').value;
  const effect = root.querySelector('#az-effect').value;
  const enforcement = root.querySelector('#az-enforcement').value;
  const actualEl = root.querySelector('#az-actual-' + prop.replace(/\./g, '-'));
  const actual = actualEl ? actualEl.value : '';
  const matches = String(actual) === String(condVal);

  const path = [];
  path.push({ type:'info', text:`Resource type: <strong>microsoft.*/${type}</strong>` });
  path.push({ type:'info', text:`Condition: <strong>${escapeHtml(prop)}</strong> equals <strong>${escapeHtml(condVal)}</strong>` });
  path.push({ type:'info', text:`Resource has <strong>${escapeHtml(prop)}</strong> = <strong>${escapeHtml(actual)}</strong>` });
  path.push({ type: matches ? 'warn' : 'allow', text:`Condition matches: <strong>${matches ? 'YES' : 'NO'}</strong>` });

  let title = '', cls = 'neutral', body = '';
  if (!matches) {
    title = '✅ Compliant'; cls = 'allow';
    body = 'The resource does not match the policy condition, so the effect is not applied.';
    path.push({ type:'allow', text:'Policy condition not met → effect skipped → resource is COMPLIANT.' });
  } else if (enforcement === 'DoNotEnforce') {
    title = '⚠️ Audit only'; cls = 'audit';
    body = 'The condition matches, but enforcement is DoNotEnforce — Azure will log this but will not apply the effect.';
    path.push({ type:'warn', text:'Enforcement is DoNotEnforce → effect is logged, not applied.' });
  } else {
    switch (effect) {
      case 'Deny':
        title = '🔴 Denied'; cls = 'deny';
        body = 'Azure Policy will block creation/update of this resource.';
        path.push({ type:'deny', text:'Effect = Deny → request rejected. Resource is NOT created.' });
        break;
      case 'Audit':
        title = '⚠️ Audited (NON_COMPLIANT)'; cls = 'audit';
        body = 'The resource is created but flagged as non-compliant in the Compliance dashboard.';
        path.push({ type:'warn', text:'Effect = Audit → resource is created but flagged NON_COMPLIANT.' });
        break;
      case 'Append':
        title = '✏️ Appended'; cls = 'allow';
        body = 'Azure adds the required property/tag to the resource at create time.';
        path.push({ type:'allow', text:'Effect = Append → required field added to the request.' });
        break;
      case 'Modify':
        title = '✏️ Modified'; cls = 'allow';
        body = 'Azure modifies the existing resource to match the policy.';
        path.push({ type:'allow', text:'Effect = Modify → existing resource is patched to comply.' });
        break;
      case 'DeployIfNotExists':
        title = '🚀 Remediation deployed'; cls = 'allow';
        body = 'Azure deploys a related resource (e.g. diagnostic settings) to bring the parent into compliance.';
        path.push({ type:'allow', text:'Effect = DeployIfNotExists → remediation template deployed.' });
        break;
    }
  }

  root.querySelector('#az-result').innerHTML = `
    <div class="result result-${cls}">
      <div class="result-title">${title}</div>
      <div class="result-body">${escapeHtml(body)}</div>
      <ul class="decision-path">
        ${path.map(p => `<li class="dp-${p.type}">${p.text}</li>`).join('')}
      </ul>
    </div>`;
}
