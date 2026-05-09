// SCP and IAM templates used by the SCP+IAM simulator. Stored as objects keyed
// by id so the dropdown can map id → template directly. Each template's `json`
// field is a JSON string (so it can be loaded into a textarea editor as-is).

export const SCP_TEMPLATES = {
  'deny-s3-delete': {
    name: 'Deny S3 bucket deletion',
    desc: 'Prevents anyone in the account from deleting S3 buckets — even admins.',
    json: `{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":["s3:DeleteBucket"],"Resource":"*"}]}`,
  },
  'deny-region': {
    name: 'Deny outside us-east-1',
    desc: 'Restricts all resource creation to us-east-1 only.',
    json: `{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*","Condition":{"StringNotEquals":{"aws:RequestedRegion":"us-east-1"}}}]}`,
  },
  'deny-cloudtrail': {
    name: 'Deny disabling CloudTrail',
    desc: 'Prevents anyone from disabling or deleting CloudTrail — critical for audit logging.',
    json: `{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":["cloudtrail:DeleteTrail","cloudtrail:StopLogging","cloudtrail:UpdateTrail"],"Resource":"*"}]}`,
  },
  'deny-root': {
    name: 'Deny root account actions',
    desc: 'Restricts actions taken by the root account.',
    json: `{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*","Condition":{"StringLike":{"aws:PrincipalArn":"arn:aws:iam::*:root"}}}]}`,
  },
  'allow-only-ec2-s3': {
    name: 'Allow only EC2 and S3',
    desc: 'Restricts the account to only EC2 and S3 service actions.',
    json: `{"Version":"2012-10-17","Statement":[{"Effect":"Deny","NotAction":["ec2:*","s3:*"],"Resource":"*"}]}`,
  },
  'deny-iam-create': {
    name: 'Deny creating IAM users',
    desc: 'Prevents new IAM users from being created — forces use of federated identity.',
    json: `{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":["iam:CreateUser","iam:CreateAccessKey"],"Resource":"*"}]}`,
  },
};

export const IAM_TEMPLATES = {
  'admin':       { name:'AdministratorAccess', json:`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Resource":"*"}]}` },
  's3-full':     { name:'Full S3 access',      json:`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:*"],"Resource":"*"}]}` },
  's3-readonly': { name:'S3 read-only',        json:`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:ListBucket","s3:GetBucketLocation"],"Resource":"*"}]}` },
  'ec2-full':    { name:'Full EC2 access',     json:`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ec2:*"],"Resource":"*"}]}` },
  'readonly':    { name:'ReadOnlyAccess',      json:`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["*:Describe*","*:List*","*:Get*"],"Resource":"*"}]}` },
};
