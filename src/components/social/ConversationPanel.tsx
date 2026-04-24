import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Send, MoreVertical, UserCheck, CheckCircle, AlertTriangle, Archive,
  StickyNote, Link2, PanelRightOpen, FileText, Phone, Bot, MessageSquare
} from 'lucide-react';
import { useConversationMessages, useSendMessage, useUpdateConversation, useConversations } from '@/hooks/useSocialMessaging';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp', telegram: 'Telegram', sms: 'SMS',
  facebook: 'Facebook', instagram: 'Instagram', email: 'Email',
};

export function ConversationPanel({
  conversationId,
  onToggleContext,
}: {
  conversationId: string | null;
  onToggleContext: () => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useConversations();
  const conversation = conversations.find(c => c.id === conversationId);
  const { data: messages = [], isLoading } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage();
  const updateConv = useUpdateConversation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!replyText.trim() || !conversationId) return;
    sendMessage.mutate({
      conversationId,
      text: replyText,
      isInternalNote,
    }, {
      onSuccess: () => { setReplyText(''); setIsInternalNote(false); },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleStatusChange = (status: string) => {
    if (!conversationId) return;
    updateConv.mutate({ id: conversationId, updates: { status } });
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{conversation?.contact_name || 'Unknown'}</span>
              <Badge variant="outline" className="text-[10px] h-4">
                {channelLabels[conversation?.channel_type || ''] || conversation?.channel_type}
              </Badge>
              <Badge variant={conversation?.status === 'open' ? 'default' : 'secondary'} className="text-[10px] h-4 capitalize">
                {conversation?.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{conversation?.contact_identifier}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onToggleContext}>
            <PanelRightOpen className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
                <CheckCircle className="h-3.5 w-3.5 mr-2" />Mark Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('escalated')}>
                <AlertTriangle className="h-3.5 w-3.5 mr-2" />Escalate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
                <Archive className="h-3.5 w-3.5 mr-2" />Close
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-xs text-muted-foreground py-8">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.direction === 'outbound' ? 'justify-end' : 'justify-start',
                msg.is_internal_note && 'justify-center'
              )}
            >
              {msg.is_internal_note ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5 max-w-[80%]">
                  <div className="flex items-center gap-1 mb-0.5">
                    <StickyNote className="h-3 w-3 text-yellow-600" />
                    <span className="text-[10px] font-medium text-yellow-700">Internal Note</span>
                    <span className="text-[10px] text-muted-foreground">• {msg.sender_name}</span>
                  </div>
                  <p className="text-xs">{msg.message_text}</p>
                </div>
              ) : (
                <div className={cn(
                  'max-w-[70%] rounded-lg px-3 py-2',
                  msg.direction === 'outbound' ? 'bg-primary/10 text-foreground' : 'bg-muted'
                )}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-medium">
                      {msg.direction === 'outbound' ? msg.sender_name || 'You' : conversation?.contact_name || 'Customer'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                    {msg.direction === 'outbound' && (
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 capitalize">
                        {msg.delivery_status}
                      </Badge>
                    )}
                  </div>
                  {msg.erp_document_type && (
                    <div className="flex items-center gap-1 mb-1">
                      <FileText className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-primary font-medium">
                        {msg.erp_document_type} #{msg.erp_document_id}
                      </span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reply Box */}
      <div className="border-t p-3">
        {isInternalNote && (
          <div className="flex items-center gap-1 mb-1.5">
            <StickyNote className="h-3 w-3 text-yellow-600" />
            <span className="text-xs text-yellow-700 font-medium">Writing internal note (not visible to customer)</span>
            <Button variant="ghost" size="sm" className="h-5 text-xs ml-auto" onClick={() => setIsInternalNote(false)}>Cancel</Button>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setIsInternalNote(!isInternalNote)}>
            <StickyNote className={cn("h-4 w-4", isInternalNote && "text-yellow-600")} />
          </Button>
          <Input
            placeholder={isInternalNote ? "Write internal note..." : "Type a message..."}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className={cn("h-9 text-sm flex-1", isInternalNote && "border-yellow-500/50")}
          />
          <Button onClick={handleSend} disabled={!replyText.trim() || sendMessage.isPending} size="sm" className="h-9 px-3">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
