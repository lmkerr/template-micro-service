import { handlerMiddleware } from '../../middleware/middy/middy.middleware';
import { getThingHandler } from './get-thing';

const handler = handlerMiddleware(getThingHandler);

export { handler };
