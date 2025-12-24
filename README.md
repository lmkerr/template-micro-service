# Microservice Template

A template for building serverless microservices using AWS Lambda, API Gateway, and PostgreSQL (Aurora Serverless).

## Architecture

- **AWS Lambda** - Serverless compute for CRUD operations
- **API Gateway (HTTP API)** - RESTful API endpoints
- **Aurora Serverless PostgreSQL** - Database via RDS Data API
- **Route 53** - Creates a subdomain on your hosted zone (e.g., `api.example.com`)

## Project Structure

<!-- FOLDER_STRUCTURE_START -->
```text
├── .claude/
│   └── settings.local.json
├── .github/
│   └── workflows/
│       ├── develop.yml
│       ├── feature.yml
│       └── prod.yml
├── .vscode/
│   └── settings.json
├── infrastructure/
│   ├── .tflint.hcl
│   ├── apigateway.tf
│   ├── data.tf
│   ├── lambda-create-thing.tf
│   ├── lambda-delete-thing.tf
│   ├── lambda-get-thing.tf
│   ├── lambda-update-thing.tf
│   ├── locals.tf
│   ├── main.tf
│   ├── policies.tf
│   ├── routes.tf
│   └── variables.tf
├── scripts/
│   ├── esbuild.config.js
│   ├── scaffold-lambda.sh
│   ├── setup.sh
│   ├── update-readme-structure.mjs
│   └── zip.config.js
├── src/
│   ├── __mocks__/
│   │   └── @middy/
│   │       ├── core.ts
│   │       └── http-header-normalizer.ts
│   ├── middleware/
│   │   └── middy/
│   │       ├── middy.middleware.test.ts
│   │       └── middy.middleware.ts
│   ├── models/
│   │   └── interfaces/
│   │       ├── db/
│   │       │   ├── audit-db.type.ts
│   │       │   └── thing-db.type.ts
│   │       └── thing.type.ts
│   ├── services/
│   │   ├── create-thing/
│   │   │   ├── create-thing.handler.test.ts
│   │   │   ├── create-thing.handler.ts
│   │   │   ├── create-thing.test.ts
│   │   │   └── create-thing.ts
│   │   ├── delete-thing/
│   │   │   ├── delete-thing.handler.test.ts
│   │   │   ├── delete-thing.handler.ts
│   │   │   ├── delete-thing.test.ts
│   │   │   └── delete-thing.ts
│   │   ├── get-thing/
│   │   │   ├── get-thing.handler.test.ts
│   │   │   ├── get-thing.handler.ts
│   │   │   ├── get-thing.test.ts
│   │   │   └── get-thing.ts
│   │   └── update-thing/
│   │       ├── update-thing.handler.test.ts
│   │       ├── update-thing.handler.ts
│   │       ├── update-thing.test.ts
│   │       └── update-thing.ts
│   ├── types/
│   │   └── api/
│   │       └── api-response.type.ts
│   └── utils/
│       ├── error-handler/
│       │   ├── error-handler.util.test.ts
│       │   └── error-handler.util.ts
│       ├── request-logger/
│       │   ├── request-logger.util.test.ts
│       │   └── request-logger.util.ts
│       └── response-logger/
│           ├── response-logger.util.test.ts
│           └── response-logger.util.ts
├── .eslintignore
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── jest.config.js
├── LICENSE
├── package.json
├── README.md
└── tsconfig.json
```
<!-- FOLDER_STRUCTURE_END -->

## Getting Started

### Prerequisites

- Node.js 22+ (LTS)
- pnpm
- AWS CLI configured
- Terraform

### Quick Start (Recommended)

Run the interactive setup script to configure everything at once:

```bash
pnpm setup
# or
./scripts/setup.sh
```

The setup script will:

1. Prompt for your service name and AWS region
2. Configure Terraform backend (S3 bucket and DynamoDB table names)
3. Set up environment-specific values (account IDs, domains, hosted zones)
4. Optionally create the S3 bucket and DynamoDB table for Terraform state
5. Install dependencies and build the project
6. Initialize Terraform

