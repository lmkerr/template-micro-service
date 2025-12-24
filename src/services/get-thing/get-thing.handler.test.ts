import { handler } from './get-thing.handler';

jest.mock('../../middleware/middy/middy.middleware', () => ({
  handlerMiddleware: jest.fn((fn) => fn),
}));

jest.mock('./get-thing', () => ({
  getThingHandler: jest.fn(),
}));

describe('get-thing.handler', () => {
  it('should export a handler wrapped with middleware', () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
