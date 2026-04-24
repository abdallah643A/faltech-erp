import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Package, Receipt, CreditCard, Upload, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SupplierPortalDashboard({ account }: { account: any }) {
  const { data: rfqs = [] } = useQuery({
    queryKey: ['sp-rfqs', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_rfq_responses' as any).select('*').eq('portal_account_id', account.id);
      return data || [];
    },
  });

  const { data: pos = [] } = useQuery({
    queryKey: ['sp-pos', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_po_acknowledgements' as any).select('*').eq('portal_account_id', account.id);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['sp-invoices', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_invoice_submissions' as any).select('*').eq('portal_account_id', account.id);
      return data || [];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['sp-docs', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_portal_documents' as any).select('*').eq('portal_account_id', account.id);
      return data || [];
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['sp-reminders', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_portal_reminders' as any).select('*').eq('portal_account_id', account.id).eq('status', 'pending');
      return data || [];
    },
  });

  const cards = [
    { label: 'RFQs', value: rfqs.length, icon: FileText, color: 'text-blue-400', link: 'rfqs' },
    { label: 'Purchase Orders', value: pos.length, icon: Package, color: 'text-green-400', link: 'purchase-orders' },
    { label: 'Invoices', value: invoices.length, icon: Receipt, color: 'text-yellow-400', link: 'invoices' },
    { label: 'Documents', value: docs.length, icon: Upload, color: 'text-purple-400', link: 'documents' },
    { label: 'Reminders', value: reminders.length, icon: Bell, color: 'text-orange-400', link: 'messages' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {account.contact_name || account.email}</h1>
        <p className="text-sm text-muted-foreground">Your supplier portal dashboard</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <Link key={c.label} to={`/supplier-portal/${c.link}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <c.icon className={`h-8 w-8 mx-auto mb-2 ${c.color}`} />
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {reminders.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-orange-400" />Pending Reminders</CardTitle></CardHeader>
          <CardContent>
            {reminders.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.description}</p></div>
                <Badge variant="outline">{r.due_date || 'No date'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