### Manual Installation

If you prefer to configure manually:

```bash
# Install dependencies
pnpm install

# Update infrastructure/main.tf with your Terraform backend settings
# Update infrastructure/variables.tf with your service configuration

# Initialize and deploy
cd infrastructure
terraform init
terraform workspace select dev
terraform apply
```

### Development

```bash
# Type check
pnpm tsc

# Lint
pnpm lint

# Run tests
pnpm test
```

### Build & Deploy

```bash
# Package lambdas (type check + build + zip)
pnpm package

# Deploy infrastructure
cd infrastructure
terraform workspace select dev  # or: sandbox, prod
terraform plan
terraform apply
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /things | Create a new thing |
| GET | /things | List all things |
| GET | /things/:id | Get a thing by ID |
| PUT | /things/:id | Update a thing |
| DELETE | /things/:id | Delete a thing |

## Response Format

All endpoints return a consistent response format:

**Success:**

```json
{
  "success": true,
  "data": {}
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Environment Variables

These are set automatically by Terraform from SSM parameters:

| Variable | Description |
|----------|-------------|
| DB_CLUSTER_ARN | Aurora cluster ARN |
| DB_SECRET_ARN | Secrets Manager ARN for DB credentials |
| DB_NAME | Database name |

## GitHub Configuration

### Secrets

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

| Secret                | Description                          |
|-----------------------|--------------------------------------|
| AWS_REGION            | AWS region (e.g., `us-east-1`)       |
| CICD_ASSUMED_ROLE_ARN | IAM role ARN for OIDC authentication |

### Environments

Create these environments in your GitHub repository (Settings → Environments):

| Environment | Branch | Description |
|-------------|--------|-------------|
| dev | `develop`, `feature/*` | Development environment |
| prod | `main` | Production environment |

Each environment should have the secrets configured above. You can also add environment-specific protection rules (e.g., required reviewers for prod).

## Customization

### Initial Setup

1. **Set up Terraform state backend** - Terraform stores infrastructure state remotely in S3, enabling team collaboration and state locking. This follows a **hub-and-spoke pattern**: one central S3 bucket and DynamoDB table can serve multiple microservices, with each service using a unique state key path.

   ```bash
   # Create S3 bucket for state (one-time setup, shared across all services)
   aws s3api create-bucket --bucket your-terraform-state-bucket --region us-west-2 \
     --create-bucket-configuration LocationConstraint=us-west-2
   aws s3api put-bucket-versioning --bucket your-terraform-state-bucket \
     --versioning-configuration Status=Enabled

   # Create DynamoDB table for state locking (one-time setup, shared across all services)
   aws dynamodb create-table --table-name your-terraform-lock-table \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-west-2
   ```

2. **Update `infrastructure/main.tf`** with your bucket name and a unique state key for this service (e.g., `my-service/terraform.tfstate`)

3. **Set up Aurora Serverless database** and create SSM parameters:

   ```bash
   # After creating your Aurora Serverless cluster, store the connection info in SSM
   aws ssm put-parameter --name "/database/dev/cluster-arn" \
     --value "arn:aws:rds:us-west-2:ACCOUNT:cluster:your-cluster" --type String
   aws ssm put-parameter --name "/database/dev/secret-arn" \
     --value "arn:aws:secretsmanager:us-west-2:ACCOUNT:secret:your-secret" --type String
   aws ssm put-parameter --name "/database/dev/database-name" \
     --value "your_database_name" --type String
   ```

4. **Update `infrastructure/variables.tf`** with your:
   - `service_name` - Name for your service
   - `domain_base` - Your API domain per environment
   - `roles` - IAM role ARNs for CI/CD
   - `hosted_zone_id` - Route 53 hosted zone IDs

### Code Customization

1. Rename "thing" to your entity name throughout the codebase
2. Update the `Thing` interface in `src/models/interfaces/thing.type.ts`
3. Modify the SQL queries in each handler to match your schema
4. Use `./scripts/scaffold-lambda.sh` to add new Lambda functions
