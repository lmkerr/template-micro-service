import { handlerMiddleware } from '../../middleware/middy/middy.middleware';
import { deleteThingHandler } from './delete-thing';

const handler = handlerMiddleware(deleteThingHandler);

export { handler };
