// AWS ↔ Azure concept mapping. The wiki page reads from this directly.
//
// Each row: a single concept. Plain-English first; precise vocab on each side.
// Where the concepts diverge, the `differs` field captures the gap so the user
// isn't lulled into thinking the two are 1:1.

export const MAPPING = [
  {
    concept: 'Top-of-tree governance container',
    plain: `The single root above all your accounts/subs where org-wide
            controls attach.`,
    aws:   { service: 'AWS Organizations (management account / root)', link: 'https://docs.aws.amazon.com/organizations/latest/userguide/' },
    azure: { service: 'Tenant Root group', link: 'https://learn.microsoft.com/en-us/azure/governance/management-groups/overview' },
    differs: `The AWS management account is a real account that can run workloads
              (don't); the Azure Tenant Root group is purely a logical
              container.`,
    foundationDay: 1,
    tickets: [],
  },
  {
    concept: 'Mid-tree folder for grouping',
    plain: `Folders inside the tree for grouping accounts/subs by environment
            or business unit.`,
    aws:   { service: 'Organizational Unit (OU)', link: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_ous.html' },
    azure: { service: 'Management Group (MG)', link: 'https://learn.microsoft.com/en-us/azure/governance/management-groups/overview' },
    differs: `OUs go up to 5 levels deep; MGs up to 6.`,
    foundationDay: 1,
    tickets: ['T1', 'T3'],
  },
  {
    concept: 'Workload + billing container',
    plain: `The actual unit your workload lives in. Has its own identity, its
            own billing rollup.`,
    aws:   { service: 'Account', link: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html' },
    azure: { service: 'Subscription', link: 'https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/create-subscription' },
    differs: `One person can own many AWS accounts trivially. Azure
              subscriptions are heavier-weight and often vended by a
              platform team.`,
    foundationDay: 1,
    tickets: [],
  },
  {
    concept: 'Preventive guardrail (org-wide deny)',
    plain: `A rule that blocks an action across an account/sub before it
            happens. Cannot be overridden by local admin.`,
    aws:   { service: 'Service Control Policy (SCP)', link: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html' },
    azure: { service: 'Azure Policy with effect "deny"', link: 'https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effects' },
    differs: `SCP has only Allow/Deny. Azure Policy has six effects (deny
              is one). SCPs cap an entire account; Azure Policy can target
              MG / sub / RG / single resource.`,
    foundationDay: 2,
    tickets: ['T1', 'T4'],
  },
  {
    concept: 'Detective rule (continuous compliance check)',
    plain: `A rule that watches your resources and flags non-compliance, but
            doesn\'t block.`,
    aws:   { service: 'AWS Config Rule (managed or custom)', link: 'https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_use-managed-rules.html' },
    azure: { service: 'Azure Policy with effect "audit"', link: 'https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effects' },
    differs: `AWS Config emits per-resource COMPLIANT / NON_COMPLIANT
              verdicts and runs custom Lambda. Azure Policy audit doesn\'t
              run code — it just records non-compliance via the engine.`,
    foundationDay: 3,
    tickets: ['T2', 'T9'],
  },
  {
    concept: 'Proactive deploy-time check',
    plain: `Block bad stuff during deploy, before any resource is created.`,
    aws:   { service: 'CloudFormation Hooks', link: 'https://docs.aws.amazon.com/cloudformation-cli/latest/hooks-userguide/what-is-cloudformation-hooks.html' },
    azure: { service: 'Azure Policy with effect "deny" at deploy', link: 'https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effects#deny' },
    differs: `AWS has a separate Hook concept that only runs on CFN
              templates. Azure Policy "deny" effect runs on every
              ARM/Bicep/Terraform deploy through ARM — same intent, no
              separate concept.`,
    foundationDay: 4,
    tickets: [],
  },
  {
    concept: 'Centralized resource configuration history',
    plain: `Records every change to every resource over time. Backbone of
            detective compliance.`,
    aws:   { service: 'AWS Config (recorder + history)', link: 'https://docs.aws.amazon.com/config/' },
    azure: { service: 'Azure Resource Graph + Activity Log', link: 'https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview' },
    differs: `Config gives you point-in-time snapshots and a per-resource
              configuration timeline. Resource Graph is a query layer over
              current state; Activity Log captures change events. Together
              they cover the same job.`,
    foundationDay: 3,
    tickets: ['T7', 'T9'],
  },
  {
    concept: 'Security posture dashboard',
    plain: `One place to see "how compliant am I right now?" with severity-
            ranked recommendations.`,
    aws:   { service: 'AWS Security Hub', link: 'https://docs.aws.amazon.com/securityhub/' },
    azure: { service: 'Microsoft Defender for Cloud', link: 'https://learn.microsoft.com/en-us/azure/defender-for-cloud/' },
    differs: `Defender for Cloud bundles a free CSPM tier plus paid CWP
              (workload-specific defenders). Security Hub is closer in
              scope to free Defender; AWS\'s deeper detection products are
              GuardDuty, Inspector, Macie — separate services.`,
    foundationDay: 3,
    tickets: ['T5'],
  },
  {
    concept: 'Built-in security baseline initiative',
    plain: `A curated bundle of "must-have" security checks aligned to a
            framework. Ship it once, get hundreds of checks.`,
    aws:   { service: 'Security Hub Foundational Security Best Practices', link: 'https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-fsbp.html' },
    azure: { service: 'Microsoft Cloud Security Benchmark (MCSB)', link: 'https://learn.microsoft.com/en-us/security/benchmark/azure/' },
    differs: `MCSB maps controls to NIST/CIS/PCI explicitly via control IDs
              like NS-1, IM-3. AWS\'s FSBP standard is mostly self-defined;
              for cross-framework mapping you also enable CIS / NIST /
              PCI standards in Security Hub.`,
    foundationDay: 3,
    tickets: ['T5', 'T9'],
  },
  {
    concept: 'Endpoint Detection and Response (EDR)',
    plain: `Agent on your VMs that catches running-process threats and feeds
            findings into your security dashboard.`,
    aws:   { service: 'Amazon GuardDuty (for runtime); 3rd-party for full EDR', link: 'https://docs.aws.amazon.com/guardduty/' },
    azure: { service: 'Microsoft Defender for Endpoint (MDE)', link: 'https://learn.microsoft.com/en-us/microsoft-365/security/defender-endpoint/' },
    differs: `MDE is a real EDR with agent, behavioral analytics, response.
              GuardDuty is more network/log-based threat detection — less
              endpoint-focused. AWS users typically run MDE or Crowdstrike
              etc. on top.`,
    foundationDay: 3,
    tickets: ['T5'],
  },
  {
    concept: 'Landing zone (pre-built secured environment)',
    plain: `A pre-configured shell new teams get on day one — OU/MG, baseline
            policies, logging, identity all wired up.`,
    aws:   { service: 'AWS Landing Zone (built/maintained by Control Tower)', link: 'https://docs.aws.amazon.com/controltower/latest/userguide/' },
    azure: { service: 'Enterprise-Scale Landing Zone (CAF)', link: 'https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/' },
    differs: `AWS Control Tower is a managed service that creates and
              maintains the landing zone for you. Azure has reference
              architecture (CAF / ESLZ) but no single managed service —
              you build it via Terraform/Bicep.`,
    foundationDay: 4,
    tickets: ['T3'],
  },
  {
    concept: 'Account/subscription vending workflow',
    plain: `The pipeline that hands a new team a ready-to-go workload
            container.`,
    aws:   { service: 'Control Tower Account Factory + AFT', link: 'https://docs.aws.amazon.com/controltower/latest/userguide/account-factory.html' },
    azure: { service: 'Subscription vending (Terraform module)', link: 'https://github.com/Azure/terraform-azurerm-lz-vending' },
    differs: `Account Factory is a Service Catalog product baked into
              Control Tower. Azure subscription vending is community
              Terraform you assemble yourself.`,
    foundationDay: 4,
    tickets: ['T3'],
  },
  {
    concept: 'Three Control Tower control types (P-D-P)',
    plain: `Preventive (block before it happens) · Detective (flag after) ·
            Proactive (block at deploy time).`,
    aws:   { service: 'CT Preventive (SCP) / Detective (Config) / Proactive (Hook)', link: 'https://docs.aws.amazon.com/controltower/latest/userguide/types-of-controls.html' },
    azure: { service: 'Azure Policy effect maps: deny / audit / deny-at-deploy', link: 'https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effects' },
    differs: `On AWS the three types are distinct technologies (SCP, Config,
              Hook). On Azure they collapse into Azure Policy effects.
              Same intent, simpler surface on Azure, more
              specialized-but-explicit on AWS.`,
    foundationDay: 4,
    tickets: ['T3'],
  },
  {
    concept: 'Time-bound exception to a policy',
    plain: `A documented "this resource is grandfathered until [date]"
            mechanism.`,
    aws:   { service: 'No first-class concept; pattern: NotAction in SCP / suppression in Config', link: 'https://docs.aws.amazon.com/securityhub/latest/userguide/finding-workflow-status.html' },
    azure: { service: 'Azure Policy Exemption', link: 'https://learn.microsoft.com/en-us/azure/governance/policy/concepts/exemption-structure' },
    differs: `Azure Policy has Exemption as a real, scoped, time-bounded
              resource type. AWS makes you build the equivalent — a
              suppression in Security Hub, a custom NotAction in SCP, or
              workflow status in findings.`,
    foundationDay: 2,
    tickets: ['T4'],
  },
  {
    concept: 'Auto-remediate non-compliant resource',
    plain: `When something is found non-compliant, automatically fix it.`,
    aws:   { service: 'Config + SSM Automation document', link: 'https://docs.aws.amazon.com/config/latest/developerguide/remediation.html' },
    azure: { service: 'Azure Policy DeployIfNotExists / Modify effects + Automation Runbook', link: 'https://learn.microsoft.com/en-us/azure/governance/policy/how-to/remediate-resources' },
    differs: `Both clouds offer in-product remediation (Config→SSM doc,
              Azure Policy DINE). For complex cross-resource flows, both
              fall back to scripts: AWS Lambda + EventBridge, Azure
              Automation Runbook (PowerShell). Runbook is more common in
              Azure compliance work.`,
    foundationDay: 3,
    tickets: ['T6'],
  },
  {
    concept: 'Centralized identity for human access',
    plain: `Where humans sign in. Source of truth for who can access what.`,
    aws:   { service: 'IAM Identity Center (formerly AWS SSO)', link: 'https://docs.aws.amazon.com/singlesignon/latest/userguide/' },
    azure: { service: 'Microsoft Entra ID (formerly Azure AD)', link: 'https://learn.microsoft.com/en-us/entra/' },
    differs: `Entra is broader: identity for Microsoft 365, conditional
              access, B2B, B2C. IIC is AWS-specific. Both federate to
              external IdPs (Okta, etc.).`,
    foundationDay: 1,
    tickets: ['T1'],
  },
  {
    concept: 'Resource-level permissions',
    plain: `What a specific user/role can do on a specific thing.`,
    aws:   { service: 'IAM Policy (identity-based or resource-based)', link: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html' },
    azure: { service: 'Azure RBAC role assignment', link: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/' },
    differs: `IAM is JSON policy with explicit Allow/Deny statements. Azure
              RBAC assigns built-in or custom roles at a scope; deny
              assignments exist but are rare.`,
    foundationDay: 2,
    tickets: ['T1'],
  },
  {
    concept: 'Bundle of related rules',
    plain: `A named collection of rules you can assign as one unit.`,
    aws:   { service: 'AWS Config Conformance Pack', link: 'https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html' },
    azure: { service: 'Azure Policy Initiative (policy set)', link: 'https://learn.microsoft.com/en-us/azure/governance/policy/concepts/initiative-definition-structure' },
    differs: `Conformance Packs ship as YAML and target Config; Initiatives
              are JSON and target the Policy engine. MCSB is itself an
              Initiative.`,
    foundationDay: 3,
    tickets: [],
  },
  {
    concept: 'Cross-account/sub query layer',
    plain: `One query, all your accounts/subs at once.`,
    aws:   { service: 'AWS Config Aggregator (advanced query)', link: 'https://docs.aws.amazon.com/config/latest/developerguide/querying-AWS-resources.html' },
    azure: { service: 'Azure Resource Graph (KQL)', link: 'https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview' },
    differs: `Resource Graph is general-purpose Azure inventory query and
              uses KQL. Config Aggregator is Config-specific and uses an
              SQL-like dialect. KQL is the more transferable skill.`,
    foundationDay: 3,
    tickets: ['T7', 'T9'],
  },
  {
    concept: 'Scripted compliance automation host',
    plain: `Where you put scheduled scripts that audit or remediate.`,
    aws:   { service: 'Lambda + EventBridge schedule', link: 'https://docs.aws.amazon.com/lambda/' },
    azure: { service: 'Azure Automation Runbook (PowerShell)', link: 'https://learn.microsoft.com/en-us/azure/automation/automation-runbook-types' },
    differs: `Azure Runbooks are PowerShell-first and integrate with
              Managed Identity for auth — more "ops" feel. AWS
              equivalent is Lambda + EventBridge — more "platform" feel.
              Both are correct; the ecosystem nudges you toward different
              defaults.`,
    foundationDay: 4,
    tickets: ['T6'],
  },
  {
    concept: 'Infrastructure as Code',
    plain: `Declare cloud configuration in text files; apply it via a tool.`,
    aws:   { service: 'CloudFormation (native), Terraform (preferred)', link: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/' },
    azure: { service: 'Bicep / ARM (native), Terraform (preferred)', link: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/' },
    differs: `Most compliance teams pick Terraform over the cloud-native
              option to keep one tool across both clouds.`,
    foundationDay: 5,
    tickets: ['T8'],
  },
];

// Glossary — terms the user will hear in meetings, plain-English first.
export const GLOSSARY = [
  { term: 'Account Factory',
    plain: 'Control Tower\'s "give me a new account" workflow. Creates the account, places it in the chosen OU, applies baselines.',
    detail: 'AWS Service Catalog product that vends accounts via Control Tower. AFT (Account Factory for Terraform) is the Terraform-driven extension.',
    cloud: 'aws' },
  { term: 'AFT',
    plain: 'Account Factory for Terraform — the Terraform-customizable version of Account Factory.',
    detail: 'A separate solution that lets you run Terraform pipelines against newly vended accounts to apply organization-specific customizations.',
    cloud: 'aws' },
  { term: 'Activity Log',
    plain: 'Azure\'s record of "who did what, when" at the subscription level. The first thing to check when something changed unexpectedly.',
    detail: 'Logs control-plane events. Different from Resource Logs (data-plane) and from Defender alerts. Queryable via KQL.',
    cloud: 'azure' },
  { term: 'Aggregator (Config)',
    plain: 'AWS Config feature that pulls compliance results from multiple accounts/regions into one view.',
    detail: 'Required for org-wide compliance dashboards. Set up at the management or delegated administrator account.',
    cloud: 'aws' },
  { term: 'Assignment (Azure Policy)',
    plain: 'The act of attaching a policy definition to a scope. Until assigned, a definition does nothing.',
    detail: 'An assignment ties: a policy or initiative definition + a scope (MG/sub/RG/resource) + parameters + an enforcementMode.',
    cloud: 'azure' },
  { term: 'CAF / ESLZ',
    plain: 'Microsoft\'s reference architecture for an Azure landing zone — a recommended MG hierarchy and policy baselines.',
    detail: 'Cloud Adoption Framework (CAF) Enterprise-Scale Landing Zone (ESLZ). Implemented via Bicep / Terraform community modules.',
    cloud: 'azure' },
  { term: 'CFN Hook',
    plain: 'A check that runs on CloudFormation deploys to block bad templates before any resource is created.',
    detail: 'The "proactive" control type in Control Tower\'s P-D-P model. Hooks run on resource provisioning events.',
    cloud: 'aws' },
  { term: 'Conformance Pack',
    plain: 'A YAML bundle of AWS Config rules you can deploy as one unit.',
    detail: 'Equivalent to Azure Policy Initiative for the Config side. Often used to deploy compliance baselines (PCI, HIPAA) to many accounts.',
    cloud: 'aws' },
  { term: 'Custom Config Rule',
    plain: 'Your own check, written as a Lambda, that returns COMPLIANT or NON_COMPLIANT per resource.',
    detail: 'Used when no managed rule fits. Trigger choice: configuration-changes (event-driven) or periodic.',
    cloud: 'aws' },
  { term: 'Defender for Cloud',
    plain: 'Azure\'s security dashboard. Aggregates findings, scores posture, recommends fixes.',
    detail: 'Two layers: free CSPM (Foundational + secure score + Regulatory Compliance) and paid CWP (Defender for Servers/Storage/SQL/etc.).',
    cloud: 'azure' },
  { term: 'Defender for Endpoint (MDE)',
    plain: 'Microsoft\'s EDR for VMs/laptops. Catches running-process threats and feeds them into Defender for Cloud.',
    detail: 'Provisioned on Azure VMs via the MDE.Windows / MDE.Linux extension. Auto-deployed via DeployIfNotExists policy.',
    cloud: 'azure' },
  { term: 'Definition (Azure Policy)',
    plain: 'The JSON description of a policy. Does nothing until assigned.',
    detail: 'Structure: policyType, mode, parameters, policyRule (if/then), metadata. <code>azurerm_policy_definition</code> in Terraform.',
    cloud: 'azure' },
  { term: 'DeployIfNotExists (DINE)',
    plain: 'An Azure Policy effect that creates a resource if it\'s missing. Used to auto-deploy required extensions/diagnostic settings.',
    detail: 'Requires a <code>roleDefinitionIds</code> in the policy and a Managed Identity on the assignment to perform the deploy.',
    cloud: 'azure' },
  { term: 'Drift',
    plain: 'When real cloud state diverges from your IaC code. Usually because someone clicked in a console.',
    detail: 'Detected via <code>terraform plan -refresh-only</code> or cloud-native drift detection. Fix by re-applying or by importing the change into code.',
    cloud: 'tf' },
  { term: 'Effects (Azure Policy)',
    plain: 'What a policy DOES when its condition matches. Six to memorize: A·D·A·M·D·A.',
    detail: 'Audit, Deny, Append, Modify, DeployIfNotExists, AuditIfNotExists. Plus Disabled, EnforceOPAConstraint, Manual.',
    cloud: 'azure' },
  { term: 'Exemption',
    plain: 'A documented "this resource is grandfathered until [date]" record on Azure Policy.',
    detail: 'Resource type <code>Microsoft.Authorization/policyExemptions</code>. Categories: Waiver vs Mitigated. expiresOn is mandatory in practice.',
    cloud: 'azure' },
  { term: 'IAM Identity Center (IIC)',
    plain: 'AWS\'s single sign-on hub for human access. The thing you set up so people don\'t need IAM users.',
    detail: 'Formerly AWS SSO. Federates to external IdPs. Permission Sets are how you assign access into accounts.',
    cloud: 'aws' },
  { term: 'IAM Policy',
    plain: 'AWS\'s permission JSON. Says what a user/role can do.',
    detail: 'Identity-based (attached to user/role/group) or resource-based (attached to a resource). Effect Allow or Deny. Both must allow; either can deny.',
    cloud: 'aws' },
  { term: 'Initiative',
    plain: 'A bundle of related Azure Policy definitions you assign as one unit.',
    detail: 'Resource type <code>Microsoft.Authorization/policySetDefinitions</code>. MCSB is itself an Initiative.',
    cloud: 'azure' },
  { term: 'KQL',
    plain: 'Microsoft\'s query language. Like SQL but pipeline-style. Used in Log Analytics, Resource Graph, Sentinel.',
    detail: 'Operators you\'ll use daily: where, project, summarize, sort, take, join (kinds: inner, leftouter, leftanti).',
    cloud: 'azure' },
  { term: 'Landing Zone',
    plain: 'The pre-secured environment new teams "land in" on day one.',
    detail: 'On AWS, built and maintained by Control Tower. On Azure, built via CAF/ESLZ Terraform modules.',
    cloud: 'both' },
  { term: 'Managed Identity',
    plain: 'An Azure-managed credential attached to a resource. Lets that resource auth to other Azure APIs without storing secrets.',
    detail: 'System-Assigned (lifecycle tied to the resource) or User-Assigned (independent, can be reused). Preferred over Service Principal where possible.',
    cloud: 'azure' },
  { term: 'Management Group (MG)',
    plain: 'Azure\'s equivalent of an AWS OU — a folder for grouping subscriptions.',
    detail: 'Up to 6 levels deep below Tenant Root. Policy assigned at MG flows down to all subs beneath.',
    cloud: 'azure' },
  { term: 'MCSB',
    plain: 'Microsoft Cloud Security Benchmark — Azure\'s built-in security baseline.',
    detail: 'A built-in Azure Policy Initiative aligned to NIST 800-53, CIS, ISO 27001, PCI. Control IDs like NS-1 (network security), IM-3 (identity).',
    cloud: 'azure' },
  { term: 'OU',
    plain: 'Organizational Unit — AWS\'s folder for grouping accounts.',
    detail: 'Up to 5 levels deep below the org root. SCPs attach to OUs (or root, or individual accounts).',
    cloud: 'aws' },
  { term: 'Permission Boundary',
    plain: 'A cap on what a specific IAM user/role can ever do. Different from SCP (account-wide cap).',
    detail: 'Used to delegate IAM-role-creation safely: the boundary limits what roles the delegate can grant.',
    cloud: 'aws' },
  { term: 'Resource Graph',
    plain: 'Azure\'s query-everything-instantly service. Inventory + state across all subs you can read.',
    detail: 'Backed by KQL. Tables include Resources, ResourceContainers, PolicyResources, SecurityResources. Pin queries to dashboards for ongoing tracking.',
    cloud: 'azure' },
  { term: 'Runbook',
    plain: 'A scheduled PowerShell (or Python) script in Azure Automation. The compliance team\'s script-host of choice.',
    detail: 'Lives in an Automation Account. Auths via Managed Identity. Used for periodic auditing, remediation, evidence collection.',
    cloud: 'azure' },
  { term: 'Secure Score',
    plain: 'Defender for Cloud\'s posture percentage — how many recommendations you\'ve fixed.',
    detail: 'Computed from active recommendations weighted by severity. Drops mean a recommendation flipped unhealthy.',
    cloud: 'azure' },
  { term: 'Service Control Policy (SCP)',
    plain: 'AWS\'s preventive guardrail. Caps what an account can ever do, even for admins.',
    detail: 'JSON document attached to root, OU, or account. Effect Allow or Deny. Most production SCPs use Deny + NotAction patterns.',
    cloud: 'aws' },
  { term: 'State (Terraform)',
    plain: 'Terraform\'s record of what it has already created. Without it, plan can\'t compute the diff.',
    detail: 'Stored remotely (S3+DynamoDB or Azure Storage+blob lease) with locking. Never edit by hand.',
    cloud: 'tf' },
  { term: 'Subscription',
    plain: 'Azure\'s workload + billing container. Resource Groups live inside; resources live inside RGs.',
    detail: 'Vended via Terraform pipelines into a chosen MG. RBAC + Policy apply at sub level + inherit from MG.',
    cloud: 'azure' },
];

export function mappingByConcept(needle) {
  const n = String(needle).toLowerCase();
  return MAPPING.filter(r =>
    r.concept.toLowerCase().includes(n) ||
    r.aws.service.toLowerCase().includes(n) ||
    r.azure.service.toLowerCase().includes(n) ||
    r.plain.toLowerCase().includes(n));
}

export function glossaryByTerm(needle) {
  const n = String(needle).toLowerCase();
  return GLOSSARY.filter(g =>
    g.term.toLowerCase().includes(n) ||
    g.plain.toLowerCase().includes(n) ||
    g.detail.toLowerCase().includes(n));
}
