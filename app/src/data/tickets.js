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
    doneWhen: [
      'SCP JSON is valid: <code>Effect: "Deny"</code>, action list covers the IAM user surface (<code>CreateUser</code>, <code>CreateLoginProfile</code>, <code>CreateAccessKey</code> at minimum), <b>without</b> blocking <code>CreateRole</code> / <code>CreateServiceLinkedRole</code>.',
      'Proposed attach point is the <b>org root</b> (not the Dev OU) — and you can articulate why (broadest blast radius, no future OU can re-permit).',
      'Plan addresses BOTH halves: a preventive SCP for new IAM users AND a one-time cleanup of the existing user. Detective rule alone is not the fix.',
    ],
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
      steps: [
        {
          label: 'Skeleton — declare the policy and one Deny statement',
          body: `<p>Start with an IAM policy skeleton: <code>Version</code> + a single <code>Statement</code> with <code>Effect: "Deny"</code> and a wildcard <code>Resource</code>. Leave the Action list empty for now.</p>
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
          body: `<p>Now fill the Action list with the three actions that <i>create</i> an IAM user identity. This is the minimum that closes the gap the detective rule caught:</p>
<pre><code>"Action": [
  "iam:CreateUser",
  "iam:CreateLoginProfile",
  "iam:CreateAccessKey"
]</code></pre>
<p>A junior engineer would stop here. A senior would not — there are more actions that <i>extend</i> a user's lifetime.</p>`,
        },
        {
          label: 'Production surface — close the long-lived-credential adjacencies',
          body: `<p>Add the actions that prolong a user credential's life or attach another login surface to it. Also tighten <code>Resource</code> to the IAM user ARN pattern so role/service-linked-role actions are not even matched.</p>
<pre><code>"Action": [
  "iam:CreateUser",
  "iam:CreateLoginProfile",
  "iam:CreateAccessKey",
  "iam:UpdateAccessKey",
  "iam:UploadSigningCertificate",
  "iam:UploadSSHPublicKey"
],
"Resource": "arn:aws:iam::*:user/*"</code></pre>
<p>Verify: <code>iam:CreateRole</code> and <code>iam:CreateServiceLinkedRole</code> are NOT in the list. Those are needed for normal workload operations.</p>`,
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
    production: [
      'Announce the new deny in <code>#platform-changes</code> 24h before enabling. Workload teams scream when their CI breaks at 3pm Friday with no warning.',
      'Run the SCP in <b>audit-only via Service Authorization analyzer</b> for ~1 week before flipping to enforce. Catches the workload you didn\'t know was creating IAM users.',
      'Service-linked roles are exempt from SCPs. Before you sign off, confirm CloudFormation, AWS Config, and other service principals you depend on aren\'t affected.',
      '<b>Document the exception process IN ADVANCE.</b> The first exception request lands within 48h of enforce. Have a JIRA template + an SLA before you need them.',
      'After enforce, alarm CloudWatch on <code>AccessDenied</code> events that mention <i>"explicit deny in a service control policy"</i> for 2 weeks — that\'s your "we broke a workload" canary.',
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
      plain: `<b>FinOps</b> (the team that allocates cloud spend back to
              business units for chargeback) depends on every resource
              carrying an "Owner" tag. The managed rule
              <code>required-tags</code> works for the simple "must have
              these tag keys" case — but not for the extra rule we want:
              Owner must look like an email (contains "@"). FinOps needs
              a <b>CUSTOM</b> Config rule that evaluates per-resource
              and emits NON_COMPLIANT for anything missing or malformed.`,
      stakes: `Without this we can't bill back accurately. CFO escalation
               is one cycle away.`,
    },
    doneWhen: [
      'Lambda handler returns <code>{ Compliance: "COMPLIANT" | "NON_COMPLIANT", Annotation: "&lt;reason&gt;" }</code> per evaluated resource.',
      'Validates Owner tag is <b>present</b> AND <b>contains "@"</b> — annotation distinguishes missing vs malformed.',
      'Trigger type chosen with a reason. (For "tag added/removed/changed," configuration-change is correct; periodic is overkill and adds 24h lag.)',
    ],
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
      steps: [
        {
          label: 'Skeleton — read the resource, return a default verdict',
          body: `<p>Config invokes your Lambda with the resource snapshot in <code>event.invokingEvent</code>. Parse it, pull out <code>tags</code>, and return COMPLIANT for now.</p>
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
          body: `<p>First check Owner is set. If it isn't, fail loudly and name the issue in the annotation — that string is what FinOps reads in the Config console.</p>
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
          body: `<p>Now check the email shape. Don't over-engineer with a full RFC regex — "contains @" is the bar FinOps actually wants. Make the annotation explain <i>which</i> failure occurred so the on-call doesn't have to dig.</p>
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
    production: [
      'Estimate per-resource evaluation cost BEFORE deploying. Change-triggered on a high-churn type (EC2 instances, ENIs, EBS volumes) can <b>10x your Config bill</b> in a month.',
      'Alarm on the custom Lambda\'s error rate. A silently failing rule reports "no non-compliant resources" — which looks like success but is actually data missing.',
      'Use the <b>Config Aggregator</b> for org-wide reporting, not per-account dashboards. Auditors want one number across the org.',
      'Auto-remediation via SSM document: only enable after a week of <b>"annotate but don\'t fix"</b>. Humans need lead time to fix bad data before the bot starts changing things.',
      'Tag the rule with owner + JIRA + intent in the description field. Six months later you (or your replacement) will forget why it exists. Save them the archaeology.',
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
      plain: `This is the <b>day-1 acceptance check</b> a new account goes
              through before the workload team gets handed the keys. A new
              account "data-eng-sandbox-2" was just <i>vended</i>
              (provisioned via Control Tower's <b>Account Factory</b>) into
              the Sandbox OU. Before we hand it over, we need to verify
              all <b>Mandatory CT controls</b> applied, the <b>Strongly
              Recommended</b> ones we've enabled at Sandbox OU are present,
              and our org-root SCPs are inherited. The team is waiting to
              start work.`,
      stakes: `If a control is missing they could create resources we can\'t
               govern. We don\'t want to revoke access mid-day; verify
               first.`,
    },
    doneWhen: [
      'All <b>Mandatory CT controls</b> confirmed present on the new account (preventive SCPs + detective Config rules at minimum).',
      '<b>Strongly Recommended</b> controls enabled at Sandbox OU confirmed inherited; any opt-outs documented with reason.',
      'A short <b>hand-off note</b> written for the workload team: what\'s blocked, who to ask for an exemption, where to read denied actions.',
    ],
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
      steps: [
        {
          label: 'List the three control types as headings',
          body: `<p>Start with the P-D-P structure as a skeleton. Each section will get a one-line "what to click, what to confirm" bullet underneath.</p>
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
          body: `<p>Two more bullets the workload team forgets but the auditor opens with: <b>logging</b> (CloudTrail flowing to the central archive) and <b>identity</b> (IAM Identity Center permission set attached).</p>
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
    production: [
      'Check the <b>drift status</b> in the CT console, not just the initial-enrollment status. Drift = a guardrail that has silently failed.',
      'Verify the new account inherited BOTH the OU-level SCPs <b>and</b> the org-root SCPs. Newcomers check one and miss the other.',
      'Confirm the Account Factory pipeline reported success end-to-end. Orphaned half-vended accounts are a real failure mode: network not wired, IAM Identity Center permission sets not assigned, CloudTrail not centralized.',
      'Confirm CloudTrail logs are landing in the central log-archive bucket. That\'s what auditors actually grep — not the CT console.',
      'Hand-off note to the workload team includes: which controls block what, who to ask for an exemption, where to read the central log of denied actions. Don\'t make them learn by hitting the wall.',
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
    doneWhen: [
      'Exemption is <b>scoped at the resource</b> (or at most the resource group) — never at the MG. Smallest blast radius that still works.',
      'Exemption has an <b>expiry ≤ 90 days</b> from today, encoded in the resource itself (<code>expiresOn</code>).',
      'Metadata tags include: requester, JIRA ticket, business justification, <b>renewal cadence</b>. A calendar reminder is set 14 days before expiry.',
    ],
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
      steps: [
        {
          label: 'Skeleton — point at the right policy assignment',
          body: `<p>An exemption is a tiny resource type (<code>Microsoft.Authorization/policyExemptions</code>) whose only job is to silence one assignment for one scope. Start by filling in <code>policyAssignmentId</code> with the ID of the assignment you want to waive.</p>
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
          body: `<p>Pick the category honestly. <code>Mitigated</code> means "yes, the policy is right, AND we have a compensating control" (network ACL, DLP scan, etc.). <code>Waiver</code> means "we just accept the risk." For a vendor share with monitoring, <b>Mitigated</b> is the right answer.</p>
<p><code>expiresOn</code> is non-negotiable in practice. Pick a date ≤90 days out, in ISO 8601:</p>
<pre><code>"exemptionCategory": "Mitigated",
"expiresOn": "2026-06-11T00:00:00Z"</code></pre>`,
        },
        {
          label: 'Write the description that an auditor will read first',
          body: `<p>The <code>description</code> is what an auditor opens before anything else. Give them everything: <b>business reason</b>, <b>compensating control</b>, <b>owner</b>, <b>ticket</b>, <b>auto-revoke date</b>.</p>
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
    production: [
      'Exemption MUST have an <b>expiry</b>. Default is 90 days, never "permanent." Permanent exemptions become audit findings — that\'s the language auditors use.',
      'Tag the exemption with: requester, JIRA ticket, business justification, renewal cadence. Auditors will ask all four. Skip any of them and you fail the question.',
      'Notify the workload owner <b>14 days before expiry</b>. Exemptions that lapse silently re-block production at 2am — and the workload owner will blame compliance, not the calendar.',
      'Scope as tightly as possible: subscription scope &gt; resource group scope &gt; MG scope. Blast radius rule — the exemption shouldn\'t cover more than it has to.',
      'Track exemption count over time. <b>Steady growth = your policy is wrong for the org</b>, not "we need more exemptions." Talk to the policy owner; consider relaxing the policy itself.',
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
    doneWhen: [
      'Each unhealthy high-severity rec is mapped to its <b>MCSB control ID</b> (e.g., <code>NS-1</code>, <code>ES-1</code>, <code>LT-4</code>) <i>and</i> its underlying Azure Policy definition.',
      'For each rec: <b>action + owner + ETA</b> identified. Auto-remediate / plan / exempt — pick one with reason.',
      'Score recovery projection given (e.g., <i>"70 → 75 by EOD, 79 by Friday"</i>). Stakeholders want a number, not a "we\'re working on it."',
    ],
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
      steps: [
        {
          label: 'Header — the number stakeholders want',
          body: `<p>Open with the secure-score delta. That's the line that gets read aloud in standup.</p>
<pre><code># Secure score triage 2026-05-09

Drop: 78% → 70% (-8)

## Recommendations triaged

1. ...
2. ...
3. ...</code></pre>`,
        },
        {
          label: 'Per-rec body — name + MCSB control + scope + count',
          body: `<p>For each unhealthy rec, fill in four facts before you decide anything: <b>the rec name</b>, <b>the MCSB control ID</b>, <b>where</b> (subs / RGs / VMs), and <b>how many</b>. This is the part the auditor checks against, not the action.</p>
<pre><code>1. **Storage accounts should require secure transfer** (MCSB NS-2)
   - 4 storage accounts unhealthy; 3 dev sandbox, 1 shared services.
2. **Machines should have endpoint protection installed** (MCSB ES-1)
   - 6 VMs missing MDE in the new "data-eng" sub.
3. **Diagnostic logs in Key Vault should be enabled** (MCSB LT-4)
   - 2 vaults, both prod.</code></pre>`,
        },
        {
          label: 'Action + ETA per rec, then score-recovery projection',
          body: `<p>Now apply the triage matrix (severity × remediation cost × user impact) and write the action with a date. Close with a projection — stakeholders want a number for "when will this be back."</p>
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
    production: [
      'Triage matrix: <b>(severity × remediation cost × user impact)</b>. Auto-remediations of low-impact go first; manual fixes wait for the change window; high-cost + high-impact goes to a planning meeting.',
      'The "MDE not installed" pattern in this ticket is almost always missing initiative assignment at the new MG, not a broken policy. Check the assignment scope before debugging the policy logic.',
      'Set up <b>Workflow Automation</b> (Logic Apps) to open a ticket on every new high-severity rec. Don\'t scan the dashboard manually every morning — automate the inbox.',
      'Continuous-export Defender alerts and recommendations to <b>Log Analytics</b>. The portal only shows current state. KQL over the LA history is how you spot trends ("3 new public-storage recs this week — what changed?").',
      'Maintain a <code>compliance-runbooks/</code> repo: one markdown file per recommendation type with the standard remediation steps. Saves ~30 min per ticket and onboards new team members faster.',
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
      primer: `A <b>Runbook</b> is a script (PowerShell or Python) that an
               <b>Automation account</b> runs on a schedule or on demand.
               Think "cron job with Azure auth baked in." The Automation
               account is the container; the Runbook is the script; the
               <b>Managed Identity</b> is the credential it uses to talk to
               Azure. <b>Two flavors of identity:</b> <i>System-Assigned</i>
               (tied to the Automation account, the default) vs
               <i>User-Assigned</i> (shared across resources, the production
               pattern). <b>Runtime:</b> PowerShell 7.2 is the default now —
               5.1 is legacy and has stale Az module versions. <b>Don't use
               Runbooks for sub-second remediation</b> — use Logic Apps +
               Event Grid. Runbooks are for scheduled or batch work.`,
      stakes: `Manual remediation can't keep up with the rate of new
               sandbox subs. A scheduled runbook closes the gap fast.`,
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
      steps: [
        {
          label: 'Skeleton — managed-identity auth + the subscription loop',
          body: `<p>Every Az runbook starts the same way: <code>Connect-AzAccount -Identity</code> uses the Automation account's identity (no creds embedded), then you enumerate subs and switch context per sub.</p>
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
          body: `<p>You'll run this hourly. Most accounts will already be compliant; act only on the few that aren't. <b>Two filters:</b> already-disabled (skip), AND tag <code>complianceWaiver = true</code> (skip — owner has a controlled exception).</p>
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
          body: `<p>Disable public access, then write a row to a custom Log Analytics table (<code>RunbookActions_CL</code>) via the Data Collector API. The log row is your audit trail — name the storage account, sub, timestamp, and the verdict.</p>
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
Write-Output "FIXED: $($acct.StorageAccountName)"</code></pre>
<p>Wrap the whole loop body in <code>try/catch</code> with <code>Write-Error</code> (not <code>Throw</code>) so one bad sub doesn't kill the run.</p>`,
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
    production: [
      'Use a <b>User-Assigned Managed Identity</b> in production. System-Assigned identity dies if the Automation account is recreated; user-assigned survives and can be reused across runbooks.',
      'Use <code>Write-Error</code> (not <code>Throw</code>) on per-resource failures, so the job keeps going. One bad subscription shouldn\'t kill the entire run.',
      'Output stream limit is ~1MB per runbook job. For anything bigger, write to Log Analytics (via the Data Collector API) or to blob storage, and emit only a pointer.',
      'Schedule with a buffer — never schedule a 30-min runbook every 30 min. Overlapping runs cause double-remediation. Make the cadence at least 2× the worst-case runtime.',
      'Source-control the runbook (GitHub / Azure Repos integration). A runbook visible only in the portal is an auditor\'s red flag — they can\'t see the change history.',
      'Test in dev with a <code>-WhatIf</code> flag before flipping <code>-Force</code> on. Remediation runbooks are the easiest way to nuke production accidentally.',
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
      plain: `For tomorrow's <b>MCSB ES-1</b> review (Endpoint Security
              control 1 — the requirement that every VM runs an EDR) the
              auditor wants a CSV of all VMs across every subscription that
              don't have the <b>MDE extension</b> installed, with
              subscription, resource group, OS, and last-seen timestamp.
              Speed > prettiness; you have ~30 minutes.`,
      stakes: `Showing up unprepared sets the wrong tone with the auditor.
               KQL is the right tool — Resource Graph queries every
               subscription you have read access to in seconds.`,
    },
    doneWhen: [
      'Query targets <b>Resource Graph</b> (the <code>Resources</code> table), not Log Analytics. ARG = live inventory; LA = time-series logs.',
      'Returns VMs that <b>do not have</b> the MDE extension — pattern is a <code>leftanti</code> join (VMs minus VMs-with-extension).',
      'Output columns: <code>subscriptionId</code>, <code>resourceGroup</code>, <code>name</code>, <code>os</code>, <code>lastSeen</code>. Date-stamped (<code>extend snapshotTime = now()</code>).',
    ],
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
      steps: [
        {
          label: 'List all VMs first — the "left side" of the join',
          body: `<p>Start by selecting every VM in scope. Resource Graph's <code>Resources</code> table holds them; type filter pulls just VMs.</p>
<pre><code>Resources
| where type == "microsoft.compute/virtualmachines"
| project vmId = id, vmName = name, subscriptionId, resourceGroup,
          osType = tostring(properties.storageProfile.osDisk.osType),
          location</code></pre>
<p>Test this alone first. Confirm you see the expected VM count for the subs you have access to.</p>`,
        },
        {
          label: 'Build the "right side" — VMs that DO have MDE installed',
          body: `<p>The MDE agent installs as a VM extension. Filter <code>Resources</code> to extensions named <code>MDE.Windows</code> or <code>MDE.Linux</code>. Note the <code>vmId</code> we extract — it's the parent VM's ARM ID, which is what we'll join against.</p>
<pre><code>Resources
| where type == "microsoft.compute/virtualmachines/extensions"
| where name in ("MDE.Windows", "MDE.Linux")
| extend vmId = tostring(properties.virtualMachine.id)
| project vmId</code></pre>`,
        },
        {
          label: 'leftanti-join — keep VMs that are NOT in the extension set',
          body: `<p>Now subtract: <code>join kind=leftanti</code> returns rows from the left that have <i>no</i> match on the right. That's exactly "VMs missing the MDE extension." Add a snapshot timestamp so the CSV is auditor-defensible.</p>
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
    production: [
      'Save the final query to <b>Resource Graph Explorer → Saved queries</b> and pin it to an Azure dashboard. Quarterly auditor re-runs take 5 seconds, not 5 minutes.',
      'Up-front sanity check: confirm you have <b>Reader RBAC on every subscription</b> you intend to cover. ARG returns 0 results (not an error) when you can\'t see a sub — easy to miss, embarrassing in a meeting.',
      'For 50k+ resource tenants, throttling kicks in fast. Use <code>| take 100</code> while iterating; remove only for the final run.',
      'Cross-reference your KQL count against the <b>Defender for Cloud Inventory</b> blade. Numbers should match within ±5%. If they don\'t, one of the two views has a stale cache — usually Inventory.',
      'Date-stamp every export. Auditors reject evidence that\'s "current state" with no snapshot timestamp. Add a leading <code>| extend snapshotTime = now()</code> and project it.',
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
              directly in the portal — they changed <code>enforcementMode</code>
              from <code>Default</code> (block/audit per the policy's effect)
              to <code>DoNotEnforce</code> (assignment exists but evaluates
              nothing — usually reserved for incident pauses). Audit caught
              it. The Terraform module that owns this assignment is unchanged.
              Your job: detect the drift, plan the re-apply, and put a fence
              up so this doesn\'t happen again.`,
      stakes: `Console edits to Terraform-owned resources turn IaC into a
               lie. If we let it slide once, the codebase becomes
               aspirational rather than authoritative.`,
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
      steps: [
        {
          label: 'State the drift — what changed, from what to what',
          body: `<p>Lead with the facts. Two values (before / after) and one timestamp. The audience scrolls — give them the truth in line one.</p>
<pre><code>- **Drift detected:** enforcementMode changed from "Default" to "DoNotEnforce" via portal at 2026-05-08 14:03 UTC by user@corp (activity log).</code></pre>`,
        },
        {
          label: 'Cause + fix — what happened and what you did',
          body: `<p>Acknowledge the cause without naming individuals harshly. Then state the fix as a past-tense verifiable action.</p>
<pre><code>- **Cause:** working around an unrelated deploy that was being blocked; intent was a 1-day workaround, never reverted.
- **Fix:** re-applied terraform-policy-module v2.3.1. Assignment back to enforced Default. Verified compliance scan now triggering deny on policy-violating storage accounts.</code></pre>`,
        },
        {
          label: 'Prevention — RBAC change + detective backstop',
          body: `<p>Close with the structural fix so the next reader knows this won't recur. RBAC is the real fence; the Defender alert is the seatbelt.</p>
<pre><code>- **Prevention:** RBAC at the policy assignment scope tightened — only the Terraform service principal has Resource Policy Contributor. Humans need a PR.
- **Detective backstop:** Defender alert "Policy assignment modified" at the MG scope, routes to #platform-alerts.</code></pre>`,
        },
        {
          label: 'The HCL — show the corrected assignment block',
          body: `<p>The post-mortem above is what stakeholders read in the channel. The <strong>actual fix</strong> is a one-line change in the Terraform module — the value that re-applied. Make it greppable so the next person doing this same triage finds it in seconds.</p>
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
  # enforcement_mode is set via the \`enforce\` argument on azurerm_management_group_policy_assignment.
  # \`enforce = true\`  → "Default" (block per the policy's effect)
  # \`enforce = false\` → "DoNotEnforce" (visible but evaluates nothing — only for incident pauses)

  non_compliance_message {
    content = "Storage accounts must block public blob access. Request an exemption if a vendor share is needed."
  }
}</code></pre>
<p>One thing to notice: there is <strong>no <code>lifecycle { ignore_changes = [...] }</code></strong> block. We <em>want</em> <code>terraform plan</code> to scream the next time someone edits this in the portal — that\'s the entire drift-detection mechanism. Adding <code>ignore_changes</code> here would silence the canary.</p>`,
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
    production: [
      'Run <code>terraform plan</code> in CI on every push, with alerting on diffs. <b>Drift detection should be a cron job</b>, not "noticed by audit two weeks later."',
      'For Azure Policy, prefer <b>initiative assignment</b> (one Terraform resource) over per-policy assignments (N resources). Fewer state objects, faster plan, easier rollback.',
      '<b>Lock the state file</b> during apply: <code>-lock-timeout=10m</code>. Concurrent applies destroy state. The backend (S3+DynamoDB or Azure Storage blob lease) should enforce this — verify it is.',
      'If state corrupts: <b>backend-versioned restore</b> (S3 object version / Azure blob version) takes minutes. <code>terraform import</code> from scratch takes hours-to-days. Make sure backend versioning is on.',
      'The "fence to prevent recurrence" is an Azure Policy that <b>denies direct modifications to IaC-owned resources</b> — allow only via Terraform\'s service principal. Process alone doesn\'t hold; the policy enforces.',
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
    doneWhen: [
      'For <b>Azure (MCSB NS-1)</b>: Defender Regulatory Compliance pane exported as PDF, plus the underlying KQL for the non-compliant resources. Date-stamped.',
      'For <b>AWS (NIST 800-53 SC-7)</b>: evidence packaged via <b>AWS Audit Manager</b> (not raw Config console) and exported. Mapping spreadsheet shows which Config rules satisfy SC-7.',
      'Folder structure laid out for the auditor: <code>/queries/</code>, <code>/snapshots/&lt;date&gt;/</code>, <code>/mappings.csv</code>, plus an index page with anchor links per control.',
    ],
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
      steps: [
        {
          label: 'Header — what control, what cycle, who owns it',
          body: `<p>Auditors flip past long preambles. Two lines give them the metadata they need to file the evidence.</p>
<pre><code># Audit evidence — control NS-1 / SC-7
Date: 2026-05-09 · Owner: trung.truong@tylertech.com · Audit cycle: Q2</code></pre>`,
        },
        {
          label: 'Azure side — control → mapped policies → state → exemptions',
          body: `<p>For NS-1, list the <b>mapped policies</b> (from the Defender Regulatory Compliance pane), the <b>current pass/fail</b> number, and any <b>active exemptions</b> with their expiry + ticket. This is the "where did the number come from" trace.</p>
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
          body: `<p>Mirror the structure on the AWS side, then close with a small table of open findings + remediation owners. The owners line is what the auditor follows up on next cycle.</p>
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
    production: [
      'Export the Defender for Cloud <b>Regulatory Compliance</b> pane as <b>PDF + the underlying KQL</b>. Auditors want both — the "what" (compliance %) and the "how" (the query that produced it).',
      'For AWS, map compliance evidence via <b>AWS Audit Manager</b> (packaged in a defensible format) rather than the raw Config console. Audit Manager already has frameworks for SOC 2, PCI, HIPAA, NIST.',
      'Every artifact gets a <b>date stamp</b>. Auditors reject "current state" snapshots with no date — they can\'t verify it\'s the moment they asked about.',
      'Maintain a <code>compliance-evidence/</code> repo with a <b>quarterly snapshot</b>. When the auditor asks "and what did this look like 9 months ago?", you point at the tag.',
      'Make the auditor\'s read easy: an index page with anchor links to each control, raw queries in <code>/queries/</code>, PDFs in <code>/snapshots/&lt;date&gt;/</code>, mapping spreadsheet at the top. Saves hours of back-and-forth.',
    ],
    explainBackKey: 'tkt9_audit',
  },

];

export function ticketById(id) {
  return TICKETS.find(t => t.id === id) || null;
}
