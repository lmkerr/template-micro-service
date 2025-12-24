import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { requestLogger } from './request-logger.util';

describe('requestLogger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log request method, path, and body', async () => {
    const mockEvent: Partial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: 'POST',
          path: '/things',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'test',
        },
        accountId: '123',
        apiId: 'api123',
        domainName: 'test.com',
        domainPrefix: 'test',
        requestId: 'req123',
        routeKey: 'POST /things',
        stage: 'test',
        time: '2024-01-01T00:00:00Z',
        timeEpoch: 1234567890,
      },
      rawPath: '/things',
      body: JSON.stringify({ name: 'Test' }),
    };

    await requestLogger({ event: mockEvent as APIGatewayProxyEventV2 });

    expect(consoleSpy).toHaveBeenCalledWith('Request:', {
      method: 'POST',
      path: '/things',
      body: JSON.stringify({ name: 'Test' }),
    });
  });

  it('should handle undefined body', async () => {
    const mockEvent: Partial<APIGatewayProxyEventV2> = {
      requestContext: {
        http: {
          method: 'GET',
          path: '/things',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'test',
        },
        accountId: '123',
        apiId: 'api123',
        domainName: 'test.com',
        domainPrefix: 'test',
        requestId: 'req123',
        routeKey: 'GET /things',
        stage: 'test',
        time: '2024-01-01T00:00:00Z',
        timeEpoch: 1234567890,
      },
      rawPath: '/things',
      body: undefined,
    };

    await requestLogger({ event: mockEvent as APIGatewayProxyEventV2 });

    expect(consoleSpy).toHaveBeenCalledWith('Request:', {
      method: 'GET',
      path: '/things',
      body: undefined,
    });
  });
});
