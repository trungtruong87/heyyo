// Artifact registry — single source of truth for "where does this code live,
// how is it run, how is it deployed."
//
// Used in two places:
//   1. Inline callouts under code examples (foundations + tickets renderers).
//   2. The /reference/artifact-map page (one row per artifact type).
//
// Adding a new artifact = add an entry here + tag the relevant
// foundations.js panel or tickets.js example with `artifact: '<slug>'`.

import { escapeHtml } from '../core/ui.js';

export const ARTIFACTS = {
  'aws-scp-json': {
    name: 'AWS Service Control Policy (JSON)',
    cloud: 'aws',
    extension: '.json',
    livesIn: 'aws-organizations/policies/<name>.json — or inline in a Terraform module under modules/scps/',
    deploy: [
      'Terraform: aws_organizations_policy + aws_organizations_policy_attachment',
      'CLI: aws organizations create-policy + attach-policy',
    ],
    runHow: 'No "run" step. SCPs evaluate automatically on every IAM call inside the attached OU / account.',
    test: 'AWS IAM policy simulator — paste the policy and simulate principal × action.',
    notes: 'Attaches to root, OU, or account. Multiple SCPs stack: effective permission = intersection of all in the chain.',
  },
  'aws-config-lambda': {
    name: 'AWS Config custom rule (Lambda-backed)',
    cloud: 'aws',
    extension: '.py / .js (Lambda) + .tf (rule)',
    livesIn: 'aws-config/custom-rules/<rule>/ — Lambda source alongside the IaC for the rule itself',
    deploy: [
      'Terraform: aws_config_config_rule + aws_lambda_function (source_identifier = Lambda ARN)',
      'CLI: aws configservice put-config-rule',
    ],
    runHow: 'Triggered on config-change events or on a periodic schedule. Handler returns COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE.',
    test: 'sam local invoke with a synthetic ConfigurationItem event JSON.',
    notes: 'Cold start adds latency. Prefer cfn-guard when the rule is pure resource validation.',
  },
  'cfn-guard': {
    name: 'CloudFormation Guard rule (.guard)',
    cloud: 'aws',
    extension: '.guard',
    livesIn: 'config-rules/guard-policies/<rule>.guard — inside a policy-as-code repo',
    deploy: [
      'Deployed as a CUSTOM_POLICY Config rule (no Lambda).',
      'Terraform: aws_config_config_rule with source.owner = CUSTOM_POLICY + custom_policy_details.',
    ],
    runHow: 'Compiled and evaluated by AWS Config\'s CUSTOM_POLICY engine. No cold-start.',
    test: 'cfn-guard validate --data <resource.json> --rules <rule.guard> (local CLI).',
    notes: 'Declarative DSL. Faster + cheaper than Lambda rules. Author and test locally before deploy.',
  },
  'azure-policy-json': {
    name: 'Azure Policy definition (JSON)',
    cloud: 'azure',
    extension: '.json',
    livesIn: 'policies/definitions/<name>.json — or inline in Terraform azurerm_policy_definition',
    deploy: [
      'Terraform: azurerm_policy_definition + azurerm_*_policy_assignment (definition alone does nothing — the assignment is what binds it to scope).',
      'CLI: az policy definition create + az policy assignment create',
    ],
    runHow: 'Evaluated on resource create / update and on the periodic compliance scan (~24 h).',
    test: 'az policy state list, or Policy compliance blade in portal after assignment.',
    notes: 'Definition is a template; assignment is the live binding. Don\'t confuse the two.',
  },
  'azure-policy-exemption': {
    name: 'Azure Policy exemption',
    cloud: 'azure',
    extension: '.tf / portal',
    livesIn: 'Co-located with the assignment IaC — usually the same Terraform stack as the assignment itself',
    deploy: [
      'Terraform: azurerm_management_group_policy_exemption / azurerm_subscription_policy_exemption / azurerm_resource_policy_exemption',
      'CLI: az policy exemption create',
    ],
    runHow: 'Scopes to a specific assignment + resource. Carries expiresOn — auditors look at it.',
    notes: 'Always set expiresOn. Always set exemptionCategory = "Waiver" or "Mitigated" with a justification.',
  },
  'azure-runbook-ps1': {
    name: 'Azure Automation PowerShell runbook',
    cloud: 'azure',
    extension: '.ps1',
    livesIn: 'runbooks/<name>.ps1 in the same repo as the Automation account IaC',
    deploy: [
      'Terraform: azurerm_automation_runbook (content = file("runbooks/x.ps1"))',
      'Portal: Automation account → Runbooks → Import',
    ],
    runHow: 'Triggered on a schedule (azurerm_automation_schedule + job_schedule) or manually via portal / REST. Runs in the Automation sandbox as the account\'s Managed Identity.',
    test: 'Use the runbook\'s "Test pane" in the portal before publishing.',
    notes: 'Modules must be imported into the Automation account first — they aren\'t pulled from PSGallery at runtime.',
  },
  'kql': {
    name: 'KQL query',
    cloud: 'azure',
    extension: '.kql (or inline)',
    livesIn: 'queries/<name>.kql in a Git repo; or saved-queries inside Log Analytics; or as ARG queries committed in a dashboards/ folder',
    deploy: [
      'Paste into Log Analytics / Defender / Sentinel / Resource Graph Explorer.',
      'For reuse: save as a function (.create-or-alter function) or embed in a workbook.',
    ],
    runHow: 'Executes against whatever workspace it\'s pasted into. ARG queries hit the Resource Graph, not a workspace.',
    test: 'Run interactively. Check schema with the `getschema` operator.',
    notes: 'ARG vs Log Analytics KQL: same syntax, different tables. ARG = inventory; Log Analytics = telemetry.',
  },
  'terraform-hcl': {
    name: 'Terraform HCL',
    cloud: 'tf',
    extension: '.tf',
    livesIn: 'Git repo. Common shape: root .tf files + reusable modules under modules/<name>/. State stored remotely (S3 + DynamoDB on AWS, Azure Blob on Azure, or Terraform Cloud).',
    deploy: [
      'terraform init → terraform plan → terraform apply',
      'In CI: GitHub Actions / GitLab CI with plan-on-PR + apply-on-merge gate.',
    ],
    runHow: 'Local CLI for dev. CI for shared environments. Never apply from a laptop against prod.',
    test: 'terraform plan (read-only), terraform validate, tflint, checkov.',
    notes: 'State is the source of truth. Lose state = lose Terraform\'s view of what exists.',
  },
  'markdown-runbook': {
    name: 'Operational runbook (Markdown)',
    cloud: 'both',
    extension: '.md',
    livesIn: 'docs/runbooks/ in the team repo, or a Confluence / Notion page linked from the on-call rotation',
    deploy: ['Just commit it — runbooks are documentation, not code.'],
    runHow: 'Followed by a human (on-call, change reviewer). Treat as living docs.',
    notes: 'Version it. Stale runbooks are worse than no runbook.',
  },
};

