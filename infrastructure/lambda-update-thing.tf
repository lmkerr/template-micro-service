# Lambda function
resource "aws_lambda_function" "update_thing_lambda" {
  filename         = "../dist/services/update-thing/update-thing.zip"
  function_name    = "${var.service_name}-update-thing"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "update-thing.handler"
  runtime          = local.node_runtime
  source_code_hash = filebase64sha256("../dist/services/update-thing/update-thing.zip")

  timeout = local.lambda_timeout

  description = "Update Thing Lambda Function"
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
resource "aws_cloudwatch_log_group" "update_thing_lambda_log_group" {
  name              = "/aws/lambda/${aws_lambda_function.update_thing_lambda.function_name}"
  retention_in_days = 14
}
