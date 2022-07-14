output "vpc_cidr" {
  value = var.vpc_cidr
}

output "vpc_route_table_id" {
  value = aws_route_table.route-table.id
}