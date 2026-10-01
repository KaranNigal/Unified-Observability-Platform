variable "aws_region" {
  type        = string
  description = "AWS Region to deploy the infrastructure in"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "The environment name (e.g. dev, staging, prod)"
  default     = "dev"
}

variable "vpc_cidr" {
  type        = string
  description = "The CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "cluster_name" {
  type        = string
  description = "EKS Cluster identifier"
  default     = "obs-cluster"
}
