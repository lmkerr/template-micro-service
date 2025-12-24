module "organization_api_gateway" {
  source  = "CarouselGG/api-gateway-module/aws"
  version = "0.4.5"

  api_name              = "carousel-organization-api"
  api_description       = "API Gateway for Carousel Organization Service"
  api_stage_name        = "v1"
  api_stage_description = "Stage for Carousel Organization Service"

  aws_region = var.region

  # Logging Configuration
  log_retention_in_days = 14
  log_role_name         = "api_gateway_organization_cloudwatch_role"

  # Observability
  enable_dashboards      = true
  enable_lambda_insights = true
  enable_alarms          = true
  create_sns_topic       = true

  # Route Configuration
  routes = local.routes

  # Custom Domain Configuration
  custom_domain_name = var.domain_base[terraform.workspace]
  hosted_zone_id     = var.hosted_zone_id[terraform.workspace]
}
