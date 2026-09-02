#!/usr/bin/env bash
# Upload the release zip to S3 and trigger masdr-deploy on the instance via SSM.
set -euo pipefail
PROFILE="${AWS_PROFILE:-masdr}"
REGION="${AWS_REGION:-eu-west-1}"
cd "$(dirname "$0")/../terraform"
BUCKET="$(terraform output -raw bucket)"
INSTANCE="$(terraform output -raw instance_id)"
AWS_MAX_ATTEMPTS=10 AWS_RETRY_MODE=adaptive aws --profile "$PROFILE" --region "$REGION" s3 cp ../release.zip "s3://$BUCKET/releases/latest.zip" --only-show-errors --cli-read-timeout 300 --cli-connect-timeout 60
aws --profile "$PROFILE" --region "$REGION" s3 cp "s3://$BUCKET/releases/latest.zip" "s3://$BUCKET/releases/$(date +%Y%m%d%H%M%S).zip" --only-show-errors
CMD_ID=$(aws --profile "$PROFILE" --region "$REGION" ssm send-command \
  --instance-ids "$INSTANCE" --document-name AWS-RunShellScript \
  --comment "masdr deploy" --parameters 'commands=["/usr/local/bin/masdr-deploy"]' \
  --query Command.CommandId --output text)
echo "SSM command $CMD_ID sent; waiting..."
for i in $(seq 1 60); do
  STATUS=$(aws --profile "$PROFILE" --region "$REGION" ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)
  case "$STATUS" in
    Success) aws --profile "$PROFILE" --region "$REGION" ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query StandardOutputContent --output text | tail -5; exit 0;;
    Failed|Cancelled|TimedOut) aws --profile "$PROFILE" --region "$REGION" ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query StandardErrorContent --output text | tail -30; exit 1;;
  esac
  sleep 5
done
echo "timed out waiting for SSM"; exit 1
