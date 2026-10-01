# ==============================================================================
# Capsule - Unified Data Observability Platform
# run.ps1 - Master control script for Windows (PowerShell)
# ==============================================================================
# Usage:
#   .\run.ps1 <command> [option]
#
# Examples:
#   .\run.ps1 help
#   .\run.ps1 up
#   .\run.ps1 dev
#   .\run.ps1 api
#   .\run.ps1 dashboard
# ==============================================================================

param(
    [Parameter(Position = 0)]
    [string]$Command = "help",
    [Parameter(Position = 1)]
    [string]$Option = ""
)

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir  = Join-Path $Root "api"
$DashDir = Join-Path $Root "next-dashboard"

function Write-Header  { param($msg) Write-Host "" ; Write-Host "  >> $msg" -ForegroundColor Cyan }
function Write-Step    { param($msg) Write-Host "  -> $msg" -ForegroundColor White }
function Write-Ok      { param($msg) Write-Host "  OK $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "  !! $msg" -ForegroundColor Yellow }
function Write-Fail    { param($msg) Write-Host "  XX $msg" -ForegroundColor Red }

# ------------------------------------------------------------------------------
# PREREQUISITES
# ------------------------------------------------------------------------------
function Invoke-Prereqs {
    Write-Header "Checking prerequisites"
    foreach ($tool in @("docker", "python", "node", "npm")) {
        if (Get-Command $tool -ErrorAction SilentlyContinue) {
            Write-Ok "$tool found"
        }
        else {
            Write-Fail "$tool NOT found - please install it"
        }
    }
    try {
        docker info 2>&1 | Out-Null
        Write-Ok "Docker daemon is running"
    }
    catch {
        Write-Fail "Docker daemon is NOT running - start Docker Desktop"
    }
}

# ------------------------------------------------------------------------------
# INIT - create .env files
# ------------------------------------------------------------------------------
function Invoke-Init {
    Write-Header "Environment setup"
    $envFile    = Join-Path $Root ".env"
    $exampleEnv = Join-Path $Root ".env.example"

    if (-not (Test-Path $envFile)) {
        if (Test-Path $exampleEnv) {
            Copy-Item $exampleEnv $envFile
            Write-Ok "Created .env from .env.example"
            Write-Warn "Edit .env and set AIRFLOW__CORE__FERNET_KEY and AIRFLOW__WEBSERVER__SECRET_KEY"
        }
        else {
            Write-Fail ".env.example not found"
        }
    }
    else {
        Write-Ok ".env already exists"
    }

    $dashEnv = Join-Path $DashDir ".env.local"
    if (-not (Test-Path $dashEnv)) {
        @"
NEXT_PUBLIC_METRICS_API_URL=http://localhost:8004
NEXT_PUBLIC_API_KEY=super-secret-key-123
"@ | Set-Content $dashEnv
        Write-Ok "Created next-dashboard/.env.local"
    }
    else {
        Write-Ok "next-dashboard/.env.local already exists"
    }
}

# ------------------------------------------------------------------------------
# GENERATE KEYS
# ------------------------------------------------------------------------------
function Invoke-GenerateKeys {
    Write-Header "Generating Airflow encryption keys"
    try {
        $fernet = python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
        $secret = python -c "import secrets; print(secrets.token_hex(32))"
        Write-Host ""
        Write-Host "  Add these to your .env file:" -ForegroundColor Yellow
        Write-Host "  AIRFLOW__CORE__FERNET_KEY=$fernet" -ForegroundColor Cyan
        Write-Host "  AIRFLOW__WEBSERVER__SECRET_KEY=$secret" -ForegroundColor Cyan
    }
    catch {
        Write-Fail "Failed. Ensure cryptography is installed: pip install cryptography"
    }
}

# ------------------------------------------------------------------------------
# DOCKER STACK
# ------------------------------------------------------------------------------
function Invoke-Up {
    Write-Header "Starting FULL stack (~12 GB RAM) - includes ELK"
    Write-Warn "Use 'up-lite' if you have less than 12 GB free RAM"
    Set-Location $Root
    docker compose --profile full up -d
    Write-Ok "Full stack started"
    Show-Urls
}

function Invoke-UpLite {
    Write-Header "Starting LITE stack (~6 GB RAM) - skips Elasticsearch/Logstash/Kibana"
    Set-Location $Root
    docker compose up -d
    Write-Ok "Lite stack started"
    Show-Urls
}

function Invoke-Down {
    Write-Header "Stopping all containers (volumes preserved)"
    Set-Location $Root
    docker compose --profile full down
    Write-Ok "Stack stopped"
}

function Invoke-Clean {
    Write-Header "Stopping containers AND removing ALL volumes"
    Write-Fail "WARNING: This deletes all data - Postgres, Prometheus, Kafka, Redis, Elasticsearch!"
    $confirm = Read-Host "  Type YES to confirm"
    if ($confirm -eq "YES") {
        Set-Location $Root
        docker compose --profile full down -v
        Write-Ok "Stack stopped and volumes deleted"
    }
    else {
        Write-Warn "Aborted - no data deleted"
    }
}

function Invoke-Restart {
    Invoke-Down
    Invoke-Up
}

function Invoke-Status {
    Write-Header "Container status"
    Set-Location $Root
    docker compose --profile full ps
}

function Invoke-Logs {
    Write-Header "Tailing logs (Ctrl+C to stop)"
    Set-Location $Root
    if ($Option -ne "") {
        Write-Step "Filtering to service: $Option"
        docker compose --profile full logs -f $Option
    }
    else {
        docker compose --profile full logs -f
    }
}

function Invoke-Validate {
    Write-Header "Validating docker-compose.yml"
    Set-Location $Root
    docker compose --profile full config --quiet
    Write-Ok "docker-compose.yml is valid"
}

# ------------------------------------------------------------------------------
# FASTAPI METRICS API
# ------------------------------------------------------------------------------
function Invoke-Api {
    Write-Header "Starting FastAPI Metrics API on port 8004"
    Set-Location $ApiDir
    Write-Step "Installing Python dependencies..."
    pip install -r requirements.txt --quiet
    Write-Ok "API will be available at http://localhost:8004"
    Write-Step "Swagger docs at http://localhost:8004/docs"
    uvicorn main:app --host 0.0.0.0 --port 8004 --reload
}

function Invoke-ApiInstall {
    Write-Header "Installing FastAPI Python dependencies"
    Set-Location $ApiDir
    pip install -r requirements.txt
    Write-Ok "Done"
}

# ------------------------------------------------------------------------------
# NEXT.JS DASHBOARD
# ------------------------------------------------------------------------------
function Invoke-Dashboard {
    Write-Header "Starting Capsule Next.js Dashboard on port 3002"
    Set-Location $DashDir
    Write-Step "Installing npm dependencies..."
    npm install --silent
    Write-Ok "Dashboard will be at http://localhost:3002"
    npm run dev
}

function Invoke-DashInstall {
    Write-Header "Installing Next.js npm dependencies"
    Set-Location $DashDir
    npm install
    Write-Ok "Done"
}

function Invoke-DashBuild {
    Write-Header "Building Next.js Dashboard for production"
    Set-Location $DashDir
    npm run build
    Write-Ok "Build complete - run 'npm start' in next-dashboard/ to serve"
}

# ------------------------------------------------------------------------------
# DEV MODE - API + Dashboard in two new windows
# ------------------------------------------------------------------------------
function Invoke-Dev {
    Write-Header "Starting development environment"
    Write-Warn "Make sure your Docker stack is running: .\run.ps1 up-lite"
    
    # Avoid port 8004 conflict with Docker container if it is running
    docker stop obs-metrics-api 2>$null | Out-Null

    Write-Step "Opening FastAPI API window  -> http://localhost:8004"
    Write-Step "Opening Next.js Dashboard  -> http://localhost:3002"
    Write-Step "Opening Demo Telemetry Simulator (tenant_id=demo)"

    $apiCmd  = "Write-Host '=== FastAPI Metrics API ===' -ForegroundColor Cyan; Set-Location '$ApiDir'; pip install -r requirements.txt --quiet; uvicorn main:app --host 0.0.0.0 --port 8004 --reload"
    $dashCmd = "Write-Host '=== Capsule Dashboard ===' -ForegroundColor Cyan; Set-Location '$DashDir'; npm install --silent; npm run dev"
    $simCmd  = "Write-Host '=== Demo Telemetry Simulator ===' -ForegroundColor Magenta; Set-Location '$Root'; python mock_telemetry_generator.py"

    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $apiCmd)
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $dashCmd)
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $simCmd)

    Write-Host ""
    Write-Host "  FastAPI Metrics API : http://localhost:8004" -ForegroundColor Green
    Write-Host "  API Docs            : http://localhost:8004/docs" -ForegroundColor Green
    Write-Host "  Capsule Dashboard   : http://localhost:3002" -ForegroundColor Green
    Write-Host "  Demo Simulator      : pushing tenant_id=demo metrics every 5s" -ForegroundColor Magenta
    Write-Host ""
}

