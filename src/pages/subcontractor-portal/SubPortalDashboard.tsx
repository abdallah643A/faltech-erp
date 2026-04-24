import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalAccount, SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import {
  FileText, Users, TrendingUp, AlertTriangle, ClipboardList, CreditCard,
  CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  account: SubPortalAccount;
  subcontractor: SubPortalSubcontractor;
}

export default function SubPortalDashboard({ account, subcontractor }: Props) {
  const [stats, setStats] = useState({
    activeOrders: 0,
    pendingClaims: 0,
    openVariations: 0,
    pendingPunchItems: 0,
    totalContractValue: 0,
    totalPaid: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, [subcontractor.id]);

  const loadDashboard = async () => {
    const [ordersRes, claimsRes, variationsRes, punchRes] = await Promise.all([
      supabase.from('cpms_subcontract_orders').select('*').eq('subcontractor_id', subcontractor.id) as any,
      supabase.from('sub_progress_claims').select('*').eq('subcontractor_id', subcontractor.id).in('status', ['submitted', 'under_review']) as any,
      supabase.from('sub_variation_instructions').select('*').eq('subcontractor_id', subcontractor.id).in('status', ['issued', 'acknowledged', 'negotiating']) as any,
      supabase.from('sub_punch_list_responses').select('*').eq('subcontractor_id', subcontractor.id).in('response_status', ['pending', 'acknowledged', 'in_progress']) as any,
    ]);

    const orders = ordersRes.data || [];
    const activeOrders = orders.filter((o: any) => o.status === 'active' || o.status === 'in_progress');
    
    setStats({
      activeOrders: activeOrders.length,
      pendingClaims: (claimsRes.data || []).length,
      openVariations: (variationsRes.data || []).length,
      pendingPunchItems: (punchRes.data || []).length,
      totalContractValue: orders.reduce((s: number, o: any) => s + (o.contract_value || 0), 0),
      totalPaid: orders.reduce((s: number, o: any) => s + (o.paid_amount || 0), 0),
    });
    setRecentOrders(orders.slice(0, 5));
  };

  const cards = [
    { label: 'Active Contracts', value: stats.activeOrders, icon: FileText, color: 'text-blue-500', link: 'claims' },
    { label: 'Pending Claims', value: stats.pendingClaims, icon: CreditCard, color: 'text-orange-500', link: 'claims' },
    { label: 'Open Variations', value: stats.openVariations, icon: AlertTriangle, color: 'text-yellow-500', link: 'variations' },
    { label: 'Punch List Items', value: stats.pendingPunchItems, icon: ClipboardList, color: 'text-red-500', link: 'punch-list' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {account.contact_name || subcontractor.name}</h1>
        <p className="text-sm text-muted-foreground">{subcontractor.code} · {subcontractor.trade || 'General'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} to={`/subcontractor-portal/${c.link}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                  <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contract Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Contract Value</span>
                <span className="font-semibold">{stats.totalContractValue.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Paid</span>
                <span className="font-semibold text-green-600">{stats.totalPaid.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <span className="font-semibold text-orange-500">{(stats.totalContractValue - stats.totalPaid).toLocaleString()} SAR</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No contracts found</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{o.order_number}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{o.scope_description}</p>
                    </div>
                    <Badge variant={o.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {o.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}