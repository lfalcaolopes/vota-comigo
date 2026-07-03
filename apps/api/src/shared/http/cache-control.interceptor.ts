import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, tap } from 'rxjs';

import {
  buildCacheControlHeader,
  type CacheControlDirectives,
} from './cache-control';
import { CACHE_CONTROL_KEY } from './cache-control.decorator';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const directives = this.reflector.get<CacheControlDirectives | undefined>(
      CACHE_CONTROL_KEY,
      context.getHandler(),
    );
    if (directives === undefined) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string }>();
    // Only safe GET responses are cacheable; the decorator may sit on a handler
    // that also serves other verbs.
    if (request.method !== 'GET') {
      return next.handle();
    }

    const response = http.getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();
    const header = buildCacheControlHeader(directives);
    // Set on success only, so thrown errors are not marked cacheable.
    return next
      .handle()
      .pipe(tap(() => response.setHeader('Cache-Control', header)));
  }
}
