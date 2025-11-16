# 🛡️ NestJS Auth Starter - Production-Ready Authentication

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **A battle-tested, production-ready NestJS authentication template featuring JWT tokens, RBAC, comprehensive security, and enterprise-grade logging. Get your auth system running in under 15 minutes.**

---

## ⭐ Key Features

- 🔐 **Secure JWT Authentication** - Access & refresh tokens with automatic rotation
- 🍪 **HttpOnly Cookie Storage** - CSRF-protected token storage (no localStorage risks)
- 👥 **Role-Based Access Control (RBAC)** - Extensible permission system with decorators
- 🔄 **Multi-Device Support** - Track and manage refresh tokens across devices
- 🛡️ **Enterprise Security** - Rate limiting, bcrypt (12 rounds), Helmet headers, input validation
- 📊 **Structured Logging** - Pino JSON logs with PII redaction and correlation IDs
- ✅ **Health Check Endpoints** - Kubernetes/ECS-ready liveness & readiness probes
- 📖 **Comprehensive Docs** - Full API documentation and deployment guides

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.x ([Download](https://nodejs.org/))
- **PostgreSQL** >= 16.x ([Download](https://www.postgresql.org/download/))
- **npm** >= 10.x (comes with Node.js)

---

## 🚀 Quick Start (15 Minutes)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/nest-auth-template.git
cd nest-auth-template/api
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your secrets:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nest_auth_db?schema=public"

# JWT Secrets (MUST be 32+ characters - generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET="your-super-secure-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-min-32-chars"
JWT_ACCESS_EXPIRY="60m"
JWT_REFRESH_EXPIRY="30d"

# Server
NODE_ENV="development"
PORT="8080"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Logging
LOG_LEVEL="info"
```

**🔒 Security Note**: Never commit `.env` to version control. Use strong, randomly generated secrets in production.

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data (creates admin & test users)
npm run prisma:seed
```

**Test Credentials** (created by seed):
- **Admin**: `admin@example.com` / `Admin@123`
- **User**: `user@example.com` / `User@123`

### 4. Start Development Server

```bash
npm run start:dev
```

Server starts at: `http://localhost:8080/api/v1`

### 5. Verify Installation

```bash
# Health check
curl http://localhost:8080/api/v1/health

# Expected response:
# {"status":"ok","info":{"database":{"status":"up"}},...}
```

🎉 **You're all set!** Continue to [API Documentation](#-api-documentation) to start using the endpoints.

---

## 📖 API Documentation

Base URL: `http://localhost:8080/api/v1`

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register new user | ❌ No |
| POST | `/auth/login` | Login with credentials | ❌ No |
| POST | `/auth/refresh` | Refresh access token | ✅ Yes (refresh token) |
| POST | `/auth/logout` | Logout and invalidate tokens | ✅ Yes |
| GET | `/auth/me` | Get current user info | ✅ Yes |

#### 📝 POST `/auth/signup` - Register New User

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "fullName": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Success Response (201):**
```json
{
  "user": {
    "id": "cm3k5j8l90000xyz...",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "USER"
  },
  "message": "User registered successfully"
}
```

**Error Response (409 - Email Exists):**
```json
{
  "statusCode": 409,
  "message": "Email already in use",
  "error": "Conflict"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass@123",
    "fullName": "Jane Smith"
  }'
```

---

#### 🔐 POST `/auth/login` - Login

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "cm3k5j8l90000xyz...",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "role": "ADMIN"
  }
}
```

**Cookies Set:**
- `accessToken` (httpOnly, sameSite=strict, 1 hour expiry)
- `refreshToken` (httpOnly, sameSite=strict, 30 days expiry)

**Error Response (401 - Invalid Credentials):**
```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

---

#### 🔄 POST `/auth/refresh` - Refresh Access Token

Exchanges refresh token for new access & refresh tokens (automatic rotation).

**Request:** No body required (uses `refreshToken` cookie)

**Success Response (200):**
```json
{
  "message": "Tokens refreshed successfully"
}
```

**Cookies Updated:**
- New `accessToken` (1 hour)
- New `refreshToken` (30 days)

**Error Response (401 - Invalid/Expired Token):**
```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

---

#### 🚪 POST `/auth/logout` - Logout

Invalidates refresh token and clears cookies.

**Request:** No body required

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
- `accessToken` removed
- `refreshToken` removed

**cURL Example:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -b cookies.txt
```

---

#### 👤 GET `/auth/me` - Get Current User

Returns authenticated user's information.

**Request:** No body required (uses `accessToken` cookie)

**Success Response (200):**
```json
{
  "id": "cm3k5j8l90000xyz...",
  "email": "admin@example.com",
  "fullName": "Admin User",
  "role": "ADMIN",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

**Error Response (401 - Not Authenticated):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -b cookies.txt
```

---

### User Profile Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get own profile | ✅ Yes |
| PATCH | `/users/profile` | Update own profile | ✅ Yes |

#### 👤 GET `/users/profile` - Get Profile

**Success Response (200):**
```json
{
  "id": "cm3k5j8l90000xyz...",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "USER",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

#### ✏️ PATCH `/users/profile` - Update Profile

**Request Body:**
```json
{
  "fullName": "John Smith"
}
```

**⚠️ Security Note**: Email cannot be updated via this endpoint for security reasons.

**Success Response (200):**
```json
{
  "id": "cm3k5j8l90000xyz...",
  "email": "user@example.com",
  "fullName": "John Smith",
  "role": "USER",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

---

### Admin Endpoints

**🔐 Requires `ADMIN` role** - All endpoints return 403 Forbidden for non-admin users.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | List all users (paginated) | ✅ ADMIN |
| GET | `/users/:id` | Get user by ID | ✅ ADMIN |
| PATCH | `/users/:id` | Update user | ✅ ADMIN |
| DELETE | `/users/:id` | Soft delete user | ✅ ADMIN |

#### 📋 GET `/users` - List All Users (Paginated)

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page

**Example Request:**
```bash
GET /users?page=1&limit=20
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "cm3k5j8l90000xyz...",
      "email": "user1@example.com",
      "fullName": "User One",
      "role": "USER",
      "isActive": true,
      "createdAt": "2025-11-16T10:30:00.000Z",
      "updatedAt": "2025-11-16T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

#### 🔍 GET `/users/:id` - Get User by ID

**Success Response (200):**
```json
{
  "id": "cm3k5j8l90000xyz...",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "USER",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

#### ✏️ PATCH `/users/:id` - Update User

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "role": "ADMIN",
  "isActive": false
}
```

**Success Response (200):**
```json
{
  "id": "cm3k5j8l90000xyz...",
  "email": "user@example.com",
  "fullName": "Updated Name",
  "role": "ADMIN",
  "isActive": false,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

#### 🗑️ DELETE `/users/:id` - Soft Delete User

Deactivates user and invalidates all their refresh tokens (soft delete - data preserved).

**Success Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

### Health Check Endpoints

**🌐 Public** - No authentication required.

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| GET | `/health` | Full health check with DB | Load balancer checks |
| GET | `/health/ready` | Readiness probe | Kubernetes readiness |
| GET | `/health/live` | Liveness probe | Kubernetes liveness |

#### ❤️ GET `/health` - Health Check

**Success Response (200):**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

#### 🚦 GET `/health/ready` - Readiness Probe

**Success Response (200):**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "application": {
      "status": "up",
      "uptime": 3600.5,
      "timestamp": "2025-11-16T10:30:00.000Z"
    }
  }
}
```

#### 💚 GET `/health/live` - Liveness Probe

Lightweight check without database query.

**Success Response (200):**
```json
{
  "status": "ok",
  "uptime": 3600.5,
  "timestamp": "2025-11-16T10:30:00.000Z",
  "pid": 12345
}
```

---

## 🏗️ Architecture Deep Dive

### Authentication Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. POST /auth/login
     │    {email, password}
     ↓
┌─────────────────┐
│  AuthController │
└────┬────────────┘
     │
     │ 2. Validate credentials
     ↓
┌─────────────┐         ┌──────────────┐
│ AuthService │────────→│ PrismaService│
└────┬────────┘         └──────────────┘
     │                         │
     │ 3. Hash check (bcrypt)  │
     │←────────────────────────┘
     │
     │ 4. Generate JWT tokens
     ↓
┌─────────────┐
│  JwtService │
└────┬────────┘
     │
     │ 5. Store refresh token (hashed)
     ↓
┌──────────────┐
│   Database   │
│ RefreshToken │
└──────────────┘
     │
     │ 6. Set httpOnly cookies
     │    - accessToken (1h)
     │    - refreshToken (30d)
     ↓
┌──────────┐
│  Client  │◄── Cookies stored securely
└──────────┘
```

### Token Refresh Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. POST /auth/refresh
     │    Cookie: refreshToken=xxx
     ↓
┌─────────────────┐
│  AuthController │
└────┬────────────┘
     │
     │ 2. Extract & validate refresh token
     ↓
┌─────────────┐
│ AuthService │
└────┬────────┘
     │
     │ 3. Find token in database
     │    (hashed comparison)
     ↓
┌──────────────┐
│   Database   │
│ RefreshToken │
└────┬─────────┘
     │
     │ 4. Verify token not expired
     │
     │ 5. Generate NEW tokens
     │    (Token Rotation)
     ↓
┌─────────────┐
│  JwtService │
└────┬────────┘
     │
     │ 6. Invalidate old token
     │    Update database with new token
     ↓
┌──────────────┐
│   Database   │
└──────────────┘
     │
     │ 7. Set new cookies
     ↓
┌──────────┐
│  Client  │◄── New tokens (old ones invalid)
└──────────┘
```

### RBAC System

```
┌──────────────────┐
│  @Roles('ADMIN') │◄── Decorator on endpoint
└────┬─────────────┘
     │
     │ 1. Request arrives
     ↓
┌──────────────┐
│  AuthGuard   │◄── Validates JWT, extracts user
└────┬─────────┘
     │
     │ 2. User authenticated
     ↓
┌──────────────┐
│  RolesGuard  │◄── Checks user.role vs required role
└────┬─────────┘
     │
     ├─ PASS: role matches ──→ Execute controller
     │
     └─ FAIL: role mismatch ─→ 403 Forbidden
```

**Adding New Roles:**

1. Update `prisma/schema.prisma`:
```prisma
enum UserRole {
  USER
  ADMIN
  MODERATOR  // New role
}
```

2. Run migration:
```bash
npm run prisma:migrate
```

3. Use in controllers:
```typescript
@Roles(UserRole.MODERATOR)
@Get('moderate')
moderateContent() {
  return 'Only moderators can access';
}
```

### Core Components

#### 📦 AuthModule (`src/modules/auth/`)

**Responsibilities:**
- User authentication (signup, login, logout)
- JWT token generation and validation
- Refresh token rotation
- Password hashing with bcrypt (12 rounds)

**Key Files:**
- `auth.service.ts` - Business logic
- `auth.controller.ts` - HTTP endpoints
- `dtos/` - Request validation schemas

#### 🔒 Security Guards (`src/common/guards/`)

**AuthGuard** (`auth.guard.ts`):
- Validates JWT access token from cookies
- Extracts user info and attaches to request object
- Bypasses public routes (marked with `@Public()` decorator)

**RolesGuard** (`roles.guard.ts`):
- Checks if authenticated user has required role(s)
- Works with `@Roles()` decorator
- Returns 403 Forbidden if insufficient permissions

**RefreshTokenGuard** (`refresh-token.guard.ts`):
- Validates refresh token for `/auth/refresh` endpoint
- Extracts user ID for token rotation

#### 📝 Logging Strategy (`src/config/logger.config.ts`)

**Features:**
- Structured JSON logs via Pino (high performance)
- PII redaction (passwords, tokens excluded from logs)
- Correlation IDs for request tracing
- Different log levels per environment:
  - Production: `info` (minimal, performance-focused)
  - Development: `debug` (verbose for troubleshooting)

**Log Levels:**
- `fatal` - Critical errors requiring immediate attention
- `error` - Error conditions
- `warn` - Warning messages
- `info` - General informational messages
- `debug` - Detailed debug information
- `trace` - Very detailed tracing (development only)

**Example Log Output:**
```json
{
  "level": 30,
  "time": 1700000000000,
  "pid": 12345,
  "hostname": "api-server-01",
  "correlationId": "abc-123-def",
  "msg": "User login successful",
  "userId": "cm3k5j8l90000xyz",
  "role": "USER"
}
```

#### 🎯 Interceptors (`src/common/interceptors/`)

**ResponseInterceptor** (`response.interceptor.ts`):
- Standardizes all API responses
- Adds metadata (timestamp, request ID)
- Transforms errors to consistent format

**Standard Response Format:**
```json
{
  "data": { /* your response */ },
  "meta": {
    "timestamp": "2025-11-16T10:30:00.000Z",
    "correlationId": "abc-123-def"
  }
}
```

---

## 🔒 Security Implementation

### 1. Token Storage Strategy

**✅ What We Use: HttpOnly Cookies**

```typescript
res.cookie('accessToken', token, {
  httpOnly: true,      // Prevents JavaScript access
  sameSite: 'strict',  // CSRF protection
  secure: true,        // HTTPS only in production
  maxAge: 3600000      // 1 hour
});
```

**Why Cookies > LocalStorage:**

| Feature | HttpOnly Cookies | LocalStorage |
|---------|------------------|--------------|
| XSS Protection | ✅ Yes | ❌ No (vulnerable) |
| CSRF Protection | ✅ sameSite=strict | ❌ N/A |
| Auto-send | ✅ Yes | ❌ Manual |
| Server-side only | ✅ Yes | ❌ Client accessible |

### 2. Refresh Token Rotation

Every `/auth/refresh` call:
1. ✅ Validates current refresh token
2. ✅ Generates NEW access & refresh tokens
3. ✅ Invalidates OLD refresh token
4. ✅ Updates database with new token (hashed)

**Benefits:**
- Stolen tokens have limited lifetime
- Old tokens become useless immediately
- Detection of concurrent usage (security breach)

### 3. Password Security

```typescript
// Signup: Hash with bcrypt (12 rounds)
const hashedPassword = await bcrypt.hash(password, 12);

// Login: Constant-time comparison (prevents timing attacks)
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**Password Requirements (enforced):**
- Minimum 8 characters
- 1 uppercase, 1 lowercase, 1 number, 1 special char
- Custom validator: `@IsStrongPassword()` decorator

### 4. Rate Limiting

Protects against brute-force attacks:

```typescript
// Auth endpoints: 5 requests/minute
@Throttle({ default: { ttl: 60000, limit: 5 } })
@Post('login')

// Other endpoints: 10 requests/minute
// Global default in app.module.ts
```

### 5. Account Enumeration Prevention

```typescript
// ❌ Bad: Reveals if email exists
if (!user) throw new Error('User not found');

// ✅ Good: Generic error message
if (!user || !isPasswordValid) {
  throw new UnauthorizedException('Invalid email or password');
}
```

Plus timing attack prevention (always hash password, even if user doesn't exist).

### 6. Database Security

- ✅ Soft deletes (sets `isActive: false` instead of DELETE)
- ✅ Refresh token limit (max 5 per user)
- ✅ Expired token cleanup (background job)
- ✅ Connection pooling configured
- ✅ Prepared statements (Prisma prevents SQL injection)

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ Yes | - | Secret for access tokens (32+ chars) |
| `JWT_REFRESH_SECRET` | ✅ Yes | - | Secret for refresh tokens (32+ chars) |
| `JWT_ACCESS_EXPIRY` | ❌ No | `60m` | Access token lifetime (`60m`, `1h`, etc.) |
| `JWT_REFRESH_EXPIRY` | ❌ No | `30d` | Refresh token lifetime (`7d`, `30d`, etc.) |
| `NODE_ENV` | ❌ No | `development` | Environment: `development`, `production`, `test` |
| `PORT` | ❌ No | `8080` | Server port |
| `CORS_ORIGIN` | ❌ No | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | ❌ No | `info` | Log level: `fatal`, `error`, `warn`, `info`, `debug`, `trace` |

### Generating Secure Secrets

**Option 1: OpenSSL**
```bash
openssl rand -base64 32
```

**Option 2: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Online** (use with caution in production)
- [RandomKeygen](https://randomkeygen.com/)

### CORS Configuration

**Single Origin:**
```env
CORS_ORIGIN="https://yourdomain.com"
```

**Multiple Origins:**
```env
CORS_ORIGIN="https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com"
```

**⚠️ Warning**: Never use `CORS_ORIGIN="*"` in production!

### Token Expiry Formats

Format: `{number}{unit}`

**Valid Units:**
- `s` - seconds
- `m` - minutes
- `h` - hours
- `d` - days

**Examples:**
- `30s` - 30 seconds
- `60m` - 60 minutes (1 hour)
- `24h` - 24 hours (1 day)
- `7d` - 7 days (1 week)

---

## 🎭 Testing

### Run Tests

```bash
# Unit tests
npm run test

# Watch mode (re-runs on file changes)
npm run test:watch

# Test coverage report
npm run test:cov

# End-to-end tests
npm run test:e2e
```

### Coverage Report

After running `npm run test:cov`, open `coverage/lcov-report/index.html` in your browser.

**Target Coverage:**
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

### Sample Test Data

The seed script (`npm run prisma:seed`) creates:

**Admin User:**
- Email: `admin@example.com`
- Password: `Admin@123`
- Role: `ADMIN`

**Regular User:**
- Email: `user@example.com`
- Password: `User@123`
- Role: `USER`

### Testing Authentication Flow

```bash
# 1. Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin@123"}'

# 2. Access protected endpoint
curl -X GET http://localhost:8080/api/v1/auth/me \
  -b cookies.txt

# 3. Refresh tokens
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

# 4. Logout
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -b cookies.txt
```

---

## 📦 Deployment

### Production Deployment

#### Prerequisites

1. **PostgreSQL Database** (AWS RDS, DigitalOcean, etc.)
2. **Node.js Server** (Ubuntu 22.04 LTS recommended)
3. **Reverse Proxy** (Nginx or Caddy for HTTPS)

#### Steps

**1. Build Application**
```bash
npm ci --only=production
npm run prisma:generate
npm run build
```

**2. Set Environment Variables**
```bash
export NODE_ENV=production
export DATABASE_URL="postgresql://user:pass@db.example.com:5432/prod_db"
export JWT_ACCESS_SECRET="your-production-secret-32-chars-min"
export JWT_REFRESH_SECRET="your-production-secret-32-chars-min"
export PORT=8080
export CORS_ORIGIN="https://yourdomain.com"
```

**3. Run Migrations**
```bash
npm run prisma:migrate:deploy
```

**4. Start Application**
```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start dist/main.js --name nest-auth-api

# Or using systemd
sudo systemctl start nest-auth-api
```

**5. Configure Nginx**
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
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

### Production Checklist

Before deploying to production:

#### Security
- [ ] Set strong, unique JWT secrets (32+ characters)
- [ ] Configure CORS to specific domains (no `*`)
- [ ] Enable HTTPS/TLS on load balancer
- [ ] Set `NODE_ENV=production`
- [ ] Review and update security headers
- [ ] Enable rate limiting with appropriate thresholds
- [ ] Set up firewall rules (only necessary ports)
- [ ] Disable source maps in production build

#### Database
- [ ] Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
- [ ] Enable automated backups (daily minimum)
- [ ] Set up connection pooling
- [ ] Configure SSL/TLS for database connections
- [ ] Apply all migrations: `npm run prisma:migrate:deploy`
- [ ] Seed admin user: `npm run prisma:seed`

#### Monitoring
- [ ] Configure health check endpoints in load balancer
- [ ] Set up log aggregation (CloudWatch, Datadog, etc.)
- [ ] Enable APM monitoring (New Relic, Datadog APM)
- [ ] Configure alerts for:
  - High error rates (> 1%)
  - Database connection failures
  - CPU/Memory thresholds (> 80%)
  - API response time degradation (p95 > 500ms)
- [ ] Set up uptime monitoring (Pingdom, UptimeRobot)

#### Performance
- [ ] Enable Redis for rate limiting storage (optional)
- [ ] Configure response caching (if applicable)
- [ ] Set up CDN for static assets
- [ ] Enable gzip compression
- [ ] Configure horizontal scaling (Kubernetes HPA)

#### Disaster Recovery
- [ ] Document rollback procedure
- [ ] Test database restore process
- [ ] Set up multi-region deployment (if required)
- [ ] Configure automated backups
- [ ] Document incident response plan

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Fork the repository**
```bash
gh repo fork yourusername/nest-auth-template
```

2. **Clone your fork**
```bash
git clone https://github.com/your-username/nest-auth-template.git
cd nest-auth-template/api
```

3. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

4. **Make your changes and commit**
```bash
git add .
git commit -m "feat: add amazing feature"
```

5. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

### Branch Naming Conventions

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/modifications
- `chore/` - Maintenance tasks

**Examples:**
- `feature/add-email-verification`
- `fix/refresh-token-expiry`
- `docs/update-deployment-guide`

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks

**Examples:**
```
feat(auth): add email verification on signup

Implements email verification workflow with token-based confirmation.
Users must verify email before accessing protected routes.

Closes #123
```

```
fix(refresh): handle expired token gracefully

Previously, expired refresh tokens caused uncaught exceptions.
Now returns 401 with clear error message.

Fixes #456
```

### Code Quality Standards

Before submitting a PR:

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Check test coverage
npm run test:cov

# Build to ensure no TypeScript errors
npm run build
```

**PR Requirements:**
- ✅ All tests passing
- ✅ No linting errors
- ✅ Test coverage maintained (> 80%)
- ✅ Documentation updated (if applicable)
- ✅ Commit messages follow conventions

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards other contributors

### Security Vulnerability Reporting

**⚠️ Do NOT open public issues for security vulnerabilities**

Email security concerns to: `security@yourdomain.com`

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours and work with you on a fix.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🆘 Troubleshooting

### Common Issues

#### 1. "JWT verification failed"

**Symptoms:** Login works but `/auth/me` returns 401

**Causes:**
- JWT secrets mismatch between `.env` and running app
- Cookies not being sent (CORS issue)
- Access token expired

**Solutions:**
```bash
# 1. Verify .env secrets are loaded
echo $JWT_ACCESS_SECRET

# 2. Check cookie is being sent in request
curl -v http://localhost:8080/api/v1/auth/me -b cookies.txt
# Should see "Cookie: accessToken=..."

# 3. Restart dev server to reload .env
npm run start:dev

# 4. Clear cookies and login again
rm cookies.txt
curl -X POST http://localhost:8080/api/v1/auth/login \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

---

#### 2. "Database connection errors"

**Symptoms:** App crashes with `Can't reach database server`

**Causes:**
- PostgreSQL not running
- Incorrect `DATABASE_URL`
- Firewall blocking port 5432

**Solutions:**
```bash
# 1. Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
# OR
pg_isready -h localhost -p 5432  # Any OS with psql

# 2. Verify DATABASE_URL format
# Should be: postgresql://user:password@host:port/database?schema=public
echo $DATABASE_URL

# 3. Test connection manually
psql "postgresql://postgres:postgres@localhost:5432/nest_auth_db"

# 4. Ensure PostgreSQL is started
# Windows: Start from Services or pgAdmin
# Linux: sudo systemctl start postgresql
# macOS: brew services start postgresql
```

---

#### 3. "Token refresh not working"

**Symptoms:** `/auth/refresh` returns 401 even with valid refresh token

**Causes:**
- Refresh token expired (30 days default)
- Token not in database (manual DB cleanup?)
- Wrong `JWT_REFRESH_SECRET`

**Solutions:**
```bash
# 1. Check refresh token cookie exists
curl -v http://localhost:8080/api/v1/auth/refresh -b cookies.txt
# Should see "Cookie: refreshToken=..."

# 2. Verify token in database
npm run prisma:studio
# Navigate to RefreshToken table, check for your userId

# 3. Login again to get fresh tokens
curl -X POST http://localhost:8080/api/v1/auth/login \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin@123"}'

# 4. Check server logs for specific error
npm run start:dev  # Watch for error messages
```

---

#### 4. "Port already in use (EADDRINUSE)"

**Symptoms:** App crashes with `Error: listen EADDRINUSE: address already in use :::8080`

**Causes:**
- Another instance of the app is running
- Different app using port 8080

**Solutions:**
```bash
# Find process using port 8080
# Windows PowerShell:
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8080 | xargs kill -9

# Change port in .env
echo "PORT=3000" >> .env
npm run start:dev
```

---

#### 5. "Migration conflicts"

**Symptoms:** `npm run prisma:migrate` fails with "migration conflict"

**Causes:**
- Database schema out of sync
- Manual changes to database
- Deleted migration files

**Solutions:**
```bash
# Check migration status
npm run prisma:migrate:status

# Option 1: Reset database (⚠️ DEVELOPMENT ONLY)
npm run prisma:reset  # Wipes DB, re-runs migrations, seeds

# Option 2: Resolve manually
npm run prisma:migrate:resolve --applied <migration-name>

# Option 3: Create new migration with fix
npm run prisma:migrate:create
# Then manually edit the new migration SQL
```

---

#### 6. "CORS errors in browser"

**Symptoms:** Browser console shows `Access-Control-Allow-Origin` errors

**Causes:**
- Frontend URL not in `CORS_ORIGIN`
- Cookies not being sent (credentials issue)

**Solutions:**
```bash
# 1. Add frontend URL to .env
echo 'CORS_ORIGIN="http://localhost:3000,http://localhost:5173"' >> .env

# 2. Restart server
npm run start:dev

# 3. Ensure frontend sends credentials
// JavaScript fetch example:
fetch('http://localhost:8080/api/v1/auth/me', {
  credentials: 'include',  // ← REQUIRED for cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

# 4. Use same protocol (http vs https)
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080  ← Must match protocol
```

---

#### 7. "Tests failing"

**Symptoms:** `npm test` shows failures

**Solutions:**
```bash
# 1. Ensure test database is clean
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nest_auth_test" \
  npm run prisma:reset

# 2. Regenerate Prisma Client
npm run prisma:generate

# 3. Check for environment variable issues
cp .env.example .env.test
# Edit .env.test with test-specific values

# 4. Run tests with verbose output
npm test -- --verbose

# 5. Clear Jest cache
npx jest --clearCache
npm test
```

---

### Getting Help

If your issue isn't covered above:

1. **Check existing issues**: [GitHub Issues](https://github.com/yourusername/nest-auth-template/issues)
2. **Search documentation**: Review [docs/](docs/) folder
3. **Ask on Discussions**: [GitHub Discussions](https://github.com/yourusername/nest-auth-template/discussions)
4. **Open new issue**: Include error logs, `.env` (redacted), and steps to reproduce

---

## 📚 Further Resources

### Official Documentation
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [JWT.io](https://jwt.io/) - JWT decoder and resources

### Security Best Practices
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JWT Best Practices (RFC 8725)](https://datatracker.ietf.org/doc/html/rfc8725)

### Related Projects
- [NestJS Boilerplate](https://github.com/brocoders/nestjs-boilerplate)
- [Awesome NestJS](https://github.com/nestjs/awesome-nestjs)

### Learning Resources
- [NestJS Fundamentals Course](https://courses.nestjs.com/)
- [Prisma YouTube Channel](https://www.youtube.com/c/PrismaData)
- [NestJS Discord Community](https://discord.gg/nestjs)

---

## 🌟 Star History

If you find this project helpful, please consider giving it a star! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/nest-auth-template&type=Date)](https://star-history.com/#yourusername/nest-auth-template&Date)

---

## 💬 Community & Support

- **Discord**: [Join our Discord server](https://discord.gg/your-invite)
- **Twitter**: [@YourTwitter](https://twitter.com/your-twitter)
- **Stack Overflow**: Tag your questions with `nestjs-auth-template`

---

## 🙏 Acknowledgments

This project was built with:
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Pino](https://getpino.io/) - Super fast logging
- [Helmet](https://helmetjs.github.io/) - Security headers

Special thanks to all [contributors](https://github.com/yourusername/nest-auth-template/graphs/contributors) who help improve this project!

---

<div align="center">

**Made with ❤️ by [Your Name](https://github.com/yourusername)**

[⬆ Back to Top](#-nestjs-auth-starter---production-ready-authentication)

</div>
