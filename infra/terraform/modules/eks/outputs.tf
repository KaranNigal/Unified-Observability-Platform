output "cluster_endpoint" {
  value       = aws_eks_cluster.main.endpoint
  description = "The endpoint for the EKS Kubernetes API"
}

output "cluster_certificate_authority_data" {
  value       = aws_eks_cluster.main.certificate_authority[0].data
  description = "Base64 encoded certificate data required to communicate with the cluster"
}

output "cluster_name" {
  value       = aws_eks_cluster.main.name
  description = "The EKS cluster name"
}

output "node_security_group_id" {
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  description = "Security Group ID associated with the cluster control plane / worker nodes"
}
