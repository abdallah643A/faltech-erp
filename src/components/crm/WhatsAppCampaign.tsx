import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Users, Filter, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DeliveryResult {
  name: string;
  phone: string;
  status: 'sent' | 'failed';
  error?: string;
}

const TEMPLATES = [
  { id: 'greeting', name: 'Greeting', body: 'Hello {{name}}, thank you for your interest in our services. We look forward to working with you!' },
  { id: 'followup', name: 'Follow Up', body: 'Hi {{name}}, just checking in to see if you have any questions about our proposal. Let us know how we can help!' },
  { id: 'promotion', name: 'Promotion', body: 'Dear {{name}}, we have an exclusive offer for valued partners like you. Contact us to learn more!' },
  { id: 'custom', name: 'Custom Message', body: '' },
];

export default function WhatsAppCampaign() {
  const { activeCompanyId } = useActiveCompany();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<DeliveryResult[] | null>(null);

  const { data: partners = [] } = useQuery({
    queryKey: ['whatsapp-campaign-partners', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_name, card_type, phone, mobile, email, status').not('card_type', 'eq', 'lead');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return (data || []).filter(p => p.phone || p.mobile);
    },
  });

  const filtered = useMemo(() => partners.filter(p => {
    const matchesType = typeFilter === 'all' || p.card_type === typeFilter;
    const matchesSearch = p.card_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  }), [partners, typeFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map(p => p.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const messageBody = selectedTemplate.id === 'custom' ? customMessage : selectedTemplate.body;

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'No recipients', description: 'Please select at least one business partner.', variant: 'destructive' });
      return;
    }
    if (!messageBody.trim()) {
      toast({ title: 'Empty message', description: 'Please enter a message.', variant: 'destructive' });
      return;
    }

    setSending(true);
    const deliveryResults: DeliveryResult[] = [];

    for (const id of selectedIds) {
      const partner = partners.find(p => p.id === id);
      if (!partner) continue;
      const phone = partner.mobile || partner.phone || '';
      const personalizedMsg = messageBody.replace(/\{\{name\}\}/g, partner.card_name);

      try {
        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: { to: phone, message: personalizedMsg },
        });
        deliveryResults.push({ name: partner.card_name, phone, status: error ? 'failed' : 'sent', error: error?.message });
      } catch (err: any) {
        deliveryResults.push({ name: partner.card_name, phone, status: 'failed', error: err.message });
      }
    }

    setResults(deliveryResults);
    setSending(false);
    const sentCount = deliveryResults.filter(r => r.status === 'sent').length;
    toast({ title: 'Campaign Sent', description: `${sentCount}/${deliveryResults.length} messages delivered.` });
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-500" /> WhatsApp Campaign
          </h1>
          <p className="text-sm text-muted-foreground">Send templated messages to business partner segments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipient Selection */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Recipients ({selectedIds.size} selected)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="vendor">Vendors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All ({filtered.length})</Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filtered.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    <span className="flex-1 truncate">{p.card_name}</span>
                    <Badge variant="outline" className="text-[10px]">{p.card_type}</Badge>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Composer */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate.id} onValueChange={id => { const t = TEMPLATES.find(t => t.id === id); if (t) setSelectedTemplate(t); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate.id === 'custom' ? (
              <div className="space-y-2">
                <Label>Message (use {'{{name}}'} for customer name)</Label>
                <Textarea rows={6} value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Type your message..." />
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{selectedTemplate.body}</div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSend} disabled={sending || selectedIds.size === 0} className="bg-green-600 hover:bg-green-700">
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send to {selectedIds.size} recipient{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </div>

            {/* Delivery Report */}
            {results && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Delivery Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-3">
                    <Badge className="bg-green-500/10 text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" /> Sent: {results.filter(r => r.status === 'sent').length}
                    </Badge>
                    <Badge className="bg-destructive/10 text-destructive">
                      <XCircle className="h-3 w-3 mr-1" /> Failed: {results.filter(r => r.status === 'failed').length}
                    </Badge>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1 text-sm">
                      {results.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded border border-border">
                          <span>{r.name} ({r.phone})</span>
                          {r.status === 'sent' ? (
                            <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Sent</Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive"><XCircle className="h-3 w-3 mr-1" /> {r.error || 'Failed'}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
