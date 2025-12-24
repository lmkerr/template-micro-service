import { handlerMiddleware } from '../../middleware/middy/middy.middleware';
import { updateThingHandler } from './update-thing';

const handler = handlerMiddleware(updateThingHandler);

export { handler };