// Render the small "Where it lives" callout shown under a code example.
// Pass the artifact slug; returns HTML (empty string if slug is unknown).
export function artifactCalloutHtml(slug) {
  const a = ARTIFACTS[slug];
  if (!a) return '';
  const cloudCls = a.cloud === 'aws' ? 'aws' :
                   a.cloud === 'azure' ? 'azure' :
                   a.cloud === 'tf' ? 'tf' : 'home';
  const firstDeploy = Array.isArray(a.deploy) && a.deploy.length ? a.deploy[0] : '';
  return `
    <aside class="artifact-callout artifact-callout-${cloudCls}">
      <div class="artifact-callout-head">
        <span class="artifact-callout-icon">📁</span>
        <strong>${escapeHtml(a.name)}</strong>
      </div>
      <dl class="artifact-callout-body">
        <dt>Lives in</dt><dd>${escapeHtml(a.livesIn)}</dd>
        <dt>Run</dt><dd>${escapeHtml(a.runHow)}</dd>
        ${firstDeploy ? `<dt>Deploy</dt><dd>${escapeHtml(firstDeploy)}</dd>` : ''}
      </dl>
      <a class="artifact-callout-more" href="#/reference/artifact-map#${slug}">Full artifact map →</a>
    </aside>`;
}

// Anchor-safe slug list (used by the map page).
export function artifactSlugs() {
  return Object.keys(ARTIFACTS);
}
