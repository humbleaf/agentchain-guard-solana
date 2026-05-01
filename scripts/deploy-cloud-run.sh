#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════
# AgentChain Guard — Cloud Run Deployment Script
# ═══════════════════════════════════════════════════════════════════

# Default Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION=${GCP_REGION:-"us-central1"}
API_SERVICE_NAME=${API_SERVICE_NAME:-"agentguard-api"}
DASHBOARD_SERVICE_NAME=${DASHBOARD_SERVICE_NAME:-"agentguard-dashboard"}

echo "🚀 Deploying AgentChain Guard to Google Cloud Run..."
echo "📍 Project: $PROJECT_ID"
echo "📍 Region:  $REGION"

# ── 1. Deploy API ──────────────────────────────────────────────
echo "📦 Building & Deploying API..."
gcloud run deploy "$API_SERVICE_NAME" \
  --source . \
  --file apps/guard-api/Dockerfile \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production,GUARD_MODE=SIMULATED,SOLANA_CLUSTER=devnet"

# Get the API URL
API_URL=$(gcloud run services describe "$API_SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
echo "✅ API Deployed: $API_URL"

# ── 2. Deploy Dashboard (Optional / Vercel Recommended) ─────────
# By default, we recommend deploying the Dashboard to Vercel.
# If you wish to deploy it to Cloud Run as well, uncomment the section below.

# echo "📦 Building & Deploying Dashboard to Cloud Run..."
# gcloud run deploy "$DASHBOARD_SERVICE_NAME" \
#   --source . \
#   --file apps/dashboard/Dockerfile \
#   --region "$REGION" \
#   --allow-unauthenticated \
#   --min-instances 0 \
#   --memory 512Mi \
#   --cpu 1 \
#   --set-build-env-vars "NEXT_PUBLIC_POLICY_ENGINE_URL=$API_URL" \
#   --set-env-vars "NODE_ENV=production"

# DASHBOARD_URL=$(gcloud run services describe "$DASHBOARD_SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
# echo "✅ Dashboard Deployed: $DASHBOARD_URL"


echo "═══════════════════════════════════════════════════════════════"
echo "🎉 API Deployment Complete!"
echo "🔗 API:       $API_URL"
echo "🔗 Swagger:   $API_URL/api"
echo ""
echo "🚀 NEXT STEP: Deploy Dashboard to Vercel"
echo "📍 Env: NEXT_PUBLIC_POLICY_ENGINE_URL=$API_URL"
echo "═══════════════════════════════════════════════════════════════"

