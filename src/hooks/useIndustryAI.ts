import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseIndustryAIOptions {
  onComplete?: (result: string) => void;
}

export function useIndustryAI(options?: UseIndustryAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/industry-ai`;

  const analyze = useCallback(async (type: string, data: Record<string, unknown>) => {
    setIsLoading(true);
    setResult('');
    setError(null);

    try {
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type, data }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const msg = errData.error || `Analysis failed (${resp.status})`;
        if (resp.status === 429) {
          toast({ title: 'Rate Limited', description: 'Too many requests. Please wait a moment.', variant: 'destructive' });
        } else if (resp.status === 402) {
          toast({ title: 'Credits Exhausted', description: 'Please add AI credits in workspace settings.', variant: 'destructive' });
        }
        throw new Error(msg);
      }

      if (!resp.body) throw new Error('No response stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResult(accumulated);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      options?.onComplete?.(accumulated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [ENDPOINT, options]);

  const reset = useCallback(() => {
    setResult('');
    setError(null);
    setIsLoading(false);
  }, []);

  return { analyze, isLoading, result, error, reset };
}
