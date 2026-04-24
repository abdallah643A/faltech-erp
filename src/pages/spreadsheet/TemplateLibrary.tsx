import { useState } from 'react';
import { useTemplates } from '@/hooks/useSpreadsheetStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Layout, Star, Copy } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['budget', 'forecast', 'cashflow', 'manpower', 'procurement', 'boardpack', 'custom'];

const SYSTEM_TEMPLATES = [
  { name: 'Annual Budget Template', category: 'budget', description: '12-month budget with department breakdown, variance analysis, and approval workflow columns' },
  { name: 'Sales Forecast Template', category: 'forecast', description: 'Quarterly sales forecast by region, product line, and channel with pipeline weighting' },
  { name: 'Project Cash Flow', category: 'cashflow', description: 'Monthly cash inflows/outflows by project with cumulative tracking and milestone triggers' },
  { name: 'Manpower Planning', category: 'manpower', description: 'Headcount planning by department, grade, and cost center with salary projections' },
  { name: 'Procurement Schedule', category: 'procurement', description: 'Material and service procurement timeline with committed vs forecast spend' },
  { name: 'Board Pack Summary', category: 'boardpack', description: 'Executive summary with KPIs, financial highlights, risk register, and strategic initiatives' },
];

export default function TemplateLibrary() {
  const { data: templates = [], isLoading, create } = useTemplates();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'budget' });

  const allTemplates = [...SYSTEM_TEMPLATES.map((t, i) => ({ ...t, id: `sys-${i}`, is_system: true })), ...templates];
  const filtered = allTemplates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== 'all' && t.category !== catFilter) return false;
    return true;
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    create.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({ name: '', description: '', category: 'budget' }); } });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template Library</h1>
          <p className="text-muted-foreground">Reusable spreadsheet templates for common planning scenarios</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Template</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layout className="h-4 w-4 text-primary" />{t.name}
                </CardTitle>
                {t.is_system && <Badge variant="outline" className="text-xs"><Star className="h-3 w-3 mr-1" />System</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{t.category}</Badge>
                <Button size="sm" variant="outline" onClick={() => toast.info('Template will be used when creating a new workbook')}>
                  <Copy className="h-3.5 w-3.5 mr-1" />Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
