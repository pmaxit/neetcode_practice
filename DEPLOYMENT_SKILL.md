# NeetCode Practice - Deployment Skill

This document details the process for deploying the NeetCode Practice application to Google Cloud Run and verifying the health of the deployment.

## Prerequisites

1.  **Google Cloud SDK**: Installed and authenticated (`gcloud auth login`).
2.  **Project Access**: Access to the `adveralabs` GCP project.
3.  **Cloud SQL Proxy**: Required for local database interaction and testing.
4.  **Environment Variables**: Configured in `.env` (refer to `.env.example`).

## Deployment Workflow

### 1. Code Preparation
Ensure all changes are committed and pushed to GitHub:
```bash
git add .
git commit -m "Redesign navigation and add health checks"
git push origin main
```

### 2. Execution
Run the deployment script from the root directory:
```bash
./deploy.sh
```

This script:
- Builds the Docker image using Cloud Build.
- Pushes the image to Google Container Registry (`GCR`).
- Deploys the service to Cloud Run.
- Connects the Cloud SQL instance.
- Sets environment variables and secrets (MySQL credentials).

## Verification and Health Checks

### Service Health Check
The application includes a dedicated health check endpoint to verify both the Node.js server and the database connectivity.

**Endpoint**: `/api/health`

**Success Response (JSON)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

**Failure Response (503 Service Unavailable)**:
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Error message details"
}
```

### Manual Verification Steps
1.  **Verify UI**: Navigate to the Service URL provided by the deployment script.
2.  **Verify DB**: Run `curl <Service-URL>/api/health` and ensure `database: connected` is returned.
3.  **Check Logs**: If issues occur, use the Google Cloud Console or run:
    ```bash
    gcloud run services logs read neetcode-practice --region us-central1
    ```

## Troubleshooting

- **Database Connection Failure**: Check if the `INSTANCE_CONNECTION_NAME` in `deploy.sh` matches the active instance. Verify that the `DB_PASS` secret exists in Secret Manager.
- **Image Push Errors**: Ensure the `gcr.io` API is enabled and you have `storage.admin` permissions.
- **Cold Starts**: The deployment is configured with `min-instances 0` to save costs; the first request after a period of inactivity may be slower.
