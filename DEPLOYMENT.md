# Deployment Guide

## Quick Start Guide

### Local Development (5 minutes)

1. **Install Prerequisites:**
   - Install MySQL 8+ and Redis 7+
   - Install Node.js 18+

2. **Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. **Run:**
   ```bash
   npm run dev
   ```

5. **Access:**
   - API: http://localhost:4000
   - Docs: http://localhost:4000/api-docs
   - Login: `admin@hrmanagement.com` / `Admin@123`

---

## Production Deployment Options

### 1. PM2 on VPS/EC2 (Recommended for most)

**Pros:** Full control, cost-effective, easy scaling
**Cons:** More setup, manual infrastructure management

**Steps:**

```bash
# 1. Install Node.js, MySQL, Redis on server
# 2. Clone repository
# 3. Install dependencies
npm ci

# 4. Set environment variables
cp .env.example .env
nano .env

# 5. Build
npm run build

# 6. Run migrations
npx prisma migrate deploy

# 7. Seed (first time only)
npm run prisma:seed

# 8. Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 9. Setup nginx reverse proxy (optional but recommended)
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**SSL with Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

### 2. systemd Service (For dedicated servers)

**Pros:** Native Linux integration, automatic restart, logs to journald
**Cons:** Single process, no built-in clustering

**Steps:**

```bash
# 1. Copy service file
sudo cp hr-backend.service /etc/systemd/system/

# 2. Edit service file
sudo nano /etc/systemd/system/hr-backend.service
# Update paths and user

# 3. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable hr-backend
sudo systemctl start hr-backend

# 4. Check status
sudo systemctl status hr-backend

# 5. View logs
sudo journalctl -u hr-backend -f
```

---

### 3. AWS Elastic Beanstalk

**Pros:** Managed infrastructure, auto-scaling, load balancing
**Cons:** AWS lock-in, higher cost

**Steps:**

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize
eb init

# 3. Create environment
eb create hr-backend-prod

# 4. Set environment variables
eb setenv \
  NODE_ENV=production \
  DATABASE_URL="mysql://..." \
  JWT_ACCESS_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  IMAGEKIT_PUBLIC_KEY="..." \
  IMAGEKIT_PRIVATE_KEY="..." \
  IMAGEKIT_URL_ENDPOINT="..." \
  BREVO_SMTP_HOST="..." \
  BREVO_SMTP_PORT="587" \
  BREVO_SMTP_USER="..." \
  BREVO_SMTP_PASS="..." \
  FROM_EMAIL="..." \
  REDIS_URL="..."

# 5. Deploy
eb deploy

# 6. Open in browser
eb open
```

**Use RDS for MySQL and ElastiCache for Redis**

---

### 4. Heroku

**Pros:** Simple deployment, zero config, add-ons marketplace
**Cons:** More expensive, less control

**Steps:**

```bash
# 1. Install Heroku CLI
# Download from https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create hr-backend

# 4. Add buildpack
heroku buildpacks:set heroku/nodejs

# 5. Add MySQL (JawsDB or ClearDB)
heroku addons:create jawsdb:kitefin

# 6. Add Redis
heroku addons:create heroku-redis:mini

# 7. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_ACCESS_SECRET="..."
heroku config:set JWT_REFRESH_SECRET="..."
# ... (set all other env vars)

# 8. Deploy
git push heroku main

# 9. Run migrations
heroku run npx prisma migrate deploy

# 10. Seed database
heroku run npm run prisma:seed

# 11. Open app
heroku open
```

---

### 5. DigitalOcean App Platform

**Pros:** Simple, affordable, managed databases
**Cons:** Less flexible than VPS

**Steps:**

1. Connect GitHub repository
2. Select branch (main)
3. Auto-detect Node.js
4. Add build command: `npm run build`
5. Add run command: `npm start`
6. Add environment variables
7. Attach Managed MySQL and Redis
8. Deploy

---

### 6. Railway

**Pros:** Very simple, git-based deployment, free tier
**Cons:** Young platform, limited regions

**Steps:**

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Init: `railway init`
4. Add MySQL: `railway add mysql`
5. Add Redis: `railway add redis`
6. Deploy: `railway up`
7. Set env vars in Railway dashboard
8. Run migrations: `railway run npx prisma migrate deploy`

---

## Managed Database Services

### MySQL Options

| Service | Pros | Cons | Price |
|---------|------|------|-------|
| **AWS RDS** | Reliable, auto-backups, scaling | Complex setup | ~$15/mo |
| **PlanetScale** | Serverless, branches, CLI | MySQL fork | Free tier available |
| **DigitalOcean** | Simple, affordable | Basic features | $15/mo |
| **Google Cloud SQL** | Good integration | GCP only | ~$10/mo |

