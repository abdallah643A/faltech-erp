import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Phone, Bot, Mail, MessageSquare } from 'lucide-react';
import { useSocialTemplates } from '@/hooks/useSocialMessaging';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

interface SendViaMessagingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  documentId: string;
  documentNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
}

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: Phone, telegram: Bot, sms: Phone, email: Mail,
};

export function SendViaMessaging({
  open, onOpenChange, documentType, documentId,
  documentNumber, customerName, customerPhone, customerEmail, amount, currency, dueDate,
}: SendViaMessagingProps) {
  const [channel, setChannel] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const { data: templates = [] } = useSocialTemplates();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const replaceVars = (text: string) => {
    return text
      .replace(/\{\{customer_name\}\}/g, customerName || '')
      .replace(/\{\{document_number\}\}/g, documentNumber || '')
      .replace(/\{\{amount\}\}/g, String(amount || ''))
      .replace(/\{\{currency\}\}/g, currency || 'SAR')
      .replace(/\{\{due_date\}\}/g, dueDate || '')
      .replace(/\{\{salesperson\}\}/g, profile?.full_name || '')
      .replace(/\{\{document_date\}\}/g, new Date().toLocaleDateString());
  };

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    if (tmpl) setMessage(replaceVars(tmpl.body_text));
  };

  const handleSend = async () => {
    if (!message.trim()) { toast.error('Message required'); return; }
    setSending(true);
    try {
      // Find or create conversation
      const identifier = channel === 'email' ? customerEmail : customerPhone;
      if (!identifier) { toast.error(`No ${channel === 'email' ? 'email' : 'phone'} for this customer`); return; }

      let convId: string;
      const { data: existing } = await supabase.from('social_conversations')
        .select('id')
        .eq('channel_type', channel)
        .eq('contact_identifier', identifier)
        .limit(1)
        .maybeSingle();

      if (existing) {
        convId = existing.id;
      } else {
        const { data: newConv, error: convErr } = await supabase.from('social_conversations').insert({
          channel_type: channel,
          contact_name: customerName,
          contact_identifier: identifier,
          status: 'open',
          company_id: activeCompanyId,
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
        }).select().single();
        if (convErr) throw convErr;
        convId = newConv.id;
      }

      // Insert message
      const { error: msgErr } = await supabase.from('social_messages').insert({
        conversation_id: convId,
        direction: 'outbound',
        sender_type: 'agent',
        sender_name: profile?.full_name || 'Agent',
        sender_user_id: user?.id,
        message_text: message,
        message_type: templateId ? 'template' : 'text',
        template_id: templateId || null,
        delivery_status: 'sent',
        erp_document_type: documentType,
        erp_document_id: documentId,
        company_id: activeCompanyId,
      });
      if (msgErr) throw msgErr;

      // Log audit
      await supabase.from('social_message_audit').insert({
        action: 'document_send',
        entity_type: documentType,
        entity_id: documentId,
        details: { channel, recipient: identifier, document_number: documentNumber },
        user_id: user?.id,
        user_name: profile?.full_name,
        company_id: activeCompanyId,
      });

      toast.success(`Message sent via ${channel}`);
      onOpenChange(false);
      setMessage(''); setTemplateId('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const Icon = channelIcons[channel] || MessageSquare;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />Send {documentType.replace('_', ' ')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">{customerName}</span>
            <Badge variant="outline" className="text-[10px]">{documentNumber}</Badge>
          </div>
          <div>
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
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
            <Label className="text-xs">Template (optional)</Label>
            <Select value={templateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choose template..." /></SelectTrigger>
              <SelectContent>
                {templates.filter(t => !t.channel_type || t.channel_type === channel).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea className="min-h-[100px] text-sm" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            <Icon className="h-4 w-4 mr-1" />{sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
