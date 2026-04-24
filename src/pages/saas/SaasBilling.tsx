import { useSaasTenants, useSaasPlans } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, Package } from 'lucide-react';

export default function SaasBilling() {
  const { data: tenants = [] } = useSaasTenants();
  const { data: plans = [] } = useSaasPlans();

  const activeTenants = tenants.filter((t: any) => t.status === 'active');
  const totalSeats = tenants.reduce((sum: number, t: any) => sum + (t.saas_seat_licenses?.[0]?.count || 0), 0);

  // MRR placeholder calculation
  const estimatedMRR = activeTenants.reduce((sum: number, t: any) => {
    const sub = t.saas_tenant_subscriptions?.[0];
    if (!sub?.saas_subscription_plans) return sum;
    const plan = sub.saas_subscription_plans;
    const seats = t.saas_seat_licenses?.[0]?.count || 1;
    return sum + (plan.base_price || 0) + (plan.price_per_user || 0) * seats;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Usage Overview</h1>
        <p className="text-muted-foreground">Revenue tracking and usage metrics (placeholder)</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{estimatedMRR.toLocaleString()} SAR</p>
              <p className="text-xs text-muted-foreground">Est. Monthly Revenue</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{activeTenants.length}</p>
              <p className="text-xs text-muted-foreground">Paying Clients</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{totalSeats}</p>
              <p className="text-xs text-muted-foreground">Total Paid Seats</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{plans.filter((p: any) => p.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Active Plans</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Client Revenue Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeTenants.map((t: any) => {
              const sub = t.saas_tenant_subscriptions?.[0];
              const plan = sub?.saas_subscription_plans;
              const seats = t.saas_seat_licenses?.[0]?.count || 0;
              const revenue = plan ? (plan.base_price || 0) + (plan.price_per_user || 0) * seats : 0;
              return (
                <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{t.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{plan?.plan_name || 'No plan'} • {seats} seats</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{revenue.toLocaleString()} SAR</p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>
              );
            })}
            {activeTenants.length === 0 && <p className="text-center text-muted-foreground py-8">No active paying clients</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
