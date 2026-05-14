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
      plain: `A dev account created an IAM user with <code>s3:*</code>. Org policy
              is SSO-only — no IAM users anywhere. The detective rule fired,
              meaning our preventive SCP has a gap. Confirm it, write the SCP,
              propose where to attach.`,
      stakes: `Each IAM user is a long-lived credential we can't rotate
               centrally. Auditor asked yesterday for proof they're gone.`,
    },
    doneWhen: [
      'SCP JSON is valid: <code>Effect: "Deny"</code>, action list covers the IAM user surface (<code>CreateUser</code>, <code>CreateLoginProfile</code>, <code>CreateAccessKey</code> at minimum), <b>without</b> blocking <code>CreateRole</code> / <code>CreateServiceLinkedRole</code>.',
      'Proposed attach point is the <b>org root</b> (not the Dev OU) — and you can articulate why (broadest blast radius, no future OU can re-permit).',
      'Plan addresses BOTH halves: a preventive SCP for new IAM users AND a one-time cleanup of the existing user. Detective rule alone is not the fix.',
    ],
    investigate: {
      summary: 'Open the SCP lab bench and trace what happens today.',
      steps: [
        'Pick "No SCP attached" + an IAM policy granting <code>iam:CreateUser</code>.',
        'Run <code>iam:CreateUser</code>. It succeeds — no SCP denies it.',
        'Switch SCP to "Deny IAM users (force IIC)" and re-run. Now denied at the SCP layer before IAM is consulted.',
        'Confirm: no such SCP attached on the path from root to dev account.',
      ],
      labLink: { route: '/practice/scp', label: 'Open SCP + IAM lab bench' },
    },
    decide: {
      question: 'Where do you attach this SCP?',
      options: [
        { label: 'Root of the AWS Organization', good: true,
          explain: 'Best blast radius. Org-wide policy belongs at root; no future OU can re-permit. Exempt management account via NotAction if needed.' },
        { label: 'Dev OU only', good: false,
          explain: 'Too narrow. Same gap exists in every other OU. Attach at root unless a sub-tree genuinely needs IAM users.' },
        { label: 'Each member account individually', good: false,
          explain: 'Defeats OUs. Control Tower vended accounts would land without it; manual attach every time is fragile.' },
        { label: 'Permission Boundary on the dev role', good: false,
          explain: 'Boundaries cap one principal. They don\'t scale to "no IAM users anywhere" — that\'s an SCP job.' },
      ],
    },
    build: {
      prompt: `Write the SCP. Deny the IAM user surface (<code>CreateUser</code>,
               <code>CreateLoginProfile</code>, <code>CreateAccessKey</code>).
               Keep <code>CreateRole</code> and <code>CreateServiceLinkedRole</code>
               out — workloads need them.`,
      steps: [
        {
          label: 'Skeleton — declare the policy and one Deny statement',
          body: `<p>Start with the skeleton: <code>Version</code> + one <code>Statement</code> with <code>Effect: "Deny"</code> and wildcard <code>Resource</code>. Action list empty for now.</p>
<pre><code>{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyIAMUsersAndKeys",
    "Effect": "Deny",
    "Action": [],
    "Resource": "*"
  }]
}</code></pre>`,
        },
        {
          label: 'Minimum surface — block the three obvious actions',
          body: `<p>Fill the Action list with the three actions that <i>create</i> an IAM user. This closes the gap the detective rule caught:</p>
<pre><code>"Action": [
  "iam:CreateUser",
  "iam:CreateLoginProfile",
  "iam:CreateAccessKey"
]</code></pre>
<p>Junior stops here. Senior keeps going — more actions <i>extend</i> a user's lifetime.</p>`,
        },
        {
          label: 'Production surface — close the long-lived-credential adjacencies',
          body: `<p>Add actions that prolong a credential or attach another login surface. Tighten <code>Resource</code> to the user ARN so role actions aren't matched.</p>
<pre><code>"Action": [
  "iam:CreateUser",
  "iam:CreateLoginProfile",
  "iam:CreateAccessKey",
  "iam:UpdateAccessKey",
  "iam:UploadSigningCertificate",
  "iam:UploadSSHPublicKey"
],
"Resource": "arn:aws:iam::*:user/*"</code></pre>
<p>Verify: <code>CreateRole</code> and <code>CreateServiceLinkedRole</code> are NOT in the list.</p>`,
        },
      ],
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
    takeaways: [
      { point: 'Preventive SCP blocks IAM user creation; detective Config rules only find what already happened.',
        sayItOutLoud: '"The detective rule did its job — found the user. The gap was no preventive SCP."' },
      { point: 'Attach guardrails at org root unless you have a specific reason to scope narrower.',
        sayItOutLoud: '"I\'m proposing a deny at org root for CreateUser, CreateLoginProfile, CreateAccessKey."' },
      { point: 'SCPs evaluate before IAM. If the SCP denies, IAM never gets a vote.',
        sayItOutLoud: '"This won\'t break service-linked roles or normal role creation — those actions stay allowed."' },
      { point: 'SCP only stops new users — existing ones need a separate cleanup pass.',
        sayItOutLoud: '"For the existing user, I\'ll open a cleanup PR; the SCP only stops new ones."' },
      { point: 'Complete fix = SCP at root + one-time cleanup + Config rule as ongoing detective layer.' },
    ],
    production: [
      'Announce in <code>#platform-changes</code> 24h before enforcing. Friday-afternoon CI breaks without warning are how trust dies.',
      'Run <b>audit-only via Service Authorization analyzer</b> for ~1 week first. Catches workloads quietly creating IAM users.',
      'Service-linked roles are exempt from SCPs. Confirm CloudFormation, Config, and other service principals you depend on aren\'t affected.',
      '<b>Document the exception process IN ADVANCE.</b> The first request lands within 48h. Have a JIRA template + SLA ready.',
      'Alarm CloudWatch on <code>AccessDenied</code> with <i>"explicit deny in a service control policy"</i> for 2 weeks — your broken-workload canary.',
    ],
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
      plain: `FinOps (chargeback owners) need every resource to carry an "Owner"
              tag that looks like an email. The managed <code>required-tags</code>
              rule checks key presence only — not format. We need a CUSTOM
              Config rule that emits NON_COMPLIANT for missing or malformed.`,
      stakes: `Without this, chargeback is inaccurate. CFO escalation is one cycle away.`,
    },
    doneWhen: [
      'Lambda handler returns <code>{ Compliance: "COMPLIANT" | "NON_COMPLIANT", Annotation: "&lt;reason&gt;" }</code> per evaluated resource.',
      'Validates Owner tag is <b>present</b> AND <b>contains "@"</b> — annotation distinguishes missing vs malformed.',
      'Trigger type chosen with a reason. (For "tag added/removed/changed," configuration-change is correct; periodic is overkill and adds 24h lag.)',
    ],
    investigate: {
      summary: 'Check if the managed rule covers it, then design the custom Lambda.',
      steps: [
        'Managed <code>required-tags</code> checks key presence with expected values — no regex.',
        'Custom rules are Lambdas. They receive a Config item and return COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE.',
        'Email-format check needs a regex — Lambda fits.',
        'Trigger: <code>configuration-changes</code> fires on each change; <code>periodic</code> runs on schedule. For tags, configuration-changes is more responsive.',
      ],
    },
    decide: {
      question: 'What\'s the right trigger and what scope do you target?',
      options: [
        { label: 'Configuration-change, scoped to taggable types', good: true,
          explain: 'Tags change on resource updates; this fires immediately. Scope to <code>AWS::EC2::Instance</code>, <code>AWS::S3::Bucket</code>, etc. to skip untaggable types.' },
        { label: 'Periodic, every 24h, all resources', good: false,
          explain: '24h lag before non-compliance shows. Untaggable types (e.g., AWS::Config::ConfigRule itself) waste evaluations.' },
        { label: 'Configuration-change, all resources unscoped', good: false,
          explain: 'Fires on resources that can\'t be tagged. Wastes Lambda invocations.' },
      ],
    },
    build: {
      prompt: `Write the Lambda handler. Validate Owner tag exists AND contains
               "@". Return COMPLIANT or NON_COMPLIANT with an annotation
               explaining which check failed.`,
      steps: [
        {
          label: 'Skeleton — read the resource, return a default verdict',
          body: `<p>Config invokes your Lambda with the snapshot in <code>event.invokingEvent</code>. Parse it, pull <code>tags</code>, return COMPLIANT for now.</p>
<pre><code>exports.handler = async (event) => {
  const item = JSON.parse(event.invokingEvent).configurationItem;
  const tags = item.tags || {};
  return {
    Compliance: "COMPLIANT",
    Annotation: "TBD"
  };
};</code></pre>`,
        },
        {
          label: 'Validate presence — does Owner exist and is it non-empty?',
          body: `<p>If Owner isn't set, fail and name the issue in the annotation — FinOps reads that string in the Config console.</p>
<pre><code>const owner = tags.Owner;
if (!owner || owner.length === 0) {
  return {
    Compliance: "NON_COMPLIANT",
    Annotation: "Missing required tag: Owner"
  };
}</code></pre>`,
        },
        {
          label: 'Validate format — must contain "@"',
          body: `<p>Don't over-engineer a full RFC regex — "contains @" is the bar FinOps wants. Make the annotation say <i>which</i> check failed.</p>
<pre><code>if (!owner.includes("@")) {
  return {
    Compliance: "NON_COMPLIANT",
    Annotation: \`Owner tag is malformed (no "@"): "\${owner}"\`
  };
}
return {
  Compliance: "COMPLIANT",
  Annotation: \`Owner tag valid: \${owner}\`
};</code></pre>`,
        },
      ],
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
    takeaways: [
      { point: 'Custom Config rule = Lambda returning COMPLIANT / NON_COMPLIANT per resource, with an annotation.',
        sayItOutLoud: '"Managed required-tags can\'t do format validation; we need a Lambda."' },
      { point: 'configuration-changes trigger gives near-immediate feedback; periodic adds 24h lag.',
        sayItOutLoud: '"Non-compliance shows up within a minute of the bad tag landing."' },
      { point: 'Scope to resource types that actually support the check — saves invocations.',
        sayItOutLoud: '"I\'m scoping to taggable resources only — skips the long tail of internal types."' },
      { point: 'Annotation strings surface in the Config console — write them so on-call can act without context.',
        sayItOutLoud: '"The annotation tells FinOps exactly why each resource failed — missing vs malformed."' },
    ],
    production: [
      'Estimate per-resource evaluation cost BEFORE deploying. Change-triggered on EC2/ENI/EBS can <b>10x your Config bill</b>.',
      'Alarm on the Lambda\'s error rate. A silently failing rule reports "no non-compliant" — looks like success but is missing data.',
      'Use <b>Config Aggregator</b> for org-wide reporting. Auditors want one number across the org, not per-account dashboards.',
      'Auto-remediation via SSM: only enable after a week of <b>"annotate but don\'t fix"</b>. Humans need lead time before the bot acts.',
      'Tag the rule with owner + JIRA + intent in the description. Six months later, you\'ll forget why it exists.',
    ],
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
      plain: `Day-1 acceptance check before handing keys to the workload team.
              Account "data-eng-sandbox-2" was just vended via Control Tower
              Account Factory into the Sandbox OU. Verify Mandatory CT controls,
              our Sandbox-OU Strongly Recommended ones, and org-root SCPs all
              applied.`,
      stakes: `Missing controls = ungoverned resources. Verifying now beats revoking access mid-day.`,
    },
    doneWhen: [
      'All <b>Mandatory CT controls</b> confirmed present on the new account (preventive SCPs + detective Config rules at minimum).',
      '<b>Strongly Recommended</b> controls enabled at Sandbox OU confirmed inherited; any opt-outs documented with reason.',
      'A short <b>hand-off note</b> written for the workload team: what\'s blocked, who to ask for an exemption, where to read denied actions.',
    ],
    investigate: {
      summary: 'Walk the control inventory by type — Preventive, Detective, Proactive.',
      steps: [
        '<b>Preventive (SCPs):</b> Organizations console, view policies on path Root → Workloads → Sandbox OU → new account. Confirm inheritance.',
        '<b>Detective (Config rules):</b> Control Tower → Controls. Confirm Sandbox-OU rules show up in the new account\'s Config console.',
        '<b>Proactive (CFN Hooks):</b> deploy a deliberately bad template (unencrypted S3). It should FAIL with a hook violation.',
        'Cross-check the Account Factory deployment status — shows baseline applied or errored.',
      ],
    },
    decide: {
      question: 'A teammate suggests skipping the verification because "Control Tower is reliable." How do you respond?',
      options: [
        { label: 'Verify anyway — drift is the audit-finding pattern', good: true,
          explain: 'Account Factory can succeed at the workflow level while a control fails silently (region constraint, quota). 5 minutes now beats days of audit fallout.' },
        { label: 'Skip — Control Tower has its own dashboard', good: false,
          explain: 'CT\'s dashboard shows <i>configured</i> controls, not <i>applied</i> controls. They diverge under failure.' },
        { label: 'Verify only preventive SCPs — riskiest layer', good: false,
          explain: 'Detective gaps cause silent non-compliance until audit finds it. They matter as much as preventive.' },
      ],
    },
    build: {
      prompt: `Write a short verification checklist (markdown) the next on-call
               can use. Cover the three control types + one cross-check. Keep
               under 12 lines.`,
      steps: [
        {
          label: 'List the three control types as headings',
          body: `<p>Start with P-D-P as the skeleton. Each section gets a one-line "what to click, what to confirm" bullet.</p>
<pre><code>## CT account verification checklist

- [ ] Preventive (SCPs): ...
- [ ] Detective (Config rules): ...
- [ ] Proactive (CFN Hooks): ...</code></pre>`,
        },
        {
          label: 'Fill in what to look at and what "good" looks like',
          body: `<p>For each row, name the exact console + the success signal. The next on-call shouldn\'t have to think.</p>
<pre><code>- [ ] **Preventive SCPs** — Organizations console; SCPs on path Root → OU → account list DenyNonAllowedRegions + DenyIAMUsers.
- [ ] **Detective rules** — Config console (assume role in new account); expected rules listed AND status = EVALUATING (not "Insufficient data").
- [ ] **Proactive Hooks** — deploy a deliberately bad CFN template; deploy must FAIL with hook violation.</code></pre>`,
        },
        {
          label: 'Add the cross-checks an auditor cares about',
          body: `<p>Two more bullets the workload team forgets but the auditor opens with: logging (CloudTrail to central archive) and identity (IAM Identity Center permission set attached).</p>
<pre><code>- [ ] **Account Factory status** — CT dashboard shows account "Available," no deployment errors.
- [ ] **Logging** — CloudTrail trail exists; logs delivered to central log-archive bucket.
- [ ] **Identity** — IAM Identity Center permission set for the team is attached.</code></pre>`,
        },
      ],
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
    takeaways: [
      { point: 'Control Tower automates landing-zone setup, but verification is still your job.',
        sayItOutLoud: '"I verified all three CT control types on the new account — preventive, detective, proactive."' },
      { point: 'P-D-P: Preventive (SCP), Detective (Config rule), Proactive (CFN Hook). Check all three.',
        sayItOutLoud: '"Mandatory + Sandbox-OU controls are present and evaluating."' },
      { point: 'CT\'s configured-vs-applied gap is where audit findings hide — check the new account directly, not just the dashboard.',
        sayItOutLoud: '"I tested a bad CFN template against proactive Hooks — it correctly failed."' },
      { point: 'A reusable checklist saves the next on-call from rebuilding the mental model.',
        sayItOutLoud: '"I left a 6-item checklist in the runbook for next time."' },
    ],
    production: [
      'Check <b>drift status</b> in the CT console, not just initial-enrollment status. Drift = a guardrail that silently failed.',
      'Verify the new account inherited BOTH OU-level SCPs <b>and</b> org-root SCPs. Newcomers check one and miss the other.',
      'Confirm the Account Factory pipeline reported success end-to-end. Orphaned half-vended accounts are a real failure mode.',
      'Confirm CloudTrail logs land in the central log-archive bucket. That\'s what auditors grep — not the CT console.',
      'Hand-off note: which controls block what, exemption process, where to read the central log of denied actions.',
    ],
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
      plain: `An owner needs to share one storage account with a vendor that
              requires public blob access for 30 days. The "deny public blob"
              policy blocks it. Author a scoped, time-bound exemption — don\'t
              drop the policy.`,
      stakes: `Dropping the policy loses protection org-wide. Saying no risks the owner sneaking around it — a silent compliance gap.`,
    },
    doneWhen: [
      'Exemption is <b>scoped at the resource</b> (or at most the resource group) — never at the MG. Smallest blast radius that still works.',
      'Exemption has an <b>expiry ≤ 90 days</b> from today, encoded in the resource itself (<code>expiresOn</code>).',
      'Metadata tags include: requester, JIRA ticket, business justification, <b>renewal cadence</b>. A calendar reminder is set 14 days before expiry.',
    ],
    investigate: {
      summary: 'Review the policy and the exemption mechanism.',
      steps: [
        'Open the Azure Policy lab; pick the "Storage public blob access" policy.',
        'Effect is <code>deny</code>; field is <code>Microsoft.Storage/storageAccounts/allowBlobPublicAccess</code>.',
        'Exemption is its own resource <code>Microsoft.Authorization/policyExemptions</code> — targets a specific scope + assignment.',
        'Categories: <code>Waiver</code> (accept risk) vs <code>Mitigated</code> (compensating control). Vendor share with monitoring = Mitigated.',
        'Always set <code>expiresOn</code>. No-expiry exemptions become audit pain.',
      ],
      labLink: { route: '/practice/azure-policy', label: 'Azure Policy lab bench' },
    },
    decide: {
      question: 'How do you scope the exemption?',
      options: [
        { label: 'Single account, +30d expiry, Mitigated', good: true,
          explain: 'Smallest blast radius, time-bound, honestly categorized. Reviewer sees exactly what was waived and when it expires.' },
        { label: 'Whole subscription, no expiry', good: false,
          explain: 'Drops protection for every storage account in the sub indefinitely. Audit nightmare.' },
        { label: 'Resource group, +1 year', good: false,
          explain: 'Too broad and too long. Vendor share is 30 days; the exemption should mirror that.' },
      ],
    },
    build: {
      prompt: `Author the exemption JSON. Target a single storage account,
               expiresOn = +30 days, category Mitigated, description with
               the business reason and compensating controls.`,
      steps: [
        {
          label: 'Skeleton — point at the right policy assignment',
          body: `<p>An exemption (<code>Microsoft.Authorization/policyExemptions</code>) silences one assignment for one scope. Start with <code>policyAssignmentId</code>.</p>
<pre><code>{
  "properties": {
    "policyAssignmentId": "/subscriptions/.../providers/Microsoft.Authorization/policyAssignments/storage-public-blob-deny",
    "exemptionCategory": "...",
    "expiresOn": "..."
  }
}</code></pre>`,
        },
        {
          label: 'Set the category and a 30-day expiry',
          body: `<p>Category honestly: <code>Mitigated</code> = policy is right AND we have a compensating control (NACL, DLP). <code>Waiver</code> = accept risk. Vendor share with monitoring → <b>Mitigated</b>. <code>expiresOn</code> ≤90 days, ISO 8601.</p>
<pre><code>"exemptionCategory": "Mitigated",
"expiresOn": "2026-06-11T00:00:00Z"</code></pre>`,
        },
        {
          label: 'Write the description that an auditor will read first',
          body: `<p>The <code>description</code> is what an auditor opens first. Give them all five: business reason, compensating control, owner, ticket, auto-revoke date.</p>
<pre><code>"displayName": "Vendor share - data-eng-sa01",
"description": "Vendor X requires public blob read on one container for 30 days. Mitigated by (a) network ACL allowlist of vendor egress IPs and (b) CloudApp DLP scan policy on the container. Owner: storage-eng. Ticket: T-1234. Auto-revoked 2026-06-11."</code></pre>`,
        },
      ],
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
    takeaways: [
      { point: 'Exemption waives a policy for one scope without dropping the policy itself.',
        sayItOutLoud: '"I\'m scoping the exemption to one storage account with a 30-day expiry."' },
      { point: 'Categories: Waiver (accept risk) vs Mitigated (compensating control). Pick honestly.',
        sayItOutLoud: '"Category is Mitigated because we have NACLs and DLP as compensating controls."' },
      { point: 'expiresOn is mandatory in practice — without it, exemptions become forever.',
        sayItOutLoud: '"After 30 days the exemption auto-expires and the policy reasserts."' },
      { point: 'Description gives auditors everything: business reason, owner, mitigation, ticket.',
        sayItOutLoud: '"The description has owner, ticket, and mitigation — auditor can verify without messaging me."' },
      { point: 'Scope tightly: single resource > resource group > subscription > MG.' },
    ],
    production: [
      'Exemption MUST have an <b>expiry</b>. Default 90 days, never "permanent." Permanent exemptions become audit findings.',
      'Tag with requester, JIRA, business justification, renewal cadence. Auditors ask all four; missing one = failed question.',
      'Notify the owner <b>14 days before expiry</b>. Silent lapses re-block prod at 2am and owners blame compliance, not the calendar.',
      'Scope as tightly as possible: resource &gt; RG &gt; subscription &gt; MG. The exemption shouldn\'t cover more than it has to.',
      'Track exemption count over time. <b>Steady growth = policy is wrong for the org</b>; relax the policy rather than approve more exemptions.',
    ],
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
      plain: `Secure score dropped 78 → 70 in 24h. Three new high-severity recs
              appeared. Identify which recs fired, trace each to its underlying
              policy, and decide per-rec: auto-remediate, plan, or exempt.`,
      stakes: `Secure score is reported weekly. Sustained drops raise questions. Fast triage beats a perfect answer.`,
    },
    doneWhen: [
      'Each unhealthy high-severity rec is mapped to its <b>MCSB control ID</b> (e.g., <code>NS-1</code>, <code>ES-1</code>, <code>LT-4</code>) <i>and</i> its underlying Azure Policy definition.',
      'For each rec: <b>action + owner + ETA</b> identified. Auto-remediate / plan / exempt — pick one with reason.',
      'Score recovery projection given (e.g., <i>"70 → 75 by EOD, 79 by Friday"</i>). Stakeholders want a number, not a "we\'re working on it."',
    ],
    investigate: {
      summary: 'Triage by severity, then by underlying policy.',
      steps: [
        'Defender for Cloud → Recommendations → filter status=Unhealthy, severity=High.',
        'Open each rec. The panel shows the underlying Azure Policy + failing resources.',
        'Cross-reference each rec to its MCSB control ID (e.g., <code>NS-1</code>, <code>IM-3</code>, <code>LT-4</code>).',
        'If a rec is "machines missing MDE," confirm via Defender for Cloud → Inventory → unhealthy machines.',
      ],
    },
    decide: {
      question: 'For each unhealthy recommendation, decide your move.',
      options: [
        { label: 'Triage by severity × remediation cost', good: true,
          explain: 'High+cheap → auto-remediate; high+expensive → plan; low → exempt or accept. A toggle is 1 minute; encrypt-all-disks is a project.' },
        { label: 'Auto-remediate everything', good: false,
          explain: 'Remediation often restarts resources or changes networking. Encrypt-all-disks without a window pages someone.' },
        { label: 'One big ticket, prioritize next sprint', good: false,
          explain: 'Loses the time-sensitive ones. Cheap fixes should land today, not next sprint.' },
      ],
    },
    build: {
      prompt: `Write a triage note (markdown) listing the 3 recs, the MCSB
               control for each, action + ETA, and a score-recovery
               projection. This is your standup update.`,
      steps: [
        {
          label: 'Header — the number stakeholders want',
          body: `<p>Open with the secure-score delta. That's the line read aloud in standup.</p>
<pre><code># Secure score triage 2026-05-09

Drop: 78% → 70% (-8)

## Recommendations triaged

1. ...
2. ...
3. ...</code></pre>`,
        },
        {
          label: 'Per-rec body — name + MCSB control + scope + count',
          body: `<p>Four facts per rec before deciding anything: the rec name, MCSB control ID, where (subs/RGs/VMs), and how many. This is what the auditor checks.</p>
<pre><code>1. **Storage accounts should require secure transfer** (MCSB NS-2)
   - 4 storage accounts unhealthy; 3 dev sandbox, 1 shared services.
2. **Machines should have endpoint protection installed** (MCSB ES-1)
   - 6 VMs missing MDE in the new "data-eng" sub.
3. **Diagnostic logs in Key Vault should be enabled** (MCSB LT-4)
   - 2 vaults, both prod.</code></pre>`,
        },
        {
          label: 'Action + ETA per rec, then score-recovery projection',
          body: `<p>Apply the triage matrix (severity × cost × user impact) and write each action with a date. Close with a recovery number — stakeholders want a date, not a vibe.</p>
<pre><code>1. Storage / NS-2: <b>auto-remediate</b> dev today (set publicNetworkAccess=Disabled); plan shared services for the change window. ETA: 3 today, 1 this week.
2. MDE / ES-1: <b>assign existing initiative</b> at Workloads MG. DINE will install on next eval. ETA: assignment today, rollout 24h.
3. Key Vault / LT-4: <b>PR to terraform-keyvault module</b> adding diagnostic settings. ETA: PR today, apply tomorrow.

Score recovery: 70 → 75 by EOD, 75 → 79 by Friday.</code></pre>`,
        },
      ],
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
    takeaways: [
      { point: 'Secure score = % of Defender recommendations remediated. A drop means a rec flipped unhealthy.',
        sayItOutLoud: '"Score dropped 8 points; 3 high-severity recs flipped unhealthy."' },
      { point: 'Each Defender rec has an underlying Azure Policy definition; each maps to an MCSB control ID.',
        sayItOutLoud: '"Each rec maps to an MCSB control, which is what the auditor will check next quarter."' },
      { point: 'Triage by severity × remediation cost. Cheap auto-remediations land today; expensive fixes get planned.',
        sayItOutLoud: '"Two are cheap auto-remediations landing today. One is a planned project."' },
      { point: 'MDE-not-installed patterns are usually missing initiative assignment, not broken policy.',
        sayItOutLoud: '"The policy exists but wasn\'t assigned at the new MG — that\'s the real fix."' },
      { point: 'Always close with a score-recovery date. Stakeholders want a number, not a vibe.',
        sayItOutLoud: '"Expect score recovery to 79% by Friday."' },
    ],
    production: [
      'Triage matrix: <b>severity × remediation cost × user impact</b>. Low-impact auto-remediations go first; high-cost waits for planning.',
      '"MDE not installed" is almost always missing initiative assignment at the new MG, not a broken policy. Check scope before policy logic.',
      'Set up <b>Workflow Automation</b> (Logic Apps) to open a ticket per new high-severity rec. Automate the inbox; don\'t scan manually.',
      'Continuous-export Defender alerts to <b>Log Analytics</b>. KQL over LA history is how you spot trends ("3 new public-storage recs — what changed?").',
      'Keep a <code>compliance-runbooks/</code> repo: one markdown file per rec type. Saves ~30 min per ticket and onboards faster.',
    ],
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
      plain: `An Azure Policy in audit mode flags storage accounts with
              publicNetworkAccess enabled. Build a PowerShell Runbook (central
              Automation account, hourly) that finds them across all subs,
              respects a waiver tag, disables public access, and logs to LA.`,
      primer: `A <b>Runbook</b> is a script (PowerShell or Python) an <b>Automation
               account</b> runs on schedule — "cron job with Azure auth baked
               in." The Automation account owns a <b>Managed Identity</b> (no
               secrets). Don\'t use Runbooks for sub-second remediation — use
               Logic Apps + Event Grid.`,
      stakes: `Manual remediation can\'t keep up with new sandbox subs. A scheduled runbook closes the gap.`,
    },
    doneWhen: [
      'Runbook authenticates via <b>Managed Identity</b> (<code>Connect-AzAccount -Identity</code>) — no embedded credentials anywhere.',
      'Acts only on storage accounts where <code>publicNetworkAccess == "Enabled"</code> AND tag <code>complianceWaiver != "true"</code>. Tag is the owner\'s controlled escape hatch.',
      'Every action (or skip) writes a row to a custom Log Analytics table via the Data Collector API — audit trail.',
      'Schedule defined (e.g., <i>hourly</i>) with a buffer so the runbook doesn\'t overlap itself.',
    ],
    investigate: {
      summary: 'Map the runbook to its Azure pieces.',
      steps: [
        'Automation account in subscription "platform-shared" with a System-Assigned Managed Identity.',
        'Managed Identity needs <code>Storage Account Contributor</code> at MG scope to act on any sub beneath.',
        'Modules: <code>Az.Accounts</code>, <code>Az.Storage</code>, <code>Az.OperationalInsights</code>.',
        '<b>Idempotency:</b> act only when <code>publicNetworkAccess == Enabled</code> AND tag <code>complianceWaiver != true</code> — owners get a controlled opt-out.',
        'Write each action to a custom Log Analytics table via the Data Collector API for audit trail.',
      ],
    },
    decide: {
      question: 'What\'s the right authentication for the Runbook?',
      options: [
        { label: 'System-Assigned Managed Identity', good: true,
          explain: 'No secrets to rotate. Auth flows from Automation account identity → Az PowerShell. Grant least-privilege RBAC at MG scope.' },
        { label: 'Run As Account (classic)', good: false,
          explain: 'Deprecated Sep 2023. Don\'t introduce new dependencies on it.' },
        { label: 'SPN in an Automation variable', good: false,
          explain: 'Secrets to rotate, more attack surface, no benefit over Managed Identity.' },
      ],
    },
    build: {
      prompt: `Write the Runbook: Connect-AzAccount -Identity, loop subs, find
               non-compliant storage, respect complianceWaiver tag, disable
               public access, log each action. Under 50 lines.`,
      steps: [
        {
          label: 'Skeleton — managed-identity auth + the subscription loop',
          body: `<p>Every Az runbook starts the same: <code>Connect-AzAccount -Identity</code> uses the Automation account identity (no embedded creds), then enumerate subs.</p>
<pre><code>Connect-AzAccount -Identity | Out-Null
$subs = Get-AzSubscription

foreach ($sub in $subs) {
  Set-AzContext -SubscriptionId $sub.Id | Out-Null
  $accounts = Get-AzStorageAccount
  # next step
}</code></pre>`,
        },
        {
          label: 'Idempotency filter — skip the ones that don\'t need action',
          body: `<p>Hourly cadence means most accounts are already compliant. Two skip filters: already-disabled, and waiver tag set. Owner-controlled escape hatch.</p>
<pre><code>foreach ($acct in $accounts) {
  if ($acct.PublicNetworkAccess -eq 'Disabled') { continue }
  if ($acct.Tags['complianceWaiver'] -eq 'true') {
    Write-Output "SKIP (waiver): $($acct.StorageAccountName)"
    continue
  }
  # next step — act
}</code></pre>`,
        },
        {
          label: 'Act + log to Log Analytics',
          body: `<p>Disable public access, then write a row to a custom LA table (<code>RunbookActions_CL</code>) via Data Collector API. That row is the audit trail. Wrap in <code>try/catch</code> with <code>Write-Error</code> (not <code>Throw</code>) so one bad sub doesn\'t kill the run.</p>
<pre><code>Set-AzStorageAccount -ResourceGroupName $acct.ResourceGroupName \`
                      -Name $acct.StorageAccountName \`
                      -PublicNetworkAccess Disabled | Out-Null

$logRow = @{
  TimeGenerated   = (Get-Date).ToUniversalTime().ToString("o")
  Subscription    = $sub.Name
  StorageAccount  = $acct.StorageAccountName
  Action          = "DisabledPublicNetworkAccess"
}
# Send-OmsLog (Az.OperationalInsights / Data Collector API) — see worked example
Write-Output "FIXED: $($acct.StorageAccountName)"</code></pre>`,
        },
      ],
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
    takeaways: [
      { point: 'Runbooks run PowerShell (or Python) on schedule via Automation account — cron with Azure auth.',
        sayItOutLoud: '"It authenticates via the Automation account\'s Managed Identity — no secrets in scope."' },
      { point: 'System-Assigned Managed Identity is the modern auth — no secrets to rotate.',
        sayItOutLoud: '"No secrets in scope; identity is tied to the Automation account."' },
      { point: 'Idempotency check + waiver tag gives owners a documented escape hatch.',
        sayItOutLoud: '"It respects a complianceWaiver tag so owners have a documented opt-out."' },
      { point: 'Log every action to a Log Analytics custom table — searchable in KQL alongside other audit data.',
        sayItOutLoud: '"Each action writes to a custom LA table, queryable next to the rest of our audit trail."' },
      { point: 'Re-running the runbook on a clean environment is a no-op. That\'s the idempotency win.' },
    ],
    production: [
      'Use a <b>User-Assigned Managed Identity</b> in production. System-Assigned dies with the Automation account; user-assigned survives and is reusable.',
      'Use <code>Write-Error</code> not <code>Throw</code> on per-resource failures. One bad sub shouldn\'t kill the run.',
      'Output stream limit ~1MB per job. Bigger payloads go to Log Analytics or blob storage; emit only a pointer.',
      'Schedule with buffer — never run a 30-min runbook every 30 min. Cadence ≥ 2× worst-case runtime; overlap causes double-remediation.',
      'Source-control the runbook (GitHub / Azure Repos). Portal-only runbooks are an auditor red flag — no change history.',
      'Test in dev with <code>-WhatIf</code> before <code>-Force</code>. Remediation runbooks are the easiest way to nuke prod.',
    ],
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
      plain: `For tomorrow\'s MCSB ES-1 review (every VM must run an EDR), the
              auditor wants a CSV of all VMs across every sub <i>missing</i> the
              MDE extension — sub, RG, OS, last-seen. ~30 minutes. Speed beats
              prettiness.`,
      stakes: `Showing up unprepared sets the wrong tone. Resource Graph + KQL queries every sub in seconds.`,
    },
    doneWhen: [
      'Query targets <b>Resource Graph</b> (the <code>Resources</code> table), not Log Analytics. ARG = live inventory; LA = time-series logs.',
      'Returns VMs that <b>do not have</b> the MDE extension — pattern is a <code>leftanti</code> join (VMs minus VMs-with-extension).',
      'Output columns: <code>subscriptionId</code>, <code>resourceGroup</code>, <code>name</code>, <code>os</code>, <code>lastSeen</code>. Date-stamped (<code>extend snapshotTime = now()</code>).',
    ],
    investigate: {
      summary: 'Pick the right table, then write the query.',
      steps: [
        'Resource Graph table is <code>Resources</code>.',
        'For VM extensions: query <code>Resources</code> with type <code>microsoft.compute/virtualmachines/extensions</code>.',
        'Easier path: filter extensions by <code>name in ("MDE.Windows","MDE.Linux")</code>, then anti-join against VM list.',
        'Use <code>project</code> to keep only the auditor\'s columns; <code>sort</code> for readability.',
      ],
      labLink: { route: '/practice/kql', label: 'KQL lab bench (canned tables)' },
    },
    decide: {
      question: 'Anti-join or NOT EXISTS — which KQL pattern?',
      options: [
        { label: 'leftanti join', good: true,
          explain: 'KQL idiom for "rows in left without a match on right." Reads cleanly: <code>VMs | join kind=leftanti (Extensions where name in MDE)</code>.' },
        { label: 'NOT EXISTS subquery', good: false,
          explain: 'KQL doesn\'t have NOT EXISTS. You\'d simulate it with leftanti anyway.' },
        { label: 'Loop in PowerShell', good: false,
          explain: 'Loses Resource Graph\'s strength — instant query across thousands of resources without per-sub iteration.' },
      ],
    },
    build: {
      prompt: `Write the KQL. Columns: subscriptionId, resourceGroup, vmName,
               osType, location. Sort by sub then vmName. Export CSV from
               the portal.`,
      steps: [
        {
          label: 'List all VMs first — the "left side" of the join',
          body: `<p>Select every VM in scope. <code>Resources</code> holds them; type filter pulls just VMs. Test alone first; confirm count looks right.</p>
<pre><code>Resources
| where type == "microsoft.compute/virtualmachines"
| project vmId = id, vmName = name, subscriptionId, resourceGroup,
          osType = tostring(properties.storageProfile.osDisk.osType),
          location</code></pre>`,
        },
        {
          label: 'Build the "right side" — VMs that DO have MDE installed',
          body: `<p>MDE installs as a VM extension. Filter to <code>MDE.Windows</code> / <code>MDE.Linux</code>. The <code>vmId</code> we extract is the parent VM ARM ID — the join key.</p>
<pre><code>Resources
| where type == "microsoft.compute/virtualmachines/extensions"
| where name in ("MDE.Windows", "MDE.Linux")
| extend vmId = tostring(properties.virtualMachine.id)
| project vmId</code></pre>`,
        },
        {
          label: 'leftanti-join — keep VMs that are NOT in the extension set',
          body: `<p><code>join kind=leftanti</code> = rows on the left with <i>no</i> match right. That\'s "VMs missing MDE." Stamp with <code>now()</code> so the CSV is auditor-defensible.</p>
<pre><code>Resources
| where type == "microsoft.compute/virtualmachines"
| project vmId = id, vmName = name, subscriptionId, resourceGroup,
          osType = tostring(properties.storageProfile.osDisk.osType),
          location
| join kind=leftanti (
    Resources
    | where type == "microsoft.compute/virtualmachines/extensions"
    | where name in ("MDE.Windows", "MDE.Linux")
    | extend vmId = tostring(properties.virtualMachine.id)
    | project vmId
  ) on vmId
| extend snapshotTime = now()
| order by subscriptionId asc, vmName asc</code></pre>`,
        },
      ],
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
    takeaways: [
      { point: 'Resource Graph is the Azure-wide query layer over your inventory; KQL is the language.',
        sayItOutLoud: '"One query, all subs, sub-second — that\'s why Resource Graph beats portal clicks."' },
      { point: 'leftanti is the KQL idiom for "rows that don\'t have a match."',
        sayItOutLoud: '"The pattern is leftanti: VMs minus those with the MDE extension installed."' },
      { point: 'For VM-extension presence checks, anti-join is the cleanest pattern.',
        sayItOutLoud: '"Output columns are exactly what the auditor asked for; CSV exported from the portal."' },
      { point: 'Save and pin Resource Graph queries — quarterly re-runs take seconds, not minutes.',
        sayItOutLoud: '"Query is saved; it pins to a Defender for Cloud dashboard for ongoing tracking."' },
    ],
    production: [
      'Save the query to <b>Resource Graph Explorer → Saved queries</b> and pin it to a dashboard. Quarterly re-runs take 5 seconds.',
      'Confirm <b>Reader RBAC on every sub</b> first. ARG silently returns 0 for inaccessible subs — embarrassing in a meeting.',
      'For 50k+ resource tenants, throttling hits fast. Use <code>| take 100</code> while iterating; remove for the final run.',
      'Cross-check the count against <b>Defender for Cloud Inventory</b>. Numbers should match ±5%; mismatches mean stale cache (usually Inventory).',
      'Date-stamp every export with <code>| extend snapshotTime = now()</code>. Auditors reject undated "current state" evidence.',
    ],
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
      plain: `Someone flipped the "Storage public blob deny" assignment from
              <code>Default</code> to <code>DoNotEnforce</code> via the portal
              — the policy exists but evaluates nothing. Terraform module
              unchanged. Detect drift, re-apply, fence the path.`,
      stakes: `Console edits to Terraform-owned resources make IaC a lie. The codebase becomes aspirational.`,
    },
    doneWhen: [
      'Drift detected via <code>terraform plan -refresh-only</code> and root cause identified in the Activity Log (who, when, what changed).',
      'Module re-applied — <code>enforcementMode</code> back to <code>Default</code>. State and reality agree again.',
      'Prevention mechanism in place: either Azure Policy denying direct modifications to IaC-owned resources, or a pipeline gate. Process alone is not enough.',
      'Terraform module shows the assignment with <code>enforcement_mode = "Default"</code> and a comment explaining the SPN-only RBAC fence — readable in a PR diff.',
    ],
    investigate: {
      summary: 'Detect drift; trace the change; plan the fix.',
      steps: [
        'Run <code>terraform plan -refresh-only</code> against the policy module. Output shows enforcementMode = "DoNotEnforce" (real) vs "Default" (code).',
        '<code>az activity-log list</code> finds who changed it and when. Usually a teammate working around an unrelated deploy.',
        'Decide: re-apply (drop the change) vs import (adopt it). Intent unchanged here — re-apply.',
        'Add a fence: only the Terraform SPN gets Policy Contributor at this scope. Humans PR through Terraform.',
      ],
    },
    decide: {
      question: 'After re-apply, how do you prevent recurrence?',
      options: [
        { label: 'Tighten RBAC — only the Terraform SPN edits', good: true,
          explain: 'Removes humans\' ability to edit at all. They still PR against Terraform.' },
        { label: 'Defender alert on policy-assignment changes', good: 'partial',
          explain: 'Detective layer, doesn\'t prevent. Pair with RBAC, don\'t use alone.' },
        { label: 'Comment "do not edit in portal" in the .tf file', good: false,
          explain: 'Comments prevent nothing. The next person under pressure still clicks.' },
      ],
    },
    build: {
      prompt: `Write the apply summary for #compliance after re-applying.
               Cover drift, cause, fix, and prevention — scannable.`,
      steps: [
        {
          label: 'State the drift — what changed, from what to what',
          body: `<p>Lead with facts: two values (before/after) and a timestamp. The audience scrolls — give them the truth in line one.</p>
<pre><code>- **Drift detected:** enforcementMode changed from "Default" to "DoNotEnforce" via portal at 2026-05-08 14:03 UTC by user@corp (activity log).</code></pre>`,
        },
        {
          label: 'Cause + fix — what happened and what you did',
          body: `<p>Acknowledge cause without naming individuals harshly. State the fix as a past-tense verifiable action.</p>
<pre><code>- **Cause:** working around an unrelated deploy that was being blocked; intent was a 1-day workaround, never reverted.
- **Fix:** re-applied terraform-policy-module v2.3.1. Assignment back to enforced Default. Verified compliance scan now triggering deny on policy-violating storage accounts.</code></pre>`,
        },
        {
          label: 'Prevention — RBAC change + detective backstop',
          body: `<p>Close with the structural fix. RBAC is the real fence; the Defender alert is the seatbelt.</p>
<pre><code>- **Prevention:** RBAC at the policy assignment scope tightened — only the Terraform service principal has Resource Policy Contributor. Humans need a PR.
- **Detective backstop:** Defender alert "Policy assignment modified" at the MG scope, routes to #platform-alerts.</code></pre>`,
        },
        {
          label: 'The HCL — show the corrected assignment block',
          body: `<p>The post-mortem is what stakeholders read. The <strong>actual fix</strong> is a one-line HCL change — make it greppable so the next person finds it in seconds.</p>
<pre><code># platform/governance/policy-assignments.tf
#
# Drift fence: this assignment is owned exclusively by the Terraform SPN.
# Humans don't have Resource Policy Contributor on this scope —
# console edits will fail at RBAC, not at \`terraform plan\`.
# See: T8 — "Drifted Azure Policy assignment — re-deploy via Terraform"

resource "azurerm_management_group_policy_assignment" "storage_public_blob_deny" {
  name                 = "storage-public-blob-deny"
  management_group_id  = data.azurerm_management_group.workloads.id
  policy_definition_id = azurerm_policy_definition.storage_public_blob_deny.id
  display_name         = "Storage: deny public blob access"

  enforce          = true             # Audit-mode rollout finished 2025-11-15; now enforcing.
  # \`enforce = true\`  → "Default" (block per the policy's effect)
  # \`enforce = false\` → "DoNotEnforce" (visible but evaluates nothing — only for incident pauses)

  non_compliance_message {
    content = "Storage accounts must block public blob access. Request an exemption if a vendor share is needed."
  }
}</code></pre>
<p>Note: no <code>lifecycle { ignore_changes = [...] }</code>. We <em>want</em> <code>terraform plan</code> to scream when someone edits this — that\'s the drift-detection mechanism.</p>`,
        },
      ],
      artifactKind: 'note',
      starter: `## Drift fixed: storage-public-blob-deny\n\n- Drift: \n- Cause: \n- Fix: \n- Prevention: `,
      sample: `## Drift fixed: storage-public-blob-deny

- **Drift detected:** enforcementMode changed from "Default" to "DoNotEnforce" via portal at 2026-05-08 14:03 UTC by user@corp (activity log).
- **Cause:** working around an unrelated deploy that was being blocked; intent was 1-day workaround, never reverted.
- **Fix:** re-applied terraform-policy-module v2.3.1; assignment back to Default enforcement. Verified compliance scan now triggering deny on policy-violating storage accounts.
- **Prevention:** RBAC at the policy assignment scope tightened — only the Terraform service principal has Resource Policy Contributor. Humans need a PR.
- **Detective layer added:** Defender alert "Policy assignment modified" at the MG scope. Routes to #platform-alerts.`,
    },
    takeaways: [
      { point: 'Drift = real cloud state diverging from the IaC source of truth.',
        sayItOutLoud: '"Drift detected via plan -refresh-only; activity log named the change author."' },
      { point: '<code>terraform plan -refresh-only</code> is the cheapest detection; activity log finds the who/when.',
        sayItOutLoud: '"Re-applied; assignment back to enforced. Compliance scans re-triggering."' },
      { point: 'Decide once: re-apply (drop the change) or import (adopt it). Don\'t do both.',
        sayItOutLoud: '"Intent didn\'t change — we\'re re-applying, not importing."' },
      { point: 'Prevent recurrence with RBAC, not comments. Permissions stop people; text doesn\'t.',
        sayItOutLoud: '"Long-term fix is RBAC: only the SPN has Policy Contributor at this scope."' },
      { point: 'Layer detective alerts on top — Defender or activity-log alert into your channel.',
        sayItOutLoud: '"Added a Defender alert as a backstop in case RBAC gets relaxed later."' },
    ],
    production: [
      'Run <code>terraform plan</code> in CI on every push, alert on diffs. <b>Drift detection is a cron job</b>, not "found by audit weeks later."',
      'For Azure Policy, prefer <b>initiative assignment</b> (one TF resource) over per-policy (N resources). Fewer state objects, faster plan.',
      '<b>Lock state during apply:</b> <code>-lock-timeout=10m</code>. Concurrent applies corrupt state. Verify the backend enforces it.',
      'If state corrupts: <b>backend-versioned restore</b> takes minutes; <code>terraform import</code> from scratch takes days. Keep versioning on.',
      'Fence: an Azure Policy that <b>denies direct mods to IaC-owned resources</b> — only Terraform\'s SPN allowed. Process alone doesn\'t hold.',
    ],
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
      plain: `Audit call tomorrow. Auditor wants evidence on one control per
              cloud: MCSB NS-1 (Azure) and NIST 800-53 SC-7 (AWS). For each:
              enforcing policy/rule, current compliance state, non-compliant
              resources with owners.`,
      stakes: `Auditors judge on how fast you produce evidence, not whether controls exist. Messy clicking sets a worse tone than disclosing a gap.`,
    },
    doneWhen: [
      'For <b>Azure (MCSB NS-1)</b>: Defender Regulatory Compliance pane exported as PDF, plus the underlying KQL for the non-compliant resources. Date-stamped.',
      'For <b>AWS (NIST 800-53 SC-7)</b>: evidence packaged via <b>AWS Audit Manager</b> (not raw Config console) and exported. Mapping spreadsheet shows which Config rules satisfy SC-7.',
      'Folder structure laid out for the auditor: <code>/queries/</code>, <code>/snapshots/&lt;date&gt;/</code>, <code>/mappings.csv</code>, plus an index page with anchor links per control.',
    ],
    investigate: {
      summary: 'Per cloud: control → policy/rule → state → exceptions.',
      steps: [
        '<b>Azure (NS-1):</b> Defender → Regulatory Compliance → MCSB → NS-1. Pane shows mapped policies + pass/fail per resource.',
        '<b>Underlying policies:</b> NS-1 maps to several ("Storage should restrict network access," "No public IPs on subnets"). KQL dumps the non-compliant rows.',
        '<b>AWS (SC-7, Boundary protection):</b> SCPs + Config rules like <code>s3-bucket-public-access-prohibited</code>, <code>ec2-security-group-attached-to-eni</code>.',
        'Use Config Aggregator → advanced query for those rule names.',
        '<b>Exceptions:</b> list active Azure policy exemptions + AWS SCP exceptions. Auditor will ask.',
      ],
    },
    decide: {
      question: 'You discover one undocumented exception (a storage account with public access, no exemption record). What do you tell the auditor?',
      options: [
        { label: 'Disclose it preemptively', good: true,
          explain: 'Trust > score. Auditors respect transparency. Hiding it and being caught is worse than disclosing first.' },
        { label: 'Quietly fix it before the call', good: false,
          explain: 'Activity log shows the change. "One exception" becomes "exception + cover-up."' },
        { label: 'Hope they don\'t look', good: false,
          explain: 'They will look. They have a sampling protocol.' },
      ],
    },
    build: {
      prompt: `Compile the evidence packet (markdown). One section per cloud,
               trace control → policy/rule → state → exceptions → findings.
               Keep it scannable.`,
      steps: [
        {
          label: 'Header — what control, what cycle, who owns it',
          body: `<p>Auditors skip preambles. Two lines give them the metadata to file the evidence.</p>
<pre><code># Audit evidence — control NS-1 / SC-7
Date: 2026-05-09 · Owner: trung.truong@tylertech.com · Audit cycle: Q2</code></pre>`,
        },
        {
          label: 'Azure side — control → mapped policies → state → exemptions',
          body: `<p>For NS-1: mapped policies (Defender Regulatory Compliance pane), current pass/fail, active exemptions with expiry + ticket. This is the "where did the number come from" trace.</p>
<pre><code>## Azure (MCSB NS-1, "Network security")

**Mapped policies (assigned at Tenant Root MG via MCSB initiative):**
- Storage accounts should restrict network access
- Public IPs should not be assigned to subnets
- Network watcher should be enabled in all regions

**Current state (Defender for Cloud → Regulatory Compliance → MCSB → NS-1):**
- 92% pass · 8% fail (12 of 148 resources)

**Active exemptions:**
- 1 storage account, "vendor-share-data-eng-sa01", expiresOn 2026-06-08, category Mitigated. Ticket T-1234.</code></pre>`,
        },
        {
          label: 'AWS side + open findings + remediation owners',
          body: `<p>Mirror the structure on AWS, then close with an open-findings table + owners. The owners line is what the auditor follows up on next cycle.</p>
<pre><code>## AWS (NIST 800-53 SC-7, "Boundary protection")

**Mapped Config rules (via Audit Manager packaged framework):**
- s3-bucket-public-access-prohibited
- ec2-security-group-attached-to-eni
- restricted-ssh

**Current state (Config Aggregator org-wide):**
- 96% pass · 4% fail (3 of 78 resources)

**Open findings:**
| Resource           | Rule                              | Owner            | Target date |
|--------------------|-----------------------------------|------------------|-------------|
| sg-abc / dev-vpc   | restricted-ssh                    | netsec@corp      | 2026-05-20  |
| s3://data-temp     | s3-bucket-public-access-prohibited| data-eng@corp    | 2026-05-15  |</code></pre>`,
        },
      ],
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
    takeaways: [
      { point: 'Audit evidence = control → mapped rules → current state → exceptions → open findings.',
        sayItOutLoud: '"NS-1 sits at 92% on Azure; equivalent SC-7 at 96% on AWS."' },
      { point: 'Azure: Defender Regulatory Compliance pane is the entry point. AWS: Config Aggregator org-wide.',
        sayItOutLoud: '"NS-1 maps to ~6 Azure policies; SC-7 to a few SCPs plus 3 Config rules."' },
      { point: 'Exceptions and exemptions belong in the packet — auditor will ask either way.',
        sayItOutLoud: '"Active exemptions are documented and time-bound; AWS exceptions are zero."' },
      { point: 'Disclose discovered gaps preemptively. Trust beats a hidden score.',
        sayItOutLoud: '"We found one storage account without an exemption — disclosed and retroactively documented."' },
      { point: 'Auto-remediation runbooks are the long-term fix for recurring findings.',
        sayItOutLoud: '"The runbook is the structural fix for the recurring sandbox storage pattern."' },
    ],
    production: [
      'Export the Defender <b>Regulatory Compliance</b> pane as <b>PDF + the underlying KQL</b>. Auditors want the "what" and the "how."',
      'For AWS, package via <b>Audit Manager</b> rather than raw Config. Audit Manager has frameworks for SOC 2, PCI, HIPAA, NIST.',
      'Every artifact gets a <b>date stamp</b>. Auditors reject undated "current state" snapshots — they can\'t verify the moment.',
      'Maintain a <code>compliance-evidence/</code> repo with <b>quarterly snapshots</b>. When asked "what did this look like 9 months ago," point at the tag.',
      'Make the auditor\'s read easy: index page, anchor links per control, <code>/queries/</code>, <code>/snapshots/&lt;date&gt;/</code>, mapping spreadsheet. Saves hours.',
    ],
  },

];

export function ticketById(id) {
  return TICKETS.find(t => t.id === id) || null;
}
