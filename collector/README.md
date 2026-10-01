# OpenTelemetry Collector Configuration

This directory contains the central configuration (`otel-collector-config.yaml`) for the **OpenTelemetry Collector Contrib** service.

---

## 📡 Collector Architecture

The OpenTelemetry Collector acts as a standardized telemetry gateway:

```
┌────────────────────────────────────────────────────────┐
│                      RECEIVERS                         │
│  - Prometheus Receiver (scrapes services on /metrics)  │
│  - OTLP Receiver (gRPC :4317 / HTTP :4318 for spans)   │
│  - Filelog Receiver (collects logs from /var/log/app)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                     PROCESSORS                         │
│  - batch (groups telemetry items to optimize network)  │
│  - memory_limiter (prevents OOM on high load)          │
│  - resourcedetection (attaches host/container metadata)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                     EXPORTERS                          │
│  - Prometheus Exporter (:8889 - scraped by Prometheus) │
│  - OTLP Exporter (forwards spans to Jaeger backend)    │
│  - TCPLOG / Logstash Exporter (forwards logs to ELK)   │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Ports & Diagnostics

- **`8888`**: OpenTelemetry Collector internal self-monitoring metrics (`/metrics`).
- **`8889`**: Prometheus metrics export endpoint.
- **`4317`**: OTLP gRPC receiver endpoint.
- **`4318`**: OTLP HTTP receiver endpoint.
