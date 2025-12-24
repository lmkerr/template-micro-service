import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from '@aws-sdk/client-rds-data';
import { ApiResponse } from '../../types/api/api-response.type';

const rdsClient = new RDSDataClient({});

interface DeleteThingResponse {
  id: string;
  deleted: true;
}

const deleteThingHandler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const { thingId } = event.pathParameters || {};

  if (!thingId) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_ID',
        message: 'Thing ID is required',
      },
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(thingId)) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid thing ID format',
      },
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }

  const dbClusterArn = process.env.DB_CLUSTER_ARN!;
  const dbSecretArn = process.env.DB_SECRET_ARN!;
  const dbName = process.env.DB_NAME!;

  try {
    // Check if thing exists before deleting
    const checkCommand = new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: 'SELECT id FROM things WHERE id = :id::uuid',
      parameters: [{ name: 'id', value: { stringValue: thingId } }],
    });

    const checkResult = await rdsClient.send(checkCommand);

    if (!checkResult.records || checkResult.records.length === 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Thing not found',
        },
      };
      return {
        statusCode: 404,
        body: JSON.stringify(response),
      };
    }

    // Delete the thing
    const deleteCommand = new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: 'DELETE FROM things WHERE id = :id::uuid',
      parameters: [{ name: 'id', value: { stringValue: thingId } }],
    });

    await rdsClient.send(deleteCommand);

    const response: ApiResponse<DeleteThingResponse> = {
      success: true,
      data: {
        id: thingId,
        deleted: true,
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error deleting thing:', error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    };

    return {
      statusCode: 500,
      body: JSON.stringify(response),
    };
  }
};

export { deleteThingHandler };
