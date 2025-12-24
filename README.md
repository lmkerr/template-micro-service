# Microservice Template

A template for building serverless microservices using AWS Lambda, API Gateway, and PostgreSQL (Aurora Serverless).

## Architecture

- **AWS Lambda** - Serverless compute for CRUD operations
- **API Gateway (HTTP API)** - RESTful API endpoints
- **Aurora Serverless PostgreSQL** - Database via RDS Data API
- **Route 53** - Creates a subdomain on your hosted zone (e.g., `api.example.com`)

## Project Structure

```text
src/
├── services/           # Lambda handlers
│   ├── create-thing/
│   ├── get-thing/
│   ├── update-thing/
│   └── delete-thing/
├── middleware/         # Middy middleware (logging, error handling)
├── models/             # TypeScript interfaces
├── types/              # Shared types (API responses, DB types)
└── utils/              # Utility functions

infrastructure/         # Terraform configuration
scripts/                # Build and packaging scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- AWS CLI configured
- Terraform

### Installation

```bash
pnpm install
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
terraform init
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

| Variable | Description |
|----------|-------------|
| DB_CLUSTER_ARN | Aurora cluster ARN |
| DB_SECRET_ARN | Secrets Manager ARN for DB credentials |
| DB_NAME | Database name |

## Customization

1. Rename "thing" to your entity name throughout the codebase
2. Update the `Thing` interface in `src/models/interfaces/thing.type.ts`
3. Modify the SQL queries in each handler to match your schema
4. Update Terraform variables for your domain and environment
