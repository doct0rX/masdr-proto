# Deployment runbook — masdr-proto.thegentek.com

Target: one EC2 instance in **eu-west-1 (Ireland)**, Caddy for automatic HTTPS, Next.js standalone under systemd, SQLite on the instance disk, S3 for release artifacts. No Docker anywhere, no SSH (AWS Systems Manager Session Manager instead). Everything is in `infra/`.

## 0. What the client provides

1. **A deployer IAM user** (programmatic access only) with the policy below, and its access key + secret shared out-of-band. Configure locally as profile `masdr`:
   ```bash
   aws configure --profile masdr      # region: eu-west-1, output: json
   ```
2. **A DNS record at GoDaddy** once the Elastic IP exists (step 3).
3. **The Anthropic API key** for production (can be the same one used locally).

### Deployer IAM policy (least privilege for this stack)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "EC2", "Effect": "Allow", "Action": ["ec2:Describe*", "ec2:RunInstances", "ec2:TerminateInstances", "ec2:StartInstances", "ec2:StopInstances", "ec2:CreateTags", "ec2:DeleteTags", "ec2:CreateSecurityGroup", "ec2:DeleteSecurityGroup", "ec2:AuthorizeSecurityGroupIngress", "ec2:AuthorizeSecurityGroupEgress", "ec2:RevokeSecurityGroupIngress", "ec2:RevokeSecurityGroupEgress", "ec2:AllocateAddress", "ec2:ReleaseAddress", "ec2:AssociateAddress", "ec2:DisassociateAddress", "ec2:ModifyInstanceAttribute", "ec2:ModifyInstanceMetadataOptions"], "Resource": "*" },
    { "Sid": "IAMForInstanceRole", "Effect": "Allow", "Action": ["iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:PassRole", "iam:TagRole", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:ListInstanceProfilesForRole", "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy", "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:CreateInstanceProfile", "iam:DeleteInstanceProfile", "iam:GetInstanceProfile", "iam:AddRoleToInstanceProfile", "iam:RemoveRoleFromInstanceProfile", "iam:TagInstanceProfile"], "Resource": ["arn:aws:iam::*:role/masdr-proto-*", "arn:aws:iam::*:instance-profile/masdr-proto-*"] },
    { "Sid": "S3", "Effect": "Allow", "Action": ["s3:*"], "Resource": ["arn:aws:s3:::masdr-proto-*", "arn:aws:s3:::masdr-proto-*/*"] },
    { "Sid": "SSM", "Effect": "Allow", "Action": ["ssm:GetParameter", "ssm:GetParameters", "ssm:PutParameter", "ssm:DeleteParameter", "ssm:DescribeParameters", "ssm:SendCommand", "ssm:GetCommandInvocation", "ssm:ListCommands", "ssm:ListCommandInvocations", "ssm:StartSession", "ssm:TerminateSession", "ssm:DescribeInstanceInformation"], "Resource": "*" },
    { "Sid": "SSMPublicAmi", "Effect": "Allow", "Action": ["ssm:GetParameter"], "Resource": "arn:aws:ssm:*::parameter/aws/service/canonical/*" },
    { "Sid": "Budgets", "Effect": "Allow", "Action": ["budgets:*"], "Resource": "*" },
    { "Sid": "STS", "Effect": "Allow", "Action": ["sts:GetCallerIdentity"], "Resource": "*" }
  ]
}
```

## 1. Secrets (never in git, Terraform state, or the AMI)

```bash
ANTHROPIC_API_KEY=sk-ant-... ANTHROPIC_WORKSPACE_ID=wrkspc_... ACCESS_CODE=choose-a-code ./infra/scripts/secrets.sh
```

`ANTHROPIC_WORKSPACE_ID` is mandatory for identity-linked keys (the API returns "anthropic-workspace-id is required" without it) and is found in the Anthropic Console under Settings → Workspaces (it starts with `wrkspc_`). The app sends it as the `anthropic-workspace-id` header on every request (`app/src/lib/ai/client.ts`); the SDK does not add it on its own for API-key auth.

This writes `/masdr-proto/ANTHROPIC_API_KEY` and `/masdr-proto/ACCESS_CODE` to SSM Parameter Store as SecureStrings (encrypted with the AWS-managed `aws/ssm` KMS key). The instance role may read only `/masdr-proto/*`. At boot and on every deploy, `masdr-env` on the instance pulls them into `/etc/masdr/env` (root-owned, mode 640, group `masdr`) and systemd injects that file into the app process. To rotate: run the script again, then `masdr-deploy` (or `masdr-env && systemctl restart masdr`) via SSM.

Optional: `ANTHROPIC_MODEL_PRIMARY=claude-fable-5-1` in the same script to A/B the top-tier model in production.

## 2. Provision (first time)

```bash
cd infra/terraform
terraform init
terraform apply -target=aws_eip.app        # allocate the Elastic IP first
terraform output elastic_ip
```

## 3. DNS at GoDaddy (client, manual)

In GoDaddy DNS for `thegentek.com` add:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `masdr-proto` | the Elastic IP from step 2 | 600 |

Verify: `dig +short masdr-proto.thegentek.com` returns the IP. Caddy retries certificate issuance automatically, but create the record before the full apply to avoid burning Let's Encrypt attempts.

## 4. Build and ship the first release

```bash
./infra/scripts/package.sh          # builds Next.js standalone locally → infra/release.zip
cd infra/terraform && terraform apply   # creates bucket, role, SG, instance (cloud-init installs Node 22, AWS CLI, Caddy)
../scripts/deploy.sh                # uploads release.zip to S3 and runs masdr-deploy on the instance via SSM
```

`masdr-deploy` unzips the release under `/opt/masdr/releases/<ts>`, installs Chromium (Playwright) for PDF rendering, refreshes secrets, points `/opt/masdr/current` at the release and restarts the service. Rollback is `ln -sfn` to the previous release directory and `systemctl restart masdr`.

## 5. Verify

```bash
curl -I https://masdr-proto.thegentek.com
curl -s https://masdr-proto.thegentek.com/api/health
aws --profile masdr ssm start-session --target $(terraform output -raw instance_id)   # then: journalctl -u masdr -u caddy -n 200
```

Smoke test in the browser: open the link, enter the access code, click "Use the bucket hat example", generate, export PDF and Excel.

## 6. Redeploy loop

```bash
./infra/scripts/package.sh && ./infra/scripts/deploy.sh
```

No Docker, no SSH, no downtime beyond the ~3 s service restart.

## 7. Current deployment (2026-09-03)

| Item | Value |
|------|-------|
| Region / profile | eu-west-1 / `gentek-deploy` |
| Elastic IP | 52.49.56.114 (A record `masdr-proto` at GoDaddy, added 2026-09-02) |
| Instance | i-0a91558255966e35d (t3.small, Ubuntu 24.04) |
| Bucket | masdr-proto-data-321407928371 |
| Secrets | `/masdr-proto/ANTHROPIC_API_KEY`, `/masdr-proto/ANTHROPIC_WORKSPACE_ID`, `/masdr-proto/ACCESS_CODE` |
| URL | https://masdr-proto.thegentek.com (Let's Encrypt certificate issued by Caddy) |

First-boot lessons folded back into `cloud-init.yaml`: the Caddy package did not create its service user, so the runcmd now creates it before restarting Caddy; and the instance environment script must be refreshed (`masdr-env`) whenever a new variable such as the workspace ID is introduced.

## 8. Operations notes

- **Instance size:** t3.small (2 vCPU, 2 GB). Chromium PDF rendering peaks ~400 MB; generation is I/O-bound on the Anthropic API. Move to t3.medium if more than ~5 concurrent generations are expected.
- **Data:** SQLite + uploads + exports under `/var/lib/masdr/data` on the encrypted root volume. Snapshot the volume before destructive changes; a nightly `aws s3 sync /var/lib/masdr/data s3://<bucket>/backup/` cron can be added if the prototype outlives the demo.
- **Cost:** roughly $20/month (t3.small on-demand ≈ $17, EBS 24 GB ≈ $2.5, EIP attached free, S3 pennies) plus Anthropic usage at about $1.20 per generated tech pack.
- **Certificates:** Caddy renews automatically. Do not destroy and recreate the instance more than ~4 times a week (Let's Encrypt duplicate-certificate limit; Caddy falls back to ZeroSSL).
- **Region:** eu-west-1 as agreed on 2026-09-02. The Anthropic API is reached over the internet regardless of region.
- **Teardown:** `terraform destroy` removes everything including the bucket (`force_destroy = true`) and the EIP.
