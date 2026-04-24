import { useState } from 'react';
import { useTMOPortfolio } from '@/hooks/useTMOPortfolio';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Plus, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

const tierColors: Record<string, string> = {
  strategic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  preferred: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  transactional: 'bg-muted text-muted-foreground',
};

export function TMOVendorManager() {
  const { vendors, createVendor } = useTMOPortfolio();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', tier: 'transactional', category: '', contact_name: '', contact_email: '',
    contract_value: 0, contract_start_date: '', contract_end_date: '', sla_terms: '',
    delivery_score: 3, quality_score: 3, responsiveness_score: 3, innovation_score: 3,
    financial_risk: 'low', dependency_risk: 'low', geopolitical_risk: 'low', notes: '',
  });

  // Contract expiry alerts
  const today = new Date();
  const expiringVendors = vendors.filter(v => {
    if (!v.contract_end_date) return false;
    const daysLeft = differenceInDays(parseISO(v.contract_end_date), today);
    return daysLeft > 0 && daysLeft <= 180;
  });

  const handleSubmit = () => {
    if (!form.name) return;
    createVendor.mutate({
      ...form,
      contract_start_date: form.contract_start_date || null,
      contract_end_date: form.contract_end_date || null,
      created_by: user?.id,
    } as any);
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Vendor Management</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Vendor</Button>
      </div>

      {/* Expiry Alerts */}
      {expiringVendors.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-400">Contract Expiry Alerts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {expiringVendors.map(v => {
                const daysLeft = differenceInDays(parseISO(v.contract_end_date!), today);
                return (
                  <Badge key={v.id} variant="outline" className="text-xs">
                    {v.name} — {daysLeft}d remaining
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contract Value</TableHead>
                <TableHead>Scorecard</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Contract End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No vendors registered</TableCell></TableRow>
              ) : vendors.map(vendor => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      {vendor.contact_name && <p className="text-xs text-muted-foreground">{vendor.contact_name}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge className={tierColors[vendor.tier]}>{vendor.tier}</Badge></TableCell>
                  <TableCell className="text-sm">{vendor.category || '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{vendor.contract_value?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={(vendor.overall_score || 0) * 20} className="h-2 w-12" />
                      <span className="text-sm">{(vendor.overall_score || 0).toFixed(1)}/5</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {vendor.financial_risk !== 'low' && <Badge variant="destructive" className="text-[10px]">Fin:{vendor.financial_risk}</Badge>}
                      {vendor.dependency_risk !== 'low' && <Badge variant="destructive" className="text-[10px]">Dep:{vendor.dependency_risk}</Badge>}
                      {vendor.financial_risk === 'low' && vendor.dependency_risk === 'low' && <span className="text-xs text-muted-foreground">Low</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{vendor.contract_end_date || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Vendor Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Tier</Label>
                <Select value={form.tier} onValueChange={v => setForm({...form, tier: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['strategic','preferred','transactional'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="hardware, software, etc." /></div>
              <div><Label>Contract Value</Label><Input type="number" value={form.contract_value} onChange={e => setForm({...form, contract_value: Number(e.target.value)})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} /></div>
              <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contract Start</Label><Input type="date" value={form.contract_start_date} onChange={e => setForm({...form, contract_start_date: e.target.value})} /></div>
              <div><Label>Contract End</Label><Input type="date" value={form.contract_end_date} onChange={e => setForm({...form, contract_end_date: e.target.value})} /></div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Scorecard (1-5)</Label>
              <div className="grid grid-cols-4 gap-3 mt-1">
                {(['delivery_score','quality_score','responsiveness_score','innovation_score'] as const).map(field => (
                  <div key={field}>
                    <Label className="text-xs">{field.replace('_score','')}</Label>
                    <Select value={String(form[field])} onValueChange={v => setForm({...form, [field]: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Risk Assessment</Label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                {(['financial_risk','dependency_risk','geopolitical_risk'] as const).map(field => (
                  <div key={field}>
                    <Label className="text-xs">{field.replace('_risk','')}</Label>
                    <Select value={form[field]} onValueChange={v => setForm({...form, [field]: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['low','medium','high'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div><Label>SLA Terms</Label><Textarea value={form.sla_terms} onChange={e => setForm({...form, sla_terms: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name}>Add Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
