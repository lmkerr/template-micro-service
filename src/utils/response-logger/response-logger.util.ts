import { APIGatewayProxyResultV2 } from 'aws-lambda';

const responseLogger = async (response: {
  response?: APIGatewayProxyResultV2 | string;
}): Promise<void> => {
  try {
    if (!response?.response) {
      console.warn('Response object is undefined or missing.');
      return;
    }

    const responseData = response.response;

    if (typeof responseData === 'string') {
      console.log('Response (string):', responseData);
    } else if (
      typeof responseData === 'object' &&
      'statusCode' in responseData &&
      'body' in responseData
    ) {
      console.log('Response (object):', {
        statusCode: responseData.statusCode,
        body: safelyParseBody(responseData.body),
      });
    } else {
      console.warn('Unexpected response structure:', responseData);
    }
  } catch (err) {
    console.error('Error in responseLogger:', err);
  }
};

// Utility to safely parse JSON bodies
const safelyParseBody = (body: string | undefined): unknown => {
  try {
    return body ? JSON.parse(body) : null;
  } catch (err) {
    console.warn('Failed to parse body as JSON:', body);
    return body; // Return raw body if parsing fails
  }
};

export { responseLogger };
