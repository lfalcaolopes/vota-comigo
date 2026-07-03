import { type ExecutionContext, type CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';

import { type CacheControlDirectives } from '../cache-control';
import { CacheControlInterceptor } from '../cache-control.interceptor';

type Harness = {
  readonly interceptor: CacheControlInterceptor;
  readonly setHeader: jest.Mock;
  readonly context: ExecutionContext;
  readonly next: CallHandler;
};

function createHarness(options: {
  directives: CacheControlDirectives | undefined;
  method?: string;
  payload?: unknown;
}): Harness {
  const setHeader = jest.fn();
  const reflector = {
    get: jest.fn().mockReturnValue(options.directives),
  } as unknown as Reflector;

  const context = {
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ method: options.method ?? 'GET' }),
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;

  const next: CallHandler = {
    handle: () => of(options.payload ?? { ok: true }),
  };

  return {
    interceptor: new CacheControlInterceptor(reflector),
    setHeader,
    context,
    next,
  };
}

describe('CacheControlInterceptor', () => {
  describe('when a GET handler declares cache directives', () => {
    it('sets the Cache-Control header from the directives', async () => {
      // Arrange
      const harness = createHarness({
        directives: { public: true, sMaxAge: 300 },
      });

      // Act
      await firstValueFrom(
        harness.interceptor.intercept(harness.context, harness.next),
      );

      // Assert
      expect(harness.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, s-maxage=300',
      );
    });

    it('passes the handler response through unchanged', async () => {
      // Arrange
      const payload = { data: [1, 2, 3] };
      const harness = createHarness({
        directives: { sMaxAge: 300 },
        payload,
      });

      // Act
      const result = await firstValueFrom(
        harness.interceptor.intercept(harness.context, harness.next),
      );

      // Assert
      expect(result).toBe(payload);
    });
  });

  describe('when the handler declares no cache directives', () => {
    it('does not set a Cache-Control header', async () => {
      // Arrange
      const harness = createHarness({ directives: undefined });

      // Act
      await firstValueFrom(
        harness.interceptor.intercept(harness.context, harness.next),
      );

      // Assert
      expect(harness.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('when the request is not a GET', () => {
    it('does not set a Cache-Control header', async () => {
      // Arrange
      const harness = createHarness({
        directives: { sMaxAge: 300 },
        method: 'POST',
      });

      // Act
      await firstValueFrom(
        harness.interceptor.intercept(harness.context, harness.next),
      );

      // Assert
      expect(harness.setHeader).not.toHaveBeenCalled();
    });
  });
});
