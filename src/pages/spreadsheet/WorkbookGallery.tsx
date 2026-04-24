import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkbooks } from '@/hooks/useSpreadsheetStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, FileSpreadsheet, Clock, User, Lock, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const WORKBOOK_TYPES = [
  { value: 'budget', label: 'Budget Planning' },
  { value: 'forecast', label: 'Sales Forecasting' },
  { value: 'cashflow', label: 'Project Cash Flow' },
  { value: 'manpower', label: 'Manpower Planning' },
  { value: 'procurement', label: 'Procurement Planning' },
  { value: 'boardpack', label: 'Board Pack Analysis' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  review: 'bg-yellow-500/10 text-yellow-700',
  published: 'bg-green-500/10 text-green-700',
  archived: 'bg-destructive/10 text-destructive',
};

export default function WorkbookGallery() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: workbooks = [], isLoading, create, remove } = useWorkbooks();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', workbook_type: 'budget' });

  const filtered = workbooks.filter(wb => {
    if (search && !wb.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && wb.workbook_type !== typeFilter) return false;
    return true;
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    create.mutate(form, {
      onSuccess: () => { setShowCreate(false); setForm({ name: '', description: '', workbook_type: 'budget' }); },
    });
  };

  const stats = {
    total: workbooks.length,
    active: workbooks.filter(w => w.status === 'active').length,
    review: workbooks.filter(w => w.status === 'review').length,
    published: workbooks.filter(w => w.status === 'published').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workbook Gallery</h1>
          <p className="text-muted-foreground">Manage spreadsheet workbooks for planning and analysis</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Workbook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Workbook</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Budget FY2026" /></div>
              <div><Label>Type</Label>
                <Select value={form.workbook_type} onValueChange={v => setForm(p => ({ ...p, workbook_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WORKBOOK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <Button onClick={handleCreate} disabled={create.isPending} className="w-full">{create.isPending ? 'Creating...' : 'Create Workbook'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: FileSpreadsheet },
          { label: 'Active', value: stats.active, icon: Edit },
          { label: 'In Review', value: stats.review, icon: Clock },
          { label: 'Published', value: stats.published, icon: Lock },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className="h-8 w-8 text-primary" />
              <div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search workbooks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {WORKBOOK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No workbooks found. Create your first one!</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(wb => (
            <Card key={wb.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/spreadsheet/editor/${wb.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{wb.name}</CardTitle>
                  <Badge className={STATUS_COLORS[wb.status] || ''}>{wb.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {wb.description && <p className="text-sm text-muted-foreground line-clamp-2">{wb.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" />{WORKBOOK_TYPES.find(t => t.value === wb.workbook_type)?.label || wb.workbook_type}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(wb.updated_at), 'MMM dd')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{wb.owner_name || 'Unknown'}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {wb.is_locked && <Lock className="h-4 w-4 text-yellow-500" />}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(wb.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
