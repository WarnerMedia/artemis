#######################
# Aurora RDS Cluster ##
#######################
resource "aws_rds_cluster" "aurora" {
  apply_immediately               = true
  availability_zones              = ["us-east-2a", "us-east-2b", "us-east-2c"]
  backup_retention_period         = 7
  cluster_identifier              = local.db_prefix
  database_name                   = "analyzer"
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.cluster_parameter_group.name
  deletion_protection             = true
  enabled_cloudwatch_logs_exports = ["postgresql"]
  engine                          = "aurora-postgresql"
  engine_version                  = var.db_engine_version
  kms_key_id                      = var.db_kms_key
  master_password                 = random_password.rds_master_password.result
  master_username                 = "artemisadmin"
  preferred_backup_window         = "03:30-06:30"
  preferred_maintenance_window    = "Mon:00:00-Mon:03:00"
  storage_encrypted               = true
  vpc_security_group_ids          = [aws_security_group.db.id]
  final_snapshot_identifier       = "final-${local.db_prefix}-${random_id.rds_snapshot_identifier.hex}"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Database"
    }
  )
}

locals {
  # If the parameter_group_family hasn't been set, use the default based
  # on the database engine major version.
  engine_major_version = split(".", var.db_engine_version)[0]
  parameter_group_family = var.db_parameter_group_family == null ? (
    "aurora-postgresql${local.engine_major_version}"
  ) : var.db_parameter_group_family
  db_prefix = "${var.app}-${var.environment}"
}

resource "aws_db_parameter_group" "db_parameter_group" {
  name   = "${var.app}-db-parameter-group"
  family = local.parameter_group_family

  tags = var.tags
}

resource "aws_rds_cluster_parameter_group" "cluster_parameter_group" {
  name   = "${var.app}-cluster-parameter-group"
  family = local.parameter_group_family

  tags = var.tags
}

resource "random_password" "rds_master_password" {
  length  = 10
  special = false
  numeric = true
}

resource "null_resource" "aurora_db_master_password" {
  depends_on = [
    aws_secretsmanager_secret_version.db-master-password
  ]
  triggers = {
    db_host = aws_rds_cluster.aurora.endpoint
  }
  provisioner "local-exec" {
    # Pull the actual DB master password and set it
    command = "bash -c 'DBPASS=$(aws --region ${var.aws_region} secretsmanager get-secret-value --secret-id ${var.app}/db-master-password | jq -r \".SecretString\"); aws --region ${var.aws_region} rds modify-db-cluster --db-cluster-identifier ${aws_rds_cluster.aurora.id} --master-user-password \"$${DBPASS}\" --apply-immediately'"
  }
}

resource "random_id" "rds_snapshot_identifier" {
  byte_length = 4
  keepers = {
    "id" = "${local.db_prefix}"
  }
}

############################ 
# Aurora Cluster Instance ##
############################
resource "aws_rds_cluster_instance" "cluster_instance" {
  count = 1 # Create 1 db instance

  apply_immediately          = true
  auto_minor_version_upgrade = true
  availability_zone          = element(var.database_availability_zones, length(var.database_availability_zones) - 1)
  ca_cert_identifier         = var.db_ca_cert_identifier
  cluster_identifier         = aws_rds_cluster.aurora.cluster_identifier
  instance_class             = "db.r6g.2xlarge"
  engine                     = aws_rds_cluster.aurora.engine
  identifier                 = "${aws_rds_cluster.aurora.cluster_identifier}-${count.index + 1}"
  promotion_tier             = 1

  tags = merge(
    var.tags,
    {
      Name = "Artemis Database"
    }
  )
}

################
## Networking ##
################
resource "aws_db_subnet_group" "db_subnet_group" {
  subnet_ids = aws_subnet.database.*.id

  tags = merge(
    var.tags,
    {
      Name = "aurora-${local.db_prefix}"
    }
  )
}

resource "aws_security_group" "db" {
  name   = "${var.app}-db"
  vpc_id = var.vpc_id

  ingress {
    from_port = 5432
    to_port   = 5432
    protocol  = "tcp"
    security_groups = [
      module.public_engine_cluster.engine-sec-group.id,
      module.nat_engine_cluster.engine-sec-group.id,
      aws_security_group.lambda-sg.id
    ]
    cidr_blocks = aws_subnet.database.*.cidr_block
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Database Security Group"
    }
  )
}

resource "aws_subnet" "database" {
  count             = length(var.database_cidrs)
  vpc_id            = var.vpc_id
  cidr_block        = var.database_cidrs[count.index]
  availability_zone = var.database_availability_zones[count.index]

  tags = merge(
    var.tags,
    {
      Name = "Artemis Database Subnet"
    }
  )
}

