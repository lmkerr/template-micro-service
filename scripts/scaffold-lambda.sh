#!/bin/bash

# Microservice Template - Lambda Scaffolding Script
# This script scaffolds a new Lambda function with all necessary files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Lambda Scaffolder                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Determine project root
# If run from within a project, use current directory structure
# Otherwise, use the script's location
if [[ -d "./src/services" && -d "./infrastructure" ]]; then
  # Running from project root
  PROJECT_ROOT="$(pwd)"
elif [[ -d "../src/services" && -d "../infrastructure" ]]; then
  # Running from scripts directory
  PROJECT_ROOT="$(cd .. && pwd)"
else
  # Fall back to script location
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
fi

# Validate project structure
if [[ ! -d "$PROJECT_ROOT/src/services" ]] || [[ ! -d "$PROJECT_ROOT/infrastructure" ]]; then
  echo -e "${RED}Error: Could not find valid project structure${NC}"
  echo -e "${YELLOW}This script must be run from a project with:${NC}"
  echo -e "  - src/services/ directory"
  echo -e "  - infrastructure/ directory"
  echo ""
  echo -e "${YELLOW}Current PROJECT_ROOT: $PROJECT_ROOT${NC}"
  exit 1
fi

echo -e "${GREEN}Project: $(basename "$PROJECT_ROOT")${NC}"
echo ""

# Prompt for lambda name
echo -e "${YELLOW}Enter the lambda name (kebab-case, e.g., 'get-users', 'create-item'):${NC}"
read -r LAMBDA_NAME

# Validate input
if [[ -z "$LAMBDA_NAME" ]]; then
  echo -e "${RED}Error: Lambda name cannot be empty${NC}"
  exit 1
fi

# Check if lambda name is in kebab-case
if [[ ! "$LAMBDA_NAME" =~ ^[a-z]+(-[a-z]+)*$ ]]; then
  echo -e "${RED}Error: Lambda name must be in kebab-case (lowercase letters and hyphens only)${NC}"
  exit 1
fi

# Check if lambda already exists
if [[ -d "$PROJECT_ROOT/src/services/$LAMBDA_NAME" ]]; then
  echo -e "${RED}Error: Lambda '$LAMBDA_NAME' already exists${NC}"
  exit 1
fi

