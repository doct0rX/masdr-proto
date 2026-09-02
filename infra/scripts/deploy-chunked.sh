#!/usr/bin/env bash
# Upload the release in 8 MB parts (large single uploads drop from some networks),
# reassemble on the instance, and run masdr-deploy there.
set -euo pipefail
PROFILE="${AWS_PROFILE:-gentek-deploy}"
REGION="${AWS_REGION:-eu-west-1}"
cd "$(dirname "$0")/../terraform"
BUCKET="$(terraform output -raw bucket)"
INSTANCE="$(terraform output -raw instance_id)"
cd ..
TMP="$(mktemp -d)"
split -b 8m -d release.zip "$TMP/release.part."
aws --profile "$PROFILE" --region "$REGION" s3 rm "s3://$BUCKET/releases/parts/" --recursive --only-show-errors || true
n=0
for f in "$TMP"/release.part.*; do
  for try in 1 2 3 4 5; do
    if aws --profile "$PROFILE" --region "$REGION" s3 cp "$f" "s3://$BUCKET/releases/parts/$(basename "$f")" --only-show-errors; then n=$((n+1)); break; fi
    sleep 3
  done
done
echo "parts uploaded: $n"
/bin/rm -rf "$TMP"
CMD_ID=$(aws --profile "$PROFILE" --region "$REGION" ssm send-command --instance-ids "$INSTANCE" --document-name AWS-RunShellScript --timeout-seconds 900 \
  --parameters "commands=[\"set -e\",\"mkdir -p /tmp/rel && cd /tmp/rel && rm -f release.part.* release.zip\",\"aws s3 cp --recursive s3://$BUCKET/releases/parts/ . --region $REGION --only-show-errors\",\"cat release.part.* > release.zip && ls -la release.zip\",\"aws s3 cp release.zip s3://$BUCKET/releases/latest.zip --region $REGION --only-show-errors\",\"/usr/local/bin/masdr-deploy\"]" \
  --query Command.CommandId --output text)
echo "SSM command $CMD_ID"
for i in $(seq 1 80); do
  sleep 10
  STATUS=$(aws --profile "$PROFILE" --region "$REGION" ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)
  case "$STATUS" in
    Success) aws --profile "$PROFILE" --region "$REGION" ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query StandardOutputContent --output text | tail -6; exit 0;;
    Failed|Cancelled|TimedOut) echo "status $STATUS"; aws --profile "$PROFILE" --region "$REGION" ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query '[StandardOutputContent,StandardErrorContent]' --output text | tail -20; exit 1;;
  esac
done
echo "timed out waiting for SSM"; exit 1
