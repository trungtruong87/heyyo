// Foundations — Phase 1 of the 14-day plan (Days 1–5).
//
// Each entry is one day. The shape is intentionally rich so the renderer can
// be dumb. Plain-English ("aunt") layer first, working-engineer layer second.
// See /Users/trungtruong/.claude/plans/i-am-going-to-polymorphic-hopper.md
// for the design rationale.

export const FOUNDATIONS = [

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    num: 'Day 1',
    title: 'Org structure',
    subtitle: 'How AWS Organizations + OUs map to Azure Management Groups + Subscriptions',
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
          '<b>Inheritance</b> — controls attached to an OU apply to every account inside it, recursively. The smallest blast radius wins; if Prod has a stricter SCP than Workloads, both apply.',
          '<b>Service control policies (SCPs)</b> — covered Day 2. They attach to root, OU, or account, and set the maximum permissions allowed.',
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
          '<b>Inheritance</b> — Azure Policy assigned at a MG applies to every sub beneath it. Lower scopes can ADD more policy but cannot weaken what was inherited.',
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
    handsOn: {
      prompt: `Sketch your imagined org tree on paper. 1 root, 2-4 OUs/MGs (e.g.,
               Sandbox, NonProd, Prod, Security), and 1-2 leaf accounts/subs per
               branch. Then ask: if I attach a "deny public storage" rule at the
               Workloads OU/MG, which leaves does it cover? Which does it MISS?`,
      artifactKind: 'note',
      template: `My org tree:\n\nRoot\n├── \n├── \n└── Workloads\n    ├── NonProd\n    └── Prod\n\nIf I attach a rule at Workloads:\n - It covers: \n - It misses: `,
    },
    recap: [
      'Both clouds use a tree: Company → folders → accounts/subs.',
      'AWS calls the folders OUs and lives inside AWS Organizations. Azure calls them Management Groups.',
      'Rules attached high in the tree flow DOWN. Rules at a leaf apply only to that leaf.',
      'Lowest blast radius wins: if a child has a stricter rule, both parent and child apply (you cannot "loosen" via a child).',
      'You will work the tree daily — every other concept (SCPs, Azure Policy, Control Tower, Defender) hangs off it.',
    ],
    talkingPoints: [
      `"Our governance is hierarchical — Org → OU → account on AWS, Tenant Root → MG → subscription on Azure."`,
      `"To roll a guardrail out broadly we attach it high; to scope it narrowly we attach it low."`,
      `"Inheritance is additive — a subscription cannot weaken a policy inherited from above."`,
      `"New accounts/subs get vended into a specific OU/MG so the right baseline applies on day one."`,
      `"If something is missing a control, first question is: what OU/MG is it in?"`,
    ],
    explainBackKey: 'fnd1_org',
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 2,
    num: 'Day 2',
    title: 'Guardrails',
    subtitle: 'AWS SCPs ↔ Azure Policy — the rules that keep the tree honest',
    cloud: 'both',
    intro: {
      plain: `Guardrails are rules that say "you literally cannot do X here." They
              live above ordinary user permissions. Even an admin can't bypass them.
              Both clouds have a guardrail layer; AWS calls it Service Control
              Policies (SCPs), Azure calls it Azure Policy. They look different
              — JSON shapes are not the same — but they do the same job: stop
              non-compliant actions before they happen.`,
      mnemonic: `SCP = "Stop, Can't Proceed." Azure Policy effects = A·D·A·M·D·A
                 (Audit · Deny · Append · Modify · DeployIfNotExists · AuditIfNotExists).`,
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
          '<b>SCP vs IAM Policy</b> — <i>this is the question your lead will ask you.</i> SCPs are GUARDRAILS that limit what the account can ever do. IAM policies are PERMISSIONS that grant specific users/roles specific actions. Both must allow; either can deny.',
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
      },
      {
        cloud: 'azure',
        service: 'Azure Policy',
        plain: `Azure Policy is broader than SCPs. It can DENY (like SCP), but it
                can also AUDIT (record non-compliance), MODIFY (auto-fix tags),
                APPEND (add fields), and DEPLOY-IF-NOT-EXISTS (auto-create a
                missing log setting). You write a policy definition (JSON), then
                ASSIGN it to a scope (Management Group, subscription, or
                resource group). The scope determines blast radius.`,
        detail: [
          '<b>Six effects (memorize):</b> <code>Audit</code>, <code>Deny</code>, <code>Append</code>, <code>Modify</code>, <code>DeployIfNotExists</code>, <code>AuditIfNotExists</code>. Some legacy: <code>Disabled</code>, <code>EnforceOPAConstraint</code>, <code>Manual</code>.',
          '<b>Definition vs Assignment:</b> the JSON is a <i>definition</i>. It does nothing until you <i>assign</i> it to a scope.',
          '<b>Initiative</b> — a bundle of related policy definitions. Microsoft Cloud Security Benchmark (MCSB) is itself a built-in initiative.',
          '<b>Exemption</b> — time-bound waiver for a specific resource or scope. Lets you say "this storage account is grandfathered until 2026-12-31."',
          '<b>Inheritance:</b> a policy assigned at a MG flows down to every sub. Subscription-level assignments add to (never weaken) MG-level ones.',
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
      },
    ],
    diagram: `         IAM / RBAC                  SCP / Azure Policy
        (what you CAN do)        (what's POSSIBLE in this account/sub)
              │                              │
              ▼                              ▼
         "I want to                     "But is it
         create this S3                 even allowed
         bucket"                        in this OU?"
              │                              │
              └──────── BOTH must say YES ───┘
                            │
                       action runs`,
    handsOn: {
      prompt: `Two micro-exercises (10 min each):

(1) AWS SCP — open the SCP + IAM lab bench (link below). Pick the "Deny non-allowed regions" template. Trace, in the decision tree, what happens when an admin tries to <code>ec2:RunInstances</code> in <code>eu-west-1</code>. Why does the SCP deny it before IAM is even consulted?

(2) Azure Policy — read the example above. Identify: the <i>field</i> being checked, the <i>operator</i>, the <i>effect</i>. If you wanted this policy in audit-only mode (so it logs but doesn't block), what would you change?`,
      artifactKind: 'note',
      template: `Q1: Why did the SCP deny eu-west-1 before IAM was checked?\n\n\nQ2: To audit-only the Azure Policy, change <effect> from "deny" to "audit".\n   What field is the policy checking? \n   What operator? `,
      labLinks: [
        { route: '/practice/scp', label: 'Open SCP + IAM lab bench' },
        { route: '/practice/azure-policy', label: 'Open Azure Policy lab bench' },
      ],
    },
    recap: [
      'SCPs cap what an AWS account can ever do; they don\'t grant anything.',
      'IAM grants. SCP limits. Both must allow; either can deny.',
      'Azure Policy has six effects; SCPs have only Allow and Deny.',
      'Azure Policy is a definition (JSON) plus an assignment (scope). Neither alone does anything.',
      'Initiatives bundle policies; MCSB is the built-in security baseline initiative.',
    ],
    talkingPoints: [
      `"SCPs are deny-only guardrails on AWS — they cap what's possible regardless of IAM."`,
      `"Azure Policy is broader: it can audit, deny, modify, or auto-deploy missing settings — six effects total."`,
      `"For a new control I prefer Audit first, watch for false positives, then promote to Deny."`,
      `"Exemptions on Azure Policy let us grandfather specific resources without dropping the policy."`,
      `"If a deploy fails with 'RequestDisallowedByPolicy' (Azure) or 'AccessDenied because of an explicit deny in an SCP' (AWS), the guardrail did its job."`,
    ],
    explainBackKey: 'fnd2_guardrails',
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 3,
    num: 'Day 3',
    title: 'Detection',
    subtitle: 'AWS Config Rules ↔ Azure Policy (audit) + Defender for Cloud + MCSB',
    cloud: 'both',
    intro: {
      plain: `Yesterday's guardrails BLOCK bad things. Today's tools WATCH for bad
              things — the stuff that slipped through, or that was created before
              the guardrail existed. Both clouds run continuous evaluators that
              check every resource against a set of rules and flag the failures.
              You then either auto-fix them or open a ticket.`,
      mnemonic: 'Block = guardrail. Watch = detection. Both layers are needed.',
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
      },
      {
        cloud: 'azure',
        service: 'Azure Policy (audit) + Defender for Cloud + MCSB',
        plain: `Azure splits the same job across three tools that work together.
                Azure Policy in <i>audit</i> mode does the rule-checking. Defender
                for Cloud is the dashboard that aggregates findings, scores your
                posture, and recommends fixes. Microsoft Cloud Security
                Benchmark (MCSB) is the built-in baseline of "what should be
                checked" — a curated initiative of ~250 policies aligned to
                CIS and NIST.`,
        detail: [
          '<b>Azure Policy audit</b> — same definition shape as Day 2, but with <code>"effect": "audit"</code>. Logs non-compliance instead of blocking.',
          '<b>Defender for Cloud</b> — central security dashboard. Two layers: free (Foundational CSPM, secure score) and paid (CWP — Defender for Servers/Storage/SQL/etc.).',
          '<b>Secure Score</b> — a percentage based on which Defender recommendations you\'ve fixed. Each recommendation maps to one or more Azure Policy assignments.',
          '<b>Microsoft Cloud Security Benchmark (MCSB)</b> — Azure\'s built-in baseline initiative. Assign it once at Tenant Root or at a top MG and you get a continuous compliance check across hundreds of controls.',
          '<b>Defender for Endpoint (MDE)</b> — separate but related: an EDR for VMs and devices. Surfaces alerts back into Defender for Cloud and Sentinel.',
          '<b>Compliance pane</b> — Defender for Cloud → Regulatory Compliance shows your current state mapped to MCSB, NIST 800-53, ISO 27001, etc.',
        ],
        example: `// Audit-mode Azure Policy
{
  "policyRule": {
    "if": {
      "field": "type",
      "equals": "Microsoft.Compute/virtualMachines"
    },
    "then": {
      "effect": "audit",
      "details": {
        "type": "Microsoft.Compute/virtualMachines/extensions",
        "name": "MDE.Windows"
      }
    }
  }
}`,
      },
    ],
    diagram: `   Resources change → Config / Policy records the change
                              │
                              ▼
                   Rules / Policies evaluate
                              │
                  ┌───────────┴────────────┐
                  ▼                        ▼
            COMPLIANT               NON_COMPLIANT
           (do nothing)            ┌──────┴──────┐
                                   ▼             ▼
                              Auto-remediate   Open ticket / page oncall`,
    handsOn: {
      prompt: `Two parts (5 min each):

(1) Read the custom Config rule code above. What would you change to make it
require BOTH "Owner" AND "CostCenter" tags?

(2) Open Defender for Cloud's documentation (linked below). For one
recommendation of your choice ("Storage accounts should disable public network
access" is a good one), trace it back to: which underlying Azure Policy
definition fires it, and which MCSB control it maps to.`,
      artifactKind: 'note',
      template: `Q1: To require BOTH Owner AND CostCenter tags:\n  - Add check: \n  - New compliance condition: \n\nQ2: Recommendation:\n  - Underlying policy definition:\n  - MCSB control:`,
      labLinks: [
        { route: '/practice/azure-policy', label: 'Azure Policy lab bench' },
      ],
    },
    recap: [
      'AWS Config records resource state; Config Rules check it against criteria.',
      'Managed rules ≈ 250 ready-to-go checks. Custom rules = your own Lambda.',
      'Azure does the same job across Azure Policy (audit) + Defender for Cloud (dashboard) + MCSB (baseline initiative).',
      'Secure Score = % of Defender recommendations remediated.',
      'Defender for Endpoint is the EDR layer; it feeds findings into Defender for Cloud.',
    ],
    talkingPoints: [
      `"Config records every resource change; Config Rules turn those records into compliance verdicts."`,
      `"On Azure we do the same thing with Azure Policy in audit mode, surfaced through Defender for Cloud."`,
      `"MCSB is our built-in security baseline initiative — we assign it once at the MG root and get continuous compliance scoring."`,
      `"Secure Score going down means a Defender recommendation flipped non-compliant — we triage by severity."`,
      `"Custom Config rules are Lambdas. Most of the time, a managed rule already exists — check the catalog first."`,
    ],
    explainBackKey: 'fnd3_detection',
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 4,
    num: 'Day 4',
    title: 'Landing Zone & Control Tower',
    subtitle: 'AWS Control Tower ↔ Azure subscription vending + initiatives',
    cloud: 'both',
    intro: {
      plain: `When a new team needs cloud, you don't hand them a blank account
              and hope. You hand them a pre-configured shell — the right OU/MG,
              baseline guardrails, logging on, identity wired up, network
              defaults set. That pre-configured shell is called a Landing Zone.
              AWS Control Tower automates building and maintaining the AWS
              version. Azure has no single "Control Tower" product; it uses
              subscription-vending pipelines plus MCSB initiative assignments
              to do the same job.`,
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
      {
        cloud: 'azure',
        service: 'Azure subscription vending + initiatives at MG',
        plain: `Azure does this without a single product. Most enterprises build
                a "subscription vending" pipeline — usually Terraform or Bicep
                — that creates a new subscription, places it in the right
                Management Group, and assigns the baseline policy initiatives
                (MCSB plus any company-specific ones). The MG hierarchy + the
                inherited initiative assignments together form the Azure
                landing zone.`,
        detail: [
          '<b>Enterprise-Scale Landing Zone (ESLZ)</b> — Microsoft\'s reference architecture, also called CAF (Cloud Adoption Framework) Landing Zones. It defines a standard MG hierarchy: <code>Tenant Root → Top → Platform / Landing Zones / Sandbox / Decommissioned</code>.',
          '<b>Subscription vending</b> — typically a Terraform module (community: <code>terraform-azurerm-lz-vending</code>). It creates the sub, places it in MG, assigns RBAC, applies tags.',
          '<b>Policy assignments at MG root</b> — assign MCSB and company custom initiatives at the top of the hierarchy so all subs inherit. This is how baseline applies on day one.',
          '<b>Mapping to AWS:</b> ESLZ ≈ AWS Landing Zone. Vending pipeline ≈ Account Factory. MCSB at root ≈ mandatory SCPs at root. There is no Azure direct equivalent of "proactive controls" — Azure Policy can deny at deploy time but there\'s no separate Hook concept.',
          '<b>Defender for Cloud onboarding</b> — usually part of the vending: enable Defender plans on the new sub so secure score and compliance track from day one.',
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
    diagram: `Same mental model on both clouds:

  Person needs cloud space
          │
          ▼
  ┌────────────────────────┐
  │   Vending workflow     │  ← AWS: Control Tower Account Factory
  │                        │     Azure: Terraform sub-vending pipeline
  └─────────┬──────────────┘
            ▼
  New account / sub lands in pre-chosen OU/MG
            │
            ▼
  Baseline guardrails inherit automatically
  (SCPs, Config rules / Azure Policy initiatives)
            │
            ▼
  Logging + identity + Defender pre-wired
            │
            ▼
       Hand to the team`,
    handsOn: {
      prompt: `One conceptual exercise:

You're asked to add a new "preventive" control: deny IAM users (force everyone
to use IAM Identity Center / SSO). On AWS, what's the artifact, and where do
you attach it? On Azure, what's the closest equivalent (hint: Entra ID +
Azure Policy), and is it "preventive" in the same sense?`,
      artifactKind: 'note',
      template: `AWS:\n  Artifact type: \n  Where to attach: \n  Why this is "preventive": \n\nAzure equivalent:\n  Identity tool: \n  Policy effect to use: \n  Is it "preventive" in the same sense? `,
    },
    recap: [
      'Landing Zone = the pre-secured, pre-configured environment new teams land in.',
      'AWS Control Tower automates LZ creation; Account Factory is the vending UI.',
      'Three control types: P-D-P — Preventive (SCP), Detective (Config rule), Proactive (CFN Hook).',
      'Azure has no single Control Tower; it stitches together MG hierarchy + sub-vending pipelines + MCSB.',
      'AFT (Account Factory for Terraform) is the Terraform-driven extension on AWS; the Azure side IS Terraform end-to-end.',
    ],
    talkingPoints: [
      `"Our landing zone is the standard environment teams get on day one — pre-applied SCPs, logging, identity, baseline Defender."`,
      `"On AWS we use Control Tower Account Factory; on Azure we use a Terraform subscription-vending pipeline."`,
      `"Control types are preventive, detective, proactive — SCPs, Config rules, CFN Hooks respectively."`,
      `"Mandatory CT controls are always on; strongly-recommended and elective are opt-in per OU."`,
      `"Azure Policy initiatives at the MG root give us the equivalent of mandatory baseline controls."`,
    ],
    explainBackKey: 'fnd4_landing_zone',
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 5,
    num: 'Day 5',
    title: 'Terraform fundamentals',
    subtitle: 'Just enough HCL + state + modules to read what your team writes',
    cloud: 'tf',
    intro: {
      plain: `Terraform is how compliance teams declare cloud configuration as
              code. Instead of clicking in a console, you write a text file
              describing what you want, run "terraform plan" to see what would
              change, then "terraform apply" to make it real. It works for
              both AWS and Azure (and 1,000+ other things) via providers.
              For your job: you'll READ Terraform written by others 10× more
              often than you'll write it from scratch — focus on reading.`,
      mnemonic: 'Terraform = "I want X." Provider = "I know how to make X happen on cloud Y." State = "Here\'s what I\'ve already made."',
    },
    panels: [
      {
        cloud: 'tf',
        service: 'Terraform language (HCL) basics',
        plain: `HCL is Terraform's configuration language. The four building
                blocks you'll see in 90% of files: providers (which cloud),
                resources (what to create), variables (inputs), outputs (what
                to expose). Plus modules (reusable bundles) and state (what's
                already deployed).`,
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
      },
      {
        cloud: 'azure',
        service: 'Terraform on Azure (azurerm provider)',
        plain: `Same language, different provider. The <code>azurerm</code>
                provider knows how to create Azure resources. You'll see
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
    handsOn: {
      prompt: `Read the AWS and Azure examples above carefully. Then answer:

(1) In the AWS example, where is the policy ATTACHED, and what would happen
if you removed the <code>aws_organizations_policy_attachment</code> resource
and re-applied?

(2) In the Azure example, what's the difference between
<code>data "azurerm_policy_set_definition"</code> and a
<code>resource "azurerm_policy_set_definition"</code>? When would you use
each?`,
      artifactKind: 'note',
      template: `Q1: \n  - Attached at: \n  - If I remove the attachment resource and re-apply: \n\nQ2: \n  - "data" block means: \n  - "resource" block means: \n  - I'd use "data" when: \n  - I'd use "resource" when: `,
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
    explainBackKey: 'fnd5_terraform',
  },

];

// Quick lookup helpers
export function foundationById(id) {
  return FOUNDATIONS.find(f => f.id === Number(id)) || null;
}
