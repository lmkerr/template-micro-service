import { responseLogger } from './response-logger.util';

describe('responseLogger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log response with valid JSON body', async () => {
    const response = {
      response: {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      },
    };

    await responseLogger(response);

    expect(consoleLogSpy).toHaveBeenCalledWith('Response (object):', {
      statusCode: 200,
      body: { success: true },
    });
  });

  it('should log string response', async () => {
    const response = {
      response: 'plain string response',
    };

    await responseLogger(response);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Response (string):',
      'plain string response',
    );
  });

  it('should warn when response is undefined', async () => {
    await responseLogger({});

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Response object is undefined or missing.',
    );
  });

  it('should warn when response.response is undefined', async () => {
    await responseLogger({ response: undefined });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Response object is undefined or missing.',
    );
  });

  it('should warn for unexpected response structure', async () => {
    const response = {
      response: { unexpected: 'structure' },
    };

    await responseLogger(response as Parameters<typeof responseLogger>[0]);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Unexpected response structure:',
      {
        unexpected: 'structure',
      },
    );
  });

  it('should handle invalid JSON body gracefully', async () => {
    const response = {
      response: {
        statusCode: 200,
        body: 'not valid json',
      },
    };

    await responseLogger(response);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to parse body as JSON:',
      'not valid json',
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Response (object):', {
      statusCode: 200,
      body: 'not valid json',
    });
  });

  it('should handle undefined body', async () => {
    const response = {
      response: {
        statusCode: 204,
        body: undefined,
      },
    };

    await responseLogger(response as Parameters<typeof responseLogger>[0]);

    expect(consoleLogSpy).toHaveBeenCalledWith('Response (object):', {
      statusCode: 204,
      body: null,
    });
  });

  it('should handle errors in responseLogger', async () => {
    const badResponse = {
      get response() {
        throw new Error('Property access error');
      },
    };

    await responseLogger(badResponse as Parameters<typeof responseLogger>[0]);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
