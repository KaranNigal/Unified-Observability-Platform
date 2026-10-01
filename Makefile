# ==============================================================================
# Capsule — Unified Data Observability Platform
# Makefile — Cross-platform dev shortcuts (Linux / macOS / WSL2)
# ==============================================================================
# Run `make help` to see all available targets.
# Windows users: use .\run.ps1 instead (all commands are mirrored).
# ==============================================================================

.PHONY: help \
        up up-lite down restart clean status logs validate \
        api api-install \
        dashboard dash-install dash-build \
        dev trading-sim \
        init generate-keys set-vm-maxmap prereqs \
        open open-dashboard open-airflow open-grafana open-prometheus open-kibana \
        lint format urls

.DEFAULT_GOAL := help

# ── Directories ───────────────────────────────────────────────────────────────
ROOT_DIR   := $(shell pwd)
API_DIR    := $(ROOT_DIR)/api
DASH_DIR   := $(ROOT_DIR)/next-dashboard

# ── Docker Stack ──────────────────────────────────────────────────────────────

up: ## Start full stack (~12 GB RAM) — Airflow + Spark + Kafka + ELK + Prometheus + Grafana
	docker compose --profile full up -d
	@$(MAKE) --no-print-directory urls

up-lite: ## Start lite stack (~6 GB RAM) — skips Elasticsearch, Logstash, Kibana
	docker compose up -d
	@$(MAKE) --no-print-directory urls

down: ## Stop all containers (volumes preserved)
	docker compose --profile full down

clean: ## Stop all containers AND remove all volumes (⚠ data loss!)
	@echo "WARNING: This will delete ALL persisted data."
	@read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || (echo "Aborted." && exit 1)
	docker compose --profile full down -v

restart: down up ## Restart full stack

status: ## Show container health status
	docker compose --profile full ps

logs: ## Tail logs from all containers (pass SERVICE=<name> to filter)
	@if [ -n "$(SERVICE)" ]; then \
		docker compose --profile full logs -f $(SERVICE); \
	else \
		docker compose --profile full logs -f; \
	fi

validate: ## Validate docker-compose.yml syntax
	docker compose --profile full config --quiet
	@echo "✓ docker-compose.yml is valid"

# ── FastAPI Metrics API ───────────────────────────────────────────────────────

api: ## Start FastAPI Metrics API on port 8004 (with hot-reload)
	@echo "→ Installing dependencies..."
	pip install -r $(API_DIR)/requirements.txt --quiet
	@echo "✓ FastAPI running at http://localhost:8004"
	@echo "  Docs: http://localhost:8004/docs"
	cd $(API_DIR) && uvicorn main:app --host 0.0.0.0 --port 8004 --reload

api-install: ## Install FastAPI Python dependencies only
	pip install -r $(API_DIR)/requirements.txt

# ── Next.js Dashboard (Capsule) ───────────────────────────────────────────────

dashboard: ## Start Capsule Next.js Dashboard on port 3000 (dev mode)
	@echo "→ Installing npm dependencies..."
	cd $(DASH_DIR) && npm install --silent
	@echo "✓ Dashboard running at http://localhost:3000"
	cd $(DASH_DIR) && npm run dev

dash-install: ## Install Next.js npm dependencies only
	cd $(DASH_DIR) && npm install

dash-build: ## Build Next.js Dashboard for production
	cd $(DASH_DIR) && npm run build
	@echo "✓ Production build complete — run 'npm start' in next-dashboard/ to serve"

# ── Combined Dev Mode ─────────────────────────────────────────────────────────

dev: ## Start API + Dashboard in parallel (requires: make -j2 dev OR use run.ps1 dev on Windows)
	@echo "→ Starting FastAPI Metrics API on port 8004..."
	@echo "→ Starting Capsule Dashboard on port 3000..."
	@echo "   Use 'make api' and 'make dashboard' in separate terminals, or:"
	@echo "   On Windows: .\\run.ps1 dev"
	$(MAKE) -j2 api dashboard

trading-sim: ## Run Kafka trading producer simulator
	cd $(ROOT_DIR)/services/kafka-trading && python producer.py

# ── Setup & Utilities ─────────────────────────────────────────────────────────

init: ## Create .env and next-dashboard/.env.local from templates
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env from .env.example"; \
		echo "⚠  Edit .env and set FERNET_KEY + WEBSERVER_SECRET_KEY"; \
	else \
		echo "✓ .env already exists"; \
	fi
	@if [ ! -f $(DASH_DIR)/.env.local ]; then \
		echo "NEXT_PUBLIC_METRICS_API_URL=http://localhost:8004" > $(DASH_DIR)/.env.local; \
		echo "NEXT_PUBLIC_API_KEY=super-secret-key-123" >> $(DASH_DIR)/.env.local; \
		echo "✓ Created next-dashboard/.env.local"; \
	else \
		echo "✓ next-dashboard/.env.local already exists"; \
	fi

