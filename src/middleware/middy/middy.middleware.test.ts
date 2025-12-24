import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { handlerMiddleware } from './middy.middleware';

jest.mock('../../utils/request-logger/request-logger.util', () => ({
  requestLogger: jest.fn(),
}));

jest.mock('../../utils/response-logger/response-logger.util', () => ({
  responseLogger: jest.fn(),
}));

jest.mock('../../utils/error-handler/error-handler.util', () => ({
  errorHandler: jest.fn(() => jest.fn()),
}));

describe('handlerMiddleware', () => {
  const createMockEvent = (): APIGatewayProxyEventV2 =>
    ({
      headers: {
        'Content-Type': 'application/json',
      },
      requestContext: {
        http: {
          method: 'GET',
          path: '/test',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'test',
        },
        accountId: '123',
        apiId: 'api123',
        domainName: 'test.com',
        domainPrefix: 'test',
        requestId: 'req123',
        routeKey: 'GET /test',
        stage: 'test',
        time: '2024-01-01T00:00:00Z',
        timeEpoch: 1234567890,
      },
      rawPath: '/test',
      rawQueryString: '',
      isBase64Encoded: false,
      body: null,
      pathParameters: {},
      queryStringParameters: {},
      stageVariables: {},
      routeKey: 'GET /test',
      version: '2.0',
    }) as unknown as APIGatewayProxyEventV2;

  const createMockContext = (): Context =>
    ({
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123:function:test',
      memoryLimitInMB: '128',
      awsRequestId: 'req123',
      logGroupName: '/aws/lambda/test',
      logStreamName: 'stream',
      getRemainingTimeInMillis: () => 5000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    }) as Context;

  it('should wrap a lambda handler with middleware', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    const wrappedHandler = handlerMiddleware(mockHandler);
    const event = createMockEvent();
    const context = createMockContext();

    const result = await wrappedHandler(event, context);

    expect(mockHandler).toHaveBeenCalled();
    expect((result as APIGatewayProxyResultV2 & { statusCode: number }).statusCode).toBe(200);
  });

  it('should add content-type header when not present', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    });

    const wrappedHandler = handlerMiddleware(mockHandler);
    const event = createMockEvent();
    const context = createMockContext();

    const result = await wrappedHandler(event, context);
    const typedResult = result as APIGatewayProxyResultV2 & { headers?: Record<string, string> };

    expect(typedResult.headers?.['content-type']).toBe('application/json');
  });

  it('should preserve existing content-type header', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      headers: { 'content-type': 'text/plain' },
      body: 'plain text',
    });

    const wrappedHandler = handlerMiddleware(mockHandler);
    const event = createMockEvent();
    const context = createMockContext();

    const result = await wrappedHandler(event, context);
    const typedResult = result as APIGatewayProxyResultV2 & { headers?: Record<string, string> };

    expect(typedResult.headers?.['content-type']).toBe('text/plain');
  });

  it('should preserve existing Content-Type header (capitalized)', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: '<html></html>',
    });

    const wrappedHandler = handlerMiddleware(mockHandler);
    const event = createMockEvent();
    const context = createMockContext();

    const result = await wrappedHandler(event, context);
    const typedResult = result as APIGatewayProxyResultV2 & { headers?: Record<string, string> };

    expect(typedResult.headers?.['Content-Type']).toBe('text/html');
  });

  it('should normalize headers from the event', async () => {
    const mockHandler = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: '{}',
    });

    const wrappedHandler = handlerMiddleware(mockHandler);
    const event = createMockEvent();
    event.headers = { 'X-Custom-Header': 'value' };
    const context = createMockContext();

    await wrappedHandler(event, context);

    expect(mockHandler).toHaveBeenCalled();
  });
});
