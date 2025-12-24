# Lambda function
resource "aws_lambda_function" "get_things_lambda" {
  filename         = "../dist/services/get-things/get-things.zip"
  function_name    = "carousel-get-things"
  role             = aws_iam_role.lambda_organization_execution_role.arn
  handler          = "get-things.handler"
  runtime          = local.node_runtime
  source_code_hash = filebase64sha256("../dist/services/get-things/get-things.zip")

  timeout = local.lambda_timeout

  description = "Get Things Lambda Function"
  environment {
    variables = {
      # Database Data API variables
      DB_CLUSTER_ARN = data.aws_ssm_parameter.aurora_cluster_arn.value
      DB_SECRET_ARN  = data.aws_ssm_parameter.data_api_secret_arn.value
      DB_NAME        = data.aws_ssm_parameter.database_name.value
    }
  }
}

# CloudWatch Log Group for Lambda function
resource "aws_cloudwatch_log_group" "get_things_lambda_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.get_things_lambda.function_name}"
  retention_in_days = 14
}