# Convert kebab-case to other formats
# get-things -> getThings (camelCase)
CAMEL_CASE=$(echo "$LAMBDA_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g' | sed 's/^./\L&/')
# get-things -> GetThings (PascalCase)
PASCAL_CASE=$(echo "$LAMBDA_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')
# get-things -> Get Things (Title Case with spaces)
TITLE_CASE=$(echo "$LAMBDA_NAME" | sed 's/-/ /g' | sed 's/\b\w/\u&/g')
# get-things -> get_things (snake_case for Terraform)
SNAKE_CASE=$(echo "$LAMBDA_NAME" | tr '-' '_')

echo ""
echo -e "${BLUE}Creating lambda with the following naming:${NC}"
echo -e "  Kebab-case:   ${GREEN}$LAMBDA_NAME${NC}"
echo -e "  camelCase:    ${GREEN}$CAMEL_CASE${NC}"
echo -e "  PascalCase:   ${GREEN}$PASCAL_CASE${NC}"
echo -e "  Title Case:   ${GREEN}$TITLE_CASE${NC}"
echo -e "  snake_case:   ${GREEN}$SNAKE_CASE${NC}"
echo ""

# Prompt for API Gateway route
echo -e "${YELLOW}Add API Gateway route? (y/n):${NC}"
read -r ADD_ROUTE

ROUTE_METHOD=""
ROUTE_PATH=""
ROUTE_COMMENT=""

if [[ "$ADD_ROUTE" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}Enter HTTP method (GET, POST, PUT, PATCH, DELETE):${NC}"
  read -r ROUTE_METHOD

  # Validate HTTP method
  if [[ ! "$ROUTE_METHOD" =~ ^(GET|POST|PUT|PATCH|DELETE)$ ]]; then
    echo -e "${RED}Error: Invalid HTTP method. Must be GET, POST, PUT, PATCH, or DELETE${NC}"
    exit 1
  fi

  echo -e "${YELLOW}Enter route path (e.g., '/things', '/things/{id}'):${NC}"
  read -r ROUTE_PATH

  # Validate route path starts with /
  if [[ ! "$ROUTE_PATH" =~ ^/ ]]; then
    echo -e "${RED}Error: Route path must start with '/'${NC}"
    exit 1
  fi

  # Check for route conflicts in routes.tf
  ROUTES_FILE="$PROJECT_ROOT/infrastructure/routes.tf"
  FULL_ROUTE="$ROUTE_METHOD $ROUTE_PATH"

  # Check for exact duplicate route
  if grep -q "\"$FULL_ROUTE\"" "$ROUTES_FILE"; then
    echo -e "${RED}Error: Route '$FULL_ROUTE' already exists in routes.tf${NC}"
    echo -e "${YELLOW}Existing route:${NC}"
    grep "\"$FULL_ROUTE\"" "$ROUTES_FILE"
    exit 1
  fi

  # Check for potential path hijacking (same method, similar path)
  # Extract all routes with the same HTTP method
  SIMILAR_ROUTES=$(grep "\"$ROUTE_METHOD " "$ROUTES_FILE" || true)

  if [[ -n "$SIMILAR_ROUTES" ]]; then
    # Normalize the route path for comparison (remove parameter names but keep structure)
    NORMALIZED_NEW_PATH=$(echo "$ROUTE_PATH" | sed 's/{[^}]*}/{param}/g')

    # Check each existing route for conflicts
    while IFS= read -r line; do
      EXISTING_ROUTE=$(echo "$line" | grep -o "\"$ROUTE_METHOD [^\"]*\"" | sed 's/"//g' | cut -d' ' -f2-)
      NORMALIZED_EXISTING=$(echo "$EXISTING_ROUTE" | sed 's/{[^}]*}/{param}/g')

      # If normalized paths match, there's a potential conflict
      if [[ "$NORMALIZED_NEW_PATH" == "$NORMALIZED_EXISTING" && "$ROUTE_PATH" != "$EXISTING_ROUTE" ]]; then
        echo -e "${YELLOW}⚠ Warning: Potential route conflict detected!${NC}"
        echo -e "  New route:      ${GREEN}$ROUTE_METHOD $ROUTE_PATH${NC}"
        echo -e "  Existing route: ${BLUE}$ROUTE_METHOD $EXISTING_ROUTE${NC}"
        echo -e ""
        echo -e "${YELLOW}These routes have the same structure and may conflict at runtime.${NC}"
        echo -e "${YELLOW}Do you want to proceed anyway? (y/n):${NC}"
        read -r CONFLICT_CONFIRM
        if [[ ! "$CONFLICT_CONFIRM" =~ ^[Yy]$ ]]; then
          echo -e "${RED}Aborted${NC}"
          exit 0
        fi
        break
      fi
    done <<< "$SIMILAR_ROUTES"
  fi

  echo -e "${YELLOW}Enter route comment (optional, e.g., 'Get all things'):${NC}"
  read -r ROUTE_COMMENT

  echo ""
  echo -e "${BLUE}API Gateway route:${NC}"
  echo -e "  ${GREEN}$ROUTE_METHOD $ROUTE_PATH${NC}"
  if [[ -n "$ROUTE_COMMENT" ]]; then
    echo -e "  Comment: ${GREEN}$ROUTE_COMMENT${NC}"
  fi
  echo ""
fi

# Prompt for confirmation
echo -e "${YELLOW}Do you want to proceed? (y/n):${NC}"
read -r CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo -e "${RED}Aborted${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}Scaffolding lambda '$LAMBDA_NAME'...${NC}"
echo ""

# Create service directory
echo -e "${GREEN}✓${NC} Creating service directory..."
mkdir -p "$PROJECT_ROOT/src/services/$LAMBDA_NAME"

# Create handler file
echo -e "${GREEN}✓${NC} Creating handler wrapper..."
cat > "$PROJECT_ROOT/src/services/$LAMBDA_NAME/$LAMBDA_NAME.handler.ts" << EOF
import { handlerMiddleware } from '../../middleware/middy/middy.middleware';
import { ${CAMEL_CASE}Handler } from './$LAMBDA_NAME';

const handler = handlerMiddleware(${CAMEL_CASE}Handler);

export { handler };
EOF

# Create main service file
echo -e "${GREEN}✓${NC} Creating service implementation..."
cat > "$PROJECT_ROOT/src/services/$LAMBDA_NAME/$LAMBDA_NAME.ts" << EOF
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from '@aws-sdk/client-rds-data';

const rdsClient = new RDSDataClient({});

const ${CAMEL_CASE}Handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // Extract path parameters
  const { } = event.pathParameters || {};
  // Extract query parameters
  const { } = event.queryStringParameters || {};

  // Get database configuration
  const dbClusterArn = process.env.DB_CLUSTER_ARN!;
  const dbSecretArn = process.env.DB_SECRET_ARN!;
  const dbName = process.env.DB_NAME!;

  try {
    // TODO: Implement your lambda logic here

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          message: '$TITLE_CASE endpoint',
        },
      }),
    };
  } catch (error) {
    console.error('Error in ${CAMEL_CASE}Handler:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
    };
  }
};

