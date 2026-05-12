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
    intro: {
      plain: `Big companies have hundreds or thousands of cloud accounts. You can't
              govern them one at a time. So both AWS and Azure let you build a TREE:
              the company at the top, departments in the middle, individual accounts
              or subscriptions at the leaves. A rule set on a branch flows down to
              everything underneath. That's the whole game — pick the right branch,
              attach the right rule, and a thousand accounts comply at once.`,
      mnemonic: 'Tree top = company. Branches = teams. Leaves = accounts/subs. Rules flow DOWN.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Organizations + Organizational Units (OUs)',
        plain: `AWS Organizations is the tree. The root is your company's master
                account ("management account"). Below it you make folders called
                Organizational Units (OUs) — typically one per environment or
                business unit. AWS accounts (the actual workload containers)
                live inside OUs. Move an account from one OU to another and it
                inherits a different set of rules instantly.`,
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
        plain: `Azure does the same thing with different words. Subscriptions are
                Azure's account equivalent (workload + billing container). Above
                subscriptions sit Management Groups — folders for organizing
                them. Above all of that is the Tenant Root group, the company-wide
                top of the tree. Policies attached at a Management Group flow
                down to every subscription beneath it.`,
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
          <p>Every action runs through one checkpoint per node on its path from the root down to its
          account. <strong>Any single checkpoint can deny. None can override another's deny.</strong>
          That's the whole inheritance model.</p>
        </section>

        <section class="cd-section">
          <h3 class="cd-h"><span class="cd-h-tag">Worked example 1</span>Stacking is intersection, not union</h3>
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
          <p>Notice: <strong>both</strong> denies apply at <code>prod-001</code>, even though they sit at
          different levels. The deeper account experiences the <strong>intersection</strong> of every
          ancestor's restrictions. Add a third SCP at the account level and a fourth would stack on top.</p>
        </section>

        <section class="cd-section">
          <h3 class="cd-h"><span class="cd-h-tag">Worked example 2</span>The "more specific wins" trap</h3>
          <p>A junior engineer reads SCP A and thinks: <em>"I'll just attach an SCP at <code>prod-001</code>
          that explicitly allows <code>s3:DeleteBucket</code> — the more specific rule wins."</em>
          Then they're surprised when the action still fails.</p>
          <p>Here's why. SCPs are <strong>restrictions</strong>, not grants. An "allow" SCP doesn't
          <em>grant</em> permission; at best it <em>refrains from denying</em>. The Workloads OU's
          deny is still on the path. Both checkpoints fire. Workloads OU says no. <strong>End of
          story</strong> — IAM never even gets a vote.</p>
          <aside class="cd-callout">
            <strong class="cd-callout-tag">⚠ Common trap — worth tattooing</strong>
            <p>"Most specific rule wins" works in CSS, IAM permissions, file ACLs.
            <strong>It does NOT work in SCPs or Azure Policy.</strong> Restrictions <em>stack</em>; they
            do not override. A child can only <em>add</em> denies, never remove a parent's.</p>
          </aside>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">So what is "blast radius"?</h3>
          <p>It's the answer to: <em>"Which accounts does this checkpoint cover?"</em></p>
          <ul>
            <li>Attach at <strong>Root</strong> → covers every account in the org. Biggest blast radius. Use for things that must be true everywhere (deny disabling CloudTrail, deny IAM users).</li>
            <li>Attach at an <strong>OU/MG</strong> → covers everything in that sub-tree only. Medium. Use for environment-specific rules (Prod stricter than Dev).</li>
            <li>Attach at a <strong>single account/sub</strong> → covers just that one. Tiny. Use sparingly — usually a smell that the rule belongs higher.</li>
          </ul>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Reviewer's question for any new guardrail PR</h3>
          <p>"What is the blast radius, and is that the smallest scope that still works?"
          Smaller blast radius = fewer surprise breakages, but also more places you might
          forget to attach it.</p>
        </section>`,
    },
    fieldNotes: [
      'The Tenant Root management group is <b>invisible by default</b>. Turn it on once: <i>Entra ID → Properties → Access management for Azure resources → "Yes"</i>. Without it, policies at "the top" silently apply only at sub level.',
      'AWS allows OUs to nest 5 deep. Azure allows MG nesting 6 deep. <b>Two levels is plenty.</b> Deep trees are auditor-hostile and Terraform-hostile — every level is another inheritance trap.',
      'Moving an account between OUs (or a sub between MGs) takes ~60s. SCPs and policies switch in real time. <b>Useful for incident response</b> — pull a compromised account into an isolated OU with deny-all SCPs.',
      '<b>Sandbox should explicitly deny network egress</b> + expensive SKUs (GPU VMs, p4d EC2, etc.). Otherwise sandbox cost <i>becomes</i> production cost — the #1 unexpected line item on month-end.',
      'Never run workloads in the AWS management account or Azure Tenant Root. Delegate <b>Defender for Cloud / Config / Security Hub / GuardDuty</b> administration out to a dedicated Security subscription/account. Auditors expect this separation.',
      'OU/MG <b>renames cascade</b> in the portal — but cached names in Terraform state, Runbooks, and KQL queries silently drift. Treat the canonical ID (not the name) as the contract.',
      'Cross-cloud parallel that matters: AWS Organizations has <b>one</b> management account; Entra ID has <b>one</b> tenant per organization. Subscriptions are cheap (free to make); AWS accounts cost slightly (CloudTrail, Config defaults).',
      'Don\'t put audit / log-archive accounts in NonProd OUs. Auditors flag this as a chain-of-custody concern — security tooling should sit in its own OU/MG, not be siblings of workloads.',
      '"<b>Blast radius</b>" is the word managers and auditors use for "which leaves does this checkpoint cover." Learn it; use it when proposing where to attach a guardrail.',
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
    recap: [
      'Both clouds use a tree: Company → folders → accounts/subs.',
      'AWS calls the folders OUs and lives inside AWS Organizations. Azure calls them Management Groups.',
      'Rules attached high in the tree flow DOWN. Rules at a leaf apply only to that leaf.',
      'Every rule on the path stacks. A child cannot loosen a parent — it can only add another checkpoint. The strictest experienced outcome is the union.',
      'You will work the tree daily — every other concept (SCPs, Azure Policy, Control Tower, Defender) hangs off it.',
    ],
    talkingPoints: [
      `"Our governance is hierarchical — Org → OU → account on AWS, Tenant Root → MG → subscription on Azure."`,
      `"To roll a guardrail out broadly we attach it high; to scope it narrowly we attach it low."`,
      `"Inheritance is additive — a subscription cannot weaken a policy inherited from above."`,
      `"New accounts/subs get vended into a specific OU/MG so the right baseline applies on day one."`,
      `"If something is missing a control, first question is: what OU/MG is it in?"`,
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
    intro: {
      plain: `SCPs are rules that say "you literally cannot do X here," attached
              to an OU or account. Even an admin can't bypass them. They live
              above ordinary IAM permissions. They do NOT grant permissions —
              they only cap what's possible. Pair them with IAM: SCP asks
              "is it allowed in this account at all?"; IAM asks "is this person
              allowed?". Both must say yes; either can deny.`,
      mnemonic: 'SCP = "Stop, Can\'t Proceed." Two effects only: Allow and Deny.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Service Control Policies (SCPs)',
        plain: `Imagine a franchise restaurant chain. Head office sends every
                location a list of things that are NEVER allowed — no matter what
                the local manager says. SCPs are that list, attached to OUs or
                accounts. They cap what's possible. Even an account-level admin
                cannot do something an SCP denies. SCPs do NOT grant permissions
                — they only set the maximum.`,
        detail: [
          '<b>Two effects only:</b> <code>Allow</code> and <code>Deny</code>. Most real SCPs use <code>Deny</code> with <code>NotAction</code> for allowlists.',
          '<b>Attach points:</b> Root, OU, or member account. <b>Cannot</b> attach to the management account itself.',
          '<b>Evaluation:</b> An action is allowed only if (every SCP on the path allows it) AND (IAM allows it). If the SCP path denies, IAM can\'t override.',
          '<b>SCP vs IAM Policy</b> — <i>this is the question your lead will ask you.</i> Think of them as <em>two parallel checkpoint lines</em> at the same point. SCP asks "is this allowed in this account at all?" IAM asks "is this person allowed to do it?" Both lines must wave the action through; either can deny. SCPs cap what\'s possible — they grant nothing.',
          '<b>Common patterns:</b> deny region restrictions, deny "leave organization", deny CloudTrail off, deny root-user actions, deny IAM-user creation.',
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
          { token: '"Version": "2012-10-17"', type: 'keyword', note: 'AWS policy-language version. There is only one valid value — this exact date string. Docs: IAM JSON policy reference → "Version".' },
          { token: '"Effect": "Deny"', type: 'keyword', note: 'AWS keyword. Only two valid values: "Allow" or "Deny". For SCPs, "Deny" is the common pattern.' },
          { token: '"NotAction"', type: 'keyword', note: 'AWS condition-style key meaning "apply this Effect to everything EXCEPT these actions." Pairs with "Action" elsewhere. Docs: IAM policy elements reference.' },
          { token: '"iam:*", "organizations:*", "support:*"', type: 'keyword', note: 'AWS service-action patterns. Format is "<service-prefix>:<action>" with * as a wildcard. Full action list per service: docs.aws.amazon.com/service-authorization (Actions tables).' },
          { token: '"aws:RequestedRegion"', type: 'keyword', note: 'AWS global condition key — the region of the API call being evaluated. Lookup: service-authorization → "AWS global condition context keys".' },
          { token: '"us-east-1", "us-west-2"', type: 'user', note: 'Your choice — the AWS region codes you want to allow. Region codes are AWS-defined (find them at docs.aws.amazon.com/general → Regions); which ones you allow is your call.' },
          { token: '"Sid": "DenyOtherRegions"', type: 'user', note: 'Optional statement id — your label, any string you want (helpful in logs). AWS doesn\'t care what it says.' },
        ],
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
          <p>Same checkpoint model as the org tree, with one twist. The org tree stacked checkpoints
          <em>vertically</em> down Root → OU → account. Today's twist: at the account itself, the
          action has to clear <strong>two parallel checkpoint lines</strong> before it runs.</p>
          <ul>
            <li><strong>The SCP line</strong> — the checkpoints inherited down the OU tree. "Is this action even
            allowed in this account?" These are guardrails; they grant nothing.</li>
            <li><strong>The IAM line</strong> — the user/role's own policies. "Is <em>this person</em> allowed
            to do this thing?" These grant specific permissions.</li>
          </ul>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Both lines must say "yes". Either can say "no"</h3>
          <p>An IAM policy granting <code>ec2:*</code> cannot un-deny an SCP block, and an SCP allowing
          everything doesn't grant anything to a user who has no IAM permission. The picture is the
          same as the org tree — stacked gates, none can override another — just applied at a
          different layer.</p>
          <aside class="cd-callout">
            <strong class="cd-callout-tag">⚑ Tattoo this</strong>
            <p>When a call fails with <code>AccessDenied</code>, ask "which checkpoint blocked it?"
            The error annotation tells you: an explicit deny in an SCP, an implicit deny because no
            IAM policy granted it, or a Resource policy that doesn't trust the caller.</p>
          </aside>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Same picture on Azure</h3>
          <p>Azure Policy at the MG/sub level is the inherited checkpoint line; Azure RBAC is the
          per-principal line. Both must clear.</p>
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
    recap: [
      'SCPs cap what an AWS account can ever do; they don\'t grant anything.',
      'IAM grants. SCP limits. Both must allow; either can deny.',
      'SCPs evaluate before IAM. If the SCP denies, IAM never gets a vote.',
      'Two effects only: Allow and Deny. Most real SCPs use Deny + NotAction for allowlists.',
      'Attach at root for org-wide; attach at OU for environment-specific; attach at an account is usually a smell.',
    ],
    talkingPoints: [
      `"SCPs are deny-only guardrails on AWS — they cap what's possible regardless of IAM."`,
      `"SCPs evaluate before IAM. Explicit deny in an SCP wins, full stop."`,
      `"For a new control I attach at the broadest scope that's still correct — usually org root."`,
      `"SCPs don't apply to service-linked roles or the management account — known gaps."`,
      `"If a deploy fails with 'AccessDenied because of an explicit deny in an SCP,' the guardrail did its job."`,
    ],
  },

  {
    id: 'aws-config',
    group: 'AWS Governance',
    order: 2,
    title: 'AWS Config & Config Rules',
    subtitle: 'Detective controls — watch for what slipped past the SCP guardrails',
    cloud: 'aws',
    intro: {
      plain: `SCPs BLOCK bad things at the gate. AWS Config WATCHES for bad
              things — the stuff created before the SCP existed, the stuff a
              service-linked role made on its own, the stuff that drifted. Config
              records every resource change; Config Rules score those changes
              against criteria and flag failures. Pair them with SCPs: prevention
              first, detection second.`,
      mnemonic: 'SCP = guardrail (blocks). Config Rule = sensor (flags). Both layers are needed.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Config + Config Rules',
        plain: `AWS Config records the configuration of every resource in your
                account, every time it changes. Config Rules are checks that
                run against those records — "is this S3 bucket public?", "does
                this EBS volume have encryption?". Each rule produces a
                COMPLIANT or NON_COMPLIANT verdict. Rules can be MANAGED
                (AWS-provided) or CUSTOM (your own Lambda function or Guard
                rule).`,
        detail: [
          '<b>Config recorder</b> — the agent that captures resource state. Without it, no rules can run. Enable it everywhere.',
          '<b>Managed rules</b> — ~250 AWS-provided rules (e.g., <code>s3-bucket-public-access-prohibited</code>, <code>ec2-volume-inuse-check</code>). Pick from a list, set parameters, attach.',
          '<b>Custom rules</b> — write a Lambda function that returns <code>COMPLIANT</code> or <code>NON_COMPLIANT</code> per resource. Or use AWS Config Rules with Guard (a YAML-ish DSL) for declarative checks.',
          '<b>Triggers:</b> configuration-change (runs when the resource changes) or periodic (runs on a schedule). Pick based on the rule semantics.',
          '<b>Aggregator</b> — collects compliance results across multiple accounts/regions into one place. Essential for org-wide visibility.',
          '<b>Remediation</b> — Config can auto-trigger an SSM document to fix a non-compliant resource. Pair carefully with change windows.',
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
          { token: 'exports.handler', type: 'keyword', note: 'AWS Lambda contract — the function name AWS will invoke. Lambda expects this exact export shape for Node.js handlers. Docs: docs.aws.amazon.com/lambda → Handler.' },
          { token: 'event.invokingEvent', type: 'keyword', note: 'AWS Config sends this field on every rule invocation. Docs: AWS Config Developer Guide → "Event schema for custom rules".' },
          { token: 'configurationItem', type: 'keyword', note: 'AWS Config schema — the JSON blob describing the resource being evaluated. Same shape across every resource type.' },
          { token: '"COMPLIANT" | "NON_COMPLIANT"', type: 'keyword', note: 'AWS Config returns one of three strings: "COMPLIANT", "NON_COMPLIANT", or "NOT_APPLICABLE". Anything else and Config rejects the evaluation.' },
          { token: '"Owner"', type: 'user', note: 'Your choice — the tag key your org standard requires. Tag-key naming is your governance decision.' },
          { token: '"Has Owner tag" / "Missing Owner tag"', type: 'user', note: 'Your annotation string — surfaces in the AWS Config console for on-call. Free-form text; make it actionable.' },
        ],
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
      '<b>AWS Config is the #1 surprise cloud bill.</b> Recorder + rules org-wide can easily run several $$$/month. Estimate cost <i>before</i> enabling org-wide — change-triggered rules on high-churn resources (EC2 instances, ENIs) multiply fast.',
      '<b>Config Aggregator lag</b>: results in the aggregator trail the source account by minutes to hours. Auditor asks "is this fixed?" — don\'t trust the aggregator instantly. Verify against the source.',
      'Change-triggered Config rules ≈ near real-time. Periodic rules have a <b>24h max interval</b>. Pick based on the rule\'s urgency, not on Lambda cost (the cost difference is usually negligible).',
      'Custom Lambda Config rules need <code>config.amazonaws.com</code> permission to invoke them — easy gap. If your custom rule "doesn\'t evaluate," check the Lambda resource policy first.',
      '<b>AWS Config Guard DSL</b> is declarative. Great for "must have tag X" rules without writing Lambda. Faster to author, faster to review.',
      'Auto-remediation via SSM document: only enable after a week of <b>"annotate but don\'t fix"</b>. Humans need lead time to fix bad data before the bot starts changing things.',
      'Tag the rule with owner + JIRA + intent in the description field. Six months later you (or your replacement) will forget why it exists. Save them the archaeology.',
      'Most of the time, a managed rule already exists — <b>check the catalog first</b> before writing a custom Lambda.',
    ],
    handsOn: {
      intro: 'One exercise on extending a custom Config rule. The skill is reading code someone else wrote and modifying it cleanly.',
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
      ],
      selfCheck: [
        'I can explain in one sentence the difference between a managed Config rule and a custom one.',
        'I know configuration-change vs periodic triggers and when each is right.',
        'I would check the managed-rule catalog before writing a custom Lambda.',
        'I know Config Aggregator gives org-wide visibility, with minute-to-hour lag.',
        'I know annotation strings surface in the Config console and should help on-call act.',
      ],
    },
    recap: [
      'AWS Config records resource state; Config Rules turn those records into COMPLIANT/NON_COMPLIANT verdicts.',
      'Managed rules ≈ 250 ready-to-go checks. Custom rules = your own Lambda or Guard DSL.',
      'configuration-change trigger is near-real-time; periodic trigger has a 24h max interval.',
      'Config Aggregator is the org-wide view — auditors want one number, not per-account dashboards.',
      'Pair detection with prevention: SCPs block, Config detects what slipped through.',
    ],
    talkingPoints: [
      `"Config records every resource change; Config Rules turn those records into compliance verdicts."`,
      `"Managed rule first, custom Lambda only when the managed catalog doesn't cover it."`,
      `"Configuration-change trigger gives near-real-time signal; periodic is for resource-state-over-time checks."`,
      `"Config can be a cost surprise — change-triggered on high-churn resources multiplies fast."`,
      `"For org-wide audit reporting we use Config Aggregator, not per-account dashboards."`,
    ],
  },

  {
    id: 'aws-control-tower',
    group: 'AWS Governance',
    order: 3,
    title: 'Control Tower & Landing Zones',
    subtitle: 'How AWS automates building and governing a multi-account environment',
    cloud: 'aws',
    intro: {
      plain: `When a new team needs cloud, you don't hand them a blank account
              and hope. You hand them a pre-configured shell — the right OU,
              baseline guardrails, logging on, identity wired up. That
              pre-configured shell is called a Landing Zone. AWS Control Tower
              automates building and maintaining it, and offers an "Account
              Factory" so anyone with the right role can spin up a new account
              in the right OU with all baselines auto-applied.`,
      mnemonic: 'Landing Zone = pre-built, pre-secured cloud "starter home". Control Tower = the construction crew.',
    },
    panels: [
      {
        cloud: 'aws',
        service: 'AWS Control Tower + AWS Landing Zone',
        plain: `Control Tower is a managed service that sets up and maintains a
                multi-account AWS environment. It creates a baseline org
                structure (Security OU, Sandbox OU, etc.), provisions the log
                archive and audit accounts, turns on Config and CloudTrail,
                and applies SCPs. Then it offers an "Account Factory" so
                anyone with the right role can spin up a new account in the
                right OU with all baselines auto-applied.`,
        detail: [
          '<b>Landing Zone</b> = the resulting environment. <b>Control Tower</b> = the service that builds and governs it.',
          '<b>Account Factory</b> — the vending workflow. Submit a request, get a new account in the chosen OU with baseline applied.',
          '<b>Three control types — memorize as P-D-P:</b>',
          '  • <b>Preventive</b> — SCPs that block actions (e.g., deny untagged volumes). Run before the action happens.',
          '  • <b>Detective</b> — Config rules that flag non-compliance after the fact.',
          '  • <b>Proactive</b> — CloudFormation Hooks that block non-compliant template deploys before any resource is created.',
          '<b>Mandatory vs Strongly Recommended vs Elective</b> — controls come with a recommendation level. Mandatory are always on; the others you opt into per OU.',
          '<b>AFT (Account Factory for Terraform)</b> — Terraform-driven extension; lets you customize new accounts via a Terraform pipeline (network baselines, tagging, custom IAM roles).',
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
    fieldNotes: [
      '<b>CT drift detection runs hourly.</b> Don\'t ignore drift notifications — that\'s a guardrail that has silently failed. Re-enroll the OU/account to fix.',
      '<b>Customizing CT requires CfCT</b> (Customizations for Control Tower) — it adds CodePipeline + CFN StackSets to your CT management account. Adopt it before you have ten one-off scripts.',
      '<b>AFT (Account Factory for Terraform)</b> is the production pattern for multi-account at scale. Raw Account Factory is fine for tiny orgs (<20 accounts); AFT is what big orgs use.',
      '<b>You cannot disable Mandatory CT controls.</b> You CAN opt out of "Strongly Recommended" — but auditors ask "why is this off?" Document the reason before you opt out, not after the auditor calls.',
      'CT control tiers (memorize the language — auditors use it): <b>Mandatory</b> · <b>Strongly Recommended</b> · <b>Elective</b>.',
      'CT enrollment takes 30+ minutes and is <b>hard to undo</b>. Test in a sandbox AWS org before enabling in production. Disabling CT can leave orphaned resources behind.',
      'Region-deny SCP via CT covers <b>regional</b> services. Global services (IAM, Route 53, CloudFront, Organizations, Billing) remain accessible — by design, but auditors ask why.',
      'For Azure parity: the equivalent is a <b>subscription-vending pipeline</b> (usually Terraform) plus MCSB initiative assignments at the MG root. See <i>Azure Governance → MCSB</i>.',
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
      ],
      selfCheck: [
        'I can name what a Landing Zone is and why teams "land" into a pre-built environment.',
        'I can name the three AWS control types (P-D-P) and one example of each.',
        'I know the AWS Account Factory ↔ Azure Terraform subscription-vending mapping.',
        'I know MCSB initiative at MG root is the Azure analog of mandatory SCPs at org root.',
        'I know CT controls come in three tiers: Mandatory / Strongly Recommended / Elective.',
      ],
    },
    recap: [
      'Landing Zone = the pre-secured, pre-configured environment new teams land in.',
      'AWS Control Tower automates LZ creation; Account Factory is the vending UI.',
      'Three control types: P-D-P — Preventive (SCP), Detective (Config rule), Proactive (CFN Hook).',
      'Mandatory CT controls are always on; strongly-recommended and elective are opt-in per OU.',
      'AFT (Account Factory for Terraform) is the Terraform-driven extension when you outgrow raw Account Factory.',
    ],
    talkingPoints: [
      `"Our landing zone is the standard environment teams get on day one — pre-applied SCPs, logging, identity, baseline Defender."`,
      `"On AWS we use Control Tower Account Factory; on Azure we use a Terraform subscription-vending pipeline."`,
      `"Control types are preventive, detective, proactive — SCPs, Config rules, CFN Hooks respectively."`,
      `"Mandatory CT controls are always on; strongly-recommended and elective are opt-in per OU."`,
      `"Drift is the most common cause of audit findings — verify, don't trust the CT dashboard alone."`,
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
    intro: {
      plain: `Azure Policy is broader than an AWS SCP. It can DENY (like SCP), but
              it can also AUDIT (record non-compliance), MODIFY (auto-fix tags),
              APPEND (add fields), and DEPLOY-IF-NOT-EXISTS (auto-create a
              missing log setting). You write a policy DEFINITION (JSON), then
              ASSIGN it to a scope (Management Group, subscription, or resource
              group). The scope determines blast radius.`,
      mnemonic: 'Azure Policy effects = A·D·A·M·D·A · (Audit · Deny · Append · Modify · DeployIfNotExists · AuditIfNotExists).',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Azure Policy — definitions, assignments, effects',
        plain: `A policy DEFINITION is JSON describing a rule. It does nothing
                until you ASSIGN it to a scope. Once assigned, it evaluates
                every resource in scope and applies its effect. Effects range
                from "Audit" (log non-compliance) to "Deny" (block the deploy)
                to "DeployIfNotExists" (auto-create something missing).`,
        detail: [
          '<b>Six effects (memorize):</b> <code>Audit</code>, <code>Deny</code>, <code>Append</code>, <code>Modify</code>, <code>DeployIfNotExists</code>, <code>AuditIfNotExists</code>. Some legacy: <code>Disabled</code>, <code>EnforceOPAConstraint</code>, <code>Manual</code>.',
          '<b>Definition vs Assignment:</b> the JSON is a <i>definition</i>. It does nothing until you <i>assign</i> it to a scope.',
          '<b>Initiative</b> — a bundle of related policy definitions. Microsoft Cloud Security Benchmark (MCSB) is itself a built-in initiative (see the MCSB topic).',
          '<b>Exemption</b> — time-bound waiver for a specific resource or scope. Lets you say "this storage account is grandfathered until 2026-12-31."',
          '<b>Inheritance:</b> a policy at a MG installs a checkpoint that every sub beneath it must pass — same picture as the org tree. A subscription-level assignment adds <em>another</em> checkpoint; it can never remove or relax the one above. Restrictions stack.',
          '<b>Audit vs Deny rollout:</b> default to <code>audit</code> first, watch the compliance pane for ~1 week, promote to <code>deny</code> once false positives are ruled out.',
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
          { token: '"policyType": "Custom"', type: 'keyword', note: 'Azure keyword. Valid values: "Custom" | "BuiltIn" | "Static". You only ever author "Custom"; the others are Microsoft-managed.' },
          { token: '"mode": "Indexed"', type: 'keyword', note: 'Azure keyword. "Indexed" = only resources that support tags+locations (skip ResourceGroup-level stuff). Other valid values: "All", "Microsoft.KeyVault.Data", etc. Docs: Azure Policy → Definition structure.' },
          { token: '"if" / "then" / "allOf"', type: 'keyword', note: 'Azure Policy rule grammar. Other logical operators: "anyOf", "not". Docs: Azure Policy condition operators reference.' },
          { token: '"field": "type"', type: 'keyword', note: 'Azure Policy reserved alias — the resource type. Other reserved aliases: "name", "kind", "location", "tags". Plus thousands of resource-specific aliases (look up via `az provider show` or Get-AzPolicyAlias).' },
          { token: '"Microsoft.Storage/storageAccounts"', type: 'keyword', note: 'Azure resource type identifier — fixed string defined by the Microsoft.Storage resource provider. List all types: `az provider show -n Microsoft.Storage`.' },
          { token: '"Microsoft.Storage/.../allowBlobPublicAccess"', type: 'keyword', note: 'Azure Policy alias — a typed path into the resource\'s properties. Discover with `Get-AzPolicyAlias -NamespaceMatch Microsoft.Storage`.' },
          { token: '"effect": "deny"', type: 'keyword', note: 'Azure Policy effect. One of six: "audit", "deny", "append", "modify", "deployIfNotExists", "auditIfNotExists" (plus legacy "disabled"). Docs: Understand Policy effects.' },
          { token: '"displayName": "Storage: deny public blob access"', type: 'user', note: 'Your label — surfaces in the Azure Portal compliance pane. Free-form; make it search-friendly.' },
        ],
      },
    ],
    fieldNotes: [
      '<b>Azure Policy DINE / Modify effects need a Managed Identity</b> at the assignment with the right RBAC role (usually Contributor + the specific Action). Missing identity = silent no-op. This is the #1 reason DINE policies "don\'t work."',
      'Policy evaluation cycles: change event (~minutes), full scan (every 24h), on-demand via <code>Start-AzPolicyComplianceScan</code>. <b>Auditors don\'t wait 24h</b> — know how to force the scan.',
      'Exemptions <b>take an expiry</b>. Make 90 days the default; tag the exemption with requester, JIRA, and renewal cadence. "Permanent" exemptions become audit findings.',
      '<code>enforcementMode: DoNotEnforce</code> on a policy assignment keeps it visible but stops evaluation. Use during incident pauses or major migrations — <b>not</b> as a workaround for "I don\'t like this rule."',
      'Custom Azure Policy authoring requires <b>alias discovery</b>: <code>Get-AzPolicyAlias</code> tells you which properties you can target. Without it, your policy condition references nothing.',
      'Two exemption <b>categories</b>: <code>Waiver</code> (we accept the risk) and <code>Mitigated</code> (we have a compensating control). Pick honestly — auditors read both.',
      '<b>Suppression ≠ exemption.</b> Suppression hides the rec from the Defender dashboard. Exemption modifies the underlying policy assignment. <b>Auditors read exemptions, not suppressions.</b>',
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
    recap: [
      'Azure Policy has six effects: Audit, Deny, Append, Modify, DeployIfNotExists, AuditIfNotExists.',
      'A definition is JSON; an assignment binds it to a scope. Neither alone does anything.',
      'Initiatives bundle policies (MCSB is the built-in security baseline initiative).',
      'DINE/Modify need a managed identity + RBAC, or they silently no-op.',
      'Exemptions are time-bound waivers. Default 90-day expiry, requester + JIRA + reason in the metadata.',
    ],
    talkingPoints: [
      `"Azure Policy is broader than SCPs — six effects: audit, deny, append, modify, DINE, AINE."`,
      `"For a new control we default to Audit first, watch the compliance pane, promote to Deny."`,
      `"Exemptions on Azure Policy let us grandfather specific resources without dropping the policy."`,
      `"DINE policies that 'don't work' are almost always missing managed identity or RBAC at the assignment."`,
      `"If a deploy fails with 'RequestDisallowedByPolicy', the guardrail did its job."`,
    ],
  },

  {
    id: 'azure-policy-anatomy',
    group: 'Azure Governance',
    order: 2,
    title: 'Azure Policy: anatomy',
    subtitle: 'The JSON skeleton — once you read the shape, you can read any policy',
    cloud: 'azure',
    intro: {
      plain: `Every Azure Policy is one JSON object with the same skeleton.
              <code>properties</code> wraps everything. Inside that,
              <code>policyRule</code> has two halves: <code>if</code> (the
              condition — does this rule apply?) and <code>then</code> (what
              happens — the effect + any deployment details). Once you can
              read that skeleton, you can read any policy in the catalogue.`,
      mnemonic: 'properties → policyRule → if { conditions } + then { effect, details }.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'The skeleton — condition operators + parameters',
        plain: `The <code>if</code> block uses logical combinators
                (<code>allOf</code>, <code>anyOf</code>, <code>not</code>) and
                leaf conditions on a <code>field</code> or a
                <code>value</code>. The <code>then</code> block names the
                effect; for DINE/AINE/Modify, it also carries
                <code>details</code> (the existence check, the deployment
                template, the role IDs). Parameters let one definition serve
                many assignments.`,
        detail: [
          '<b>Combinators</b> — <code>allOf</code> (AND), <code>anyOf</code> (OR), <code>not</code> (NOT). Nest freely.',
          '<b>Leaf conditions</b> — <code>{ "field": "X", "&lt;op&gt;": "Y" }</code> or <code>{ "value": "[parameters(\'foo\')]", "&lt;op&gt;": "Y" }</code>.',
          '<b>Operators</b> — <code>equals</code>, <code>notEquals</code>, <code>like</code>, <code>notLike</code>, <code>match</code>, <code>contains</code>, <code>in</code>, <code>notIn</code>, <code>exists</code>, <code>greater</code>, <code>greaterOrEquals</code>, <code>less</code>, <code>lessOrEquals</code>.',
          '<b>field vs value</b> — <code>field</code> reads a property on the resource being evaluated. <code>value</code> evaluates an arbitrary expression (often <code>parameters(\'x\')</code> or <code>resourceGroup().tags.foo</code>).',
          '<b>count()</b> — assert how many items in a complex array satisfy a sub-condition. Used for "at least one network rule must …" style checks.',
          '<b>parameters block</b> — typed inputs (string, array, integer, boolean). Use <code>[parameters(\'name\')]</code> to reference inside the rule.',
          '<b>details (for DINE/Modify/AINE)</b> — <code>type</code> of the related resource, <code>existenceCondition</code> (what does "compliant" look like?), <code>roleDefinitionIds</code> (what RBAC the managed identity needs), and <code>deployment</code> (the ARM template to run, for DINE).',
          '<b>mode</b> — <code>All</code> evaluates resource groups + tags + locations; <code>Indexed</code> evaluates only resources that support tags + location. Most security policies use <code>Indexed</code>.',
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
          { token: '"mode": "All"', type: 'keyword', note: 'Azure keyword. Values: "All" (includes resource groups & subscriptions) or "Indexed" (only resources that support tags+location). Docs: Azure Policy mode reference.' },
          { token: '"parameters"', type: 'keyword', note: 'Azure Policy schema. Each parameter has a "type" (String, Array, Integer, Boolean, Object) and optional metadata.' },
          { token: '"type": "Array"', type: 'keyword', note: 'Azure Policy parameter type. Valid values: "String", "Array", "Object", "Boolean", "Integer", "Float", "DateTime".' },
          { token: '"not" / "in"', type: 'keyword', note: 'Azure Policy logical/comparison operators. "not" inverts; "in" checks array membership. Other operators: equals, like, contains, exists, greater, less, count.' },
          { token: '"[parameters(\'allowedLocations\')]"', type: 'keyword', note: 'Azure Policy expression syntax — square-bracket expressions are evaluated at runtime. Function name "parameters" is fixed; the argument is your parameter name.' },
          { token: '"allowedLocations"', type: 'user', note: 'Your parameter name — any identifier you choose. Used as the argument to parameters() above.' },
          { token: '"displayName": "Allowed locations"', type: 'user', note: 'Your label, shown in the Portal.' },
        ],
      },
      {
        cloud: 'azure',
        service: 'DeployIfNotExists — the existence-check pattern',
        plain: `DINE is the workhorse for auto-remediation: "if a VM doesn't
                have the MDE extension, deploy it." Two halves you must get
                right: <code>existenceCondition</code> (what counts as already
                compliant — don't deploy twice) and the
                <code>deployment</code> block (an ARM template the managed
                identity will run).`,
        detail: [
          '<b>type (under details)</b> — the related resource type the policy looks for. For MDE on VMs: <code>Microsoft.Compute/virtualMachines/extensions</code>.',
          '<b>existenceCondition</b> — the leaf check that says "this related resource is the right one." Without it, the policy thinks the resource is non-compliant even if it\'s already there.',
          '<b>roleDefinitionIds</b> — the RBAC role(s) the assignment\'s managed identity needs. Usually <code>Contributor</code> or a more specific built-in role ID.',
          '<b>deployment.properties.template</b> — a full ARM template snippet. Runs in <code>incremental</code> mode against the parent resource\'s resource group.',
          '<b>evaluationDelay</b> — wait N minutes after the trigger resource is created before evaluating. Use this when the deployment needs the resource to be fully provisioned first.',
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
          { token: '"effect": "deployIfNotExists"', type: 'keyword', note: 'Azure Policy effect (one of six). DINE deploys an ARM template if the existenceCondition is not satisfied. Docs: Understand Policy effects → deployIfNotExists.' },
          { token: '"details"', type: 'keyword', note: 'Required for DINE/Modify/AINE effects. Holds the related-resource type, existence check, RBAC roles, and (for DINE) the deployment template.' },
          { token: '"existenceCondition"', type: 'keyword', note: 'Azure Policy schema — the leaf check that says "the related resource I would have deployed already exists." Without it, DINE re-deploys every eval cycle.' },
          { token: '"roleDefinitionIds"', type: 'keyword', note: 'Required for DINE/Modify. List of built-in role IDs the assignment\'s managed identity must hold to do the deployment. Find IDs with `Get-AzRoleDefinition`.' },
          { token: '"/providers/Microsoft.Authorization/roleDefinitions/b24988ac-...24c"', type: 'keyword', note: 'Azure built-in role ID for Contributor — same GUID across all tenants. List of built-in role IDs: docs.microsoft.com → Azure built-in roles.' },
          { token: '"MDE.Windows" / "Microsoft.Azure.AzureDefenderForServers"', type: 'keyword', note: 'Microsoft-defined extension type and publisher name for Defender for Endpoint. Discover with `Get-AzVMExtensionImage` against the publisher.' },
          { token: '"Microsoft.Compute/virtualMachines"', type: 'keyword', note: 'Azure resource type. Provider-defined; the canonical list is `az provider show -n Microsoft.Compute`.' },
          { token: '"mode": "incremental"', type: 'keyword', note: 'ARM deployment mode. "incremental" adds/updates; "complete" deletes anything not in the template. DINE always uses "incremental".' },
        ],
      },
      {
        cloud: 'azure',
        service: 'AuditIfNotExists — same shape, audit-only',
        plain: `AINE is DINE\'s passive sibling. Same
                <code>existenceCondition</code> pattern, but instead of
                deploying anything it just flags non-compliance. Use it when
                you want visibility but not auto-action — e.g., "every Key
                Vault should have diagnostic settings, but I'm not going to
                create them for you."`,
        detail: [
          '<b>No <code>roleDefinitionIds</code> needed</b> — AINE doesn\'t deploy. No managed identity required on the assignment.',
          '<b>No <code>deployment</code> block</b> — just the existence check.',
          '<b>Surfaces in Defender for Cloud as a recommendation</b>, just like Audit does.',
          '<b>When to choose AINE over Audit:</b> Audit fires when the <em>main</em> resource matches and has a bad property. AINE fires when the main resource matches but a <em>related</em> resource (extension, diagnostic setting, child) is missing or misconfigured.',
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
          { token: '"effect": "auditIfNotExists"', type: 'keyword', note: 'Azure Policy effect — flags non-compliance when a related resource is missing/misconfigured. Same shape as DINE but with no deployment + no managed identity required.' },
          { token: '"Microsoft.KeyVault/vaults"', type: 'keyword', note: 'Azure resource type for Key Vault. Provider-defined.' },
          { token: '"Microsoft.Insights/diagnosticSettings"', type: 'keyword', note: 'Azure resource type for diagnostic settings — the related resource AINE looks for.' },
          { token: '"logs.enabled" / "workspaceId"', type: 'keyword', note: 'Property aliases on Microsoft.Insights/diagnosticSettings. Discover with `Get-AzPolicyAlias -NamespaceMatch Microsoft.Insights`.' },
          { token: '"exists": "true"', type: 'keyword', note: 'Azure Policy operator. The string "true" / "false" is the keyword form — not the boolean true. Same for "equals" comparisons to boolean-typed properties.' },
        ],
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
      'Memorize the shape <code>properties → policyRule → if + then</code>. Everything else is variations of conditions and effects.',
      '<b>Indexed vs All mode</b> — most security policies want <code>Indexed</code> (skips resource groups, subscriptions, locations that don\'t support tags). Use <code>All</code> for tag-on-RG checks.',
      '<b>Alias discovery is non-negotiable</b> for custom policies. <code>Get-AzPolicyAlias -ResourceType "Microsoft.Storage/storageAccounts"</code> tells you which properties you can target. Typos in a field name = silent no-op.',
      '<b>field vs value gotcha:</b> <code>field "type"</code> is the resource type. <code>field "type" notEquals "..."</code> filters the rule scope. To compare to a parameter, use <code>"value": "[parameters(\'foo\')]"</code> on the right side.',
      'For <b>DINE</b>, the <code>existenceCondition</code> is the most common bug. If it\'s too loose, the policy claims compliance falsely. If it\'s too strict, the policy deploys forever — re-running the deployment every eval cycle.',
      'Test custom policies in <b>Audit mode first</b>, then switch to <code>deny</code> or <code>deployIfNotExists</code>. The compliance pane shows what the policy would have done.',
      '<b>roleDefinitionIds</b> takes <b>built-in role IDs only</b>, not custom roles. Use <code>Get-AzRoleDefinition</code> to find the ID. Common: Contributor = <code>b24988ac-6180-42a0-ab88-20f7382dd24c</code>.',
      'Initiative parameters override individual policy parameters — pass once at the initiative assignment, all member policies inherit.',
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
    recap: [
      'Every policy: properties → policyRule → if (conditions) + then (effect + optional details).',
      'Combinators: allOf, anyOf, not. Operators: equals, in, exists, like, count, …',
      'Parameters make one definition serve many assignments — typed inputs referenced via [parameters(\'x\')].',
      'DINE/AINE need an existenceCondition (what counts as already compliant) or they evaluate non-compliant forever.',
      'DINE/Modify also need a managed identity on the assignment with roleDefinitionIds-granted RBAC — or they silently no-op.',
    ],
    talkingPoints: [
      `"Every Azure Policy is one JSON skeleton — properties → policyRule → if + then. Once you read the skeleton, the rest is variations."`,
      `"For 'allowed locations'-style policies, the trick is the <code>not</code> wrapper — without it, the deny inverts."`,
      `"DINE failure mode #1: missing managed identity. Failure mode #2: missing existenceCondition. Both are silent."`,
      `"For custom policies I always run <code>Get-AzPolicyAlias</code> first — field typos are silent no-ops, hours to debug."`,
      `"Audit first, then promote to Deny. Compliance pane shows what the policy would have done in audit mode."`,
    ],
  },

  {
    id: 'azure-mcsb',
    group: 'Azure Governance',
    order: 3,
    title: 'Microsoft Cloud Security Benchmark (MCSB)',
    subtitle: 'Azure\'s built-in security baseline — ~250 policies bundled as one initiative',
    cloud: 'azure',
    intro: {
      plain: `MCSB is Microsoft\'s baseline of "what should be checked" — a
              curated bundle of ~250 Azure Policies aligned to NIST and CIS.
              You don\'t write it. You ASSIGN it once at a top Management
              Group, and every subscription beneath inherits a continuous
              compliance check. Defender for Cloud surfaces failures as
              recommendations and rolls them into the Secure Score.`,
      mnemonic: 'MCSB = the curated bundle. Assign once at MG root. Score continuously.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Microsoft Cloud Security Benchmark + subscription vending',
        plain: `Azure has no single "Control Tower" product. The Azure landing
                zone is stitched from a Management Group hierarchy + a
                subscription-vending pipeline (usually Terraform) + the MCSB
                initiative assigned at the top. New subscriptions land in the
                right MG and inherit MCSB on day one.`,
        detail: [
          '<b>Microsoft Cloud Security Benchmark</b> — Azure\'s built-in baseline initiative. ~250 policies. Curated by Microsoft, free.',
          '<b>Assignment scope</b> — Tenant Root group or a top MG. One assignment, all subscriptions inherit.',
          '<b>Control-ID decoder</b> — every MCSB control has a 2-letter family + a number. Memorize:',
          '  <code>NS</code> Network · <code>IM</code> Identity · <code>PA</code> Privileged Access · <code>DP</code> Data Protection',
          '  <code>AM</code> Asset Mgmt · <code>LT</code> Logging+Threat · <code>IR</code> Incident Response · <code>PV</code> Posture+Vuln',
          '  <code>ES</code> Endpoint · <code>BR</code> Backup · <code>DS</code> DevOps Security · <code>GS</code> Governance',
          '<b>Framework mapping</b> — Defender for Cloud → Regulatory Compliance pane shows MCSB compliance + your mapping to NIST 800-53, ISO 27001, PCI DSS, HIPAA, …',
          '<b>Subscription vending</b> — Terraform module (community: <code>terraform-azurerm-lz-vending</code>) creates the sub, places it in MG, assigns RBAC, applies tags. MCSB is inherited from MG root, not assigned per-sub.',
          '<b>Enterprise-Scale Landing Zone (ESLZ)</b> — Microsoft\'s reference architecture / CAF Landing Zones. Defines the standard MG hierarchy your vending pipeline targets.',
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
    ],
    fieldNotes: [
      '<b>MCSB compliance % ≠ Secure Score.</b> Different math, different denominator. Don\'t quote them as the same number in a meeting.',
      'Decode MCSB control IDs on sight — auditors use them as shorthand. <code>NS-1</code> = network restrictions, <code>ES-1</code> = endpoint protection, <code>LT-4</code> = logging on critical resources, etc.',
      'MCSB is <b>updated by Microsoft</b> on a release cadence. Assignment auto-picks up new controls. Read the release notes — sometimes a new "Recommended" control flips you non-compliant overnight.',
      'You can <b>extend MCSB</b> by attaching a custom initiative alongside it ("Corp-Security"). Don\'t fork MCSB itself — you lose Microsoft\'s updates.',
      '<b>Assign at Tenant Root</b> for true org-wide coverage. Many shops assign at a "top" MG below root — works for inheritance, misses subs that escape into a sibling tree.',
      '<b>For ESLZ adopters</b>: the standard MG hierarchy is <code>Tenant Root → Top → Platform / Landing Zones / Sandbox / Decommissioned</code>. Place MCSB at <code>Top</code>, not Tenant Root, to leave a clean escape hatch for the management subscriptions.',
      '<b>Compliance pane export</b> — PDF + CSV both. Auditors want the PDF for the headline number and the CSV for the per-resource breakdown.',
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
    recap: [
      'MCSB is the built-in Microsoft initiative — ~250 policies, assigned once at MG root, all subs inherit.',
      'Control IDs follow a 2-letter family code (NS, IM, ES, LT, …) — learn the decoder; auditors use it.',
      'MCSB ≠ Secure Score; the Regulatory Compliance pane is the canonical MCSB view.',
      'Extend MCSB by attaching a custom initiative alongside — never fork the built-in.',
      'Subscription-vending pipelines + MCSB initiative + MG hierarchy together form the Azure landing zone (there is no single "Control Tower" product).',
    ],
    talkingPoints: [
      `"MCSB is Azure's built-in security baseline — about 250 policies, one initiative assignment at MG root."`,
      `"Control IDs decode to families: NS Network, ES Endpoint, LT Logging+Threat, etc. Auditors use these as shorthand."`,
      `"For audit: Defender for Cloud → Regulatory Compliance → MCSB shows pass/fail per control with the underlying policies."`,
      `"We extend MCSB with a custom 'Corp-Security' initiative — we never fork MCSB itself or we lose Microsoft's updates."`,
      `"MCSB compliance % and Secure Score are different numbers — different denominators. Don't conflate them."`,
    ],
  },

  {
    id: 'azure-runbooks',
    group: 'Azure Governance',
    order: 4,
    title: 'Azure Automation Runbooks',
    subtitle: 'PowerShell / Python scripts that run on a schedule with Azure auth baked in',
    cloud: 'azure',
    intro: {
      plain: `An Automation Runbook is a script (PowerShell or Python) that
              Azure runs for you on a schedule or on demand. Think "cron job
              with Azure auth baked in." Compliance teams use them for
              scheduled audits and bulk remediation: find every storage
              account with public access, every VM missing MDE, every Key
              Vault without diagnostic settings — and fix them in batch.`,
      mnemonic: 'Automation account = the container. Runbook = the script. Managed Identity = the credential.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Automation Runbooks — PowerShell, Managed Identity, schedule',
        plain: `Automation accounts host runbooks. Each runbook is a script.
                The Automation account has a Managed Identity (System- or
                User-Assigned) which authenticates to Azure without any
                secrets — the runbook just calls
                <code>Connect-AzAccount -Identity</code> and is signed in.
                You attach a schedule, and the runbook runs hourly /
                nightly / on a cron.`,
        detail: [
          '<b>Runtime</b> — PowerShell 7.2 is the modern default. <code>5.1</code> is legacy and has stale Az module versions. Python 3.10/3.11 also available; Python is less common for compliance work because the Az PowerShell modules cover more ground.',
          '<b>Managed Identity flavors</b>:',
          '  • <b>System-Assigned</b> — tied to the Automation account. Dies if you re-create the account. Default for first-time setups.',
          '  • <b>User-Assigned</b> — a separate resource, shared across multiple runbooks/Automation accounts. <b>Production pattern.</b>',
          '<b>RBAC for the identity</b> — grant least-privilege at the Management Group scope so one identity covers every sub beneath. Typical: <code>Storage Account Contributor</code> at MG scope for a "disable public storage" runbook.',
          '<b>Modules to know</b> — <code>Az.Accounts</code>, <code>Az.Resources</code>, <code>Az.Storage</code>, <code>Az.Compute</code>, <code>Az.KeyVault</code>, <code>Az.OperationalInsights</code> (for writing to Log Analytics).',
          '<b>Output stream limit</b> — ~1MB per job. For anything bigger, write to Log Analytics (via the Data Collector API) or to blob storage, and emit only a pointer to the output stream.',
          '<b>Idempotency</b> — runbooks run on a schedule. Re-running a "fix" runbook on an already-fixed environment must be a no-op. Pattern: filter first by "already compliant" → <code>continue</code>; act only on the rest.',
          '<b>Tag-based opt-out</b> — give resource owners a controlled escape hatch. Convention: <code>complianceWaiver = "true"</code>. The runbook skips waived resources; auditors can list every waiver via Resource Graph.',
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
          { token: 'Connect-AzAccount -Identity', type: 'keyword', note: 'Az PowerShell cmdlet (`Az.Accounts` module). The `-Identity` switch tells it to authenticate using the host\'s managed identity — no secrets needed. Docs: Az.Accounts → Connect-AzAccount.' },
          { token: 'Get-AzSubscription / Set-AzContext / Get-AzStorageAccount / Set-AzStorageAccount', type: 'keyword', note: 'Az PowerShell cmdlets. Naming convention is fixed: <Verb>-Az<Noun>. Lookup: `Get-Command -Module Az.*`.' },
          { token: '$acct.PublicNetworkAccess', type: 'keyword', note: 'Property on Microsoft.Storage/storageAccounts. Valid values: "Enabled", "Disabled". Defined by the storage resource provider.' },
          { token: "'Disabled'", type: 'keyword', note: 'Azure-defined enum value for PublicNetworkAccess. Other valid value: "Enabled".' },
          { token: "$acct.Tags['complianceWaiver']", type: 'user', note: 'Your tag key — pick a convention and stick to it across runbooks. Tags are case-sensitive on Azure.' },
          { token: "'true'", type: 'user', note: 'Your sentinel value for the waiver tag — a string, since Azure tag values are strings. Could also be a date, JIRA ID, etc.' },
          { token: 'Write-Output', type: 'keyword', note: 'PowerShell cmdlet — writes to the runbook output stream (~1MB job limit). For audit evidence, also write to Log Analytics via the Data Collector API.' },
        ],
      },
    ],
    fieldNotes: [
      '<b>Use a User-Assigned Managed Identity</b> in production. System-Assigned identity dies if the Automation account is recreated; user-assigned survives and can be reused across runbooks.',
      'Use <code>Write-Error</code> (not <code>Throw</code>) on per-resource failures, so the job keeps going. One bad subscription shouldn\'t kill the entire run.',
      'Output stream limit is ~1MB per runbook job. For anything bigger, write to Log Analytics (via the Data Collector API) or to blob storage, and emit only a pointer.',
      'Schedule with a buffer — <b>never</b> schedule a 30-min runbook every 30 min. Overlapping runs cause double-remediation. Make the cadence at least 2× the worst-case runtime.',
      'Source-control the runbook (GitHub / Azure Repos integration). A runbook visible only in the portal is an auditor\'s red flag — they can\'t see the change history.',
      'Test in dev with a <code>-WhatIf</code> flag before flipping <code>-Force</code> on. Remediation runbooks are the easiest way to nuke production accidentally.',
      '<b>Don\'t use Runbooks for sub-second remediation</b> — use Logic Apps + Event Grid. Runbooks are for scheduled or batch work; their cold-start is multi-second.',
      'The <b>Run As Account</b> (classic service-principal-in-an-Automation-account) was <b>deprecated in Sep 2023</b>. Don\'t introduce new dependencies on it. Existing runbooks should migrate to Managed Identity.',
      '<b>Hybrid Worker</b> — when you need to run a runbook against an on-prem or VNet-only resource. The worker runs on a VM in your network; the runbook code is the same. Use sparingly.',
      'Logged actions belong in a <b>custom Log Analytics table</b> via the Data Collector API. Searchable in KQL alongside other audit data, evidence-able for audits.',
    ],
    handsOn: {
      intro: 'Two exercises on writing safe, auditable runbooks.',
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
      ],
      selfCheck: [
        'I can sketch the runbook skeleton: <code>Connect-AzAccount -Identity</code> → loop subs → filter idempotency + waiver → act → log.',
        'I know System-Assigned vs User-Assigned managed identity and would pick User-Assigned in production.',
        'I know to use <code>Write-Error</code> not <code>Throw</code> for per-resource failures.',
        'I know the ~1MB output-stream limit and would log to LA instead.',
        'I know runbooks are for scheduled or batch work — sub-second remediation is Logic Apps + Event Grid.',
      ],
    },
    recap: [
      'A Runbook is a PowerShell or Python script the Automation account runs on a schedule.',
      'Managed Identity (System- or User-Assigned) is the modern auth — no secrets to rotate. Run As Account is deprecated.',
      'Idempotency check + waiver tag gives a controlled escape hatch for owners.',
      'Output stream limit is ~1MB; for bigger, write to Log Analytics via the Data Collector API.',
      'Don\'t use Runbooks for sub-second remediation — use Logic Apps + Event Grid.',
    ],
    talkingPoints: [
      `"Our remediation runbooks authenticate via the Automation account's Managed Identity — no secrets in scope."`,
      `"Each runbook respects a complianceWaiver tag so owners have a documented opt-out."`,
      `"Every action writes to a Log Analytics custom table — searchable in KQL alongside other audit data."`,
      `"Idempotent by design: re-running on a clean environment is a no-op."`,
      `"Schedule with a buffer — at least 2× the worst-case runtime — or we get overlapping double-remediation."`,
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
    intro: {
      plain: `KQL is Microsoft\'s read-only query language. You\'ll meet it
              everywhere on Azure: Defender for Cloud, Sentinel, Log
              Analytics, Resource Graph, App Insights. It looks like SQL but
              reads like a Unix pipeline — each <code>|</code> means
              <em>then do this next</em>. The skill that gets paid for is
              not memorizing operators; it\'s reading a query someone else
              wrote and predicting what it returns.`,
      mnemonic: 'where → project → summarize → join (leftanti for "what\'s missing"). 90% of queries.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'KQL operators — the 90% you\'ll use daily',
        plain: `Filter rows with <code>where</code>. Pick columns with
                <code>project</code>. Aggregate with <code>summarize</code>.
                Find "what\'s missing" with <code>leftanti</code>. Define
                reusable variables with <code>let</code>. Add computed
                columns with <code>extend</code>. Expand nested arrays into
                rows with <code>mv-expand</code>. Time-bucket with
                <code>bin()</code>.`,
        detail: [
          '<b>where</b> — filter rows (like SQL <code>WHERE</code>).',
          '<b>project</b> — pick columns (like SQL <code>SELECT</code>). Rename inline: <code>project name, region = location</code>.',
          '<b>summarize</b> — group + aggregate (like SQL <code>GROUP BY</code>). <code>summarize count() by location</code>. Pair with <code>arg_max(TimeGenerated, *)</code> for "latest record per group."',
          '<b>extend</b> — add a computed column. <code>extend Sensitive = type in (sensitiveTypes)</code>.',
          '<b>let</b> — define a query-scope variable. Readability + reuse. <code>let sensitiveTypes = dynamic(["microsoft.keyvault/vaults","microsoft.storage/storageaccounts"]);</code>.',
          '<b>mv-expand</b> — break a nested array into one row per element. Use to filter inside arrays (NSG rules, VM extensions).',
          '<b>join kind=leftanti</b> — "rows on the left that are NOT in the right." This is how you find <em>missing</em> things — VMs without an extension, subs without a policy assignment.',
          '<b>Other joins</b> — <code>inner</code> (both sides), <code>innerunique</code> (default; dedups left), <code>leftouter</code> (left + matched right or null), <code>leftsemi</code> (left rows with at least one match, left columns only).',
          '<b>make-list / make-set</b> — collect grouped values into an array. <code>summarize alerts = make-list(AlertName) by VmName</code>.',
          '<b>bin(TimeGenerated, 1h)</b> — time-bucket. Use with <code>summarize</code> for "alerts per hour."',
          '<b>Case-sensitivity gotcha</b> — <code>==</code> is case-sensitive in KQL. Use <code>=~</code> for case-insensitive. Bites on tag names: <code>tags.owner</code> ≠ <code>tags.Owner</code> with <code>==</code>.',
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
          { token: 'Resources', type: 'keyword', note: 'Azure Resource Graph table name — built into ARG. Other ARG tables: PolicyResources, SecurityResources, HealthResources, AdvisorResources. Docs: Resource Graph table reference.' },
          { token: 'where / project / order by', type: 'keyword', note: 'KQL operators. Full list: docs.microsoft.com/azure/data-explorer/kusto/query → "Tabular operators".' },
          { token: '=~', type: 'keyword', note: 'KQL case-insensitive equals. Use this for type names and tag names. The plain `==` is case-sensitive.' },
          { token: 'type / location / name', type: 'keyword', note: 'Top-level resource fields in ARG — defined by Azure Resource Manager, available on every resource.' },
          { token: 'properties.publicNetworkAccess', type: 'keyword', note: 'Nested property under the resource\'s `properties` blob. Field path varies per resource type; discover with `Resources | where type=~"<type>" | take 1` and inspect properties.' },
          { token: '"microsoft.storage/storageaccounts"', type: 'keyword', note: 'Azure resource type identifier (lowercase form in ARG, mixed-case form `Microsoft.Storage/storageAccounts` in Policy). Provider-defined.' },
          { token: '"Enabled"', type: 'user', note: 'Your filter value — but constrained to the set the resource provider defines. For publicNetworkAccess: "Enabled" | "Disabled".' },
        ],
      },
    ],
    conceptDive: {
      title: 'Where does KQL run? Log Analytics vs Resource Graph',
      body: `
        <section class="cd-section">
          <h3 class="cd-h">Two KQL surfaces — same language, different data</h3>
          <p>You will hit two KQL surfaces — they speak the same language but cover different data:</p>
          <ul>
            <li><strong>Log Analytics workspaces (LA)</strong> — for <em>logs and time-series</em> ingested
            via the Azure Monitor Agent or Diagnostic Settings. Queries lean on
            <code>TimeGenerated</code>. Used by Sentinel, Defender for Cloud alerts,
            App Insights, custom app logs.</li>
            <li><strong>Azure Resource Graph (ARG)</strong> — for the <em>live inventory snapshot</em> of every
            resource across every subscription you have RBAC on. <b>No time
            dimension, no ingestion lag.</b> Used by Defender for Cloud Inventory,
            Azure Policy compliance views, the Resource Graph Explorer blade.</li>
          </ul>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Decision rule — memorize this</h3>
          <aside class="cd-callout">
            <strong class="cd-callout-tag">★ Key rule</strong>
            <p>Time-series / historical / log lines &nbsp;→ <strong>Log Analytics</strong>.</p>
            <p>"What exists right now and where" &nbsp;→ <strong>Resource Graph</strong>.</p>
          </aside>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Gotchas that bite KQL newcomers</h3>
          <ul>
            <li><b>ARG KQL ≠ Log Analytics KQL.</b> You can\'t join an ARG query to a Log Analytics workspace. Different engines. The operator subset is similar but not identical.</li>
            <li><code>arg_max(TimeGenerated, *)</code> only works in Log Analytics — ARG has no time dimension.</li>
            <li>Operator <code>=~</code> is case-insensitive equals. Use it on type names and tag names by default.</li>
            <li>For ARG dive deeper in <i>Inventory & Query → Azure Resource Graph</i>.</li>
          </ul>
        </section>

        <section class="cd-section">
          <h3 class="cd-h">Try it</h3>
          <p>Open <strong>Lab Bench → KQL playground</strong> to try the operators against three sample tables.</p>
        </section>`,
    },
    fieldNotes: [
      '<b>For org-wide audit questions, Resource Graph + KQL beats clicking through the portal</b> every time. Save the query, pin it to a dashboard, screenshot the result with a date stamp. That\'s evidence.',
      '<b>Case-sensitivity gotcha</b>: <code>==</code> is case-sensitive. Use <code>=~</code> for case-insensitive. Bites on tag names every time — <code>tags.owner</code> won\'t match <code>tags.Owner</code> with <code>==</code>.',
      '<b>arg_max(TimeGenerated, *)</b> is the workhorse in Log Analytics for "current state from a time series." Pair with <code>summarize</code> + <code>by &lt;groupKey&gt;</code>.',
      '<b>materialize(expr)</b> hints that an expensive subquery should be computed once and cached. Big perf wins on Log Analytics; less useful in ARG (queries are short-lived anyway).',
      '<b>Save your queries</b> — Resource Graph Explorer has "Saved queries" + dashboard pinning. Don\'t lose useful KQL into Slack DMs and notebooks.',
      '<b>let</b> blocks at the top of a query make queries readable and reusable. Use them for constants (sensitive-type lists, allowed regions) and for sub-results you reference more than once.',
      '<b>mv-expand</b> with nested objects: use <code>mv-expand x = props.array</code> then access <code>x.subprop</code>. The lab simulator supports this; try it.',
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
    recap: [
      'KQL is read-only, pipeline-style. Each <code>|</code> means "then do this next."',
      '90% of queries: where → project → summarize → join (leftanti).',
      'Use <code>let</code> for readability + reuse; <code>extend</code> for computed columns; <code>mv-expand</code> for nested arrays.',
      'Log Analytics = time-series + logs. Resource Graph = live inventory. Different engines, same language.',
      'Save useful queries to Saved Queries + pin to dashboards — that\'s how audit evidence stays fresh.',
    ],
    talkingPoints: [
      `"KQL is the read-only query language. We use it across Defender for Cloud, Sentinel, Log Analytics, and Resource Graph."`,
      `"The leftanti join is the idiom for 'what's missing' — VMs without an extension, subs without an assignment."`,
      `"For org-wide audit questions, KQL + Resource Graph beats clicking through the portal every time."`,
      `"For time-series investigations, Log Analytics is the right surface — <code>arg_max(TimeGenerated, *)</code> gets you latest-per-resource."`,
      `"We save queries and pin to dashboards; quarterly auditor re-runs take 5 seconds, not 5 minutes."`,
    ],
  },

  {
    id: 'resource-graph',
    group: 'Inventory & Query',
    order: 2,
    title: 'Azure Resource Graph',
    subtitle: 'Read-only query layer over your entire tenant\'s inventory',
    cloud: 'azure',
    intro: {
      plain: `Azure Resource Graph (ARG) is a read-only query layer over your
              entire tenant\'s inventory. KQL is the language. You\'ll use it
              daily for compliance audits: "show me every public storage
              account across every subscription" is one query, not a 50-step
              script. ARG has no time dimension — it\'s a snapshot of the
              current state, not a log.`,
      mnemonic: 'ARG = live inventory across the tenant. Reader RBAC required. ~5–15 min eventually consistent.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Resource Graph — the 4 tables that matter',
        plain: `Resource Graph exposes ~10 tables. For compliance work, four
                of them carry 90% of the load: <code>Resources</code>,
                <code>PolicyResources</code>, <code>SecurityResources</code>,
                and <code>ResourceChanges</code>. Learn the shape of each;
                the rest are specialty.`,
        detail: [
          '<b>Authentication</b> — your own Entra ID identity. No separate ARG identity.',
          '<b>RBAC requirement</b> — <code>Reader</code> on every subscription you want to see. Missing Reader = silent omission, not a permission error. Symptom: fewer rows than expected.',
          '<b>Eventually consistent</b> — ARG lags resource changes by ~5–15 minutes. Don\'t use it for "did my fix just land?" — hit the resource API or the portal directly.',
          '<b>Throttling</b> — ~15 queries / 5 sec / user; ~1000 / 15 min / tenant. Bursts get HTTP 429. Use <code>| top 1000</code> while iterating.',
          '<b>Query surface</b> — Azure Resource Graph Explorer (portal), <code>Search-AzGraph</code> (PowerShell), <code>az graph query</code> (CLI), Azure SDK in your language of choice.',
          '<b>Saved queries</b> — Resource Graph Explorer → Saved queries → pin to an Azure dashboard. The quarterly-auditor-re-runs pattern.',
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
          { token: 'Resources / PolicyResources / SecurityResources / ResourceChanges', type: 'keyword', note: 'ARG table names — fixed, defined by the Resource Graph service. Full table list: docs.microsoft.com/azure/governance/resource-graph → "Resource Graph tables".' },
          { token: 'properties.allowBlobPublicAccess', type: 'keyword', note: 'Property path under `properties` for Microsoft.Storage/storageAccounts. Provider-defined. Inspect with `Resources | where type=~"microsoft.storage/storageaccounts" | take 1`.' },
          { token: '"microsoft.storage/storageaccounts"', type: 'keyword', note: 'Azure resource type — lowercase form is what ARG stores. Use `=~` for case-insensitive matching.' },
          { token: 'subscriptionId / resourceGroup / name / location', type: 'keyword', note: 'Top-level ARM resource fields, available on every row in Resources.' },
        ],
      },
    ],
    fieldNotes: [
      '<b>ARG needs Reader RBAC on every subscription you want to see.</b> Missing Reader = silent omission, not a permission error. The #1 ARG surprise in a meeting: "Why are there only 47 storage accounts? We have 2,000." Answer: check your sub list first.',
      '<b>ARG is eventually consistent</b> (~5–15 min lag from change). Don\'t trust it for "did my fix just land?" — use the resource\'s own API or the portal.',
      '<b>ARG KQL ≠ Log Analytics KQL.</b> Different engines, slightly different operator support. You cannot join an ARG query to an LA workspace.',
      '<b>arg_max(TimeGenerated, *)</b> does NOT work in ARG — ARG has no time dimension. For "current state" you just query <code>Resources</code> directly; for "what changed" use <code>ResourceChanges</code>.',
      '<b>ResourceChanges has a 90-day retention window</b>. If you need longer, export to Log Analytics via Diagnostic Settings on the subscription.',
      '<b>Throttling</b> kicks in at ~15 queries / 5 sec. Use <code>| top 1000</code> while iterating; remove only for the final run. If you hit HTTP 429, slow down — back off doesn\'t help.',
      '<b>tostring()</b> on dynamic fields. Properties under <code>properties</code> are JSON; comparisons need <code>tostring()</code> or you get surprising case-sensitivity behavior.',
      '<b>Pin queries to a dashboard, not to Slack.</b> Saved Queries are the canonical artifact; dashboard pins let you screenshot the result with a timestamp — that\'s what auditors want.',
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
    recap: [
      'Resource Graph = read-only query layer over your tenant\'s inventory. KQL is the language.',
      'Four tables carry compliance work: Resources, PolicyResources, SecurityResources, ResourceChanges.',
      'Reader RBAC on every sub you want to see; otherwise silent omission, not an error.',
      'Eventually consistent (~5–15 min); not for "did my fix just land?".',
      'Save queries + pin to dashboards — that\'s how quarterly audits stay fast.',
    ],
    talkingPoints: [
      `"For tenant-wide inventory questions we use Resource Graph + KQL — one query, all subs, sub-second."`,
      `"ARG needs Reader on every sub or it silently returns fewer rows. Always check your sub count first."`,
      `"ARG is eventually consistent — don't use it to verify a fix just landed."`,
      `"For 'what changed overnight,' the table is ResourceChanges — 90-day window."`,
      `"For policy compliance dashboards we save the query and pin to a dashboard — auditors get a fresh screenshot in seconds."`,
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
    intro: {
      plain: `Defender for Cloud (MDC) is the central security dashboard for
              Azure (and connected AWS/GCP/on-prem). It aggregates findings
              from Azure Policy audit-mode evaluations, scores your posture
              (the Secure Score), maps that posture to regulatory frameworks
              (MCSB, NIST, PCI, ISO), and offers per-resource fixes. Free
              tier = posture. Paid tiers = workload protection (Defender for
              Servers / Storage / SQL / etc.).`,
      mnemonic: 'CSPM = posture (free). CWP = workload protection (paid per plan).',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Defender for Cloud — CSPM, recommendations, Secure Score',
        plain: `Two product layers: the <strong>CSPM</strong> (Cloud Security
                Posture Management) layer is free and covers posture, secure
                score, and the regulatory compliance pane. The
                <strong>CWP</strong> (Cloud Workload Protection) layer is
                paid and gives per-service protection (anti-malware on
                Storage, query-level intelligence on SQL, EDR on Servers via
                MDE).`,
        detail: [
          '<b>Secure Score</b> — a rolling % of remediated recommendations. Fix one → score up; non-compliance appears → score down. Reported up the org weekly in most shops.',
          '<b>Recommendations</b> — each one is backed by an underlying Azure Policy. The panel shows the policy definition + failing resources + remediation steps + a "Fix" button where applicable.',
          '<b>Regulatory Compliance pane</b> — maps recommendations to MCSB, NIST 800-53, ISO 27001, PCI DSS, HIPAA, … Exportable as PDF + CSV. The "show me evidence for control X" view.',
          '<b>Plans (CWP tiers)</b>:',
          '  • <b>Defender for Servers Plan 1</b> ≈ next-gen AV only.',
          '  • <b>Defender for Servers Plan 2</b> ≈ <b>$15/server/month</b>; adds full EDR (MDE), ASR rules, vuln mgmt, file integrity monitoring, just-in-time VM access.',
          '  • <b>Defender for Storage</b> ≈ <b>$10/account/month</b>; malware scanning, anomaly detection.',
          '  • <b>Defender for SQL</b> per-DTU; query-level threat intel + vuln assessment.',
          '  • <b>Defender for Key Vault, App Service, Containers, Resource Manager, DNS</b> — each its own plan.',
          '<b>Workflow Automation (Logic Apps)</b> — auto-ticket new high-severity recommendations. Don\'t scan the dashboard manually every morning.',
          '<b>Continuous export</b> — alerts + recs → Log Analytics. The portal shows current state; LA history is how you spot trends.',
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
      '<b>Suppression ≠ exemption.</b> Suppression hides the rec from the dashboard. Exemption modifies the underlying policy assignment. <b>Auditors read exemptions, not suppressions.</b> Choose based on whether you want this on the audit trail.',
      '<b>MCSB compliance % ≠ Secure Score.</b> Different math, different denominator. Don\'t quote them as the same number in a meeting.',
      '<b>Defender for Cloud pricing</b>: free CSPM = posture + recommendations + Secure Score. Paid CWP = per-resource Defender plans. <b>Servers Plan 2 ≈ $15/server/month</b>; Storage ≈ $10/account/month; SQL is per-DTU. These are the procurement pushback numbers.',
      '<b>Foundational CSPM (free) vs Defender CSPM (paid)</b> — Defender CSPM adds attack-path analysis, agentless scanning for VMs, governance rules. Worth it for orgs > ~500 resources.',
      '<b>The "machines should have MDE installed" pattern</b> is almost always missing initiative assignment at the new MG, not a broken policy. Check the assignment scope before debugging policy logic.',
      'Set up <b>Workflow Automation</b> (Logic Apps) to open a ticket on every new high-severity rec. Don\'t scan the dashboard manually every morning — automate the inbox.',
      'Continuous-export Defender alerts and recommendations to <b>Log Analytics</b>. The portal only shows current state. KQL over the LA history is how you spot trends ("3 new public-storage recs this week — what changed?").',
      'Maintain a <code>compliance-runbooks/</code> repo: one markdown file per recommendation type with the standard remediation steps. Saves ~30 min per ticket and onboards new team members faster.',
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
    recap: [
      'Defender for Cloud = posture dashboard (CSPM, free) + workload protection plans (CWP, paid).',
      'Secure Score = rolling % of remediated recommendations. Reported up weekly.',
      'Each recommendation is backed by an underlying Azure Policy definition; click through to see it.',
      'Regulatory Compliance pane maps to MCSB + NIST + ISO + PCI + HIPAA — the audit-evidence view.',
      'Suppression hides recs from the dashboard; exemption modifies the policy assignment. Auditors read exemptions.',
    ],
    talkingPoints: [
      `"Defender for Cloud is our posture dashboard — free CSPM, paid CWP per plan."`,
      `"Secure Score going down means a Defender recommendation flipped non-compliant — we triage by severity."`,
      `"Each rec has an underlying Azure Policy; we can read what flipped and why."`,
      `"For Servers we're on Plan 2 — full EDR + ASR + automated investigation, not just AV."`,
      `"We exempt, not suppress — suppression hides from the dashboard but auditors check the policy state."`,
    ],
  },

  {
    id: 'defender-endpoint',
    group: 'Defender Stack',
    order: 2,
    title: 'Microsoft Defender for Endpoint (MDE)',
    subtitle: 'EDR on every server / VM / device — the on-host responder',
    cloud: 'azure',
    intro: {
      plain: `MDE is an EDR — Endpoint Detection and Response. Think of it as
              the security agent that lives <em>on each VM</em>, watching for
              malware, suspicious processes, lateral movement, and credential
              theft. Defender for Cloud is the posture dashboard for your
              whole estate; MDE is the on-host responder. The two products
              work together — MDE alerts flow up into Defender for Cloud and
              Sentinel — but they are licensed and admin\'d separately.`,
      mnemonic: 'MDC = posture (the dashboard). MDE = EDR (the agent on each host). P1 = AV only; P2 = full EDR.',
    },
    panels: [
      {
        cloud: 'azure',
        service: 'Defender for Endpoint — EDR vs CSPM, tiers, onboarding',
        plain: `Defender for Cloud (CSPM) tells you "this VM is missing a
                patch"; MDE (EDR) tells you "this VM just ran
                <code>mimikatz.exe</code> and contacted a known C2." Different
                layers; you need both. MDE deploys as a VM extension on
                Azure (auto-installed via a DINE policy) and onboards
                via Intune for laptops/phones.`,
        detail: [
          '<b>EDR vs CSPM</b> — different layers. CSPM (Defender for Cloud) is the posture/recommendations side. EDR (MDE) is on-host detection + response. <b>You need both.</b>',
          '<b>License tiers — P1 vs P2.</b> <b>P1</b> is next-gen AV only (no real EDR, no ASR, no automated investigation). <b>P2</b> is the full product — real EDR, ASR rules, auto-investigation+response, threat & vulnerability mgmt. <b>Procurement asks this constantly</b> — know the answer.',
          '<b>Deployment on Azure VMs</b> — the <code>MDE.Windows</code> / <code>MDE.Linux</code> extension. Auto-installed via a <b>DeployIfNotExists</b> Azure Policy (part of the Defender for Servers Plan 2 initiative).',
          '<b>Non-Azure VMs + devices</b> — onboard via Defender for Cloud multi-cloud connectors (AWS/GCP), or via <b>Intune</b> for laptops/phones.',
          '<b>Azure Arc-enabled servers</b> — on-prem / non-Azure VMs registered as Azure resources, then MDE deploys to them the same way.',
          '<b>MCSB ES-1 mapping</b> — "every server runs an EDR." This is the MCSB control compliance audits check for endpoint security.',
          '<b>MMA → AMA migration</b> — the old Microsoft Monitoring Agent (MMA) is <b>deprecated</b>. <b>Azure Monitor Agent (AMA)</b> is the future. If you inherit an estate with MMA, plan the migration now.',
          '<b>ASR (Attack Surface Reduction) rules</b> — block common attack patterns (Office macros, child processes, etc.). Powerful but tune to avoid false positives — start in <i>audit</i>, promote to <i>block</i>.',
          '<b>Alert flow</b> — MDE alert → Defender for Cloud Security Alerts → optional Sentinel for SIEM/SOAR. Compliance team usually consumes from Defender for Cloud, not the MDE portal directly.',
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
          { token: '"scope": "/providers/Microsoft.Management/managementGroups/..."', type: 'keyword', note: 'Azure resource-ID path format for a Management Group. The prefix `/providers/Microsoft.Management/managementGroups/` is fixed; only the final segment is your MG name.' },
          { token: '"identity": { "type": "SystemAssigned" }', type: 'keyword', note: 'Azure managed-identity schema on an assignment. Valid types: "SystemAssigned" | "UserAssigned" | "None". Required for DINE/Modify effects.' },
          { token: '"policyDefinitionId"', type: 'keyword', note: 'Azure Policy assignment schema. References a policy or initiative by ARM resource ID. For built-in initiatives the prefix is `/providers/Microsoft.Authorization/policySetDefinitions/`.' },
          { token: '"Workloads"', type: 'user', note: 'Your Management Group name — pick from your MG hierarchy.' },
          { token: '"Defender for Endpoint auto-onboard"', type: 'user', note: 'Your label for the assignment. Shows in the Portal.' },
        ],
      },
    ],
    fieldNotes: [
      '<b>MDE P1 vs P2</b>: P1 is AV only — no real EDR, no ASR, no auto-investigation. P2 is the full product. Procurement asks constantly; the right answer is almost always P2 for servers.',
      '<b>The "MDE not installed" pattern</b> is almost always missing initiative assignment at the new MG, not a broken policy. Check the assignment scope before debugging the policy logic.',
      '<b>MMA agent is deprecated.</b> AMA (Azure Monitor Agent) is the future. If you inherit an estate with MMA, plan the migration now — it will break in 2026 otherwise.',
      'For Arc-enabled servers, the onboarding path is the same DINE policy — but the VM must be registered with Arc first. Reader RBAC + Connected Machine Onboarding role for the bootstrap.',
      '<b>ASR rules</b>: always start in <code>audit</code> mode for at least 1 week before flipping to <code>block</code>. Production-breaking false positives are the rule, not the exception, on the more aggressive ASR rules.',
      '<b>Defender for Cloud surfaces MDE alerts</b> as Security Alerts — the compliance team should consume from there, not directly from the MDE portal. The MDE portal is the SOC\'s tool.',
      'Onboarding token (the EDR config that ties an endpoint to your tenant) lives in MDE settings. Rotate it if you suspect compromise; new VMs auto-pick up the current token via the DINE policy.',
      '<b>P2 also includes vulnerability management</b> (TVM). If your team needs a CVE/patch dashboard, you already have one — don\'t buy a third-party.',
      '<b>XDR vs EDR</b> — MDE is the EDR. Microsoft 365 Defender bundles MDE + MDI + MDO + MDA + Defender for Cloud Apps into an XDR (cross-domain correlation). XDR is mostly an analyst-experience layer, not new detection logic.',
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
    recap: [
      'MDE is an EDR — the on-host security agent. Different from Defender for Cloud (the posture dashboard).',
      'P1 = next-gen AV only. P2 = full EDR + ASR + auto-investigation + TVM. Compliance wants P2.',
      'Auto-deploys on Azure VMs via a DINE policy in the "Configure MDE" initiative.',
      'MMA agent is deprecated; AMA is the future. Plan the migration if you inherit MMA.',
      'ASR rules: start in audit, promote to block after a week of clean data.',
    ],
    talkingPoints: [
      `"MDE is the EDR — Defender for Cloud is the posture dashboard. Different products, both needed."`,
      `"We're on P2 across servers. P1 is just AV; P2 gets us EDR + ASR + auto-investigation + vuln mgmt."`,
      `"MDE auto-onboards via a DINE policy — when a new sub shows up unhealthy, check the assignment scope first."`,
      `"MCSB ES-1 — endpoint security — is satisfied by P2 across every server."`,
      `"MMA agent is end-of-life; we're on AMA. The migration story is unavoidable for any inherited estate."`,
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
    intro: {
      plain: `Terraform is how compliance teams declare cloud configuration as
              code. Instead of clicking in a console, you write a text file
              describing what you want, run "terraform plan" to see what
              would change, then "terraform apply" to make it real. It works
              for both AWS and Azure (and 1,000+ other things) via
              providers. For your job: you\'ll READ Terraform written by
              others 10× more often than you\'ll write it from scratch —
              focus on reading.`,
      mnemonic: 'Terraform = "I want X." Provider = "I know how to make X happen on cloud Y." State = "Here\'s what I\'ve already made."',
    },
    panels: [
      {
        cloud: 'tf',
        service: 'Terraform language (HCL) basics',
        plain: `HCL is Terraform\'s configuration language. The four building
                blocks you\'ll see in 90% of files: providers (which cloud),
                resources (what to create), variables (inputs), outputs
                (what to expose). Plus modules (reusable bundles) and state
                (what\'s already deployed).`,
        detail: [
          '<b>provider</b> — declares which cloud and version. Configured once per file or once per module.',
          '<b>resource</b> — the noun you\'re creating. Type + local name + body. Example: <code>resource "aws_iam_policy" "deny_regions" { ... }</code>.',
          '<b>variable</b> — input. Set via <code>terraform.tfvars</code>, env var <code>TF_VAR_*</code>, or <code>-var</code> flag.',
          '<b>output</b> — value Terraform exposes after apply (e.g., the policy ARN). Other modules can consume outputs.',
          '<b>module</b> — a folder containing its own .tf files. Call it from a parent module like a function: <code>module "scp" { source = "./scp"; ... }</code>.',
          '<b>state</b> — the JSON file Terraform writes after apply, mapping resources to real cloud IDs. Stored remotely (S3 + DynamoDB lock, or Azure Storage + blob lease, or Terraform Cloud).',
          '<b>plan / apply / destroy</b> — the lifecycle. <code>plan</code> shows the diff; <code>apply</code> executes it; <code>destroy</code> removes everything.',
          '<b>drift</b> — when someone clicks in the console and changes a resource Terraform manages. Next <code>plan</code> shows the unexpected diff. You either revert via apply or import the new state.',
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
          { token: 'provider "aws"', type: 'keyword', note: 'Terraform top-level block. The string after `provider` is the provider name (here `aws`, from hashicorp/aws). Provider list: registry.terraform.io.' },
          { token: 'resource "aws_organizations_policy"', type: 'keyword', note: 'AWS provider resource type. The naming convention `aws_<service>_<thing>` is fixed by the provider. Full list: registry.terraform.io/providers/hashicorp/aws/latest/docs.' },
          { token: 'resource "aws_organizations_policy_attachment"', type: 'keyword', note: 'AWS provider resource type. Define + attach are two separate resources in the aws provider. Docs: hashicorp/aws → aws_organizations_policy_attachment.' },
          { token: 'type = "SERVICE_CONTROL_POLICY"', type: 'keyword', note: 'AWS Organizations enum. Other valid values: "TAG_POLICY", "BACKUP_POLICY", "AISERVICES_OPT_OUT_POLICY". Defined by AWS Organizations API.' },
          { token: 'jsonencode({ ... })', type: 'keyword', note: 'Terraform built-in function — turns an HCL map into a JSON string. Reference: terraform.io/language/functions/jsonencode.' },
          { token: 'var.allowed_regions', type: 'keyword', note: 'Terraform expression syntax for reading a variable. `var.<name>` is fixed; `<name>` matches your `variable` block.' },
          { token: 'aws_organizations_policy.deny_regions.id', type: 'keyword', note: 'Terraform reference expression — `<resource_type>.<local_name>.<attr>`. Resource type from the provider; local name and attribute name from your code.' },
          { token: '"deny_regions" / "to_workloads" / "allowed_regions"', type: 'user', note: 'Your local Terraform names — any valid identifier. Used to reference the resource elsewhere in the module.' },
          { token: '"ou-abcd-1234workloads"', type: 'user', note: 'Your AWS Organizations OU ID — looked up in the AWS Organizations console or via `aws organizations list-organizational-units-for-parent`. AWS-generated, but which one you pick is your call.' },
          { token: '"DenyNonAllowedRegions" / "us-east-1" / "us-west-2"', type: 'user', note: 'Your choices — the policy name, and the regions you allow. Region codes are AWS-defined (list at docs.aws.amazon.com/general); which ones to allow is your governance decision.' },
        ],
      },
      {
        cloud: 'azure',
        service: 'Terraform on Azure (azurerm provider)',
        plain: `Same language, different provider. The <code>azurerm</code>
                provider knows how to create Azure resources. You\'ll see
                <code>azurerm_management_group</code>, <code>azurerm_subscription</code>,
                <code>azurerm_policy_definition</code>, <code>azurerm_policy_assignment</code>
                as the governance staples.`,
        detail: [
          '<b>azurerm provider</b> — auth via Azure CLI (dev), service principal (CI/CD), or managed identity (Azure-hosted runners).',
          '<b>azurerm_management_group_policy_assignment</b> — assign a policy or initiative at a MG. The most common governance resource.',
          '<b>azurerm_policy_definition</b> + <b>azurerm_policy_set_definition</b> — custom policy and custom initiative.',
          '<b>State backend</b> — usually Azure Storage with blob lease for locking. Defined in a <code>backend "azurerm"</code> block.',
          '<b>Modules to know</b> — <code>terraform-azurerm-caf-enterprise-scale</code>, <code>terraform-azurerm-lz-vending</code>. You\'ll consume more than you write.',
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
          { token: 'provider "azurerm"', type: 'keyword', note: 'Terraform provider (hashicorp/azurerm). The empty `features {}` block is required even when unused. Docs: registry.terraform.io/providers/hashicorp/azurerm.' },
          { token: 'data "azurerm_policy_set_definition"', type: 'keyword', note: 'Terraform `data` block — read-only lookup. `azurerm_policy_set_definition` is the azurerm provider\'s data source for finding built-in or custom initiatives. Docs: hashicorp/azurerm → data: azurerm_policy_set_definition.' },
          { token: 'resource "azurerm_management_group_policy_assignment"', type: 'keyword', note: 'azurerm provider resource type for assigning a policy/initiative at a Management Group. Sibling resources: azurerm_subscription_policy_assignment, azurerm_resource_group_policy_assignment.' },
          { token: 'policy_definition_id / management_group_id / display_name / enforce', type: 'keyword', note: 'Required/optional arguments on this resource type. Names are provider-defined; see the resource\'s docs page for the full list.' },
          { token: '"Microsoft cloud security benchmark"', type: 'keyword', note: 'The exact display name of the built-in MCSB initiative as Microsoft publishes it. Match strings exactly — Terraform doesn\'t fuzzy-match.' },
          { token: '"/providers/Microsoft.Management/managementGroups/workloads"', type: 'keyword', note: 'Azure resource-ID format for a Management Group. The `/providers/Microsoft.Management/managementGroups/` prefix is fixed; only the final segment (the MG name) is yours.' },
          { token: 'data.azurerm_policy_set_definition.mcsb.id', type: 'keyword', note: 'Terraform reference into a data-source result. Syntax: `data.<type>.<local_name>.<attr>`. Type from provider; local name from your code.' },
          { token: '"mcsb-workloads" / "MCSB - Workloads" / "mcsb" / "mcsb_at_workloads"', type: 'user', note: 'Your local names + display labels. Any identifiers — only used inside Terraform and in the Azure Portal.' },
          { token: 'enforce = true', type: 'user', note: 'Your choice. `true` enforces the assignment (effects apply); `false` is the "audit-mode equivalent" — useful for testing.' },
        ],
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
      '<code>terraform plan</code> ≠ <code>terraform apply</code>. Plan reads state from the backend; if state is stale, plan can lie. Run <code>terraform refresh</code> (or <code>plan -refresh-only</code>) first when you suspect drift.',
      'State files can hold <b>secrets</b> — especially after <code>terraform import</code> of resources with sensitive properties (Key Vault secrets, RDS passwords, KMS material). Treat state as secret. Encrypt the backend; restrict access.',
      'Modules must <b>pin to versions</b>: <code>source = "git::...?ref=v1.4.2"</code>. Never pin to <code>main</code> in production — upstream rev moves and your apply changes behavior.',
      '<b><code>for_each</code> vs <code>count</code></b>: <code>count</code> reorders destroys when an item is removed mid-list (taints everything after). <code>for_each</code> with a map keeps identity stable. Prefer <code>for_each</code>; reserve <code>count</code> for "0 or 1" toggles.',
      'CI provider auth: <b>OIDC federation</b> (GitHub Actions → AWS via <code>aws-actions/configure-aws-credentials</code>, → Azure via federated credentials on a service principal) beats long-lived secrets. The 2026 default.',
      '<b>Lock the state file</b> during apply: <code>-lock-timeout=10m</code>. Concurrent applies destroy state. The backend (S3+DynamoDB or Azure Storage with blob lease) should enforce this — verify it is.',
      '<b>Resource Graph + Terraform import</b>: query inventory with KQL, generate Terraform <code>import</code> blocks programmatically. The modern path to onboard pre-existing Azure resources into Terraform management.',
      'For Azure Policy in Terraform, prefer <b>initiative assignment</b> (one resource) over per-policy assignments (N resources). Fewer state objects, faster plan, easier rollback.',
      '<b>State recovery</b>: if state corrupts, restore from backend versioning (S3 object versions, Azure Storage blob versions) — minutes. <code>terraform import</code> from scratch — hours to days. Make sure backend versioning is on.',
      '<b>The compliance value of Terraform</b>: every guardrail change is a PR, every PR has a diff, every diff has an approver, every apply has a log. That\'s the audit trail. Don\'t click-ops Azure Policy in production.',
    ],
    handsOn: {
      intro: 'Two reading exercises on the Terraform examples above. The skill is reading config that someone else wrote.',
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
      ],
      selfCheck: [
        'I can name the four core Terraform building blocks: provider, resource, variable, output.',
        'I know plan shows the diff; apply executes it; state records reality.',
        'I know data is a read-only lookup and resource is owned by Terraform.',
        'I would never edit state by hand; the remote backend handles locking.',
        'I read Terraform 10× more often than I write it from scratch.',
      ],
    },
    recap: [
      'Four building blocks: provider, resource, variable, output. Plus modules and state.',
      'plan shows the diff before you apply; apply executes it; state records reality.',
      'On AWS use the <code>aws</code> provider; on Azure use <code>azurerm</code>. Same language, different vocabulary.',
      'Drift = console clicks happened. Detect via <code>plan -refresh-only</code>; fix by re-applying or importing.',
      'You\'ll READ Terraform 10× more than you\'ll write it from scratch.',
    ],
    talkingPoints: [
      `"Our governance is in Terraform — SCPs, Azure Policy assignments, MG hierarchy, all of it. Console changes are drift."`,
      `"plan output is the source of truth for what's about to change — I review it before apply."`,
      `"State is in remote backend with locking; we never edit it by hand."`,
      `"Most of our day is reading existing modules, opening PRs against them, not greenfield Terraform."`,
      `"For Azure landing zone work the community modules — caf-enterprise-scale, lz-vending — do the heavy lifting."`,
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
