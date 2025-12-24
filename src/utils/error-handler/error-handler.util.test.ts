import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { Request } from '@middy/core';
import { ValidationError } from 'yup';
import { errorHandler } from './error-handler.util';

describe('errorHandler', () => {
  const createMockRequest = (
    error: Error,
  ): Request<
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Error,
    Context
  > => ({
    event: {} as APIGatewayProxyEventV2,
    context: {} as Context,
    response: {} as APIGatewayProxyResultV2,
    error,
    internal: {},
  });

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should handle yup ValidationError', async () => {
    const validationError = new ValidationError(
      'Field is required',
      null,
      'field',
    );
    // Add additional error messages to the errors array
    validationError.errors = ['Field is required', 'Invalid format'];

    const request = createMockRequest(validationError);
    const handler = errorHandler();

    await handler(request);

    expect(request.response).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: 'Validation error',
        details: validationError.errors,
      }),
    });
  });

  it('should handle generic Error', async () => {
    const error = new Error('Something went wrong');
    const request = createMockRequest(error);
    const handler = errorHandler();

    await handler(request);

    expect(request.response).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Something went wrong',
      }),
    });
  });

  it('should handle non-Error objects', async () => {
    const request = createMockRequest('string error' as unknown as Error);
    const handler = errorHandler();

    await handler(request);

    expect(request.response).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred.',
      }),
    });
  });

  it('should log error details', async () => {
    const error = new Error('Test error');
    const request = createMockRequest(error);
    const handler = errorHandler();

    await handler(request);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error detected in errorHandler:',
      expect.objectContaining({
        error,
      }),
    );
  });
});
