output "redis_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "The primary endpoint address for the Redis replication group"
}

output "redis_port" {
  value       = aws_elasticache_replication_group.redis.port
  description = "The port number on which the cache accepts connections"
}
