#!/bin/bash

# =============================================================================
# Microservice Template Setup Script
# =============================================================================
# This script initializes the microservice template with your project settings.
# It will:
#   1. Collect configuration values
#   2. Update Terraform backend configuration
#   3. Update service variables
#   4. Optionally create AWS resources (S3 bucket, DynamoDB table)
#   5. Install dependencies and build the project
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "${GREEN}▸${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local result

    if [ -n "$default" ]; then
        read -r -p "$prompt [$default]: " result
        echo "${result:-$default}"
    else
        read -r -p "$prompt: " result
        echo "$result"
    fi
}

prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    local result

    if [ "$default" = "y" ]; then
        read -r -p "$prompt [Y/n]: " result
        result="${result:-y}"
    else
        read -r -p "$prompt [y/N]: " result
        result="${result:-n}"
    fi

    [[ "$result" =~ ^[Yy] ]]
}

validate_service_name() {
    local name="$1"
    if [[ ! "$name" =~ ^[a-z][a-z0-9-]*$ ]]; then
        print_error "Service name must start with a letter and contain only lowercase letters, numbers, and hyphens"
        return 1
    fi
    return 0
}

validate_aws_region() {
    local region="$1"
    if [[ ! "$region" =~ ^[a-z]{2}-[a-z]+-[0-9]+$ ]]; then
        print_error "Invalid AWS region format (expected: us-east-1, us-west-2, etc.)"
        return 1
    fi
    return 0
}

validate_aws_account_id() {
    local account_id="$1"
    if [[ ! "$account_id" =~ ^[0-9]{12}$ ]]; then
        print_error "AWS Account ID must be a 12-digit number"
        return 1
    fi
    return 0
}

# =============================================================================
# Main Script
# =============================================================================

print_header "Microservice Template Setup"

echo ""
echo "This script will configure your microservice template with your project settings."
echo "You'll need the following information ready:"
echo "  - Service name (e.g., user-service, payment-api)"
echo "  - AWS region"
echo "  - Terraform state bucket name (will be created if needed)"
echo "  - AWS account IDs for each environment"
echo "  - Domain names for each environment (optional)"
echo ""

if ! prompt_yes_no "Ready to continue?" "y"; then
    echo "Setup cancelled."
    exit 0
fi

# =============================================================================
# Collect Basic Configuration
# =============================================================================

print_header "Basic Configuration"

# Service Name
while true; do
    SERVICE_NAME=$(prompt_with_default "Service name (lowercase, hyphens allowed)" "my-service")
    if validate_service_name "$SERVICE_NAME"; then
        break
    fi
done

# AWS Region
while true; do
    AWS_REGION=$(prompt_with_default "AWS region" "us-west-2")
    if validate_aws_region "$AWS_REGION"; then
        break
    fi
done

# =============================================================================
# Terraform Backend Configuration
# =============================================================================

print_header "Terraform Backend Configuration"

echo ""
echo "Terraform requires an S3 bucket for state storage and a DynamoDB table for locking."
echo ""

# State Bucket
STATE_BUCKET=$(prompt_with_default "Terraform state S3 bucket name" "${SERVICE_NAME}-terraform-state")

# Lock Table
LOCK_TABLE=$(prompt_with_default "DynamoDB lock table name" "${SERVICE_NAME}-terraform-lock")

# Check if user wants to create AWS resources
echo ""
CREATE_AWS_RESOURCES=false
if prompt_yes_no "Create S3 bucket and DynamoDB table now?" "n"; then
    CREATE_AWS_RESOURCES=true
    print_warning "Make sure you have AWS credentials configured and appropriate permissions."
fi

# =============================================================================
# Environment Configuration
# =============================================================================

print_header "Environment Configuration"

echo ""
echo "Configure settings for each environment (sandbox, dev, prod)."
echo "Leave blank to skip an environment or use placeholder values."
echo ""

