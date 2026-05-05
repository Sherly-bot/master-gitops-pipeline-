#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  pipeline-setup.sh
#  Usage: bash pipeline-setup.sh [project-name]
#  Run this from inside any new project root to bootstrap
#  the entire GitOps pipeline in seconds.
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_NAME="${1:-$(basename "$(pwd)")}"
TARGET_DIR="$(pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${GREEN}✔ $1${RESET}"; }
info() { echo -e "${CYAN}▶ $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }
err()  { echo -e "${RED}✘ $1${RESET}"; exit 1; }

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  Master GitOps Pipeline Setup                 ${RESET}"
echo -e "${GREEN}  Project: ${PROJECT_NAME}                     ${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo ""

# ── Step 1: Copy pipeline files ───────────────────────────
info "Step 1/7: Copying pipeline files..."

FILES_TO_COPY=(
  ".github/workflows/ci.yml"
  ".github/workflows/cd.yml"
  "backend/Dockerfile"
  "backend/.dockerignore"
  "backend/jest.config.js"
  "backend/.eslintrc.js"
  "frontend/Dockerfile"
  "frontend/.dockerignore"
  "frontend/nginx.conf"
  "docker-compose.yml"
  "docker-compose.staging.yml"
  "docker-compose.production.yml"
  "Makefile"
  ".gitignore"
  ".env.example"
)

for file in "${FILES_TO_COPY[@]}"; do
  SRC="${REPO_ROOT}/${file}"
  DST="${TARGET_DIR}/${file}"
  if [ -f "$SRC" ]; then
    mkdir -p "$(dirname "$DST")"
    cp "$SRC" "$DST"
    log "Copied: ${file}"
  else
    warn "Source not found, skipping: ${file}"
  fi
done

# ── Step 2: Create test folder structure ─────────────────
info "Step 2/7: Creating test folder structure..."

mkdir -p "${TARGET_DIR}/backend/tests/unit"
mkdir -p "${TARGET_DIR}/backend/tests/integration"
mkdir -p "${TARGET_DIR}/backend/tests/e2e"

# Copy base test files if they exist
TEST_FILES=(
  "tests/unit/auth.test.js:backend/tests/unit/auth.test.js"
  "tests/unit/helpers.test.js:backend/tests/unit/helpers.test.js"
  "tests/unit/middleware.test.js:backend/tests/unit/middleware.test.js"
  "tests/integration/auth.routes.test.js:backend/tests/integration/auth.routes.test.js"
  "tests/integration/api.routes.test.js:backend/tests/integration/api.routes.test.js"
  "tests/e2e/app.test.js:backend/tests/e2e/app.test.js"
)

for mapping in "${TEST_FILES[@]}"; do
  SRC="${REPO_ROOT}/backend/${mapping%%:*}"
  DST="${TARGET_DIR}/${mapping##*:}"
  if [ -f "$SRC" ]; then
    cp "$SRC" "$DST"
    log "Copied test: $(basename $DST)"
  fi
done

log "Test structure created"

# ── Step 3: Create .env.local from example ────────────────
info "Step 3/7: Creating .env.local..."

if [ ! -f "${TARGET_DIR}/.env.local" ]; then
  cp "${REPO_ROOT}/.env.example" "${TARGET_DIR}/.env.local"
  # Replace placeholder project name
  sed -i "s/PROJECT_NAME=myapp/PROJECT_NAME=${PROJECT_NAME}/g" "${TARGET_DIR}/.env.local" 2>/dev/null || true
  log ".env.local created from .env.example"
else
  warn ".env.local already exists — skipping to avoid overwrite"
fi

# ── Step 4: Update project name in configs ────────────────
info "Step 4/7: Updating project name in configs..."

# Update Makefile
if [ -f "${TARGET_DIR}/Makefile" ]; then
  sed -i "s/PROJECT_NAME ?= myapp/PROJECT_NAME ?= ${PROJECT_NAME}/g" \
    "${TARGET_DIR}/Makefile" 2>/dev/null || true
  log "Makefile updated with project name: ${PROJECT_NAME}"
fi

# ── Step 5: Install backend dependencies ─────────────────
info "Step 5/7: Installing backend Jest dependencies..."

if [ -d "${TARGET_DIR}/backend" ]; then
  cd "${TARGET_DIR}/backend"

  if [ ! -f "package.json" ]; then
    warn "No package.json found in backend/ — creating minimal one..."
    cat > package.json << 'PKGJSON'
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "test": "jest",
    "lint": "eslint src/ --ext .js"
  }
}
PKGJSON
  fi

  # Install test dependencies only (don't overwrite existing deps)
  npm install --save-dev \
    jest@^29 \
    supertest@^6 \
    jest-junit@^16 \
    eslint@^8 \
    2>/dev/null | grep -E "added|updated" || true

  log "Backend test dependencies installed"
  cd "${TARGET_DIR}"
