import { SetMetadata } from '@nestjs/common';

import type { CacheControlDirectives } from './cache-control';

export const CACHE_CONTROL_KEY = 'cache-control-directives';

export const CacheControl = (directives: CacheControlDirectives) =>
  SetMetadata(CACHE_CONTROL_KEY, directives);
