import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PortalMessages({ portal, client }: { portal: any; client: any }) {
  const { t } = useLanguage();
  const pc = portal.primary_color || '#1e40af';
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['portal-messages', portal.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portal_messages')
        .select('*')
        .eq('portal_id', portal.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    refetchInterval: 10000, // Poll every 10s
  });

  // Mark admin messages as read
  useEffect(() => {
    const unread = messages.filter((m: any) => m.sender_type === 'admin' && !m.is_read);
    if (unread.length > 0) {
      supabase.from('portal_messages')
        .update({ is_read: true })
        .in('id', unread.map((m: any) => m.id))
        .then(() => qc.invalidateQueries({ queryKey: ['portal-unread'] }));
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from('portal_messages').insert({
        portal_id: portal.id,
        sender_type: 'client',
        sender_name: client?.full_name || client?.email || 'Client',
        sender_email: client?.email,
        message: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-messages'] });
      setNewMessage('');
    },
    onError: (e: any) => toast({ title: 'Failed to send', description: e.message, variant: 'destructive' }),
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Messages</h2>
        <p className="text-sm text-gray-500">Communicate with your project team.</p>
      </div>

      <Card className="flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
        {/* Messages List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isClient = msg.sender_type === 'client';
              return (
                <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] space-y-1`}>
                    <div className={`flex items-center gap-2 text-xs text-gray-500 ${isClient ? 'justify-end' : ''}`}>
                      {!isClient && <Building2 className="h-3 w-3" />}
                      <span className="font-medium">{msg.sender_name || (isClient ? 'You' : 'Admin')}</span>
                      <span>·</span>
                      <span>{format(new Date(msg.created_at), 'MMM dd, h:mm a')}</span>
                      {isClient && <User className="h-3 w-3" />}
                    </div>
                    <div className={`p-3 rounded-xl text-sm ${
                      isClient
                        ? 'text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                      style={isClient ? { backgroundColor: pc } : {}}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button onClick={handleSend} disabled={!newMessage.trim() || sendMutation.isPending}
              className="self-end text-white px-6" style={{ backgroundColor: pc }}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