fi

# ── Step 6: Verify GitHub Secrets checklist ───────────────
info "Step 6/7: Generating GitHub Secrets checklist..."

cat > "${TARGET_DIR}/GITHUB_SECRETS_CHECKLIST.md" << CHECKLIST
# GitHub Secrets Checklist for: ${PROJECT_NAME}

Add these in: GitHub repo → Settings → Secrets and variables → Actions

## Required Secrets

| Secret Name       | Where to get it                                      | Added? |
|-------------------|------------------------------------------------------|--------|
| \`JWT_SECRET\`      | Any random string (use: \`openssl rand -hex 32\`)     | [ ]    |
| \`MONGO_URI\`       | MongoDB Atlas connection string (free tier available)| [ ]    |
| \`POSTGRES_URI\`    | Your PostgreSQL connection string                    | [ ]    |
| \`REDIS_URL\`       | Redis connection string (Redis Cloud free tier)      | [ ]    |
| \`OPENAI_API_KEY\`  | platform.openai.com (only if using OpenAI)           | [ ]    |
| \`GHCR_TOKEN\`      | GitHub → Settings → Developer settings → PAT (write:packages) | [ ] |
| \`SSH_PRIVATE_KEY\` | Your server's private key (\`cat ~/.ssh/id_rsa\`)     | [ ]    |
| \`SERVER_HOST\`     | IP or hostname of staging server                     | [ ]    |
| \`PROD_SERVER_HOST\`| IP or hostname of production server                  | [ ]    |
| \`SSH_USER\`        | Server user (ubuntu / ec2-user / root)               | [ ]    |

## GitHub Environments to Create

1. Go to: Repo → Settings → Environments
2. Create: \`staging\` (no protection rules needed)
3. Create: \`production\` (add **Required reviewers** = yourself for manual approval)

## Free Services for College Students

- **MongoDB**: MongoDB Atlas free tier (512MB, always free)
- **PostgreSQL**: Neon.tech free tier or Supabase free tier
- **Redis**: Redis Cloud free tier (30MB)
- **Hosting**: Railway.app free tier, Render.com free tier, or Oracle Cloud Always Free
- **Container Registry**: GitHub Container Registry (free for public repos)
CHECKLIST

log "GitHub Secrets checklist created: GITHUB_SECRETS_CHECKLIST.md"

# ── Step 7: Git init if not already ──────────────────────
info "Step 7/7: Checking git setup..."

if [ ! -d "${TARGET_DIR}/.git" ]; then
  cd "${TARGET_DIR}"
  git init
  git branch -M main
  log "Git repository initialized"
else
  log "Git repository already exists"
fi

# ── Summary ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  ✅ Pipeline Setup Complete!                  ${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${CYAN}Next steps:${RESET}"
echo ""
echo -e "  1. ${YELLOW}Edit .env.local${RESET} — fill in your real values"
echo -e "  2. ${YELLOW}cat GITHUB_SECRETS_CHECKLIST.md${RESET} — add all secrets to GitHub"
echo -e "  3. ${YELLOW}make dev${RESET} — start all services locally"
echo -e "  4. ${YELLOW}make test${RESET} — run all tests"
echo -e "  5. Push to GitHub → CI runs automatically"
echo ""
echo -e "  ${CYAN}Free services:${RESET}"
echo -e "  MongoDB  → https://mongodb.com/atlas (free 512MB)"
echo -e "  Postgres → https://neon.tech (free tier)"
echo -e "  Redis    → https://redis.io/try-free (30MB free)"
echo -e "  Hosting  → https://railway.app or https://render.com"
echo ""
