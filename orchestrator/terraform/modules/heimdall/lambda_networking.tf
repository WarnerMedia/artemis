###############################################################################
# Lambda VPC Networking
###############################################################################

#######################################
# VPC
#######################################

resource "aws_vpc" "heimdall" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall VPC"
    }
  )
}

resource "aws_internet_gateway" "heimdall-gw" {
  vpc_id = aws_vpc.heimdall.id

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall GW"
    }
  )
}

resource "aws_route_table" "heimdall-route-table" {
  vpc_id = aws_vpc.heimdall.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.heimdall-gw.id
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Route Table"
    }
  )
}

#######################################
# Subnets
#######################################

resource "aws_subnet" "nat-gw" {
  vpc_id            = aws_vpc.heimdall.id
  cidr_block        = var.nat_gw_cidr
  availability_zone = var.lambda_availability_zone

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall NAT GW Public Subnet"
    }
  )
}

# Allow NAT GW subnet to route out through the IGW
resource "aws_route_table_association" "nat-gw-route-table" {
  subnet_id      = aws_subnet.nat-gw.id
  route_table_id = aws_route_table.heimdall-route-table.id
}

resource "aws_subnet" "lambdas" {
  vpc_id            = aws_vpc.heimdall.id
  cidr_block        = var.lambda_cidr
  availability_zone = var.lambda_availability_zone

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Lambda Subnet"
    }
  )
}

#######################################
# NAT Gateway
#######################################

# Create a NAT gateway with an EIP for each private subnet to get internet connectivity
resource "aws_eip" "lambda_nat" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.heimdall-gw]

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall NAT Gateway EIP"
    }
  )
}

resource "aws_nat_gateway" "lambda_nat" {
  subnet_id     = aws_subnet.nat-gw.id
  allocation_id = aws_eip.lambda_nat.id

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Lambda NAT Gateway"
    }
  )
}

resource "aws_route_table" "lambda_routes" {
  vpc_id = aws_vpc.heimdall.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.lambda_nat.id
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Lambda Route Table"
    }
  )
}

# Allow Lambda subnet to route out through the NAT GW
resource "aws_route_table_association" "lambda-route-table" {
  subnet_id      = aws_subnet.lambdas.id
  route_table_id = aws_route_table.lambda_routes.id
}

#######################################
# Security Group
#######################################

resource "aws_security_group" "lambda-sg" {
  name   = "${var.app}-vpc-lambda"
  vpc_id = aws_vpc.heimdall.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      "Name" : "Heimdall Lambda Security Group"
    }
  )
}

#######################################
# Permissions
#######################################

data "aws_iam_policy_document" "vpc-lambda-policy" {
  statement {
    effect = "Allow"

    actions = [
      "ec2:CreateNetworkInterface",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DeleteNetworkInterface",
    ]

    resources = [
      "*",
    ]
  }
}

resource "aws_iam_policy" "vpc-lambda" {
  name   = "${var.app}-lambda-vpc"
  policy = data.aws_iam_policy_document.vpc-lambda-policy.json
}

resource "aws_iam_role_policy_attachment" "vpc-lambda-access" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.vpc-lambda.arn
}
