import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import middy from '@middy/core';
import httpHeaderNormalizer from '@middy/http-header-normalizer';

import { requestLogger } from '../../utils/request-logger/request-logger.util';
import { responseLogger } from '../../utils/response-logger/response-logger.util';
import { errorHandler } from '../../utils/error-handler/error-handler.util';

const handlerMiddleware = (lambda: APIGatewayProxyHandlerV2) => {
  return middy(lambda)
    .use(httpHeaderNormalizer())
    .use({
      before: requestLogger,
      after: (request) => {
        // Ensure JSON content-type is set
        if (
          !request.response.headers?.['content-type'] &&
          !request.response.headers?.['Content-Type']
        ) {
          request.response.headers = {
            ...request.response.headers,
            'content-type': 'application/json',
          };
        }
        responseLogger(request);
      },
    })
    .onError(errorHandler());
};

export { handlerMiddleware };
