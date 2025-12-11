# HR Management System Backend

Production-grade RESTful backend for an HR management system built with Express.js, TypeScript, Prisma ORM, MySQL, JWT authentication, RBAC, ImageKit, Brevo, and BullMQ.

## Features

- **TypeScript** - Type-safe development
- **Express.js** - Fast, minimalist web framework
- **Prisma ORM** - Modern database toolkit
- **MySQL** - Relational database
- **JWT Authentication** - Access and refresh tokens with httpOnly cookies
- **RBAC** - Role-based access control with fine-grained permissions
- **ImageKit Integration** - Server-side signed uploads
- **Brevo Email** - Transactional emails via SMTP
- **BullMQ** - Redis-based job queuing for emails
- **WebSocket/SSE** - Real-time notifications
- **OpenAPI/Swagger** - Auto-generated API documentation
- **Pino Logger** - Structured logging
- **Security** - Helmet, rate limiting, CORS, input validation
- **Testing** - Jest integration and unit tests
- **CI/CD** - GitHub Actions workflow

## Tech Stack

- Node.js 18+
- TypeScript
- Express.js
- Prisma ORM
- MySQL 8+
- Redis 7+
- JWT (jsonwebtoken)
- Argon2 (password hashing)
- ImageKit
- Brevo (formerly Sendinblue)
- BullMQ
- Socket.io
- Zod (validation)
- Pino (logging)
- Jest (testing)

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration files
│   └── seed.ts               # Database seeder
├── src/
│   ├── config/               # Configuration files
│   │   ├── env.ts           # Environment validation
│   │   ├── database.ts      # Prisma client
│   │   ├── redis.ts         # Redis client
│   │   ├── logger.ts        # Pino logger
│   │   └── swagger.ts       # Swagger config
│   ├── controllers/         # Route controllers
│   │   ├── auth.controller.ts
│   │   └── upload.controller.ts
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── security.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── services/            # Business logic
│   │   ├── auth.service.ts
│   │   ├── permission.service.ts
│   │   ├── user.service.ts
│   │   ├── leave.service.ts
│   │   ├── imagekit.service.ts
│   │   ├── email.service.ts
│   │   ├── notification.service.ts
│   │   └── audit.service.ts
│   ├── queues/             # BullMQ job queues
│   │   └── email.queue.ts
│   ├── routes/             # API routes
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   └── upload.routes.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── utils/              # Utility functions
│   │   ├── response.ts
│   │   ├── errors.ts
│   │   ├── pagination.ts
│   │   └── validators.ts
│   ├── tests/              # Test files
│   │   ├── setup.ts
│   │   └── auth.test.ts
│   ├── app.ts              # Express app
│   └── index.ts            # Server entry point
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── ecosystem.config.js     # PM2 config
├── hr-backend.service      # systemd service
└── README.md
```

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** >= 8.0
- **Redis** >= 7.0

## Local Development Setup

### 1. Install MySQL

**Windows:**
```bash
# Download MySQL installer from https://dev.mysql.com/downloads/installer/
# Run installer and follow setup wizard
# Create a database for the project
mysql -u root -p
CREATE DATABASE hr_db;
```

**macOS:**
```bash
brew install mysql
brew services start mysql
mysql -u root -p
CREATE DATABASE hr_db;
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql -u root -p
CREATE DATABASE hr_db;
```

### 2. Install Redis

**Windows:**
```bash
# Download Redis from https://github.com/microsoftarchive/redis/releases
# Or use WSL2 and follow Linux instructions
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

### 3. Clone and Install

```bash
cd backend
npm install
```

### 4. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=4000
NODE_ENV=development

DATABASE_URL=mysql://root:password@localhost:3306/hr_db

JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars

IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/yourid/

BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_login
BREVO_SMTP_PASS=your_brevo_api_key
FROM_EMAIL=noreply@yourcompany.com

REDIS_URL=redis://localhost:6379

CORS_ORIGIN=http://localhost:3000
```

### 5. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with initial data
npm run prisma:seed
```

