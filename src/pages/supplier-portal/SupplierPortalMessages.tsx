import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Globe, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SupplierPortalMessages({ account }: { account: any }) {
  const queryClient = useQueryClient();
  const [newMsg, setNewMsg] = useState('');
  const [threadFilter, setThreadFilter] = useState('');

  const { data: messages = [] } = useQuery({
    queryKey: ['sp-messages', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_portal_messages' as any).select('*').eq('portal_account_id', account.id).order('created_at', { ascending: true });
      return data || [];
    },
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_portal_messages' as any).insert({
        portal_account_id: account.id, company_id: account.company_id,
        thread_key: threadFilter || 'general', sender_type: 'supplier',
        sender_name: account.contact_name || account.email, message: newMsg,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sp-messages'] }); setNewMsg(''); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredMessages = threadFilter ? messages.filter((m: any) => m.thread_key === threadFilter) : messages;
  const threads = [...new Set(messages.map((m: any) => m.thread_key))];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Messages</h2>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={!threadFilter ? 'default' : 'outline'} onClick={() => setThreadFilter('')}>All</Button>
        {threads.map(t => (
          <Button key={t} size="sm" variant={threadFilter === t ? 'default' : 'outline'} onClick={() => setThreadFilter(t)}>{t}</Button>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[400px] mb-4">
            {filteredMessages.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No messages</p> :
             filteredMessages.map((m: any) => (
               <div key={m.id} className={`flex gap-3 mb-3 ${m.sender_type === 'supplier' ? 'justify-end' : ''}`}>
                 <div className={`max-w-[70%] p-3 rounded-lg ${m.sender_type === 'supplier' ? 'bg-primary/10' : 'bg-muted'}`}>
                   <div className="flex items-center gap-2 mb-1">
                     {m.sender_type === 'supplier' ? <Globe className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                     <span className="text-xs font-medium">{m.sender_name}</span>
                     <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'HH:mm')}</span>
                   </div>
                   <p className="text-sm">{m.message}</p>
                 </div>
               </div>
             ))}
          </ScrollArea>
          <div className="flex gap-2">
            <Input placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newMsg.trim()) sendMessage.mutate(); }} />
            <Button onClick={() => sendMessage.mutate()} disabled={!newMsg.trim() || sendMessage.isPending}><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
