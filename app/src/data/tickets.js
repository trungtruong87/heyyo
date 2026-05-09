// Tickets — Phase 2 of the 14-day plan (Days 6–14).
//
// Each ticket is a realistic compliance work item the user walks through
// end-to-end: Brief → Investigate → Decide → Build → Recap + Talking points.
// The "Build" step asks the user to produce a real artifact; the artifact
// auto-saves to the Snippet Vault on submit.
//
// See /Users/trungtruong/.claude/plans/i-am-going-to-polymorphic-hopper.md
// for the design rationale.

export const TICKETS = [

  // ─── T1 — AWS / SCP ──────────────────────────────────────────────────────
  {
    id: 'T1',
    num: 'Ticket #1',
    title: 'IAM user created in Dev OU — SCP should have prevented it',
    topic: 'AWS · SCP',
    cloud: 'aws',
    brief: {
      reporter: 'Detective Config Rule iam-user-no-policies-check',
      plain: `Someone in a dev account created an IAM user with console access
              and a policy granting <code>s3:*</code>. Policy says we use IAM
              Identity Center (SSO) for all human access. IAM users are
              forbidden across the entire org. The detective rule fired, but
              the user already exists — meaning the SCP either isn't there
              or has a gap. Your job: confirm the gap, write the SCP that
              should have blocked it, and propose where to attach it.`,
      stakes: `Each IAM user is a long-lived credential we can't rotate centrally.
               Auditor asked yesterday for proof we've eliminated them. Right
               now we cannot give that proof.`,
    },
    investigate: {
      summary: 'Open the SCP + IAM lab bench and trace what happens today.',
      steps: [
        'Pick the "No SCP attached (allow-all by default)" SCP template, plus an IAM policy that grants <code>iam:CreateUser</code>.',
        'Run the action <code>iam:CreateUser</code>. Note the result — it succeeds because no SCP denies it.',
        'Now switch the SCP template to "Deny IAM users (force IIC)" and run the same action. Note the result — denied at the SCP layer before IAM is even consulted.',
        'Confirm: the gap is that no such SCP is attached anywhere on the path from root to the dev account.',
      ],
      labLink: { route: '/practice/scp', label: 'Open SCP + IAM lab bench' },
    },
    decide: {
      question: 'Where do you attach this SCP?',
      options: [
        { label: 'Root of the AWS Organization', good: true,
          explain: 'Best blast radius. Forbidding IAM users is org-wide policy; attaching at root means no future OU can re-permit it. Exempt the management account if needed via NotAction.' },
        { label: 'Dev OU only', good: false,
          explain: 'Too narrow. The same gap will exist in every other OU. Attach at root unless there\'s a real reason a sub-tree needs IAM users.' },
        { label: 'Each member account individually', good: false,
          explain: 'Defeats the purpose of OUs. New accounts vended via Control Tower would land without the SCP applied; you\'d have to remember to attach it every time.' },
        { label: 'Add a Permission Boundary on the dev role instead', good: false,
          explain: 'Permission Boundaries cap a specific principal\'s permissions. They don\'t scale to "no IAM users anywhere in this account" — that\'s an SCP job.' },
      ],
    },
    build: {
      prompt: `Write the SCP. Use Deny + an action list that covers the IAM user
               surface (<code>iam:CreateUser</code>, <code>iam:CreateLoginProfile</code>,
               <code>iam:CreateAccessKey</code> at minimum). Keep
               <code>iam:CreateRole</code> and <code>iam:CreateServiceLinkedRole</code>
               OUT of the deny list — those are still needed.`,
      artifactKind: 'scp',
      starter: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyIAMUsersAndKeys",
    "Effect": "Deny",
    "Action": [
      "iam:CreateUser",
      "iam:CreateLoginProfile",
      "iam:CreateAccessKey"
    ],
    "Resource": "*"
  }]
}`,
      sample: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyIAMUsersAndKeys",
    "Effect": "Deny",
    "Action": [
      "iam:CreateUser",
      "iam:CreateLoginProfile",
      "iam:CreateAccessKey",
      "iam:UpdateAccessKey",
      "iam:UploadSigningCertificate",
      "iam:UploadSSHPublicKey"
    ],
    "Resource": "arn:aws:iam::*:user/*"
  }]
}`,
    },
    recap: [
      'IAM user creation should be blocked at the SCP layer, not relied on a detective rule alone.',
      'Attach guardrails high in the tree (org root) unless you have a reason to scope narrower.',
      'SCPs evaluate before IAM. If the SCP denies, IAM never gets a vote.',
      'Existing IAM users still need to be cleaned up — the SCP only stops new ones.',
      'A complete fix combines: SCP at root + a one-time cleanup script + a Config rule (detective layer) for ongoing assurance.',
    ],
    talkingPoints: [
      `"The detective rule did its job — found the user. The gap was no preventive SCP."`,
      `"I'm proposing a deny at org root for iam:CreateUser, CreateLoginProfile, CreateAccessKey."`,
      `"This won't break service-linked roles or normal role creation — those actions stay allowed."`,
      `"For the existing user, I'll open a cleanup PR; the SCP only stops new ones."`,
      `"After this lands the Config rule should report zero non-compliant resources within an hour."`,
    ],
    explainBackKey: 'tkt1_scp',
  },

  // ─── T2 — AWS / Config ───────────────────────────────────────────────────
  {
    id: 'T2',
    num: 'Ticket #2',
    title: 'Custom Config rule needed: required Owner tag',
    topic: 'AWS · Config Rule (custom)',
    cloud: 'aws',
    brief: {
      reporter: 'FinOps + Compliance lead',
      plain: `Cost allocation depends on every resource carrying an "Owner"
              tag. The managed rule <code>required-tags</code> works for
              parameter-style "must have these tag keys" but not for the
              extra rule we want: Owner must look like an email
              (contains "@"). FinOps needs a CUSTOM Config rule that
              evaluates per-resource and emits NON_COMPLIANT for anything
              missing or malformed.`,
      stakes: `Without this we can't bill back accurately. CFO escalation
               is one cycle away.`,
    },
    investigate: {
      summary: 'Read the existing managed rule and decide if custom is really needed.',
      steps: [
        'Recall: managed rule <code>required-tags</code> only checks key presence with a comma-list of expected values.',
        'Custom rules are Lambdas. They get a Config item, return COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE per resource.',
        'For email-format check, you need a regex — Lambda is the right tool.',
        'Trigger choice: <code>configuration-changes</code> evaluates on every change. <code>periodic</code> evaluates on a schedule. For tags, configuration-changes is more responsive.',
      ],
    },
    decide: {
      question: 'What\'s the right trigger and what scope do you target?',
      options: [
        { label: 'Configuration-change trigger, scoped to taggable resource types', good: true,
          explain: 'Tags change on resource updates; configuration-change fires immediately. Scope to <code>AWS::EC2::Instance</code>, <code>AWS::S3::Bucket</code>, etc., to avoid evaluating untaggable types.' },
        { label: 'Periodic trigger, every 24 hours, all resources', good: false,
          explain: '24-hour delay before non-compliance is detected. Untaggable types (e.g., AWS::Config::ConfigRule itself) waste evaluations.' },
        { label: 'Configuration-change trigger, all resources unscoped', good: false,
          explain: 'Triggers on resources that can\'t be tagged anyway. Wastes Lambda invocations.' },
      ],
    },
    build: {
      prompt: `Write the Lambda handler that validates the Owner tag exists AND
               matches a basic email pattern. Return COMPLIANT or
               NON_COMPLIANT with an annotation explaining why.`,
      artifactKind: 'lambda',
      starter: `// Custom Config rule: Owner tag must exist and look like an email
exports.handler = async (event) => {
  const item = JSON.parse(event.invokingEvent).configurationItem;
  const tags = item.tags || {};
  // your code here
  return {
    Compliance: "...",
    Annotation: "...",
  };
};`,
      sample: `exports.handler = async (event) => {
  const item = JSON.parse(event.invokingEvent).configurationItem;
  const tags = item.tags || {};
  const owner = tags.Owner;

  if (!owner) {
    return { Compliance: "NON_COMPLIANT",
             Annotation: "Missing Owner tag" };
  }
  const emailLike = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(owner);
  if (!emailLike) {
    return { Compliance: "NON_COMPLIANT",
             Annotation: \`Owner tag "\${owner}" is not an email-like value\` };
  }
  return { Compliance: "COMPLIANT",
           Annotation: "Owner tag is well-formed" };
};`,
    },
    recap: [
      'Custom Config rule = Lambda that returns COMPLIANT / NON_COMPLIANT per resource.',
      'configuration-changes trigger gives near-immediate feedback when tags change.',
      'Always scope the rule to resource types that actually support the check (taggable, in this case).',
      'Annotation strings are surfaced in the Config console — write them so the on-call can act without context.',
      'Custom rules require deploying the Lambda + the Config rule + IAM permission to write Config evaluations.',
    ],
    talkingPoints: [
      `"Managed rule required-tags can't do format validation; we need a Lambda."`,
      `"Configuration-change trigger means non-compliance shows up within a minute of the bad tag landing."`,
      `"I'll scope it to taggable resources only — saves invocations on the long tail of internal types."`,
      `"Annotation string tells FinOps exactly why each resource failed — missing vs malformed."`,
      `"This is a candidate for org-wide aggregator visibility — one dashboard for all accounts."`,
    ],
    explainBackKey: 'tkt2_config',
  },

  // ─── T3 — AWS / Control Tower ────────────────────────────────────────────
  {
    id: 'T3',
    num: 'Ticket #3',
    title: 'New account vended via Control Tower — verify all guardrails landed',
    topic: 'AWS · Control Tower',
    cloud: 'aws',
    brief: {
      reporter: 'Platform team',
      plain: `A new account "data-eng-sandbox-2" was just vended through Account
              Factory into the Sandbox OU. Before we hand it to the team, we
              need to verify all mandatory CT controls applied, the recommended
              ones we've enabled at Sandbox OU are present, and our org-root
              SCPs are inherited. The team is waiting to start work.`,
      stakes: `If a control is missing they could create resources we can\'t
               govern. We don\'t want to revoke access mid-day; verify
               first.`,
    },
    investigate: {
      summary: 'Walk the control inventory by type — P/D/P.',
      steps: [
        '<b>Preventive (SCPs):</b> in the Organizations console, view "Policies" attached on the path Root → Workloads → Sandbox OU → new account. Confirm "DenyNonAllowedRegions" and "DenyIAMUsers" are inherited.',
        '<b>Detective (Config rules):</b> in Control Tower → Controls, list which detective controls are enabled on Sandbox OU. Confirm they show up under the new account\'s Config console as enabled.',
        '<b>Proactive (CFN Hooks):</b> if you\'ve enabled any proactive controls (e.g., "do not deploy unencrypted S3"), CloudFormation deploys to this account should now be evaluated against them. Test with a deliberately bad template.',
        'Cross-check the Account Factory deployment status — it shows the baseline applied successfully or with errors.',
      ],
    },
    decide: {
      question: 'A teammate suggests skipping the verification because "Control Tower is reliable." How do you respond?',
      options: [
        { label: 'Verify anyway — drift between intent and reality is the most common cause of audit findings', good: true,
          explain: 'Account Factory can succeed at the workflow level but a control may have failed silently (region constraint, service quota, etc.). The cost of verification is 5 minutes; the cost of a missed control reaching audit is days.' },
        { label: 'Skip verification — Control Tower has its own dashboard for this', good: false,
          explain: 'CT\'s dashboard shows configured controls, not necessarily applied controls. The two diverge under failure.' },
        { label: 'Verify only the preventive SCPs since those are the riskiest', good: false,
          explain: 'Detective gaps cause silent non-compliance until something is found in audit. They matter as much as preventive in different ways.' },
      ],
    },
    build: {
      prompt: `Write a short verification checklist (markdown) that the next
               on-call can use. Cover the three control types and one
               cross-check. Keep it under 12 lines.`,
      artifactKind: 'note',
      starter: `## CT account verification checklist\n\n- [ ] \n- [ ] \n- [ ] \n- [ ] `,
      sample: `## Control Tower account verification

- [ ] **Preventive SCPs** — Organizations console: confirm DenyNonAllowedRegions, DenyIAMUsers attached on path Root → OU → account.
- [ ] **Detective rules** — Config console (in the new account, switch role): all expected managed + custom rules listed and EVALUATING (not "Insufficient data").
- [ ] **Proactive Hooks** — try a bad CFN template (unencrypted S3 bucket); deploy must FAIL with hook violation.
- [ ] **Account Factory status** — CT dashboard shows the new account in "Available" state, no errors in the deployment log.
- [ ] **Logging** — CloudTrail trail exists in this account; logs flow to the central log archive bucket.
- [ ] **Identity** — IAM Identity Center permission set for the team is attached.`,
    },
    recap: [
      'Control Tower automates landing zone setup; verification is still on you.',
      'P-D-P: Preventive (SCP), Detective (Config rule), Proactive (CFN Hook). Check all three.',
      'CT\'s configured-vs-applied gap is where audit findings hide.',
      'Cross-check: Account Factory deployment log + Organizations attachments + Config console + CFN Hook test.',
      'A reusable checklist saves the next person from rebuilding the verification mental model.',
    ],
    talkingPoints: [
      `"I verified all three CT control types on the new account — preventive, detective, proactive."`,
      `"Mandatory and our enabled-on-sandbox controls are present and evaluating."`,
      `"I tested a bad CloudFormation template against proactive Hooks — it correctly failed."`,
      `"Identity, logging, and CloudTrail wiring are all confirmed on the central side."`,
      `"I left a 6-item checklist in the runbook for next time."`,
    ],
    explainBackKey: 'tkt3_control_tower',
  },

  // ─── T4 — Azure / Policy + Exemption ─────────────────────────────────────
  {
    id: 'T4',
    num: 'Ticket #4',
    title: 'Storage account blocked by Azure Policy — owner asks for exemption',
    topic: 'Azure · Policy / Exemption',
    cloud: 'azure',
    brief: {
      reporter: 'storage-eng@corp',
      plain: `An owner needs to share a storage account with a third-party
              vendor that requires public blob access for 30 days. Our policy
              "Storage: deny public blob access" blocks this. The owner is
              asking for an exemption rather than removing the policy. You
              need to (a) confirm an exemption is the right tool here, (b)
              author it with a fixed expiry, (c) document why.`,
      stakes: `If we drop the policy entirely we lose protection across all
               other storage accounts. If we say no and the owner sneaks
               around it (manually disabling public-access at the resource
               level), we get a compliance gap.`,
    },
    investigate: {
      summary: 'Review the policy and the exemption mechanism.',
      steps: [
        'Open the Azure Policy lab bench; pick the "Storage public blob access" policy.',
        'Note the effect: <code>deny</code>. Note the field: <code>Microsoft.Storage/storageAccounts/allowBlobPublicAccess</code>.',
        'Recall the exemption mechanism: a separate resource <code>Microsoft.Authorization/policyExemptions</code>. It targets a specific scope (one storage account in this case) and a specific assignment.',
        'Two exemption categories: <code>Waiver</code> (we accept the risk) vs <code>Mitigated</code> (we have a compensating control). For a vendor share window with monitoring, Mitigated fits.',
        'Always set <code>expiresOn</code>. An exemption without expiry is technical debt that becomes audit pain.',
      ],
      labLink: { route: '/practice/azure-policy', label: 'Azure Policy lab bench' },
    },
    decide: {
      question: 'How do you scope the exemption?',
      options: [
        { label: 'Single storage account, expiresOn = +30 days, category Mitigated', good: true,
          explain: 'Smallest blast radius, time-bound, and accurately categorized. Reviewer can see exactly what was waived and why it expires.' },
        { label: 'Whole subscription, no expiry', good: false,
          explain: 'Drops protection for every storage account in the sub indefinitely. Audit nightmare.' },
        { label: 'Resource group, expiresOn = +1 year', good: false,
          explain: 'Too broad and too long. Vendor share is 30 days; the exemption should mirror that.' },
      ],
    },
    build: {
      prompt: `Author the exemption JSON. Target a specific storage account
               scope, set expiresOn 30 days from today, category Mitigated,
               include a description that explains the business reason.`,
      artifactKind: 'azpolicy',
      starter: `{
  "properties": {
    "policyAssignmentId": "/subscriptions/.../providers/Microsoft.Authorization/policyAssignments/...",
    "exemptionCategory": "...",
    "expiresOn": "...",
    "displayName": "...",
    "description": "..."
  }
}`,
      sample: `{
  "properties": {
    "policyAssignmentId": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/policyAssignments/storage-public-blob-deny",
    "policyDefinitionReferenceIds": [],
    "exemptionCategory": "Mitigated",
    "expiresOn": "2026-06-08T00:00:00Z",
    "displayName": "Vendor share - data-eng-sa01",
    "description": "Vendor X requires public blob read for one container. Mitigated by network ACL allowlist of vendor egress IPs and CloudApp DLP scan policy. Owner: storage-eng. Ticket: T-1234. Auto-revoked 2026-06-08."
  }
}`,
    },
    recap: [
      'Exemptions waive a policy for a specific scope without dropping the policy itself.',
      'Categories: Waiver (accept risk) vs Mitigated (compensating control). Pick honestly.',
      'expiresOn is mandatory in practice — without it, exemptions become forever.',
      'Description should give an auditor everything: business reason, owner, mitigation, ticket reference.',
      'Scope tightly: prefer the single resource over the resource group over the subscription.',
    ],
    talkingPoints: [
      `"I'm scoping the exemption to one storage account with a 30-day expiry."`,
      `"Category is Mitigated because we have NACLs and DLP as compensating controls."`,
      `"The description includes owner, ticket, and the mitigation — auditor can verify without messaging me."`,
      `"After 30 days the exemption auto-expires and the policy reasserts; no manual cleanup needed."`,
      `"If the vendor needs an extension, we re-evaluate — we don't just bump the date."`,
    ],
    explainBackKey: 'tkt4_az_exemption',
  },

  // ─── T5 — Azure / Defender ───────────────────────────────────────────────
  {
    id: 'T5',
    num: 'Ticket #5',
    title: 'Defender for Cloud secure score dropped 8 points overnight',
    topic: 'Azure · Defender for Cloud + MCSB',
    cloud: 'azure',
    brief: {
      reporter: 'oncall@corp (Defender daily digest)',
      plain: `Secure score went from 78% to 70% in the last 24h. Three new
              "high" recommendations appeared. Your job: identify which
              recommendations fired, what underlying Azure Policy assignments
              flipped non-compliant, and decide for each one whether to
              auto-remediate, plan a fix, or exempt.`,
      stakes: `Secure score is reported up the org weekly. Sustained drops
               raise questions. Fast triage matters more than a perfect
               answer.`,
    },
    investigate: {
      summary: 'Triage by severity, then by underlying policy.',
      steps: [
        'Defender for Cloud → Recommendations → filter status=Unhealthy, severity=High.',
        'For each: open the recommendation; the panel shows the underlying Azure Policy definition + the failing resources.',
        'Cross-reference the recommendation to its MCSB control (shown in the panel). MCSB control IDs look like <code>NS-1</code>, <code>IM-3</code>, <code>LT-4</code>.',
        'Check Defender for Endpoint (MDE) integration: if a high-severity rec is "machines should have MDE installed", confirm via Defender for Cloud → Inventory → filter unhealthy machines.',
      ],
    },
    decide: {
      question: 'For each unhealthy recommendation, decide your move.',
      options: [
        { label: 'Triage by severity + remediation cost: high+cheap → auto-remediate, high+expensive → plan, low → exempt or accept', good: true,
          explain: 'Pragmatic. A "secure transfer required" toggle is a 1-minute fix; "encrypt all VM disks" is a planned project. Don\'t treat them the same.' },
        { label: 'Auto-remediate everything; secure score is the priority', good: false,
          explain: 'Remediation often restarts resources or changes networking. "Encrypt all disks" without a maintenance window will page someone.' },
        { label: 'Open one big ticket and prioritize next sprint', good: false,
          explain: 'Loses the time-sensitive ones. Cheap fixes should land today, not next sprint.' },
      ],
    },
    build: {
      prompt: `Write a triage note (markdown) listing the 3 hypothetical recs, your
               proposed action for each, and the MCSB control mapping. Use
               this as the standup update.`,
      artifactKind: 'note',
      starter: `# Secure score triage 2026-05-09\n\nDrop: 78% → 70% (-8)\n\n## Recommendations triaged\n\n1. \n2. \n3. `,
      sample: `# Secure score triage 2026-05-09

Drop: 78% → 70% (-8)

## Recommendations triaged

1. **Storage accounts should restrict network access** (MCSB NS-1)
   - 4 storage accounts unhealthy; 3 are dev sandbox (low impact), 1 is shared services.
   - Action: auto-remediate the 3 dev (set publicNetworkAccess=Disabled). For shared services, plan with owners — adds private endpoint.
   - ETA: 3 fixed today; 1 in this week's change window.

2. **Machines should have endpoint protection installed** (MCSB ES-1)
   - 6 VMs missing MDE. Defender for Endpoint provisioning extension policy exists but isn't auto-deploying — likely a missing assignment at the new sub MG.
   - Action: assign the existing initiative at Workloads MG. DeployIfNotExists effect will install MDE on next eval.
   - ETA: assignment done today; full rollout 24h.

3. **Diagnostic logs in Key Vault should be enabled** (MCSB LT-4)
   - 2 vaults. Both prod. Cheap fix: enable diagnostic settings to send to central Log Analytics.
   - Action: open PR against terraform-keyvault module to add diagnostic settings to the spec; apply on merge.
   - ETA: PR today, apply tomorrow with team review.

Score recovery: expect 70 → 75 by EOD, 75 → 79 by Friday.`,
    },
    recap: [
      'Secure score = % of Defender recommendations remediated. Drops mean a rec flipped unhealthy.',
      'Each Defender recommendation has an underlying Azure Policy definition you can read.',
      'MCSB control IDs (NS-1, IM-3, etc.) connect Defender recs back to the security baseline.',
      'Defender for Endpoint feeds into Defender for Cloud for VM coverage.',
      'Triage by (severity × remediation cost). Don\'t treat all unhealthy as urgent or all as planned.',
    ],
    talkingPoints: [
      `"Score dropped 8 points; 3 high-severity recs flipped unhealthy."`,
      `"Two are cheap auto-remediations — landing today. One is a planned project."`,
      `"Each rec maps to an MCSB control, which is what the auditor will check next quarter."`,
      `"For the MDE gap, the policy exists but wasn't assigned at the new MG — that's the real fix."`,
      `"Expect score recovery to 79% by Friday."`,
    ],
    explainBackKey: 'tkt5_defender',
  },

  // ─── T6 — Azure / Runbook (PowerShell) ───────────────────────────────────
  {
    id: 'T6',
    num: 'Ticket #6',
    title: 'PowerShell Runbook to disable public network access on storage',
    topic: 'Azure · Automation Runbook',
    cloud: 'azure',
    brief: {
      reporter: 'Compliance lead',
      plain: `We have an Azure Policy in audit mode that flags storage accounts
              with publicNetworkAccess enabled. Compliance wants a PowerShell
              Runbook in the central Automation account that runs hourly,
              finds these accounts across all subs, and (after a confirmation
              tag check) disables public access. The runbook reports its
              actions back to a Log Analytics workspace.`,
      stakes: `Manual remediation can't keep up with the rate of new
               sandbox subs. A scheduled runbook closes the gap fast.`,
    },
    investigate: {
      summary: 'Map the runbook to its Azure pieces.',
      steps: [
        'Automation account exists in subscription "platform-shared". It has a System-Assigned Managed Identity.',
        'Managed Identity needs <code>Storage Account Contributor</code> at the management-group scope to read+modify storage accounts in any sub beneath.',
        'Az PowerShell modules used: <code>Az.Accounts</code>, <code>Az.Storage</code>, <code>Az.OperationalInsights</code>.',
        '<b>Idempotency check</b> — only act on storage accounts where <code>publicNetworkAccess</code> is currently <code>Enabled</code> AND the tag <code>complianceWaiver</code> is NOT set to <code>true</code>. Tag-based opt-out gives owners a controlled escape hatch.',
        'Reporting — write each action to a custom Log Analytics table via the Data Collector API for audit trail.',
      ],
    },
    decide: {
      question: 'What\'s the right authentication for the Runbook?',
      options: [
        { label: 'System-Assigned Managed Identity on the Automation account', good: true,
          explain: 'No secrets to rotate. Auth flows from the Automation account identity → Az PowerShell. Grant least-privilege RBAC at MG scope.' },
        { label: 'Run As Account (classic)', good: false,
          explain: 'Deprecated in Sep 2023. Don\'t introduce new dependencies on it.' },
        { label: 'A service principal stored in an Automation variable', good: false,
          explain: 'Secrets to rotate, more attack surface, no benefit over Managed Identity here.' },
      ],
    },
    build: {
      prompt: `Write the PowerShell Runbook. Use Connect-AzAccount with -Identity,
               loop subscriptions, find non-compliant storage accounts, respect
               the complianceWaiver tag, set publicNetworkAccess=Disabled, log
               each action. Keep it under 50 lines.`,
      artifactKind: 'powershell',
      starter: `# Runbook: disable public network access on non-compliant storage accounts
Connect-AzAccount -Identity | Out-Null

$subs = Get-AzSubscription

foreach ($sub in $subs) {
  Set-AzContext -SubscriptionId $sub.Id | Out-Null
  # ... your code
}`,
      sample: `# Runbook: disable public network access on storage
# Trigger: schedule, hourly
# Auth: Automation account System-Assigned Managed Identity
# RBAC: Storage Account Contributor at MG scope

Connect-AzAccount -Identity | Out-Null

$actions = @()
$subs = Get-AzSubscription

foreach ($sub in $subs) {
  Set-AzContext -SubscriptionId $sub.Id | Out-Null

  $accounts = Get-AzStorageAccount

  foreach ($a in $accounts) {
    $public = $a.PublicNetworkAccess
    $waiver = $a.Tags["complianceWaiver"]

    if ($public -eq "Enabled" -and $waiver -ne "true") {
      Write-Output "Disabling public access on $($a.StorageAccountName) in $($sub.Name)"
      Set-AzStorageAccount -ResourceGroupName $a.ResourceGroupName \`
                           -Name $a.StorageAccountName \`
                           -PublicNetworkAccess Disabled | Out-Null
      $actions += [PSCustomObject]@{
        TimeGenerated = (Get-Date).ToString("o")
        Subscription  = $sub.Name
        Account       = $a.StorageAccountName
        Action        = "DisabledPublicNetworkAccess"
      }
    }
  }
}

# Send action log to Log Analytics
if ($actions.Count -gt 0) {
  Send-LogToWorkspace -WorkspaceId $env:LA_WORKSPACE_ID \`
                      -SharedKey   $env:LA_SHARED_KEY \`
                      -LogType     "ComplianceRemediation" \`
                      -Body        ($actions | ConvertTo-Json)
}

Write-Output "Done. Actions: $($actions.Count)"`,
    },
    recap: [
      'Automation Runbooks run PowerShell (or Python) on a schedule against Azure.',
      'System-Assigned Managed Identity is the modern auth — no secrets.',
      'Idempotency check + waiver tag gives a controlled escape hatch for owners.',
      'Az.Storage cmdlets to know: Get-AzStorageAccount, Set-AzStorageAccount.',
      'Log Analytics Data Collector API gives an audit trail of remediation actions.',
    ],
    talkingPoints: [
      `"The runbook authenticates via the Automation account's Managed Identity — no secrets in scope."`,
      `"It respects a complianceWaiver tag so owners have a documented opt-out."`,
      `"Each action writes to a Log Analytics custom table — searchable in KQL alongside other audit data."`,
      `"Idempotent: re-running the runbook on a clean environment is a no-op."`,
      `"Schedule is hourly; we can tighten if the rate of new public storage accounts increases."`,
    ],
    explainBackKey: 'tkt6_runbook',
  },

  // ─── T7 — Azure / KQL + Resource Graph ───────────────────────────────────
  {
    id: 'T7',
    num: 'Ticket #7',
    title: 'Auditor wants list of all VMs without endpoint protection',
    topic: 'Azure · KQL + Resource Graph',
    cloud: 'azure',
    brief: {
      reporter: 'audit@corp',
      plain: `For tomorrow's MCSB ES-1 review the auditor wants a CSV of all
              VMs across every subscription that don't have the MDE
              extension installed, with subscription, resource group, OS,
              and last-seen timestamp. Speed > prettiness; you have ~30
              minutes.`,
      stakes: `Showing up unprepared sets the wrong tone with the auditor.
               KQL is the right tool — Resource Graph queries every
               subscription you have read access to in seconds.`,
    },
    investigate: {
      summary: 'Pick the right table, then write the query.',
      steps: [
        'Resource Graph table for resources is <code>Resources</code>.',
        'For VM extensions specifically: query <code>Resources</code> with type starting <code>microsoft.compute/virtualmachines</code>, then check <code>properties.extended.instanceView.extensions</code> OR cross-reference type <code>microsoft.compute/virtualmachines/extensions</code>.',
        'Easier path: <code>Resources</code> rows of type <code>microsoft.compute/virtualmachines/extensions</code> filtered by <code>name == "MDE.Windows"</code> or <code>"MDE.Linux"</code>, then anti-join against the VM list to find what\'s MISSING the extension.',
        'Use <code>summarize</code> to group, <code>project</code> to keep only the columns the auditor needs.',
      ],
      labLink: { route: '/practice/kql', label: 'KQL lab bench (canned tables)' },
    },
    decide: {
      question: 'Anti-join or NOT EXISTS — which KQL pattern?',
      options: [
        { label: 'leftanti join', good: true,
          explain: 'KQL idiom for "rows in left that don\'t match right." Reads cleanly: <code>VMs | join kind=leftanti (Extensions | where name in ("MDE.Windows","MDE.Linux")) on $left.id == $right.vmId</code>.' },
        { label: 'NOT EXISTS subquery', good: false,
          explain: 'KQL doesn\'t have NOT EXISTS as such. You\'d simulate it with leftanti anyway.' },
        { label: 'Loop in PowerShell instead', good: false,
          explain: 'Loses Resource Graph\'s strength — instant query across thousands of resources without per-sub iteration.' },
      ],
    },
    build: {
      prompt: `Write the KQL. Output columns: subscriptionId, resourceGroup,
               vmName, osType, location. Sort by subscriptionId then vmName.
               Then export to CSV from the portal.`,
      artifactKind: 'kql',
      starter: `Resources
| where type == "microsoft.compute/virtualmachines"
| project vmId = id, vmName = name, subscriptionId, resourceGroup,
          osType = tostring(properties.storageProfile.osDisk.osType),
          location
// your join here`,
      sample: `Resources
| where type == "microsoft.compute/virtualmachines"
| project vmId = id, vmName = name, subscriptionId, resourceGroup,
          osType = tostring(properties.storageProfile.osDisk.osType),
          location
| join kind=leftanti (
    Resources
    | where type == "microsoft.compute/virtualmachines/extensions"
    | where name in ("MDE.Windows", "MDE.Linux")
    | extend vmId = tolower(strcat_array(array_slice(split(id, "/"), 0, 8), "/"))
    | project vmId
  ) on $left.vmId == $right.vmId
| project subscriptionId, resourceGroup, vmName, osType, location
| sort by subscriptionId asc, vmName asc`,
    },
    recap: [
      'Resource Graph = Azure-wide query layer over your inventory; KQL is the language.',
      'leftanti is KQL\'s idiom for "rows that don\'t have a match."',
      'For VM-extension presence checks, anti-join is the cleanest pattern.',
      'project / sort / summarize cover 90% of audit queries.',
      'You can save Resource Graph queries and pin them to dashboards for repeat audits.',
    ],
    talkingPoints: [
      `"I used Resource Graph + KQL — one query, all subscriptions, sub-second."`,
      `"The pattern is leftanti join: VMs minus those that have the MDE extension installed."`,
      `"Output columns are exactly what the auditor asked for; CSV exported from the portal."`,
      `"The query is saved and can be pinned to a Defender for Cloud dashboard for ongoing tracking."`,
      `"For chains of audit questions, KQL beats clicking through the portal every time."`,
    ],
    explainBackKey: 'tkt7_kql',
  },

  // ─── T8 — Cross / IaC (drift) ────────────────────────────────────────────
  {
    id: 'T8',
    num: 'Ticket #8',
    title: 'Drifted Azure Policy assignment — re-deploy via Terraform',
    topic: 'Cross · Terraform · Drift',
    cloud: 'tf',
    brief: {
      reporter: 'platform@corp',
      plain: `Someone edited the "Storage public blob deny" policy assignment
              directly in the portal — they changed enforcementMode from
              Default to DoNotEnforce. Audit caught it. The Terraform
              module that owns this assignment is unchanged. Your job: detect
              the drift, plan the re-apply, and put a fence up so this doesn\'t
              happen again.`,
      stakes: `Console edits to Terraform-owned resources turn IaC into a
               lie. If we let it slide once, the codebase becomes
               aspirational rather than authoritative.`,
    },
    investigate: {
      summary: 'Detect drift; trace the change; plan the fix.',
      steps: [
        'In the Terraform repo, run <code>terraform plan -refresh-only</code> against the policy module. Output shows the drifted attribute (enforcementMode = "DoNotEnforce" in real, "Default" in code).',
        'Optional: <code>az policy assignment show</code> + <code>az activity-log list</code> to find who made the change and when. Often a teammate working around an unrelated deploy issue.',
        'Decide: re-apply (drop the change) vs adopt the change into code (if the human change was actually correct).',
        'In this case the policy intent hasn\'t changed; we re-apply.',
        'Add a longer-term fence: assign Reader at the policy scope to the human role and require PRs for enforcement changes.',
      ],
    },
    decide: {
      question: 'After re-apply, how do you prevent recurrence?',
      options: [
        { label: 'Tighten RBAC: only the Terraform service principal has Resource Policy Contributor at this scope', good: true,
          explain: 'Removes the ability for humans to edit. They can still PR against Terraform.' },
        { label: 'Add a Defender alert when policy assignments change', good: 'partial',
          explain: 'Useful as a detective layer, but doesn\'t prevent the change. Pair with the RBAC fix, don\'t use alone.' },
        { label: 'Add a comment in the .tf file saying "do not edit in portal"', good: false,
          explain: 'Comments don\'t prevent anything. The next person under deadline pressure will still click.' },
      ],
    },
    build: {
      prompt: `Write the apply summary you'd post in your team's
               #compliance channel after re-applying.`,
      artifactKind: 'note',
      starter: `## Drift fixed: storage-public-blob-deny\n\n- Drift: \n- Cause: \n- Fix: \n- Prevention: `,
      sample: `## Drift fixed: storage-public-blob-deny

- **Drift detected:** enforcementMode changed from "Default" to "DoNotEnforce" via portal at 2026-05-08 14:03 UTC by user@corp (activity log).
- **Cause:** working around an unrelated deploy that was being blocked; intent was 1-day workaround, never reverted.
- **Fix:** re-applied terraform-policy-module v2.3.1; assignment back to Default enforcement. Verified compliance scan now triggering deny on policy-violating storage accounts.
- **Prevention:** RBAC at the policy assignment scope tightened — only the Terraform service principal has Resource Policy Contributor. Humans need a PR.
- **Detective layer added:** Defender alert "Policy assignment modified" at the MG scope. Routes to #platform-alerts.`,
    },
    recap: [
      'Drift = real cloud state diverging from the IaC source of truth.',
      '<code>terraform plan -refresh-only</code> is the cheapest detection; activity log finds the who/when.',
      'Decide: re-apply (drop the change) or import (adopt the change). Don\'t do both.',
      'Prevent recurrence with RBAC, not comments.',
      'Layer detective alerts on top — Defender or activity-log alert routed to your channel.',
    ],
    talkingPoints: [
      `"Drift detected via plan -refresh-only; activity log named the change author."`,
      `"Re-applied; assignment back to enforced. Compliance scans re-triggering."`,
      `"Long-term fix is RBAC: only the SPN has Policy Contributor at this scope."`,
      `"Added a Defender alert as a backstop in case RBAC gets relaxed later."`,
      `"Comments in Terraform don't stop people; permissions do."`,
    ],
    explainBackKey: 'tkt8_drift',
  },

  // ─── T9 — Cross / Audit evidence ─────────────────────────────────────────
  {
    id: 'T9',
    num: 'Ticket #9',
    title: 'Pull MCSB / AWS audit evidence for control NS-1 / NIST 800-53 SC-7',
    topic: 'Cross · Audit / Evidence',
    cloud: 'both',
    brief: {
      reporter: 'audit@corp',
      plain: `External audit call tomorrow. Auditor wants evidence for one
              control on each cloud: <b>MCSB NS-1</b> (network security)
              for Azure and the AWS equivalent (NIST 800-53 SC-7 in our
              control mapping). For each cloud, produce: the policy/rule
              that enforces it, the current compliance state, and a list of
              non-compliant resources with remediation owners.`,
      stakes: `Auditor judges us on whether we can show evidence quickly,
               not just that controls exist. A messy hour of clicking
               around the portal sets a worse tone than admitting a
               limitation.`,
    },
    investigate: {
      summary: 'For each cloud, walk: control → policy/rule → state → exceptions.',
      steps: [
        '<b>Azure side (MCSB NS-1):</b> Defender for Cloud → Regulatory Compliance → MCSB → NS-1. The pane shows mapped policies and current pass/fail per resource.',
        '<b>Underlying policies:</b> NS-1 maps to multiple — "Storage accounts should restrict network access", "Public IPs should not be assigned to subnets", etc. Use Resource Graph KQL to dump current non-compliant resources.',
        '<b>AWS side:</b> NIST 800-53 SC-7 in our control mapping = "Boundary protection" — relates to SCPs blocking public access + Config rules like <code>s3-bucket-public-access-prohibited</code>, <code>ec2-security-group-attached-to-eni</code>.',
        'Use Config Aggregator (org-wide) → run an advanced query for the relevant rule names.',
        '<b>Exceptions:</b> on Azure, list active policy exemptions for the relevant assignments. On AWS, document any SCP-allowed exceptions. Auditor will ask.',
      ],
    },
    decide: {
      question: 'You discover one undocumented exception (a storage account with public access, no exemption record). What do you tell the auditor?',
      options: [
        { label: 'Disclose it — "we found one undocumented exception during prep, here\'s our remediation plan"', good: true,
          explain: 'Trust matters more than the score. Auditors respect transparency. Hiding it and being caught is worse than disclosing it preemptively.' },
        { label: 'Quietly fix it before the call so they don\'t see it', good: false,
          explain: 'The activity log shows the change; auditors check timing. This goes from "one exception" to "exception + cover-up."' },
        { label: 'Hope they don\'t look at that resource', good: false,
          explain: 'They will look. They have a sampling protocol.' },
      ],
    },
    build: {
      prompt: `Compile the evidence packet (markdown). One section per cloud,
               mapping control → policy/rule → state → exceptions →
               findings. Keep it scannable.`,
      artifactKind: 'note',
      starter: `# Audit evidence — control NS-1 / SC-7\n\n## Azure (MCSB NS-1)\n- Mapped policies: \n- Current state: \n- Exceptions: \n- Open findings: \n\n## AWS (NIST 800-53 SC-7)\n- Mapped Config rules: \n- Current state: \n- Exceptions: \n- Open findings: `,
      sample: `# Audit evidence — control NS-1 / SC-7
Date: 2026-05-09 · Owner: trung.truong@tylertech.com · Audit cycle: Q2

## Azure (MCSB NS-1, "Network security")

**Mapped policies (assigned at Tenant Root MG via MCSB initiative):**
- Storage accounts should restrict network access
- Public IPs should not be assigned to subnets
- Network watcher should be enabled in all regions

**Current state (Defender for Cloud → Regulatory Compliance → MCSB → NS-1):**
- 92% pass · 8% fail (12 of 148 resources)

**Active exemptions:**
- 1 storage account, "vendor-share-data-eng-sa01", expiresOn 2026-06-08, category Mitigated. Ticket T-1234.

**Open findings (non-exempt non-compliant):**
- 11 storage accounts in 3 sandbox subs — auto-remediation runbook scheduled hourly (T6).
- 1 public IP attached to a test VM — owner notified, removal in this week's change window.

## AWS (NIST 800-53 SC-7, "Boundary protection")

**Mapped Config rules (org-wide via Config Aggregator):**
- s3-bucket-public-access-prohibited
- ec2-security-group-attached-to-eni
- vpc-default-security-group-closed

**Current state (Config compliance dashboard):**
- 96% compliant · 4% non-compliant (5 of 124 resources)

**Active exceptions:**
- None.

**Open findings:**
- 3 default security groups in older sandbox accounts — Terraform PR open to close them (#PR-921).
- 2 unattached EIPs flagged by detective rule — recovered via cleanup runbook in next maintenance window.

## Disclosure

During prep we found 1 storage account with public access that did NOT have an
exemption recorded. Created exemption record retroactively, owner contacted,
ticket T-1235 to confirm the business reason.`,
    },
    recap: [
      'Audit evidence = control → mapped rules → current state → exceptions → open findings.',
      'On Azure, MCSB Regulatory Compliance pane is the entry point.',
      'On AWS, Config Aggregator gives the org-wide view of rule compliance.',
      'Exceptions and exemptions belong in the evidence packet — auditor will ask about them either way.',
      'Disclose discovered gaps preemptively. Trust > hidden score.',
    ],
    talkingPoints: [
      `"For NS-1 we're at 92% on Azure, 96% equivalent on AWS."`,
      `"Mapping: NS-1 to about 6 underlying policies on Azure; equivalent SCPs and 3 Config rules on AWS."`,
      `"Active exemptions are documented and time-bound; exceptions on AWS are zero."`,
      `"During prep we found one storage account without an exemption record — disclosed and remediated, retroactively documented."`,
      `"Auto-remediation runbook is the long-term fix for the recurring sandbox storage findings."`,
    ],
    explainBackKey: 'tkt9_audit',
  },

];

export function ticketById(id) {
  return TICKETS.find(t => t.id === id) || null;
}
