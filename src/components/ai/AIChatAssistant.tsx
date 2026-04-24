import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Minimize2, Maximize2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function AIChatAssistant() {
  const { t, direction, language } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!ttsEnabled || !text) return;
    
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Strip markdown for cleaner speech
    const cleanText = text
      .replace(/\*\*/g, '').replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '').replace(/[-•]\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`[^`]+`/g, '').trim();

    if (!cleanText || cleanText.length < 3) return;

    try {
      setIsSpeaking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      // Don't show toast for every TTS error to avoid spam
    }
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
        if (transcript.trim()) {
          setTimeout(() => {
            const form = document.getElementById('ai-chat-form') as HTMLFormElement;
            form?.requestSubmit();
          }, 300);
        }
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, language]);

  const streamChat = useCallback(async (userMessage: string) => {
    if (!user) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: 'Please log in to use the AI assistant.' }]);
      return;
    }

    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required.');

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasAddedAssistant = false;

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
              assistantContent += content;
              setMessages(prev => {
                if (!hasAddedAssistant) {
                  hasAddedAssistant = true;
                  return [...prev, { role: 'assistant', content: assistantContent }];
                }
                return prev.map((m, i) => i === prev.length - 1 && m.role === 'assistant' ? { ...m, content: assistantContent } : m);
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Speak the final response via ElevenLabs
      speakText(assistantContent);
    } catch (error) {
      console.error('Chat error:', error);
      const errMsg = error instanceof Error ? error.message : 'Sorry, an error occurred.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, user, speakText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    stopSpeaking();
    const message = input.trim();
    setInput('');
    streamChat(message);
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0" size="icon">
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex flex-col bg-card border border-border rounded-xl shadow-2xl transition-all duration-300",
      isMinimized ? "w-72 h-14" : "w-96 h-[520px]",
      direction === 'rtl' && "right-auto left-6"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            {!isMinimized && <p className="text-xs text-muted-foreground">Ask me anything about the CRM</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => { if (isSpeaking) stopSpeaking(); setTtsEnabled(!ttsEnabled); }}
              title={ttsEnabled ? 'Disable voice (ElevenLabs)' : 'Enable voice (ElevenLabs)'}
            >
              {ttsEnabled ? <Volume2 className={cn("h-4 w-4", isSpeaking && "text-primary animate-pulse")} /> : <VolumeX className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setIsOpen(false); stopSpeaking(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm font-medium">Start a conversation!</p>
                <p className="text-xs mt-1">Ask about your leads, deals, or say it with voice 🎤</p>
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {['How many leads?', 'Pipeline summary', 'Recent opportunities'].map(q => (
                    <button key={q} onClick={() => setInput(q)} className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <form id="ai-chat-form" onSubmit={handleSubmit} className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Button type="button" variant={isListening ? "destructive" : "outline"} size="icon" onClick={toggleListening} disabled={isLoading} className={cn("shrink-0", isListening && "animate-pulse")}>
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={isListening ? "Listening..." : "Type or speak your message..."} disabled={isLoading} className="flex-1" />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {isListening && <p className="text-xs text-destructive mt-1 text-center animate-pulse">🎤 Listening... speak now</p>}
          </form>
        </>
      )}
    </div>
  );
}