export { ${CAMEL_CASE}Handler };
EOF

# Create handler test file
echo -e "${GREEN}✓${NC} Creating handler test..."
cat > "$PROJECT_ROOT/src/services/$LAMBDA_NAME/$LAMBDA_NAME.handler.test.ts" << EOF
import { handler } from './$LAMBDA_NAME.handler';

jest.mock('../../middleware/middy/middy.middleware', () => ({
  handlerMiddleware: jest.fn((fn) => fn),
}));

jest.mock('./$LAMBDA_NAME', () => ({
  ${CAMEL_CASE}Handler: jest.fn(),
}));

describe('$LAMBDA_NAME.handler', () => {
  it('should export a handler wrapped with middleware', () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
EOF

# Create service test file
echo -e "${GREEN}✓${NC} Creating service test..."
cat > "$PROJECT_ROOT/src/services/$LAMBDA_NAME/$LAMBDA_NAME.test.ts" << EOF
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-rds-data', () => ({
  RDSDataClient: jest.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => mockSend(...args),
  })),
  ExecuteStatementCommand: jest.fn().mockImplementation((params) => params),
}));

import { ${CAMEL_CASE}Handler } from './$LAMBDA_NAME';

const handler = ${CAMEL_CASE}Handler as (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyStructuredResultV2>;

describe('${CAMEL_CASE}Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DB_CLUSTER_ARN: 'arn:aws:rds:cluster',
      DB_SECRET_ARN: 'arn:aws:secretsmanager:secret',
      DB_NAME: 'testdb',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createMockEvent = (): Partial<APIGatewayProxyEventV2> => ({
    pathParameters: {},
    queryStringParameters: {},
    headers: {},
  });

  it('should return 200 with success response', async () => {
    const event = createMockEvent();
    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
  });

  it('should return 500 on error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error('Database error'));

    // TODO: Trigger error condition based on your implementation
    // For now, this test is a placeholder

    consoleSpy.mockRestore();
  });

  // TODO: Add more tests based on your implementation
});
EOF

