#!/bin/bash
set -e

echo "=========================================================="
echo " Deploying Unified Observability Platform to EKS"
echo "=========================================================="

echo "[1/4] Adding Helm Repositories..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add elastic https://helm.elastic.co
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add apache-airflow https://airflow.apache.org
helm repo update

echo "[2/4] Deploying Third-Party Dependencies (Helm)..."
# Prometheus (Community)
helm upgrade --install prometheus prometheus-community/prometheus \
  --namespace default \
  --set server.retention=15d \
  --set server.persistentVolume.enabled=false \
  --set alertmanager.enabled=false

# ELK Stack (Elasticsearch, Logstash, Kibana)
helm upgrade --install elasticsearch elastic/elasticsearch \
  --namespace default \
  --set replicas=1 \
  --set minimumMasterNodes=1 \
  --set volumeClaimTemplate.storageClassName=gp2 \
  --set resources.requests.memory=512Mi \
  --set resources.limits.memory=1024Mi

helm upgrade --install logstash elastic/logstash \
  --namespace default \
  --set replicas=1

helm upgrade --install kibana elastic/kibana \
  --namespace default \
  --set service.type=NodePort \
  --set service.nodePort=5601 \
  --set resources.requests.memory=512Mi \
  --set resources.limits.memory=1024Mi

# Kafka Broker
helm upgrade --install kafka bitnami/kafka \
  --namespace default \
  --set replicaCount=1 \
  --set controller.replicaCount=1 \
  --set zookeeper.enabled=false \
  --set kraft.enabled=true \
  --set persistence.enabled=false

# PostgreSQL (Airflow Metadata)
helm upgrade --install postgres bitnami/postgresql \
  --namespace default \
  --set global.postgresql.auth.username=airflow \
  --set global.postgresql.auth.password=airflow \
  --set global.postgresql.auth.database=airflow \
  --set primary.persistence.enabled=false

# Airflow
helm upgrade --install airflow apache-airflow/airflow \
  --namespace default \
  --set executor=CeleryExecutor \
  --set webserver.service.type=ClusterIP \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set data.metadataConnection.user=airflow \
  --set data.metadataConnection.pass=airflow \
  --set data.metadataConnection.host=postgres-postgresql \
  --set data.metadataConnection.db=airflow \
  # In production, data.brokerUrl points to ElastiCache endpoint
  --set data.brokerUrl=redis://obs-redis-dev.xxxxx.cache.amazonaws.com:6379/0

echo "[3/4] Deploying Custom Application Manifests..."
kubectl apply -f manifests/microservices.yaml
kubectl apply -f manifests/kafka-clients.yaml
kubectl apply -f manifests/otel-collector.yaml
kubectl apply -f manifests/metrics-api.yaml
kubectl apply -f manifests/dashboard-app.yaml
kubectl apply -f manifests/hpa.yaml

echo "[4/4] Verifying Resources..."
kubectl get pods -A
echo "=========================================================="
echo "Deployment initiated! Check pod status with: kubectl get pods -w"
