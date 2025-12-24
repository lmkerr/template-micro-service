import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-rds-data', () => ({
  RDSDataClient: jest.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => mockSend(...args),
  })),
  ExecuteStatementCommand: jest.fn().mockImplementation((params) => params),
}));

import { deleteThingHandler } from './delete-thing';

const handler = deleteThingHandler as (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyStructuredResultV2>;

describe('deleteThingHandler', () => {
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
    thingId?: string,
  ): Partial<APIGatewayProxyEventV2> => ({
    pathParameters: thingId ? { thingId } : {},
    headers: {},
  });

  it('should delete a thing successfully', async () => {
    // First call: check if thing exists
    mockSend.mockResolvedValueOnce({
      records: [[{ stringValue: '550e8400-e29b-41d4-a716-446655440000' }]],
    });
    // Second call: delete the thing
    mockSend.mockResolvedValueOnce({});

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000');
    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(body.data.deleted).toBe(true);
  });

  it('should return 400 when thingId is missing', async () => {
    const event = createMockEvent();

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('MISSING_ID');
  });

  it('should handle undefined pathParameters', async () => {
    const event: Partial<APIGatewayProxyEventV2> = {
      pathParameters: undefined,
      headers: {},
    };

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('MISSING_ID');
  });

  it('should return 400 for invalid UUID format', async () => {
    const event = createMockEvent('invalid-uuid');

    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('INVALID_ID');
  });

  it('should return 404 when thing not found', async () => {
    mockSend.mockResolvedValueOnce({ records: [] });

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000');
    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 500 on database error during check', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error('Database error'));

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000');
    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    consoleSpy.mockRestore();
  });

  it('should return 500 on database error during delete', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockSend.mockResolvedValueOnce({
      records: [[{ stringValue: '550e8400-e29b-41d4-a716-446655440000' }]],
    });
    mockSend.mockRejectedValueOnce(new Error('Delete failed'));

    const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000');
    const result = await handler(event as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    consoleSpy.mockRestore();
  });
});
