# 🚀 Master Secure GitOps Pipeline

A reusable, production-grade CI/CD pipeline for Node.js + React projects.
Copy this into any new project → works immediately with minimal changes.

---

## 📁 Structure

```
├── .github/
│   └── workflows/
│       ├── ci.yml            ← Auto-tests on every push/PR
│       └── cd.yml            ← Auto-deploy when CI passes
├── backend/
│   ├── Dockerfile            ← Generic Node.js backend image
│   ├── .dockerignore
│   ├── jest.config.js        ← Test + coverage config
│   ├── .eslintrc.js
│   ├── src/
│   │   ├── app.js            ← Express app (testable, no server.listen)
│   │   ├── server.js         ← Entry point (calls app.listen)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   └── api.routes.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   └── utils/
│   │       ├── jwt.js        ← Token generation & verification
│   │       └── password.js   ← bcrypt hashing & comparison
│   └── tests/
│       ├── unit/             ← Pure function tests (no HTTP)
│       ├── integration/      ← HTTP route tests (supertest)
│       └── e2e/              ← Full user journey tests
├── frontend/
│   ├── Dockerfile            ← React + Nginx image
│   ├── .dockerignore
│   └── nginx.conf
├── docker-compose.yml             ← All services, local dev
├── docker-compose.staging.yml     ← Staging overrides
├── docker-compose.production.yml  ← Production overrides
├── Makefile                       ← Simple command shortcuts
├── .env.example                   ← Safe to commit (no real values)
├── .env.local                     ← Gitignored (fill in real values)
└── scripts/
    └── pipeline-setup.sh          ← Bootstrap any new project
```

---

## ⚡ Quick Start

### 1. Clone / copy this pipeline

```bash
# For a new project:
mkdir my-new-project && cd my-new-project
bash /path/to/pipeline-setup.sh my-new-project
```

### 2. Fill in secrets

```bash
cp .env.example .env.local
# Edit .env.local with your real values
```

### 3. Start everything locally

```bash
make dev
# → Frontend: http://localhost:3000
# → Backend:  http://localhost:5000
# → Mongo UI: http://localhost:8081 (run: make dev-tools)
```

### 4. Run tests

```bash
make test
# or individually:
make test-backend
make test-frontend
```

---

## 🔐 GitHub Secrets to Add

Go to: **GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `JWT_SECRET` | Random string for JWT signing | `openssl rand -hex 32` |
| `MONGO_URI` | MongoDB connection string | MongoDB Atlas (free) |
| `POSTGRES_URI` | PostgreSQL connection string | Neon.tech (free) |
| `REDIS_URL` | Redis connection string | Redis Cloud (free) |
| `OPENAI_API_KEY` | OpenAI API key | platform.openai.com |
| `GHCR_TOKEN` | GitHub Container Registry token | GitHub → Settings → Developer settings → PAT (scope: `write:packages`) |
| `SSH_PRIVATE_KEY` | Your server's SSH private key | `cat ~/.ssh/id_rsa` |
| `SERVER_HOST` | Staging server IP/hostname | Your VPS provider |
| `PROD_SERVER_HOST` | Production server IP/hostname | Your VPS provider |
| `SSH_USER` | SSH username | `ubuntu` / `ec2-user` |

---

## 🌍 GitHub Environments

1. Go to: **Repo → Settings → Environments**
2. Create **`staging`** — no protection rules
3. Create **`production`** — add yourself as **Required reviewer** (manual approval gate)

---

## 🏗️ CI Pipeline (`.github/workflows/ci.yml`)

Triggers on every push and PR to `main` and `dev`.

```
Push / PR
  │
  ├── lint         ← ESLint (backend + frontend), fails fast
  │
  ├── test-backend ← Jest on Node 18 AND Node 20 (matrix)
  │   ├── Unit tests
  │   ├── Integration tests
  │   ├── E2E tests
  │   └── Coverage check (fails if < 60%)
  │
  ├── test-frontend ← React Testing Library on Node 18 AND Node 20
  │
  ├── comment-pr   ← Posts ✅/❌ summary comment on every PR
  │
  └── ci-success   ← Gate job that CD pipeline waits for
```

**What you see when a test fails:**
```
FAIL tests/integration/auth.routes.test.js
  ● POST /api/auth/login › should return 200 and a token with correct credentials
    
    expect(received).toBe(expected)
    Expected: 200
    Received: 500

      47 |     expect(response.status).toBe(200);
         |                             ^
      
      at Object.toBe (tests/integration/auth.routes.test.js:47:29)
```

---

## 🚢 CD Pipeline (`.github/workflows/cd.yml`)

Only runs **after CI passes**.

