output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "The ID of the provisioned VPC"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "Kubernetes control plane API URL"
}

output "eks_cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS cluster identifier"
}

output "redis_primary_endpoint" {
  value       = module.elasticache.redis_endpoint
  description = "Hostname for ElastiCache Redis replication primary node"
}

output "alb_dns_name" {
  value       = module.alb.alb_dns_name
  description = "Public Application Load Balancer domain URL routing to services"
}
