import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, MessageSquare, Phone, Instagram, Facebook, Mail, Bot, Star } from 'lucide-react';
import { useConversations, SocialConversation, useUpdateConversation } from '@/hooks/useSocialMessaging';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: Phone,
  telegram: Bot,
  sms: Phone,
  facebook: Facebook,
  instagram: Instagram,
  email: Mail,
  webhook: MessageSquare,
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  open: 'bg-green-500',
  pending: 'bg-yellow-500',
  resolved: 'bg-muted',
  closed: 'bg-muted',
  escalated: 'bg-red-500',
};

export function ConversationList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newConvName, setNewConvName] = useState('');
  const [newConvChannel, setNewConvChannel] = useState('whatsapp');
  const [newConvIdentifier, setNewConvIdentifier] = useState('');
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const updateConv = useUpdateConversation();

  const { data: conversations = [], isLoading } = useConversations({
    status: statusFilter,
    channel: channelFilter,
  });

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.contact_name?.toLowerCase().includes(s) ||
      c.contact_identifier?.toLowerCase().includes(s) ||
      c.last_message_preview?.toLowerCase().includes(s) ||
      c.subject?.toLowerCase().includes(s)
    );
  });

  const handleCreateConversation = async () => {
    if (!newConvIdentifier.trim()) return;
    const { data, error } = await supabase.from('social_conversations').insert({
      channel_type: newConvChannel,
      contact_name: newConvName || newConvIdentifier,
      contact_identifier: newConvIdentifier,
      status: 'new',
      company_id: activeCompanyId,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ['social-conversations'] });
    onSelect(data.id);
    setShowNewDialog(false);
    setNewConvName(''); setNewConvIdentifier('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2 border-b">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-9 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <p className="text-center text-xs text-muted-foreground py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">No conversations</p>
        ) : (
          filtered.map(conv => {
            const Icon = channelIcons[conv.channel_type] || MessageSquare;
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'flex items-start gap-2.5 px-3 py-2.5 cursor-pointer border-b hover:bg-muted/50 transition-colors',
                  selectedId === conv.id && 'bg-accent'
                )}
              >
                <div className="relative mt-0.5">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background', statusColors[conv.status] || 'bg-muted')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium truncate">{conv.contact_name || conv.contact_identifier || 'Unknown'}</span>
                    {conv.last_message_at && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview || 'No messages'}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="h-4 text-[10px] px-1.5">{conv.unread_count}</Badge>
                    )}
                    {conv.is_starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    {conv.tags?.length > 0 && conv.tags.slice(0, 2).map(t => (
                      <Badge key={t} variant="outline" className="h-4 text-[9px] px-1">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </ScrollArea>

      {/* New Conversation Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={newConvChannel} onValueChange={setNewConvChannel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input className="h-9" value={newConvName} onChange={e => setNewConvName(e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <Label className="text-xs">Phone / Handle / Email</Label>
              <Input className="h-9" value={newConvIdentifier} onChange={e => setNewConvIdentifier(e.target.value)} placeholder="+966..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateConversation} disabled={!newConvIdentifier.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