```
CI passes
  │
  ├── build-and-push
  │   ├── Build backend Docker image
  │   ├── Build frontend Docker image
  │   └── Push to GHCR (tagged with commit SHA + branch)
  │
  ├── deploy-staging  (dev branch only)
  │   ├── SSH into staging server
  │   ├── Pull new image
  │   ├── docker compose up -d
  │   ├── Health check → GET /health → expects 200
  │   └── Auto-rollback if health check fails
  │
  └── deploy-production  (main branch only, MANUAL APPROVAL required)
      ├── Wait for human approval in GitHub UI
      ├── SSH into production server
      ├── docker compose up -d
      ├── Health check (6 retries × 15s)
      └── Auto-rollback if health check fails
```

---

## 🧪 Tests — What's Included

### Unit Tests (`tests/unit/`)

| File | Tests |
|------|-------|
| `auth.test.js` | JWT generation, verification, expiry, tampering |
| `helpers.test.js` | bcrypt hashing, comparison, edge cases |
| `middleware.test.js` | Auth middleware, role guard |

### Integration Tests (`tests/integration/`)

| File | Tests |
|------|-------|
| `auth.routes.test.js` | Register, login, wrong password, duplicate email |
| `api.routes.test.js` | Protected route with/without token, health check |

### E2E Tests (`tests/e2e/`)

| File | Tests |
|------|-------|
| `app.test.js` | Full user journey: register → login → access protected resource |

**Current results:** 55 tests, 94% coverage

---

## 🔄 How to Reuse for a New Project

### Option A: Automated (recommended)

```bash
mkdir my-new-project && cd my-new-project
# Initialize your project first (npm init, etc.)
bash /path/to/master-gitops-pipeline/scripts/pipeline-setup.sh my-new-project
```

### Option B: Manual checklist

**Files to copy:**
- [ ] `.github/workflows/ci.yml`
- [ ] `.github/workflows/cd.yml`
- [ ] `backend/Dockerfile`
- [ ] `backend/.dockerignore`
- [ ] `backend/jest.config.js`
- [ ] `backend/.eslintrc.js`
- [ ] `frontend/Dockerfile`
- [ ] `frontend/.dockerignore`
- [ ] `frontend/nginx.conf`
- [ ] `docker-compose.yml`
- [ ] `docker-compose.staging.yml`
- [ ] `docker-compose.production.yml`
- [ ] `Makefile`
- [ ] `.gitignore`
- [ ] `.env.example`
- [ ] `tests/` → place inside `backend/tests/`

**Variables to update:**
- [ ] `PROJECT_NAME` in `Makefile` and `.env.local`
- [ ] `VITE_API_URL` or `REACT_APP_API_URL` in `.env.local`
- [ ] `CLIENT_URL` in `.env.local`

**GitHub Secrets to add:**
- [ ] All 10 secrets listed above

**Test files to replace/add:**
- [ ] Keep `auth.test.js`, `helpers.test.js`, `middleware.test.js` (work in all projects)
- [ ] Replace `auth.routes.test.js` if your auth routes differ
- [ ] Add new test files for each new route: `tests/integration/<route>.test.js`

**Adding tests for new routes:**
```js
// tests/integration/posts.routes.test.js
const request = require("supertest");
const app = require("../../src/app");
const { generateToken } = require("../../src/utils/jwt");

let token;
beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
  token = generateToken({ userId: "u1", role: "user" });
});

describe("GET /api/posts", () => {
  it("should return 200 with posts array", async () => {
    const res = await request(app)
      .get("/api/posts")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
  });
});
```

---

## 🆓 Free Tools for College Students

| Service | Free Tier | Use |
|---------|-----------|-----|
| [MongoDB Atlas](https://mongodb.com/atlas) | 512MB forever | Database |
| [Neon.tech](https://neon.tech) | 0.5GB forever | PostgreSQL |
| [Redis Cloud](https://redis.io/try-free) | 30MB forever | Cache/Queues |
| [Railway.app](https://railway.app) | $5/month credit | Hosting |
| [Render.com](https://render.com) | Free tier | Hosting |
| [Oracle Cloud](https://oracle.com/cloud/free) | Always Free VMs | Hosting |
| [GitHub Actions](https://github.com/features/actions) | 2000 min/month | CI/CD |
| [GHCR](https://ghcr.io) | Free (public repos) | Container Registry |

---

## ✅ Verification Commands

After setup, run these to verify everything works:

```bash
# Part 1 — Docker
docker compose config          # Validates compose file syntax
make dev                       # Starts all services

# Part 2 — Tests
make test                      # Run all 55 tests

# Part 3 — Health check
curl http://localhost:5000/health  # Should return {"status":"ok",...}

# Part 4 — Secrets (local)
cat .env.local                 # Verify your values are set (never commit!)

# Part 5 — Environments
docker compose -f docker-compose.staging.yml config    # Validate staging
docker compose -f docker-compose.production.yml config # Validate production

# Part 6 — Coverage
cd backend && npx jest --coverage  # Opens coverage/index.html

# Part 7 — Lint
make lint                      # ESLint all code
```
