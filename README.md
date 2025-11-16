# nestjs-jwt-rbac-boilerplate

> Complete JWT authentication system with refresh token rotation, RBAC, and zero XSS risk

<div align="center">

![nestjs-jwt-rbac-boilerplate Banner](banner.png)

</div>

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?logo=nestjs)](https://nestjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Postman Collection](https://img.shields.io/badge/Postman-Collection-FF6C37?logo=postman)](https://web.postman.co/workspace/My-Workspace~f38931e2-b991-4b76-8f08-cd3c064519a2/collection/37117103-972a16b7-a0de-42de-b220-e1a872a4ffc1?action=share&source=copy-link&creator=37117103)

</div>

## What This Solves

- **Problem**: Building secure JWT auth with refresh tokens in NestJS takes 40+ hours and requires deep security knowledge.
- **Solution**: This gives you a production-ready auth system in 3 minutes—tested patterns, no security holes.

## Core Features

- ✅ **Token rotation**: Refresh tokens auto-rotate on each use—stolen tokens die immediately
- ✅ **Zero XSS risk**: HttpOnly cookies only—no localStorage, no client-side token access
- ✅ **RBAC in 2 lines**: Add `@Roles(UserRole.ADMIN)` to any endpoint—done
- ✅ **Multi-device sessions**: Track 5 devices per user with automatic cleanup
- ✅ **Brute-force protection**: Rate limiting: 5 auth attempts/minute, 10 requests/minute globally
- ✅ **PII-safe logs**: Pino structured logging—passwords/tokens auto-redacted
- ✅ **Bcrypt 12 rounds**: Industry-standard password hashing (2025 security baseline)

**Tech Stack**: NestJS 11.0, Prisma 6.19, PostgreSQL, Pino, Zod validation

## Requirements

- Node.js >= 20.x
- PostgreSQL >= 16.x
- npm >= 10.x

## 3-Minute Setup

### 1. Clone and Install

```bash
git clone https://github.com/masabinhok/nestjs-jwt-rbac-boilerplate.git
cd nestjs-jwt-rbac-boilerplate/api
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

### 3. Database

```bash
npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
```

**Default credentials**: `admin@example.com` / `Admin@123`

### 4. Start & Verify

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

### Token Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AuthService
    participant D as Database
    
    C->>A: POST /auth/login
    A->>D: Validate credentials
    A->>A: Generate JWT tokens
    A->>D: Store hashed refresh token
    A->>C: Set httpOnly cookies (accessToken + refreshToken)
    
    Note over C,A: 1 hour later...
    
    C->>A: POST /auth/refresh (cookie)
    A->>D: Find token in DB
    A->>A: Generate NEW tokens
    A->>D: Invalidate OLD token
    A->>C: Set new httpOnly cookies
```

### Adding a Role

```typescript
// 1. prisma/schema.prisma
enum UserRole { USER ADMIN MODERATOR }

// 2. Run migration
npm run prisma:migrate

// 3. Any controller
@Roles(UserRole.MODERATOR)
@Delete('posts/:id')
deletePost() { }
```

### Logging

```json
{"level":30,"msg":"POST /auth/login - 200","userId":"cm3k...","durationMs":42}
```

PII auto-redacted: passwords, tokens, cookies. Change via `LOG_LEVEL` env.

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

## Troubleshooting: Real Fixes

### ❌ JWT verification fails
**Symptom**: 401 on `/auth/me` after login  
**Fix**: `rm -rf node_modules && npm install && npm run prisma:generate`

### ❌ Database connection error
**Symptom**: "Can't reach database server"  
**Fix**: `pg_isready -h localhost -p 5432` then `npm run prisma:migrate`

### ❌ Token refresh fails
**Symptom**: 401 on `/auth/refresh`  
**Fix**: Clear cookies, login again: `curl -X POST ... -c cookies.txt`

### ❌ Port 8080 in use
**Symptom**: EADDRINUSE  
**Fix**: `lsof -ti:8080 | xargs kill -9 && npm run start:dev`

### ❌ CORS errors
**Symptom**: Browser shows `Access-Control-Allow-Origin` error  
**Fix**: Add your frontend URL to `CORS_ORIGIN` in `.env`, restart server

## Contributing

Fork, branch (`feature/name`), PR. Run `npm test` before PR. Keep changes minimal.

## License

MIT - see [LICENSE](LICENSE) file.

---

<div align="center">

**Built this? Please ⭐ star the repo so others find it.**

Need help? [Open an issue](https://github.com/masabinhok/nestjs-jwt-rbac-boilerplate/issues) (response < 24h)

Built by [Sabin Shrestha](https://sabinshrestha69.com.np) • [GitHub](https://github.com/masabinhok)

</div>
