data "aws_caller_identity" "current" {}

resource "aws_subnet" "subnet" {
  vpc_id            = var.vpc_id
  cidr_block        = var.engine_cidr
  availability_zone = var.availability_zone

  tags = merge(
    var.tags,
    {
      Name = "Artemis Engine ${var.name} Subnet"
    }
  )
}

resource "aws_route_table_association" "routing" {
  subnet_id      = aws_subnet.subnet.id
  route_table_id = var.vpc_route_table_id
}

###############################################################################
# EC2 Instance
###############################################################################
data "template_file" "engine-script" {
  template = file("${path.module}/templates/user_data/engine.sh")

  vars = {
    s3_bucket                    = var.s3_analyzer_files_bucket
    ver                          = var.ver
    type                         = var.public ? "public" : "nat"
    aqua_enabled                 = var.aqua_enabled ? 1 : 0
    veracode_enabled             = var.veracode_enabled ? 1 : 0
    snyk_enabled                 = var.snyk_enabled ? 1 : 0
    ghas_enabled                 = var.ghas_enabled ? 1 : 0
    github_app_id                = var.github_app_id
    private_docker_repos_key     = var.private_docker_repos_key
    plugin_java_heap_size        = var.plugin_java_heap_size
    status_lambda                = var.system_status_lambda.arn
    aws_region                   = var.aws_region
    docker_compose_ver           = var.docker_compose_ver
    engine_block_device          = var.engine_block_device
    application                  = var.app
    region                       = var.aws_region
    domain_name                  = var.domain_name
    mandatory_include_paths      = jsonencode(var.mandatory_include_paths)
    metadata_scheme_modules      = var.metadata_scheme_modules
    revproxy_domain_substring    = var.revproxy_domain_substring
    revproxy_secret              = var.revproxy_secret
    revproxy_secret_region       = var.revproxy_secret_region
    secrets_events_enabled       = var.secrets_events_enabled
    inventory_events_enabled     = var.inventory_events_enabled
    configuration_events_enabled = var.configuration_events_enabled
  }
}

locals {
  engine_user_data = data.template_file.engine-script.rendered
}

resource "aws_launch_template" "engine-template" {
  name          = "${var.app}-engine-template-${var.name}"
  image_id      = var.engine_ami[var.aws_region]
  instance_type = var.engine_size

  iam_instance_profile {
    name = aws_iam_instance_profile.engine-ec2.name
  }

  network_interfaces {
    associate_public_ip_address = var.public
    subnet_id                   = aws_subnet.subnet.id
    security_groups             = [aws_security_group.engine-sec-group.id]
    delete_on_termination       = true
  }

  user_data = base64encode(local.engine_user_data)

  block_device_mappings {
    device_name = var.engine_block_device

    ebs {
      volume_size = var.engine_volume_size
      volume_type = "gp3"
    }
  }

  metadata_options {
    http_tokens = "required"
  }

  tag_specifications {
    resource_type = "instance"

    tags = merge(
      var.tags,
      {
        Name = "Artemis Engine ${var.name}"
      }
    )
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Engine Template ${var.name}"
    }
  )
}

###############################################################################
# Autoscaling
###############################################################################

resource "aws_autoscaling_group" "engine-asg" {
  name                 = "${var.app}-engine-asg-${var.name}"
  max_size             = var.engine_scale_max
  min_size             = var.engine_scale_min
  vpc_zone_identifier  = [aws_subnet.subnet.id]
  termination_policies = ["OldestInstance"]

  launch_template {
    name    = aws_launch_template.engine-template.name
    version = "$Latest"
  }

  metrics_granularity = "1Minute"
  enabled_metrics     = ["GroupInServiceInstances"]

  dynamic "tag" {
    for_each = var.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = false
    }
  }
}

resource "aws_autoscaling_lifecycle_hook" "engine-terminating" {
  name                   = "${var.app}-engine-terminating-hook-${var.name}"
  autoscaling_group_name = aws_autoscaling_group.engine-asg.name
  heartbeat_timeout      = 3600
  lifecycle_transition   = "autoscaling:EC2_INSTANCE_TERMINATING"
  default_result         = "CONTINUE"
}

