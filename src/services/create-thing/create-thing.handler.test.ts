import { handler } from './create-thing.handler';

jest.mock('../../middleware/middy/middy.middleware', () => ({
  handlerMiddleware: jest.fn((fn) => fn),
}));

jest.mock('./create-thing', () => ({
  createThingHandler: jest.fn(),
}));

describe('create-thing.handler', () => {
  it('should export a handler wrapped with middleware', () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
