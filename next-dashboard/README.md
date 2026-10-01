# Capsule Observability Dashboard
### Next.js 15 Single-Pane-of-Glass Telemetry Interface

The **Capsule Dashboard** is a modern, real-time web application built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**. It serves as the primary user interface for the Unified Observability Platform, consolidating real-time telemetry from Apache Airflow, PySpark, microservices, and Kafka event streams into a single responsive pane.

---

## 🚀 Features

- **Executive Platform Health**: Live indicators displaying overall cluster availability, Prometheus target health, Redis cache status, and active firing alerts.
- **Kafka Trading Pipeline Monitor**: High-frequency consumer lag meters, message ingestion rates, partition-level metrics, and trade error counters.
- **Service Telemetry Grid**: Dedicated real-time metric cards for:
  - **Apache Airflow**: Active DAG counts, task success/failure ratios, scheduler heartbeat.
  - **PySpark**: Batch job execution durations, records processed, worker status.
  - **FastAPI Microservices**: Request rates, p95 latencies, HTTP 4xx/5xx error rates for `orders-service` and `inventory-service`.
  - **OpenTelemetry Collector**: Ingested span count, exporter latency, and internal buffer saturation.
- **Log Search Viewer**: Direct query interface to search and filter application logs indexed in Elasticsearch.
- **Distributed Trace Explorer**: Inspect end-to-end distributed traces propagated through Jaeger.
- **Deep-Dive Shortcuts**: One-click navigation to specialized operational tools (Airflow Webserver, Grafana, Kibana, Jaeger, and Prometheus).

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server & Client Components)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom dark glassmorphism design tokens
- **Icons**: [Lucide React](https://lucide.dev/)

---

## ⚙️ Environment Configuration

Create a `.env.local` file in this directory (or run `make init` / `.\run.ps1 init` from the repository root):

```env
# URL of the FastAPI Metrics Gateway
NEXT_PUBLIC_METRICS_API_URL=http://localhost:8004

# API Authentication Key
NEXT_PUBLIC_API_KEY=super-secret-key-123
```

---

## 💻 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm start
```

---

## 📁 Directory Structure

```
next-dashboard/
├── public/                 # Static assets and favicon
├── src/
│   ├── app/
│   │   ├── api/            # Internal Next.js API route proxies
│   │   ├── globals.css     # Global CSS and Tailwind directives
│   │   ├── layout.tsx      # Root HTML layout with metadata
│   │   └── page.tsx        # Single-pane-of-glass dashboard page
│   └── lib/                # Telemetry client, API helpers, TypeScript models
├── .env.local              # Local environment configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── next.config.ts          # Next.js configuration
```

---

## 🔗 Related Services

- **FastAPI Metrics API**: `http://localhost:8004` (Swagger: `/docs`)
- **Grafana**: `http://localhost:3000`
- **Kibana**: `http://localhost:5601`
- **Jaeger**: `http://localhost:16686`
- **Airflow**: `http://localhost:8080`
