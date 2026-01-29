import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StructuredLoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    // Extract correlationId safely
    const correlationId = request['correlationId'];
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - now;
          
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${duration}ms`,
            { correlationId }
          );
        },
        error: (err: any) => {
          const duration = Date.now() - now;
          // FIXED: Only passing 2 arguments to match your LoggerService
          this.logger.error(
            `${method} ${url} Failed - ${duration}ms | Error: ${err.message}`,
            err.stack
          );
        },
      }),
    );
  }
}