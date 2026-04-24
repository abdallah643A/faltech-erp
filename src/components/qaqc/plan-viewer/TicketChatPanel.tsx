import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Send, Lock, Globe } from 'lucide-react';
import { useQATicketComments, useAddQAComment } from '@/hooks/useQAPlanViewer';
import { format } from 'date-fns';
import type { QATicket } from './types';

interface Props {
  ticket: QATicket;
  onClose: () => void;
  isAr: boolean;
}

export function TicketChatPanel({ ticket, onClose, isAr }: Props) {
  const { data: comments = [] } = useQATicketComments(ticket.id);
  const addComment = useAddQAComment();
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    await addComment.mutateAsync({
      ticket_id: ticket.id,
      comment_text: message,
      is_internal: isInternal,
    });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-[320px] border-l bg-background shadow-xl flex flex-col z-20 shrink-0 animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <div>
          <h3 className="text-sm font-semibold">{isAr ? 'المحادثة' : 'Discussion'}</h3>
          <p className="text-[10px] text-muted-foreground font-mono">{ticket.ticket_number}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">{isAr ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
          )}
          {comments.map(c => (
            <div key={c.id} className={`space-y-1 ${c.is_system ? 'text-center' : ''}`}>
              {c.is_system ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground italic px-2">{c.comment_text}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : (
                <div className={`rounded-lg p-2.5 ${c.is_internal ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-medium">{c.user_name || 'Unknown'}</span>
                    {c.is_internal && <Lock className="h-2.5 w-2.5 text-amber-600" />}
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {format(new Date(c.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{c.comment_text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="p-2 border-t space-y-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 text-[10px] ${isInternal ? 'text-amber-600' : ''}`}
            onClick={() => setIsInternal(!isInternal)}
          >
            {isInternal ? <Lock className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
            {isInternal ? (isAr ? 'داخلي' : 'Internal') : (isAr ? 'عام' : 'Public')}
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAr ? 'اكتب رسالة...' : 'Type a message...'}
            className="h-9 text-xs"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!message.trim() || addComment.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
