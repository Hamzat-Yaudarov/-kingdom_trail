# Kingdom Trail

Telegram MiniApp game about growing a fantasy base with fixed building slots, server-side progression, and Supabase persistence.

## Local development

1. Create a root `.env` from `.env.example`.
2. Make sure `SUPABASE_URL` is the project URL without `/rest/v1/`.
3. Install dependencies:

```bash
npm install
```

4. Run the project:

```bash
npm run dev
```

5. Open:

```text
http://localhost:5173
```

Local web uses dev auth automatically when not opened inside Telegram.

## Build

```bash
npm run build
```

## Production start

```bash
npm run start
```

## Simple VPS deploy flow

This project is prepared for the same simple update flow as your current MiniApp:

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

Files already prepared in the repo:

- `kingdom-trail.service`
- `install-vps.sh`
- `deploy.sh`

One-time server setup:

```bash
cd /home/kingdom-trail/app
chmod +x install-vps.sh deploy.sh
./install-vps.sh
```

Logs:

```bash
journalctl -u kingdom-trail -f
```

## Telegram webhook registration

After the production domain is online and HTTPS works:

```bash
npm run set:webhook
```

This registers:

```text
https://<APP_URL>/webhook/telegram
```

using `TELEGRAM_WEBHOOK_SECRET`.

## Detailed deployment

See `docs/DEPLOY.md`.
