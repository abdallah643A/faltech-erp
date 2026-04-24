import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/contexts/LanguageContext';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nl-assistant`;

const SUGGESTIONS = [
  'Show me overdue invoices',
  'Summarize project billing status',
  'What are the top 5 customers by revenue?',
  'Explain how accounting determination works',
  'Why might a posting fail?',
  'List pending approval requests',
];

export default function NLAssistant() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMsgs }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        upsert(err.error || 'Sorry, something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      upsert('Connection error. Please check your network and try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" />ERP Assistant</h1>
        <p className="text-muted-foreground">Ask questions about your business data, processes, and documents</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground text-center">Ask me anything about your ERP data</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map((s, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => send(s)}>{s}</Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 mb-4 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <Bot className="h-6 w-6 text-primary mt-1 shrink-0" />}
                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{m.content}</p>
                  )}
                </div>
                {m.role === 'user' && <User className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3 mb-4"><Bot className="h-6 w-6 text-primary mt-1" /><div className="bg-muted rounded-lg px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div></div>
            )}
            <div ref={scrollRef} />
          </ScrollArea>

          <div className="border-t p-4 flex gap-2">
            <Input
              placeholder="Ask about invoices, projects, employees, approvals..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              disabled={isLoading}
            />
            <Button onClick={() => send(input)} disabled={isLoading || !input.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