**Default Users Created:**
- Super Admin: `admin@hrmanagement.com` / `Admin@123`
- HR Manager: `hr@hrmanagement.com` / `Admin@123`
- Employee: `employee@hrmanagement.com` / `Admin@123`

### 6. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

API Documentation: `http://localhost:4000/api-docs`

### 7. Run Tests

```bash
npm test
```

## Production Deployment (Non-Docker)

### Option 1: PM2 (Process Manager)

**1. Install PM2 globally:**

```bash
npm install -g pm2
```

**2. Build the application:**

```bash
npm run build
```

**3. Start with PM2:**

```bash
# Start in cluster mode
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs hr-backend

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

**4. Manage the application:**

```bash
# Restart
pm2 restart hr-backend

# Stop
pm2 stop hr-backend

# Delete
pm2 delete hr-backend

# Reload (zero downtime)
pm2 reload hr-backend
```

### Option 2: systemd Service

**1. Copy service file:**

```bash
sudo cp hr-backend.service /etc/systemd/system/
```

**2. Edit service file paths:**

```bash
sudo nano /etc/systemd/system/hr-backend.service
```

Update paths:
- `WorkingDirectory=/path/to/your/backend`
- `EnvironmentFile=/path/to/your/backend/.env`
- `ExecStart=/usr/bin/node /path/to/your/backend/dist/index.js`

**3. Enable and start service:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable hr-backend

# Start service
sudo systemctl start hr-backend

# Check status
sudo systemctl status hr-backend

# View logs
sudo journalctl -u hr-backend -f
```

**4. Manage service:**

```bash
# Restart
sudo systemctl restart hr-backend

# Stop
sudo systemctl stop hr-backend

# Reload
sudo systemctl reload hr-backend
```

### Option 3: Managed Cloud Services

#### AWS Deployment

**Using Elastic Beanstalk:**

1. Install EB CLI:
```bash
pip install awsebcli
```

2. Initialize EB:
```bash
eb init
```

3. Create environment:
```bash
eb create hr-backend-prod
```

4. Deploy:
```bash
eb deploy
```

5. Set environment variables:
```bash
eb setenv DATABASE_URL=mysql://... JWT_ACCESS_SECRET=... (etc.)
```

**Using EC2:**

1. Launch EC2 instance (Ubuntu 22.04 LTS)
2. SSH into instance
3. Install Node.js, MySQL, Redis
4. Clone repository
5. Follow PM2 or systemd setup above
6. Configure security groups to allow port 4000

#### Heroku Deployment

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create hr-backend`
4. Add buildpack: `heroku buildpacks:set heroku/nodejs`
5. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=mysql://...
heroku config:set JWT_ACCESS_SECRET=...
# (etc.)
```
6. Deploy: `git push heroku main`

### Managed Database & Redis

**MySQL:**
- AWS RDS: https://aws.amazon.com/rds/
- Google Cloud SQL: https://cloud.google.com/sql
- PlanetScale: https://planetscale.com/
- DigitalOcean Managed MySQL: https://www.digitalocean.com/products/managed-databases

**Redis:**
- AWS ElastiCache: https://aws.amazon.com/elasticache/
- Upstash: https://upstash.com/
- Redis Cloud: https://redis.com/
- DigitalOcean Managed Redis: https://www.digitalocean.com/products/managed-databases

### Running Migrations in Production

**Never** run `prisma migrate dev` in production.

**Instead, use:**

```bash
# During deployment (CI/CD or manual)
npx prisma migrate deploy
```

Add this to your deployment script:

```bash
#!/bin/bash
# deploy.sh

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Restart with PM2
pm2 reload hr-backend
```

## API Documentation

Once the server is running, access Swagger UI at:

```
http://localhost:4000/api-docs
```

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

**Uploads:**
- `POST /api/uploads/sign` - Get ImageKit signature
- `POST /api/uploads/complete` - Complete upload
- `GET /api/uploads` - Get user files
- `GET /api/uploads/:id` - Get file details
- `PUT /api/uploads/:id` - Update file metadata
- `DELETE /api/uploads/:id` - Delete file

