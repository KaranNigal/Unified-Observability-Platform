# Pre-Configured Dashboards & Visualizations

This directory contains pre-provisioned dashboards and saved search objects for **Grafana** and **Kibana**.

---

## 📊 Grafana Dashboards (`dashboards/grafana/`)

- **Datasource Provisioning**: Automatically connects Grafana to Prometheus (`http://prometheus:9090`) and Alertmanager (`http://alertmanager:9093`) upon container boot.
- **Provisioned Dashboards**:
  1. **Pipeline Health**: Airflow DAG run states, task runtimes, PySpark job execution durations, and Pushgateway metrics.
  2. **Kafka Trading Performance**: Producer message velocity, consumer group lag across partitions, trade failure rates, and end-to-end latency.
  3. **System Overview**: Aggregate node health, container CPU/memory usage, and FastAPI Metrics API cache hit/miss ratios.

---

## 🔍 Kibana Saved Objects (`dashboards/kibana/`)

- **Index Pattern**: Configured for `logs-*` indices created by the Logstash pipeline.
- **Saved Searches**:
  - `Microservice Error Logs` (filtered on `log_level: ERROR OR log_level: CRITICAL`).
  - `Trading Order Audit Trail` (filtered on `component: kafka-trading`).
  - `Airflow Task Execution Log Stream` (filtered on `component: airflow`).
