import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Activity, Clock, FileText, DollarSign, CheckCircle, ShoppingCart, Truck, AlertTriangle, Users } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';

interface FeedItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
  icon: React.ElementType;
  color: string;
  isOverdue?: boolean;
}

export function GlobalActivityFeed() {
  const [limit] = useState(20);
  const { activeCompanyId } = useActiveCompany();

  const { data: activities = [] } = useQuery({
    queryKey: ['global-feed-activities', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('activities').select('id, subject, type, status, due_date, priority, created_at').order('created_at', { ascending: false }).limit(10);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as typeof q;
      const { data } = await q;
      return (data || []).map(a => {
        const isOverdue = a.status !== 'completed' && a.due_date && isPast(new Date(a.due_date));
        return {
          id: a.id,
          type: 'activity',
          title: a.subject,
          detail: `${a.type} • ${a.status || 'pending'}${a.priority === 'high' ? ' • ⚡ High' : ''}`,
          timestamp: a.created_at,
          icon: isOverdue ? AlertTriangle : Activity,
          color: isOverdue ? 'text-destructive' : 'text-blue-500',
          isOverdue,
        };
      });
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['global-feed-orders', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_orders').select('id, doc_num, customer_name, total, status, created_at').order('created_at', { ascending: false }).limit(8);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as typeof q;
      const { data } = await q;
      return (data || []).map(o => ({
        id: o.id, type: 'sales_order',
        title: `SO-${o.doc_num} - ${o.customer_name}`,
        detail: `SAR ${(o.total || 0).toLocaleString()} • ${o.status}`,
        timestamp: o.created_at, icon: FileText, color: 'text-green-500',
      }));
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['global-feed-invoices', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('id, doc_num, customer_name, total, status, created_at').order('created_at', { ascending: false }).limit(8);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as typeof q;
      const { data } = await q;
      return (data || []).map(i => ({
        id: i.id, type: 'invoice',
        title: `INV-${i.doc_num} - ${i.customer_name}`,
        detail: `SAR ${(i.total || 0).toLocaleString()} • ${i.status}`,
        timestamp: i.created_at, icon: DollarSign, color: 'text-purple-500',
      }));
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['global-feed-payments', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('id, doc_num, customer_name, total_amount, status, created_at').order('created_at', { ascending: false }).limit(8);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as typeof q;
      const { data } = await q;
      return (data || []).map(p => ({
        id: p.id, type: 'payment',
        title: `PMT-${p.doc_num} - ${p.customer_name}`,
        detail: `SAR ${(p.total_amount || 0).toLocaleString()} • ${p.status}`,
        timestamp: p.created_at, icon: CheckCircle, color: 'text-emerald-500',
      }));
    },
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['global-feed-po', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('purchase_orders').select('id, po_number, vendor_name, total, status, created_at').order('created_at', { ascending: false }).limit(8);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as typeof q;
      const { data } = await q;
      return (data || []).map(p => ({
        id: p.id, type: 'purchase_order',
        title: `PO-${p.po_number} - ${p.vendor_name}`,
        detail: `SAR ${(p.total || 0).toLocaleString()} • ${p.status}`,
        timestamp: p.created_at, icon: ShoppingCart, color: 'text-orange-500',
      }));
    },
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['global-feed-deliveries', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('delivery_notes').select('id, doc_num, customer_name, total, status, created_at').order('created_at', { ascending: false }).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as typeof q;
      const { data } = await q;
      return (data || []).map(d => ({
        id: d.id, type: 'delivery',
        title: `DN-${d.doc_num} - ${d.customer_name}`,
        detail: `SAR ${(d.total || 0).toLocaleString()} • ${d.status}`,
        timestamp: d.created_at, icon: Truck, color: 'text-sky-500',
      }));
    },
  });

  // Merge and sort
  const allItems: FeedItem[] = [...activities, ...salesOrders, ...invoices, ...payments, ...purchaseOrders, ...deliveries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  const typeLabels: Record<string, string> = {
    activity: 'Activity', sales_order: 'Sales Order', invoice: 'Invoice',
    payment: 'Payment', purchase_order: 'Purchase Order', delivery: 'Delivery',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Global Activity Feed
          <Badge variant="secondary" className="text-[10px]">{allItems.length} events</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-0">
            {allItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0 ${item.isOverdue ? 'bg-destructive/5' : ''}`}>
                <div className={`mt-0.5 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className={`text-[9px] mb-0.5 ${item.isOverdue ? 'border-destructive/30 text-destructive' : ''}`}>
                    {item.isOverdue ? 'Overdue' : typeLabels[item.type]}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {allItems.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No recent activity</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
