# Redis Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "obs-redis-subnet-group-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "obs-redis-subnets-${var.environment}"
    Environment = var.environment
  }
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "obs-redis-sg-${var.environment}"
  description = "Allow inbound Redis traffic from EKS worker nodes"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from EKS worker nodes"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.eks_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "obs-redis-sg-${var.environment}"
    Environment = var.environment
  }
}

# Redis Replication Group (Single cluster, cost optimized)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "obs-redis-${var.environment}"
  description          = "Redis replication group for cache in EKS cluster"
  node_type            = var.node_type
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  # Standalone setup for cost optimization. Change for multi-AZ replica setup in production.
  num_cache_clusters         = 1
  automatic_failover_enabled = false

  tags = {
    Environment = var.environment
  }
}
