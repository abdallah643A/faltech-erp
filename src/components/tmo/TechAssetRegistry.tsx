import { useState } from 'react';
import { useTMOPortfolio, TMOTechAsset } from '@/hooks/useTMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Plus, Cpu, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const lifecycleColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  supported: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  end_of_life: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  decommissioned: 'bg-muted text-muted-foreground',
  planned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const categories = ['core_network', 'oss_bss', 'digital', 'enterprise_it', 'security'];

export function TechAssetRegistry() {
  const { techAssets, createTechAsset } = useTMOPortfolio();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [form, setForm] = useState({
    name: '', description: '', asset_code: '', category: 'enterprise_it', vendor: '',
    version: '', lifecycle_status: 'active', deployment_type: 'on_premise',
    business_criticality: 'medium', owner_department: '', owner_name: '',
    stability_score: 3, supportability_score: 3, strategic_fit_score: 3, cost_efficiency_score: 3,
    acquisition_cost: 0, annual_license_cost: 0, annual_support_cost: 0, annual_infra_cost: 0,
    go_live_date: '', end_of_support_date: '',
  });

  const filtered = techAssets
    .filter(a => filterCategory === 'all' || a.category === filterCategory)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.vendor?.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = () => {
    if (!form.name) return;
    createTechAsset.mutate({
      ...form,
      go_live_date: form.go_live_date || null,
      end_of_support_date: form.end_of_support_date || null,
      created_by: user?.id,
    } as any);
    setIsOpen(false);
  };

  // Rationalization flags
  const duplicates = techAssets.reduce((acc, a) => {
    const key = `${a.category}-${a.subcategory || ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> Technology Asset Registry</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Asset</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' / ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Asset Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>TCO (3yr)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tech assets registered</TableCell></TableRow>
              ) : filtered.map(asset => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      {asset.asset_code && <p className="text-xs text-muted-foreground">{asset.asset_code}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{asset.category.replace('_', '/')}</Badge></TableCell>
                  <TableCell className="text-sm">{asset.vendor || '—'}</TableCell>
                  <TableCell><Badge className={lifecycleColors[asset.lifecycle_status] || ''}>{asset.lifecycle_status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell><Badge variant={asset.business_criticality === 'critical' ? 'destructive' : 'outline'}>{asset.business_criticality}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={(asset.health_score || 0) * 20} className="h-2 w-12" />
                      <span className="text-sm font-medium">{(asset.health_score || 0).toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{(asset.total_cost_of_ownership || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Asset Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register Technology Asset</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Asset Code</Label><Input value={form.asset_code} onChange={e => setForm({...form, asset_code: e.target.value})} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' / ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} /></div>
              <div><Label>Version</Label><Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Lifecycle Status</Label>
                <Select value={form.lifecycle_status} onValueChange={v => setForm({...form, lifecycle_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['active','supported','end_of_life','decommissioned','planned'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Deployment</Label>
                <Select value={form.deployment_type} onValueChange={v => setForm({...form, deployment_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['on_premise','cloud','hybrid','saas'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Criticality</Label>
                <Select value={form.business_criticality} onValueChange={v => setForm({...form, business_criticality: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Health Scores */}
            <div>
              <Label className="text-sm font-semibold">Health Scores (1-5)</Label>
              <div className="grid grid-cols-4 gap-3 mt-1">
                {(['stability_score','supportability_score','strategic_fit_score','cost_efficiency_score'] as const).map(field => (
                  <div key={field}>
                    <Label className="text-xs">{field.replace('_score','').replace('_', ' ')}</Label>
                    <Select value={String(form[field])} onValueChange={v => setForm({...form, [field]: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Fields */}
            <div>
              <Label className="text-sm font-semibold">Cost (TCO)</Label>
              <div className="grid grid-cols-4 gap-3 mt-1">
                <div><Label className="text-xs">Acquisition</Label><Input type="number" value={form.acquisition_cost} onChange={e => setForm({...form, acquisition_cost: Number(e.target.value)})} /></div>
                <div><Label className="text-xs">License/yr</Label><Input type="number" value={form.annual_license_cost} onChange={e => setForm({...form, annual_license_cost: Number(e.target.value)})} /></div>
                <div><Label className="text-xs">Support/yr</Label><Input type="number" value={form.annual_support_cost} onChange={e => setForm({...form, annual_support_cost: Number(e.target.value)})} /></div>
                <div><Label className="text-xs">Infra/yr</Label><Input type="number" value={form.annual_infra_cost} onChange={e => setForm({...form, annual_infra_cost: Number(e.target.value)})} /></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Go-Live Date</Label><Input type="date" value={form.go_live_date} onChange={e => setForm({...form, go_live_date: e.target.value})} /></div>
              <div><Label>End of Support</Label><Input type="date" value={form.end_of_support_date} onChange={e => setForm({...form, end_of_support_date: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Owner Dept</Label><Input value={form.owner_department} onChange={e => setForm({...form, owner_department: e.target.value})} /></div>
              <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name}>Register Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
