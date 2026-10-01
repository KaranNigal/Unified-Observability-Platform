# Kubernetes Deployment Manifests

This directory contains the production Kubernetes manifests and deployment scripts for orchestrating the **Capsule Unified Observability Platform** on **Amazon EKS** (or local Minikube / Kind clusters).

---

## 📁 Directory Structure

```
infra/k8s/
├── manifests/
│   ├── 00-namespace.yaml       # Defines the 'observability' namespace
│   ├── 01-secrets.yaml          # Base secrets & API keys
│   ├── 02-postgres.yaml         # Airflow metadata database
│   ├── 03-redis.yaml            # Celery broker & API query cache
│   ├── 04-kafka.yaml            # Apache Kafka broker in KRaft mode
│   ├── 05-prometheus.yaml       # Prometheus TSDB & Alertmanager
│   ├── 06-elk.yaml              # Elasticsearch, Logstash & Kibana
│   ├── 07-jaeger.yaml           # Jaeger tracing backend
│   ├── 08-collector.yaml        # OpenTelemetry Collector Gateway
│   ├── 09-services.yaml         # Microservices & Kafka trading simulator
│   ├── 10-api.yaml              # FastAPI Telemetry Gateway & HPA
│   ├── 11-dashboard.yaml        # Capsule Next.js Dashboard
│   └── 12-ingress.yaml          # AWS ALB Ingress Controller rules
└── deploy.sh                    # Automated sequential deployment script
```

---

## 🚀 Deployment Instructions

### Prerequisites
- Configured `kubectl` pointing to your Amazon EKS cluster:
  ```bash
  aws eks update-kubeconfig --region us-east-1 --name obs-platform-cluster
  ```
- AWS Load Balancer Controller installed on the EKS cluster.

### Deploying the Stack

```bash
# Make the deployment script executable
chmod +x deploy.sh

# Run automated deployment
./deploy.sh
```

### Manual Sequential Deployment

```bash
kubectl apply -f manifests/00-namespace.yaml
kubectl apply -f manifests/01-secrets.yaml
kubectl apply -f manifests/02-postgres.yaml
kubectl apply -f manifests/03-redis.yaml
kubectl apply -f manifests/04-kafka.yaml
kubectl apply -f manifests/05-prometheus.yaml
kubectl apply -f manifests/06-elk.yaml
kubectl apply -f manifests/07-jaeger.yaml
kubectl apply -f manifests/08-collector.yaml
kubectl apply -f manifests/09-services.yaml
kubectl apply -f manifests/10-api.yaml
kubectl apply -f manifests/11-dashboard.yaml
kubectl apply -f manifests/12-ingress.yaml
```

---

## 🔍 Verification & Health Checks

```bash
# Check all pods status
kubectl get pods -n observability

# Check services & LoadBalancer endpoints
kubectl get svc -n observability

# Inspect Ingress ALB hostname
kubectl get ingress -n observability
```
