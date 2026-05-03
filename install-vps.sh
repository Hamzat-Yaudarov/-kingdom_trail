#!/bin/bash

set -e

APP_PATH="/home/kingdom-trail/app"
SERVICE_NAME="kingdom-trail"

require_env_var() {
  local key="$1"
  local value
  value=$(grep -E "^${key}=" .env 2>/dev/null | tail -n 1 | cut -d'=' -f2-)
  if [ -z "$value" ]; then
    echo "❌ Missing required .env value: ${key}"
    MISSING_ENV=1
  fi
}

echo "📦 Installing dependencies"
cd "${APP_PATH}"

if [ ! -f .env ]; then
  echo "❌ .env file not found in ${APP_PATH}"
  echo "Create it first: cp .env.example .env && nano .env"
  exit 1
fi

MISSING_ENV=0
require_env_var "APP_URL"
require_env_var "WEBAPP_URL"
require_env_var "API_BASE_URL"
require_env_var "BOT_TOKEN"
require_env_var "TELEGRAM_BOT_USERNAME"
require_env_var "TELEGRAM_WEBHOOK_SECRET"
require_env_var "SUPABASE_URL"
require_env_var "SUPABASE_SERVICE_ROLE_KEY"
require_env_var "SUPABASE_PROJECT_ID"
require_env_var "JWT_SECRET"

if [ "$MISSING_ENV" -ne 0 ]; then
  echo ""
  echo "🛑 Fill required values in .env and run ./install-vps.sh again"
  exit 1
fi

npm install

echo "🏗️ Building project"
npm run build

echo "⚙️ Installing systemd service"
sudo cp kingdom-trail.service /etc/systemd/system/kingdom-trail.service
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"

echo "🚀 Starting service"
sudo systemctl restart "${SERVICE_NAME}"
sleep 2
sudo systemctl status "${SERVICE_NAME}" --no-pager

echo "🌐 Registering Telegram webhook"
npm run set:webhook

echo "✅ VPS setup complete"
echo "📝 Logs: journalctl -u ${SERVICE_NAME} -f"
