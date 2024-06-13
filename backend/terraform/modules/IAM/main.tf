
resource "aws_accessanalyzer_analyzer" "access_analyzer" {
  analyzer_name = "${var.app}-access-analyzer"
  tags          = var.tags
}