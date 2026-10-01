#!/bin/bash

# Port mapping: FastAPI Metrics API is exposed on http://localhost:8004
API_URL="http://localhost:8004"
API_KEY="super-secret-key-123"

echo "========================================================================="
echo "Metrics API - HTTP Requests Examples Collection"
echo "========================================================================="

echo -e "\n1. Check Root Endpoint"
curl -s -X GET "${API_URL}/"

echo -e "\n\n2. Health Check (Unauthenticated, for Orchestrator Probing)"
curl -s -X GET "${API_URL}/api/v1/health"

echo -e "\n\n3. Unauthorized Request to Metrics Endpoint (Expect 401)"
curl -s -o /dev/null -w "HTTP Status Code: %{http_code}\n" -X GET "${API_URL}/api/v1/metrics/microservice"

echo -e "\n4. Authorized Request to Microservice Metrics"
curl -s -X GET "${API_URL}/api/v1/metrics/microservice" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n5. Authorized Range History Request for Kafka Lag (from 5 mins ago to now)"
NOW=$(date +%s)
FIVE_MINS_AGO=$((NOW - 300))
curl -s -X GET "${API_URL}/api/v1/metrics/kafka-trading/history?from=${FIVE_MINS_AGO}&to=${NOW}&step=15s" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n6. Fetch Active Alerts & Rules"
curl -s -X GET "${API_URL}/api/v1/alerts" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n7. Fetch Kafka Consumer Lag"
curl -s -X GET "${API_URL}/api/v1/kafka/lag" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n8. Dashboard - Airflow DAGs Aggregate Stats"
curl -s -X GET "${API_URL}/api/v1/dashboard/airflow/dags?range=1h" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n9. Dashboard - Airflow Tasks Latency Distribution (sample_etl_dag)"
curl -s -X GET "${API_URL}/api/v1/dashboard/airflow/tasks?dag_id=sample_etl_dag&range=1h" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n10. Dashboard - PySpark Job Execution Aggregates"
curl -s -X GET "${API_URL}/api/v1/dashboard/pyspark/jobs?range=1h" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n11. Dashboard - PySpark Job Executor Resource Allocation"
curl -s -X GET "${API_URL}/api/v1/dashboard/pyspark/executors?job_id=job-999" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n12. Dashboard - Microservices Latency (orders-service)"
curl -s -X GET "${API_URL}/api/v1/dashboard/microservices?service=orders-service&range=1h" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n13. Dashboard - Kafka Throughput Statistics"
curl -s -X GET "${API_URL}/api/v1/dashboard/kafka/throughput?range=1h" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n14. Dashboard - Unified System Health Status Strip"
curl -s -X GET "${API_URL}/api/v1/dashboard/system-health" \
  -H "X-API-Key: ${API_KEY}"

echo -e "\n\n15. Fetch API's Self-Monitoring Metrics (Includes cache hit/miss counts)"
curl -s -X GET "${API_URL}/metrics"

echo -e "\n========================================================================="
