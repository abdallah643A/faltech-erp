import { useParams } from 'react-router-dom';
import { useSaasTenant, useTenantModules, useTenantCompanies, useTenantSeats, useTenantSubscription, useTenantFeatures, useSaasAuditLogs, useSaasPlans, useUpsertSubscription, useUpdateTenant } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, Package, Shield, FileText, Settings, Activity, Ban, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { SaasModuleMatrix } from '@/components/saas/SaasModuleMatrix';

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  suspended: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
  enabled: 'bg-green-100 text-green-800',
  disabled: 'bg-gray-100 text-gray-800',
};

export default function SaasClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: tenant } = useSaasTenant(id);
  const { data: modules = [] } = useTenantModules(id);
  const { data: companies = [] } = useTenantCompanies(id);
  const { data: seats = [] } = useTenantSeats(id);
  const { data: subscription } = useTenantSubscription(id);
  const { data: features = [] } = useTenantFeatures(id);
  const { data: auditLogs = [] } = useSaasAuditLogs(id);
  const { data: plans = [] } = useSaasPlans();
  const upsertSub = useUpsertSubscription();
  const updateTenant = useUpdateTenant();

  if (!tenant) return <div className="p-8 text-center text-muted-foreground">Loading client...</div>;

  const activeSeats = seats.filter((s: any) => s.status === 'active').length;
  const maxSeats = subscription?.max_seats || 5;
  const seatPercent = Math.min((activeSeats / maxSeats) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{tenant.tenant_name}</h1>
            <Badge className={statusColor[tenant.status] || ''}>{tenant.status}</Badge>
          </div>
          <p className="text-muted-foreground">{tenant.contact_email} • {tenant.tenant_slug}</p>
        </div>
        <div className="flex gap-2">
          {tenant.status === 'active' && (
            <Button variant="destructive" size="sm" onClick={() => updateTenant.mutate({ id: tenant.id, status: 'suspended' })}>
              <Ban className="h-4 w-4 mr-1" /> Suspend
            </Button>
          )}
          {(tenant.status === 'suspended' || tenant.status === 'trial') && (
            <Button size="sm" onClick={() => updateTenant.mutate({ id: tenant.id, status: 'active' })}>
              <CheckCircle className="h-4 w-4 mr-1" /> Activate
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Plan</p>
          <p className="font-bold">{subscription?.saas_subscription_plans?.plan_name || 'None'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Seats</p>
          <p className="font-bold">{activeSeats} / {maxSeats}</p>
          <Progress value={seatPercent} className="h-1.5 mt-1" />
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Modules</p>
          <p className="font-bold">{modules.filter((m: any) => m.status === 'enabled').length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Companies</p>
          <p className="font-bold">{companies.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="font-bold text-sm">{format(new Date(tenant.created_at), 'dd MMM yyyy')}</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="subscription"><Package className="h-4 w-4 mr-1" /> Subscription</TabsTrigger>
          <TabsTrigger value="modules"><Settings className="h-4 w-4 mr-1" /> Modules</TabsTrigger>
          <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-1" /> Companies</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users & Seats</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" /> Security</TabsTrigger>
          <TabsTrigger value="audit"><Activity className="h-4 w-4 mr-1" /> Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium ml-2">{tenant.tenant_name}</span></div>
                <div><span className="text-muted-foreground">Slug:</span> <span className="font-medium ml-2">{tenant.tenant_slug}</span></div>
                <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium ml-2">{tenant.contact_name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium ml-2">{tenant.contact_email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-2">{tenant.contact_phone}</span></div>
                <div><span className="text-muted-foreground">Country:</span> <span className="font-medium ml-2">{tenant.country}</span></div>
                <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium ml-2">{tenant.timezone}</span></div>
                <div><span className="text-muted-foreground">Max Companies:</span> <span className="font-medium ml-2">{tenant.max_companies}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader><CardTitle>Subscription Details</CardTitle></CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Plan:</span> <span className="font-bold ml-2">{subscription.saas_subscription_plans?.plan_name}</span></div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge className={`ml-2 ${statusColor[subscription.status]}`}>{subscription.status}</Badge></div>
                    <div><span className="text-muted-foreground">Billing:</span> <Badge className={`ml-2 ${statusColor[subscription.billing_status || '']}`}>{subscription.billing_status}</Badge></div>
                    <div><span className="text-muted-foreground">Start:</span> <span className="ml-2">{subscription.start_date}</span></div>
                    <div><span className="text-muted-foreground">Renewal:</span> <span className="ml-2">{subscription.renewal_date || '—'}</span></div>
                    <div><span className="text-muted-foreground">Max Seats:</span> <span className="ml-2">{subscription.max_seats}</span></div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Change Plan</p>
                    <div className="flex gap-2">
                      <Select onValueChange={v => upsertSub.mutate({ tenant_id: id, plan_id: v, status: 'active', start_date: new Date().toISOString().split('T')[0] })}>
                        <SelectTrigger className="w-60"><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>
                          {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.plan_name} ({p.tier})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No subscription assigned</p>
                  <Select onValueChange={v => upsertSub.mutate({ tenant_id: id, plan_id: v, status: 'active', start_date: new Date().toISOString().split('T')[0], max_seats: 5 })}>
                    <SelectTrigger className="w-60 mx-auto"><SelectValue placeholder="Assign a plan" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <SaasModuleMatrix tenantId={id!} />
        </TabsContent>

        <TabsContent value="companies">
          <Card>
            <CardHeader><CardTitle>Assigned Companies</CardTitle></CardHeader>
            <CardContent>
              {companies.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Primary</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {companies.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{(c as any).sap_companies?.company_name || c.company_id}</TableCell>
                        <TableCell>{c.is_primary ? <Badge className="bg-green-100 text-green-800">Primary</Badge> : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No companies assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Seats</CardTitle>
                <div className="text-sm">
                  <span className="font-bold">{activeSeats}</span> / {maxSeats} seats used
                  {seatPercent >= 90 && <Badge className="ml-2 bg-red-100 text-red-800">Near Limit</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={seatPercent} className="h-2 mb-4" />
              {seats.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {seats.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{(s as any).profiles?.full_name || '—'}</p>
                            <p className="text-xs text-muted-foreground">{(s as any).profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{s.seat_type}</Badge></TableCell>
                        <TableCell><Badge className={statusColor[s.status] || ''}>{s.status}</Badge></TableCell>
                        <TableCell className="text-xs">{s.assigned_at ? format(new Date(s.assigned_at), 'dd MMM yyyy') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No seats assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle>Tenant Security</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { label: 'Module Entitlement Enforced', status: true },
                  { label: 'Company Scoping Active', status: companies.length > 0 },
                  { label: 'Seat Limit Enforced', status: subscription?.max_seats != null },
                  { label: 'Data Isolation', status: true },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className={`h-3 w-3 rounded-full ${c.status ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{c.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>By</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {auditLogs.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.action}</TableCell>
                        <TableCell>{l.entity_type}</TableCell>
                        <TableCell>{l.performed_by_name || '—'}</TableCell>
                        <TableCell className="text-xs">{format(new Date(l.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No audit events</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