# Sandbox Environment
echo -e "${YELLOW}── Sandbox Environment ──${NC}"
SANDBOX_ACCOUNT_ID=$(prompt_with_default "Sandbox AWS Account ID (12 digits, or press Enter to skip)" "")
SANDBOX_DOMAIN=$(prompt_with_default "Sandbox API domain" "api.sandbox.example.com")
SANDBOX_HOSTED_ZONE=$(prompt_with_default "Sandbox Route 53 Hosted Zone ID" "HOSTED_ZONE_ID")

# Dev Environment
echo ""
echo -e "${YELLOW}── Dev Environment ──${NC}"
DEV_ACCOUNT_ID=$(prompt_with_default "Dev AWS Account ID (12 digits, or press Enter to skip)" "")
DEV_DOMAIN=$(prompt_with_default "Dev API domain" "api.dev.example.com")
DEV_HOSTED_ZONE=$(prompt_with_default "Dev Route 53 Hosted Zone ID" "HOSTED_ZONE_ID")

# Prod Environment
echo ""
echo -e "${YELLOW}── Prod Environment ──${NC}"
PROD_ACCOUNT_ID=$(prompt_with_default "Prod AWS Account ID (12 digits, or press Enter to skip)" "")
PROD_DOMAIN=$(prompt_with_default "Prod API domain" "api.example.com")
PROD_HOSTED_ZONE=$(prompt_with_default "Prod Route 53 Hosted Zone ID" "HOSTED_ZONE_ID")

# Build role ARN strings
SANDBOX_ROLE="arn:aws:iam::${SANDBOX_ACCOUNT_ID:-ACCOUNT_ID}:role/cicd"
DEV_ROLE="arn:aws:iam::${DEV_ACCOUNT_ID:-ACCOUNT_ID}:role/cicd"
PROD_ROLE="arn:aws:iam::${PROD_ACCOUNT_ID:-ACCOUNT_ID}:role/cicd"

# =============================================================================
# Confirmation
# =============================================================================

print_header "Configuration Summary"

echo ""
echo "Service Configuration:"
echo "  Service Name:     $SERVICE_NAME"
echo "  AWS Region:       $AWS_REGION"
echo ""
echo "Terraform Backend:"
echo "  State Bucket:     $STATE_BUCKET"
echo "  Lock Table:       $LOCK_TABLE"
echo "  Create Resources: $CREATE_AWS_RESOURCES"
echo ""
echo "Environment Settings:"
echo "  Sandbox:"
echo "    Account ID:     ${SANDBOX_ACCOUNT_ID:-<not set>}"
echo "    Domain:         $SANDBOX_DOMAIN"
echo "    Hosted Zone:    $SANDBOX_HOSTED_ZONE"
echo "  Dev:"
echo "    Account ID:     ${DEV_ACCOUNT_ID:-<not set>}"
echo "    Domain:         $DEV_DOMAIN"
echo "    Hosted Zone:    $DEV_HOSTED_ZONE"
echo "  Prod:"
echo "    Account ID:     ${PROD_ACCOUNT_ID:-<not set>}"
echo "    Domain:         $PROD_DOMAIN"
echo "    Hosted Zone:    $PROD_HOSTED_ZONE"
echo ""

if ! prompt_yes_no "Apply these settings?" "y"; then
    echo "Setup cancelled."
    exit 0
fi

# =============================================================================
# Apply Configuration
# =============================================================================

print_header "Applying Configuration"

# Update main.tf - Terraform backend
print_step "Updating Terraform backend configuration..."

MAIN_TF="$PROJECT_ROOT/infrastructure/main.tf"

# Use sed to update the backend configuration
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed requires empty string after -i
    sed -i '' "s|bucket         = \"your-terraform-state-bucket\"|bucket         = \"$STATE_BUCKET\"|g" "$MAIN_TF"
    sed -i '' "s|key            = \"my-service/terraform.tfstate\"|key            = \"$SERVICE_NAME/terraform.tfstate\"|g" "$MAIN_TF"
    sed -i '' "s|region         = \"us-west-2\"|region         = \"$AWS_REGION\"|g" "$MAIN_TF"
    sed -i '' "s|dynamodb_table = \"your-terraform-lock-table\"|dynamodb_table = \"$LOCK_TABLE\"|g" "$MAIN_TF"
