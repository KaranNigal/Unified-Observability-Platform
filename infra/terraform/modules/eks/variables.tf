variable "vpc_id" {
  type        = string
  description = "The ID of the VPC"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for EKS node placement"
}

variable "cluster_name" {
  type        = string
  description = "The name of the EKS cluster"
  default     = "obs-cluster"
}

variable "environment" {
  type        = string
  description = "The environment name"
}
