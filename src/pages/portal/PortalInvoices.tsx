import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, DollarSign, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PortalInvoices({ portal }: { portal: any }) {
  const { t } = useLanguage();
  const pc = portal.primary_color || '#1e40af';
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['portal-invoices-all', portal.customer_id],
    queryFn: async () => {
      if (!portal.customer_id) return [];
      const { data } = await supabase
        .from('ar_invoices')
        .select('id, doc_num, doc_date, total, status, currency, balance_due, doc_due_date, subtotal, tax_amount')
        .eq('customer_id', portal.customer_id)
        .order('doc_date', { ascending: false });
      return data || [];
    },
    enabled: !!portal.customer_id,
  });

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((i: any) => i.status === statusFilter);
  const totalOutstanding = invoices.reduce((s: number, i: any) => s + (i.balance_due || 0), 0);
  const totalPaid = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.total || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Invoices</h2>
        <p className="text-sm text-gray-500">View and manage your invoices.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-xl font-bold mt-1 text-amber-600">{totalOutstanding.toLocaleString()} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Total Paid</p>
            <p className="text-xl font-bold mt-1 text-emerald-600">{totalPaid.toLocaleString()} SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Total Invoices</p>
            <p className="text-xl font-bold mt-1">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No invoices found.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                      <FileText className="h-5 w-5" style={{ color: pc }} />
                    </div>
                    <div>
                      <p className="font-medium">INV-{inv.doc_num}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(inv.doc_date), 'MMM dd, yyyy')}
                        {inv.doc_due_date && ` · Due: ${format(new Date(inv.doc_due_date), 'MMM dd, yyyy')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{(inv.total || 0).toLocaleString()} {inv.currency || 'SAR'}</p>
                      {inv.balance_due > 0 && (
                        <p className="text-xs text-amber-600">Due: {inv.balance_due.toLocaleString()}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={
                      inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      inv.status === 'overdue' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }>
                      {inv.status}
                    </Badge>
                    {portal.show_pay_button && inv.balance_due > 0 && (
                      <Button size="sm" className="text-white" style={{ backgroundColor: pc }}>
                        <DollarSign className="h-3 w-3 mr-1" /> Pay
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
