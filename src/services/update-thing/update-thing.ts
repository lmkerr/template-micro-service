import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  RDSDataClient,
  ExecuteStatementCommand,
  SqlParameter,
} from '@aws-sdk/client-rds-data';
import * as yup from 'yup';
import { Thing } from '../../models/interfaces/thing.type';
import { ApiResponse } from '../../types/api/api-response.type';

const rdsClient = new RDSDataClient({});

interface UpdateThingRequest {
  name?: string;
  description?: string | null;
}

const updateThingSchema = yup.object().shape({
  name: yup.string().optional(),
  description: yup.string().nullable().optional(),
});

const updateThingHandler: APIGatewayProxyHandlerV2 = async (
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

  // Parse request body
  let params: UpdateThingRequest;
  try {
    params = JSON.parse(event.body || '{}');
  } catch {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
      },
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }

  // Validate request
  try {
    await updateThingSchema.validate(params, { abortEarly: false });
  } catch (validationError) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details:
          validationError instanceof yup.ValidationError
            ? validationError.errors
            : validationError,
      },
    };
    return {
      statusCode: 400,
      body: JSON.stringify(response),
    };
  }

  const { name, description } = params;

  // Check if there's anything to update
  if (name === undefined && description === undefined) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'NO_FIELDS',
        message: 'At least one field must be provided for update',
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

  // TODO: Extract user ID from auth token
  const userId = 'system';

  try {
    // Build dynamic update query
    const updateParts: string[] = [];
    const parameters: SqlParameter[] = [
      { name: 'id', value: { stringValue: thingId } },
    ];

    if (name !== undefined) {
      updateParts.push('name = :name');
      parameters.push({ name: 'name', value: { stringValue: name.trim() } });
    }

    if (description !== undefined) {
      updateParts.push('description = :description');
      parameters.push({
        name: 'description',
        value: description ? { stringValue: description } : { isNull: true },
      });
    }

    updateParts.push('updated_at = NOW()');
    updateParts.push('updated_by = :updatedBy');
    parameters.push({ name: 'updatedBy', value: { stringValue: userId } });

    const command = new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: `
        UPDATE things
        SET ${updateParts.join(', ')}
        WHERE id = :id::uuid
        RETURNING id, name, description, created_at, updated_at, created_by, updated_by
      `,
      parameters,
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
    console.error('Error updating thing:', error);

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

export { updateThingHandler };
