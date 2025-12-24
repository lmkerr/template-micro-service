import { handlerMiddleware } from '../../middleware/middy/middy.middleware';
import { createThingHandler } from './create-thing';

const handler = handlerMiddleware(createThingHandler);
export { handler };
