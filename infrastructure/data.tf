data "aws_ssm_parameter" "aurora_cluster_arn" {
  name = "/database/${terraform.workspace}/cluster-arn"
}

data "aws_ssm_parameter" "data_api_secret_arn" {
  name = "/database/${terraform.workspace}/secret-arn"
}

data "aws_ssm_parameter" "database_name" {
  name = "/database/${terraform.workspace}/database-name"
}
