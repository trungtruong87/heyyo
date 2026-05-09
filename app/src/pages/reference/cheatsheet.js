// A4 Cheatsheet — curated AWS↔Azure mapping + glossary, designed to print
// on a single landscape A4 sheet. Reads from data/mapping.js (no duplicate data).

import { html, $, escapeHtml, badge } from '../../core/ui.js';
import { MAPPING, GLOSSARY } from '../../data/mapping.js';

export const meta = { title: 'A4 Cheatsheet', cloud: 'both' };

// Themes group the curated rows. `concept` keys must match MAPPING[].concept.
// `gotcha` overrides r.differs with a print-friendly one-liner where needed.
const THEMES = [
  {
    id: 'org',
    title: 'Org Structure',
    icon: '🏛️',
    tone: 'green',
    rows: [
      { concept: 'Top-of-tree governance container',
        gotcha: 'AWS mgmt account is real (can run workloads — don\'t); Azure Tenant Root is logical-only.' },
      { concept: 'Mid-tree folder for grouping',
        gotcha: 'OUs ≤ 5 levels deep; MGs ≤ 6.' },
      { concept: 'Workload + billing container',
        gotcha: 'AWS accounts are cheap; Azure subscriptions are heavier and usually team-vended.' },
    ],
  },
  {
    id: 'guardrails',
    title: 'Guardrails (P·D·P)',
    icon: '🚧',
    tone: 'amber',
    rows: [
      { concept: 'Preventive guardrail (org-wide deny)',
        gotcha: 'SCP = Allow/Deny only. Azure Policy has 6 effects + targets MG/sub/RG/resource.' },
      { concept: 'Detective rule (continuous compliance check)',
        gotcha: 'Config Rule can run custom Lambda. Azure Policy "audit" runs no code — engine-only.' },
      { concept: 'Proactive deploy-time check',
        gotcha: 'CFN Hook = CloudFormation only. Azure Policy "deny" runs on every ARM/Bicep/TF deploy.' },
      { concept: 'Bundle of related rules',
        gotcha: 'Conformance Pack = YAML, Config-only. Initiative = JSON, Policy engine. MCSB is an Initiative.' },
    ],
  },
  {
    id: 'detection',
    title: 'Detection + Posture',
    icon: '🔍',
    tone: 'blue',
    rows: [
      { concept: 'Security posture dashboard',
        gotcha: 'Defender for Cloud bundles free CSPM + paid CWP. Security Hub ≈ free CSPM only; deeper AWS detect = GuardDuty/Inspector/Macie.' },
      { concept: 'Built-in security baseline initiative',
        gotcha: 'MCSB maps controls to NIST/CIS/PCI by ID (NS-1, IM-3). FSBP is mostly self-defined.' },
      { concept: 'Endpoint Detection and Response (EDR)',
        gotcha: 'MDE = real EDR (agent + behaviour). GuardDuty is more network/log threat detection.' },
    ],
  },
  {
    id: 'identity',
    title: 'Identity',
    icon: '🪪',
    tone: 'purple',
    rows: [
      { concept: 'Centralized identity for human access',
        gotcha: 'Entra is broader (M365, conditional access, B2B/B2C). IIC is AWS-only. Both federate to Okta etc.' },
      { concept: 'Resource-level permissions',
        gotcha: 'IAM = JSON Allow/Deny. Azure RBAC = role assignment at scope; deny assignments are rare.' },
    ],
  },
  {
    id: 'automation',
    title: 'Automation + Query',
    icon: '⚙️',
    tone: 'green',
    rows: [
      { concept: 'Scripted compliance automation host',
        gotcha: 'Azure Runbook = PowerShell + Managed Identity ("ops"). AWS = Lambda + EventBridge ("platform").' },
      { concept: 'Cross-account/sub query layer',
        gotcha: 'Resource Graph uses KQL (transferable). Config Aggregator uses an SQL-like dialect.' },
    ],
  },
];

// 10 most-confusable terms for the glossary footer.
const GLOSSARY_PICKS = [
  'Effects (Azure Policy)',
  'DeployIfNotExists (DINE)',
  'Exemption',
  'Permission Boundary',
  'Managed Identity',
  'MCSB',
  'Secure Score',
  'KQL',
  'Conformance Pack',
  'Drift',
];

function findRow(conceptName) {
  return MAPPING.find(r => r.concept === conceptName);
}

function findGloss(term) {
  return GLOSSARY.find(g => g.term === term);
}

function themeRow({ concept, gotcha }) {
  const r = findRow(concept);
  if (!r) return '';
  const note = gotcha || r.differs || '';
  return `
    <div class="csh-row">
      <div class="csh-concept">${escapeHtml(r.concept)}</div>
      <div class="csh-aws">${badge('aws')} ${escapeHtml(r.aws.service)}</div>
      <div class="csh-az">${badge('azure')} ${escapeHtml(r.azure.service)}</div>
      <div class="csh-note">${escapeHtml(note.replace(/\s+/g, ' ').trim())}</div>
    </div>`;
}

function themeCard(t) {
  return `
    <section class="csh-card csh-card--${t.tone}">
      <header class="csh-card-head">
        <span class="csh-card-icon">${t.icon}</span>
        <h2 class="csh-card-title">${escapeHtml(t.title)}</h2>
      </header>
      <div class="csh-rows">
        ${t.rows.map(themeRow).join('')}
      </div>
    </section>`;
}

function glossaryCard() {
  const items = GLOSSARY_PICKS
    .map(findGloss)
    .filter(Boolean)
    .map(g => `
      <div class="csh-gloss-row">
        <span class="csh-gloss-term">${escapeHtml(g.term)}</span>
        <span class="csh-gloss-def">${escapeHtml(g.plain.replace(/\s+/g, ' ').trim())}</span>
      </div>`).join('');
  return `
    <section class="csh-card csh-card--gloss">
      <header class="csh-card-head">
        <span class="csh-card-icon">📖</span>
        <h2 class="csh-card-title">Glossary — most confusable terms</h2>
      </header>
      <div class="csh-gloss-grid">${items}</div>
    </section>`;
}

export function render() {
  return html`
    <div class="page-inner cheatsheet-page">
      <div class="csh-header">
        <div>
          <h1 class="csh-h1">AWS ↔ Azure Cheatsheet</h1>
          <p class="csh-sub">Compliance lens · plain-English first · prints on one A4 (landscape).</p>
        </div>
        <button class="btn csh-print-btn" id="csh-print">🖨 Print</button>
      </div>

      <div class="csh-grid">
        ${THEMES.map(themeCard).join('')}
        ${glossaryCard()}
      </div>

      <p class="csh-foot">
        Need depth? Open the
        <a href="#/reference/wiki">full Wiki</a>
        — every row links to AWS &amp; Azure docs.
      </p>
    </div>`;
}

export function mount(root) {
  $('#csh-print', root)?.addEventListener('click', () => window.print());
}