else
    # Linux sed
    sed -i "s|bucket         = \"your-terraform-state-bucket\"|bucket         = \"$STATE_BUCKET\"|g" "$MAIN_TF"
    sed -i "s|key            = \"my-service/terraform.tfstate\"|key            = \"$SERVICE_NAME/terraform.tfstate\"|g" "$MAIN_TF"
    sed -i "s|region         = \"us-west-2\"|region         = \"$AWS_REGION\"|g" "$MAIN_TF"
    sed -i "s|dynamodb_table = \"your-terraform-lock-table\"|dynamodb_table = \"$LOCK_TABLE\"|g" "$MAIN_TF"
fi

print_success "Updated main.tf"

# Update variables.tf
print_step "Updating Terraform variables..."

VARIABLES_TF="$PROJECT_ROOT/infrastructure/variables.tf"

# Create the new variables.tf content
cat > "$VARIABLES_TF" << EOF
variable "service_name" {
  description = "Name of the service (used for resource naming)"
  type        = string
  default     = "$SERVICE_NAME"
}

variable "region" {
  description = "AWS Region"
  type        = string
  default     = "$AWS_REGION"
}

variable "domain_base" {
  description = "Base domain name for the API Gateway per environment"
  type        = map(string)
  default = {
    sandbox = "$SANDBOX_DOMAIN"
    dev     = "$DEV_DOMAIN"
    prod    = "$PROD_DOMAIN"
  }
}

variable "roles" {
  description = "Role ARNs for Terraform to assume to deploy to different AWS accounts"
  type        = map(any)
  default = {
    sandbox = "$SANDBOX_ROLE"
    dev     = "$DEV_ROLE"
    prod    = "$PROD_ROLE"
  }
}

variable "hosted_zone_id" {
  description = "Route 53 Hosted Zone ID per environment"
  sensitive   = true
  type        = map(string)
  default = {
    sandbox = "$SANDBOX_HOSTED_ZONE"
    dev     = "$DEV_HOSTED_ZONE"
    prod    = "$PROD_HOSTED_ZONE"
  }
}
EOF

print_success "Updated variables.tf"

# Update package.json name
print_step "Updating package.json..."

PACKAGE_JSON="$PROJECT_ROOT/package.json"

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|\"name\": \"microservice-template\"|\"name\": \"$SERVICE_NAME\"|g" "$PACKAGE_JSON"
else
    sed -i "s|\"name\": \"microservice-template\"|\"name\": \"$SERVICE_NAME\"|g" "$PACKAGE_JSON"
fi

print_success "Updated package.json"

# =============================================================================
# Create AWS Resources (if requested)
# =============================================================================

