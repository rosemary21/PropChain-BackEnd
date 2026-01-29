import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * This middleware acts as a gatekeeper.
 * It assigns a unique "Correlation ID" to every incoming request.
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. Check if the request already has an ID from the frontend, 
    // otherwise, generate a brand new unique ID (UUID).
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    
    // 2. Attach this ID to the 'req' (request) object so our other 
    // files (Services and Interceptors) can see it.
    req['correlationId'] = correlationId;
    
    // 3. Send the ID back to the client in the response header.
    // This is helpful for debugging if the user reports an error.
    res.setHeader('x-correlation-id', correlationId);
    
    // 4. Important: Tell NestJS to move to the next step in the process.
    // If you forget this, the request will hang forever!
    next();
  }
}