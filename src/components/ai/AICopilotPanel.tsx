import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { Brain, Loader2, Sparkles, X } from 'lucide-react';

interface AICopilotPanelProps {
  analysisType: string;
  data: Record<string, unknown>;
  title?: string;
  triggerLabel?: string;
  variant?: 'inline' | 'dialog';
}

export default function AICopilotPanel({ analysisType, data, title, triggerLabel, variant = 'dialog' }: AICopilotPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`;

  const runAnalysis = useCallback(async () => {
    setIsLoading(true);
    setResult('');
    setError(null);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type: analysisType, data }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis failed (${resp.status})`);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [analysisType, data, CHAT_URL]);

  const handleOpen = () => {
    setIsOpen(true);
    if (!result) runAnalysis();
  };

  const content = (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      {isLoading && !result && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>AI is analyzing...</span>
        </div>
      )}
      {result && (
        <ScrollArea className="max-h-[500px]">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </ScrollArea>
      )}
      {result && !isLoading && (
        <div className="flex justify-end pt-2">
          <Button size="sm" variant="outline" onClick={runAnalysis}>
            <Sparkles className="h-3 w-3 mr-1" />Re-analyze
          </Button>
        </div>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              {title || 'AI Analysis'}
              <Badge variant="secondary" className="text-xs">AI</Badge>
            </CardTitle>
            {!result && !isLoading && (
              <Button size="sm" onClick={runAnalysis}>
                <Sparkles className="h-3 w-3 mr-1" />Analyze
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen} className="border-primary/30 text-primary hover:bg-primary/10">
        <Brain className="h-4 w-4 mr-2" />
        {triggerLabel || 'AI Analysis'}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {title || 'AI Copilot Analysis'}
              <Badge variant="secondary">AI-Powered</Badge>
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
}
