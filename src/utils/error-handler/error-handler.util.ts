import {
  APIGatewayProxyResultV2,
  APIGatewayProxyEventV2,
  Context,
} from 'aws-lambda';
import { Request } from '@middy/core';
import { ValidationError } from 'yup';

const errorHandler =
  () =>
  async (
    request: Request<
      APIGatewayProxyEventV2,
      APIGatewayProxyResultV2,
      Error,
      Context
    >,
  ): Promise<void> => {
    const { error } = request;

    console.error('Error detected in errorHandler:', {
      error,
      existingResponse: request.response,
    });

    if (error instanceof ValidationError) {
      request.response = {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Validation error',
          details: error.errors,
        }),
      };
      return;
    }

    request.response = {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      }),
    };
  };

export { errorHandler };
