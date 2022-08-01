resource "aws_dynamodb_table" "repo-scan-id" {
  name           = "${var.app}-repo-scan-id"
  read_capacity  = var.db_read_capacity
  write_capacity = var.db_write_capacity
  hash_key       = "scan_id"
  range_key      = "create_date"

  attribute {
    name = "create_date"
    type = "S"
  }

  attribute {
    name = "scan_id"
    type = "S"
  }

  ttl {
    enabled        = true
    attribute_name = "expires"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall queued scan ids"
    }
  )
}

output "repo-scan-table-name" {
  value = aws_dynamodb_table.repo-scan-id.name
}
