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

import { updateThingHandler } from './update-thing';

const handler = updateThingHandler as (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyStructuredResultV2>;

describe('updateThingHandler', () => {
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
    thingId: string | undefined,
    body?: object | string,
  ): Partial<APIGatewayProxyEventV2> => ({
    pathParameters: thingId ? { thingId } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {},
  });

  it('should update a thing successfully', async () => {
    mockSend.mockResolvedValueOnce({
      records: [
        [
          { stringValue: 'uuid-1' },
          { stringValue: 'Updated Name' },
          { stringValue: 'Updated Description' },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: '2024-01-02T00:00:00Z' },
          { stringValue: 'user1' },
          { stringValue: 'system' },
        ],
      ],
    });

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000', {
      name: 'Updated Name',
      description: 'Updated Description',
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated Name');
  });

  it('should update only name', async () => {
    mockSend.mockResolvedValueOnce({
      records: [
        [
          { stringValue: 'uuid-1' },
          { stringValue: 'New Name' },
          { stringValue: 'Original Description' },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: '2024-01-02T00:00:00Z' },
          { stringValue: 'user1' },
          { stringValue: 'system' },
        ],
      ],
    });

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000', {
      name: 'New Name',
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data.name).toBe('New Name');
  });

  it('should update only description', async () => {
    mockSend.mockResolvedValueOnce({
      records: [
        [
          { stringValue: 'uuid-1' },
          { stringValue: 'Original Name' },
          { stringValue: 'New Description' },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: '2024-01-02T00:00:00Z' },
          { stringValue: 'user1' },
          { stringValue: 'system' },
        ],
      ],
    });

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000', {
      description: 'New Description',
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data.description).toBe('New Description');
  });

  it('should allow setting description to null', async () => {
    mockSend.mockResolvedValueOnce({
      records: [
        [
          { stringValue: 'uuid-1' },
          { stringValue: 'Name' },
          { stringValue: null },
          { stringValue: '2024-01-01T00:00:00Z' },
          { stringValue: '2024-01-02T00:00:00Z' },
          { stringValue: 'user1' },
          { stringValue: 'system' },
        ],
      ],
    });

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000', {
      description: null,
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.data.description).toBeNull();
  });

  it('should return 400 when thingId is missing', async () => {
    const event = createMockEvent(undefined, { name: 'Test' });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('MISSING_ID');
  });

  it('should handle undefined pathParameters', async () => {
    const event: Partial<APIGatewayProxyEventV2> = {
      pathParameters: undefined,
      body: JSON.stringify({ name: 'Test' }),
      headers: {},
    };

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('MISSING_ID');
  });

  it('should handle undefined body', async () => {
    const event: Partial<APIGatewayProxyEventV2> = {
      pathParameters: { thingId: '550e8400-e29b-41d4-a716-446655440000' },
      body: undefined,
      headers: {},
    };

    const result = await handler(event as APIGatewayProxyEventV2);

    // Empty body parses to {} which means no fields provided
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('NO_FIELDS');
  });

  it('should return 400 for invalid UUID format', async () => {
    const event = createMockEvent('invalid-uuid', { name: 'Test' });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('INVALID_ID');
  });

  it('should return 400 for invalid JSON body', async () => {
    const event = createMockEvent(
      '550e8400-e29b-41d4-a716-446655440000',
      'invalid json',
    );

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('should return 400 when no fields provided', async () => {
    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000', {});

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('NO_FIELDS');
  });

  it('should return 404 when thing not found', async () => {
    mockSend.mockResolvedValueOnce({ records: [] });

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000', {
      name: 'Test',
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 for validation error', async () => {
    // yup.string() coerces numbers to strings, so we test with an object which can't be coerced
    const event: Partial<APIGatewayProxyEventV2> = {
      pathParameters: { thingId: '550e8400-e29b-41d4-a716-446655440000' },
      body: JSON.stringify({ name: { invalid: 'object' } }),
      headers: {},
    };

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 500 on database error', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error('Database error'));

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000', {
      name: 'Test',
    });

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    consoleSpy.mockRestore();
  });
});