generate-keys: ## Generate Airflow Fernet key and webserver secret key
	@echo "AIRFLOW__CORE__FERNET_KEY=$$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
	@echo "AIRFLOW__WEBSERVER__SECRET_KEY=$$(python -c 'import secrets; print(secrets.token_hex(32))')"

set-vm-maxmap: ## Set vm.max_map_count=262144 for Elasticsearch (WSL2/Linux)
	@if [ "$$(uname)" = "Linux" ]; then \
		sudo sysctl -w vm.max_map_count=262144; \
	else \
		wsl -d docker-desktop sysctl -w vm.max_map_count=262144; \
	fi
	@echo "✓ vm.max_map_count set to 262144"

prereqs: ## Check all tool prerequisites (docker, python, node, npm)
	@echo "Checking prerequisites..."
	@command -v docker   && echo "✓ docker"   || echo "✗ docker NOT FOUND"
	@command -v python   && echo "✓ python"   || echo "✗ python NOT FOUND"
	@command -v node     && echo "✓ node"     || echo "✗ node NOT FOUND"
	@command -v npm      && echo "✓ npm"      || echo "✗ npm NOT FOUND"
	@docker info > /dev/null 2>&1 && echo "✓ Docker daemon running" || echo "✗ Docker daemon NOT RUNNING"

# ── Open in Browser ───────────────────────────────────────────────────────────

open: ## Open ALL service UIs in default browser
	@command -v xdg-open && OPEN=xdg-open || OPEN=open; \
	$$OPEN http://localhost:3000; \
	$$OPEN http://localhost:8004/docs; \
	$$OPEN http://localhost:8080; \
	$$OPEN http://localhost:9090; \
	$$OPEN http://localhost:3001

open-dashboard:   ## Open Capsule Next.js Dashboard
	@command -v xdg-open && xdg-open http://localhost:3000 || open http://localhost:3000

open-airflow:     ## Open Apache Airflow UI
	@command -v xdg-open && xdg-open http://localhost:8080 || open http://localhost:8080

open-grafana:     ## Open Grafana
	@command -v xdg-open && xdg-open http://localhost:3001 || open http://localhost:3001

open-prometheus:  ## Open Prometheus
	@command -v xdg-open && xdg-open http://localhost:9090 || open http://localhost:9090

open-kibana:      ## Open Kibana
	@command -v xdg-open && xdg-open http://localhost:5601 || open http://localhost:5601

# ── Code Quality ──────────────────────────────────────────────────────────────

lint: ## Run ruff + black in check mode
	ruff check .
	black --check .

format: ## Auto-format with ruff + black
	ruff check --fix .
	black .

# ── Service URLs reference ────────────────────────────────────────────────────

urls: ## Print all service URLs and credentials
	@echo ""
	@echo "  ┌──────────────────────────────────────────────────────────────────┐"
	@echo "  │         Capsule — Service URL Reference                          │"
	@echo "  ├──────────────────────────────────────────────────────────────────┤"
	@echo "  │  Capsule Dashboard        http://localhost:3000                  │"
	@echo "  │  FastAPI Metrics API      http://localhost:8004   (API Key auth) │"
	@echo "  │  API Swagger Docs         http://localhost:8004/docs             │"
	@echo "  │  Apache Airflow           http://localhost:8080   admin/admin    │"
	@echo "  │  Grafana                  http://localhost:3001   admin/admin    │"
	@echo "  │  Prometheus               http://localhost:9090                  │"
	@echo "  │  Spark Master UI          http://localhost:8180                  │"
	@echo "  │  Spark Worker UI          http://localhost:8181                  │"
	@echo "  │  Kibana    (full only)    http://localhost:5601                  │"
	@echo "  │  Elasticsearch (full)     http://localhost:9200                  │"
	@echo "  │  Kafka                    localhost:9094 (external)              │"
	@echo "  │  Redis                    localhost:6379                         │"
	@echo "  │  PostgreSQL               localhost:5432   airflow/airflow       │"
	@echo "  └──────────────────────────────────────────────────────────────────┘"
	@echo ""

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@echo ""
	@echo "  Capsule — Unified Data Observability Platform"
	@echo "  Windows users: use .\\run.ps1 <command> instead"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
