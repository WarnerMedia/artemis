###############################################################################
# ElasticCache Server
###############################################################################
resource "aws_elasticache_subnet_group" "memcached" {
  name       = "memcached-subnet-group"
  subnet_ids = [aws_subnet.memcached_subnet.id]
  tags       = var.tags
}

resource "aws_subnet" "memcached_subnet" {
  vpc_id            = var.vpc_id
  cidr_block        = var.elasticache_cidr
  availability_zone = var.elasticache_availability_zone
  tags = merge(
    var.tags,
    {
      Name = "Artemis Elasticache Subnet"
    }
  )
}

resource "aws_vpc_security_group_egress_rule" "memcached_egress" {
  security_group_id = aws_security_group.memcached.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  tags              = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "memcached_ingress" {
  security_group_id            = aws_security_group.memcached.id
  referenced_security_group_id = aws_security_group.lambda-sg.id
  ip_protocol                  = "tcp"
  from_port                    = 11211
  to_port                      = 11211
  tags                         = var.tags
}


resource "aws_security_group" "memcached" {
  name        = "memcached-sg"
  description = "Allow Lambda system_services to access Memcached"
  vpc_id      = var.vpc_id

  tags = merge(
    var.tags,
    {
      Name = "Artemis Elasticache Security Group"
    }
  )
}

resource "aws_elasticache_cluster" "memcached" {
  cluster_id                 = var.memcached_cluster_id
  engine                     = "memcached"
  node_type                  = var.memcached_node_type
  num_cache_nodes            = 1
  port                       = 11211
  subnet_group_name          = aws_elasticache_subnet_group.memcached.name
  security_group_ids         = [aws_security_group.memcached.id]
  transit_encryption_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "Artemis Memcached Cluster"
    }
  )
}
