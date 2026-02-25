#!/bin/bash
# Деплой на Google Cloud Run
# Использование: ./deploy.sh <PROJECT_ID> <REGION>
# Пример: ./deploy.sh my-project europe-west1

PROJECT_ID=${1:?"Укажи PROJECT_ID: ./deploy.sh my-project europe-west1"}
REGION=${2:-"europe-west1"}
REPO="gcr.io/$PROJECT_ID"

echo "==> Деплой в проект: $PROJECT_ID, регион: $REGION"

# 1. Собираем и пушим образы
echo "==> Сборка backend..."
gcloud builds submit ./backend \
  --tag "$REPO/backend" \
  --project "$PROJECT_ID"

echo "==> Сборка frontend..."
gcloud builds submit ./frontend \
  --tag "$REPO/frontend" \
  --project "$PROJECT_ID"

# 2. Деплоим backend
echo "==> Деплой backend..."
gcloud run deploy backend \
  --image "$REPO/backend" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "SECRET_KEY=change-me-in-production" \
  --project "$PROJECT_ID"

# Получаем URL backend
BACKEND_URL=$(gcloud run services describe backend \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)")

echo "==> Backend URL: $BACKEND_URL"

# 3. Деплоим frontend с URL backend
echo "==> Деплой frontend..."
gcloud run deploy frontend \
  --image "$REPO/frontend" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "BACKEND_URL=$BACKEND_URL" \
  --project "$PROJECT_ID"

FRONTEND_URL=$(gcloud run services describe frontend \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)")

echo ""
echo "===================================="
echo "Готово!"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "===================================="
echo ""
echo "ВАЖНО: Обнови CORS в backend:"
echo "  gcloud run services update backend \\"
echo "    --region $REGION \\"
echo "    --update-env-vars CORS_ORIGINS=$FRONTEND_URL \\"
echo "    --project $PROJECT_ID"
