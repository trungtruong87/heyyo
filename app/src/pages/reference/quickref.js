// Quick Reference — copy-ready KQL, AWS CLI, and Azure CLI commands.
// Snippets are stored as data so they're easy to add/edit.

import { html, escapeHtml, copyToClipboard } from '../../core/ui.js';

export const meta = { title: 'Quick Reference', cloud: 'both' };

const SECTIONS = [
  {
    id: 'kql',
    badge: 'azure',
    label: 'KQL',
    title: 'KQL Query Library — Azure Resource Graph',
    intro: 'Run these in Azure Portal → Resource Graph Explorer, or in Log Analytics. KQL is case-sensitive.',
    snippets: [
      { title: 'Find all Storage Accounts with public blob access enabled', when: 'Auditing storage accounts that may expose data publicly.', code: `Resources
| where type == "microsoft.storage/storageaccounts"
| where properties.allowBlobPublicAccess == true
| project name, resourceGroup, location, subscriptionId` },
      { title: 'Show all non-compliant resources by Policy name', when: 'See everything failing a specific policy rule.', code: `PolicyResources
| where type == "microsoft.policyinsights/policystates"
| where properties.complianceState == "NonCompliant"
| project resourceId, policyDefinitionName = properties.policyDefinitionName,
          resourceGroup, subscriptionId
| order by policyDefinitionName asc` },
      { title: 'List all VMs without encryption at rest enabled', when: 'Check that all virtual machines have disk encryption.', code: `Resources
| where type == "microsoft.compute/virtualmachines"
| where isnull(properties.storageProfile.osDisk.encryptionSettings)
      or properties.storageProfile.osDisk.encryptionSettings.enabled != true
| project name, resourceGroup, location, subscriptionId` },
      { title: 'Show Defender for Cloud alerts by severity', when: 'Triaging alerts in the morning — start with High severity.', code: `SecurityAlert
| where TimeGenerated > ago(24h)
| summarize AlertCount = count() by AlertSeverity, AlertName
| order by AlertSeverity asc` },
      { title: 'Find all resources missing a required tag', when: 'Enforcing tagging — e.g. every resource must have an "Owner" tag.', code: `Resources
| where isnull(tags.Owner) or tags.Owner == ""
| project name, type, resourceGroup, subscriptionId
| order by type asc` },
      { title: 'List all Azure Policy assignments in a subscription', when: 'See what policies are currently active and their scope.', code: `PolicyResources
| where type == "microsoft.authorization/policyassignments"
| project name, displayName = properties.displayName,
          scope = properties.scope, enforcementMode = properties.enforcementMode
| order by scope asc` },
      { title: 'Find all resources changed in the last 24 hours', when: 'Investigating what changed overnight or after an incident.', code: `ResourceChanges
| where properties.changeType in ("Create", "Update", "Delete")
| where properties.changeAttributes.timestamp > ago(24h)
| project resourceId = properties.targetResourceId,
          changeType = properties.changeType,
          changedBy = properties.changeAttributes.changedBy,
          timestamp = properties.changeAttributes.timestamp
| order by timestamp desc` },
      { title: 'List all resources by compliance state', when: 'Preparing a compliance report — summary of compliant vs non-compliant.', code: `PolicyResources
| where type == "microsoft.policyinsights/policystates"
| summarize Count = count() by ComplianceState = tostring(properties.complianceState)
| order by Count desc` },
      { title: 'Find all NSGs with inbound rules open to the internet', when: 'Checking for publicly exposed ports — a common security risk.', code: `Resources
| where type == "microsoft.network/networksecuritygroups"
| mv-expand rule = properties.securityRules
| where rule.properties.direction == "Inbound"
      and rule.properties.access == "Allow"
      and rule.properties.sourceAddressPrefix in ("*", "Internet", "0.0.0.0/0")
| project nsgName = name, ruleName = rule.name,
          port = rule.properties.destinationPortRange,
          resourceGroup, subscriptionId` },
    ],
  },
  {
    id: 'aws-cli',
    badge: 'aws',
    label: 'AWS',
    title: 'AWS CLI Quick Commands',
    intro: 'Run with AWS CLI configured. Replace values in CAPS with your own.',
    snippets: [
      { title: 'List all non-compliant Config rules', when: 'Check which Config rules are flagging violations.', code: `aws configservice describe-compliance-by-config-rule \\
  --compliance-types NON_COMPLIANT \\
  --query "ComplianceByConfigRules[*].ConfigRuleName" \\
  --output table` },
      { title: 'List non-compliant resources for a specific Config rule', when: 'You know which rule is failing and want every resource affected.', code: `aws configservice get-compliance-details-by-config-rule \\
  --config-rule-name YOUR-RULE-NAME \\
  --compliance-types NON_COMPLIANT \\
  --query "EvaluationResults[*].EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId" \\
  --output table` },
      { title: 'List SCPs attached to an OU', when: 'Check what policies are restricting a specific OU or account.', code: `aws organizations list-policies-for-target \\
  --target-id YOUR-OU-ID \\
  --filter SERVICE_CONTROL_POLICY \\
  --query "Policies[*].{Name:Name,Id:Id}" \\
  --output table` },
      { title: 'List all AWS accounts in your Organization', when: 'Get a full account list to audit or manage.', code: `aws organizations list-accounts \\
  --query "Accounts[*].{Name:Name,Id:Id,Status:Status}" \\
  --output table` },
      { title: 'Find S3 buckets without public-access block', when: 'Auditing S3 buckets for public-access misconfigs.', code: `aws s3api list-buckets --query "Buckets[*].Name" --output text | tr '\\t' '\\n' | while read bucket; do
  result=$(aws s3api get-public-access-block --bucket "$bucket" 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "NO BLOCK POLICY: $bucket"
  fi
done` },
      { title: 'Manually re-evaluate a Config rule', when: 'After fixing a resource, force Config to re-check immediately.', code: `aws configservice start-config-rules-evaluation \\
  --config-rule-names YOUR-RULE-NAME` },
    ],
  },
  {
    id: 'az-cli',
    badge: 'azure',
    label: 'Azure',
    title: 'Azure CLI Quick Commands',
    intro: 'Run after `az login`. Replace placeholder values with your own.',
    snippets: [
      { title: 'List all non-compliant Policy assignments', when: 'Quick overview of which policies have failures.', code: `az policy state list \\
  --filter "complianceState eq 'NonCompliant'" \\
  --query "[*].{Resource:resourceId, Policy:policyDefinitionName}" \\
  --output table` },
      { title: 'Show Defender for Cloud Secure Score', when: 'Check current security posture score — useful for reporting.', code: `az security secure-score list \\
  --query "[*].{Name:displayName, Score:score.current, Max:score.max, Percentage:score.percentage}" \\
  --output table` },
      { title: 'List resources missing a specific tag', when: 'Enforcing tagging compliance across your subscription.', code: `az resource list \\
  --query "[?tags.Environment==null].{Name:name, Type:type, RG:resourceGroup}" \\
  --output table` },
      { title: 'List all Policy assignments in a subscription', when: 'Review which compliance frameworks (NIST, CIS, etc.) are assigned.', code: `az policy assignment list \\
  --query "[*].{Name:displayName, Scope:scope, EnforcementMode:enforcementMode}" \\
  --output table` },
      { title: 'Trigger a Policy compliance re-evaluation', when: 'You made a fix and want Azure to re-check immediately.', code: `az policy state trigger-scan \\
  --resource-group YOUR-RESOURCE-GROUP-NAME` },
    ],
  },
];

function snippetHtml(s) {
  return `
    <div class="snippet">
      <div class="snippet-title">${escapeHtml(s.title)}</div>
      <div class="snippet-when">📌 ${escapeHtml(s.when)}</div>
      <div class="code-wrap">
        <button class="copy-btn" data-code>Copy</button>
        <pre><code>${escapeHtml(s.code)}</code></pre>
      </div>
    </div>`;
}

export function render() {
  return html`
    <div class="page-inner">
      <div class="ph">
        <h1>⚡ Quick Reference</h1>
        <p>Copy-ready KQL, AWS CLI, and Azure CLI commands. Click <em>Copy</em> on any snippet.</p>
      </div>
      ${SECTIONS.map(s => `
        <div class="section-head">
          <span class="badge-${s.badge}">${s.label}</span>
          <h2>${escapeHtml(s.title)}</h2>
        </div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:1rem">${escapeHtml(s.intro)}</p>
        ${s.snippets.map(snippetHtml).join('')}
      `).join('')}
    </div>
  `;
}

export function mount(root) {
  root.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.parentElement.querySelector('code')?.textContent || '';
      copyToClipboard(code, btn);
    });
  });
}
