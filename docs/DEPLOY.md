# Deploy Guide

## 1. DNS

You need a working public domain before Telegram MiniApp can open.

For this project:

```text
kingdom-trail.idlebat.online
```

What to do:

1. Create an `A` record for `kingdom-trail.idlebat.online`.
2. Point it to your VPS public IP.
3. Wait until the domain resolves publicly.

Check from your machine:

```bash
nslookup kingdom-trail.idlebat.online
```

MiniApp will not open from Telegram until this works.

## 2. Server folder

Recommended production path is:

```text
/home/kingdom-trail/app
```

## 3. Node.js

Check that Node.js and npm are installed:

```bash
node -v
npm -v
```

Recommended: Node 22.

## 4. Upload project

Locally:

```bash
git add .
git commit -m "Initial Kingdom Trail setup"
git push -u origin main
```

On the server:

```bash
cd /home/kingdom-trail/app
git pull origin main
npm install
npm run build
```

## 5. Production `.env`

Create:

```text
/home/kingdom-trail/app/.env
```

Use this shape:

```env
NODE_ENV=production
PORT=3000

APP_URL=https://kingdom-trail.idlebat.online
WEBAPP_URL=https://kingdom-trail.idlebat.online
API_BASE_URL=https://kingdom-trail.idlebat.online/api

BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=kingdomtrail_bot
TELEGRAM_WEBHOOK_SECRET=...

SUPABASE_URL=https://cicxisazmiwakmzyzacv.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_PROJECT_ID=cicxisazmiwakmzyzacv

JWT_SECRET=...
SESSION_TTL_HOURS=168
```

## 6. Supabase migration

Run the SQL from:

```text
supabase/migrations/001_initial_schema.sql
```

How:

1. Open Supabase.
2. Go to `SQL Editor`.
3. Paste the migration.
4. Click `Run`.
5. Verify tables exist:
   - `players`
   - `player_buildings`
   - `construction_queue`

## 7. Nginx config

Example nginx site:

```nginx
server {
    listen 80;
    server_name kingdom-trail.idlebat.online;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kingdom-trail.idlebat.online;

    ssl_certificate /etc/letsencrypt/live/kingdom-trail.idlebat.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kingdom-trail.idlebat.online/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Then reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 8. HTTPS

Telegram WebApp requires HTTPS.

If certificates are not ready yet, create them with certbot.

Example:

```bash
sudo certbot --nginx -d kingdom-trail.idlebat.online
```

## 9. systemd service

Example service file:

```ini
[Unit]
Description=Kingdom Trail
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/kingdom-trail/app
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

Use the service file from the repo:

```bash
cd /home/kingdom-trail/app
sudo cp kingdom-trail.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kingdom-trail
sudo systemctl restart kingdom-trail
sudo systemctl status kingdom-trail
```

## 10. Register Telegram webhook

After the server is live:

```bash
cd /home/kingdom-trail/app
npm run set:webhook
```

This uses:

```text
POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

with:

```text
https://kingdom-trail.idlebat.online/webhook/telegram
```

## 11. BotFather setup

Open `@BotFather`.

Do this:

1. `/mybots`
2. Choose `@kingdomtrail_bot`
3. `Bot Settings`
4. `Menu Button`
5. Set `Web App`
6. URL:

```text
https://kingdom-trail.idlebat.online
```

Commands:

1. `/setcommands`
2. Select `@kingdomtrail_bot`
3. Add:

```text
start - Open Kingdom Trail
```

## 12. Production update flow

Locally:

```bash
git add .
git commit -m "Update Kingdom Trail"
git push -u origin main
```

On the server:

```bash
cd /home/kingdom-trail/app
git pull origin main
npm install
npm run build
sudo systemctl restart kingdom-trail
```

Or just use:

```bash
cd /home/kingdom-trail/app
./install-vps.sh
```

## 13. Final checks

Check these URLs:

1. `https://kingdom-trail.idlebat.online`
2. `https://kingdom-trail.idlebat.online/health`

Expected:

1. Main page opens over HTTPS.
2. `/health` returns `{ "ok": true }`.
3. Bot `/start` returns the button.
4. Tapping the button opens the MiniApp.

## 14. Secret rotation

After development and before production handoff:

1. Rotate `BOT_TOKEN`
2. Rotate `SUPABASE_SERVICE_ROLE_KEY`
3. Rotate `SUPABASE_ANON_KEY` if needed
4. Rotate `JWT_SECRET`
5. Rotate `TELEGRAM_WEBHOOK_SECRET`
