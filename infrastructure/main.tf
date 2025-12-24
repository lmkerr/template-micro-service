provider "aws" {
  region = var.region
  assume_role {
    role_arn = var.roles[terraform.workspace]
  }
}

# Provider for us-east-1 (required for ACM certificates used by CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  assume_role {
    role_arn = var.roles[terraform.workspace]
  }
}

terraform {
  backend "s3" {
    bucket         = "carousel-platform-backend"
    key            = "carousel_thing_service/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "CarouselPlatformState"
    encrypt        = true
  }
}
