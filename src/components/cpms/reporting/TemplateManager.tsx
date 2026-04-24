import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Layout, Pencil, Trash2, Eye, Copy } from 'lucide-react';
import type { MeasurementReportTemplate } from '@/hooks/useCPMSReporting';

interface Props {
  reporting: ReturnType<typeof import('@/hooks/useCPMSReporting').useCPMSReporting>;
}

const TEMPLATE_TYPES = [
  { value: 'standard', label: 'Standard', desc: 'Basic measurement report' },
  { value: 'executive', label: 'Executive', desc: 'High-level summary for management' },
  { value: 'technical', label: 'Technical', desc: 'Detailed technical report with calibration data' },
  { value: 'financial', label: 'Financial', desc: 'Cost analysis based on measurements' },
  { value: 'compliance', label: 'Compliance', desc: 'Regulatory compliance format' },
];

const DEFAULT_SECTIONS = [
  { id: 'header', label: 'Header & Logo', default: true },
  { id: 'project_info', label: 'Project Information', default: true },
  { id: 'drawing_info', label: 'Drawing Details', default: true },
  { id: 'calibration', label: 'Calibration Data', default: true },
  { id: 'summary_stats', label: 'Summary Statistics', default: true },
  { id: 'measurements_table', label: 'Measurements Table', default: true },
  { id: 'by_type_breakdown', label: 'Breakdown by Type', default: false },
  { id: 'charts', label: 'Charts & Visualizations', default: false },
  { id: 'notes', label: 'Notes & Observations', default: false },
  { id: 'footer', label: 'Footer & Page Numbers', default: true },
  { id: 'watermark', label: 'Watermark', default: false },
  { id: 'toc', label: 'Table of Contents', default: false },
];

export default function TemplateManager({ reporting }: Props) {
  const templates = reporting.templates.data || [];
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<MeasurementReportTemplate | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', template_type: 'standard',
    primary_color: '#1a56db', font: 'Inter', logo_url: '',
    sections: DEFAULT_SECTIONS.filter(s => s.default).map(s => s.id),
    is_shared: false, is_default: false,
  });

  const openNew = () => {
    setEditId(null);
    setForm({
      name: '', description: '', template_type: 'standard',
      primary_color: '#1a56db', font: 'Inter', logo_url: '',
      sections: DEFAULT_SECTIONS.filter(s => s.default).map(s => s.id),
      is_shared: false, is_default: false,
    });
    setShowForm(true);
  };

  const openEdit = (t: MeasurementReportTemplate) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      description: t.description || '',
      template_type: t.template_type,
      primary_color: t.branding_config?.primary_color || '#1a56db',
      font: t.branding_config?.font || 'Inter',
      logo_url: t.branding_config?.logo_url || '',
      sections: (t.sections as string[]) || [],
      is_shared: t.is_shared,
      is_default: t.is_default,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      description: form.description || null,
      template_type: form.template_type,
      branding_config: { primary_color: form.primary_color, font: form.font, logo_url: form.logo_url || null },
      sections: form.sections,
      is_shared: form.is_shared,
      is_default: form.is_default,
    };
    if (editId) {
      await reporting.updateTemplate.mutateAsync({ id: editId, ...payload });
      toast({ title: 'Template updated' });
    } else {
      await reporting.createTemplate.mutateAsync(payload);
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await reporting.deleteTemplate.mutateAsync(id);
  };

  const handleDuplicate = async (t: MeasurementReportTemplate) => {
    await reporting.createTemplate.mutateAsync({
      name: `${t.name} (Copy)`,
      description: t.description,
      template_type: t.template_type,
      branding_config: t.branding_config,
      sections: t.sections,
      is_shared: false,
      is_default: false,
    });
    toast({ title: 'Template duplicated' });
  };

  const toggleSection = (id: string) => {
    setForm(f => ({
      ...f,
      sections: f.sections.includes(id) ? f.sections.filter(s => s !== id) : [...f.sections, id],
    }));
  };

  const typeColors: Record<string, string> = {
    standard: 'bg-blue-100 text-blue-800',
    executive: 'bg-purple-100 text-purple-800',
    technical: 'bg-emerald-100 text-emerald-800',
    financial: 'bg-amber-100 text-amber-800',
    compliance: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center gap-2"><Layout className="h-4 w-4" /> Report Templates</h3>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{t.name}</CardTitle>
                <Badge className={typeColors[t.template_type] || ''}>{t.template_type}</Badge>
              </div>
              {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {t.is_default && <Badge variant="outline" className="text-xs">Default</Badge>}
                  {t.is_shared && <Badge variant="outline" className="text-xs">Shared</Badge>}
                  <Badge variant="secondary" className="text-xs">{(t.sections as string[])?.length || 0} sections</Badge>
                </div>
                {t.branding_config?.primary_color && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: t.branding_config.primary_color }} />
                    {t.branding_config.font || 'Default'}
                  </div>
                )}
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setShowPreview(t)} title="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(t)} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(t.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No templates yet. Create your first report template.</CardContent></Card>
        )}
      </div>

      {/* Template Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Template' : 'New Report Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Professional Summary Report" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Template Type</Label>
              <Select value={form.template_type} onValueChange={v => setForm(f => ({ ...f, template_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Font</Label>
                <Select value={form.font} onValueChange={v => setForm(f => ({ ...f, font: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Report Sections</Label>
              <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                {DEFAULT_SECTIONS.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                    <Checkbox checked={form.sections.includes(s.id)} onCheckedChange={() => toggleSection(s.id)} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_shared} onCheckedChange={v => setForm(f => ({ ...f, is_shared: !!v }))} /> Share with team</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: !!v }))} /> Set as default</label>
            </div>
            <Button onClick={handleSave} className="w-full">{editId ? 'Update' : 'Create'} Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Template Preview: {showPreview?.name}</DialogTitle></DialogHeader>
          {showPreview && (
            <div className="space-y-3">
              <div className="border rounded-md p-4" style={{ borderTopColor: showPreview.branding_config?.primary_color || '#1a56db', borderTopWidth: 4 }}>
                <div className="text-lg font-bold" style={{ color: showPreview.branding_config?.primary_color }}>{showPreview.name}</div>
                <p className="text-sm text-muted-foreground mt-1">{showPreview.description || 'No description'}</p>
                <div className="mt-4 space-y-2">
                  {((showPreview.sections as string[]) || []).map(s => {
                    const section = DEFAULT_SECTIONS.find(ds => ds.id === s);
                    return <div key={s} className="flex items-center gap-2 text-sm border-l-2 pl-2" style={{ borderColor: showPreview.branding_config?.primary_color }}>
                      {section?.label || s}
                    </div>;
                  })}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Type: {showPreview.template_type} | Font: {showPreview.branding_config?.font || 'Default'} | {(showPreview.sections as string[])?.length} sections
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
