type MiddlewareObj = {
  before?: (request: unknown) => Promise<void> | void;
  after?: (request: unknown) => Promise<void> | void;
};

interface MiddyHandler {
  (event: unknown, context: unknown): Promise<unknown>;
  use: (middleware: MiddlewareObj) => MiddyHandler;
  onError: (errorHandler: unknown) => MiddyHandler;
}

const middy = (handler: (...args: unknown[]) => unknown): MiddyHandler => {
  const middlewares: MiddlewareObj[] = [];
  let errorHandlerFn: unknown;

  const middyHandler = async (event: unknown, context: unknown) => {
    const request: { event: unknown; context: unknown; response: unknown } = {
      event,
      context,
      response: null,
    };

    for (const mw of middlewares) {
      if (mw.before) {
        await mw.before(request);
      }
    }

    try {
      request.response = await handler(event, context);
    } catch (error) {
      if (errorHandlerFn && typeof errorHandlerFn === 'function') {
        await errorHandlerFn({ ...request, error });
      }
      throw error;
    }

    for (const mw of middlewares) {
      if (mw.after) {
        await mw.after(request);
      }
    }

    return request.response;
  };

  // Make the handler chainable by adding use and onError methods
  (middyHandler as MiddyHandler).use = (
    middleware: MiddlewareObj,
  ): MiddyHandler => {
    middlewares.push(middleware);
    return middyHandler as MiddyHandler;
  };

  (middyHandler as MiddyHandler).onError = (handler: unknown): MiddyHandler => {
    errorHandlerFn = handler;
    return middyHandler as MiddyHandler;
  };

  return middyHandler as MiddyHandler;
};

export default middy;
