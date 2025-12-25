import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-rds-data', () => ({
  RDSDataClient: jest.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => mockSend(...args),
  })),
  ExecuteStatementCommand: jest.fn().mockImplementation((params) => params),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

import { createThingHandler } from './create-thing';

const handler = createThingHandler as (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyStructuredResultV2>;

describe('createThingHandler', () => {
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

  const createMockEvent = (
    body?: object | string,
  ): Partial<APIGatewayProxyEventV2> => ({
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {},
    pathParameters: {},
  });

  it('should create a thing successfully', async () => {
    mockSend.mockResolvedValueOnce({
      records: [
        [
          { stringValue: 'test-uuid-1234' },
          { stringValue: 'Test Thing' },
          { stringValue: 'A test description' },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: 'system' },
          { stringValue: 'system' },
        ],
      ],
    });

    const event = createMockEvent({
      name: 'Test Thing',
      description: 'A test description',
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Test Thing');
  });

  it('should return 400 for invalid JSON body', async () => {
    const event = createMockEvent('invalid json');

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('should return 400 for missing required name', async () => {
    const event = createMockEvent({
      description: 'No name provided',
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should create thing without description', async () => {
    mockSend.mockResolvedValueOnce({
      records: [
        [
          { stringValue: 'test-uuid-1234' },
          { stringValue: 'Test Thing' },
          { stringValue: null },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: 'system' },
          { stringValue: 'system' },
        ],
      ],
    });

    const event = createMockEvent({ name: 'Test Thing' });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.data.description).toBeNull();
  });

  it('should return 500 when database insert fails', async () => {
    mockSend.mockResolvedValueOnce({ records: [] });

    const event = createMockEvent({ name: 'Test Thing' });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should return 500 when database throws error', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error('Database connection failed'));

    const event = createMockEvent({ name: 'Test Thing' });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    consoleSpy.mockRestore();
  });

  it('should handle empty body', async () => {
    const event: Partial<APIGatewayProxyEventV2> = {
      body: undefined,
      headers: {},
      pathParameters: {},
    };

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
