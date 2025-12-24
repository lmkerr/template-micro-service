# SSM Parameters for Aurora Serverless Database
#
# These parameters must exist in AWS SSM Parameter Store before deploying.
# They should be created when you provision your Aurora Serverless cluster.
#
# Required parameters per environment (dev, prod):
#   /database/{env}/cluster-arn   - ARN of your Aurora Serverless cluster
#   /database/{env}/secret-arn    - ARN of the Secrets Manager secret with DB credentials
#   /database/{env}/database-name - Name of the database
#
# Example (using AWS CLI):
#   aws ssm put-parameter --name "/database/dev/cluster-arn" --value "arn:aws:rds:..." --type String
#   aws ssm put-parameter --name "/database/dev/secret-arn" --value "arn:aws:secretsmanager:..." --type String
#   aws ssm put-parameter --name "/database/dev/database-name" --value "mydb" --type String

data "aws_ssm_parameter" "aurora_cluster_arn" {
  name = "/database/${terraform.workspace}/cluster-arn"
}

data "aws_ssm_parameter" "data_api_secret_arn" {
  name = "/database/${terraform.workspace}/secret-arn"
}

data "aws_ssm_parameter" "database_name" {
  name = "/database/${terraform.workspace}/database-name"
}
