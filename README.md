# PF2e Helper

Помощник ДМа для Pathfinder 2e. Первый функционал — трекер инициативы.

- `/display` — публичная страница для планшета (порядок ходов, раунд, состояния)
- `/dm` — управление с телефона (требует ключ)
- `/login` — ввод DM-ключа

При любых изменениях на `/dm` страница `/display` обновляется автоматически через Server-Sent Events.

## Локальный запуск

```bash
npm install
npx prisma migrate deploy
npm run dev
```

`.env`:

```
DATABASE_URL="file:./dev.db"
DM_KEY="changeme"
```

Открыть `http://localhost:3000/login`, ввести ключ, дальше `/dm`.

---

## Деплой на VDS (Ubuntu 22.04+)

Дальше — пошаговый чек-лист. Замени `pf2e.example.com` на свой домен и `your_user` на имя своего юзера.

### 0. Предусловия

- VDS с Ubuntu, root-доступ или sudo
- Домен с A-записью на IP сервера (через DNS-панель регистратора)
- Открытые порты 80 и 443

### 1. Базовая подготовка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Установить Node.js 22 (LTS) и pnpm/npm

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

### 3. Клонировать проект и собрать

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/misterkisus/DM-Helper.git pf2e-helper
cd pf2e-helper

npm ci
```

Создать `.env` (НЕ коммитить!):

```bash
cat > .env <<EOF
DATABASE_URL="file:/var/www/pf2e-helper/prisma/prod.db"
DM_KEY="$(openssl rand -hex 24)"
NODE_ENV=production
EOF

cat .env  # запомни DM_KEY — это твой пароль на /login
```

Применить миграции и собрать:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

### 4. Systemd-юнит для автозапуска

```bash
sudo tee /etc/systemd/system/pf2e-helper.service > /dev/null <<'EOF'
[Unit]
Description=PF2e Helper (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/pf2e-helper
EnvironmentFile=/var/www/pf2e-helper/.env
ExecStart=/usr/bin/npm run start -- -p 3000 -H 127.0.0.1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo chown -R www-data:www-data /var/www/pf2e-helper
sudo systemctl daemon-reload
sudo systemctl enable --now pf2e-helper
sudo systemctl status pf2e-helper --no-pager
```

Проверка: `curl -I http://127.0.0.1:3000` — должен вернуть 200 или 307 (редирект на `/display`).

### 5. Nginx как reverse-proxy (с поддержкой SSE)

```bash
sudo tee /etc/nginx/sites-available/pf2e-helper > /dev/null <<'EOF'
server {
    listen 80;
    server_name 45.114.61.202;

    # для certbot http-01
    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # КРИТИЧНО для SSE на /api/events:
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
        chunked_transfer_encoding on;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/pf2e-helper /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 6. HTTPS через Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pf2e.example.com --redirect --agree-tos -m you@example.com -n
```

Certbot сам перепишет конфиг и добавит автообновление сертификата.

### 7. Проверка

- `https://pf2e.example.com/display` — пустой бой ("Бой не начат")
- `https://pf2e.example.com/login` — вводишь `DM_KEY` из `.env`
- На телефоне `/dm`, на планшете `/display`. Жмёшь "Опубликовать" — планшет обновляется

### 8. Бэкап БД

```bash
# раз в день в 4 утра
echo '0 4 * * * cp /var/www/pf2e-helper/prisma/prod.db /var/backups/pf2e-$(date +\%F).db && find /var/backups -name "pf2e-*.db" -mtime +30 -delete' \
  | sudo crontab -
sudo mkdir -p /var/backups
```

### 9. Обновление кода

```bash
cd /var/www/pf2e-helper
sudo -u www-data git pull
sudo -u www-data npm ci --omit=dev=false
sudo -u www-data npx prisma migrate deploy
sudo -u www-data npm run build
sudo systemctl restart pf2e-helper
```

---

## Структура проекта

- `prisma/schema.prisma` — модель данных (Character, Encounter, Combatant, Condition)
- `src/lib/conditions.ts` — словарь состояний PF2e (RU)
- `src/lib/events.ts` — SSE-broadcaster (in-memory)
- `src/app/api/*` — REST для DM
- `src/app/dm/*` — страница управления
- `src/app/display/*` — страница для планшета
- `src/app/login/*` — ввод ключа

## Замечания

- SSE работает в одном Node-процессе. Не масштабируй на несколько инстансов без замены брокера на Redis pub/sub.
- SQLite подходит для одной игры за раз. Если планируешь параллельные сессии разных ДМов — переходи на Postgres.
