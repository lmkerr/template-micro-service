import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from '@aws-sdk/client-rds-data';
import { Thing } from '../../models/interfaces/thing.type';
import { ApiResponse } from '../../types/api/api-response.type';

const rdsClient = new RDSDataClient({});

const getThingHandler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const { thingId } = event.pathParameters || {};

  const dbClusterArn = process.env.DB_CLUSTER_ARN!;
  const dbSecretArn = process.env.DB_SECRET_ARN!;
  const dbName = process.env.DB_NAME!;

  // If thingId is provided, get a single thing; otherwise get all things
  if (thingId) {
    return getThingById(dbClusterArn, dbSecretArn, dbName, thingId);
  }

  return getAllThings(dbClusterArn, dbSecretArn, dbName);
};

async function getThingById(
  dbClusterArn: string,
  dbSecretArn: string,
  dbName: string,
  thingId: string,
): Promise<APIGatewayProxyResultV2> {
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

  try {
    const command = new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: `
        SELECT id, name, description, created_at, updated_at, created_by, updated_by
        FROM things
        WHERE id = :id::uuid
      `,
      parameters: [{ name: 'id', value: { stringValue: thingId } }],
    });

    const result = await rdsClient.send(command);

    if (!result.records || result.records.length === 0) {
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

    const record = result.records[0];
    const thing: Thing = {
      id: record[0].stringValue!,
      name: record[1].stringValue!,
      description: record[2]?.stringValue || null,
      createdAt: record[3].stringValue!,
      updatedAt: record[4].stringValue!,
      createdBy: record[5].stringValue!,
      updatedBy: record[6].stringValue!,
    };

    const response: ApiResponse<Thing> = {
      success: true,
      data: thing,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching thing:', error);

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
}

async function getAllThings(
  dbClusterArn: string,
  dbSecretArn: string,
  dbName: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    const command = new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: `
        SELECT id, name, description, created_at, updated_at, created_by, updated_by
        FROM things
        ORDER BY created_at DESC
      `,
    });

    const result = await rdsClient.send(command);

    const things: Thing[] = (result.records || []).map((record) => ({
      id: record[0].stringValue!,
      name: record[1].stringValue!,
      description: record[2]?.stringValue || null,
      createdAt: record[3].stringValue!,
      updatedAt: record[4].stringValue!,
      createdBy: record[5].stringValue!,
      updatedBy: record[6].stringValue!,
    }));

    const response: ApiResponse<Thing[]> = {
      success: true,
      data: things,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching things:', error);

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
}

export { getThingHandler };
