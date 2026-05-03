#!/bin/bash

set -e

APP_PATH="/home/kingdom-trail/app"
SERVICE_NAME="kingdom-trail"

echo "📦 Installing dependencies"
cd "${APP_PATH}"
npm install

echo "🏗️ Building project"
npm run build

echo "⚙️ Installing systemd service"
sudo cp kingdom-trail.service /etc/systemd/system/kingdom-trail.service
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"

echo "🚀 Starting service"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl status "${SERVICE_NAME}" --no-pager

echo "🌐 Registering Telegram webhook"
npm run set:webhook

echo "✅ VPS setup complete"
echo "📝 Logs: journalctl -u ${SERVICE_NAME} -f"
