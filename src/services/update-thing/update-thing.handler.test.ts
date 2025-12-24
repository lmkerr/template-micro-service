import { handler } from './update-thing.handler';

jest.mock('../../middleware/middy/middy.middleware', () => ({
  handlerMiddleware: jest.fn((fn) => fn),
}));

jest.mock('./update-thing', () => ({
  updateThingHandler: jest.fn(),
}));

describe('update-thing.handler', () => {
  it('should export a handler wrapped with middleware', () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