**Health:**
- `GET /api/health` - Health check
- `GET /api/metrics` - Metrics endpoint

## ImageKit Integration

**Client-Side Upload Flow:**

1. Request signature from backend:
```javascript
const response = await fetch('/api/uploads/sign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const { signature, token, expire, publicKey, urlEndpoint } = await response.json();
```

2. Upload directly to ImageKit:
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('publicKey', publicKey);
formData.append('signature', signature);
formData.append('expire', expire);
formData.append('token', token);
formData.append('fileName', fileName);

const uploadResponse = await fetch(`${urlEndpoint}/api/v1/files/upload`, {
  method: 'POST',
  body: formData
});
const uploadData = await uploadResponse.json();
```

3. Complete upload on backend:
```javascript
await fetch('/api/uploads/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileId: uploadData.fileId,
    name: uploadData.name,
    url: uploadData.url,
    thumbnailUrl: uploadData.thumbnailUrl,
    size: uploadData.size,
    fileType: uploadData.fileType,
    type: 'DOCUMENT'
  })
});
```

## Email Queue with BullMQ

Emails are queued using BullMQ and processed asynchronously.

**Queue Email:**

```typescript
import { queueWelcomeEmail } from './queues/email.queue';

await queueWelcomeEmail('user@example.com', 'John');
```

**Monitor Queue:**

```typescript
// Get queue stats
const jobCounts = await emailQueue.getJobCounts();

// Get failed jobs
const failedJobs = await emailQueue.getFailed();
```

## Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` file
   - Use strong secrets (min 32 characters)
   - Rotate secrets regularly

2. **Password Policy:**
   - Min 8 characters
   - Must contain uppercase, lowercase, number, special character
   - Hashed with Argon2

3. **JWT Tokens:**
   - Access token: 15 minutes
   - Refresh token: 30 days
   - Refresh tokens stored hashed in database
   - Token rotation on refresh

4. **Rate Limiting:**
   - General: 100 requests per 15 minutes
   - Auth endpoints: 5 attempts per 15 minutes

5. **CORS:**
   - Whitelist specific origins
   - Credentials enabled for cookies

6. **Security Headers:**
   - Helmet.js configured
   - HSTS enabled
   - Content Security Policy

## Performance Optimization

1. **Database Indices:**
   - All foreign keys indexed
   - Frequently queried fields indexed
   - See Prisma schema for details

2. **Pagination:**
   - Default: 20 items per page
   - Max: 100 items per page

3. **Connection Pooling:**
   - Prisma handles connection pooling
   - Configure pool size in DATABASE_URL

4. **Caching:**
   - Redis for session storage
   - Consider adding query caching

5. **Clustering:**
   - PM2 cluster mode enabled
   - Utilizes all CPU cores

## Monitoring & Observability

**Logs:**
- Development: Pretty-printed to console
- Production: JSON formatted to stdout
- Use log aggregation (CloudWatch, Datadog, etc.)

**Metrics Endpoint:**
```
GET /api/metrics
```

Returns:
- Uptime
- Memory usage
- Timestamp

**Health Check:**
```
GET /api/health
```

**APM Integration:**
- Sentry for error tracking
- Add `SENTRY_DSN` to environment

## Troubleshooting

**Database Connection Issues:**
```bash
# Test MySQL connection
mysql -h localhost -u root -p

# Check Prisma connection
npx prisma db pull
```

**Redis Connection Issues:**
```bash
# Test Redis
redis-cli ping

# Check Redis logs
sudo journalctl -u redis -f
```

**Migration Issues:**
```bash
# Reset database (development only)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name migration_name
```

**Port Already in Use:**
```bash
# Find process using port
lsof -i :4000

# Kill process
kill -9 <PID>
```

## CI/CD with GitHub Actions

Workflow includes:
- Linting
- Testing with MySQL and Redis services
- Building
- Optional deployment

**Setup:**

1. Add secrets to GitHub repository:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - Other sensitive environment variables

2. Push to trigger workflow:
```bash
git push origin main
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourorg/hr-backend/issues
- Email: ishirapahasara02@proton.me

