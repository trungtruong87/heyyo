// Decision trees — "when do I reach for X vs Y?" — the kind of question that
// comes up in design review and you need to answer in 30 seconds without
// hand-waving. Each tree renders as a question stack that ends in a leaf
// with a one-line answer + reasoning.

export const DECISIONS = [

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'scp-vs-iam',
    title: 'SCP vs IAM Policy vs Permission Boundary',
    cloud: 'aws',
    intro: `These three live in the same neighborhood and confuse new compliance
            engineers constantly. The trick: they answer different questions.`,
    branches: [
      {
        q: 'Are you trying to GRANT a permission?',
        yes: { leaf: 'IAM Policy.',
               why: 'IAM policies are the only thing that grants. SCPs and Permission Boundaries can only restrict.' },
        no: 'Are you trying to set a per-USER cap (different cap for different users in the same account)?',
      },
      {
        q: 'Are you trying to set a per-USER cap (different cap for different users in the same account)?',
        yes: { leaf: 'Permission Boundary.',
               why: 'Boundaries attach to a user/role and cap WHAT THAT PRINCIPAL can do. Different from account-wide.' },
        no: 'Are you trying to set an ACCOUNT-WIDE cap that no admin can bypass?',
      },
      {
        q: 'Are you trying to set an ACCOUNT-WIDE cap that no admin can bypass?',
        yes: { leaf: 'SCP, attached at OU or root.',
               why: 'SCPs cap an entire account. Even an account-level admin cannot bypass an SCP. This is the right tool for org-wide policy.' },
        no: { leaf: 'Re-check your goal — none of these fit.',
              why: 'You may be looking for a resource policy (S3 bucket policy, KMS key policy) or a service-specific control.' },
      },
    ],
    examples: [
      { case: '"Block all access to non-allowed regions org-wide"', answer: 'SCP at root. NotAction global services + Condition on aws:RequestedRegion.' },
      { case: '"Give the data team the ability to create roles, but only roles weaker than X"', answer: 'Permission Boundary on the data team\'s role-creator role.' },
      { case: '"This Lambda needs to read S3"', answer: 'IAM Policy attached to the Lambda execution role.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'azure-policy-effect',
    title: 'Which Azure Policy effect should I use?',
    cloud: 'azure',
    intro: `Six effects. Pick wrong and you either don\'t prevent what you wanted
            to prevent, or you accidentally break a deploy. Mnemonic: A·D·A·M·D·A.`,
    branches: [
      {
        q: 'Should this BLOCK the deploy entirely if the condition matches?',
        yes: { leaf: 'Deny.',
               why: 'The strongest effect. Use for "must-not" rules: public storage, untagged resources, non-allowed locations.' },
        no: 'Do you want to LOG non-compliance but still allow the deploy?',
      },
      {
        q: 'Do you want to LOG non-compliance but still allow the deploy?',
        yes: { leaf: 'Audit.',
               why: 'Logs as non-compliant in the Policy compliance dashboard. Use during rollout — start with Audit, watch for false positives, then promote to Deny.' },
        no: 'Do you need to AUTO-CREATE a missing companion resource (e.g., diagnostic settings)?',
      },
      {
        q: 'Do you need to AUTO-CREATE a missing companion resource (e.g., diagnostic settings)?',
        yes: { leaf: 'DeployIfNotExists (DINE).',
               why: 'Triggers an ARM deployment when the related resource is missing. Requires a roleDefinitionIds in the policy and Managed Identity on the assignment.' },
        no: 'Do you need to AUDIT whether a companion resource exists, but not deploy it?',
      },
      {
        q: 'Do you need to AUDIT whether a companion resource exists, but not deploy it?',
        yes: { leaf: 'AuditIfNotExists.',
               why: 'Logs non-compliance based on the absence of a related resource. Use when the deploy itself is owned by another team.' },
        no: 'Do you need to ADD a missing field at deploy time (e.g., default tag)?',
      },
      {
        q: 'Do you need to ADD a missing field at deploy time (e.g., default tag)?',
        yes: { leaf: 'Append.',
               why: 'Inserts the field into the request before it hits ARM. Lighter-weight than Modify; works only at create-time.' },
        no: { leaf: 'Modify.',
              why: 'Mutates an existing resource (e.g., add a tag retroactively). Requires a roleDefinitionIds in the policy and Managed Identity on the assignment, like DINE.' },
      },
    ],
    examples: [
      { case: '"Storage accounts must not allow public blob access"', answer: 'Deny.' },
      { case: '"Tag every new VM with Owner from the requestor\'s identity"', answer: 'Append on create.' },
      { case: '"Auto-install MDE on every Windows VM"', answer: 'DeployIfNotExists.' },
      { case: '"Track new public IPs without blocking them yet"', answer: 'Audit (then upgrade to Deny once team is ready).' },
      { case: '"Backfill the CostCenter tag on existing VMs"', answer: 'Modify.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ct-control-type',
    title: 'AWS Control Tower: Preventive, Detective, or Proactive?',
    cloud: 'aws',
    intro: `P-D-P. The three types do different jobs at different times in the
            resource lifecycle.`,
    branches: [
      {
        q: 'Should this block the action BEFORE it happens (anywhere it might be attempted)?',
        yes: { leaf: 'Preventive — implement as SCP.',
               why: 'SCPs block at the API call. The action returns AccessDenied before any resource is created. Cannot be bypassed by IAM.' },
        no: 'Should this block specifically at CloudFormation deploy time, before any resource is created?',
      },
      {
        q: 'Should this block specifically at CloudFormation deploy time, before any resource is created?',
        yes: { leaf: 'Proactive — implement as CFN Hook.',
               why: 'Hooks evaluate CFN templates in flight. They\'re narrower than SCPs but can do template-shape checks SCPs can\'t (e.g., "every S3 bucket in the template must have encryption").' },
        no: 'Do you want to flag non-compliant resources after they exist?',
      },
      {
        q: 'Do you want to flag non-compliant resources after they exist?',
        yes: { leaf: 'Detective — implement as AWS Config rule.',
               why: 'Config evaluates real resources continuously and emits COMPLIANT / NON_COMPLIANT. Use for ongoing compliance and remediation triggers.' },
        no: { leaf: 'You may need a different tool — Service Catalog template controls, Security Hub rules, or a custom policy stack.' },
      },
    ],
    examples: [
      { case: '"No one in this org may ever delete CloudTrail logs"', answer: 'Preventive (SCP deny).' },
      { case: '"S3 buckets in CFN templates must have BucketEncryption set"', answer: 'Proactive (CFN Hook).' },
      { case: '"Flag any existing S3 bucket without server-side encryption"', answer: 'Detective (Config rule s3-bucket-server-side-encryption-enabled).' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'config-managed-vs-custom',
    title: 'AWS Config: managed rule, custom Lambda, or Guard?',
    cloud: 'aws',
    intro: `When you need a Config rule, your default should be "managed."
            Custom is fine but more code to own.`,
    branches: [
      {
        q: 'Does an AWS-managed rule already do this check (search the catalog: ~250 available)?',
        yes: { leaf: 'Use the managed rule. Configure parameters, attach.',
               why: 'No code, no Lambda, no IAM. AWS owns updates and edge cases. 90% of compliance needs are covered.' },
        no: 'Can the rule be expressed declaratively (no external lookups, no complex string parsing)?',
      },
      {
        q: 'Can the rule be expressed declaratively (no external lookups, no complex string parsing)?',
        yes: { leaf: 'Use AWS Config Rules with Guard (CloudFormation Guard DSL).',
               why: 'YAML-ish DSL. No Lambda code to maintain. Deployable as a Conformance Pack.' },
        no: { leaf: 'Custom Lambda rule.',
              why: 'You need code: regex parsing of tags, cross-resource lookups, calls to external APIs. Pay the operational cost (deploy, monitor, IAM, log).' },
      },
    ],
    examples: [
      { case: '"S3 buckets must have server-side encryption"', answer: 'Managed: s3-bucket-server-side-encryption-enabled.' },
      { case: '"Every resource must have an Owner tag with @ in the value"', answer: 'Custom Lambda — managed required-tags can\'t do format validation.' },
      { case: '"VPCs must have flow logs enabled"', answer: 'Managed: vpc-flow-logs-enabled.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'azure-automation-host',
    title: 'Azure: Runbook, Function, or Logic App?',
    cloud: 'azure',
    intro: `Three places to put a script-like compliance tool. They overlap. The
            ecosystem nudges compliance teams toward Runbooks; here\'s the
            rule of thumb.`,
    branches: [
      {
        q: 'Is the workload a scheduled audit/remediation script (PowerShell or Python)?',
        yes: { leaf: 'Automation Runbook.',
               why: 'Built for this. Managed Identity auth out of the box. Schedule + parameters + output streams + Hybrid Worker option for on-prem reach. Standard for compliance work.' },
        no: 'Is the workload event-driven (e.g., respond to a Defender alert, an Activity Log event)?',
      },
      {
        q: 'Is the workload event-driven (e.g., respond to a Defender alert, an Activity Log event)?',
        yes: { leaf: 'Logic App OR Azure Function.',
               why: 'Logic App for low-code multi-system orchestration (route an alert → ServiceNow → Slack → email). Function for code-first stateless work. Both can use Managed Identity.' },
        no: 'Is the workload a long-running compute job (heavy ML, big report)?',
      },
      {
        q: 'Is the workload a long-running compute job (heavy ML, big report)?',
        yes: { leaf: 'Container/VM/AKS — not a script-host concern.',
               why: 'Beyond the scope of these three. Choose by workload.' },
        no: { leaf: 'Default to Runbook unless something pulls you toward Function.',
              why: 'For 80% of compliance work — periodic audit, periodic remediation, evidence collection — Runbook is the path of least resistance.' },
      },
    ],
    examples: [
      { case: '"Every hour, find storage accounts with public access and disable them"', answer: 'Runbook (PowerShell, scheduled).' },
      { case: '"On every Defender high-severity alert, post to Slack and open a Jira"', answer: 'Logic App.' },
      { case: '"Compute monthly compliance report, write to a SQL DB"', answer: 'Function (timer trigger), or Runbook with output to Log Analytics.' },
    ],
  },

];

export function decisionById(id) {
  return DECISIONS.find(d => d.id === id) || null;
}