resource "aws_autoscaling_policy" "scale-up" {
  name                   = "${var.app}-engine-scale-up-${var.name}"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60
  autoscaling_group_name = aws_autoscaling_group.engine-asg.name
}

resource "aws_autoscaling_policy" "scale-down" {
  name                   = "${var.app}-engine-scale-down-${var.name}"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60
  autoscaling_group_name = aws_autoscaling_group.engine-asg.name
}

resource "aws_cloudwatch_metric_alarm" "queue-high" {
  alarm_name                = "${var.app}-task-queue-high-${var.name}"
  alarm_description         = "Monitor task queue size for scaling up"
  namespace                 = var.app
  metric_name               = "queued_messages_per_engine"
  evaluation_periods        = var.engine_scale_eval_periods
  period                    = var.engine_scale_period
  statistic                 = "Average"
  comparison_operator       = "GreaterThanThreshold"
  threshold                 = var.engine_scale_up_threshold
  insufficient_data_actions = []

  dimensions = {
    QueueName = aws_sqs_queue.task-queue.name
  }

  alarm_actions = [aws_autoscaling_policy.scale-up.arn]

  # Actions are disabled when in maintenance mode
  actions_enabled = !var.maintenance_mode
}

resource "aws_cloudwatch_metric_alarm" "queue-low" {
  alarm_name                = "${var.app}-task-queue-low-${var.name}"
  alarm_description         = "Monitor task queue size for scaling down"
  namespace                 = var.app
  metric_name               = "queued_messages_per_engine"
  evaluation_periods        = var.engine_scale_eval_periods
  period                    = var.engine_scale_period
  statistic                 = "Average"
  comparison_operator       = "LessThanThreshold"
  threshold                 = var.engine_scale_down_threshold
  insufficient_data_actions = []

  dimensions = {
    QueueName = aws_sqs_queue.task-queue.name
  }

  alarm_actions = [aws_autoscaling_policy.scale-down.arn]

  # Actions are disabled when in maintenance mode
  actions_enabled = !var.maintenance_mode
}

resource "aws_cloudwatch_event_rule" "scale-down" {
  name        = "${var.app}-engine-scale-down-${var.name}"
  description = "Fires when the Engine ASG terminates an instance"

  event_pattern = <<EOF
{
  "source": [
    "aws.autoscaling"
  ],
  "detail-type": [
    "EC2 Instance-terminate Lifecycle Action",
    "EC2 Instance Terminate Successful",
    "EC2 Instance Terminate Unsuccessful"
  ],
  "detail": {
    "AutoScalingGroupName": [
      "${aws_autoscaling_group.engine-asg.name}"
    ]
  }
}
EOF
}

resource "aws_lambda_function" "scale-down" {
  function_name = "${var.app}-scale-down-${var.name}"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/scale_down/v${var.ver}/scale_down.zip"

  layers = var.lambda_layers

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 60

  role = aws_iam_role.scale-down-assume-role.arn

  vpc_config {
    subnet_ids = [
      var.lambda_subnet.id,
    ]

    security_group_ids = [
      var.lambda_sg.id
    ]
  }

  environment {
    variables = {
      S3_BUCKET                   = var.s3_analyzer_files_id
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Scale Down Lambda ${var.name}"
    }
  )
}

resource "aws_cloudwatch_event_target" "scale-down" {
  target_id = "${var.app}-engine-scale-down-${var.name}"
  rule      = aws_cloudwatch_event_rule.scale-down.name
  arn       = aws_lambda_function.scale-down.arn
}

resource "aws_lambda_permission" "scale-down" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scale-down.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scale-down.arn
}

###############################################################################
# Logging
###############################################################################

resource "aws_cloudwatch_log_group" "engine-log-group" {
  name              = "/${var.app}/engine/cluster/${var.name}"
  retention_in_days = var.engine_log_retention

  tags = merge(
    var.tags,
    {
      Name = "Artemis Engine Cluster Logs"
    }
  )
}
