import { useSaasTenants, useSaasPlans, useSaasModules } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Package, DollarSign, AlertTriangle, TrendingUp, Clock, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  suspended: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export default function SaasOverview() {
  const { t } = useLanguage();
  const { data: tenants = [] } = useSaasTenants();
  const { data: plans = [] } = useSaasPlans();
  const { data: modules = [] } = useSaasModules();

  const active = tenants.filter((t: any) => t.status === 'active').length;
  const trial = tenants.filter((t: any) => t.status === 'trial').length;
  const suspended = tenants.filter((t: any) => t.status === 'suspended').length;
  const expired = tenants.filter((t: any) => t.status === 'expired').length;
  const totalSeats = tenants.reduce((sum: number, t: any) => sum + (t.saas_seat_licenses?.[0]?.count || 0), 0);
  const premiumModules = modules.filter((m: any) => m.is_premium).length;

  const kpis = [
    { label: 'Total Clients', value: tenants.length, icon: Building2, color: 'text-blue-600' },
    { label: 'Active', value: active, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Trial', value: trial, icon: Clock, color: 'text-blue-600' },
    { label: 'Suspended', value: suspended, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Expired', value: expired, icon: AlertTriangle, color: 'text-orange-600' },
    { label: 'Active Seats', value: totalSeats, icon: Users, color: 'text-purple-600' },
    { label: 'Plans', value: plans.length, icon: Package, color: 'text-indigo-600' },
    { label: 'Premium Modules', value: premiumModules, icon: Shield, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SaaS Administration</h1>
        <p className="text-muted-foreground">Manage clients, subscriptions, modules, and tenant security</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <k.icon className={`h-5 w-5 ${k.color}`} />
                <div>
                  <p className="text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Clients</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenants.slice(0, 8).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{t.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{t.contact_email}</p>
                  </div>
                  <Badge className={statusColor[t.status] || ''}>{t.status}</Badge>
                </div>
              ))}
              {tenants.length === 0 && <p className="text-sm text-muted-foreground">No clients yet</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subscription Plans</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plans.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{p.plan_name}</p>
                    <p className="text-xs text-muted-foreground">{p.tier} • {p.billing_cycle}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{p.base_price} SAR</p>
                    <p className="text-xs text-muted-foreground">+{p.price_per_user}/user</p>
                  </div>
                </div>
              ))}
              {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans created</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
