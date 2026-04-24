import { useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const actionCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiter: max `limit` actions per `windowMs` milliseconds per key.
 * Returns a wrapped function that blocks excess calls with a toast.
 */
export function useRateLimiter(limit = 10, windowMs = 10000) {
  const { toast } = useToast();

  const checkLimit = useCallback(
    (key = 'global'): boolean => {
      const now = Date.now();
      const entry = actionCounts.get(key);

      if (!entry || now > entry.resetAt) {
        actionCounts.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (entry.count >= limit) {
        toast({
          title: 'Slow down!',
          description: "You're doing that too fast. Please wait a moment.",
          variant: 'destructive',
        });
        return false;
      }

      entry.count++;
      return true;
    },
    [limit, windowMs, toast]
  );

  const rateLimitedFn = useCallback(
    <T extends (...args: any[]) => any>(fn: T, key = 'global') => {
      return ((...args: Parameters<T>) => {
        if (!checkLimit(key)) return;
        return fn(...args);
      }) as T;
    },
    [checkLimit]
  );

  return { checkLimit, rateLimitedFn };
}
