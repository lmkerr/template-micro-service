import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from '@aws-sdk/client-rds-data';
import { v4 as uuidv4 } from 'uuid';
import * as yup from 'yup';
import { Thing } from '../../models/interfaces/thing.type';
import { ApiResponse } from '../../types/api/api-response.type';

const rdsClient = new RDSDataClient({});

interface CreateThingRequest {
  name: string;
  description?: string;
}

const createThingSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  description: yup.string().optional(),
});

const createThingHandler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const dbClusterArn = process.env.DB_CLUSTER_ARN!;
  const dbSecretArn = process.env.DB_SECRET_ARN!;
  const dbName = process.env.DB_NAME!;

  // Parse request body
  let params: CreateThingRequest;
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
    await createThingSchema.validate(params, { abortEarly: false });
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

  // TODO: Extract user ID from auth token
  const userId = 'system';

  try {
    const newThingId = uuidv4();

    const insertCommand = new ExecuteStatementCommand({
      resourceArn: dbClusterArn,
      secretArn: dbSecretArn,
      database: dbName,
      sql: `
        INSERT INTO things (id, name, description, created_by, updated_by)
        VALUES (:id::uuid, :name, :description, :createdBy, :updatedBy)
        RETURNING id, name, description, created_at, updated_at, created_by, updated_by
      `,
      parameters: [
        { name: 'id', value: { stringValue: newThingId } },
        { name: 'name', value: { stringValue: name.trim() } },
        {
          name: 'description',
          value: description ? { stringValue: description } : { isNull: true },
        },
        { name: 'createdBy', value: { stringValue: userId } },
        { name: 'updatedBy', value: { stringValue: userId } },
      ],
    });

    const result = await rdsClient.send(insertCommand);

    if (!result.records || result.records.length === 0) {
      throw new Error('Failed to create thing');
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
      statusCode: 201,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error creating thing:', error);

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

export { createThingHandler };
