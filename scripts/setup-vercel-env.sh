#!/usr/bin/env bash
# Lumina — Vercel Environment Variables Setup Script
# 
# This script sets the required environment variables on your Vercel project
# and triggers a new deployment.
#
# PREREQUISITE: You need a Vercel access token.
# Generate one at: https://vercel.com/account/tokens
#
# USAGE:
#   VERCEL_TOKEN=your_token_here bash scripts/setup-vercel-env.sh

set -e

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
PROJECT_ID="prj_FCraAPY7GXYUheNL79RCIZ5UbCsU"
NEON_URL="postgresql://neondb_owner:npg_RkTLDxg5N9JV@ep-cool-frost-azl0uu95-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
OPENROUTER_KEY="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"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ ERROR: VERCEL_TOKEN is not set."
  echo "   Generate a token at: https://vercel.com/account/tokens"
  echo "   Then run: VERCEL_TOKEN=your_token bash scripts/setup-vercel-env.sh"
  exit 1
fi

echo "✅ Vercel token found"
echo ""

# Step 1: Get the team/org ID from the project
echo "Step 1: Fetching Vercel project info..."
PROJECT_INFO=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID")
ORG_ID=$(echo "$PROJECT_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('accountId', d.get('teamId','')))" 2>/dev/null || echo "")

if [ -z "$ORG_ID" ]; then
  echo "❌ Could not find org ID. Response:"
  echo "$PROJECT_INFO" | head -c 300
  exit 1
fi
echo "   ✅ Org ID: $ORG_ID"

# Step 2: Set DATABASE_URL environment variable
echo ""
echo "Step 2: Setting DATABASE_URL on Vercel..."
curl -s -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"DATABASE_URL\",\"value\":\"$NEON_URL\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('   ✅ DATABASE_URL set' if 'id' in d or d.get('error',{}).get('code') == 'ENV_ALREADY_EXISTS' else '   ❌ Error: ' + str(d)[:100])"

# Step 3: Set OPENROUTER_API_KEY environment variable
echo ""
echo "Step 3: Setting OPENROUTER_API_KEY on Vercel..."
curl -s -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"OPENROUTER_API_KEY\",\"value\":\"$OPENROUTER_KEY\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('   ✅ OPENROUTER_API_KEY set' if 'id' in d or d.get('error',{}).get('code') == 'ENV_ALREADY_EXISTS' else '   ❌ Error: ' + str(d)[:100])"

# Step 4: Trigger a new deployment
echo ""
echo "Step 4: Triggering new deployment..."
DEPLOY=$(curl -s -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\",\"target\":\"production\",\"gitSource\":{\"repo\":\"lumina-tarot-app\",\"ref\":\"main\"}}")
DEPLOY_URL=$(echo "$DEPLOY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('url',''))" 2>/dev/null || echo "")
echo "   ✅ Deployment triggered!"
if [ -n "$DEPLOY_URL" ]; then
  echo "   URL: https://$DEPLOY_URL"
fi

echo ""
echo "========================================================"
echo "✅ ALL DONE! Environment variables set + deployment triggered."
echo ""
echo "Your app will be live at: https://lumina-tarot-app.vercel.app"
echo "(Wait 1-3 minutes for the build to complete)"
echo "========================================================"
