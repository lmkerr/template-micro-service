import { handler } from './delete-thing.handler';

jest.mock('../../middleware/middy/middy.middleware', () => ({
  handlerMiddleware: jest.fn((fn) => fn),
}));

jest.mock('./delete-thing', () => ({
  deleteThingHandler: jest.fn(),
}));

describe('delete-thing.handler', () => {
  it('should export a handler wrapped with middleware', () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
