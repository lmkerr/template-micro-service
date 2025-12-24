# Lambda function
resource "aws_lambda_function" "create_thing_lambda" {
  filename         = "../dist/services/create-thing/create-thing.zip"
  function_name    = "${var.service_name}-create-thing"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "create-thing.handler"
  runtime          = local.node_runtime
  source_code_hash = filebase64sha256("../dist/services/create-thing/create-thing.zip")

  timeout = local.lambda_timeout

  description = "Create Thing Lambda Function"
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
resource "aws_cloudwatch_log_group" "create_thing_lambda_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.create_thing_lambda.function_name}"
  retention_in_days = 14
}
