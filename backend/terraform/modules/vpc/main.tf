resource "aws_vpc" "vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = merge(
    var.tags,
    {
      Name = "Artemis VPC"
    }
  )
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.vpc.id

  tags = merge(
    var.tags,
    {
      Name = "Artemis GW"
    }
  )
}

resource "aws_route_table" "route-table" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Route Table"
    }
  )
}

output "vpc_id" {
  value = aws_vpc.vpc.id
}
