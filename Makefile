# ═══════════════════════════════════════════════════════════
#  MASTER MAKEFILE — Universal GitOps Pipeline
#  Usage: make <target>
# ═══════════════════════════════════════════════════════════

# Load .env.local if it exists (local dev overrides)
ifneq (,$(wildcard .env.local))
  include .env.local
  export
endif

PROJECT_NAME ?= myapp
COMPOSE_FILE ?= docker-compose.yml
BACKEND_DIR  := ./backend
FRONTEND_DIR := ./frontend
IMAGE_TAG    ?= latest
REGISTRY     ?= ghcr.io/$(shell git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
RESET  := \033[0m

.PHONY: help dev dev-tools stop build test test-backend test-frontend \
        lint lint-backend lint-frontend deploy push clean logs shell-backend \
        shell-frontend db-shell-mongo db-shell-postgres health

# ── Default target ────────────────────────────────────────
help:
	@echo ""
	@echo "$(GREEN)═══ Master GitOps Pipeline — Makefile ═══$(RESET)"
	@echo ""
	@echo "  $(YELLOW)make dev$(RESET)              Start all services locally"
	@echo "  $(YELLOW)make dev-tools$(RESET)        Start all services + DB GUI (Mongo Express)"
	@echo "  $(YELLOW)make stop$(RESET)             Stop all services"
	@echo "  $(YELLOW)make build$(RESET)            Build all Docker images"
	@echo "  $(YELLOW)make test$(RESET)             Run all tests (backend + frontend)"
	@echo "  $(YELLOW)make test-backend$(RESET)     Run backend tests only"
	@echo "  $(YELLOW)make test-frontend$(RESET)    Run frontend tests only"
	@echo "  $(YELLOW)make lint$(RESET)             Lint all code"
	@echo "  $(YELLOW)make deploy$(RESET)           Build, tag, push, deploy to server"
	@echo "  $(YELLOW)make push$(RESET)             Push images to GHCR"
	@echo "  $(YELLOW)make logs$(RESET)             Tail all service logs"
	@echo "  $(YELLOW)make clean$(RESET)            Remove containers, volumes, images"
	@echo "  $(YELLOW)make health$(RESET)           Check health of running services"
	@echo "  $(YELLOW)make shell-backend$(RESET)    Open shell in backend container"
	@echo "  $(YELLOW)make db-shell-mongo$(RESET)   Open MongoDB shell"
	@echo "  $(YELLOW)make db-shell-postgres$(RESET) Open PostgreSQL shell"
	@echo ""

# ── Development ───────────────────────────────────────────
dev:
	@echo "$(GREEN)▶ Starting all services...$(RESET)"
	@cp -n .env.example .env.local 2>/dev/null || true
	docker compose -f $(COMPOSE_FILE) up --build -d
	@echo "$(GREEN)✔ Services running:$(RESET)"
	@echo "   Frontend  → http://localhost:$${FRONTEND_PORT:-3000}"
	@echo "   Backend   → http://localhost:$${BACKEND_PORT:-5000}"
	@echo "   MongoDB   → localhost:$${MONGO_PORT:-27017}"
	@echo "   PostgreSQL→ localhost:$${POSTGRES_PORT:-5432}"
	@echo "   Redis     → localhost:$${REDIS_PORT:-6379}"

dev-tools:
	@echo "$(GREEN)▶ Starting all services + dev tools...$(RESET)"
	docker compose -f $(COMPOSE_FILE) --profile dev-tools up --build -d
	@echo "$(GREEN)✔ Mongo Express → http://localhost:8081$(RESET)"

stop:
	@echo "$(YELLOW)■ Stopping all services...$(RESET)"
	docker compose -f $(COMPOSE_FILE) down
	@echo "$(YELLOW)✔ All services stopped.$(RESET)"

# ── Build ──────────────────────────────────────────────────
build:
	@echo "$(GREEN)▶ Building Docker images...$(RESET)"
	docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✔ Images built successfully.$(RESET)"

# ── Testing ────────────────────────────────────────────────
test: test-backend test-frontend
	@echo "$(GREEN)✔ All tests complete.$(RESET)"

test-backend:
	@echo "$(GREEN)▶ Running backend tests...$(RESET)"
	cd $(BACKEND_DIR) && npm ci --silent && npm test -- --coverage --forceExit
	@echo "$(GREEN)✔ Backend tests done.$(RESET)"

test-frontend:
	@echo "$(GREEN)▶ Running frontend tests...$(RESET)"
	cd $(FRONTEND_DIR) && npm ci --silent && npm test -- --watchAll=false --coverage
	@echo "$(GREEN)✔ Frontend tests done.$(RESET)"

# ── Linting ────────────────────────────────────────────────
lint: lint-backend lint-frontend
	@echo "$(GREEN)✔ All lint checks passed.$(RESET)"

lint-backend:
	@echo "$(GREEN)▶ Linting backend...$(RESET)"
	cd $(BACKEND_DIR) && npx eslint src/ --ext .js --max-warnings=0

lint-frontend:
	@echo "$(GREEN)▶ Linting frontend...$(RESET)"
	cd $(FRONTEND_DIR) && npx eslint src/ --ext .js,.jsx,.ts,.tsx --max-warnings=0

# ── Deployment ─────────────────────────────────────────────
push:
	@echo "$(GREEN)▶ Pushing images to GHCR...$(RESET)"
	docker tag $(PROJECT_NAME)-backend:latest $(REGISTRY)/$(PROJECT_NAME)-backend:$(IMAGE_TAG)
	docker tag $(PROJECT_NAME)-frontend:latest $(REGISTRY)/$(PROJECT_NAME)-frontend:$(IMAGE_TAG)
	docker push $(REGISTRY)/$(PROJECT_NAME)-backend:$(IMAGE_TAG)
	docker push $(REGISTRY)/$(PROJECT_NAME)-frontend:$(IMAGE_TAG)
	@echo "$(GREEN)✔ Images pushed.$(RESET)"

deploy: build test push
	@echo "$(GREEN)▶ Triggering remote deploy via SSH...$(RESET)"
	@echo "$(YELLOW)Set SERVER_HOST, SSH_USER, and SSH_KEY_PATH for remote deploy.$(RESET)"
	ssh -i $${SSH_KEY_PATH:-~/.ssh/id_rsa} $${SSH_USER:-ubuntu}@$${SERVER_HOST} \
	  "cd /opt/$(PROJECT_NAME) && \
	   docker pull $(REGISTRY)/$(PROJECT_NAME)-backend:$(IMAGE_TAG) && \
	   docker pull $(REGISTRY)/$(PROJECT_NAME)-frontend:$(IMAGE_TAG) && \
	   docker compose up -d --no-build && \
	   sleep 5 && \
	   curl -fsS http://localhost:$${BACKEND_PORT:-5000}/health && \
	   echo 'Deploy successful!' || echo 'Health check failed!'"

# ── Utilities ──────────────────────────────────────────────
logs:
	docker compose -f $(COMPOSE_FILE) logs -f

health:
	@echo "$(GREEN)▶ Checking service health...$(RESET)"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@curl -fsS http://localhost:$${BACKEND_PORT:-5000}/health && \
	  echo "$(GREEN)✔ Backend healthy$(RESET)" || \
	  echo "$(RED)✘ Backend unhealthy$(RESET)"

clean:
	@echo "$(RED)▶ Removing containers, volumes, and images...$(RESET)"
	docker compose -f $(COMPOSE_FILE) down -v --rmi local
	docker system prune -f
	@echo "$(RED)✔ Cleanup complete.$(RESET)"

shell-backend:
	docker compose -f $(COMPOSE_FILE) exec backend sh

shell-frontend:
	docker compose -f $(COMPOSE_FILE) exec frontend sh

db-shell-mongo:
	docker compose -f $(COMPOSE_FILE) exec mongo mongosh \
	  -u $${MONGO_ROOT_USER:-admin} -p $${MONGO_ROOT_PASSWORD:-changeme} \
	  --authenticationDatabase admin

db-shell-postgres:
	docker compose -f $(COMPOSE_FILE) exec postgres psql \
	  -U $${POSTGRES_USER:-admin} -d $${POSTGRES_DB:-appdb}
