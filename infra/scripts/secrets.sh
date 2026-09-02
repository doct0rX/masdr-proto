#!/usr/bin/env bash
# Store secrets in SSM Parameter Store (SecureString). Run once, and again to rotate.
# Usage: ANTHROPIC_API_KEY=sk-ant-... ANTHROPIC_WORKSPACE_ID=wrkspc_... ACCESS_CODE=... ./secrets.sh
# (ANTHROPIC_WORKSPACE_ID is required for identity-linked keys, optional otherwise)
set -euo pipefail
PROFILE="${AWS_PROFILE:-masdr}"
REGION="${AWS_REGION:-eu-west-1}"
PREFIX="${SSM_PREFIX:-/masdr-proto}"
put() { aws --profile "$PROFILE" --region "$REGION" ssm put-parameter --name "$PREFIX/$1" --type SecureString --value "$2" --overwrite >/dev/null && echo "stored $PREFIX/$1"; }
[ -n "${ANTHROPIC_API_KEY:-}" ] && put ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
[ -n "${ACCESS_CODE:-}" ] && put ACCESS_CODE "$ACCESS_CODE"
[ -n "${ANTHROPIC_MODEL_PRIMARY:-}" ] && put ANTHROPIC_MODEL_PRIMARY "$ANTHROPIC_MODEL_PRIMARY"
[ -n "${ANTHROPIC_WORKSPACE_ID:-}" ] && put ANTHROPIC_WORKSPACE_ID "$ANTHROPIC_WORKSPACE_ID"
echo "done. Apply on the instance with: aws ssm send-command ... /usr/local/bin/masdr-deploy (or masdr-env + systemctl restart masdr)"
