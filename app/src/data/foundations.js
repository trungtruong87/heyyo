// Foundations — topic-grouped pages for the study hub.
//
// Each entry is one self-contained topic. The renderer is shape-agnostic
// (see pages/foundations/_renderer.js); add a topic = add an array entry
// and a route module + NAV row (see main.js).
//
// Sidebar groups (rendered from item.group in main.js NAV):
//   Orientation       → org-structure
//   AWS Governance    → aws-scp, aws-config, aws-control-tower
//   Azure Governance  → azure-policy, azure-policy-anatomy, azure-mcsb, azure-runbooks
//   Inventory & Query → kql, resource-graph
//   Defender Stack    → defender-cloud, defender-endpoint
//   Terraform         → terraform
//
// Convention: plain-English layer first, working-engineer layer second.

export const FOUNDATIONS = [

  // ═════════════════════════════════════════════════════════════════════════
  // ORIENTATION
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'org-structure',
    group: 'Orientation',
    order: 1,
    title: 'Org structure & checkpoints',
    subtitle: 'AWS Organizations + OUs ↔ Azure Management Groups + Subscriptions',
    cloud: 'both',
    collapsedPanels: true,
    intro: {
      plain: `Both AWS and Azure organize accounts as a TREE: company at the top, departments
              in the middle, accounts/subscriptions at the leaves. A rule attached to a
              branch flows down to everything underneath.`,
      mnemonic: 'Tree top = company. Branches = teams. Leaves = accounts/subs. Rules flow DOWN.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Organizations + Organizational Units (OUs)',
        plain: `The root is your management account; OUs are folders below it; AWS accounts
                live inside OUs. Move an account between OUs and it inherits different rules
                instantly.`,
        detail: [
          '<b>Management account</b> — the billing root. Never run workloads here. It owns Organizations.',
          '<b>Member accounts</b> — workload containers. Each has its own IAM, billing rolls up to management.',
          '<b>OUs</b> — folders inside the org. Can nest up to 5 levels deep. Common shape: <code>Root → Security, Sandbox, Workloads → Prod, NonProd</code>.',
          '<b>Inheritance</b> — a control attached to an OU installs a checkpoint that every account beneath it must pass. Checkpoints stack: a deeper account has to clear its own + every ancestor\'s. A stricter SCP on Prod doesn\'t replace the Workloads SCP — both apply, and what you experience is the union.',
          '<b>Service control policies (SCPs)</b> — see <i>AWS Governance → SCPs</i>. They attach to root, OU, or account, and set the maximum permissions allowed.',
        ],
        example: `Sample tree:
Root
├── Security OU       (audit + log archive accounts)
├── Sandbox OU        (free play; SCP forbids network egress)
└── Workloads OU
    ├── NonProd OU    (dev + test accounts)
    └── Prod OU       (locked-down SCPs)`,
      },
      {
        cloud: 'azure',
        service: 'Azure Management Groups + Subscriptions',
        plain: `Subscriptions are Azure's account equivalent. Management Groups are folders
                above them; Tenant Root sits at the top. Policies attached at an MG flow
                down to every sub beneath.`,
        detail: [
          '<b>Tenant Root group</b> — the singular top of the tree. One per Entra ID tenant.',
          '<b>Management Group (MG)</b> — folder for grouping subscriptions. Up to 6 levels deep below the root. Same idea as an OU.',
          '<b>Subscription</b> — workload + billing container. Resource Groups live inside subscriptions; resources live inside Resource Groups.',
          '<b>Inheritance</b> — a policy assigned at a MG installs a checkpoint every sub beneath it must pass. A sub-level assignment ADDS another checkpoint; it cannot remove or relax one set above. Same shape as AWS, different vocabulary.',
          '<b>Subscription vending</b> — the equivalent of "give me a new account" is "give me a new subscription." Usually automated via Terraform/Bicep so the new sub lands in the right MG with baseline policies.',
        ],
        example: `Sample tree:
Tenant Root
├── Platform MG      (shared services + landing zone subs)
├── Sandbox MG       (Azure Policy denies egress, public IPs)
└── Workloads MG
    ├── NonProd MG   (dev + test subs)
    └── Prod MG      (initiatives with deny effects)`,
      },
    ],
    diagram: `Both clouds, same shape:

   ┌───────────────────────┐
   │   Company / Root      │   ← controls here apply to EVERYTHING
   └───────────┬───────────┘
       ┌───────┴────────┐
       │                │
   ┌───┴────┐      ┌────┴────┐
   │ OU /MG │      │ OU / MG │
   └───┬────┘      └────┬────┘
       │                │
   ┌───┴────┐      ┌────┴────┐
   │Account │      │  Sub    │   ← workloads live here
   │  /Sub  │      │         │
   └────────┘      └─────────┘`,
    conceptDive: {
      title: 'Inheritance & blast radius — by worked example',
      body: `
        <section class="cd-section">
          <h3 class="cd-h">The rule in one sentence</h3>
          <p>Every action runs through one checkpoint per node on its path from root down to account.
          <strong>Any single checkpoint can deny. None can override another's deny.</strong></p>
        </section>

        <section class="cd-section">
          <h3 class="cd-h"><span class="cd-h-tag">Worked example</span>Stacking is intersection, not union</h3>
          <p>Org tree:</p>
          <pre><code>Root
└── Workloads OU      ← SCP A: deny  s3:DeleteBucket
    └── Prod OU        ← SCP B: deny  s3:PutBucketPolicy
        └── prod-001  ← (no SCP of its own)</code></pre>
          <p>A user in <code>prod-001</code> calls four S3 actions. What happens to each?</p>
          <table class="fnd-cd-table">
            <thead><tr><th>Action</th><th>Root</th><th>Workloads OU</th><th>Prod OU</th><th>Outcome</th></tr></thead>
            <tbody>
              <tr><td><code>s3:GetObject</code></td>      <td>—</td><td>—</td><td>—</td><td><strong>allowed</strong> (no deny on path)</td></tr>
              <tr><td><code>s3:PutObject</code></td>      <td>—</td><td>—</td><td>—</td><td><strong>allowed</strong></td></tr>
              <tr><td><code>s3:DeleteBucket</code></td>   <td>—</td><td><strong>DENY</strong></td><td>—</td><td><strong>denied</strong> by SCP A</td></tr>
              <tr><td><code>s3:PutBucketPolicy</code></td><td>—</td><td>—</td><td><strong>DENY</strong></td><td><strong>denied</strong> by SCP B</td></tr>
            </tbody>
          </table>
          <p>The deeper account experiences the <strong>intersection</strong> of every ancestor's restrictions.</p>
          <aside class="cd-callout">
            <strong class="cd-callout-tag">⚠ Common trap</strong>
            <p>"Most specific rule wins" works in CSS and IAM. <strong>It does NOT work in SCPs or Azure Policy.</strong>
            Restrictions stack; a child can only add denies, never remove a parent's.</p>
          </aside>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">"Blast radius" — which leaves does this checkpoint cover?</h3>
          <ul>
            <li><strong>Root</strong> — every account. Use for things that must be true everywhere.</li>
            <li><strong>OU/MG</strong> — that sub-tree only. Use for environment-specific rules.</li>
            <li><strong>Single account/sub</strong> — tiny. Usually a smell that the rule belongs higher.</li>
          </ul>
        </section>`,
    },
    fieldNotes: [
      'The Tenant Root MG is <b>invisible by default</b>. Turn it on: <i>Entra ID → Properties → Access management for Azure resources → "Yes"</i>. Without it, "top" policies silently apply only at sub level.',
      'AWS allows OUs to nest 5 deep; Azure 6. <b>Two levels is plenty.</b> Deep trees are auditor-hostile and Terraform-hostile.',
      'Moving an account between OUs takes ~60s; SCPs switch in real time. <b>Useful for incident response</b> — pull a compromised account into a deny-all OU.',
      '<b>Sandbox should explicitly deny network egress</b> + expensive SKUs (GPU VMs, etc.). Otherwise sandbox cost <i>becomes</i> production cost.',
      'Never run workloads in the AWS management account or Azure Tenant Root. Delegate <b>Defender / Config / Security Hub / GuardDuty</b> to a dedicated Security account. Auditors expect this separation.',
      'OU/MG <b>renames cascade</b> in the portal but cached names in Terraform state, runbooks, KQL silently drift. Treat the canonical ID as the contract.',
      'AWS Organizations has <b>one</b> management account; Entra ID has <b>one</b> tenant. Subscriptions are free; AWS accounts cost slightly (CloudTrail, Config defaults).',
      'Don\'t put audit / log-archive accounts in NonProd OUs. Auditors flag this as a chain-of-custody concern.',
      '"<b>Blast radius</b>" = "which leaves does this checkpoint cover." Use it when proposing where to attach a guardrail.',
    ],
    handsOn: {
      intro: 'Three short exercises to lock in the tree mental model. Think through each one, then reveal the model answer.',
      steps: [
        {
          label: 'Q1',
          question: `Given this org tree:
<pre><code>Root
├── Security OU       (audit + log archive accounts)
├── Sandbox OU        (free play; SCP forbids egress)
└── Workloads OU
    ├── NonProd OU    (dev + test accounts)
    └── Prod OU       (locked-down SCPs)</code></pre>
You attach a "deny public storage" rule at the <strong>Workloads</strong> OU. Which OUs/accounts does it COVER, and which does it MISS?`,
          hint: 'Rules flow DOWN the tree. Siblings and parents are untouched.',
          answer: `<p><strong>Covers</strong> — everything <em>under</em> Workloads: the NonProd OU, the Prod OU, and every account inside either of them.</p>
<p><strong>Misses</strong> — Sandbox OU (sibling of Workloads), Security OU (sibling), the management/root account itself, and any future OU added outside the Workloads sub-tree.</p>
<p>Lesson: attach high if you want broad coverage; attach low if you want narrow scope. "Blast radius" = which leaves the rule covers.</p>`,
        },
        {
          label: 'Q2',
          question: 'Translate the AWS vocabulary to Azure: what is the Azure equivalent of (a) AWS Organization root, (b) Organizational Unit (OU), (c) member account, (d) the place you attach an SCP?',
          answer: `<ul>
<li>(a) AWS Organization root → <strong>Tenant Root group</strong> (one per Entra ID tenant).</li>
<li>(b) Organizational Unit → <strong>Management Group (MG)</strong>.</li>
<li>(c) Member account → <strong>Subscription</strong>.</li>
<li>(d) SCP attach point (root / OU / account) → <strong>Azure Policy assignment scope</strong> (Tenant Root / MG / subscription).</li>
</ul>
<p>Shape is identical: a tree with rules attached at nodes that inherit down. Only the names differ.</p>`,
        },
        {
          label: 'Q3',
          question: `Same tree as Q1, but with three SCPs annotated at different levels:
<pre><code>Root                    ← SCP: deny non-allowed regions
└── Workloads OU        ← SCP: deny untagged volumes
    └── Prod OU         ← SCP: deny IAM user creation
        └── prod-001    (a real account)</code></pre>
A user in <code>prod-001</code> tries to <code>iam:CreateUser</code> in <code>us-east-1</code>. <strong>How many checkpoints does the action hit, and what happens at each one?</strong>`,
          hint: 'Trace the path Root → Workloads OU → Prod OU → Prod account. At each step ask: does <em>this</em> checkpoint deny <em>this</em> action?',
          answer: `<p>The action passes through <strong>three checkpoints</strong> on its way to the Prod account:</p>
<ol>
<li><strong>Root checkpoint</strong> — "deny non-allowed regions." The action is in <code>us-east-1</code>, which is allowed. Checkpoint waves it through.</li>
<li><strong>Workloads OU checkpoint</strong> — "deny untagged volumes." The action is <code>iam:CreateUser</code>, not a volume action. Checkpoint waves it through.</li>
<li><strong>Prod OU checkpoint</strong> — "deny IAM user creation." Direct hit. Checkpoint says <strong>no</strong>. Action is denied.</li>
</ol>
<p><strong>Key observations:</strong></p>
<ul>
<li>The action only got <em>checked</em> by checkpoints on its path — sibling OUs (Sandbox, NonProd, Security) have their own checkpoints, but those don't apply because the action isn't going there.</li>
<li>It only takes <strong>one</strong> "no" anywhere on the path to deny. The Root and Workloads OU checkpoints saying "yes" don't help.</li>
<li>If the same user tried <code>iam:CreateUser</code> from a <em>NonProd</em> account, the Prod OU checkpoint isn't on the path, so the call would succeed (Root and Workloads OU don't deny it). Same action, different blast radius — different outcome.</li>
</ul>`,
        },
      ],
      selfCheck: [
        'I can name the AWS shape (Org → OU → account) and the Azure shape (Tenant Root → MG → subscription).',
        'I can explain "blast radius" using the checkpoint picture (a rule covers the leaves under its attach point).',
        'I know rules attached high flow DOWN; rules at a leaf only apply to that leaf.',
        'I know inheritance is additive — a child cannot loosen an inherited rule.',
      ],
    },
    takeaways: [
      { point: 'Both clouds use a tree: Company → folders → accounts/subs. AWS calls folders OUs; Azure calls them Management Groups.', sayItOutLoud: '"Our governance is hierarchical — Org → OU → account on AWS, Tenant Root → MG → subscription on Azure."' },
      { point: 'Rules attached high flow DOWN. Attach broadly = big blast radius; attach low = narrow.', sayItOutLoud: '"To roll a guardrail out broadly we attach it high; to scope it narrowly we attach it low."' },
      { point: 'Inheritance is additive — a child can only add denies, never loosen a parent.', sayItOutLoud: '"A subscription cannot weaken a policy inherited from above."' },
      { point: 'New accounts/subs get vended into a specific OU/MG so the right baseline applies day one.' },
      { point: 'When a control is missing, the first question is: what OU/MG is the resource in?' },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // AWS GOVERNANCE
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'aws-scp',
    group: 'AWS Governance',
    order: 1,
    title: 'Service Control Policies (SCPs)',
    subtitle: 'Org-level deny guardrails — what an AWS account is even allowed to do',
    cloud: 'aws',
    collapsedPanels: true,
    intro: {
      plain: `SCPs attach to an OU or account and say "you literally cannot do X here." They
              cap what's possible — even an admin can't bypass them. They don't grant anything;
              IAM still has to allow the action separately.`,
      mnemonic: 'SCP = "Stop, Can\'t Proceed." Two effects only: Allow and Deny.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Service Control Policies (SCPs)',
        plain: `SCPs cap what's possible in an OU or account. Even an account admin cannot
                do something an SCP denies. SCPs set the maximum; they grant nothing.`,
        detail: [
          '<b>Two effects only:</b> <code>Allow</code> and <code>Deny</code>. Most real SCPs use <code>Deny + NotAction</code> for allowlists.',
          '<b>Attach points:</b> Root, OU, or member account. <b>Cannot</b> attach to the management account.',
          '<b>Evaluation:</b> SCP path must allow AND IAM must allow. SCP deny is final — IAM cannot override.',
          '<b>SCP vs IAM</b> — two parallel checkpoints. SCP asks "is it allowed in this account?" IAM asks "is this person allowed?" Both must say yes.',
          '<b>Common patterns:</b> region restrictions, deny "leave organization", deny CloudTrail off, deny IAM-user creation.',
        ],
        example: `// Deny everything outside us-east-1 and us-west-2
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyOtherRegions",
    "Effect": "Deny",
    "NotAction": [
      "iam:*", "organizations:*", "support:*"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": ["us-east-1", "us-west-2"]
      }
    }
  }]
}`,
        exampleAnnotations: [
          { token: '"Version": "2012-10-17"', type: 'keyword', note: 'AWS policy-language version. Only this exact date string is valid.' },
          { token: '"Effect": "Deny"', type: 'keyword', note: 'AWS keyword. Valid values: "Allow" or "Deny".' },
          { token: '"NotAction"', type: 'keyword', note: 'AWS keyword — apply the Effect to everything EXCEPT these actions.' },
          { token: '"iam:*", "organizations:*", "support:*"', type: 'keyword', note: 'AWS service-action patterns. Format: "<service>:<action>" with * as wildcard.' },
          { token: '"aws:RequestedRegion"', type: 'keyword', note: 'AWS global condition key — the region of the API call being evaluated.' },
          { token: '"us-east-1", "us-west-2"', type: 'user', note: 'Your choice — the AWS region codes you want to allow.' },
          { token: '"Sid": "DenyOtherRegions"', type: 'user', note: 'Optional statement id — your label, any string (helpful in logs).' },
        ],
        artifact: 'aws-scp-json',
      },
      {
        cloud: 'aws',
        service: 'SCP patterns you\'ll actually write',
        plain: `Three patterns cover ~80% of compliance SCPs: Deny+NotAction allowlists,
                <code>aws:PrincipalOrgID</code> for cross-account scoping, and
                <code>aws:MultiFactorAuthPresent</code> for sensitive actions.`,
        detail: [
          '<b>Pattern 1 — Allowlist via <code>Deny + NotAction</code>:</b> deny everything except the services on the list. Common on Sandbox / Network / Security OUs.',
          '<b>Pattern 2 — <code>aws:PrincipalOrgID</code>:</b> global condition key resolving to your Org ID (<code>o-xxxxxxxxxx</code>). Modern replacement for hand-maintained account-ID allowlists.',
          '<b>Pattern 3 — MFA-conditioned deny:</b> deny sensitive actions when <code>aws:MultiFactorAuthPresent</code> is <code>false</code>. Caps what a non-MFA session can do.',
        ],
        example: `// Pattern 1 — Sandbox OU allowlist
{ "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowlistSandboxServices",
    "Effect": "Deny",
    "NotAction": [
      "ec2:*", "s3:*", "cloudwatch:*", "logs:*",
      "iam:*", "organizations:*", "support:*"
    ],
    "Resource": "*"
}]}

// Pattern 2 — only roles inside our Org can call this
{ "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyCallersOutsideOurOrg",
    "Effect": "Deny",
    "Action": ["s3:*", "kms:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": { "aws:PrincipalOrgID": "o-abcd1234ef" }
    }
}]}

// Pattern 3 — deny sensitive ops without MFA
{ "Version": "2012-10-17",
  "Statement": [{
    "Sid": "RequireMFAForSensitive",
    "Effect": "Deny",
    "Action": ["iam:*", "kms:ScheduleKeyDeletion", "organizations:LeaveOrganization"],
    "Resource": "*",
    "Condition": {
      "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" }
    }
}]}`,
        exampleAnnotations: [
          { token: '"NotAction"', type: 'keyword', note: 'AWS keyword — apply the Effect to everything EXCEPT these actions. Used with Deny to build an allowlist.' },
          { token: '"aws:PrincipalOrgID"', type: 'keyword', note: 'AWS global condition key. Resolves to your Organizations ID at call time.' },
          { token: '"aws:MultiFactorAuthPresent"', type: 'keyword', note: 'AWS global condition key. True when the caller used MFA to obtain the session.' },
          { token: '"BoolIfExists"', type: 'keyword', note: 'Condition operator — evaluates the key if present, treats as null if not. Critical here: a missing key would otherwise short-circuit the Deny.' },
          { token: '"StringNotEquals"', type: 'keyword', note: 'Condition operator — match when the value is NOT equal to any in the list.' },
          { token: '"o-abcd1234ef"', type: 'user', note: 'Your AWS Organizations ID — looks like "o-" + 10 hex characters. Find it in the Organizations console.' },
          { token: 'ec2:*, s3:*, cloudwatch:*, logs:*', type: 'user', note: 'Your service list — choose the services this OU is allowed to use.' },
        ],
        artifact: 'aws-scp-json',
      },
    ],
    diagram: `         IAM / RBAC                  SCP
        (what you CAN do)        (what's POSSIBLE in this account)
              │                              │
              ▼                              ▼
         "I want to                     "But is it
         create this S3                 even allowed
         bucket"                        in this OU?"
              │                              │
              └──────── BOTH must say YES ───┘
                            │
                       action runs`,
    conceptDive: {
      title: 'SCP + IAM — two checkpoint lines, same picture as the org tree',
      body: `
        <section class="cd-section">
          <h3 class="cd-h">Two parallel checkpoint lines at the account</h3>
          <p>Org-tree checkpoints stack vertically Root → OU → account. At the account, the
          action also has to clear <strong>two parallel checkpoint lines</strong> before running:</p>
          <ul>
            <li><strong>SCP line</strong> — inherited down the OU tree. "Is this allowed in this account at all?" Grants nothing.</li>
            <li><strong>IAM line</strong> — the user/role's own policies. "Is this person allowed?" Grants specific permissions.</li>
          </ul>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Both lines must say "yes". Either can say "no"</h3>
          <p>IAM <code>ec2:*</code> cannot un-deny an SCP block; a permissive SCP grants nothing to a user without IAM.</p>
          <aside class="cd-callout">
            <strong class="cd-callout-tag">⚑ Tattoo this</strong>
            <p>When a call fails with <code>AccessDenied</code>, the annotation names the checkpoint:
            explicit SCP deny, implicit IAM deny, or resource policy distrust.</p>
          </aside>
          <p>Azure parity: Azure Policy at MG/sub is the inherited line; Azure RBAC is the per-principal line. Both must clear.</p>
        </section>`,
    },
    fieldNotes: [
      '<b>SCPs do NOT restrict the management account.</b> If an SCP "isn\'t working," check who the principal is — admins in the management account skip the gate. This is by design (break-glass).',
      '<b>5KB SCP size limit</b> (compressed JSON). Plan for it. Inheritance gives ~10 effective SCPs per OU before you start trimming.',
      'The default <code>FullAWSAccess</code> SCP attached at the root is an <b>allow-all</b>. <b>Don\'t detach it</b> until your custom Allow-list SCPs cover everything you need — otherwise you lock the entire org out simultaneously.',
      '<code>aws:PrincipalOrgID</code> is the magic condition for "only roles inside our AWS Org can call this." Use it to lock down cross-account S3 buckets, KMS keys, etc.',
      '<b>SCPs don\'t apply to service-linked roles.</b> Sometimes a "blocked" action goes through anyway because CloudFormation or another service made the call on its own role. Check the principal in CloudTrail.',
      'Roll out new SCPs by <b>enabling them in audit via Service Authorization analyzer</b> for ~1 week before flipping to enforce. Catches the "we forgot one workload depended on this" case.',
      'Region-deny SCP via CT covers <b>regional</b> services. Global services (IAM, Route 53, CloudFront, Organizations, Billing) remain accessible — by design, but auditors ask why.',
      '<b><code>aws:PrincipalOrgID</code></b> is the modern way to scope "only us" on cross-account resource policies. One condition replaces a drifting hand-maintained account-ID allowlist.',
      '<b>MFA-conditioned SCPs use <code>BoolIfExists</code></b>, not <code>Bool</code>. The key is absent for service principals; <code>Bool</code> would treat absent as false and accidentally deny those calls.',
    ],
    handsOn: {
      intro: 'A short exercise on SCP evaluation. Use the lab bench if you want to play first; reveal the model answer when ready.',
      steps: [
        {
          label: 'Q1',
          question: 'An account sits inside an OU with an SCP that denies any action where <code>aws:RequestedRegion</code> is not in <code>["us-east-1", "us-west-2"]</code> (with <code>iam:*</code>, <code>organizations:*</code>, <code>support:*</code> exempted via <code>NotAction</code>). An admin in that account runs <code>ec2:RunInstances</code> in <code>eu-west-1</code>. Their IAM policy grants <code>ec2:*</code>. What happens, and why?',
          hint: 'SCP evaluates before IAM. An explicit Deny anywhere on the path wins, regardless of what IAM allows.',
          answer: `<p>The call is <strong>denied</strong> at the SCP layer before IAM is even consulted.</p>
<p>Why: AWS evaluates the SCP path first. The SCP's Deny statement matches because <code>aws:RequestedRegion = eu-west-1</code> is not in the allowed list (<code>us-east-1</code>, <code>us-west-2</code>), and <code>ec2:RunInstances</code> is not on the <code>NotAction</code> exemption list. Once an SCP denies, IAM never gets a vote. The admin sees <code>AccessDenied</code> with an "explicit deny in a service control policy" annotation. Their <code>ec2:*</code> IAM grant is irrelevant — the SCP caps what is even possible.</p>`,
        },
        {
          label: 'Q2',
          question: 'A parent OU has an SCP that denies <code>s3:DeleteBucket</code> on every account beneath it. A child account adds its own SCP whose <code>Effect</code> is <code>Allow</code> for <code>s3:DeleteBucket</code>. Will an admin in the child account be able to delete a bucket? Why or why not?',
          hint: 'SCPs are <em>restrictions</em>, not grants. Read the conceptDive callout above if you want a refresher.',
          answer: `<p>No. An Allow SCP doesn't grant anything — at best, it refrains from denying. The parent OU's Deny stays on the path and fires. Both checkpoints evaluate; the parent says no; end of story. IAM is never consulted. This is the "most specific rule wins" trap — that pattern works in IAM permissions and file ACLs, but <b>not</b> in SCPs. Restrictions stack; they do not override.</p>`,
        },
        {
          label: 'Q3',
          question: `Your team lead wants to limit a single contractor role (<code>ContractorReadOnly</code>) in the Dev account so it can <strong>never</strong> exceed read-only on S3, even if the IAM policies attached to it are edited later. Three tools are on the table:
<ol>
  <li>An <b>SCP</b> denying write actions across the org.</li>
  <li>A <b>Permission Boundary</b> attached to the <code>ContractorReadOnly</code> role.</li>
  <li>A more restrictive <b>IAM policy</b> on the role.</li>
</ol>
<strong>Which is the right tool, and why are the other two wrong for this specific job?</strong>`,
          hint: 'Scope of the restriction matters. SCPs cap the account; IAM grants per principal; Permission Boundaries cap a specific principal.',
          answer: `<p><strong>Permission Boundary on the role.</strong> It is the only tool that caps the <em>maximum</em> permissions of <em>one specific principal</em>. Even if someone attaches an admin IAM policy later, the effective permissions are <code>(IAM policy) ∩ (Boundary)</code> — the boundary keeps the role read-only on S3 regardless.</p>
<p>Why the other two are wrong:</p>
<ul>
<li><strong>SCP (option 1)</strong> caps every principal in the account, not just the contractor. Denying write across the account breaks legitimate developer roles too. Right tool, wrong scope.</li>
<li><strong>IAM policy (option 3)</strong> is a grant, not a cap. Someone with <code>iam:PutRolePolicy</code> can attach a broader policy later — the IAM-only restriction can be lifted without leaving a trace at the boundary.</li>
</ul>
<p>The hierarchy to memorize: <strong>SCP caps the account · Permission Boundary caps the principal · IAM Policy grants permissions to the principal</strong>. The effective answer at evaluation time is the <em>intersection</em> of all three.</p>`,
        },
      ],
      selfCheck: [
        'I can explain in one sentence why an explicit SCP Deny always wins over an IAM Allow.',
        'I know SCPs have two effects (Allow, Deny) and grant nothing.',
        'I know the management account skips SCPs by design (break-glass).',
        'I know the 5KB SCP size limit and the ~10 effective SCPs-per-OU rule of thumb.',
        'I would default to Audit/Service Authorization analyzer first, then promote to enforce.',
      ],
      labLinks: [
        { route: '/practice/scp', label: 'Open SCP + IAM lab bench' },
      ],
    },
    takeaways: [
      { point: 'SCPs cap what an AWS account can ever do; they grant nothing. IAM grants; SCP limits.', sayItOutLoud: '"SCPs are deny-only guardrails — they cap what\'s possible regardless of IAM."' },
      { point: 'SCPs evaluate before IAM. An explicit SCP deny is final — IAM never gets a vote.', sayItOutLoud: '"Explicit deny in an SCP wins, full stop."' },
      { point: 'Two effects: Allow and Deny. Most real SCPs use Deny + NotAction for allowlists.' },
      { point: 'Attach at root for org-wide; at an OU for environment-specific; account-level is usually a smell.', sayItOutLoud: '"I attach at the broadest scope that\'s still correct — usually org root."' },
      { point: 'SCPs do NOT apply to the management account or service-linked roles — known gaps.', sayItOutLoud: '"Known gaps: management account, service-linked roles. Check the principal in CloudTrail."' },
    ],
  },

  {
    id: 'aws-config',
    group: 'AWS Governance',
    order: 2,
    title: 'AWS Config & Config Rules',
    subtitle: 'Detective controls — watch for what slipped past the SCP guardrails',
    cloud: 'aws',
    collapsedPanels: true,
    intro: {
      plain: `Config records every resource change and scores it against rules. Where SCPs
              block at the gate, Config detects what slipped through — drift, things made by
              service-linked roles, resources predating the SCP.`,
      mnemonic: 'SCP = guardrail (blocks). Config Rule = sensor (flags). Both layers are needed.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Config + Config Rules',
        plain: `Config records every resource configuration on every change. Config Rules
                evaluate those records and emit COMPLIANT / NON_COMPLIANT verdicts. Rules are
                managed (AWS-provided) or custom (Lambda or Guard).`,
        detail: [
          '<b>Config recorder</b> — the agent that captures resource state. Without it, no rules run.',
          '<b>Managed rules</b> — ~250 AWS-provided (<code>s3-bucket-public-access-prohibited</code>, <code>ec2-volume-inuse-check</code>, etc.). Pick + parameterize + attach.',
          '<b>Custom rules</b> — Lambda function returning <code>COMPLIANT</code>/<code>NON_COMPLIANT</code>, or Guard DSL for declarative checks.',
          '<b>Triggers:</b> configuration-change (near-real-time) or periodic (≤24h interval).',
          '<b>Aggregator</b> — collects compliance results across accounts/regions. Essential for org-wide visibility.',
          '<b>Remediation</b> — Config can auto-trigger an SSM document to fix non-compliance.',
        ],
        example: `// Conceptual custom rule (Lambda handler)
exports.handler = async (event) => {
  const item = JSON.parse(event.invokingEvent).configurationItem;
  const tags = item.tags || {};
  const compliant = "Owner" in tags && tags.Owner.length > 0;
  return {
    Compliance: compliant ? "COMPLIANT" : "NON_COMPLIANT",
    Annotation: compliant ? "Has Owner tag" : "Missing Owner tag",
  };
};`,
        exampleAnnotations: [
          { token: 'exports.handler', type: 'keyword', note: 'AWS Lambda contract — the function name AWS will invoke.' },
          { token: 'event.invokingEvent', type: 'keyword', note: 'AWS Config sends this on every rule invocation.' },
          { token: 'configurationItem', type: 'keyword', note: 'AWS Config schema — JSON describing the resource being evaluated.' },
          { token: '"COMPLIANT" | "NON_COMPLIANT"', type: 'keyword', note: 'AWS Config valid return values: "COMPLIANT", "NON_COMPLIANT", or "NOT_APPLICABLE".' },
          { token: '"Owner"', type: 'user', note: 'Your choice — the tag key your org standard requires.' },
          { token: '"Has Owner tag" / "Missing Owner tag"', type: 'user', note: 'Your annotation string — surfaces in the AWS Config console for on-call.' },
        ],
        artifact: 'aws-config-lambda',
      },
      {
        cloud: 'aws',
        service: 'Guard DSL — declarative custom rules without writing Lambda',
        plain: `Guard is a small YAML-ish DSL for "field must equal" Config checks. No Lambda,
                no IAM role, no cold-start. Faster to author and cheaper at scale.`,
        detail: [
          '<b>Shape</b>: YAML/Rego-style. Declare resource type + predicate (<code>property must equal value</code>).',
          '<b>Fits</b>: tag presence, encryption flags, versioning, public access, region restrictions — single-resource field checks.',
          '<b>Does NOT fit</b>: branching logic, regex, external lookups, cross-resource correlation. Use Lambda for those.',
          '<b>Authoring loop</b>: write <code>.guard</code> → test with <code>cfn-guard</code> CLI → commit → deploy as <code>CUSTOM_POLICY</code> Config rule.',
        ],
        example: `# Owner tag must exist (the simple half of the Lambda example).
# The "@-in-string" check would still need Lambda — Guard has no regex.

rule require_owner_tag when resourceType == "AWS::S3::Bucket" {
  Tags exists
  Tags[*] {
    Key == "Owner"
    Value != ""
  } <<
    Owner tag is required on every S3 bucket
  >>
}`,
        exampleAnnotations: [
          { token: 'rule require_owner_tag when', type: 'keyword', note: 'Guard DSL — declares a named rule with a guard clause.' },
          { token: 'resourceType == "AWS::S3::Bucket"', type: 'keyword', note: 'Guard built-in — filters the rule to a specific resource type.' },
          { token: 'Tags exists', type: 'keyword', note: 'Guard predicate — the field must be present on the resource.' },
          { token: 'Tags[*] { ... }', type: 'keyword', note: 'Guard array iteration — apply the inner block to every element.' },
          { token: 'Key == "Owner"', type: 'keyword', note: 'Guard predicate — string equality on a property.' },
          { token: '<< ... >>', type: 'keyword', note: 'Guard custom message — surfaces in Config evaluation results as the annotation.' },
          { token: '"Owner"', type: 'user', note: 'Your tag key — pick the convention your org standard requires.' },
        ],
        artifact: 'cfn-guard',
      },
    ],
    diagram: `   Resources change → Config records the change
                              │
                              ▼
                   Rules evaluate the new state
                              │
                  ┌───────────┴────────────┐
                  ▼                        ▼
            COMPLIANT               NON_COMPLIANT
           (do nothing)            ┌──────┴──────┐
                                   ▼             ▼
                              Auto-remediate   Open ticket / page oncall`,
    fieldNotes: [
      '<b>AWS Config is the #1 surprise cloud bill.</b> Estimate cost before enabling org-wide — change-triggered rules on high-churn resources (EC2, ENIs) multiply fast.',
      '<b>Config Aggregator lag</b>: results trail source accounts by minutes to hours. Don\'t trust the aggregator instantly; verify against the source.',
      'Change-triggered rules ≈ near real-time. Periodic rules have a 24h max interval. Pick based on urgency, not cost.',
      'Custom Lambda Config rules need <code>config.amazonaws.com</code> invoke permission. "Doesn\'t evaluate" → check the Lambda resource policy first.',
      'Auto-remediation via SSM: enable only after a week of <b>annotate-but-don\'t-fix</b>. Humans need lead time before the bot starts changing things.',
      'Tag the rule with owner + JIRA + intent in the description. Save your replacement the archaeology.',
      '<b>Check the managed-rule catalog first</b> before writing custom Lambda — most "I need a rule for X" is already a managed rule.',
      '<b>Aggregator advanced queries are SQL-like.</b> Auditors live here: <code>SELECT accountId, resourceId FROM aws_config_compliance_by_resource WHERE complianceType = \'NON_COMPLIANT\'</code>. Pin quarterly queries.',
    ],
    handsOn: {
      intro: 'Three exercises walking the Lambda and Guard examples, plus the SSM remediation hand-off pattern.',
      steps: [
        {
          label: 'Q1',
          question: `Here is the custom Config rule from the panel above (repeated inline so you don't scroll):
<pre><code>exports.handler = async (event) =&gt; {
  const item = JSON.parse(event.invokingEvent).configurationItem;
  const tags = item.tags || {};
  const compliant = "Owner" in tags &amp;&amp; tags.Owner.length &gt; 0;
  return {
    Compliance: compliant ? "COMPLIANT" : "NON_COMPLIANT",
    Annotation: compliant ? "Has Owner tag" : "Missing Owner tag",
  };
};</code></pre>
<strong>What two changes do you make to require BOTH <code>Owner</code> AND <code>CostCenter</code> tags (not just <code>Owner</code>)?</strong>`,
          hint: 'The <code>compliant</code> variable is a boolean expression — extend it. Then make the annotation explain which tag is missing so on-call can act.',
          answer: `<ol>
<li><strong>Extend the compliance check</strong> to AND the second tag:
<pre><code>const compliant =
  "Owner" in tags &amp;&amp; tags.Owner.length &gt; 0 &amp;&amp;
  "CostCenter" in tags &amp;&amp; tags.CostCenter.length &gt; 0;</code></pre>
</li>
<li><strong>Improve the annotation</strong> so it names the missing tag(s):
<pre><code>const missing = ["Owner", "CostCenter"]
  .filter(k =&gt; !tags[k] || !tags[k].length);
return {
  Compliance: missing.length === 0 ? "COMPLIANT" : "NON_COMPLIANT",
  Annotation: missing.length === 0
    ? "Has Owner and CostCenter"
    : "Missing required tag(s): " + missing.join(", "),
};</code></pre>
</li>
</ol>
<p>The annotation lands in the Config console — it is what FinOps reads first when triaging. Vague annotations create extra round-trips.</p>`,
        },
        {
          label: 'Q2',
          question: `For each requirement below, decide the right tool: <strong>managed rule</strong>, <strong>custom Lambda</strong>, or <strong>Guard DSL</strong>. Explain in one line each.
<ol>
  <li>"Every S3 bucket must block public access."</li>
  <li>"Owner tag must contain an <code>@</code>."</li>
  <li>"Every EBS volume must be attached to an instance tagged with the same <code>CostCenter</code> as the volume."</li>
</ol>`,
          hint: 'Managed = pre-built. Guard = simple field check, no regex. Lambda = anything with branching, regex, or cross-resource lookups.',
          answer: `<ol>
<li><strong>Managed rule</strong> — <code>s3-bucket-public-access-prohibited</code> already exists. The managed catalog covers ~250 common checks. Always check the catalog before writing anything custom.</li>
<li><strong>Custom Lambda</strong> — the <code>@</code>-in-string check needs regex (or at least <code>.includes("@")</code>). Guard has no regex. The managed <code>required-tags</code> rule can verify presence but not format.</li>
<li><strong>Custom Lambda</strong> — cross-resource correlation (volume tag must match its attached instance tag). Guard works one resource at a time; managed rules don\'t do joins.</li>
</ol>
<p>The default decision order: <strong>managed first → Guard if it\'s a simple field check → Lambda if neither fits.</strong> Most teams skip Guard and reach for Lambda by reflex, then pay for it in Lambda invocations forever.</p>`,
        },
        {
          label: 'Q3',
          question: `Here is a short SSM Automation document a teammate wrote to auto-remediate "S3 bucket has public access":
<pre><code>schemaVersion: "0.3"
description: "Block public access on a non-compliant S3 bucket"
parameters:
  BucketName:
    type: String
mainSteps:
  - name: blockPublicAccess
    action: aws:executeAwsApi
    inputs:
      Service: s3
      Api: PutPublicAccessBlock
      Bucket: "{{ BucketName }}"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true</code></pre>
<strong>(a)</strong> If <code>BucketName</code> doesn\'t exist (typo / already deleted), what happens and what does the user see in the Config console? <strong>(b)</strong> What\'s the safe rollout — what would you do for the first week before letting this remediation run automatically?`,
          hint: 'SSM automation steps fail loudly; Config marks the remediation as failed. The safe rollout is to keep the Config rule active but disable auto-remediation.',
          answer: `<ul>
<li>(a) The <code>aws:executeAwsApi</code> step calls <code>PutPublicAccessBlock</code>, gets a <code>NoSuchBucket</code> error, and the automation execution status flips to <strong>Failed</strong>. Config logs the remediation attempt and the failure — the resource stays non-compliant. The user sees <em>"Remediation action failed"</em> in the Config console for that resource, with the SSM execution ID as the link. They click through to see the actual error.</li>
<li>(b) <strong>Week 1: detect, do not remediate.</strong> Attach the Config rule (so non-compliance is flagged) but leave the SSM remediation in <em>manual</em> mode — humans click "Remediate" per resource. Watch for false positives, exceptions, and "we shouldn\'t fix this yet" cases. Once the human queue is clean for ~3 days, flip remediation to <strong>auto</strong>. Skipping this step is the #1 way remediation runbooks nuke production buckets at 3am.</li>
</ul>`,
        },
      ],
      selfCheck: [
        'I can explain in one sentence the difference between a managed Config rule and a custom one.',
        'I know configuration-change vs periodic triggers and when each is right.',
        'I would check the managed-rule catalog before writing a custom Lambda.',
        'I know Config Aggregator gives org-wide visibility, with minute-to-hour lag.',
        'I know annotation strings surface in the Config console and should help on-call act.',
      ],
    },
    takeaways: [
      { point: 'Config records resource state; Config Rules turn records into COMPLIANT/NON_COMPLIANT verdicts.', sayItOutLoud: '"Config records every change; Rules turn those records into compliance verdicts."' },
      { point: 'Managed rule first (~250 ready-made). Custom Lambda or Guard DSL only when no managed rule fits.', sayItOutLoud: '"Managed rule first, custom Lambda only when the catalog doesn\'t cover it."' },
      { point: 'configuration-change ≈ near-real-time. Periodic ≤24h interval. Pick by urgency.' },
      { point: 'Config Aggregator is the org-wide view — auditors want one number, not per-account dashboards.', sayItOutLoud: '"For org-wide audit reporting we use Config Aggregator, not per-account dashboards."' },
      { point: 'Pair detection with prevention: SCPs block, Config detects what slipped through.' },
    ],
  },

  {
    id: 'aws-control-tower',
    group: 'AWS Governance',
    order: 3,
    title: 'Control Tower & Landing Zones',
    subtitle: 'How AWS automates building and governing a multi-account environment',
    cloud: 'aws',
    collapsedPanels: true,
    intro: {
      plain: `A Landing Zone is the pre-configured shell a new team "lands" in: right OU,
              baseline guardrails, logging on, identity wired up. AWS Control Tower automates
              building it and offers an Account Factory for vending new accounts.`,
      mnemonic: 'Landing Zone = pre-built, pre-secured cloud "starter home". Control Tower = the construction crew.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Control Tower + AWS Landing Zone',
        plain: `Control Tower sets up and maintains a multi-account AWS environment: baseline
                OU structure, log archive + audit accounts, Config + CloudTrail, SCPs.
                Account Factory vends new accounts into the right OU with baselines applied.`,
        detail: [
          '<b>Landing Zone</b> = the environment. <b>Control Tower</b> = the service that builds and governs it.',
          '<b>Account Factory</b> — vending workflow. New account lands in chosen OU with baseline applied.',
          '<b>Three control types — P-D-P:</b>',
          '  • <b>Preventive</b> — SCPs that block actions before they happen.',
          '  • <b>Detective</b> — Config rules that flag non-compliance after the fact.',
          '  • <b>Proactive</b> — CloudFormation Hooks that block non-compliant template deploys pre-create.',
          '<b>Mandatory · Strongly Recommended · Elective</b> — control tiers. Mandatory always on; others opt-in per OU.',
          '<b>AFT (Account Factory for Terraform)</b> — Terraform-driven extension for customizing vended accounts.',
        ],
        example: `Account vending flow:
  Service Catalog product → Account Factory →
    new AWS account →
      placed in chosen OU (e.g., Workloads/NonProd) →
        SCPs from that path apply →
        Config recorder + CloudTrail on →
        SSO permission sets attached →
        AFT runs Terraform customizations`,
      },
      {
        cloud: 'aws',
        service: 'AFT customization — Terraform-driven account baselines',
        plain: `AFT (Account Factory for Terraform) is the production extension to Account
                Factory: an AWS-published pipeline that runs your Terraform customizations
                against every newly vended account.`,
        detail: [
          '<b>AFT = a pipeline you don\'t write</b> — AWS publishes the deploy Terraform; you populate <code>aft-account-customizations</code> + <code>aft-global-customizations</code> repos.',
          '<b>Customization repos</b>: a <code>terraform/</code> folder of .tf files. AFT runs <code>terraform apply</code> in the new account via a cross-account role.',
          '<b>Trigger modes</b>: at account vending (default) + on-demand re-run for re-baselining existing accounts.',
          '<b>vs CfCT</b>: <i>Customizations for Control Tower</i> is the older CloudFormation-StackSets extension. AFT replaced it. Plan to migrate.',
        ],
        example: `# aft-account-customizations/terraform/main.tf
# Runs against every account in the "workloads-nonprod" account type.

resource "aws_iam_role" "break_glass" {
  name = "BreakGlassReadOnly"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { AWS = "arn:aws:iam::\${var.security_account_id}:root" }
      Action = "sts:AssumeRole",
      Condition = { Bool = { "aws:MultiFactorAuthPresent" = "true" } }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "break_glass_ro" {
  role       = aws_iam_role.break_glass.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Mandatory tags on the account itself
resource "aws_organizations_tag" "owner" {
  resource_id = data.aws_caller_identity.current.account_id
  key         = "Owner"
  value       = var.account_owner_email
}`,
        exampleAnnotations: [
          { token: 'aft-account-customizations/terraform/main.tf', type: 'keyword', note: 'AFT convention — Terraform files under terraform/ are run on every matching account.' },
          { token: 'resource "aws_iam_role"', type: 'keyword', note: 'AWS provider resource — IAM role in the new account.' },
          { token: 'resource "aws_organizations_tag"', type: 'keyword', note: 'AWS provider resource — applies a tag to the AWS account itself (not its resources).' },
          { token: '"BreakGlassReadOnly"', type: 'user', note: 'Your role name — the audit-time emergency-access pattern.' },
          { token: '${var.security_account_id} / ${var.account_owner_email}', type: 'user', note: 'AFT variables — defined in account-request inputs and passed at apply time.' },
        ],
        artifact: 'terraform-hcl',
      },
    ],
    diagram: `  Person needs cloud space
          │
          ▼
  ┌────────────────────────┐
  │ Control Tower Account  │
  │ Factory                │
  └─────────┬──────────────┘
            ▼
  New account lands in pre-chosen OU
            │
            ▼
  Baseline guardrails inherit automatically
  (SCPs + Config rules + CFN Hooks)
            │
            ▼
  Logging + identity + Defender pre-wired
            │
            ▼
       Hand to the team`,
    conceptDive: {
      title: 'What\'s in a baseline — the day-1 checklist',
      body: `
        <section class="cd-section">
          <h3 class="cd-h">The six things a Control Tower baseline applies</h3>
          <ul>
            <li><strong>1 · Org placement</strong> — account lands in chosen OU. Applies every SCP on the path Root → OU.</li>
            <li><strong>2 · Detective layer</strong> — Config recorder on; Strongly Recommended Config rules enabled.</li>
            <li><strong>3 · Audit trail</strong> — CloudTrail on; events ship to the central log-archive bucket in Security OU.</li>
            <li><strong>4 · Identity</strong> — IAM Identity Center permission sets attached; SSO sign-in; no root login.</li>
            <li><strong>5 · Tagging</strong> — mandatory account-level tags (Owner, CostCenter, Environment).</li>
            <li><strong>6 · AFT customizations</strong> — if AFT is in play, customization Terraform runs (baseline IAM, budget alarms, private VPC, default KMS).</li>
          </ul>
          <p>What\'s NOT in the baseline: workload-specific anything (EC2, S3 data buckets, RDS, Lambda). The baseline secures the <em>environment</em>; teams add workloads after.</p>
          <aside class="cd-callout">
            <strong class="cd-callout-tag">⚑ Tattoo this</strong>
            <p>Audit findings cluster on the gap between <em>configured</em> baseline and <em>applied</em> baseline.
            Control Tower says "I configured X"; you verify "X is actually applied to this account."</p>
          </aside>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Azure parity</h3>
          <p>MG placement (replaces OU), MCSB initiative inherited from MG root (replaces SCP+Config inheritance),
          diagnostic settings → central Log Analytics workspace (replaces CloudTrail),
          Entra ID groups → RBAC (replaces IAM Identity Center), tags from the vending pipeline.</p>
        </section>`,
    },
    fieldNotes: [
      '<b>CT drift detection runs hourly.</b> Drift = a guardrail silently failed. Re-enroll the OU/account to fix.',
      '<b>Customizing CT requires CfCT</b> — adds CodePipeline + StackSets. Adopt before you have ten one-off scripts.',
      '<b>AFT</b> is the production pattern for multi-account at scale. Raw Account Factory is fine for tiny orgs (<20 accounts).',
      '<b>You cannot disable Mandatory CT controls.</b> You CAN opt out of "Strongly Recommended" — document the reason before, not after the auditor calls.',
      'CT control tiers (auditor language): <b>Mandatory</b> · <b>Strongly Recommended</b> · <b>Elective</b>.',
      'CT enrollment takes 30+ min and is <b>hard to undo</b>. Test in sandbox; disabling CT leaves orphans behind.',
      'Region-deny SCPs cover <b>regional</b> services. Global services (IAM, Route 53, CloudFront, Organizations, Billing) remain accessible.',
      'Azure parity: subscription-vending pipeline (Terraform) + MCSB initiative at MG root. See <i>Azure Governance → MCSB</i>.',
    ],
    handsOn: {
      intro: 'A design exercise on preventive controls — the "P" in P-D-P.',
      steps: [
        {
          label: 'Q1',
          question: 'You want a preventive control that denies IAM user creation across the whole AWS org (force everyone onto IAM Identity Center / SSO). What artifact do you write, where do you attach it, and why does that count as "preventive"?',
          hint: 'P-D-P: preventive is the SCP layer. Attach high for org-wide coverage.',
          answer: `<ul>
<li><strong>Artifact:</strong> an SCP with <code>Effect: Deny</code> covering the IAM-user surface — at minimum <code>iam:CreateUser</code>, <code>iam:CreateLoginProfile</code>, <code>iam:CreateAccessKey</code>. Resource <code>arn:aws:iam::*:user/*</code>. Leave <code>iam:CreateRole</code> and <code>iam:CreateServiceLinkedRole</code> out of the deny list — those are still needed.</li>
<li><strong>Where to attach:</strong> the <strong>organization root</strong>. Covers every account, present and future. Exempt the management account via <code>NotAction</code> if it must keep an IAM user (rare).</li>
<li><strong>Why "preventive":</strong> the SCP is checked <em>before</em> IAM during action evaluation. An admin in any member account cannot succeed — the call is rejected before any IAM user is created. No detective sweep needed; the bad resource never exists.</li>
</ul>`,
        },
        {
          label: 'Q2',
          question: 'Name the three CT control types (P-D-P) and one underlying tech for each. Then: which is the easiest to retro-apply to an account that already has bad resources in it?',
          hint: 'Preventive = SCP, Detective = Config rule, Proactive = CFN Hook. Retro-apply means "the bad thing already exists in the account."',
          answer: `<ul>
<li><strong>Preventive — SCP.</strong> Blocks the action before it runs. Cannot affect resources that already exist.</li>
<li><strong>Detective — Config rule.</strong> Flags non-compliance after the fact. <strong>Easiest to retro-apply</strong> — turn it on and it evaluates everything currently in the account.</li>
<li><strong>Proactive — CloudFormation Hook.</strong> Inspects the template before resources are created. Like preventive but at template-shape level; cannot affect resources that already exist.</li>
</ul>
<p>So when you inherit a messy account, the first control type you reach for is detective — it tells you what's already wrong. SCPs and Hooks stop the bleed going forward.</p>`,
        },
        {
          label: 'Q3',
          question: `Three Control Tower controls land on your desk for tier classification before the change-review meeting. <strong>For each, decide: Mandatory, Strongly Recommended, or Elective — and say why.</strong>
<ol>
  <li><i>"Disallow changes to AWS Config rules created by Control Tower."</i></li>
  <li><i>"Require encryption at rest on all S3 buckets."</i></li>
  <li><i>"Disallow internet access for AWS Lambda functions via VPC config."</i></li>
</ol>`,
          hint: 'Mandatory = always on, no opt-out (protects Control Tower itself or the audit trail). Strongly Recommended = on for most OUs, document any opt-out. Elective = opt-in per OU based on workload risk.',
          answer: `<ol>
<li><strong>Mandatory.</strong> Control Tower\'s own scaffolding (its Config rules, its log-archive bucket, its core SCPs) must stay intact or the whole landing zone unravels. There is no business case for letting workload teams modify CT-managed Config rules. AWS classifies this whole family as mandatory.</li>
<li><strong>Strongly Recommended.</strong> Encryption-at-rest on S3 is a baseline expectation, but a handful of legitimate exceptions exist (publicly-served static assets where encryption doesn\'t apply, vendor-shared open data). Most OUs enable it; the exceptions are documented per OU.</li>
<li><strong>Elective.</strong> Locking Lambda to VPC-only is workload-shape-dependent. A data-pipeline OU with internal APIs only wants this on; a SaaS-edge OU that needs Lambda to call public partner APIs will turn it off and accept the risk. Per-OU decision.</li>
</ol>
<p>The auditor language to memorize: <strong>"Why is this Strongly Recommended control off?"</strong> is the most common audit follow-up. Have the answer written down before you opt out, not after.</p>`,
        },
      ],
      selfCheck: [
        'I can name what a Landing Zone is and why teams "land" into a pre-built environment.',
        'I can name the three AWS control types (P-D-P) and one example of each.',
        'I know the AWS Account Factory ↔ Azure Terraform subscription-vending mapping.',
        'I know MCSB initiative at MG root is the Azure analog of mandatory SCPs at org root.',
        'I know CT controls come in three tiers: Mandatory / Strongly Recommended / Elective.',
      ],
    },
    takeaways: [
      { point: 'Landing Zone = pre-secured environment new teams land in. Control Tower automates building it.', sayItOutLoud: '"Our landing zone is the standard environment teams get on day one — pre-applied SCPs, logging, identity, Defender."' },
      { point: 'P-D-P control types: Preventive (SCP), Detective (Config rule), Proactive (CFN Hook).', sayItOutLoud: '"Preventive, detective, proactive — SCPs, Config rules, CFN Hooks respectively."' },
      { point: 'Mandatory controls are always on; Strongly Recommended + Elective are opt-in per OU.' },
      { point: 'AFT is the Terraform-driven extension when you outgrow raw Account Factory (~20+ accounts).', sayItOutLoud: '"On AWS we use Control Tower Account Factory; on Azure we use a Terraform vending pipeline."' },
      { point: 'Drift is the most common audit finding — verify applied state, don\'t trust the CT dashboard alone.', sayItOutLoud: '"Drift is the most common cause of audit findings — verify, don\'t trust the CT dashboard."' },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // AZURE GOVERNANCE
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'azure-policy',
    group: 'Azure Governance',
    order: 1,
    title: 'Azure Policy',
    subtitle: 'Azure\'s guardrail layer — six effects, definition vs assignment, exemptions',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `Azure Policy is broader than an SCP. It can DENY, but also AUDIT, MODIFY,
              APPEND, and DEPLOY-IF-NOT-EXISTS. You write a JSON definition, then assign it to
              a scope (MG, sub, or RG) — the scope sets blast radius.`,
      mnemonic: 'Azure Policy effects = A·D·A·M·D·A · (Audit · Deny · Append · Modify · DeployIfNotExists · AuditIfNotExists).',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Azure Policy — definitions, assignments, effects',
        plain: `A definition is JSON; an assignment binds it to a scope. Once assigned, it
                evaluates every resource in scope and applies its effect.`,
        detail: [
          '<b>Six effects:</b> <code>Audit</code>, <code>Deny</code>, <code>Append</code>, <code>Modify</code>, <code>DeployIfNotExists</code>, <code>AuditIfNotExists</code>. Legacy: <code>Disabled</code>, <code>EnforceOPAConstraint</code>, <code>Manual</code>.',
          '<b>Definition vs Assignment:</b> JSON is a definition. It does nothing until assigned to a scope.',
          '<b>Initiative</b> — a bundle of related policy definitions. MCSB is itself a built-in initiative.',
          '<b>Exemption</b> — time-bound waiver for a resource or scope.',
          '<b>Inheritance</b> stacks. A sub-level assignment adds another checkpoint; it cannot remove one set above.',
          '<b>Audit → Deny rollout:</b> default <code>audit</code>, watch ~1 week, promote to <code>deny</code> once false positives are clear.',
        ],
        example: `// Deny storage accounts with public blob access
{
  "properties": {
    "displayName": "Storage: deny public blob access",
    "policyType": "Custom",
    "mode": "Indexed",
    "policyRule": {
      "if": {
        "allOf": [
          { "field": "type",
            "equals": "Microsoft.Storage/storageAccounts" },
          { "field": "Microsoft.Storage/storageAccounts/allowBlobPublicAccess",
            "equals": "true" }
        ]
      },
      "then": { "effect": "deny" }
    }
  }
}`,
        exampleAnnotations: [
          { token: '"policyType": "Custom"', type: 'keyword', note: 'Azure keyword. Valid: "Custom", "BuiltIn", "Static". You only ever author "Custom".' },
          { token: '"mode": "Indexed"', type: 'keyword', note: 'Azure keyword. "Indexed" = only resources that support tags + location.' },
          { token: '"if" / "then" / "allOf"', type: 'keyword', note: 'Azure Policy rule grammar. Other logical operators: "anyOf", "not".' },
          { token: '"field": "type"', type: 'keyword', note: 'Azure Policy reserved alias — the resource type.' },
          { token: '"Microsoft.Storage/storageAccounts"', type: 'keyword', note: 'Azure resource type identifier — defined by the Microsoft.Storage provider.' },
          { token: '"Microsoft.Storage/.../allowBlobPublicAccess"', type: 'keyword', note: 'Azure Policy alias — a typed path into the resource\'s properties.' },
          { token: '"effect": "deny"', type: 'keyword', note: 'Azure Policy effect. One of: audit, deny, append, modify, deployIfNotExists, auditIfNotExists.' },
          { token: '"displayName": "Storage: deny public blob access"', type: 'user', note: 'Your label — surfaces in the Azure Portal compliance pane.' },
        ],
        artifact: 'azure-policy-json',
      },
    ],
    diagram: `Audit → Deny rollout (the safe pattern):

  Author definition
        │  (custom policy or pick from built-in catalog)
        ▼
  Assign with "effect": "audit"
        │  (no blocking — just records non-compliance)
        ▼
  Wait ~1 week
        │  Watch the compliance pane.
        │  Contact owners of non-compliant resources.
        │  Decide per-resource: remediate, exempt, accept.
        ▼
  Promote to "effect": "deny"
        │  (now blocks new violations)
        ▼
  Continuous evaluation
        ↳ change events (~minutes) + 24h periodic sweeps
        ↳ Defender for Cloud surfaces failures as recommendations
        ↳ Secure Score updates`,
    fieldNotes: [
      '<b>DINE / Modify need a Managed Identity</b> on the assignment with the right RBAC role. Missing identity = silent no-op. The #1 reason DINE "doesn\'t work."',
      'Evaluation cycles: change event (~minutes), full scan (24h), on-demand via <code>Start-AzPolicyComplianceScan</code>. Auditors don\'t wait 24h.',
      'Exemptions <b>take an expiry</b>. Default 90 days; tag with requester + JIRA + cadence. "Permanent" exemptions become audit findings.',
      '<code>enforcementMode: DoNotEnforce</code> stops evaluation but keeps the assignment visible. Use for incident pauses, not "I don\'t like this rule."',
      'Custom policies require <b>alias discovery</b>: <code>Get-AzPolicyAlias</code> tells you which properties you can target.',
      'Two exemption <b>categories</b>: <code>Waiver</code> (accept risk) and <code>Mitigated</code> (compensating control). Auditors read both.',
      '<b>Suppression ≠ exemption.</b> Suppression hides from the Defender dashboard. Exemption modifies the policy assignment. Auditors read exemptions.',
    ],
    handsOn: {
      intro: 'Two exercises on Azure Policy basics. The lab bench lets you click-test each effect.',
      steps: [
        {
          label: 'Q1',
          question: `Given this policy rule:
<pre><code>"if": {
  "allOf": [
    { "field": "type",
      "equals": "Microsoft.Storage/storageAccounts" },
    { "field": "Microsoft.Storage/storageAccounts/allowBlobPublicAccess",
      "equals": "true" }
  ]
},
"then": { "effect": "deny" }</code></pre>
Identify (a) the <em>field</em> being checked (the one that does the actual work), (b) the <em>operator</em>, (c) the <em>effect</em>. What single edit makes the policy <strong>audit-only</strong> (log non-compliance instead of blocking the deploy)?`,
          hint: 'Audit-only = log non-compliance, do not block.',
          answer: `<ul>
<li>(a) Field: <code>Microsoft.Storage/storageAccounts/allowBlobPublicAccess</code> (the <code>type</code> field just narrows to storage accounts; the second condition is the real check).</li>
<li>(b) Operator: <code>equals</code> — comparing the field to the string <code>"true"</code>.</li>
<li>(c) Effect: <code>deny</code>.</li>
</ul>
<p><strong>Audit-only:</strong> change <code>"effect": "deny"</code> to <code>"effect": "audit"</code>. The condition is unchanged — only the consequence differs. Audit is the standard "soft launch" before promoting to Deny.</p>`,
        },
        {
          label: 'Q2',
          question: 'A teammate assigns a <code>DeployIfNotExists</code> policy to install the MDE extension on VMs, but it never actually deploys anything. The compliance pane just shows "non-compliant" forever. (Background: DINE and Modify effects don\'t run directly on the resource — they call out to a side-channel that deploys/modifies something, and that side-channel needs an authenticated identity.) What\'s the #1 cause and how do you fix it?',
          hint: 'DINE deploys things on your behalf, so it needs something to act AS. Without that, the deploy step silently does nothing.',
          answer: `<p>The #1 cause is a <strong>missing managed identity on the assignment</strong>, OR the identity is present but doesn't have the RBAC role it needs to do the deployment. DINE policies can't deploy resources unless the assignment has an identity (System- or User-Assigned) <em>and</em> that identity has been granted (typically) <code>Contributor</code> at the assignment scope.</p>
<p><strong>Fix:</strong></p>
<ol>
<li>Edit the assignment → enable a managed identity (system-assigned is fine for one-off; user-assigned is the production pattern).</li>
<li>Grant the identity the required role at the scope. The policy definition usually names what it needs in <code>policyRule.then.details.roleDefinitionIds</code>.</li>
<li>Trigger a fresh evaluation with <code>Start-AzPolicyComplianceScan</code> — don't wait 24h for the next periodic sweep.</li>
</ol>`,
        },
        {
          label: 'Q3',
          question: `You\'re rolling out a new <strong>region-deny</strong> policy at the Workloads MG. You assign it in <code>audit</code> mode. After 24h the compliance pane shows <strong>12 non-compliant resources</strong>; three of them belong to a team that hasn\'t responded to messages in months. Compliance wants the policy flipped to <code>deny</code> by end-of-quarter. <strong>Walk the next two weeks — what do you do, in order, and what happens at each step to the 3 dormant-team resources?</strong>`,
          hint: 'Audit → contact → triage → exempt where needed → flip to Deny. Dormant owners get a default category and a hard expiry.',
          answer: `<ol>
<li><strong>Day 1–2 (kickoff).</strong> Export the compliance pane to CSV (12 rows). For each row, message the owner via Teams/Slack with the resource ID + the planned <code>deny</code> date. Open a tracker (Jira / spreadsheet) with one row per resource: owner, status, decision.</li>
<li><strong>Day 3–7 (await responses).</strong> Most owners reply with "fix now" or "give me a week." Move 6–9 of them through self-remediation. Keep the policy in <code>audit</code> — the compliance pane stays the source of truth.</li>
<li><strong>Day 7–10 (escalation pass).</strong> For non-responders (the 3 dormant-team resources): <em>escalate to that team\'s manager or the security lead</em>. Document the escalation in the tracker. If still no response by Day 10, default to <strong>create an exemption</strong> — category <code>Waiver</code> (we have no compensating control documented), expiresOn <strong>Day 30</strong>, description: "Owner unresponsive; exemption pending owner contact; auto-revokes Day 30."</li>
<li><strong>Day 10 (flip to Deny).</strong> The remaining 0–3 non-exempt resources will get blocked on next change. That\'s the intended consequence. Send one final announcement in <code>#platform-changes</code> with the cutover time.</li>
<li><strong>Day 10–30 (exemption window).</strong> The dormant team will discover the exemption when they finally try to deploy in the wrong region — the deny fires for new resources, the exemption holds existing ones. Now you have an active owner to talk to. The exemption auto-expires Day 30; if they need longer, they file a renewal with a real category (Mitigated, ideally) — not a quiet bump of the date.</li>
</ol>
<p>Two principles: <strong>(a) audit is the soft-launch lane</strong> — never go straight to deny on a brand-new policy; <strong>(b) every exemption has an expiry and a category</strong> — "permanent" exemptions become audit findings.</p>`,
        },
      ],
      selfCheck: [
        'I can list the six Azure Policy effects: Audit, Deny, Append, Modify, DeployIfNotExists, AuditIfNotExists.',
        'I know an Azure Policy is a definition + an assignment — neither alone does anything.',
        'I know DINE/Modify need a managed identity + RBAC at the assignment, or they silently no-op.',
        'I know exemptions take an expiry and categorize as Waiver vs Mitigated.',
        'I would default to Audit first, promote to Deny once false positives are ruled out.',
      ],
      labLinks: [
        { route: '/practice/azure-policy', label: 'Open Azure Policy effect lab' },
      ],
    },
    takeaways: [
      { point: 'Six effects: Audit, Deny, Append, Modify, DeployIfNotExists, AuditIfNotExists.', sayItOutLoud: '"Azure Policy is broader than SCPs — six effects, not just deny."' },
      { point: 'A definition is JSON; an assignment binds it to a scope. Neither alone does anything.' },
      { point: 'Default to Audit first, watch the compliance pane, promote to Deny once false positives are ruled out.', sayItOutLoud: '"For a new control we default to Audit first, then promote to Deny."' },
      { point: 'DINE/Modify need a managed identity + RBAC on the assignment — or they silently no-op.', sayItOutLoud: '"DINE policies that \'don\'t work\' are almost always missing identity or RBAC."' },
      { point: 'Exemptions are time-bound waivers (90-day default + Waiver/Mitigated category). Don\'t suppress in Defender — exempt in Policy.', sayItOutLoud: '"Exemptions grandfather specific resources without dropping the policy."' },
    ],
  },

  {
    id: 'azure-policy-anatomy',
    group: 'Azure Governance',
    order: 2,
    title: 'Azure Policy: anatomy',
    subtitle: 'The JSON skeleton — once you read the shape, you can read any policy',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `Every Azure Policy is one JSON object with the same skeleton: <code>properties</code>
              wraps <code>policyRule</code>, which splits into <code>if</code> (does this rule
              apply?) and <code>then</code> (the effect + details). Read the skeleton once, read
              any policy.`,
      mnemonic: 'properties → policyRule → if { conditions } + then { effect, details }.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'The skeleton — condition operators + parameters',
        plain: `<code>if</code> uses combinators (<code>allOf</code>/<code>anyOf</code>/<code>not</code>)
                and leaf conditions on <code>field</code> or <code>value</code>. <code>then</code>
                names the effect plus, for DINE/AINE/Modify, the <code>details</code> block.`,
        detail: [
          '<b>Combinators</b> — <code>allOf</code> (AND), <code>anyOf</code> (OR), <code>not</code> (NOT). Nest freely.',
          '<b>Leaf conditions</b> — <code>{ "field": "X", "&lt;op&gt;": "Y" }</code> or <code>{ "value": "[parameters(\'foo\')]", "&lt;op&gt;": "Y" }</code>.',
          '<b>Operators</b> — <code>equals</code>, <code>notEquals</code>, <code>like</code>, <code>match</code>, <code>contains</code>, <code>in</code>, <code>exists</code>, plus numeric/comparison variants.',
          '<b>field vs value</b> — <code>field</code> reads a resource property. <code>value</code> evaluates an expression like <code>parameters(\'x\')</code>.',
          '<b>count()</b> — assert how many array items match a sub-condition. Used for "at least one network rule…" checks.',
          '<b>parameters block</b> — typed inputs (string, array, int, bool). Referenced via <code>[parameters(\'name\')]</code>.',
          '<b>details (DINE/Modify/AINE)</b> — <code>type</code>, <code>existenceCondition</code>, <code>roleDefinitionIds</code>, and <code>deployment</code> (DINE only).',
          '<b>mode</b> — <code>Indexed</code> for resources that support tags+location (most security policies); <code>All</code> for RG/sub-level checks.',
        ],
        example: `// 1. Parameterized "allowed locations" — uses parameters + not + in
{
  "properties": {
    "displayName": "Allowed locations",
    "mode": "All",
    "parameters": {
      "allowedLocations": {
        "type": "Array",
        "metadata": { "displayName": "Allowed regions" }
      }
    },
    "policyRule": {
      "if": {
        "not": {
          "field": "location",
          "in": "[parameters('allowedLocations')]"
        }
      },
      "then": { "effect": "deny" }
    }
  }
}`,
        exampleAnnotations: [
          { token: '"mode": "All"', type: 'keyword', note: 'Azure keyword. Values: "All" or "Indexed".' },
          { token: '"parameters"', type: 'keyword', note: 'Azure Policy schema. Each parameter has a typed input + optional metadata.' },
          { token: '"type": "Array"', type: 'keyword', note: 'Azure Policy parameter type. Valid: String, Array, Object, Boolean, Integer, Float, DateTime.' },
          { token: '"not" / "in"', type: 'keyword', note: 'Azure Policy operators — "not" inverts; "in" checks array membership.' },
          { token: '"[parameters(\'allowedLocations\')]"', type: 'keyword', note: 'Azure Policy expression — square-bracket expressions are evaluated at runtime.' },
          { token: '"allowedLocations"', type: 'user', note: 'Your parameter name — any identifier you choose.' },
          { token: '"displayName": "Allowed locations"', type: 'user', note: 'Your label, shown in the Portal.' },
        ],
        artifact: 'azure-policy-json',
      },
      {
        cloud: 'azure',
        service: 'DeployIfNotExists — the existence-check pattern',
        plain: `DINE auto-remediates: "if the VM doesn't have MDE, deploy it." Two halves —
                <code>existenceCondition</code> (what counts as compliant) and the ARM
                <code>deployment</code> the managed identity runs.`,
        detail: [
          '<b>type</b> (under details) — the related resource type. For MDE on VMs: <code>Microsoft.Compute/virtualMachines/extensions</code>.',
          '<b>existenceCondition</b> — the leaf check that says "the related resource is the right one." Missing it = always non-compliant.',
          '<b>roleDefinitionIds</b> — RBAC role(s) the assignment\'s managed identity needs. Usually <code>Contributor</code> or a specific built-in.',
          '<b>deployment.properties.template</b> — full ARM snippet. Runs <code>incremental</code> against the parent\'s RG.',
          '<b>evaluationDelay</b> — wait N minutes after the trigger resource is created before evaluating.',
        ],
        example: `// 2. Auto-install MDE on Windows VMs — DINE
{
  "properties": {
    "displayName": "Deploy MDE extension on Windows VMs",
    "mode": "Indexed",
    "policyRule": {
      "if": {
        "allOf": [
          { "field": "type", "equals": "Microsoft.Compute/virtualMachines" },
          { "field": "Microsoft.Compute/virtualMachines/storageProfile.osDisk.osType",
            "equals": "Windows" }
        ]
      },
      "then": {
        "effect": "deployIfNotExists",
        "details": {
          "type": "Microsoft.Compute/virtualMachines/extensions",
          "roleDefinitionIds": [
            "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
          ],
          "existenceCondition": {
            "allOf": [
              { "field": "Microsoft.Compute/virtualMachines/extensions/type", "equals": "MDE.Windows" },
              { "field": "Microsoft.Compute/virtualMachines/extensions/publisher", "equals": "Microsoft.Azure.AzureDefenderForServers" }
            ]
          },
          "deployment": {
            "properties": {
              "mode": "incremental",
              "template": { "/* ARM template that adds the MDE extension */": "..." }
            }
          }
        }
      }
    }
  }
}`,
        exampleAnnotations: [
          { token: '"effect": "deployIfNotExists"', type: 'keyword', note: 'Azure Policy effect — deploys an ARM template if existenceCondition fails.' },
          { token: '"details"', type: 'keyword', note: 'Required for DINE/Modify/AINE. Holds related-resource type, existence check, roles, deployment.' },
          { token: '"existenceCondition"', type: 'keyword', note: 'Leaf check that says "the related resource already exists." Missing it = redeploy every eval.' },
          { token: '"roleDefinitionIds"', type: 'keyword', note: 'Required for DINE/Modify. Built-in role IDs the assignment\'s managed identity must hold.' },
          { token: '"/providers/Microsoft.Authorization/roleDefinitions/b24988ac-...24c"', type: 'keyword', note: 'Azure built-in role ID for Contributor — same GUID across all tenants.' },
          { token: '"MDE.Windows" / "Microsoft.Azure.AzureDefenderForServers"', type: 'keyword', note: 'Microsoft-defined extension type + publisher for Defender for Endpoint.' },
          { token: '"Microsoft.Compute/virtualMachines"', type: 'keyword', note: 'Azure resource type — defined by the Microsoft.Compute provider.' },
          { token: '"mode": "incremental"', type: 'keyword', note: 'ARM deployment mode. DINE always uses "incremental".' },
        ],
        artifact: 'azure-policy-json',
      },
      {
        cloud: 'azure',
        service: 'AuditIfNotExists — same shape, audit-only',
        plain: `AINE is DINE\'s passive sibling: same <code>existenceCondition</code> pattern,
                but it only flags non-compliance — no deploy, no managed identity required.`,
        detail: [
          '<b>No <code>roleDefinitionIds</code></b> — AINE doesn\'t deploy. No managed identity needed.',
          '<b>No <code>deployment</code> block</b> — just the existence check.',
          '<b>Surfaces in Defender for Cloud as a recommendation</b>, like Audit.',
          '<b>AINE vs Audit:</b> Audit fires on bad properties of the main resource. AINE fires when a <em>related</em> resource (extension, diagnostic setting) is missing.',
        ],
        example: `// 3. Audit Key Vaults without diagnostic settings to Log Analytics
{
  "properties": {
    "displayName": "Key Vault: audit missing diagnostic settings",
    "mode": "Indexed",
    "policyRule": {
      "if": {
        "field": "type",
        "equals": "Microsoft.KeyVault/vaults"
      },
      "then": {
        "effect": "auditIfNotExists",
        "details": {
          "type": "Microsoft.Insights/diagnosticSettings",
          "existenceCondition": {
            "allOf": [
              { "field": "Microsoft.Insights/diagnosticSettings/logs.enabled", "equals": "true" },
              { "field": "Microsoft.Insights/diagnosticSettings/workspaceId", "exists": "true" }
            ]
          }
        }
      }
    }
  }
}`,
        exampleAnnotations: [
          { token: '"effect": "auditIfNotExists"', type: 'keyword', note: 'Azure Policy effect — flags non-compliance when a related resource is missing. No deployment, no managed identity.' },
          { token: '"Microsoft.KeyVault/vaults"', type: 'keyword', note: 'Azure resource type for Key Vault.' },
          { token: '"Microsoft.Insights/diagnosticSettings"', type: 'keyword', note: 'Azure resource type for diagnostic settings — the related resource AINE looks for.' },
          { token: '"logs.enabled" / "workspaceId"', type: 'keyword', note: 'Property aliases on Microsoft.Insights/diagnosticSettings.' },
          { token: '"exists": "true"', type: 'keyword', note: 'Azure Policy operator. The string "true"/"false" is the keyword form — not the boolean.' },
        ],
        artifact: 'azure-policy-json',
      },
    ],
    diagram: `Anatomy at a glance:

  {
    "properties": {
      "displayName": "...",
      "mode": "Indexed" | "All",
      "parameters": { ... },        ← optional, typed inputs
      "policyRule": {
        "if":   { ...conditions...  },     ← does this rule apply?
        "then": {
          "effect": "audit|deny|...",
          "details": {                     ← only DINE / AINE / Modify
            "type": "<related resource>",
            "existenceCondition": { ... },
            "roleDefinitionIds": [...],    ← DINE / Modify only
            "deployment": { ... }          ← DINE only
          }
        }
      }
    }
  }`,
    fieldNotes: [
      'Memorize <code>properties → policyRule → if + then</code>. Everything else is variations on conditions and effects.',
      '<b>Indexed vs All mode</b> — most security policies want <code>Indexed</code>. Use <code>All</code> for tag-on-RG checks.',
      '<b>Alias discovery is non-negotiable</b>: <code>Get-AzPolicyAlias -ResourceType "..."</code>. Typos in field names = silent no-op.',
      '<b>field vs value gotcha:</b> <code>field</code> reads a resource property; for parameter comparisons use <code>"value": "[parameters(\'foo\')]"</code>.',
      'For DINE, <code>existenceCondition</code> is the most common bug. Too loose = false compliance; too strict = deploys every eval cycle.',
      'Test custom policies in <b>Audit mode first</b>, then promote to <code>deny</code>/<code>deployIfNotExists</code>.',
      '<b>roleDefinitionIds</b> takes <b>built-in role IDs only</b>. Contributor = <code>b24988ac-6180-42a0-ab88-20f7382dd24c</code>.',
      'Initiative parameters cascade — pass once at the initiative assignment; all member policies inherit.',
    ],
    handsOn: {
      intro: 'Three exercises walking the JSON. Read carefully — most "this policy doesn\'t work" tickets are anatomy bugs.',
      steps: [
        {
          label: 'Q1',
          question: `Given this parameterized "allowed locations" rule:
<pre><code>"parameters": {
  "allowedLocations": { "type": "Array" }
},
"policyRule": {
  "if": {
    "not": {
      "field": "location",
      "in": "[parameters('allowedLocations')]"
    }
  },
  "then": { "effect": "deny" }
}</code></pre>
<strong>(a)</strong> What does <code>"in": "[parameters('allowedLocations')]"</code> evaluate to at runtime if the assignment passes <code>["eastus","westus2"]</code>? <strong>(b)</strong> Why is there a <code>not</code> wrapper? <strong>(c)</strong> If you removed the <code>not</code> wrapper without changing anything else, what would the policy actually do?`,
          hint: 'Read the if/then as "if condition is true, then apply effect."',
          answer: `<ul>
<li>(a) It evaluates to <code>"in": ["eastus", "westus2"]</code> — the parameter is substituted at evaluation time.</li>
<li>(b) The <code>not</code> wrapper inverts the check. The leaf says "location IS in the allowed list"; the <code>not</code> turns it into "location is NOT in the allowed list" — which is the condition that triggers the deny.</li>
<li>(c) Remove the <code>not</code> and the rule would deny resources <em>whose location IS in the allowed list</em> — the exact opposite of intent. Anyone deploying to <code>eastus</code> would be blocked; anyone deploying to <code>westeurope</code> would succeed. This is the most common Azure Policy logic bug: forgetting the <code>not</code> on a deny.</li>
</ul>`,
        },
        {
          label: 'Q2',
          question: `Given a <code>DeployIfNotExists</code> policy targeting Windows VMs whose <code>then.details</code> block looks like this (abridged):
<pre><code>"details": {
  "type": "Microsoft.Compute/virtualMachines/extensions",
  "roleDefinitionIds": [ "<contributor-role-id>" ],
  "existenceCondition": {
    "allOf": [
      { "field": ".../extensions/type",      "equals": "MDE.Windows" },
      { "field": ".../extensions/publisher", "equals": "Microsoft.Azure.AzureDefenderForServers" }
    ]
  },
  "deployment": { /* ARM template that installs MDE */ }
}</code></pre>
<strong>If you remove the <code>existenceCondition</code> block entirely</strong>, what happens to every Windows VM in the assignment scope on the next evaluation? Why?`,
          hint: 'existenceCondition is how the policy knows "the related resource I care about already exists."',
          answer: `<p>Without the <code>existenceCondition</code>, the policy has no way to know that the MDE extension is already installed — every VM is treated as <strong>non-compliant</strong> on every eval. Two consequences:</p>
<ul>
<li>The compliance pane shows 100% non-compliant forever, no matter how many extensions you install.</li>
<li>The managed identity re-runs the deployment on every eval cycle (every change event + every 24h scan). The deployment is idempotent in this case (ARM won't re-install if the extension is identical), but you waste deployments, the activity log fills with noise, and you give the auditor a confusing "always non-compliant" dashboard.</li>
</ul>
<p>The <code>existenceCondition</code> is what tells the policy "stop, the thing I would have deployed is already here." Forgetting it is the #2 DINE bug after missing managed identity.</p>`,
        },
        {
          label: 'Q3',
          question: `You have an existing <code>Deny</code> policy whose <code>if</code> block matches storage accounts that don't have HTTPS-only enabled. A new requirement: <strong>instead of denying, also deploy a diagnostic-settings resource</strong> on each non-compliant storage account so its logs flow to your Log Analytics workspace. You decide to convert the Deny into a DINE. <strong>What three things must you add or change in the JSON (and at the assignment) to make that conversion work?</strong>`,
          hint: 'DINE = effect + details (type + existenceCondition + deployment) + managed identity at the assignment.',
          answer: `<ol>
<li><strong>Change the effect</strong> from <code>"deny"</code> to <code>"deployIfNotExists"</code>. The condition <code>if</code> block stays the same — you still want to act on storage accounts.</li>
<li><strong>Add a <code>details</code> block</strong> with:
<ul>
<li><code>type</code> — the related resource type, <code>Microsoft.Insights/diagnosticSettings</code>.</li>
<li><code>existenceCondition</code> — a check that says "diagnostic settings already exist and target our LA workspace." Without this the policy deploys forever.</li>
<li><code>roleDefinitionIds</code> — the role the managed identity needs, typically Contributor + the specific LA workspace role.</li>
<li><code>deployment.properties.template</code> — the ARM template that creates the diagnostic settings resource.</li>
</ul>
</li>
<li><strong>On the policy <em>assignment</em></strong> (not the definition), <strong>enable a managed identity</strong> and grant it the role at the assignment scope. Without this the assignment exists but never actually deploys anything — the silent-noop failure mode.</li>
</ol>`,
        },
      ],
      selfCheck: [
        'I can draw the policy JSON skeleton from memory: properties → policyRule → if + then → (effect, details).',
        'I know <code>not</code> + <code>in</code> is the "allowed locations" pattern; forgetting <code>not</code> inverts the policy.',
        'I know <code>existenceCondition</code> is what stops DINE from looping; missing it = "always non-compliant + always redeploying."',
        'I know DINE needs three things on the assignment side: managed identity, RBAC role, and a fresh compliance scan to see results.',
        'I would <code>Get-AzPolicyAlias</code> before writing any custom field reference.',
      ],
      labLinks: [
        { route: '/practice/azure-policy', label: 'Open Azure Policy effect lab' },
      ],
    },
    takeaways: [
      { point: 'Skeleton: properties → policyRule → if (conditions) + then (effect + optional details).', sayItOutLoud: '"Every Azure Policy is one JSON skeleton. Once you read it, the rest is variations."' },
      { point: 'Combinators: allOf, anyOf, not. Parameters via <code>[parameters(\'x\')]</code> let one definition serve many assignments.' },
      { point: 'DINE/AINE need an <code>existenceCondition</code> — without it they evaluate non-compliant forever.', sayItOutLoud: '"DINE failure #1: missing managed identity. #2: missing existenceCondition. Both silent."' },
      { point: 'DINE/Modify need a managed identity + RBAC on the assignment, or they silently no-op.' },
      { point: 'For \'allowed locations\'-style, the <code>not</code> wrapper inverts an "in" check — forgetting it flips the policy.', sayItOutLoud: '"Audit first, then promote to Deny. Run Get-AzPolicyAlias before any custom field reference."' },
    ],
  },

  {
    id: 'azure-mcsb',
    group: 'Azure Governance',
    order: 3,
    title: 'Microsoft Cloud Security Benchmark (MCSB)',
    subtitle: 'Azure\'s built-in security baseline — ~250 policies bundled as one initiative',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `MCSB is a curated bundle of ~250 Azure Policies aligned to NIST and CIS. You
              assign it once at a top MG; every subscription beneath inherits the continuous
              compliance check. Defender for Cloud surfaces failures and rolls them into the
              Secure Score.`,
      mnemonic: 'MCSB = the curated bundle. Assign once at MG root. Score continuously.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Microsoft Cloud Security Benchmark + subscription vending',
        plain: `Azure has no single "Control Tower." The landing zone is MG hierarchy +
                subscription-vending Terraform + MCSB assigned at the top. New subs land in the
                right MG and inherit MCSB on day one.`,
        detail: [
          '<b>MCSB</b> — Azure\'s built-in baseline initiative. ~250 policies. Curated by Microsoft, free.',
          '<b>Assignment scope</b> — Tenant Root or a top MG. One assignment, all subs inherit.',
          '<b>Control-ID decoder</b> — 2-letter family + number. Memorize:',
          '  <code>NS</code> Network · <code>IM</code> Identity · <code>PA</code> Privileged Access · <code>DP</code> Data Protection',
          '  <code>AM</code> Asset Mgmt · <code>LT</code> Logging+Threat · <code>IR</code> Incident Response · <code>PV</code> Posture+Vuln',
          '  <code>ES</code> Endpoint · <code>BR</code> Backup · <code>DS</code> DevOps Security · <code>GS</code> Governance',
          '<b>Framework mapping</b> — Defender for Cloud → Regulatory Compliance maps MCSB to NIST 800-53, ISO 27001, PCI, HIPAA.',
          '<b>Subscription vending</b> — Terraform (community <code>terraform-azurerm-lz-vending</code>) creates sub, places in MG, applies RBAC + tags. MCSB inherits from MG root.',
          '<b>ESLZ</b> — CAF Landing Zones reference architecture; defines the MG hierarchy your vending pipeline targets.',
        ],
        example: `Vending pipeline (conceptual):
  PR opens → Terraform azurerm_subscription →
    place into Management Group =
      Landing Zones / Corp / Online →
        MCSB initiative inherited from MG root →
          custom initiative "Corp-Security" inherited →
            Defender for Cloud enabled →
              tags applied →
                pipeline assigns Owner / Contributor RBAC`,
      },
      {
        cloud: 'azure',
        service: 'Extending MCSB with a custom "Corp-Security" initiative',
        plain: `Never fork MCSB (you lose Microsoft\'s updates). Instead, author a custom
                initiative with your extras and assign it <em>alongside</em> MCSB at the same
                scope. Both initiatives evaluate; failures union in Defender for Cloud.`,
        detail: [
          '<b>Author</b> as a <code>Microsoft.Authorization/policySetDefinitions</code> resource — lists the policy definition IDs to bundle.',
          '<b>Corp-specific content</b>: tag policies, naming conventions, allowed-image lists, mandatory diagnostic settings beyond MCSB.',
          '<b>Assign next to MCSB</b> at same scope (top MG). Two initiative assignments, not one.',
          '<b>Initiative parameters cascade</b> — define once at the initiative level; every member policy inherits.',
        ],
        example: `// Custom initiative — assigned next to MCSB at the same scope
{
  "properties": {
    "displayName": "Corp-Security",
    "description": "Org extensions on top of MCSB. Never forks the built-in.",
    "policyType": "Custom",
    "parameters": {
      "allowedLocations": {
        "type": "Array",
        "defaultValue": ["eastus", "westus2"]
      }
    },
    "policyDefinitions": [
      {
        "policyDefinitionReferenceId": "deny-out-of-region",
        "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c",
        "parameters": {
          "listOfAllowedLocations": { "value": "[parameters('allowedLocations')]" }
        }
      },
      {
        "policyDefinitionReferenceId": "require-owner-tag",
        "policyDefinitionId": "/subscriptions/.../providers/Microsoft.Authorization/policyDefinitions/corp-require-owner-tag"
      },
      {
        "policyDefinitionReferenceId": "diagnostic-on-keyvault",
        "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/cf820ca0-f99e-4f3e-84fb-66e913812d21"
      }
    ]
  }
}`,
        exampleAnnotations: [
          { token: '"policyType": "Custom"', type: 'keyword', note: 'Azure keyword. "Custom" means you own it; "BuiltIn" means Microsoft owns it.' },
          { token: '"policyDefinitions"', type: 'keyword', note: 'Initiative schema — the array of policies bundled in this initiative.' },
          { token: '"policyDefinitionReferenceId"', type: 'keyword', note: 'Initiative-local identifier — your name for this member inside this initiative.' },
          { token: '"policyDefinitionId"', type: 'keyword', note: 'Full Azure resource ID of the policy. Built-ins live at /providers/Microsoft.Authorization/...; custom at /subscriptions/.../...' },
          { token: '"[parameters(\'allowedLocations\')]"', type: 'keyword', note: 'Azure Policy expression — pulls the value from the initiative-level parameter.' },
          { token: '"Corp-Security" / "allowedLocations"', type: 'user', note: 'Your initiative name + your parameter name — any identifiers you choose.' },
          { token: '"eastus", "westus2"', type: 'user', note: 'Your default region allowlist — the assignment can override.' },
        ],
        artifact: 'azure-policy-json',
      },
    ],
    diagram: `Policy → MCSB → Defender → Secure Score:

  Azure Policy definition (audit / deny / DINE / …)
        │  (one rule, one verdict per evaluated resource)
        ▼
  MCSB built-in initiative
        │  (bundles ~250 such definitions; curated by Microsoft)
        ▼
  Assigned at Tenant Root or top MG
        │  (one assignment — all subs beneath inherit)
        ▼
  Resources evaluated continuously
        │  (change events ~minutes, periodic sweeps 24h)
        ▼
  Defender for Cloud → Recommendations
        │  (each non-compliant resource shows up as a rec)
        ▼
  Secure Score
        ↳ % of remediated recommendations
        ↳ rolling — fixes raise it; new failures drop it
        ↳ Regulatory Compliance pane shows MCSB pass/fail per control`,
    fieldNotes: [
      '<b>MCSB compliance % ≠ Secure Score.</b> Different math, different denominator. Don\'t quote them as the same number.',
      'Decode MCSB control IDs on sight — auditors use them as shorthand. <code>NS-1</code> = network, <code>ES-1</code> = endpoint, <code>LT-4</code> = logging.',
      '<b>MCSB updates auto-apply</b> — read Microsoft\'s release notes; a new "Recommended" control can flip you non-compliant overnight.',
      '<b>Extend MCSB</b> with a custom initiative alongside ("Corp-Security"). Don\'t fork MCSB — you lose Microsoft\'s updates.',
      '<b>Assign at Tenant Root</b> for true org-wide coverage. Assigning at a "top" MG can miss subs in sibling trees.',
      '<b>ESLZ standard hierarchy</b>: <code>Tenant Root → Top → Platform / Landing Zones / Sandbox / Decommissioned</code>. Place MCSB at <code>Top</code>.',
      '<b>Compliance pane export</b> — PDF for headline number, CSV for per-resource breakdown. Auditors want both.',
    ],
    handsOn: {
      intro: 'Two exercises on MCSB mechanics — control-ID decoding and the framework-mapping chain.',
      steps: [
        {
          label: 'Q1',
          question: 'An auditor asks "what\'s your status on <code>NS-1</code> and <code>ES-1</code>?" Without looking anything up, what do those two control IDs cover, and where would you click in the portal to answer the question?',
          hint: 'Use the control-ID decoder from the panel above. The Defender for Cloud Regulatory Compliance pane is the canonical view.',
          answer: `<ul>
<li><code>NS-1</code> — <strong>Network Security, control 1.</strong> Roughly: "restrict network access to resources" — public network access on storage/Key Vault/SQL, NSG rules, etc.</li>
<li><code>ES-1</code> — <strong>Endpoint Security, control 1.</strong> "Every server runs an EDR" — the MDE-on-VMs check.</li>
<li><strong>Portal path</strong>: Defender for Cloud → Regulatory Compliance → Microsoft Cloud Security Benchmark → expand the control family (NS or ES) → click the specific control. You see pass/fail per resource + the underlying policy assignment.</li>
</ul>`,
        },
        {
          label: 'Q2',
          question: 'Trace the data flow from one MCSB <strong>Azure Policy definition</strong> to a number on the <strong>Secure Score</strong>. What plays what role at each step (Policy, MCSB, Defender for Cloud, Secure Score)?',
          hint: 'Four layers. Policy is the rule. MCSB is the bundle. Defender for Cloud is the dashboard. Secure Score is the aggregate %.',
          answer: `<ol>
<li><strong>Azure Policy (audit-mode definition)</strong> — evaluates each resource against its condition and emits a verdict (COMPLIANT / NON_COMPLIANT). The rule logic lives here.</li>
<li><strong>MCSB (the built-in initiative)</strong> — bundles ~250 such definitions and is assigned once at a top MG so all subscriptions inherit. It is <em>not</em> a new rule engine; it is a curated list of definitions.</li>
<li><strong>Defender for Cloud</strong> — reads the verdicts and surfaces each non-compliant resource as a <em>recommendation</em> with severity + remediation steps + a "Fix" button where possible.</li>
<li><strong>Secure Score</strong> — the rolling % of remediated recommendations. Fix one → score ticks up. A new non-compliant resource appears → score ticks down.</li>
</ol>
<p>So the chain is: <strong>Policy definition → MCSB bundles policies → Defender for Cloud surfaces non-compliance as recommendations → Secure Score aggregates remediation rate.</strong></p>`,
        },
      ],
      selfCheck: [
        'I can decode MCSB control IDs on sight (NS, IM, PA, DP, AM, LT, IR, PV, ES, BR, DS, GS).',
        'I know MCSB is a built-in initiative assigned once at a top MG, not a per-sub thing.',
        'I know the chain: Policy → MCSB → Defender → Secure Score.',
        'I know MCSB compliance % ≠ Secure Score. Different math.',
        'I know Defender for Cloud → Regulatory Compliance is the canonical "MCSB status" view.',
      ],
    },
    takeaways: [
      { point: 'MCSB = ~250 built-in Azure policies assigned once at MG root; all subs inherit.', sayItOutLoud: '"MCSB is Azure\'s built-in baseline — about 250 policies, one assignment at MG root."' },
      { point: 'Control IDs decode to 2-letter families (NS, ES, LT, …). Auditors use them as shorthand.', sayItOutLoud: '"NS Network, ES Endpoint, LT Logging+Threat — auditors talk in these codes."' },
      { point: 'Chain: Policy → MCSB → Defender for Cloud → Secure Score. Reg Compliance pane = the canonical MCSB view.', sayItOutLoud: '"For audit: Defender for Cloud → Regulatory Compliance → MCSB."' },
      { point: 'Extend MCSB with a custom "Corp-Security" initiative alongside it — never fork the built-in.', sayItOutLoud: '"We extend MCSB, never fork it, or we lose Microsoft\'s updates."' },
      { point: 'Vending pipeline + MCSB at MG root + MG hierarchy = the Azure landing zone (no single "Control Tower" product).' },
    ],
  },

  {
    id: 'azure-runbooks',
    group: 'Azure Governance',
    order: 4,
    title: 'Azure Automation Runbooks + Az PowerShell',
    subtitle: 'Runbooks for scheduled compliance loops; standalone Az.* scripts for everything else',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `An Automation Runbook is a PowerShell/Python script Azure runs on a schedule or
              on demand — a cron job with Azure auth baked in. Compliance teams use them for
              scheduled audits and bulk remediation.`,
      mnemonic: 'Automation account = the container. Runbook = the script. Managed Identity = the credential.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Automation Runbooks — PowerShell, Managed Identity, schedule',
        plain: `Automation accounts host runbooks. The account\'s Managed Identity authenticates
                via <code>Connect-AzAccount -Identity</code> — no secrets. Attach a schedule
                and it runs on cron.`,
        detail: [
          '<b>Runtime</b> — PowerShell 7.2 is the modern default. <code>5.1</code> is legacy with stale Az versions. Python 3.10/3.11 also available.',
          '<b>Managed Identity flavors</b>:',
          '  • <b>System-Assigned</b> — tied to the Automation account. Dies on recreate.',
          '  • <b>User-Assigned</b> — separate resource, shared across runbooks. <b>Production pattern.</b>',
          '<b>RBAC</b> — grant least-privilege at MG scope so one identity covers every sub beneath.',
          '<b>Modules</b> — <code>Az.Accounts</code>, <code>Az.Resources</code>, <code>Az.Storage</code>, <code>Az.Compute</code>, <code>Az.KeyVault</code>, <code>Az.OperationalInsights</code>.',
          '<b>Output stream limit</b> — ~1MB per job. Bigger? Write to Log Analytics via the Data Collector API.',
          '<b>Idempotency</b> — filter "already compliant" → <code>continue</code>; act only on the rest. Re-runs must be no-ops.',
          '<b>Tag-based opt-out</b> — <code>complianceWaiver = "true"</code>. Runbook skips; auditors list waivers via Resource Graph.',
        ],
        example: `# Disable public network access on storage accounts org-wide
# Trigger: hourly schedule
# Auth: Automation account System-Assigned Managed Identity
# RBAC: Storage Account Contributor at MG scope

Connect-AzAccount -Identity | Out-Null

foreach ($sub in Get-AzSubscription) {
  Set-AzContext -SubscriptionId $sub.Id | Out-Null
  foreach ($acct in Get-AzStorageAccount) {

    # idempotency — skip already-compliant
    if ($acct.PublicNetworkAccess -eq 'Disabled') { continue }

    # waiver tag — owner has a documented opt-out
    if ($acct.Tags['complianceWaiver'] -eq 'true') {
      Write-Output "SKIP (waiver): $($acct.StorageAccountName)"
      continue
    }

    Set-AzStorageAccount -ResourceGroupName $acct.ResourceGroupName \`
                          -Name $acct.StorageAccountName \`
                          -PublicNetworkAccess Disabled | Out-Null
    Write-Output "FIXED: $($acct.StorageAccountName)"
  }
}`,
        exampleAnnotations: [
          { token: 'Connect-AzAccount -Identity', type: 'keyword', note: 'Az PowerShell cmdlet. The `-Identity` switch authenticates via the host\'s managed identity.' },
          { token: 'Get-AzSubscription / Set-AzContext / Get-AzStorageAccount / Set-AzStorageAccount', type: 'keyword', note: 'Az PowerShell cmdlets. Naming convention is fixed: <Verb>-Az<Noun>.' },
          { token: '$acct.PublicNetworkAccess', type: 'keyword', note: 'Property on Microsoft.Storage/storageAccounts. Valid: "Enabled", "Disabled".' },
          { token: "'Disabled'", type: 'keyword', note: 'Azure-defined enum value for PublicNetworkAccess.' },
          { token: "$acct.Tags['complianceWaiver']", type: 'user', note: 'Your tag key — pick a convention and stick to it. Tags are case-sensitive.' },
          { token: "'true'", type: 'user', note: 'Your sentinel value for the waiver tag — tag values are strings.' },
          { token: 'Write-Output', type: 'keyword', note: 'PowerShell cmdlet — writes to the runbook output stream (~1MB job limit).' },
        ],
        artifact: 'azure-runbook-ps1',
      },
      {
        cloud: 'azure',
        service: 'Az PowerShell standalone — when you don\'t need a runbook',
        plain: `Not every Az task needs a runbook. Ad-hoc audits, on-laptop investigation,
                and CI checks use the same Az.* cmdlets — different host, different auth.`,
        detail: [
          '<b>Three auth flavors:</b>',
          '  • <code>Connect-AzAccount</code> (interactive, browser device-code) — on-laptop.',
          '  • <code>Connect-AzAccount -Identity</code> — managed identity (runbook, VM, Azure-hosted CI).',
          '  • <code>Connect-AzAccount -ServicePrincipal -Tenant ... -CertificateThumbprint ...</code> — CI outside Azure.',
          '<b>Modules worth knowing</b>: <code>Az.Accounts</code>, <code>Az.Resources</code>, <code>Az.Storage</code>, <code>Az.PolicyInsights</code> (the compliance API), <code>Az.Security</code>, <code>Az.OperationalInsights</code>.',
          '<b>Multi-subscription pattern</b>: <code>Get-AzSubscription | ForEach { Set-AzContext $_; ... }</code>. Missing outer loop = "audit misses 30 subs" bug.',
          '<b>Server-side <code>-Filter</code> beats client-side <code>Where-Object</code></b>: ships the predicate to Azure instead of pulling everything locally.',
          '<b>Error handling</b>: <code>try/catch</code> + <code>-ErrorAction Stop</code>. In runbooks use <code>Write-Error</code> (job continues), not <code>throw</code>.',
          '<b>Output</b>: emit structured objects (<code>[PSCustomObject]</code>) and pipe to <code>Export-Csv</code>/<code>ConvertTo-Json</code>. Don\'t print strings.',
        ],
        example: `# Standalone audit: find storage accounts allowing public blob across every sub.
# Run on a laptop, in CI, or inside a runbook — same code.

# Auth (pick one):
Connect-AzAccount -Identity | Out-Null              # managed identity (runbook / VM / Azure CI)
# Connect-AzAccount | Out-Null                       # interactive (laptop)
# Connect-AzAccount -ServicePrincipal ...            # CI off-Azure

$findings = @()

foreach ($sub in Get-AzSubscription) {
  try {
    Set-AzContext -SubscriptionId $sub.Id -ErrorAction Stop | Out-Null
  } catch {
    Write-Warning "No access to $($sub.Name) — skipping."
    continue
  }

  Get-AzStorageAccount | ForEach-Object {
    if ($_.AllowBlobPublicAccess -eq $true) {
      $findings += [PSCustomObject]@{
        SubscriptionId = $sub.Id
        SubName        = $sub.Name
        ResourceGroup  = $_.ResourceGroupName
        Account        = $_.StorageAccountName
        Location       = $_.PrimaryLocation
        SnapshotTime   = (Get-Date).ToUniversalTime().ToString("o")
      }
    }
  }
}

# Auditor-grade output: one CSV row per finding, snapshot timestamped.
$findings | Export-Csv -Path "./public-storage-$(Get-Date -Format yyyyMMdd).csv" -NoTypeInformation
Write-Output "Findings: $($findings.Count)"`,
        exampleAnnotations: [
          { token: 'Connect-AzAccount -Identity', type: 'keyword', note: 'Az cmdlet — managed-identity auth. Works in any Azure-hosted runtime (runbook, VM, Azure-hosted CI runner).' },
          { token: 'Get-AzSubscription', type: 'keyword', note: 'Az cmdlet — enumerates every subscription the current identity can read.' },
          { token: 'Set-AzContext -SubscriptionId', type: 'keyword', note: 'Az cmdlet — pins all subsequent cmdlets to this subscription. Session is sticky; bugs hide here in cross-sub scripts.' },
          { token: '-ErrorAction Stop', type: 'keyword', note: 'PowerShell common parameter — makes non-terminating errors terminate (so try/catch sees them).' },
          { token: 'Get-AzStorageAccount', type: 'keyword', note: 'Az.Storage cmdlet — returns storage accounts in the current context.' },
          { token: '$_.AllowBlobPublicAccess', type: 'keyword', note: 'Property on Microsoft.Storage/storageAccounts. Valid: $true / $false.' },
          { token: '[PSCustomObject]@{ ... }', type: 'keyword', note: 'PowerShell idiom — structured row. Pipes cleanly to Export-Csv / ConvertTo-Json.' },
          { token: 'Export-Csv -NoTypeInformation', type: 'keyword', note: 'PowerShell cmdlet — writes CSV without the leading "#TYPE" header that confuses auditors\' spreadsheet tools.' },
          { token: "'public-storage-$(Get-Date ...).csv'", type: 'user', note: 'Your output filename — date-stamped so each run is an audit artifact.' },
        ],
        artifact: 'azure-runbook-ps1',
      },
    ],
    fieldNotes: [
      '<b>Use a User-Assigned Managed Identity</b> in production. System-Assigned dies if the Automation account is recreated.',
      'Use <code>Write-Error</code> (not <code>Throw</code>) on per-resource failures. One bad sub shouldn\'t kill the run.',
      'Output stream limit ~1MB per job. Bigger → write to Log Analytics (Data Collector API) or blob storage.',
      'Schedule with a buffer — never run a 30-min runbook every 30 min. Cadence ≥ 2× worst-case runtime.',
      'Source-control the runbook. A portal-only runbook is an auditor red flag — no change history.',
      'Test in dev with <code>-WhatIf</code> before flipping <code>-Force</code>. Remediation runbooks nuke prod easily.',
      '<b>Don\'t use runbooks for sub-second remediation</b> — use Logic Apps + Event Grid. Runbooks have multi-second cold-start.',
      '<b>Run As Account</b> was deprecated Sep 2023. Migrate to Managed Identity.',
      '<b>Hybrid Worker</b> — for on-prem / VNet-only resources. The worker runs on a VM in your network.',
      'Log actions to a <b>custom Log Analytics table</b> via the Data Collector API. Searchable in KQL; evidence-able.',
      '<b>Server-side <code>-Filter</code> beats client-side <code>Where-Object</code></b> — ships the predicate to Azure instead of filtering 50k rows locally.',
      '<b>Az session subscription is sticky</b>. Author scripts around an outer <code>foreach (Get-AzSubscription)</code> + <code>Set-AzContext</code>, not a hard-coded context.',
    ],
    handsOn: {
      intro: 'Three exercises on writing safe, auditable runbooks and standalone Az scripts.',
      steps: [
        {
          label: 'Q1',
          question: 'You inherit a runbook that does <code>Connect-AzAccount -Credential $cred</code> where <code>$cred</code> reads a service-principal password out of an Automation variable. Compliance flagged it. <strong>What\'s wrong and what should it be doing instead?</strong>',
          hint: 'Managed Identity replaces stored credentials. The classic Run As Account is deprecated.',
          answer: `<p>Two things wrong:</p>
<ol>
<li><strong>Secrets to rotate</strong> — a service-principal password in an Automation variable is a long-lived credential. Compliance wants no embedded secrets; the password rotation cadence is human-managed; the password is readable by anyone with Reader on the Automation account.</li>
<li><strong>The classic Run As Account is deprecated</strong> (Sep 2023). New runbooks should not depend on it; existing ones should migrate.</li>
</ol>
<p><strong>What it should do:</strong> use Managed Identity. Enable a System-Assigned or User-Assigned identity on the Automation account, grant it least-privilege RBAC at the appropriate scope, and replace the auth line with:</p>
<pre><code>Connect-AzAccount -Identity | Out-Null
# or for a user-assigned identity:
Connect-AzAccount -Identity -AccountId &lt;client-id-of-uami&gt; | Out-Null</code></pre>
<p>No secrets, no rotation, no Run As Account dependency.</p>`,
        },
        {
          label: 'Q2',
          question: `Given an hourly remediation runbook that loops every storage account and contains these two lines before the <code>Set-AzStorageAccount</code> call:
<pre><code># idempotency check
if ($acct.PublicNetworkAccess -eq 'Disabled') { continue }

# waiver tag check
if ($acct.Tags['complianceWaiver'] -eq 'true') {
  Write-Output "SKIP (waiver): $($acct.StorageAccountName)"
  continue
}</code></pre>
<strong>(a)</strong> Why is the idempotency check important? <strong>(b)</strong> Why does the waiver tag check matter for an auditor? <strong>(c)</strong> What would you add to the script to write each action to Log Analytics so it shows up as audit evidence?`,
          hint: 'Idempotency, audit trail, and the Data Collector API.',
          answer: `<ul>
<li>(a) <strong>Idempotency.</strong> Without that line, the runbook calls <code>Set-AzStorageAccount</code> on every account every hour, even ones already compliant. Each call is an API operation that lands in the Activity Log — noisy, costly, and confuses anyone reviewing recent changes. The <code>continue</code> means "this account is already in the desired state; don\'t touch it."</li>
<li>(b) <strong>Owner escape hatch + audit trail.</strong> The tag gives owners a documented way to keep public access on (vendor share window, intentional). Without it, owners disable the runbook by hand → opaque. With the tag, the auditor can run one Resource Graph query (<code>Resources | where tags.complianceWaiver == "true"</code>) and see every active exception with metadata.</li>
<li>(c) Add a Log Analytics write per action. Pattern:
<pre><code>$logRow = @{
  TimeGenerated   = (Get-Date).ToUniversalTime().ToString("o")
  Subscription    = $sub.Name
  StorageAccount  = $acct.StorageAccountName
  Action          = "DisabledPublicNetworkAccess"
  RunbookJobId    = $PSPrivateMetadata.JobId
}
# Send via the Data Collector API to a custom table, e.g. ComplianceRemediation_CL
Send-LogToWorkspace -WorkspaceId $env:LA_WS_ID -SharedKey $env:LA_KEY \`
                    -LogType "ComplianceRemediation" -Body ($logRow | ConvertTo-Json)</code></pre>
The custom table is then searchable in KQL alongside other audit data, and the runbook\'s actions become evidenceable.</li>
</ul>`,
        },
        {
          label: 'Q3',
          question: `A teammate runs this standalone script on their laptop:
<pre><code>Connect-AzAccount | Out-Null
$nonCompliant = Get-AzPolicyState -Filter "ComplianceState eq 'NonCompliant'"
$nonCompliant | Export-Csv -Path "./policy-state.csv" -NoTypeInformation
Write-Output "Rows: $($nonCompliant.Count)"</code></pre>
The CSV shows 47 rows. They report "47 non-compliant resources across the org" in standup. The compliance lead pushes back — "we have 30+ subs, that number is way too low." <strong>(a) What\'s the bug? (b) What\'s the minimal change that fixes it? (c) Why is the failure silent — no error, no warning?</strong>`,
          hint: 'Get-AzPolicyState reads from the current subscription only. The Az session is sticky to whichever sub was last Set-AzContext-ed.',
          answer: `<ul>
<li>(a) <strong>The bug</strong>: <code>Get-AzPolicyState</code> queries only the <em>current subscription</em> — the one the laptop\'s last <code>Connect-AzAccount</code> chose by default (usually the first one alphabetically). The other 29+ subs are never queried; their non-compliance is missing from the CSV.</li>
<li>(b) <strong>The fix</strong> — wrap the query in a subscription loop:
<pre><code>$nonCompliant = @()
foreach ($sub in Get-AzSubscription) {
  Set-AzContext -SubscriptionId $sub.Id | Out-Null
  $nonCompliant += Get-AzPolicyState -Filter "ComplianceState eq 'NonCompliant'"
}</code></pre>
Now every sub the identity can read is queried.</li>
<li>(c) <strong>Why silent</strong>: <code>Get-AzPolicyState</code> on a single sub is a valid operation. It returns the (correct) set for that sub. Az has no way to know you <em>meant</em> "all subs." No error, no warning — just a quietly small number. This is the most common cross-sub bug in Az scripting, and the reason memorizing the <code>Get-AzSubscription | ForEach { Set-AzContext ... }</code> outer loop is non-negotiable.</li>
</ul>`,
        },
      ],
      selfCheck: [
        'I can sketch the runbook skeleton: <code>Connect-AzAccount -Identity</code> → loop subs → filter idempotency + waiver → act → log.',
        'I know System-Assigned vs User-Assigned managed identity and would pick User-Assigned in production.',
        'I know to use <code>Write-Error</code> not <code>Throw</code> for per-resource failures.',
        'I know the ~1MB output-stream limit and would log to LA instead.',
        'I know runbooks are for scheduled or batch work — sub-second remediation is Logic Apps + Event Grid.',
      ],
    },
    takeaways: [
      { point: 'A Runbook is a PS/Python script the Automation account runs on a schedule. Managed Identity authenticates — no secrets.', sayItOutLoud: '"Our remediation runbooks authenticate via Managed Identity — no secrets in scope."' },
      { point: 'Idempotency check + waiver tag (complianceWaiver=true) give owners a documented opt-out.', sayItOutLoud: '"Each runbook respects a complianceWaiver tag — owners have a documented opt-out."' },
      { point: 'Output stream ~1MB; log actions to a Log Analytics custom table via Data Collector API.', sayItOutLoud: '"Every action writes to a Log Analytics custom table — searchable in KQL."' },
      { point: 'Don\'t use runbooks for sub-second work — use Logic Apps + Event Grid. Runbooks are for scheduled/batch.' },
      { point: 'Same Az.* cmdlets work in laptops, CI, and runbooks — different auth, same code. Cross-sub loop is non-negotiable.', sayItOutLoud: '"Schedule with a buffer — at least 2× worst-case runtime — or we get overlapping remediation."' },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // INVENTORY & QUERY
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'kql',
    group: 'Inventory & Query',
    order: 1,
    title: 'KQL (Kusto Query Language)',
    subtitle: 'Microsoft\'s read-only query language — SQL with Unix pipes',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `KQL is Microsoft\'s read-only query language. You\'ll meet it everywhere on Azure:
              Defender, Sentinel, Log Analytics, Resource Graph. It reads like a Unix pipeline
              — each <code>|</code> means "then do this next."`,
      mnemonic: 'where → project → summarize → join (leftanti for "what\'s missing"). 90% of queries.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'KQL operators — the 90% you\'ll use daily',
        plain: `<code>where</code> filters rows, <code>project</code> picks columns,
                <code>summarize</code> aggregates, <code>join kind=leftanti</code> finds
                what\'s missing.`,
        detail: [
          '<b>where</b> — filter rows (like SQL <code>WHERE</code>).',
          '<b>project</b> — pick + rename columns. <code>project name, region = location</code>.',
          '<b>summarize</b> — group + aggregate. Pair with <code>arg_max(TimeGenerated, *)</code> for "latest per group."',
          '<b>extend</b> — add a computed column. <code>extend Sensitive = type in (sensitiveTypes)</code>.',
          '<b>let</b> — query-scope variable. Readability + reuse for filter lists.',
          '<b>mv-expand</b> — break a nested array into one row per element. Use to filter inside arrays.',
          '<b>join kind=leftanti</b> — "rows on the left NOT in the right." The idiom for finding missing things.',
          '<b>Other joins</b> — <code>inner</code>, <code>innerunique</code> (default), <code>leftouter</code>, <code>leftsemi</code>.',
          '<b>make-list / make-set</b> — collect grouped values into an array.',
          '<b>bin(TimeGenerated, 1h)</b> — time-bucket for "alerts per hour" style queries.',
          '<b>Case-sensitivity gotcha</b> — <code>==</code> is case-sensitive. Use <code>=~</code> for case-insensitive. Bites on tag names.',
        ],
        example: `// SQL you already know
SELECT name, location
FROM   Resources
WHERE  type = 'microsoft.storage/storageaccounts'
  AND  properties.publicNetworkAccess = 'Enabled'
ORDER  BY location;

// The same query in KQL
Resources
| where type =~ "microsoft.storage/storageaccounts"
| where properties.publicNetworkAccess == "Enabled"
| project name, location
| order by location asc`,
        exampleAnnotations: [
          { token: 'Resources', type: 'keyword', note: 'Azure Resource Graph table — also: PolicyResources, SecurityResources, HealthResources, AdvisorResources.' },
          { token: 'where / project / order by', type: 'keyword', note: 'KQL tabular operators.' },
          { token: '=~', type: 'keyword', note: 'KQL case-insensitive equals. Plain `==` is case-sensitive.' },
          { token: 'type / location / name', type: 'keyword', note: 'Top-level ARM resource fields, available on every row.' },
          { token: 'properties.publicNetworkAccess', type: 'keyword', note: 'Nested property under the resource\'s `properties` blob — path varies per resource type.' },
          { token: '"microsoft.storage/storageaccounts"', type: 'keyword', note: 'Azure resource type — lowercase form in ARG, mixed-case form in Policy.' },
          { token: '"Enabled"', type: 'user', note: 'Your filter value — constrained to provider-defined values ("Enabled"/"Disabled").' },
        ],
        artifact: 'kql',
      },
    ],
    conceptDive: {
      title: 'Where does KQL run? Log Analytics vs Resource Graph',
      body: `
        <section class="cd-section">
          <h3 class="cd-h">Two KQL surfaces — same language, different data</h3>
          <ul>
            <li><strong>Log Analytics (LA)</strong> — logs and time-series ingested via Azure Monitor Agent or Diagnostic Settings. Queries lean on <code>TimeGenerated</code>. Used by Sentinel, Defender alerts, App Insights.</li>
            <li><strong>Azure Resource Graph (ARG)</strong> — live inventory snapshot across every sub you have RBAC on. No time dimension, no ingestion lag. Used by Defender Inventory, Policy compliance, ARG Explorer.</li>
          </ul>
          <aside class="cd-callout">
            <strong class="cd-callout-tag">★ Key rule</strong>
            <p>Time-series / historical / log lines → <strong>Log Analytics</strong>.</p>
            <p>"What exists right now" → <strong>Resource Graph</strong>.</p>
          </aside>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Gotchas that bite newcomers</h3>
          <ul>
            <li><b>ARG KQL ≠ Log Analytics KQL.</b> Different engines; can\'t join across.</li>
            <li><code>arg_max(TimeGenerated, *)</code> only works in Log Analytics — ARG has no time dimension.</li>
            <li><code>=~</code> is case-insensitive equals. Use it on type names + tag names by default.</li>
          </ul>
        </section>`,
    },
    fieldNotes: [
      '<b>For org-wide audit questions, Resource Graph + KQL beats clicking through the portal.</b> Save the query, pin to dashboard, screenshot with date — evidence.',
      '<b>Case-sensitivity gotcha</b>: <code>==</code> is case-sensitive. Use <code>=~</code> for case-insensitive. Bites on tag names.',
      '<b>arg_max(TimeGenerated, *)</b> is the workhorse in Log Analytics for "current state from a time series." Pair with <code>summarize by</code>.',
      '<b>materialize(expr)</b> hints that an expensive subquery should be computed once. Big perf wins in Log Analytics.',
      '<b>Save your queries</b> — ARG Explorer has Saved queries + dashboard pinning. Don\'t lose KQL into Slack.',
      '<b>let</b> blocks at the top of a query: constants and reused sub-results. Big readability win.',
      '<b>mv-expand</b> with nested objects: <code>mv-expand x = props.array</code> then access <code>x.subprop</code>.',
    ],
    handsOn: {
      intro: 'Two reading exercises. KQL skill is reading queries other people wrote and predicting what they return.',
      steps: [
        {
          label: 'Q1',
          question: `Read this KQL and predict what it returns:
<pre><code>let SensitiveTypes = dynamic([
  "microsoft.keyvault/vaults",
  "microsoft.storage/storageaccounts"
]);
Resources
| where type in (SensitiveTypes)
| extend MissingOwner = isnull(tags.Owner) or tags.Owner == ""
| where MissingOwner
| project subscriptionId, resourceGroup, name, type
| order by subscriptionId, type, name</code></pre>
<strong>(a) What\'s the result set in plain English?</strong><br>
<strong>(b) What does <code>let</code> save you here vs hardcoding the list inline?</strong>`,
          hint: 'Read top-to-bottom: define list → filter by type → compute MissingOwner → filter to missing → keep 4 columns → sort.',
          answer: `<ul>
<li>(a) <strong>Every Key Vault and storage account, across every subscription the caller can read, that is missing or has an empty Owner tag.</strong> Output columns: <code>subscriptionId</code>, <code>resourceGroup</code>, <code>name</code>, <code>type</code>. Sorted by sub, then type, then name.</li>
<li>(b) Two things. <strong>Readability</strong> — the sensitive list lives at the top, named, easy to extend. <strong>Reuse</strong> — if you reference the list more than once in the query (you don\'t here, but most real queries do), <code>let</code> defines it once. Bonus: <code>let</code> with a <code>dynamic([])</code> array is the idiomatic way to write "in this list" filters.</li>
</ul>`,
        },
        {
          label: 'Q2',
          question: `Read this KQL and predict what it returns:
<pre><code>Resources
| where type == "microsoft.compute/virtualmachines"
| project vmId = id, vmName = name, subscriptionId
| join kind=leftanti (
    Resources
    | where type == "microsoft.compute/virtualmachines/extensions"
    | where name in ("MDE.Windows", "MDE.Linux")
    | extend vmId = tostring(properties.virtualMachine.id)
    | project vmId
  ) on vmId
| order by subscriptionId, vmName</code></pre>
<strong>(a) What does <code>join kind=leftanti</code> mean here?</strong><br>
<strong>(b) What is the result set in plain English?</strong><br>
<strong>(c) If you replaced <code>leftanti</code> with <code>inner</code>, what would change?</strong>`,
          hint: 'leftanti = "rows on the left that have NO match on the right."',
          answer: `<ul>
<li>(a) <code>leftanti</code> returns rows from the <strong>left</strong> table that have <strong>no</strong> matching row in the right table on the join key. The opposite of an inner join.</li>
<li>(b) <strong>Every VM that does NOT have the MDE extension installed</strong>, across every subscription the caller can read. The right side is a list of VM IDs that have MDE; the left is every VM; <code>leftanti</code> = "VMs minus VMs-with-MDE."</li>
<li>(c) Replace with <code>inner</code> and you flip the meaning to <strong>every VM that DOES have MDE installed</strong>. (The columns would also widen since <code>inner</code> brings the right-side columns; you\'d typically <code>project</code> away the duplicates.) <code>leftanti</code> is the KQL idiom for "what\'s missing" — memorize the pattern.</li>
</ul>`,
        },
      ],
      selfCheck: [
        'I can name the 4 most-used operators: where, project, summarize, join (leftanti).',
        'I know <code>let</code>, <code>extend</code>, <code>mv-expand</code>, <code>make-list</code> and would reach for them in real queries.',
        'I know <code>==</code> is case-sensitive in KQL and <code>=~</code> is the case-insensitive version.',
        'I know Log Analytics (time-series, logs) vs Resource Graph (live inventory) and pick the right surface.',
        'I would save a useful query and pin to a dashboard rather than lose it.',
      ],
      labLinks: [
        { route: '/practice/kql', label: 'Open KQL playground' },
      ],
    },
    takeaways: [
      { point: 'KQL is read-only, pipeline-style. Each <code>|</code> means "then do this next."', sayItOutLoud: '"KQL is the read-only query language — Defender, Sentinel, Log Analytics, Resource Graph."' },
      { point: '90% of queries: where → project → summarize → join (leftanti).' },
      { point: 'leftanti join = the idiom for "what\'s missing" — VMs without an extension, subs without an assignment.', sayItOutLoud: '"leftanti is the idiom for what\'s missing — extensions, assignments, anything."' },
      { point: 'Log Analytics = time-series + logs. Resource Graph = live inventory. Same language, different engines.', sayItOutLoud: '"For org-wide inventory: KQL + Resource Graph beats portal clicking every time."' },
      { point: 'Save queries + pin to dashboards. Quarterly auditor re-runs take seconds, not minutes.' },
    ],
  },

  {
    id: 'resource-graph',
    group: 'Inventory & Query',
    order: 2,
    title: 'Azure Resource Graph',
    subtitle: 'Read-only query layer over your entire tenant\'s inventory',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `Azure Resource Graph (ARG) is a read-only query layer over your tenant\'s live
              inventory. KQL is the language. "Show me every public storage account across
              every subscription" is one query — no time dimension, just current state.`,
      mnemonic: 'ARG = live inventory across the tenant. Reader RBAC required. ~5–15 min eventually consistent.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Resource Graph — the 4 tables that matter',
        plain: `ARG exposes ~10 tables. Four carry 90% of compliance work: <code>Resources</code>,
                <code>PolicyResources</code>, <code>SecurityResources</code>,
                <code>ResourceChanges</code>.`,
        detail: [
          '<b>Auth</b> — your Entra ID identity. No separate ARG identity.',
          '<b>RBAC</b> — <code>Reader</code> on every sub you want to see. Missing Reader = silent omission. Symptom: fewer rows than expected.',
          '<b>Eventually consistent</b> — ~5–15 min lag. Don\'t use ARG for "did my fix land?" — hit the resource API directly.',
          '<b>Throttling</b> — ~15 q/5s/user; ~1000/15min/tenant. Use <code>| top 1000</code> while iterating.',
          '<b>Query surface</b> — ARG Explorer (portal), <code>Search-AzGraph</code> (PS), <code>az graph query</code> (CLI), Azure SDK.',
          '<b>Saved queries</b> — ARG Explorer → Saved queries → pin to dashboard.',
        ],
        example: `Tables you'll use:

  Resources           live inventory of every resource
                      → "where is X right now"

  PolicyResources     policy assignments + compliance states
                      → "what's failing what policy"

  SecurityResources   Defender alerts, secure score, recommendations
                      → "what is MDC flagging right now"

  ResourceChanges     resource property deltas over a 90-day window
                      → "what changed overnight"

Less common:
  ResourceContainers (subs + RGs), AdvisorResources,
  HealthResources, MaintenanceResources, IoTSecurityResources

Example query — find every public storage account, tenant-wide:

  Resources
  | where type =~ "microsoft.storage/storageaccounts"
  | where properties.allowBlobPublicAccess == true
  | project subscriptionId, resourceGroup, name, location
  | order by subscriptionId, name`,
        exampleAnnotations: [
          { token: 'Resources / PolicyResources / SecurityResources / ResourceChanges', type: 'keyword', note: 'ARG table names — fixed, defined by the Resource Graph service.' },
          { token: 'properties.allowBlobPublicAccess', type: 'keyword', note: 'Property path under `properties` for Microsoft.Storage/storageAccounts.' },
          { token: '"microsoft.storage/storageaccounts"', type: 'keyword', note: 'Azure resource type — lowercase in ARG. Use `=~` for case-insensitive matching.' },
          { token: 'subscriptionId / resourceGroup / name / location', type: 'keyword', note: 'Top-level ARM resource fields, available on every row in Resources.' },
        ],
        artifact: 'kql',
      },
    ],
    fieldNotes: [
      '<b>ARG needs Reader RBAC on every sub.</b> Missing Reader = silent omission. The #1 ARG surprise: "Why are there only 47 storage accounts?" — check your sub list first.',
      '<b>ARG is eventually consistent</b> (~5–15 min lag). Don\'t trust it for "did my fix land?" — use the resource API.',
      '<b>ARG KQL ≠ Log Analytics KQL.</b> Different engines; can\'t join across them.',
      '<b>arg_max(TimeGenerated, *)</b> does NOT work in ARG (no time dimension). Use <code>Resources</code> for "now"; <code>ResourceChanges</code> for "what changed."',
      '<b>ResourceChanges retention is 90 days.</b> Longer = export to Log Analytics via Diagnostic Settings.',
      '<b>Throttling</b> kicks in at ~15 q/5s. Use <code>| top 1000</code> while iterating; back-off doesn\'t help on 429s.',
      '<b>tostring()</b> on dynamic <code>properties</code> fields — comparisons need it or you get surprising case-sensitivity.',
      '<b>Pin queries to a dashboard, not Slack.</b> Saved Queries + dashboard pins are the auditor-ready artifact.',
    ],
    handsOn: {
      intro: 'Two short exercises. Both can be executed against the KQL lab bench data — try them first, then check the model answer.',
      steps: [
        {
          label: 'Q1',
          question: 'You ran an ARG query in the portal and got 47 storage accounts back. Your team chat says the org has ~2,000 storage accounts across the tenant. <strong>What is the most likely cause, and how do you confirm it without bothering the platform team?</strong>',
          hint: 'ARG only sees subscriptions where you have Reader RBAC. Missing Reader = silent.',
          answer: `<p><strong>Most likely cause:</strong> you only have <code>Reader</code> on a handful of subscriptions (the 47 storage accounts are spread across those). ARG silently omits subs you can\'t see — no error.</p>
<p><strong>How to confirm without asking anyone:</strong></p>
<ol>
<li>Run <code>Get-AzSubscription</code> (PowerShell) or <code>az account list -o table</code> (CLI). That\'s every sub your identity can see.</li>
<li>Compare the count to the org\'s actual sub count (Resource Graph Explorer has a "subscriptions" picker — count its options, or ask the platform team for the real number).</li>
<li>If they don\'t match, you\'re missing Reader. Request it at the Tenant Root or top MG, not per-sub — one grant, future-proof.</li>
</ol>
<p>This is the #1 source of "the ARG numbers don\'t match" in audits. Fix the Reader scope and the count snaps to reality.</p>`,
        },
        {
          label: 'Q2',
          question: `Write a Resource Graph query that lists <strong>every storage account that is currently non-compliant against any policy assignment</strong>, with columns: subscription, resource group, storage account name, and the policy display name. Hint: this needs a join between <code>Resources</code> and <code>PolicyResources</code>.`,
          hint: 'PolicyResources holds compliance states. Filter PolicyResources to compliance state NonCompliant, then inner-join Resources by resourceId.',
          answer: `<pre><code>// Non-compliant storage accounts, with the policy that flagged them
PolicyResources
| where type == "microsoft.policyinsights/policystates"
| where properties.complianceState == "NonCompliant"
| extend resourceId = tolower(tostring(properties.resourceId))
| project resourceId, policyDef = properties.policyDefinitionName
| join kind=inner (
    Resources
    | where type =~ "microsoft.storage/storageaccounts"
    | extend resourceId = tolower(id)
    | project resourceId, subscriptionId, resourceGroup, name
  ) on resourceId
| project subscriptionId, resourceGroup, name, policyDef
| order by subscriptionId, name</code></pre>
<p>Notes for review:</p>
<ul>
<li><code>tolower()</code> on both <code>resourceId</code> sides defends against case-sensitivity drift — IDs are technically case-insensitive but ARG sometimes returns mixed case.</li>
<li><code>inner</code> join keeps only storage accounts that <em>have</em> at least one non-compliance state. Use <code>leftouter</code> if you want all storage accounts and mark which ones are flagged.</li>
<li>For human-readable policy names, you\'d join again against <code>PolicyResources | where type == "microsoft.authorization/policydefinitions"</code> on <code>policyDef</code> — left as an exercise.</li>
</ul>`,
        },
      ],
      selfCheck: [
        'I know ARG needs Reader on every sub I want to see and "fewer rows than expected" is the symptom of missing Reader.',
        'I know ARG is eventually consistent (~5–15 min) and would not use it for "did my fix just land?"',
        'I can name the 4 main tables: Resources, PolicyResources, SecurityResources, ResourceChanges.',
        'I know ARG KQL ≠ Log Analytics KQL and would not try to join across them.',
        'I would <code>tolower()</code> resourceId on both sides of a join and pin useful queries to a dashboard.',
      ],
      labLinks: [
        { route: '/practice/kql', label: 'Open KQL playground (queries against Resources/PolicyResources/SecurityAlert seed data)' },
      ],
    },
    takeaways: [
      { point: 'Resource Graph = read-only query layer over your tenant\'s inventory. KQL is the language.', sayItOutLoud: '"For tenant-wide inventory: Resource Graph + KQL — one query, all subs, sub-second."' },
      { point: 'Four tables: Resources, PolicyResources, SecurityResources, ResourceChanges.' },
      { point: 'Reader RBAC on every sub — otherwise silent omission, not an error.', sayItOutLoud: '"ARG silently returns fewer rows when Reader is missing. Check sub count first."' },
      { point: 'Eventually consistent (~5–15 min); not for "did my fix just land?"', sayItOutLoud: '"ARG is eventually consistent — don\'t use it to verify a fix just landed."' },
      { point: 'Save + pin queries to dashboards. Quarterly audits stay fast.', sayItOutLoud: '"For compliance dashboards we save the query and pin — auditor screenshot in seconds."' },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DEFENDER STACK
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'defender-cloud',
    group: 'Defender Stack',
    order: 1,
    title: 'Microsoft Defender for Cloud',
    subtitle: 'Azure\'s posture dashboard — secure score, recommendations, regulatory compliance',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `Defender for Cloud (MDC) is Azure\'s central security dashboard (also covers
              connected AWS/GCP/on-prem). Free tier = posture + Secure Score. Paid tiers =
              workload protection per service.`,
      mnemonic: 'CSPM = posture (free). CWP = workload protection (paid per plan).',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Defender for Cloud — CSPM, recommendations, Secure Score',
        plain: `Two layers: CSPM (free) covers posture, Secure Score, Regulatory Compliance.
                CWP (paid) gives per-service workload protection (Servers/MDE, Storage,
                SQL, etc.).`,
        detail: [
          '<b>Secure Score</b> — rolling % of remediated recommendations. Reported up weekly in most shops.',
          '<b>Recommendations</b> — each backed by an underlying Azure Policy. The panel shows definition + failing resources + remediation + "Fix" button.',
          '<b>Regulatory Compliance pane</b> — maps recs to MCSB, NIST 800-53, ISO 27001, PCI, HIPAA. Exportable PDF + CSV.',
          '<b>Plans (CWP tiers)</b>:',
          '  • <b>Servers Plan 1</b> ≈ next-gen AV only.',
          '  • <b>Servers Plan 2</b> ≈ <b>$15/server/month</b>; full EDR (MDE), ASR, vuln mgmt, FIM, JIT VM access.',
          '  • <b>Storage</b> ≈ <b>$10/account/month</b>; malware scanning + anomaly detection.',
          '  • <b>SQL</b> per-DTU; query-level threat intel + vuln assessment.',
          '  • <b>Key Vault, App Service, Containers, Resource Manager, DNS</b> — each its own plan.',
          '<b>Workflow Automation (Logic Apps)</b> — auto-ticket new high-severity recs. Don\'t scan the dashboard by hand daily.',
          '<b>Continuous export</b> — alerts + recs → Log Analytics. The portal shows current state; LA history shows trends.',
        ],
        example: `Triage workflow when secure score drops:

  1. Defender for Cloud → Recommendations
       filter: Status = Unhealthy, Severity = High

  2. For each new unhealthy rec:
       open the recommendation
       → "View underlying policy"  (Azure Policy definition)
       → "Affected resources"      (the failing list)
       → "Remediation steps"       (or "Fix" button where applicable)

  3. Decide per rec:
       cheap + low-impact → auto-remediate today
       expensive + maintenance window → plan
       low-severity, ongoing → exempt OR accept

  4. Cross-reference each rec to its MCSB control ID (NS-1, ES-1, LT-4, …)
     for the next audit cycle.`,
      },
    ],
    fieldNotes: [
      '<b>Suppression ≠ exemption.</b> Suppression hides the rec from the dashboard. Exemption modifies the policy assignment. Auditors read exemptions.',
      '<b>MCSB compliance % ≠ Secure Score.</b> Different math, different denominator. Don\'t conflate them.',
      '<b>Pricing</b>: free CSPM = posture + recs + Secure Score. Paid CWP = per-plan. <b>Servers P2 ≈ $15/server/month</b>; Storage ≈ $10/account; SQL per-DTU.',
      '<b>Foundational CSPM (free) vs Defender CSPM (paid)</b> — paid adds attack-path analysis, agentless VM scanning, governance rules. Worth it >~500 resources.',
      '<b>"MDE not installed" pattern</b> is almost always missing initiative assignment at the new MG, not a broken policy.',
      'Set up <b>Workflow Automation</b> (Logic Apps) to open a ticket on every new high-sev rec. Automate the inbox.',
      'Continuous-export alerts + recs to <b>Log Analytics</b>. KQL over LA history spots trends the portal doesn\'t.',
      'Maintain a <code>compliance-runbooks/</code> repo — one .md per rec type with standard remediation. Saves ~30 min per ticket.',
    ],
    handsOn: {
      intro: 'Two exercises on Secure Score triage and the suppression-vs-exemption distinction.',
      steps: [
        {
          label: 'Q1',
          question: `Secure score dropped 8 points overnight (78% → 70%). Three new "high" recs appeared. <strong>Outline a 5-minute triage that doesn\'t make a hash of it.</strong> Cover (a) where to click, (b) the triage matrix you\'d apply, (c) what number you\'d quote in standup.`,
          hint: 'Severity × remediation cost × user impact. Auto-remediate the cheap-and-easy; plan the expensive; exempt the low-value low-sev.',
          answer: `<ol>
<li><strong>Where to click</strong> — Defender for Cloud → Recommendations → filter Status=Unhealthy, Severity=High, sort by "Last triggered." Open each new rec; the panel shows: underlying Azure Policy definition, affected resources, MCSB control mapping, remediation steps + Fix button.</li>
<li><strong>Triage matrix</strong>: per rec, pick one of three actions:
<ul>
<li><strong>Auto-remediate today</strong> — cheap + low-impact (a config toggle, no resource downtime). Examples: <em>storage accounts should require secure transfer</em>; <em>diagnostic logs should be enabled</em>.</li>
<li><strong>Plan</strong> — expensive or needs a maintenance window. Examples: <em>encrypt all VM disks</em>; <em>private endpoints for storage</em>. Open a ticket with the workload owner, name a date.</li>
<li><strong>Exempt or accept</strong> — low-severity, low-value, or covered by a compensating control. Exempt with a 90-day expiry + a reason + a JIRA tag.</li>
</ul>
</li>
<li><strong>What to quote in standup</strong> — give a recovery projection, not a "we\'re working on it." Example: <em>"Score 70 today; 2 fixes landing today, recover to 75 by EOD; 1 planned fix this week, recover to 79 by Friday."</em> Stakeholders want a number.</li>
</ol>`,
        },
        {
          label: 'Q2',
          question: 'A teammate "fixed" a non-compliant resource by clicking <strong>Suppress</strong> in Defender for Cloud. <strong>Why is this not actually a fix — and what should they have done instead?</strong>',
          hint: 'Suppress only hides the rec from the dashboard. The underlying policy assignment still evaluates the resource as non-compliant. Auditors check the policy state, not the dashboard.',
          answer: `<p><strong>Why it\'s not a fix:</strong></p>
<ul>
<li><strong>Suppression hides the rec from the dashboard</strong>, nothing else. The underlying Azure Policy assignment still evaluates the resource as non-compliant. The Regulatory Compliance pane still shows it. Auditors check the policy state, not the dashboard — so the "fix" is invisible.</li>
<li>Suppression has no expiry, no reason, no JIRA tag, no audit trail. It becomes ambient debt nobody remembers.</li>
</ul>
<p><strong>What they should have done</strong>, in order of preference:</p>
<ol>
<li><strong>Actually fix the resource</strong> — flip the bad setting, redeploy, whatever the rec\'s remediation steps say.</li>
<li><strong>If the fix isn\'t possible right now</strong> — create an <strong>Azure Policy Exemption</strong>. Resource scope (smallest blast radius), 90-day expiry, category = <code>Mitigated</code> if there\'s a compensating control or <code>Waiver</code> if not, description with owner + ticket + reason. Auditors read exemptions; they have all the metadata for a clean review.</li>
<li><strong>If the rec is genuinely wrong for our org</strong> — push back on the policy itself. Steady growth in suppressions/exemptions for the same rec means the rec is misaligned with the org\'s risk profile.</li>
</ol>
<p><strong>Suppression has a narrow legit use</strong>: cosmetic recs you genuinely never want to see (e.g., "consider Plan X"), or short-term incident pauses. Otherwise: exempt, don\'t suppress.</p>`,
        },
      ],
      selfCheck: [
        'I can explain Secure Score in one sentence (% of remediated recommendations).',
        'I know the chain: Azure Policy → MCSB → Defender for Cloud → Secure Score.',
        'I know Defender for Servers Plan 1 vs Plan 2 (P1 = AV; P2 = full EDR + ASR + auto-investigation).',
        'I know suppression ≠ exemption and would default to exemption with an expiry.',
        'I would set up Workflow Automation rather than scan the dashboard daily by hand.',
      ],
    },
    takeaways: [
      { point: 'Defender for Cloud = free CSPM (posture) + paid CWP (per-plan workload protection).', sayItOutLoud: '"Defender for Cloud is our posture dashboard — free CSPM, paid CWP per plan."' },
      { point: 'Secure Score = rolling % of remediated recs. Reported up weekly.', sayItOutLoud: '"Score dropping means a Defender rec flipped non-compliant — we triage by severity."' },
      { point: 'Each rec is backed by an underlying Azure Policy — click through to see what flipped.' },
      { point: 'Regulatory Compliance pane maps to MCSB + NIST + ISO + PCI + HIPAA — the audit-evidence view.' },
      { point: 'Exempt, don\'t suppress. Suppression hides from the dashboard; auditors check policy state.', sayItOutLoud: '"We exempt, not suppress — suppression hides from the dashboard but auditors check policy state."' },
    ],
  },

  {
    id: 'defender-endpoint',
    group: 'Defender Stack',
    order: 2,
    title: 'Microsoft Defender for Endpoint (MDE)',
    subtitle: 'EDR on every server / VM / device — the on-host responder',
    cloud: 'azure',
    collapsedPanels: true,
    intro: {
      plain: `MDE is an EDR — the agent that lives <em>on each VM</em>, watching for malware,
              suspicious processes, lateral movement. Defender for Cloud is the posture
              dashboard; MDE is the on-host responder. Both products, separately licensed.`,
      mnemonic: 'MDC = posture (the dashboard). MDE = EDR (the agent on each host). P1 = AV only; P2 = full EDR.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Defender for Endpoint — EDR vs CSPM, tiers, onboarding',
        plain: `MDC tells you "this VM is missing a patch"; MDE tells you "this VM just ran
                <code>mimikatz.exe</code>." Different layers, both needed.`,
        detail: [
          '<b>EDR vs CSPM</b> — different layers. CSPM = posture/recs; EDR = on-host detection + response. <b>You need both.</b>',
          '<b>P1 vs P2</b>: P1 is AV only. P2 is the full EDR + ASR + auto-investigation + TVM. Procurement asks constantly.',
          '<b>Deployment on Azure VMs</b> — <code>MDE.Windows</code>/<code>MDE.Linux</code> extension. Auto-installed via DINE in the Defender for Servers P2 initiative.',
          '<b>Non-Azure VMs + devices</b> — Defender for Cloud multi-cloud connectors (AWS/GCP), Intune for laptops/phones.',
          '<b>Azure Arc</b> — registers on-prem/non-Azure VMs as Azure resources; MDE deploys the same way.',
          '<b>MCSB ES-1</b> — "every server runs an EDR." The control audits look at for endpoint security.',
          '<b>MMA → AMA migration</b> — old MMA is deprecated. AMA is the future. Plan the migration if you inherit MMA.',
          '<b>ASR rules</b> — block attack patterns (Office macros, child processes). Start in <i>audit</i>, promote to <i>block</i>.',
          '<b>Alert flow</b> — MDE → Defender for Cloud Security Alerts → optional Sentinel. Compliance consumes from MDC, not the MDE portal.',
        ],
        example: `// Policy initiative assignment that auto-deploys MDE
// (provided by the "Configure Microsoft Defender for Endpoint" initiative)
{
  "policyAssignment": {
    "displayName": "Defender for Endpoint auto-onboard",
    "scope": "/providers/Microsoft.Management/managementGroups/Workloads",
    "identity": { "type": "SystemAssigned" },   // ← DINE needs this
    "policyDefinitionId": "/providers/.../Configure-Microsoft-Defender-for-Endpoint"
  }
}`,
        exampleAnnotations: [
          { token: '"scope": "/providers/Microsoft.Management/managementGroups/..."', type: 'keyword', note: 'Azure resource-ID path for a Management Group. Only the final segment is your MG name.' },
          { token: '"identity": { "type": "SystemAssigned" }', type: 'keyword', note: 'Managed-identity schema. Valid: "SystemAssigned", "UserAssigned", "None". Required for DINE/Modify.' },
          { token: '"policyDefinitionId"', type: 'keyword', note: 'Azure Policy assignment schema — references a policy or initiative by ARM resource ID.' },
          { token: '"Workloads"', type: 'user', note: 'Your Management Group name — pick from your MG hierarchy.' },
          { token: '"Defender for Endpoint auto-onboard"', type: 'user', note: 'Your label for the assignment. Shows in the Portal.' },
        ],
        artifact: 'azure-policy-json',
      },
    ],
    fieldNotes: [
      '<b>MDE P1 vs P2</b>: P1 is AV only — no real EDR, no ASR. P2 is the full product. Right answer for servers is almost always P2.',
      '<b>"MDE not installed" pattern</b> — usually missing initiative assignment at the new MG, not a broken policy. Check scope first.',
      '<b>MMA is deprecated.</b> AMA is the future. Plan the migration if you inherit MMA — it will break in 2026.',
      'For Arc-enabled servers: same DINE policy, but the VM must be Arc-registered first (Reader + Connected Machine Onboarding role).',
      '<b>ASR rules</b>: start in <code>audit</code> for ≥1 week before flipping to <code>block</code>. Production-breaking false positives are the rule on aggressive ASR rules.',
      '<b>MDC surfaces MDE alerts as Security Alerts</b> — compliance consumes from MDC; MDE portal is the SOC\'s tool.',
      'Onboarding token rotation: lives in MDE settings. Rotate on suspected compromise; new VMs auto-pick the current token via DINE.',
      '<b>P2 includes Threat & Vulnerability Management (TVM)</b>. CVE/patch dashboard included — don\'t buy a third-party.',
      '<b>XDR vs EDR</b>: MDE is the EDR. M365 Defender = MDE + MDI + MDO + MDA + MCAS as an XDR (cross-domain correlation layer).',
    ],
    handsOn: {
      intro: 'Two exercises on common MDE diagnoses.',
      steps: [
        {
          label: 'Q1',
          question: 'Procurement asks: "Why is Plan 2 worth 3× the Plan 1 price?" <strong>Give a one-paragraph answer that names the four things P2 adds.</strong>',
          hint: 'EDR vs AV; ASR; auto-investigation; vuln mgmt.',
          answer: `<p>P1 is just <strong>next-gen antivirus</strong> — signature + heuristic detection of malware. P2 adds the four things that make it an actual EDR:</p>
<ol>
<li><strong>Endpoint Detection & Response</strong> — live process telemetry, lateral-movement detection, credential-theft detection, persistence mechanisms. The "this VM just ran mimikatz" signal P1 doesn\'t give you.</li>
<li><strong>Attack Surface Reduction (ASR) rules</strong> — block common attack patterns at the host (Office spawning child processes, suspicious WMI calls, lsass dumps). Tune in audit, promote to block.</li>
<li><strong>Automated Investigation & Response</strong> — when an alert fires, MDE runs an automated playbook: contains the device, kills processes, rolls back changes, quarantines files. Reduces analyst burden hugely.</li>
<li><strong>Threat & Vulnerability Management</strong> — CVE inventory + patch prioritization per host. Replaces a separate vuln-management product for most orgs.</li>
</ol>
<p>For compliance: MCSB ES-1 ("every server runs an EDR") is satisfied by P2, not P1.</p>`,
        },
        {
          label: 'Q2',
          question: '6 VMs in a new "data-eng-sandbox" subscription show as unhealthy for "Machines should have endpoint protection installed." Other subs are at 100%. <strong>What\'s the most likely cause and what\'s the fix?</strong>',
          hint: 'MDE auto-deploys via a DINE policy assigned at an MG. New subs need to be inside that MG\'s scope.',
          answer: `<p><strong>Most likely cause:</strong> the new sub isn\'t in the MG scope where the "Configure Microsoft Defender for Endpoint" initiative is assigned. The DINE policy never evaluates the sub\'s VMs, so the extension is never installed.</p>
<p>(Less likely: DINE policy assignment is missing its managed identity, or the identity doesn\'t have Contributor at the new sub. But this would fail in <em>every</em> sub equally, not just the new one — so the symptom doesn\'t match.)</p>
<p><strong>Fix:</strong></p>
<ol>
<li>Move the new sub under the correct MG (typically <code>Workloads</code> or whatever MG holds the initiative assignment).</li>
<li>Or, if the sub legitimately lives elsewhere, assign the initiative at the new sub\'s MG too. Don\'t duplicate per-sub — assign at MG, let inheritance do its job.</li>
<li>Trigger <code>Start-AzPolicyComplianceScan</code> at the sub scope — don\'t wait for the next 24h evaluation cycle.</li>
<li>Within ~1h the DINE policy installs the extension on each VM; compliance pane updates; secure score recovers.</li>
</ol>
<p>This is the #1 "MDE not installed" cause. Always check assignment scope before assuming the policy is broken.</p>`,
        },
      ],
      selfCheck: [
        'I can explain P1 vs P2 in one breath (P1 = AV only; P2 = real EDR + ASR + auto-investigation + TVM).',
        'I know MDE auto-deploys via a DINE policy in the Defender for Servers initiative.',
        'I know "MDE not installed" is almost always missing initiative assignment at the new MG, not a broken policy.',
        'I know MMA → AMA migration is required by 2026; I would not deploy net-new MMA.',
        'I know ASR rules start in <code>audit</code>, promote to <code>block</code> after ~1 week of clean data.',
      ],
    },
    takeaways: [
      { point: 'MDE is the EDR (on-host agent). Different layer from Defender for Cloud (posture dashboard). Both needed.', sayItOutLoud: '"MDE is the EDR — Defender for Cloud is the posture dashboard. Different products, both needed."' },
      { point: 'P1 = next-gen AV only. P2 = full EDR + ASR + auto-investigation + TVM. Compliance wants P2.', sayItOutLoud: '"We\'re on P2 across servers. P1 is just AV; P2 gets EDR + ASR + auto-investigation + vuln mgmt."' },
      { point: 'Auto-deploys on Azure VMs via a DINE policy in the Defender for Servers initiative. "Not installed" = missing assignment scope.', sayItOutLoud: '"When a new sub shows up unhealthy, check assignment scope first."' },
      { point: 'MCSB ES-1 (endpoint security) is satisfied by P2 across every server.' },
      { point: 'MMA is deprecated; AMA is the future. Migration is unavoidable for any inherited estate. ASR rules go audit → block.' },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TERRAFORM
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'terraform',
    group: 'Terraform',
    order: 1,
    title: 'Terraform fundamentals',
    subtitle: 'Just enough HCL + state + modules to read what your team writes',
    cloud: 'tf',
    collapsedPanels: true,
    intro: {
      plain: `Terraform declares cloud config as code: write a text file, <code>plan</code> the
              diff, <code>apply</code> to make it real. Works for AWS, Azure, and 1,000+ other
              providers. You\'ll READ Terraform 10× more often than you write it.`,
      mnemonic: 'Terraform = "I want X." Provider = "I know how to make X happen on cloud Y." State = "Here\'s what I\'ve already made."',
    },
    panels: [
      {
        cloud: 'tf',
        service: 'Terraform language (HCL) basics',
        plain: `Four building blocks in 90% of files: providers (which cloud), resources (what
                to create), variables (inputs), outputs (exposed values). Plus modules and state.`,
        detail: [
          '<b>provider</b> — declares cloud + version. Configured once per module.',
          '<b>resource</b> — the noun you\'re creating. Type + local name + body.',
          '<b>variable</b> — input. Set via <code>terraform.tfvars</code>, <code>TF_VAR_*</code>, or <code>-var</code>.',
          '<b>output</b> — value Terraform exposes after apply (e.g., policy ARN). Consumed by other modules.',
          '<b>module</b> — a folder of .tf files called like a function: <code>module "scp" { source = "./scp"; ... }</code>.',
          '<b>state</b> — JSON mapping resources to real cloud IDs. Stored remotely (S3+DynamoDB, Azure Storage+lease, or TF Cloud).',
          '<b>plan / apply / destroy</b> — lifecycle. <code>plan</code> shows the diff; <code>apply</code> executes; <code>destroy</code> removes.',
          '<b>drift</b> — console clicks changed a resource Terraform manages. Next <code>plan</code> shows the unexpected diff.',
        ],
        example: `# AWS: deny non-allowed regions, attach to an OU
provider "aws" { region = "us-east-1" }

variable "allowed_regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2"]
}

resource "aws_organizations_policy" "deny_regions" {
  name = "DenyNonAllowedRegions"
  type = "SERVICE_CONTROL_POLICY"
  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid     = "DenyOtherRegions"
      Effect  = "Deny"
      NotAction = ["iam:*", "organizations:*", "support:*"]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "aws:RequestedRegion" = var.allowed_regions
        }
      }
    }]
  })
}

resource "aws_organizations_policy_attachment" "to_workloads" {
  policy_id = aws_organizations_policy.deny_regions.id
  target_id = "ou-abcd-1234workloads"
}

output "scp_arn" {
  value = aws_organizations_policy.deny_regions.arn
}`,
        exampleAnnotations: [
          { token: 'provider "aws"', type: 'keyword', note: 'Terraform top-level block. The name after `provider` matches the provider (hashicorp/aws).' },
          { token: 'resource "aws_organizations_policy"', type: 'keyword', note: 'AWS provider resource type. Naming convention `aws_<service>_<thing>` is fixed by the provider.' },
          { token: 'resource "aws_organizations_policy_attachment"', type: 'keyword', note: 'AWS provider resource type — define + attach are two separate resources.' },
          { token: 'type = "SERVICE_CONTROL_POLICY"', type: 'keyword', note: 'AWS Organizations enum. Also: "TAG_POLICY", "BACKUP_POLICY", "AISERVICES_OPT_OUT_POLICY".' },
          { token: 'jsonencode({ ... })', type: 'keyword', note: 'Terraform built-in — turns an HCL map into a JSON string.' },
          { token: 'var.allowed_regions', type: 'keyword', note: 'Terraform variable reference. `var.<name>` is fixed; `<name>` matches your `variable` block.' },
          { token: 'aws_organizations_policy.deny_regions.id', type: 'keyword', note: 'Terraform reference: `<resource_type>.<local_name>.<attr>`.' },
          { token: '"deny_regions" / "to_workloads" / "allowed_regions"', type: 'user', note: 'Your local Terraform names — any valid identifier.' },
          { token: '"ou-abcd-1234workloads"', type: 'user', note: 'Your AWS Organizations OU ID — from the Organizations console.' },
          { token: '"DenyNonAllowedRegions" / "us-east-1" / "us-west-2"', type: 'user', note: 'Your choices — the policy name and the regions you allow.' },
        ],
        artifact: 'terraform-hcl',
      },
      {
        cloud: 'azure',
        service: 'Terraform on Azure (azurerm provider)',
        plain: `Same language, different provider. <code>azurerm</code> handles Azure resources;
                the governance staples are MGs, subscriptions, policy definitions, and
                assignments.`,
        detail: [
          '<b>Auth</b> — Azure CLI (dev), service principal (CI/CD), or managed identity (Azure-hosted runners).',
          '<b>azurerm_management_group_policy_assignment</b> — most common governance resource.',
          '<b>azurerm_policy_definition</b> + <b>azurerm_policy_set_definition</b> — custom policy + initiative.',
          '<b>State backend</b> — Azure Storage with blob lease for locking. <code>backend "azurerm"</code> block.',
          '<b>Modules to know</b> — <code>terraform-azurerm-caf-enterprise-scale</code>, <code>terraform-azurerm-lz-vending</code>.',
        ],
        example: `# Azure: assign MCSB at the Workloads MG
provider "azurerm" { features {} }

data "azurerm_policy_set_definition" "mcsb" {
  display_name = "Microsoft cloud security benchmark"
}

resource "azurerm_management_group_policy_assignment" "mcsb_at_workloads" {
  name                 = "mcsb-workloads"
  management_group_id  = "/providers/Microsoft.Management/managementGroups/workloads"
  policy_definition_id = data.azurerm_policy_set_definition.mcsb.id
  display_name         = "MCSB - Workloads"
  enforce              = true
}`,
        exampleAnnotations: [
          { token: 'provider "azurerm"', type: 'keyword', note: 'Terraform provider (hashicorp/azurerm). The empty `features {}` block is required.' },
          { token: 'data "azurerm_policy_set_definition"', type: 'keyword', note: 'Terraform `data` block — read-only lookup for a built-in or custom initiative.' },
          { token: 'resource "azurerm_management_group_policy_assignment"', type: 'keyword', note: 'azurerm resource type for assigning a policy/initiative at a Management Group.' },
          { token: 'policy_definition_id / management_group_id / display_name / enforce', type: 'keyword', note: 'Required/optional arguments on this resource type — names provider-defined.' },
          { token: '"Microsoft cloud security benchmark"', type: 'keyword', note: 'Exact display name of the built-in MCSB initiative — Terraform doesn\'t fuzzy-match.' },
          { token: '"/providers/Microsoft.Management/managementGroups/workloads"', type: 'keyword', note: 'Azure resource-ID for a Management Group — only the final segment is your MG name.' },
          { token: 'data.azurerm_policy_set_definition.mcsb.id', type: 'keyword', note: 'Terraform data-source reference: `data.<type>.<local_name>.<attr>`.' },
          { token: '"mcsb-workloads" / "MCSB - Workloads" / "mcsb" / "mcsb_at_workloads"', type: 'user', note: 'Your local names + display labels — any identifiers.' },
          { token: 'enforce = true', type: 'user', note: 'Your choice. `true` applies the effects; `false` is the audit-mode equivalent.' },
        ],
        artifact: 'terraform-hcl',
      },
      {
        cloud: 'tf',
        service: 'State & backends — where Terraform remembers what it did',
        plain: `<code>apply</code> writes a JSON state file mapping each config resource to its
                real cloud ID. State lives in a remote backend with versioning + locking. Lose
                it and Terraform thinks nothing exists.`,
        detail: [
          '<b>backend block</b> — declared once in the root module. Common: <code>s3</code> + DynamoDB lock (AWS), <code>azurerm</code> blob lease (Azure), TF Cloud.',
          '<b>State is sensitive</b> — can hold plaintext secrets from imported resources. Treat the backend as Tier-1; encrypt; restrict reads.',
          '<b>Locking</b> — backend takes a lock during <code>plan</code> + <code>apply</code>. Second engineer waits.',
          '<b><code>import {}</code> blocks (TF 1.5+)</b> — declarative import in HCL: <code>import { id = "...", to = aws_s3_bucket.legacy }</code>. Reviewable, no out-of-band CLI.',
          '<b><code>moved {}</code> blocks (TF 1.1+)</b> — rename/move a resource without destroy/recreate. Lives in version control.',
          '<b><code>terraform state rm/mv</code></b> — rare manual interventions. Always <code>terraform state pull</code> backup first.',
          '<b>Drift detection</b> — schedule <code>terraform plan -refresh-only</code> nightly. Diffs = someone clicked in the console.',
        ],
        example: `# Remote state, AWS (S3 + DynamoDB lock)
terraform {
  backend "s3" {
    bucket         = "company-tfstate-prod"
    key            = "platform/governance/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tfstate-locks"
    encrypt        = true
  }
}

# Bulk import — adopt an existing S3 bucket created via the console
import {
  id = "legacy-audit-logs-bucket-2018"
  to = aws_s3_bucket.audit_logs
}

resource "aws_s3_bucket" "audit_logs" {
  bucket = "legacy-audit-logs-bucket-2018"
  # ...
}

# Refactor — renamed module path without destroying the resource
moved {
  from = aws_iam_role.legacy_break_glass
  to   = module.break_glass.aws_iam_role.this
}`,
        exampleAnnotations: [
          { token: 'backend "s3"', type: 'keyword', note: 'Terraform backend type. Other common: "azurerm", "remote" (Terraform Cloud), "gcs", "http".' },
          { token: 'dynamodb_table', type: 'keyword', note: 's3 backend argument — names the DynamoDB table that holds the state lock row.' },
          { token: 'encrypt = true', type: 'keyword', note: 's3 backend argument — server-side encrypt the state object. Always true.' },
          { token: 'import { id = ... to = ... }', type: 'keyword', note: 'Terraform 1.5+ block — declarative import in code. Apply pulls the resource into state.' },
          { token: 'moved { from = ... to = ... }', type: 'keyword', note: 'Terraform 1.1+ block — rename / move a resource without destroy/recreate.' },
          { token: '"company-tfstate-prod" / "tfstate-locks"', type: 'user', note: 'Your S3 bucket + DynamoDB table names. Stable; rarely changed.' },
          { token: '"platform/governance/terraform.tfstate"', type: 'user', note: 'Your state key (path inside the bucket). One key per root module is the standard.' },
          { token: '"legacy-audit-logs-bucket-2018"', type: 'user', note: 'The real AWS resource ID (bucket name) you\'re adopting.' },
        ],
        artifact: 'terraform-hcl',
      },
      {
        cloud: 'tf',
        service: 'Modules — the unit of reuse',
        plain: `A module is a folder of .tf files, called like a function. You\'ll write a few
                and consume many. Two rules: <strong>pin every module to a version</strong>, and
                <strong>read the source before consuming</strong>.`,
        detail: [
          '<b>Source forms</b>:',
          '  • Local <code>source = "./foo"</code> — same repo. No version.',
          '  • Git <code>source = "git::https://...?ref=v1.4.2"</code> — pin to a tag, never a branch.',
          '  • Registry <code>source = "Azure/avm-res-storage-storageaccount/azurerm" version = "0.1.0"</code>.',
          '<b>Version pinning</b>: tags in prod, never <code>main</code>. <code>~> 1.4</code> = any 1.x ≥ 1.4 but &lt; 2.0. Audit findings cluster on "ref = main."',
          '<b>Inputs / outputs / locals</b>: <code>variable</code> = inputs, <code>output</code> = exposed, <code>locals</code> = internal. Mark <code>sensitive = true</code> to redact in plan.',
          '<b>Composition</b>: keep depth ≤ 3. Deeper trees are hard to debug.',
          '<b><code>for_each</code> over a module</b>: fan out by map. Prefer over <code>count</code> — removing a mid-list entry with <code>count</code> taints everything after.',
          '<b>Registry modules</b>: AWS — AFT, terraform-aws-modules/*. Azure — AVM (Azure Verified Modules), caf-enterprise-scale, lz-vending.',
        ],
        example: `# Fanning out a "storage-account" module over a map of environments
module "audit_storage" {
  source  = "Azure/avm-res-storage-storageaccount/azurerm"
  version = "0.1.0"

  for_each = {
    prod    = { sku = "Standard_GRS",  location = "eastus"  }
    nonprod = { sku = "Standard_LRS",  location = "westus2" }
  }

  name                = "auditlogs\${each.key}001"
  resource_group_name = var.audit_rg_name
  location            = each.value.location
  sku_name            = each.value.sku

  public_network_access_enabled = false  # corp baseline
}

# Outputs that downstream modules consume
output "audit_storage_ids" {
  value = { for k, v in module.audit_storage : k => v.resource_id }
}`,
        exampleAnnotations: [
          { token: 'source = "Azure/avm-res-storage-storageaccount/azurerm"', type: 'keyword', note: 'Registry-form module source — Azure-org + module-name + provider. Microsoft\'s Azure Verified Modules namespace.' },
          { token: 'version = "0.1.0"', type: 'keyword', note: 'Registry module version pin. ALWAYS pin in prod; never omit version on a registry module.' },
          { token: 'for_each = { ... }', type: 'keyword', note: 'Terraform meta-argument — fans the module out over the map. Each key becomes a separate instance.' },
          { token: 'each.key / each.value', type: 'keyword', note: 'Terraform iteration helpers — the current map key + the current map value.' },
          { token: 'module.audit_storage', type: 'keyword', note: 'Terraform reference to all instances of the module (a map keyed by each.key).' },
          { token: '"prod" / "nonprod"', type: 'user', note: 'Your environment keys — any identifiers.' },
          { token: '"auditlogs${each.key}001"', type: 'user', note: 'Your storage account name pattern — must be globally unique on Azure.' },
        ],
        artifact: 'terraform-hcl',
      },
      {
        cloud: 'tf',
        service: 'Workflow / CI — how Terraform actually runs in production',
        plain: `In production a bot owns <code>apply</code>; humans only open PRs. CI loop:
                <code>fmt -check → validate → plan → human review → apply on merge</code>.
                Auth via <strong>OIDC federation</strong>, never long-lived secrets.`,
        detail: [
          '<b>CI loop, in order</b>:',
          '  1 · <code>terraform init</code> — fetches providers + modules + backend.',
          '  2 · <code>fmt -check</code> — fails PR on bad formatting.',
          '  3 · <code>validate</code> — syntax + type check.',
          '  4 · <code>plan -out=plan.tfplan</code> — saves plan as artifact.',
          '  5 · <strong>human review of plan diff</strong> — required for prod.',
          '  6 · on merge: <code>apply plan.tfplan</code> — exact reviewed plan, no surprises.',
          '<b>OIDC federation</b> — CI gets a short-lived ID token; cloud trusts it via identity provider; workflow gets temporary creds. No long-lived <code>AWS_ACCESS_KEY_ID</code>. The 2026 default.',
          '  • AWS: <code>aws-actions/configure-aws-credentials@v4</code> with <code>role-to-assume</code>.',
          '  • Azure: federated SP credentials via <code>az login --service-principal --federated-token</code>.',
          '<b>Multi-env</b>: prefer <strong>root-module-per-env</strong> over workspaces — clearer audit trail, no typo risk.',
          '<b>Drift detection</b> — nightly <code>plan -refresh-only</code> against prod. Diff → page on-call.',
          '<b>Platforms</b>: Atlantis, TF Cloud / HCP Terraform, Spacelift, Env0 — all do PR-driven plan-then-apply with state hosting.',
        ],
        example: `# .github/workflows/terraform.yml — minimal compliance-grade pipeline
name: terraform

on:
  pull_request:
    paths: ['platform/governance/**']
  push:
    branches: [main]
    paths: ['platform/governance/**']

permissions:
  id-token: write   # OIDC — required to mint the ID token
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111122223333:role/terraform-ci
          aws-region: us-east-1
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.5
      - run: terraform init
      - run: terraform fmt -check
      - run: terraform validate
      - run: terraform plan -out=plan.tfplan
      - uses: actions/upload-artifact@v4
        if: github.event_name == 'pull_request'
        with: { name: tfplan, path: plan.tfplan }

  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111122223333:role/terraform-ci
          aws-region: us-east-1
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform apply -auto-approve`,
        exampleAnnotations: [
          { token: 'permissions: id-token: write', type: 'keyword', note: 'GitHub Actions permission — required to obtain the OIDC ID token. Without it, configure-aws-credentials fails.' },
          { token: 'aws-actions/configure-aws-credentials@v4', type: 'keyword', note: 'GitHub Action — exchanges the GitHub OIDC token for short-lived AWS STS credentials.' },
          { token: 'role-to-assume', type: 'keyword', note: 'IAM role ARN in the target AWS account. The role\'s trust policy must trust the GitHub OIDC provider.' },
          { token: 'hashicorp/setup-terraform@v3', type: 'keyword', note: 'GitHub Action — installs the named Terraform version on the runner.' },
          { token: 'terraform fmt -check / validate / plan / apply', type: 'keyword', note: 'Terraform CLI subcommands — the standard CI loop.' },
          { token: '"arn:aws:iam::111122223333:role/terraform-ci"', type: 'user', note: 'Your CI role ARN — pre-created with a trust policy bound to your GitHub repo + branch.' },
          { token: '"1.7.5"', type: 'user', note: 'Your Terraform version — pin it; never use "latest" in CI.' },
          { token: '"platform/governance/**"', type: 'user', note: 'Your path filter — limits which file changes trigger this workflow.' },
        ],
        artifact: 'terraform-hcl',
      },
    ],
    diagram: `Lifecycle:

  edit .tf file
       │
       ▼
   terraform init    ← downloads providers, sets up backend
       │
       ▼
   terraform plan    ← reads remote state, computes diff, shows you
       │
       ▼
   terraform apply   ← executes the diff, updates remote state
       │
       └─ on a regular cadence: detect drift via "plan -refresh-only"`,
    fieldNotes: [
      '<code>plan</code> reads state from the backend; stale state means lying plans. Run <code>plan -refresh-only</code> when you suspect drift.',
      'State files can hold <b>secrets</b> after <code>import</code> of sensitive resources. Treat state as secret; encrypt the backend; restrict access.',
      'Modules must pin to versions: <code>?ref=v1.4.2</code>. Never <code>main</code> in production — upstream moves change apply behavior.',
      '<b><code>for_each</code> vs <code>count</code></b>: <code>count</code> taints everything after a mid-list removal. Prefer <code>for_each</code>; <code>count</code> only for "0 or 1" toggles.',
      'CI auth: <b>OIDC federation</b> beats long-lived secrets. The 2026 default for any new pipeline.',
      '<b>Lock state during apply</b>: <code>-lock-timeout=10m</code>. Backend (S3+DynamoDB or Azure blob lease) must enforce.',
      '<b>Resource Graph + import blocks</b>: query inventory in KQL, generate <code>import</code> blocks, one PR. Modern adoption path.',
      'For Azure Policy in Terraform, prefer <b>initiative assignment</b> over per-policy. Fewer state objects, faster plan, easier rollback.',
      '<b>State recovery</b>: restore from backend versioning (S3 object versions, Azure blob versions) in minutes. Ensure versioning is on.',
      '<b>The compliance value</b>: every guardrail change is a PR with diff, approver, apply log. Don\'t click-ops Azure Policy in prod.',
      '<b><code>import {}</code> blocks (TF 1.5+)</b> made bulk-import routine — generate one block per legacy resource, one PR, one apply.',
      '<b><code>terraform_remote_state</code></b> creates invisible coupling. Prefer published module outputs or a data source that queries the cloud.',
      '<b><code>lifecycle { prevent_destroy = true }</code></b> on compliance-critical resources (audit buckets, KMS keys). Cheap; auditors like it.',
      '<b><code>sensitive = true</code></b> on vars/outputs redacts them in plan/apply output. Still in state, but CI logs stay clean.',
    ],
    handsOn: {
      intro: 'Six reading exercises on the Terraform examples above. The skill is reading config that someone else wrote.',
      steps: [
        {
          label: 'Q1',
          question: `Here is the AWS Terraform snippet from the panel above (repeated so you don't scroll):
<pre><code>resource "aws_organizations_policy" "deny_regions" {
  name = "deny-other-regions"
  type = "SERVICE_CONTROL_POLICY"
  content = jsonencode({ /* SCP JSON */ })
}

resource "aws_organizations_policy_attachment" "to_workloads" {
  policy_id = aws_organizations_policy.deny_regions.id
  target_id = "ou-abcd-1234workloads"
}</code></pre>
<strong>(a) Where is the SCP <em>attached</em>?</strong><br>
<strong>(b) If you DELETE the <code>aws_organizations_policy_attachment "to_workloads"</code> block from the .tf file and re-run <code>terraform apply</code>, what does Terraform do? What is the real-world effect on accounts under Workloads OU?</strong>`,
          hint: 'Look for the resource whose name ends in <code>_attachment</code>. Terraform reconciles config to state — a deleted resource means destroy.',
          answer: `<ul>
<li><strong>Attached at:</strong> the <strong>Workloads OU</strong> (<code>target_id = "ou-abcd-1234workloads"</code>). Note that <code>aws_organizations_policy</code> only <em>defines</em> the policy object; the separate <code>aws_organizations_policy_attachment</code> resource is what actually binds it to a target. Define + attach are two distinct operations in AWS Organizations.</li>
<li><strong>If you delete the attachment and re-apply:</strong> <code>terraform plan</code> shows <code># aws_organizations_policy_attachment.to_workloads will be destroyed</code>. After <code>apply</code>, the policy object still exists in AWS Organizations — but <strong>nothing is attached to it</strong>, so the deny no longer flows down to any account. The Workloads OU loses the region restriction immediately.</li>
</ul>
<p>This is the classic "policy exists but isn't attached" trap. When reviewing PRs, always check that a new <code>aws_organizations_policy</code> ships with a matching <code>_attachment</code> in the same module.</p>`,
        },
        {
          label: 'Q2',
          question: `Here is the Azure Terraform snippet from the panel above (repeated):
<pre><code>data "azurerm_policy_set_definition" "mcsb" {
  display_name = "Microsoft cloud security benchmark"
}

resource "azurerm_management_group_policy_assignment" "mcsb_at_workloads" {
  name                 = "mcsb-workloads"
  management_group_id  = "/providers/Microsoft.Management/managementGroups/workloads"
  policy_definition_id = data.azurerm_policy_set_definition.mcsb.id
  display_name         = "MCSB - Workloads"
  enforce              = true
}</code></pre>
<strong>What is the difference between <code>data "azurerm_policy_set_definition"</code> and <code>resource "azurerm_policy_set_definition"</code>? When would you use each? Why does the example use <code>data</code> for MCSB?</strong>`,
          hint: '<code>data</code> looks something up. <code>resource</code> creates / manages something. MCSB is a built-in Microsoft-managed initiative — Terraform doesn\'t create it.',
          answer: `<ul>
<li><strong><code>data</code> block</strong> — a read-only <em>lookup</em>. Terraform asks the provider for an existing object and returns its attributes (e.g., <code>.id</code>). The example uses <code>data "azurerm_policy_set_definition" "mcsb"</code> because MCSB is a built-in Microsoft-managed initiative — Terraform must NOT try to create it; it just needs the ID to make the assignment.</li>
<li><strong><code>resource</code> block</strong> — a <em>managed</em> object. Terraform creates it, updates it on change, destroys it on removal. <code>resource "azurerm_policy_set_definition" "corp_security"</code> is how you would define a custom company initiative.</li>
<li><strong>Use <code>data</code> when</strong> the object already exists and you only need its ID/attributes — built-ins, things owned by another team, things created out-of-band.</li>
<li><strong>Use <code>resource</code> when</strong> you want Terraform to own the lifecycle (create, update, destroy).</li>
</ul>`,
        },
        {
          label: 'Q3',
          question: `Given this <code>backend "s3"</code> block:
<pre><code>terraform {
  backend "s3" {
    bucket         = "company-tfstate-prod"
    key            = "platform/governance/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tfstate-locks"
  }
}</code></pre>
Engineer A starts <code>terraform apply</code>. Two minutes later, while it is still running, engineer B starts <code>terraform apply</code> against the same root module. <strong>What does B see, and why? What would happen without the <code>dynamodb_table</code> line?</strong>`,
          hint: 'The s3 backend uses DynamoDB to hold a per-state lock row. Without it, there is no locking.',
          answer: `<p><strong>With <code>dynamodb_table</code> set</strong>: engineer B\'s <code>apply</code> stalls on <em>"Acquiring state lock. This may take a few moments..."</em> and eventually fails with a clear error naming engineer A as the lock holder (CI host + PID + start time). B knows to wait or to break the lock manually if A\'s process actually crashed. State stays consistent.</p>
<p><strong>Without <code>dynamodb_table</code></strong>: no lock. Both applies race to read state, mutate cloud, and write state. Whichever finishes second overwrites the first\'s state file — Terraform now believes resources exist that don\'t, or doesn\'t know about resources that do. The cleanup is hours of manual reconciliation with <code>terraform import</code> and <code>state rm</code>. <strong>The <code>dynamodb_table</code> line is not optional in production — verify your backend has it before letting CI auto-apply.</strong></p>`,
        },
        {
          label: 'Q4',
          question: `In a PR you find this module call:
<pre><code>module "audit_storage" {
  source = "git::https://github.com/our-org/tf-storage.git?ref=main"

  name                = "auditlogs001"
  resource_group_name = var.audit_rg
}</code></pre>
<strong>What\'s the single biggest reason a compliance reviewer should reject this PR? What\'s the one-line fix?</strong>`,
          hint: 'ref=main means "whatever main is right now." That value moves under your feet between plan and apply.',
          answer: `<p><strong>Problem</strong>: <code>ref = "main"</code> means "fetch whatever <code>main</code> is at the moment <code>terraform init</code> runs." Between today\'s plan review and tomorrow\'s apply, someone could merge a breaking change to <code>tf-storage</code>\'s main — and your supposedly-reviewed apply now runs different code than what you reviewed. The plan-diff audit trail becomes meaningless.</p>
<p><strong>Fix</strong>: pin to an immutable tag. One-line change:</p>
<pre><code>source = "git::https://github.com/our-org/tf-storage.git?ref=v1.4.2"</code></pre>
<p>Tags are immutable; <code>v1.4.2</code> always points at the same commit. The plan you reviewed is the plan you apply. Upgrades happen in a new PR that bumps <code>ref</code> to <code>v1.5.0</code> — explicit, reviewable.</p>
<p><em>Worse variants to watch for in PRs</em>: <code>?ref=feature/whatever</code> (a branch in development), no <code>?ref</code> at all (= main), or local <code>source = "../tf-storage"</code> in a shared repo (the file may not even exist on the CI runner).</p>`,
        },
        {
          label: 'Q5',
          question: `You\'re reviewing a refactor PR that renames an IAM role module path. The PR adds these blocks:
<pre><code>moved {
  from = aws_iam_role.legacy_break_glass
  to   = module.break_glass.aws_iam_role.this
}

module "break_glass" {
  source = "./modules/break-glass"
  # ...
}</code></pre>
<strong>(a) What does the <code>moved</code> block tell Terraform? (b) Why doesn\'t this PR cause the IAM role to be destroyed and recreated? (c) What would happen if the author forgot the <code>moved</code> block?</strong>`,
          hint: 'Terraform tracks resources by their address in code. A renamed address looks like "old resource removed, new resource added" unless you tell it otherwise.',
          answer: `<ul>
<li><strong>(a)</strong> The <code>moved</code> block tells Terraform: "the resource that used to be addressed as <code>aws_iam_role.legacy_break_glass</code> is now addressed as <code>module.break_glass.aws_iam_role.this</code>." Same real cloud resource; different code address. Terraform updates its state mapping, doesn\'t touch the real IAM role.</li>
<li><strong>(b)</strong> Because of the rename mapping. State now ties the real IAM role to the new address before the diff is computed; the diff sees "no change" and the apply is a no-op for that resource.</li>
<li><strong>(c) Without the <code>moved</code> block</strong>: Terraform sees <code>aws_iam_role.legacy_break_glass</code> in state but not in code, and <code>module.break_glass.aws_iam_role.this</code> in code but not in state. The plan says <em>"destroy old role, create new role."</em> Apply runs both. The new role has a new ARN; anything trusting the old ARN (cross-account policies, IAM role chaining) breaks until updated. <code>moved</code> blocks are <strong>the safe refactor primitive</strong>; without them, every code reorganization risks a real-resource destroy/recreate.</li>
</ul>`,
        },
        {
          label: 'Q6',
          question: `Two CI snippets target the same AWS account:
<pre><code># Snippet A — long-lived key in GitHub Secrets
- run: terraform apply
  env:
    AWS_ACCESS_KEY_ID:     \${{ secrets.AWS_KEY }}
    AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET }}

# Snippet B — OIDC federation
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::111122223333:role/terraform-ci
    aws-region: us-east-1
- run: terraform apply</code></pre>
<strong>Why is Snippet B safer? Name three concrete advantages a compliance reviewer cares about.</strong>`,
          hint: 'Credential lifetime, rotation burden, blast radius if leaked, principal identity in CloudTrail.',
          answer: `<ol>
<li><strong>Credential lifetime is minutes, not months.</strong> Snippet B mints STS credentials that expire in ≤1 hour. Snippet A holds a long-lived access key — until someone manually rotates it (usually never). If a runner is compromised, B\'s creds expire before the attacker can chain them; A\'s keep working until detection.</li>
<li><strong>No secrets to leak from GitHub.</strong> Snippet A stores the key in <code>secrets.AWS_KEY</code>. Anyone with repo admin can read it; a misconfigured workflow can <code>echo</code> it. Snippet B has no secret to leak — the IAM role\'s trust policy is the gate, and it lives in AWS, not GitHub.</li>
<li><strong>Auditable principal identity.</strong> CloudTrail on Snippet B shows the role <code>terraform-ci</code> + a session name like <code>GitHubActions-<repo>-<run-id></code>. You can trace every API call back to a specific GitHub workflow run. Snippet A shows the static IAM user — no run-level attribution.</li>
</ol>
<p>Bonus reviewer flag: with Snippet A, you have to remember to rotate the key on a schedule; with Snippet B, rotation is automatic on every run. <strong>The 2026 default for any new Terraform CI: OIDC.</strong></p>`,
        },
      ],
      selfCheck: [
        'I can name the four core Terraform building blocks: provider, resource, variable, output.',
        'I know plan shows the diff; apply executes it; state records reality.',
        'I know data is a read-only lookup and resource is owned by Terraform.',
        'I would never edit state by hand; the remote backend handles locking.',
        'I read Terraform 10× more often than I write it from scratch.',
        'I can explain why state files are sensitive — they hold plaintext outputs and resource IDs that map to real cloud objects.',
        'I know what <code>terraform import</code> does, and prefer the declarative <code>import {}</code> block over the CLI command for anything reviewable.',
      ],
    },
    takeaways: [
      { point: 'Four building blocks: provider, resource, variable, output. Plus modules and state.', sayItOutLoud: '"Our governance is in Terraform — SCPs, Azure Policy, MG hierarchy. Console changes are drift."' },
      { point: 'plan shows the diff before apply; apply executes it; state records reality.', sayItOutLoud: '"plan output is the source of truth for what\'s about to change — I review it before apply."' },
      { point: 'Drift = console clicks. Detect via <code>plan -refresh-only</code>; fix by re-applying or importing.' },
      { point: 'State lives in a versioned + locked backend. Never edit by hand.', sayItOutLoud: '"State is in a remote backend with locking — we never edit it by hand."' },
      { point: 'Pin every module to a tag. <code>import {}</code> + <code>moved {}</code> are the safe primitives for adoption and refactor.' },
      { point: 'You\'ll READ Terraform 10× more than you write it.', sayItOutLoud: '"Most of our day is reading existing modules and opening PRs, not greenfield Terraform."' },
    ],
  },

];

// Lookup helpers
export function foundationById(id) {
  return FOUNDATIONS.find(f => f.id === id) || null;
}

// Group helpers — used by the sidebar to render sub-headers.
export function foundationGroups() {
  const groups = [];
  const seen = new Set();
  for (const f of FOUNDATIONS) {
    if (!seen.has(f.group)) { seen.add(f.group); groups.push(f.group); }
  }
  return groups;
}
