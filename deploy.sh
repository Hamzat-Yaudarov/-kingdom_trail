#!/bin/bash

set -e

VPS_IP="127.0.0.1"
VPS_USER="root"
VPS_PATH="/home/kingdom-trail"
SERVICE_NAME="kingdom-trail"

echo "🚀 Deploying Kingdom Trail..."

ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH}/app && git pull origin main"
ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH}/app && npm install"
ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH}/app && npm run build"
ssh "${VPS_USER}@${VPS_IP}" "sudo cp ${VPS_PATH}/app/kingdom-trail.service /etc/systemd/system/"
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl daemon-reload"
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl restart ${SERVICE_NAME}"
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl status ${SERVICE_NAME} --no-pager"

echo "✅ Deployment finished"
echo "📝 Logs: ssh ${VPS_USER}@${VPS_IP} journalctl -u ${SERVICE_NAME} -f"