# Create Terraform configuration
echo -e "${GREEN}✓${NC} Creating Terraform configuration..."
cat > "$PROJECT_ROOT/infrastructure/lambda-$LAMBDA_NAME.tf" << EOF
# Lambda function
resource "aws_lambda_function" "${SNAKE_CASE}_lambda" {
  filename         = "../dist/services/$LAMBDA_NAME/$LAMBDA_NAME.zip"
  function_name    = "\${var.service_name}-$LAMBDA_NAME"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "$LAMBDA_NAME.handler"
  runtime          = local.node_runtime
  source_code_hash = filebase64sha256("../dist/services/$LAMBDA_NAME/$LAMBDA_NAME.zip")

  timeout = local.lambda_timeout

  description = "$TITLE_CASE Lambda Function"
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
resource "aws_cloudwatch_log_group" "${SNAKE_CASE}_lambda_log_group" {
  name              = "/aws/lambda/\${aws_lambda_function.${SNAKE_CASE}_lambda.function_name}"
  retention_in_days = 14
}
EOF

# Add route to routes.tf if requested
if [[ "$ADD_ROUTE" =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}✓${NC} Adding route to API Gateway..."

  ROUTES_FILE="$PROJECT_ROOT/infrastructure/routes.tf"

  # Build the route line
  if [[ -n "$ROUTE_COMMENT" ]]; then
    ROUTE_LINE="    \"$ROUTE_METHOD $ROUTE_PATH\" = aws_lambda_function.${SNAKE_CASE}_lambda // $ROUTE_COMMENT"
  else
    ROUTE_LINE="    \"$ROUTE_METHOD $ROUTE_PATH\" = aws_lambda_function.${SNAKE_CASE}_lambda"
  fi

  # Find the last route entry and add the new route before the closing brace
  # We'll insert it right before the last two lines (closing brace and EOF)

  # Create a backup of routes.tf
  cp "$ROUTES_FILE" "${ROUTES_FILE}.backup"

  # Use awk to insert the new route before the closing brace
  awk -v route="$ROUTE_LINE" '
    /^  }$/ && !done {
      print ""
      print route
      done=1
    }
    { print }
  ' "${ROUTES_FILE}.backup" > "$ROUTES_FILE"

  # Check if the update was successful
  if grep -q "aws_lambda_function.${SNAKE_CASE}_lambda" "$ROUTES_FILE"; then
    echo -e "${GREEN}✓${NC} Route added successfully!"
    rm "${ROUTES_FILE}.backup"
  else
    echo -e "${RED}✗${NC} Failed to add route. Restoring backup..."
    mv "${ROUTES_FILE}.backup" "$ROUTES_FILE"
  fi
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Lambda scaffolded successfully!                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Created files:${NC}"
echo -e "  📁 src/services/$LAMBDA_NAME/"
echo -e "  📄   ├── $LAMBDA_NAME.handler.ts"
echo -e "  📄   ├── $LAMBDA_NAME.handler.test.ts"
echo -e "  📄   ├── $LAMBDA_NAME.ts"
echo -e "  📄   └── $LAMBDA_NAME.test.ts"
echo -e "  📄 infrastructure/lambda-$LAMBDA_NAME.tf"

if [[ "$ADD_ROUTE" =~ ^[Yy]$ ]]; then
  echo -e "  📄 infrastructure/routes.tf (updated)"
fi

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Implement your lambda logic in:"
echo -e "     ${BLUE}src/services/$LAMBDA_NAME/$LAMBDA_NAME.ts${NC}"
echo ""
echo -e "  2. Add tests for your implementation in:"
echo -e "     ${BLUE}src/services/$LAMBDA_NAME/$LAMBDA_NAME.test.ts${NC}"
echo ""

if [[ ! "$ADD_ROUTE" =~ ^[Yy]$ ]]; then
  echo -e "  3. Add the API Gateway route in:"
  echo -e "     ${BLUE}infrastructure/routes.tf${NC}"
  echo -e "     Example:"
  echo -e "     ${GREEN}\"GET /your-route\" = aws_lambda_function.${SNAKE_CASE}_lambda${NC}"
  echo ""
  STEP_NUM=4
else
  STEP_NUM=3
fi

echo -e "  $STEP_NUM. Run tests:"
echo -e "     ${BLUE}pnpm test${NC}"
echo ""

STEP_NUM=$((STEP_NUM + 1))
echo -e "  $STEP_NUM. Build and package:"
echo -e "     ${BLUE}pnpm run package${NC}"
echo ""

STEP_NUM=$((STEP_NUM + 1))
echo -e "  $STEP_NUM. Deploy with Terraform:"
echo -e "     ${BLUE}cd infrastructure && terraform apply${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