### Redis Options

| Service | Pros | Cons | Price |
|---------|------|------|-------|
| **Upstash** | Serverless, pay-per-request | Limited features | Free tier available |
| **Redis Cloud** | Official, full features | More expensive | Free tier: 30MB |
| **AWS ElastiCache** | Reliable, AWS integration | Complex setup | ~$15/mo |
| **DigitalOcean** | Simple, affordable | Basic | $15/mo |

---

## Migration Strategy

### Production Migrations

**Never** use `prisma migrate dev` in production!

**Correct approach:**

```bash
# 1. Create migration locally
npx prisma migrate dev --name add_new_field

# 2. Test migration
npm run test

# 3. Commit migration files
git add prisma/migrations
git commit -m "Add migration: add_new_field"

# 4. Deploy to production
# During deployment, run:
npx prisma migrate deploy
```

**Automated in CI/CD:**

```yaml
# In .github/workflows/ci.yml
- name: Run migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Environment Variables Checklist

Essential variables for production:

```bash
# Server
✓ NODE_ENV=production
✓ PORT=4000

# Database
✓ DATABASE_URL=mysql://user:pass@host:3306/db

# JWT (MUST be strong, 32+ chars)
✓ JWT_ACCESS_SECRET=
✓ JWT_REFRESH_SECRET=

# ImageKit
✓ IMAGEKIT_PUBLIC_KEY=
✓ IMAGEKIT_PRIVATE_KEY=
✓ IMAGEKIT_URL_ENDPOINT=

# Brevo Email
✓ BREVO_SMTP_HOST=
✓ BREVO_SMTP_PORT=
✓ BREVO_SMTP_USER=
✓ BREVO_SMTP_PASS=
✓ FROM_EMAIL=

# Redis
✓ REDIS_URL=

# Security
✓ CORS_ORIGIN=https://yourdomain.com
✓ COOKIE_SECURE=true
✓ COOKIE_DOMAIN=yourdomain.com

# Optional
○ SENTRY_DSN=
○ LOG_LEVEL=info
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Environment variables set
- [ ] Database migrated
- [ ] Database seeded (if first deploy)
- [ ] Redis accessible
- [ ] ImageKit configured
- [ ] Brevo SMTP configured
- [ ] CORS origins whitelisted
- [ ] SSL certificate installed
- [ ] Monitoring setup (logs, metrics)
- [ ] Backups configured
- [ ] Rate limiting tested
- [ ] Health check endpoint accessible
- [ ] API documentation accessible

---

## Monitoring & Maintenance

### Logs

**PM2:**
```bash
pm2 logs hr-backend
pm2 logs hr-backend --lines 100
pm2 logs hr-backend --err
```

**systemd:**
```bash
sudo journalctl -u hr-backend -f
sudo journalctl -u hr-backend --since "1 hour ago"
```

### Metrics

```bash
# Health check
curl http://localhost:4000/api/health

# Metrics
curl http://localhost:4000/api/metrics
```

### Database Backups

**Automated MySQL backup:**
```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p hr_db > /backups/hr_db_$DATE.sql
find /backups -name "hr_db_*.sql" -mtime +7 -delete
```

```bash
# Make executable
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /path/to/backup.sh
```

---

## Scaling

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Upgrade database plan
- Increase Redis memory

### Horizontal Scaling
- Use PM2 cluster mode (already configured)
- Add load balancer (nginx, AWS ALB)
- Use read replicas for database
- Implement caching (Redis)

### PM2 Cluster Mode
```bash
# Already configured in ecosystem.config.js
# instances: 'max' uses all CPU cores
pm2 start ecosystem.config.js --env production
```

---

## Troubleshooting

### Common Issues

**1. Database connection fails:**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -h host -u user -p

# Check DATABASE_URL format
# mysql://username:password@host:port/database
```

**2. Redis connection fails:**
```bash
# Check Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping

# Check REDIS_URL format
# redis://localhost:6379
```

**3. Migrations fail:**
```bash
# Check migration status
npx prisma migrate status

# Reset (development only!)
npx prisma migrate reset

# Force deploy
npx prisma migrate deploy --force
```

**4. Port already in use:**
```bash
# Find process
lsof -i :4000

# Kill process
kill -9 <PID>
```

**5. Out of memory:**
```bash
# Check memory
free -h

# Restart PM2
pm2 restart hr-backend

# Increase memory limit in ecosystem.config.js
# max_memory_restart: '1G'
```

---

## Support

For deployment issues:
- Documentation: README.md
- Issues: GitHub Issues
- Email: support@hrmanagement.com
