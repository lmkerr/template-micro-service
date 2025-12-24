module "api_gateway" {
  # Replace with your API Gateway module source
  # Example: "terraform-aws-modules/apigateway-v2/aws" or your own module
  source  = "terraform-aws-modules/apigateway-v2/aws"
  version = "~> 2.0"

  name          = "${var.service_name}-api"
  description   = "API Gateway for ${var.service_name}"
  protocol_type = "HTTP"

  cors_configuration = {
    allow_headers = ["content-type", "authorization"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = ["*"]
  }

  # Custom Domain Configuration
  domain_name                 = var.domain_base[terraform.workspace]
  domain_name_certificate_arn = aws_acm_certificate.api.arn

  # Route Configuration - integrations with Lambda functions
  integrations = {
    for route, lambda in local.routes : route => {
      lambda_arn             = lambda.arn
      payload_format_version = "2.0"
    }
  }

  tags = {
    Service     = var.service_name
    Environment = terraform.workspace
  }
}

# ACM Certificate for custom domain
resource "aws_acm_certificate" "api" {
  domain_name       = var.domain_base[terraform.workspace]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Route 53 record for API Gateway custom domain
resource "aws_route53_record" "api" {
  zone_id = var.hosted_zone_id[terraform.workspace]
  name    = var.domain_base[terraform.workspace]
  type    = "A"

  alias {
    name                   = module.api_gateway.apigatewayv2_domain_name_target_domain_name
    zone_id                = module.api_gateway.apigatewayv2_domain_name_hosted_zone_id
    evaluate_target_health = false
  }
}