function Invoke-DemoSim {
    Write-Header "Starting Demo Telemetry Simulator"
    Write-Warn "Make sure Pushgateway is running (docker stack up-lite)"
    Write-Step "Pushing metrics with tenant_id=demo to Pushgateway (port 9091)"
    Set-Location $Root
    python mock_telemetry_generator.py
}

# ------------------------------------------------------------------------------
# KAFKA TRADING SIMULATOR
# ------------------------------------------------------------------------------
function Invoke-TradingSimulator {
    Write-Header "Starting Kafka Trading Simulator (producer)"
    $producerDir = Join-Path $Root "services\kafka-trading"
    if (Test-Path $producerDir) {
        Set-Location $producerDir
        python producer.py
    }
    else {
        Write-Fail "services/kafka-trading not found"
    }
}

# ------------------------------------------------------------------------------
# CODE QUALITY
# ------------------------------------------------------------------------------
function Invoke-Lint {
    Write-Header "Linting Python code"
    Set-Location $Root
    ruff check .
    black --check .
    Write-Ok "Lint complete"
}

function Invoke-Format {
    Write-Header "Auto-formatting Python code"
    Set-Location $Root
    ruff check --fix .
    black .
    Write-Ok "Formatting complete"
}

# ------------------------------------------------------------------------------
# SET vm.max_map_count (needed for Elasticsearch on WSL2)
# ------------------------------------------------------------------------------
function Set-VmMaxMap {
    Write-Header "Setting vm.max_map_count for Elasticsearch (WSL2)"
    wsl -d docker-desktop sysctl -w vm.max_map_count=262144
    Write-Ok "vm.max_map_count set to 262144"
}

