# NestJS Auth Template

> JWT authentication with refresh tokens, RBAC, and httpOnly cookies

## What Is This?

- **Problem it solves**: Provides a working authentication system with token rotation and role-based access control so you don't build it from scratch.
- **Core features**:
  - JWT access tokens (1 hour) and refresh tokens (30 days) stored in httpOnly cookies
  - Automatic token rotation on refresh
  - Role-based access control (USER, ADMIN)
  - Multi-device session tracking
  - Rate limiting (5 req/min for auth, 10 req/min for others)
  - Password validation (8+ chars, uppercase, lowercase, number, special char)
  - Bcrypt hashing with 12 rounds
- **Tech stack**: NestJS 11, Prisma 6.19, PostgreSQL, Pino logging, Zod validation

## Requirements

- Node.js >= 20.x
- PostgreSQL >= 16.x
- npm >= 10.x

## Installation (5-minute setup)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/nest-auth-template.git
cd nest-auth-template/api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Generate secrets and edit `.env`:

```bash
# Generate JWT secrets
openssl rand -base64 32
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nest_auth_db"
JWT_ACCESS_SECRET="generated-secret-min-32-chars"
JWT_REFRESH_SECRET="another-generated-secret-min-32-chars"
JWT_ACCESS_EXPIRY="60m"
JWT_REFRESH_EXPIRY="30d"
NODE_ENV="development"
PORT="8080"
CORS_ORIGIN="http://localhost:3000"
LOG_LEVEL="info"
```

### 3. Database Setup

```bash
npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
```

### 4. Start and Verify

```bash
npm run start:dev
```

Verify it works:

```bash
curl http://localhost:8080/api/v1/health
```

Expected: `{"status":"ok","info":{"database":{"status":"up"}}...}`

## API Reference

Base URL: `http://localhost:8080/api/v1`

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register new user | No |
| POST | `/auth/login` | Login with credentials | No |
| POST | `/auth/refresh` | Refresh access token | Yes (refresh token) |
| POST | `/auth/logout` | Logout and invalidate tokens | Yes |
| GET | `/auth/me` | Get current user info | Yes |

#### POST /auth/signup

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "fullName": "John Doe"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "cm3k5j8l90000xyz",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "USER"
  },
  "message": "User registered successfully"
}
```

**curl:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass@123","fullName":"Test User"}'
```

#### POST /auth/login

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "cm3k5j8l90000xyz",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "role": "ADMIN"
  }
}
```

Sets cookies: `accessToken` (httpOnly, 1h), `refreshToken` (httpOnly, 30d)

**curl:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

#### POST /auth/refresh

**Request:** No body (uses `refreshToken` cookie)

**Response 200:**
```json
{
  "message": "Tokens refreshed successfully"
}
```

**curl:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

#### POST /auth/logout

**Request:** No body

**Response 200:**
```json
{
  "message": "Logged out successfully"
}
```

**curl:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/logout -b cookies.txt
```

#### GET /auth/me

**Request:** No body (uses `accessToken` cookie)

