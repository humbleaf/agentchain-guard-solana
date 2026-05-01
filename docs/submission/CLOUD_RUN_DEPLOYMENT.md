# ☁️ Cloud Run Deployment Guide

AgentChain Guard is optimized for **Google Cloud Run**, leveraging a scale-to-zero architecture that is both cost-effective and demo-reliable.

## Architecture (Hybrid Strategy)
- **API Service (Cloud Run)**: NestJS application handling policy evaluation and settlement.
- **Dashboard Service (Vercel)**: Next.js application providing the human command center.
- **MCP Server**: Local-only (stdio).


## Prerequisites
1.  **GCP Account**: A project with billing enabled.
2.  **gcloud SDK**: Installed and authenticated (`gcloud auth login`).
3.  **Permissions**: Service usage for Cloud Run, Artifact Registry, and Cloud Build.

## Deployment Steps

### 1. Deploy API (Cloud Run)
Run the API deployment script from the root of the `agentchain-guard-solana` directory:

```bash
gcloud run deploy agentguard-api \
  --source . \
  --file apps/guard-api/Dockerfile \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0
```

Capture the generated **API URL**.

### 2. Deploy Dashboard (Vercel)
1.  Connect your repository to Vercel.
2.  Set the **Root Directory** to `apps/dashboard`.
3.  Add the following **Environment Variable**:
    - `NEXT_PUBLIC_POLICY_ENGINE_URL`: [Your Cloud Run API URL]
4.  Vercel will automatically detect Next.js and the pnpm workspace.


### 2. Manual Configuration (Optional)
If you need to override environment variables (e.g., using a custom RPC):

```bash
gcloud run services update agentguard-api \
  --set-env-vars "SOLANA_RPC_URL=https://your-custom-rpc"
```

## Service URLs (Placeholders)
- **Dashboard**: `https://agentguard-dashboard-[hash]-[region].a.run.app`
- **API Swagger**: `https://agentguard-api-[hash]-[region].a.run.app/api`
- **API Health**: `https://agentguard-api-[hash]-[region].a.run.app/v1/health`

## Cost Controls
The services are configured with `--min-instances 0`. This means you only pay for compute when the demo is active.

**To delete all services and avoid future costs:**
```bash
gcloud run services delete agentguard-api --region us-central1
gcloud run services delete agentguard-dashboard --region us-central1
```

## Pre-Demo Warmup
Because of scale-to-zero, the first request may experience a "cold start" (5-10 seconds).
**Action**: Hit the Dashboard URL in your browser 30 seconds before your presentation to ensure everything is warm and responsive.

## Troubleshooting
- **Logs**: View real-time logs in the GCP Console under Cloud Run > [Service] > Logs.
- **CORS**: The API is configured to allow `*.a.run.app`. If using a custom domain, update `apps/guard-api/src/main.ts`.
