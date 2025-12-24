variable "service_name" {
  description = "Name of the service (used for resource naming)"
  type        = string
  default     = "my-service"
}

variable "region" {
  description = "AWS Region"
  type        = string
  default     = "us-west-2"
}

variable "domain_base" {
  description = "Base domain name for the API Gateway per environment"
  type        = map(string)
  default = {
    sandbox = "api.sandbox.example.com"
    dev     = "api.dev.example.com"
    prod    = "api.example.com"
  }
}

variable "roles" {
  description = "Role ARNs for Terraform to assume to deploy to different AWS accounts"
  type        = map(any)
  default = {
    sandbox = "arn:aws:iam::ACCOUNT_ID:role/cicd"
    dev     = "arn:aws:iam::ACCOUNT_ID:role/cicd"
    prod    = "arn:aws:iam::ACCOUNT_ID:role/cicd"
  }
}

variable "hosted_zone_id" {
  description = "Route 53 Hosted Zone ID per environment"
  sensitive   = true
  type        = map(string)
  default = {
    sandbox = "HOSTED_ZONE_ID"
    dev     = "HOSTED_ZONE_ID"
    prod    = "HOSTED_ZONE_ID"
  }
}