# ------------------------------------------------------------------------------
# BROWSER SHORTCUTS
# ------------------------------------------------------------------------------
function Open-All {
    Write-Header "Opening all service UIs in browser"
    Start-Process "http://localhost:3000"
    Start-Process "http://localhost:8004/docs"
    Start-Process "http://localhost:8080"
    Start-Process "http://localhost:9090"
    Start-Process "http://localhost:3001"
    Write-Ok "All UIs launched"
}

# ------------------------------------------------------------------------------
# SERVICE URL TABLE
# ------------------------------------------------------------------------------
function Show-Urls {
    Write-Host ""
    Write-Host "  =============================================================" -ForegroundColor DarkGray
    Write-Host "  SERVICE                  URL                       CREDS" -ForegroundColor DarkGray
    Write-Host "  =============================================================" -ForegroundColor DarkGray
    Write-Host "  Capsule Dashboard        http://localhost:3000" -ForegroundColor Green
    Write-Host "  FastAPI Metrics API      http://localhost:8004      API Key" -ForegroundColor Green
    Write-Host "  API Swagger Docs         http://localhost:8004/docs" -ForegroundColor Green
    Write-Host "  Apache Airflow           http://localhost:8080      admin/admin" -ForegroundColor Cyan
    Write-Host "  Grafana                  http://localhost:3001      admin/admin" -ForegroundColor Cyan
    Write-Host "  Prometheus               http://localhost:9090" -ForegroundColor Cyan
    Write-Host "  Spark Master UI          http://localhost:8180" -ForegroundColor Cyan
    Write-Host "  Spark Worker UI          http://localhost:8181" -ForegroundColor Cyan
    Write-Host "  Kibana     (full only)   http://localhost:5601" -ForegroundColor Yellow
    Write-Host "  Elasticsearch (full)     http://localhost:9200" -ForegroundColor Yellow
    Write-Host "  Kafka                    localhost:9094 (external)" -ForegroundColor Yellow
    Write-Host "  Redis                    localhost:6379" -ForegroundColor Yellow
    Write-Host "  PostgreSQL               localhost:5432             airflow/airflow" -ForegroundColor Yellow
    Write-Host "  =============================================================" -ForegroundColor DarkGray
    Write-Host ""
}

