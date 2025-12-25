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

import { getThingHandler } from './get-thing';

const handler = getThingHandler as (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyStructuredResultV2>;

describe('getThingHandler', () => {
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

  describe('get all things', () => {
    it('should handle undefined pathParameters', async () => {
      mockSend.mockResolvedValueOnce({ records: [] });

      const event: Partial<APIGatewayProxyEventV2> = {
        pathParameters: undefined,
        headers: {},
      };
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.data).toEqual([]);
    });

    it('should return all things', async () => {
      mockSend.mockResolvedValueOnce({
        records: [
          [
            { stringValue: 'uuid-1' },
            { stringValue: 'Thing 1' },
            { stringValue: 'Description 1' },
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: 'user1' },
            { stringValue: 'user1' },
          ],
          [
            { stringValue: 'uuid-2' },
            { stringValue: 'Thing 2' },
            { stringValue: null },
            { stringValue: '2024-01-02T00:00:00Z' },
            { stringValue: '2024-01-02T00:00:00Z' },
            { stringValue: 'user2' },
            { stringValue: 'user2' },
          ],
        ],
      });

      const event = createMockEvent();
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].name).toBe('Thing 1');
      expect(body.data[1].description).toBeNull();
    });

    it('should return empty array when no things exist', async () => {
      mockSend.mockResolvedValueOnce({ records: [] });

      const event = createMockEvent();
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should handle undefined records in response', async () => {
      mockSend.mockResolvedValueOnce({});

      const event = createMockEvent();
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should handle undefined description field in records', async () => {
      mockSend.mockResolvedValueOnce({
        records: [
          [
            { stringValue: 'uuid-1' },
            { stringValue: 'Thing 1' },
            undefined, // description field is undefined
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: 'user1' },
            { stringValue: 'user1' },
          ],
        ],
      });

      const event = createMockEvent();
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.data[0].description).toBeNull();
    });

    it('should return 500 on database error', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockSend.mockRejectedValueOnce(new Error('Database error'));

      const event = createMockEvent();
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      consoleSpy.mockRestore();
    });
  });

  describe('get thing by id', () => {
    it('should return a single thing by id', async () => {
      mockSend.mockResolvedValueOnce({
        records: [
          [
            { stringValue: 'uuid-1' },
            { stringValue: 'Thing 1' },
            { stringValue: 'Description 1' },
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: 'user1' },
            { stringValue: 'user1' },
          ],
        ],
      });

      const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000');
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('uuid-1');
    });

    it('should handle undefined description field for single thing', async () => {
      mockSend.mockResolvedValueOnce({
        records: [
          [
            { stringValue: 'uuid-1' },
            { stringValue: 'Thing 1' },
            undefined, // description field is undefined
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: '2024-01-01T00:00:00Z' },
            { stringValue: 'user1' },
            { stringValue: 'user1' },
          ],
        ],
      });

      const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000');
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body as string);
      expect(body.data.description).toBeNull();
    });

    it('should return 404 when thing not found', async () => {
      mockSend.mockResolvedValueOnce({ records: [] });

      const event = createMockEvent('550e8400-e29b-41d4-a716-446655440000');
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const event = createMockEvent('invalid-uuid');
      const result = await handler(event as APIGatewayProxyEventV2);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body as string);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_ID');
    });

    it('should return 500 on database error for single thing', async () => {
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
  });
});
