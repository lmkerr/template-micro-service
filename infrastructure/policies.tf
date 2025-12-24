resource "aws_iam_role" "lambda_organization_execution_role" {
  name = "carousel-org-lambda-execution-${terraform.workspace}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Data API permissions for PostgreSQL
resource "aws_iam_role_policy" "lambda_data_api_policy" {
  name = "carousel-lambda-data-api-policy"
  role = aws_iam_role.lambda_organization_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-data:BatchExecuteStatement",
          "rds-data:BeginTransaction",
          "rds-data:CommitTransaction",
          "rds-data:ExecuteStatement",
          "rds-data:RollbackTransaction"
        ]
        Resource = data.aws_ssm_parameter.aurora_cluster_arn.value
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = data.aws_ssm_parameter.data_api_secret_arn.value
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          data.aws_ssm_parameter.aurora_cluster_arn.arn,
          data.aws_ssm_parameter.data_api_secret_arn.arn,
          data.aws_ssm_parameter.database_name.arn
        ]
      }
    ]
  })
}

# CloudWatch logs policy
resource "aws_iam_policy" "cloudwatch_logs_policy" {
  name = "cloudwatch_organization_logs_policy_${terraform.workspace}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch_logs_policy_attachment" {
  role       = aws_iam_role.lambda_organization_execution_role.name
  policy_arn = aws_iam_policy.cloudwatch_logs_policy.arn
}

# S3 permissions for uploading organization assets (logos)
resource "aws_iam_role_policy" "lambda_s3_policy" {
  name = "carousel-lambda-s3-policy-${terraform.workspace}"
  role = aws_iam_role.lambda_organization_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.organization_assets.arn}/*"
      }
    ]
  })
}