# ------------------------------------------------------------------------------
# HELP
# ------------------------------------------------------------------------------
function Show-Help {
    Write-Host ""
    Write-Host "  Capsule - Unified Data Observability Platform" -ForegroundColor Cyan
    Write-Host "  run.ps1 - Master control script" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Usage: .\run.ps1 <command> [option]" -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Docker Stack ---" -ForegroundColor DarkGray
    Write-Host "  up               Start full stack  (~12 GB RAM, includes ELK)" -ForegroundColor Green
    Write-Host "  up-lite          Start lite stack  (~6 GB RAM, skips ELK)" -ForegroundColor Green
    Write-Host "  down             Stop all containers (volumes preserved)" -ForegroundColor Green
    Write-Host "  clean            Stop + DELETE all volumes (WARNING: data loss)" -ForegroundColor Yellow
    Write-Host "  restart          down then up" -ForegroundColor Green
    Write-Host "  status           Show container health" -ForegroundColor Green
    Write-Host "  logs [service]   Tail logs (optional: filter by service name)" -ForegroundColor Green
    Write-Host "  validate         Validate docker-compose.yml syntax" -ForegroundColor Green
    Write-Host ""
    Write-Host "  --- Local Development ---" -ForegroundColor DarkGray
    Write-Host "  dev              Launch API + Dashboard + Demo Simulator in three new terminals" -ForegroundColor Green
    Write-Host "  demo-sim         Run demo telemetry simulator (tenant_id=demo) standalone" -ForegroundColor Magenta
    Write-Host "  api              Start FastAPI Metrics API on port 8004" -ForegroundColor Green
    Write-Host "  api-install      Install FastAPI Python dependencies only" -ForegroundColor Green
    Write-Host "  dashboard        Start Next.js Dashboard on port 3000" -ForegroundColor Green
    Write-Host "  dash-install     Install Next.js npm dependencies only" -ForegroundColor Green
    Write-Host "  dash-build       Build Next.js Dashboard for production" -ForegroundColor Green
    Write-Host "  trading-sim      Run Kafka trading producer simulator" -ForegroundColor Green
    Write-Host ""
    Write-Host "  --- Setup ---" -ForegroundColor DarkGray
    Write-Host "  init             Create .env and .env.local from templates" -ForegroundColor Green
    Write-Host "  generate-keys    Generate Airflow Fernet + secret keys" -ForegroundColor Green
    Write-Host "  set-vm-maxmap    Set vm.max_map_count for Elasticsearch (WSL2)" -ForegroundColor Green
    Write-Host "  prereqs          Check all tool prerequisites" -ForegroundColor Green
    Write-Host ""
    Write-Host "  --- Browser Shortcuts ---" -ForegroundColor DarkGray
    Write-Host "  open             Open ALL service UIs in browser" -ForegroundColor Green
    Write-Host "  open-dashboard   http://localhost:3000" -ForegroundColor Green
    Write-Host "  open-airflow     http://localhost:8080" -ForegroundColor Green
    Write-Host "  open-grafana     http://localhost:3001" -ForegroundColor Green
    Write-Host "  open-prometheus  http://localhost:9090" -ForegroundColor Green
    Write-Host "  open-kibana      http://localhost:5601" -ForegroundColor Green
    Write-Host ""
    Write-Host "  --- Code Quality ---" -ForegroundColor DarkGray
    Write-Host "  lint             Run ruff + black (check mode)" -ForegroundColor Green
    Write-Host "  format           Auto-format with ruff + black" -ForegroundColor Green
    Write-Host ""
    Write-Host "  urls             Print all service URLs and credentials" -ForegroundColor Green
    Write-Host ""
}

# ------------------------------------------------------------------------------
# COMMAND ROUTER
# ------------------------------------------------------------------------------
switch ($Command.ToLower()) {
    "up"              { Invoke-Up }
    "up-lite"         { Invoke-UpLite }
    "down"            { Invoke-Down }
    "clean"           { Invoke-Clean }
    "restart"         { Invoke-Restart }
    "status"          { Invoke-Status }
    "logs"            { Invoke-Logs }
    "validate"        { Invoke-Validate }

    "dev"             { Invoke-Dev }
    "api"             { Invoke-Api }
    "api-install"     { Invoke-ApiInstall }
    "dashboard"       { Invoke-Dashboard }
    "dash-install"    { Invoke-DashInstall }
    "dash-build"      { Invoke-DashBuild }
    "trading-sim"     { Invoke-TradingSimulator }
    "demo-sim"        { Invoke-DemoSim }

    "init"            { Invoke-Init }
    "generate-keys"   { Invoke-GenerateKeys }
    "set-vm-maxmap"   { Set-VmMaxMap }
    "prereqs"         { Invoke-Prereqs }

    "open"            { Open-All }
    "open-dashboard"  { Start-Process "http://localhost:3000" }
    "open-airflow"    { Start-Process "http://localhost:8080" }
    "open-grafana"    { Start-Process "http://localhost:3001" }
    "open-prometheus" { Start-Process "http://localhost:9090" }
    "open-kibana"     { Start-Process "http://localhost:5601" }

    "lint"            { Invoke-Lint }
    "format"          { Invoke-Format }

    "urls"            { Show-Urls }
    "help"            { Show-Help }
    default           { Write-Fail "Unknown command: '$Command'"; Show-Help }
}