**Response 200:**
```json
{
  "id": "cm3k5j8l90000xyz",
  "email": "admin@example.com",
  "fullName": "Admin User",
  "role": "ADMIN",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

**curl:**
```bash
curl -X GET http://localhost:8080/api/v1/auth/me -b cookies.txt
```

### User Profile Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get own profile | Yes |
| PATCH | `/users/profile` | Update own profile | Yes |

#### GET /users/profile

**Response 200:**
```json
{
  "id": "cm3k5j8l90000xyz",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "USER",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

**curl:**
```bash
curl -X GET http://localhost:8080/api/v1/users/profile -b cookies.txt
```

#### PATCH /users/profile

**Request:**
```json
{
  "fullName": "John Smith"
}
```

**Response 200:**
```json
{
  "id": "cm3k5j8l90000xyz",
  "email": "user@example.com",
  "fullName": "John Smith",
  "role": "USER",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

**curl:**
```bash
curl -X PATCH http://localhost:8080/api/v1/users/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"fullName":"John Smith"}'
```

### Admin Endpoints

Requires `ADMIN` role. Returns 403 for non-admin users.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | List all users (paginated) | ADMIN |
| GET | `/users/:id` | Get user by ID | ADMIN |
| PATCH | `/users/:id` | Update user | ADMIN |
| DELETE | `/users/:id` | Soft delete user | ADMIN |

#### GET /users

**Query params:** `page` (default: 1), `limit` (default: 10, max: 100)

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm3k5j8l90000xyz",
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
    "limit": 10,
    "totalPages": 15,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**curl:**
```bash
curl -X GET "http://localhost:8080/api/v1/users?page=1&limit=10" -b cookies.txt
```

#### GET /users/:id

**Response 200:**
```json
{
  "id": "cm3k5j8l90000xyz",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "USER",
  "isActive": true,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

**curl:**
```bash
curl -X GET http://localhost:8080/api/v1/users/cm3k5j8l90000xyz -b cookies.txt
```

#### PATCH /users/:id

**Request:**
```json
{
  "fullName": "Updated Name",
  "role": "ADMIN",
  "isActive": false
}
```

**Response 200:**
```json
{
  "id": "cm3k5j8l90000xyz",
  "email": "user@example.com",
  "fullName": "Updated Name",
  "role": "ADMIN",
  "isActive": false,
  "createdAt": "2025-11-16T10:30:00.000Z",
  "updatedAt": "2025-11-16T10:30:00.000Z"
}
```

**curl:**
```bash
curl -X PATCH http://localhost:8080/api/v1/users/cm3k5j8l90000xyz \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"role":"ADMIN"}'
```

#### DELETE /users/:id

Soft deletes user (sets `isActive: false`) and invalidates all refresh tokens.

**Response 200:**
```json
{
  "message": "User deleted successfully"
}
```

**curl:**
```bash
curl -X DELETE http://localhost:8080/api/v1/users/cm3k5j8l90000xyz -b cookies.txt
```

### Health Check Endpoints

Public endpoints (no auth required).

| Method | Endpoint | Description | Use Case |
|--------|----------|-------------|----------|
| GET | `/health` | Full health check with DB | Load balancer checks |
| GET | `/health/ready` | Readiness probe | Kubernetes readiness |
| GET | `/health/live` | Liveness probe | Kubernetes liveness |

#### GET /health

**Response 200:**
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

**curl:**
```bash
curl http://localhost:8080/api/v1/health
```

#### GET /health/ready

**Response 200:**
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

**curl:**
```bash
curl http://localhost:8080/api/v1/health/ready
```

#### GET /health/live

**Response 200:**
```json
{
  "status": "ok",
  "uptime": 3600.5,
  "timestamp": "2025-11-16T10:30:00.000Z",
  "pid": 12345
}
```

**curl:**
```bash
curl http://localhost:8080/api/v1/health/live
```

## How It Works

### Authentication Flow

```
Client → POST /auth/login → AuthController → AuthService
  → Validate credentials → Bcrypt compare
  → Generate JWT tokens → Hash refresh token
  → Store in DB → Set httpOnly cookies → Return user
```

### Token Refresh

```
Client → POST /auth/refresh (with cookie) → AuthController
  → Extract refresh token → AuthService
  → Find in DB (hashed) → Validate not expired
  → Generate NEW tokens → Invalidate OLD token
  → Update DB → Set new cookies
```

### RBAC System

Add new role:

1. Edit `prisma/schema.prisma`:
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

### Logging

Pino logs in JSON format. PII (passwords, tokens, cookies) are automatically redacted.

Example log:
```json
{
  "level": 30,
  "time": 1700000000000,
  "pid": 12345,
  "correlationId": "abc-123-def",
  "msg": "POST /api/v1/auth/login - 200",
  "req": {
    "method": "POST",
    "url": "/api/v1/auth/login"
  }
}
```

Change log level via `LOG_LEVEL` env var: `fatal`, `error`, `warn`, `info`, `debug`, `trace`.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | - | Access token secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token secret (32+ chars) |
| `JWT_ACCESS_EXPIRY` | No | `60m` | Access token lifetime (format: `60m`, `1h`, `7d`) |
| `JWT_REFRESH_EXPIRY` | No | `30d` | Refresh token lifetime |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `8080` | Server port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed origins (comma-separated) |
| `LOG_LEVEL` | No | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |

## Common Issues

### Issue 1: JWT verification fails

**Symptom:** Login works but `/auth/me` returns 401

**Cause:** JWT secrets not loaded or cookies not sent

**Fix:**
```bash
# Restart dev server
npm run start:dev

# Test with curl
curl -v http://localhost:8080/api/v1/auth/me -b cookies.txt
```

**Verify:** Should see `Cookie: accessToken=...` in request

### Issue 2: Database connection errors

**Symptom:** App crashes with "Can't reach database server"

**Cause:** PostgreSQL not running or wrong `DATABASE_URL`

**Fix:**
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Test connection
psql "postgresql://postgres:postgres@localhost:5432/nest_auth_db"

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

**Verify:** `pg_isready` returns "accepting connections"

### Issue 3: Token refresh not working

**Symptom:** `/auth/refresh` returns 401

**Cause:** Refresh token expired or not in database

**Fix:**
```bash
# Login again to get fresh tokens
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin@123"}'

# Check database
npm run prisma:studio
```

**Verify:** RefreshToken table has entry for your user

### Issue 4: Port already in use

**Symptom:** Error: `EADDRINUSE: address already in use :::8080`

**Cause:** Another process using port 8080

**Fix:**
```bash
# Windows PowerShell
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

**Verify:** `netstat -ano | findstr :8080` returns nothing

### Issue 5: CORS errors

**Symptom:** Browser console shows `Access-Control-Allow-Origin` error

**Cause:** Frontend URL not in `CORS_ORIGIN`

**Fix:**
```bash
# Add frontend URL to .env
echo 'CORS_ORIGIN="http://localhost:3000,http://localhost:5173"' >> .env

# Restart server
npm run start:dev
```

**Verify:** Frontend can send requests with `credentials: 'include'`

## License

UNLICENSED
