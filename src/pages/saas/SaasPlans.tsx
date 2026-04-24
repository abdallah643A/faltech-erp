import { useState } from 'react';
import { useSaasPlans, useCreatePlan as useCreateSaasPlan, useUpdatePlan as useUpdateSaasPlan } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Package } from 'lucide-react';

const tierColor: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800',
  starter: 'bg-blue-100 text-blue-800',
  standard: 'bg-green-100 text-green-800',
  professional: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-amber-100 text-amber-800',
};

export default function SaasPlans() {
  const { data: plans = [] } = useSaasPlans();
  const createPlan = useCreateSaasPlan();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    plan_name: '', plan_code: '', tier: 'standard', base_price: 0, price_per_user: 0,
    max_seats: 10, max_companies: 1, max_storage_gb: 10, billing_cycle: 'monthly', description: '',
  });

  const handleCreate = async () => {
    if (!form.plan_name || !form.plan_code) return;
    await createPlan.mutateAsync(form);
    setShowCreate(false);
    setForm({ plan_name: '', plan_code: '', tier: 'standard', base_price: 0, price_per_user: 0, max_seats: 10, max_companies: 1, max_storage_gb: 10, billing_cycle: 'monthly', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">Define pricing plans and module bundles</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Plan</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Subscription Plan</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Plan Name</Label><Input value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))} /></div>
                <div><Label>Plan Code</Label><Input value={form.plan_code} onChange={e => setForm(f => ({ ...f, plan_code: e.target.value.toUpperCase() }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tier</Label>
                  <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Billing Cycle</Label>
                  <Select value={form.billing_cycle} onValueChange={v => setForm(f => ({ ...f, billing_cycle: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Base Price (SAR)</Label><Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: +e.target.value }))} /></div>
                <div><Label>Per User (SAR)</Label><Input type="number" value={form.price_per_user} onChange={e => setForm(f => ({ ...f, price_per_user: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Max Seats</Label><Input type="number" value={form.max_seats} onChange={e => setForm(f => ({ ...f, max_seats: +e.target.value }))} /></div>
                <div><Label>Max Companies</Label><Input type="number" value={form.max_companies} onChange={e => setForm(f => ({ ...f, max_companies: +e.target.value }))} /></div>
                <div><Label>Storage (GB)</Label><Input type="number" value={form.max_storage_gb} onChange={e => setForm(f => ({ ...f, max_storage_gb: +e.target.value }))} /></div>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <Button onClick={handleCreate} disabled={createPlan.isPending} className="w-full">Create Plan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p: any) => (
          <Card key={p.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{p.plan_name}</CardTitle>
                <Badge className={tierColor[p.tier] || ''}>{p.tier}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Base Price</span><span className="font-bold">{p.base_price} SAR/{p.billing_cycle}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Per User</span><span className="font-bold">{p.price_per_user} SAR</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Max Seats</span><span>{p.max_seats || '∞'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Companies</span><span>{p.max_companies}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Storage</span><span>{p.max_storage_gb} GB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Modules</span><span>{p.saas_plan_modules?.length || 0}</span></div>
              </div>
              {!p.is_active && <Badge className="mt-3 bg-gray-100 text-gray-600">Inactive</Badge>}
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && (
          <Card className="col-span-3"><CardContent className="py-12 text-center text-muted-foreground">No plans created yet</CardContent></Card>
        )}
      </div>
    </div>
  );
}
