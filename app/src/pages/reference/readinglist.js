// Reading list ↔ Hub map.
// Each row = one item from the lead's reading list. Three columns:
//   1. The item (with the official Microsoft / AWS doc link)
//   2. Where it lives in the hub (clickable chips)
//   3. What to actually own (mastery sentence — not textbook summary)

import { html, badge, escapeHtml } from '../../core/ui.js';

export const meta = { title: 'Reading list ↔ Hub map', cloud: 'home' };

const ROWS = [
  // ─── AWS ──────────────────────────────────────────────────────────────
  {
    cloud: 'aws',
    item: 'AWS Control Tower & AWS Landing Zone',
    links: [
      { label: 'What Is AWS Control Tower?', href: 'https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html' },
      { label: 'Setting up a secure multi-account AWS environment', href: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-aws-environment/welcome.html' },
    ],
    chips: [
      { route: '/foundations/aws-control-tower', label: 'Control Tower' },
      { route: '/tickets/t3', label: 'T3' },
      { route: '/reference/decisions', label: 'Decision trees' },
      { route: '/reference/wiki', label: 'Wiki' },
    ],
    own: `Be able to read a new account's CT compliance dashboard and explain
          to a workload owner which controls are <b>Mandatory</b> vs
          <b>Strongly Recommended</b> vs <b>Elective</b>. Know when CfCT
          (Customizations for Control Tower) is needed vs vanilla Account
          Factory, and when AFT (Account Factory for Terraform) is the right
          pattern. Spot drift in the CT console and explain what it means.`,
  },
  {
    cloud: 'aws',
    item: 'AWS Control Tower Security Controls (P-D-P)',
    links: [
      { label: 'About controls in AWS Control Tower', href: 'https://docs.aws.amazon.com/controltower/latest/controlreference/about-controls.html' },
    ],
    chips: [
      { route: '/foundations/aws-control-tower', label: 'Control Tower' },
      { route: '/tickets/t3', label: 'T3' },
      { route: '/reference/decisions', label: 'Decision trees' },
    ],
    own: `Explain the three control types in one breath: <b>Preventive</b>
          (SCP — blocks before the action) · <b>Detective</b> (Config rule
          — flags after) · <b>Proactive</b> (CloudFormation Hook — blocks
          at deploy time). Choose the right type for a new requirement
          and defend the choice in a review.`,
  },
  {
    cloud: 'aws',
    item: 'AWS Config Rules (and custom Config rules)',
    links: [
      { label: 'Evaluating Resources with AWS Config Rules', href: 'https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config.html' },
    ],
    chips: [
      { route: '/foundations/aws-config', label: 'AWS Config' },
      { route: '/tickets/t2', label: 'T2' },
      { route: '/reference/decisions', label: 'Decision trees' },
    ],
    own: `Estimate the cost of enabling Config org-wide before someone
          asks (#1 surprise cloud bill). Choose <b>managed</b> vs
          <b>custom Lambda</b> vs <b>Guard DSL</b> for a new rule and
          explain the tradeoff. Read a custom Lambda rule and predict
          its verdict on a given resource. Know change-triggered vs
          periodic trigger semantics.`,
  },
  {
    cloud: 'aws',
    item: 'AWS Organizations Service Control Policies (SCP)',
    links: [
      { label: 'Service control policies (SCPs)', href: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html' },
    ],
    chips: [
      { route: '/foundations/aws-scp', label: 'SCPs' },
      { route: '/tickets/t1', label: 'T1' },
      { route: '/practice/scp', label: 'SCP+IAM evaluator' },
      { route: '/reference/decisions', label: 'Decision trees' },
    ],
    own: `Write a deny-region SCP from scratch in 5 min. Explain why
          SCPs don't apply to the management account and why the
          <code>FullAWSAccess</code> default exists. Spot a missing
          <code>aws:PrincipalOrgID</code> condition in a cross-account
          policy review. Know the 5KB size limit and why service-linked
          roles are exempt.`,
  },

  // ─── Azure ────────────────────────────────────────────────────────────
  {
    cloud: 'azure',
    item: 'Azure Policy (overview + anatomy)',
    links: [
      { label: 'Overview of Azure Policy', href: 'https://learn.microsoft.com/en-us/azure/governance/policy/overview' },
      { label: 'Anatomy of Azure Policy (YouTube)', href: 'https://www.youtube.com/results?search_query=anatomy+of+azure+policy' },
    ],
    chips: [
      { route: '/foundations/azure-policy', label: 'Azure Policy' },
      { route: '/foundations/azure-policy-anatomy', label: 'Anatomy' },
      { route: '/tickets/t4', label: 'T4' },
      { route: '/tickets/t5', label: 'T5' },
      { route: '/tickets/t8', label: 'T8' },
      { route: '/practice/azure-policy', label: 'Effect simulator' },
    ],
    own: `Read a policy definition and name its <b>effect</b> on sight
          (Audit / Deny / Append / Modify / DeployIfNotExists /
          AuditIfNotExists). Diagnose a DINE policy that's silently
          no-op'ing (missing identity, missing role assignment — the
          #1 failure). Write an exemption with an expiry, requester,
          and JIRA tag. Force an on-demand evaluation when an auditor
          won't wait 24h for the next scan.`,
  },
  {
    cloud: 'azure',
    item: 'Microsoft Defender for Cloud',
    links: [
      { label: 'What is Microsoft Defender for Cloud?', href: 'https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-introduction' },
    ],
    chips: [
      { route: '/foundations/defender-cloud', label: 'Defender for Cloud' },
      { route: '/tickets/t5', label: 'T5' },
      { route: '/tickets/t9', label: 'T9' },
    ],
    own: `Trace a Secure Score drop to the exact Azure Policy definition
          that flipped. Know the price shape of each Defender plan
          (Servers Plan 2 ≈ $15/server/month, Storage ≈ $10/account/month)
          — procurement asks. Tell <b>suppression</b> apart from <b>exemption</b>
          and choose correctly (auditors check exemptions, not suppressions).
          Set up Workflow Automation to ticket new high-sev recs.`,
  },
  {
    cloud: 'azure',
    item: 'Microsoft Defender for Endpoint (MDE)',
    links: [
      { label: 'Microsoft Defender for Endpoint', href: 'https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-endpoint' },
    ],
    chips: [
      { route: '/foundations/defender-endpoint', label: 'Defender for Endpoint' },
      { route: '/tickets/t5', label: 'T5' },
      { route: '/tickets/t7', label: 'T7' },
    ],
    own: `Explain <b>P1 vs P2</b> in one breath (P1 = AV only; P2 = real
          EDR + ASR + automated investigation). Diagnose a VM that's not
          onboarded (extension missing, initiative not assigned at the
          new MG — almost always the second). Read an ASR alert and know
          if it's a tune-needed false positive or a real attack. Know
          the MMA → AMA agent migration story.`,
  },
  {
    cloud: 'azure',
    item: 'Microsoft Cloud Security Benchmark (MCSB)',
    links: [
      { label: 'Overview of MCSB', href: 'https://learn.microsoft.com/en-us/security/benchmark/azure/overview' },
    ],
    chips: [
      { route: '/foundations/azure-mcsb', label: 'MCSB' },
      { route: '/tickets/t5', label: 'T5' },
      { route: '/tickets/t9', label: 'T9' },
    ],
    own: `Decode an MCSB control ID on sight (NS-1, IM-3, ES-1 — see the
          MCSB topic\'s control-ID decoder). Map a Defender for Cloud
          recommendation back to its MCSB control + the auditor framework
          it satisfies (NIST 800-53 / ISO 27001 / PCI). Know that
          <b>MCSB compliance % ≠ Secure Score</b> — different math.`,
  },
  {
    cloud: 'azure',
    item: 'Azure Automation Runbook (PowerShell)',
    links: [
      { label: 'PowerShell runbook with managed identity', href: 'https://learn.microsoft.com/en-us/azure/automation/learn/powershell-runbook-managed-identity' },
      { label: 'Azure PowerShell documentation', href: 'https://learn.microsoft.com/en-us/powershell/azure/' },
    ],
    chips: [
      { route: '/foundations/azure-runbooks', label: 'Runbooks' },
      { route: '/tickets/t6', label: 'T6' },
    ],
    own: `Read a PowerShell runbook and identify in one pass: identity
          flavor (System- vs User-Assigned), runtime version (5.1 vs 7.2),
          error handling pattern (<code>Write-Error</code> vs <code>Throw</code>).
          Know when NOT to use a Runbook (sub-second remediation → use
          Logic Apps + Event Grid). Explain the output-stream limit and
          how to log to LA when results exceed it.`,
  },
  {
    cloud: 'azure',
    item: 'Kusto Query Language (KQL) + Azure Resource Graph',
    links: [
      { label: 'KQL overview', href: 'https://learn.microsoft.com/en-us/kusto/query/' },
      { label: 'Azure Resource Graph query language', href: 'https://learn.microsoft.com/en-us/azure/governance/resource-graph/concepts/query-language' },
    ],
    chips: [
      { route: '/foundations/kql', label: 'KQL' },
      { route: '/foundations/resource-graph', label: 'Resource Graph' },
      { route: '/tickets/t7', label: 'T7' },
      { route: '/practice/kql', label: 'KQL playground' },
    ],
    own: `Write an <code>arg_max</code> query for "latest state per
          resource." Write a <code>leftanti</code> for "what's missing."
          Distinguish <b>Log Analytics</b> (time-series, logs) from
          <b>Resource Graph</b> (live inventory, no time dimension) and
          pick the right surface. Read an HTTP 429 and know it's Resource
          Graph throttling. Know the case-sensitivity gotcha
          (<code>==</code> vs <code>=~</code>).`,
  },
];

function chip(cloud, c) {
  const cls = {
    aws:   'chip chip-aws',
    azure: 'chip chip-azure',
    tf:    'chip chip-tf',
    home:  'chip chip-fnd',
  }[cloud] || 'chip chip-fnd';
  return `<a class="${cls}" href="#${c.route}">${escapeHtml(c.label)}</a>`;
}

function row(r) {
  const links = (r.links || [])
    .map(l => `<a class="map-link" href="${l.href}" target="_blank" rel="noopener">${escapeHtml(l.label)} ↗</a>`)
    .join(' · ');
  const chips = (r.chips || []).map(c => chip(r.cloud, c)).join(' ');
  return `
    <tr class="rl-row">
      <td class="rl-item">
        <div class="rl-item-name">${badge(r.cloud)} ${escapeHtml(r.item)}</div>
        <div class="rl-item-links">${links}</div>
      </td>
      <td class="rl-chips">${chips}</td>
      <td class="rl-own">${r.own}</td>
    </tr>`;
}

export function render() {
  return html`
    <div class="page-inner readinglist-page">
      <div class="ph">
        <h1>🗺️ Reading list ↔ Hub map</h1>
        <p>Your lead's reading list, one row each. Left = the official source.
           Middle = where in the hub it's covered. Right = the level of fluency
           the role actually needs — not "I read the doc," but "I can do
           the thing in front of an auditor."</p>
      </div>

      <div class="card">
        <table class="rl-table">
          <thead>
            <tr>
              <th class="rl-th-item">Reading-list item</th>
              <th class="rl-th-chips">Where in the hub</th>
              <th class="rl-th-own">What to actually own</th>
            </tr>
          </thead>
          <tbody>
            ${ROWS.map(row).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function mount(_root) {
  // no interactivity yet — static table with anchor links
}
