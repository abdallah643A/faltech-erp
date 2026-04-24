import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Check, X, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PortalChangeOrders({ portal, client }: { portal: any; client: any }) {
  const { t } = useLanguage();
  const pc = portal.primary_color || '#1e40af';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState<Record<string, string>>({});

  const { data: changeOrders = [], isLoading } = useQuery({
    queryKey: ['portal-cos', portal.customer_id],
    queryFn: async (): Promise<any[]> => {
      if (!portal.customer_id) return [];
      const { data: projects } = await (supabase as any)
        .from('cpms_projects')
        .select('id')
        .eq('customer_id', portal.customer_id);
      if (!projects || projects.length === 0) return [];
      
      const projectIds = (projects as any[]).map((p: any) => p.id);
      const { data } = await supabase
        .from('cpms_change_orders')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!portal.customer_id,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('cpms_change_orders').update({
        status: action,
        approved_date: action === 'approved' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['portal-cos'] });
      toast({ title: `Change order ${action}` });
    },
  });

  const pending = changeOrders.filter((co: any) => co.status === 'submitted');
  const resolved = changeOrders.filter((co: any) => co.status !== 'submitted' && co.status !== 'draft');

  const statusColor = (s: string) => {
    if (s === 'approved' || s === 'invoiced') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (s === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
    if (s === 'submitted') return 'bg-amber-50 text-amber-600 border-amber-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Change Orders</h2>
        <p className="text-sm text-gray-500">Review and approve scope changes to your projects.</p>
      </div>

      {/* Pending Approval */}
      {pending.length > 0 && (
        <Card className="border-2 border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" /> Action Required ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.map((co: any) => (
              <div key={co.id} className="p-4 rounded-lg border bg-amber-50/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{co.co_number} — {co.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{co.description}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>Reason: {co.reason}</span>
                      {co.submitted_date && <span>Submitted: {format(new Date(co.submitted_date), 'MMM dd, yyyy')}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: pc }}>
                      {Number(co.billing_amount || 0).toLocaleString()} SAR
                    </p>
                    <p className="text-xs text-gray-500">Schedule: +{co.schedule_impact_days || 0} days</p>
                  </div>
                </div>

                {portal.allow_co_approval && (
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      value={comment[co.id] || ''}
                      onChange={e => setComment({ ...comment, [co.id]: e.target.value })}
                      placeholder="Add a comment (optional)..."
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => approveMutation.mutate({ id: co.id, action: 'rejected' })}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                      <Button size="sm" className="text-white" style={{ backgroundColor: pc }}
                        onClick={() => approveMutation.mutate({ id: co.id, action: 'approved' })}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-400 py-6">{t('common.loading')}</p>
          ) : resolved.length === 0 && pending.length === 0 ? (
            <p className="text-center text-gray-400 py-6">No change orders found.</p>
          ) : (
            <div className="space-y-2">
              {resolved.map((co: any) => (
                <div key={co.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                      <ClipboardList className="h-4 w-4" style={{ color: pc }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{co.co_number} — {co.title}</p>
                      <p className="text-xs text-gray-500">{co.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{Number(co.billing_amount || 0).toLocaleString()} SAR</span>
                    <Badge variant="outline" className={statusColor(co.status)}>{co.status}</Badge>
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
