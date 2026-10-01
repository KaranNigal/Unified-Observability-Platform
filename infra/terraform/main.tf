# Provision Virtual Private Network (VPC)
module "vpc" {
  source      = "./modules/vpc"
  vpc_cidr    = var.vpc_cidr
  environment = var.environment
}

# Provision Elastic Kubernetes Service (EKS) Cluster & Node Groups
module "eks" {
  source       = "./modules/eks"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
  cluster_name = var.cluster_name
  environment  = var.environment
}

# Provision Managed ElastiCache (Redis) Cluster
module "elasticache" {
  source                = "./modules/elasticache"
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  eks_security_group_id = module.eks.node_security_group_id
  environment           = var.environment
}

# Provision Application Load Balancer (ALB) for Path-based Ingress
module "alb" {
  source            = "./modules/alb"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  environment       = var.environment
}
