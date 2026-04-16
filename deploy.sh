#!/bin/bash
set -e

PROJECT_ID="adveralabs"
IMAGE="gcr.io/${PROJECT_ID}/neetcode-practice"
SERVICE_NAME="neetcode-practice"
REGION="us-central1"
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:adveralabs-mysql"

echo "Building and pushing Docker image..."
gcloud builds submit --tag "$IMAGE" .

echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --add-cloudsql-instances "$INSTANCE_CONNECTION_NAME" \
  --set-env-vars "INSTANCE_CONNECTION_NAME=${INSTANCE_CONNECTION_NAME}" \
  --set-env-vars "DB_NAME=neetcode_db" \
  --set-env-vars "DB_USER=test" \
  --set-secrets "DB_PASS=neetcode-db-password:latest" \
  --port 8080 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3

echo "Deploy complete!"
URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
echo "Service URL: $URL"
echo "Health Check: ${URL}/api/health"
