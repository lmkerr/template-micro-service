import { APIGatewayProxyEventV2 } from 'aws-lambda';

const requestLogger = async (request: {
  event: APIGatewayProxyEventV2;
}): Promise<void> => {
  console.log('Request:', {
    method: request.event.requestContext.http.method,
    path: request.event.rawPath,
    body: request.event.body,
  });
};

export { requestLogger };
