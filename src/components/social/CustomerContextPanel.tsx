import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  User, Phone, Mail, MapPin, CreditCard, FileText, ShoppingCart,
  Link2, Search, Plus, ExternalLink, Building2
} from 'lucide-react';
import { useConversations, useCustomerContext, useRecordLinks, useLinkRecord } from '@/hooks/useSocialMessaging';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const recordTypeIcons: Record<string, React.ElementType> = {
  business_partner: User,
  sales_order: ShoppingCart,
  ar_invoice: FileText,
  quotation: FileText,
  delivery: FileText,
  project: Building2,
  lead: User,
  opportunity: CreditCard,
};

export function CustomerContextPanel({ conversationId }: { conversationId: string }) {
  const [linkSearch, setLinkSearch] = useState('');
  const [showLinkSearch, setShowLinkSearch] = useState(false);

  const { data: conversations = [] } = useConversations();
  const conversation = conversations.find(c => c.id === conversationId);
  const { data: customer } = useCustomerContext(conversation?.business_partner_id || null);
  const { data: links = [] } = useRecordLinks(conversationId);
  const linkRecord = useLinkRecord();

  // Search for ERP records to link
  const { data: searchResults = [] } = useQuery({
    queryKey: ['social-link-search', linkSearch],
    queryFn: async () => {
      if (linkSearch.length < 2) return [];
      const results: any[] = [];
      
      // Search business partners
      const { data: bps } = await supabase.from('business_partners')
        .select('id, card_name, card_code')
        .or(`card_name.ilike.%${linkSearch}%,card_code.ilike.%${linkSearch}%`)
        .limit(5);
      bps?.forEach(bp => results.push({ record_type: 'business_partner', record_id: bp.id, record_label: `${bp.card_code} - ${bp.card_name}` }));

      // Search sales orders
      const { data: sos } = await supabase.from('sales_orders')
        .select('id, doc_num, customer_name')
        .or(`customer_name.ilike.%${linkSearch}%,doc_num::text.ilike.%${linkSearch}%`)
        .limit(5);
      sos?.forEach(so => results.push({ record_type: 'sales_order', record_id: so.id, record_label: `SO-${so.doc_num} ${so.customer_name}` }));

      return results;
    },
    enabled: linkSearch.length >= 2 && showLinkSearch,
  });

  const handleLink = (r: any) => {
    linkRecord.mutate({ conversationId, ...r }, {
      onSuccess: () => { toast.success('Record linked'); setShowLinkSearch(false); setLinkSearch(''); },
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Customer Info */}
        {customer ? (
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5">
              <p className="text-sm font-medium">{customer.card_name}</p>
              <p className="text-xs text-muted-foreground">{customer.card_code}</p>
              {customer.phone && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Phone className="h-3 w-3 text-muted-foreground" />{customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Mail className="h-3 w-3 text-muted-foreground" />{customer.email}
                </div>
              )}
              {customer.city && (
                <div className="flex items-center gap-1.5 text-xs">
                  <MapPin className="h-3 w-3 text-muted-foreground" />{customer.city}
                </div>
              )}
              <div className="flex gap-1 mt-1">
                <Badge variant="outline" className="text-[10px]">{customer.card_type || 'Customer'}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-2">No customer matched</p>
              <p className="text-[10px] text-muted-foreground">{conversation?.contact_identifier}</p>
              <Button variant="outline" size="sm" className="text-xs mt-2 h-7">
                <Plus className="h-3 w-3 mr-1" />Create Lead
              </Button>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Linked Records */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Linked Records</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowLinkSearch(!showLinkSearch)}>
              <Link2 className="h-3 w-3 mr-1" />Link
            </Button>
          </div>

          {showLinkSearch && (
            <div className="mb-2 space-y-1">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-7"
                  placeholder="Search records..."
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                />
              </div>
              {searchResults.map((r, i) => {
                const Icon = recordTypeIcons[r.record_type] || FileText;
                return (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-xs" onClick={() => handleLink(r)}>
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{r.record_label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {links.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No linked records</p>
          ) : (
            <div className="space-y-1">
              {links.map((link: any) => {
                const Icon = recordTypeIcons[link.record_type] || FileText;
                return (
                  <div key={link.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 text-xs">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate flex-1">{link.record_label || link.record_type}</span>
                    <Badge variant="outline" className="text-[9px] h-4 capitalize">{link.record_type.replace('_', ' ')}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Conversation Info */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs font-semibold">Conversation Info</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1 text-xs text-muted-foreground">
            <p>Channel: <span className="text-foreground capitalize">{conversation?.channel_type}</span></p>
            <p>Status: <span className="text-foreground capitalize">{conversation?.status}</span></p>
            <p>Identifier: <span className="text-foreground">{conversation?.contact_identifier}</span></p>
            {conversation?.tags?.length ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {conversation.tags.map(t => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
