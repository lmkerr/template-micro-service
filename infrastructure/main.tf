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
  # IMPORTANT: Before using this template, you must:
  #
  # 1. Create an S3 bucket for Terraform state:
  #    aws s3api create-bucket --bucket your-terraform-state-bucket --region us-west-2 \
  #      --create-bucket-configuration LocationConstraint=us-west-2
  #    aws s3api put-bucket-versioning --bucket your-terraform-state-bucket \
  #      --versioning-configuration Status=Enabled
  #
  # 2. Create a DynamoDB table for state locking:
  #    aws dynamodb create-table --table-name your-terraform-lock-table \
  #      --attribute-definitions AttributeName=LockID,AttributeType=S \
  #      --key-schema AttributeName=LockID,KeyType=HASH \
  #      --billing-mode PAY_PER_REQUEST \
  #      --region us-west-2
  #
  # 3. Update the values below with your bucket name, state key, and table name
  #
  backend "s3" {
    bucket         = "your-terraform-state-bucket"  # Your S3 bucket name
    key            = "my-service/terraform.tfstate" # Unique path for this service's state
    region         = "us-west-2"
    dynamodb_table = "your-terraform-lock-table"    # Your DynamoDB table name
    encrypt        = true
  }
}