if [ "$CREATE_AWS_RESOURCES" = true ]; then
    print_header "Creating AWS Resources"

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it and run the following commands manually:"
        echo ""
        echo "  # Create S3 bucket"
        if [ "$AWS_REGION" = "us-east-1" ]; then
            echo "  aws s3api create-bucket --bucket $STATE_BUCKET --region $AWS_REGION"
        else
            echo "  aws s3api create-bucket --bucket $STATE_BUCKET --region $AWS_REGION \\"
            echo "    --create-bucket-configuration LocationConstraint=$AWS_REGION"
        fi
        echo "  aws s3api put-bucket-versioning --bucket $STATE_BUCKET \\"
        echo "    --versioning-configuration Status=Enabled"
        echo ""
        echo "  # Create DynamoDB table"
        echo "  aws dynamodb create-table --table-name $LOCK_TABLE \\"
        echo "    --attribute-definitions AttributeName=LockID,AttributeType=S \\"
        echo "    --key-schema AttributeName=LockID,KeyType=HASH \\"
        echo "    --billing-mode PAY_PER_REQUEST \\"
        echo "    --region $AWS_REGION"
        echo ""
    else
        # Create S3 bucket
        print_step "Creating S3 bucket: $STATE_BUCKET..."

        if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
            print_warning "Bucket $STATE_BUCKET already exists, skipping creation"
        else
            if [ "$AWS_REGION" = "us-east-1" ]; then
                aws s3api create-bucket --bucket "$STATE_BUCKET" --region "$AWS_REGION"
            else
                aws s3api create-bucket --bucket "$STATE_BUCKET" --region "$AWS_REGION" \
                    --create-bucket-configuration LocationConstraint="$AWS_REGION"
            fi
            print_success "Created S3 bucket"
        fi

        # Enable versioning
        print_step "Enabling bucket versioning..."
        aws s3api put-bucket-versioning --bucket "$STATE_BUCKET" \
            --versioning-configuration Status=Enabled
        print_success "Enabled versioning"

        # Create DynamoDB table
        print_step "Creating DynamoDB table: $LOCK_TABLE..."

        if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$AWS_REGION" 2>/dev/null; then
            print_warning "Table $LOCK_TABLE already exists, skipping creation"
        else
            aws dynamodb create-table --table-name "$LOCK_TABLE" \
                --attribute-definitions AttributeName=LockID,AttributeType=S \
                --key-schema AttributeName=LockID,KeyType=HASH \
                --billing-mode PAY_PER_REQUEST \
                --region "$AWS_REGION"
            print_success "Created DynamoDB table"
        fi
    fi
fi

# =============================================================================
# Install Dependencies and Build
# =============================================================================

print_header "Installing Dependencies"

cd "$PROJECT_ROOT"

# Check if pnpm is available
if command -v pnpm &> /dev/null; then
    print_step "Running pnpm install..."
    pnpm install
    print_success "Dependencies installed"

    print_step "Building project..."
    pnpm run package
    print_success "Project built successfully"
else
    print_warning "pnpm is not installed. Please run the following commands manually:"
    echo "  pnpm install"
    echo "  pnpm run package"
fi

# =============================================================================
# Initialize Terraform
# =============================================================================

print_header "Terraform Initialization"

if command -v terraform &> /dev/null; then
    print_step "Initializing Terraform..."
    cd "$PROJECT_ROOT/infrastructure"

    if terraform init; then
        print_success "Terraform initialized successfully"

        # List available workspaces or create them
        print_step "Available Terraform workspaces:"
        terraform workspace list

        echo ""
        echo "To select a workspace, run:"
        echo "  cd infrastructure"
        echo "  terraform workspace select dev  # or: sandbox, prod"
        echo "  terraform plan"
    else
        print_error "Terraform init failed. Please check your AWS credentials and try again."
    fi
else
    print_warning "Terraform is not installed. After installing, run:"
    echo "  cd infrastructure"
    echo "  terraform init"
    echo "  terraform workspace select dev"
fi

# =============================================================================
# Complete
# =============================================================================

print_header "Setup Complete!"

echo ""
echo "Your microservice template has been configured with the following settings:"
echo ""
echo "  Service Name: $SERVICE_NAME"
echo "  AWS Region:   $AWS_REGION"
echo "  State Bucket: $STATE_BUCKET"
echo ""
echo "Next steps:"
echo "  1. Review the updated files in infrastructure/"
echo "  2. Update any remaining placeholder values if needed"
echo "  3. Configure GitHub Actions secrets:"
echo "     - AWS_REGION"
echo "     - CICD_ASSUMED_ROLE_ARN"
echo "  4. Deploy to an environment:"
echo "     cd infrastructure"
echo "     terraform workspace select dev"
echo "     terraform plan"
echo "     terraform apply"
echo ""
print_success "Happy coding!"
