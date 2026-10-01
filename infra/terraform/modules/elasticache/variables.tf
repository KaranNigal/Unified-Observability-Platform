variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for Redis deployment"
}

variable "eks_security_group_id" {
  type        = string
  description = "Security Group ID of the EKS nodes to allow ingress traffic from"
}

variable "environment" {
  type        = string
  description = "The environment name"
}

variable "node_type" {
  type        = string
  description = "The ElastiCache instance class size"
  default     = "cache.t3.micro" # Cost-friendly instance class
}
