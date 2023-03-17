###############################################################################
# Aurora RDS
###############################################################################

module "aurora" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "2.29.0"

  name = "${var.app}-${var.environment}"

  engine                          = "aurora-postgresql"
  engine_version                  = "11.17"
  auto_minor_version_upgrade      = true
  apply_immediately               = true
  db_parameter_group_name         = aws_db_parameter_group.db_parameter_group.name
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.cluster_parameter_group.name
  instance_type                   = var.db_instance_type
  storage_encrypted               = true
  kms_key_id                      = var.db_kms_key
  preferred_maintenance_window    = "Mon:00:00-Mon:03:00"
  preferred_backup_window         = "03:30-06:30"
  deletion_protection             = true

  database_name = "analyzer"
  port          = 5432

  username = "artemisadmin"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  vpc_id                 = var.vpc_id
  subnets                = aws_subnet.database.*.id
  vpc_security_group_ids = [aws_security_group.db.id]

  tags = merge(
    var.tags,
    {
      Name = "Artemis Database"
    }
  )
}

resource "aws_db_parameter_group" "db_parameter_group" {
  name   = "${var.app}-db-parameter-group"
  family = "aurora-postgresql11"
}

resource "aws_rds_cluster_parameter_group" "cluster_parameter_group" {
  name   = "${var.app}-cluster-parameter-group"
  family = "aurora-postgresql11"
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

resource "null_resource" "aurora_db_master_password" {
  depends_on = [
    aws_secretsmanager_secret_version.db-master-password
  ]
  triggers = {
    db_host = module.aurora.this_rds_cluster_endpoint
  }
  provisioner "local-exec" {
    # Pull the actual DB master password and set it
    command = "bash -c 'DBPASS=$(aws --region ${var.aws_region} secretsmanager get-secret-value --secret-id ${var.app}/db-master-password | jq -r \".SecretString\"); aws --region ${var.aws_region} rds modify-db-cluster --db-cluster-identifier ${module.aurora.this_rds_cluster_id} --master-user-password \"$${DBPASS}\" --apply-immediately'"
  }
}
