import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCPMS } from '@/hooks/useCPMS';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, FileText, Plus, Eye, Pencil, Trash2, Download, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const DEFAULT_SECTIONS = {
  daily: ['Weather Conditions', 'Manpower Summary', 'Equipment On-Site', 'Work Performed', 'Materials Received', 'Safety Observations', 'Issues & Delays', 'Photos'],
  weekly: ['Executive Summary', 'Schedule Status', 'Cost Summary', 'RFI Status', 'Submittal Log', 'Change Orders', 'Safety Statistics', 'Look-Ahead (2 weeks)', 'Key Risks'],
  monthly: ['Project Overview', 'Schedule Performance (SPI)', 'Cost Performance (CPI)', 'EVM Analysis', 'Cash Flow', 'Subcontractor Performance', 'Quality Metrics', 'HSE Summary', 'Procurement Status', 'Risk Register Update', 'Management Summary'],
};

interface Template { id?: string; name: string; type: string; sections: string[]; is_default: boolean; }
interface GeneratedReport { id?: string; template_id: string; project_id: string; report_type: string; period_start: string; period_end: string; data: any; status: string; }

export default function CPMSReportTemplates() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects } = useCPMS();
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState<Template>({ name: '', type: 'daily', sections: [...DEFAULT_SECTIONS.daily], is_default: false });
  const [genForm, setGenForm] = useState({ template_id: '', project_id: '', period_start: '', period_end: '' });

  const fetchAll = async () => {
    setLoading(true);
    const [tRes, rRes] = await Promise.all([
      supabase.from('cpms_report_templates' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('cpms_generated_reports' as any).select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setTemplates((tRes.data || []) as any[]);
    setReports((rRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveTemplate = async () => {
    if (!form.name) return;
    if (editTemplate?.id) {
      await supabase.from('cpms_report_templates' as any).update({ name: form.name, type: form.type, sections: form.sections, is_default: form.is_default, updated_at: new Date().toISOString() } as any).eq('id', editTemplate.id);
    } else {
      await supabase.from('cpms_report_templates' as any).insert({ ...form, created_by: user?.id } as any);
    }
    toast({ title: editTemplate ? 'Template updated' : 'Template created' });
    setShowForm(false);
    setEditTemplate(null);
    fetchAll();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('cpms_report_templates' as any).delete().eq('id', id);
    toast({ title: 'Template deleted' });
    fetchAll();
  };

  const handleGenerate = async () => {
    if (!genForm.template_id || !genForm.project_id || !genForm.period_start || !genForm.period_end) return;
    const template = templates.find(t => t.id === genForm.template_id);
    const project = projects.find(p => p.id === genForm.project_id);
    const reportData = {
      project_name: project?.name,
      project_code: project?.code,
      template_name: template?.name,
      sections: (template?.sections || []).map(s => ({ title: s, content: '', completed: false })),
      generated_at: new Date().toISOString(),
    };
    await supabase.from('cpms_generated_reports' as any).insert({
      template_id: genForm.template_id, project_id: genForm.project_id,
      report_type: template?.type || 'daily', period_start: genForm.period_start,
      period_end: genForm.period_end, data: reportData, status: 'draft', created_by: user?.id,
    } as any);
    toast({ title: 'Report generated', description: `${template?.type} report created for ${project?.name}` });
    setShowGenerate(false);
    fetchAll();
  };

  const setQuickPeriod = (type: string) => {
    const today = new Date();
    if (type === 'daily') {
      setGenForm(g => ({ ...g, period_start: format(today, 'yyyy-MM-dd'), period_end: format(today, 'yyyy-MM-dd') }));
    } else if (type === 'weekly') {
      setGenForm(g => ({ ...g, period_start: format(startOfWeek(today), 'yyyy-MM-dd'), period_end: format(endOfWeek(today), 'yyyy-MM-dd') }));
    } else {
      setGenForm(g => ({ ...g, period_start: format(startOfMonth(today), 'yyyy-MM-dd'), period_end: format(endOfMonth(today), 'yyyy-MM-dd') }));
    }
  };

  const toggleSection = (section: string) => {
    setForm(f => ({ ...f, sections: f.sections.includes(section) ? f.sections.filter(s => s !== section) : [...f.sections, section] }));
  };

  const typeColors: Record<string, string> = { daily: 'bg-blue-100 text-blue-800', weekly: 'bg-purple-100 text-purple-800', monthly: 'bg-emerald-100 text-emerald-800' };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cpms')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Report Templates</h1>
          <p className="text-sm text-muted-foreground">قوالب التقارير – Daily, Weekly, Monthly report generation</p>
        </div>
        <Button onClick={() => { setEditTemplate(null); setForm({ name: '', type: 'daily', sections: [...DEFAULT_SECTIONS.daily], is_default: false }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
        <Button variant="outline" onClick={() => setShowGenerate(true)}>
          <Download className="h-4 w-4 mr-1" /> Generate Report
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="generated">Generated Reports ({reports.length})</TabsTrigger></TabsList>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t.name}</CardTitle>
                    <Badge className={typeColors[t.type] || ''}>{t.type}</Badge>
                  </div>
                  {t.is_default && <Badge variant="outline" className="w-fit text-xs">Default</Badge>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{(t.sections as string[])?.length || 0} sections</p>
                    <div className="flex flex-wrap gap-1">
                      {((t.sections as string[]) || []).slice(0, 4).map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {((t.sections as string[]) || []).length > 4 && <Badge variant="secondary" className="text-xs">+{(t.sections as string[]).length - 4}</Badge>}
                    </div>
                    <div className="flex gap-1 pt-2">
                      <Button size="sm" variant="ghost" onClick={() => { setEditTemplate(t); setForm(t); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteTemplate(t.id!)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No templates yet. Create your first report template.</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="generated">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.type')}</TableHead><TableHead>Project</TableHead><TableHead>Period</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge className={typeColors[r.report_type] || ''}>{r.report_type}</Badge></TableCell>
                      <TableCell className="text-sm">{r.data?.project_name || '-'}</TableCell>
                      <TableCell className="text-xs">{r.period_start} → {r.period_end}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No reports generated yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTemplate ? 'Edit Template' : 'New Report Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Template Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekly Progress Report" /></div>
            <div><Label>Report Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, sections: [...DEFAULT_SECTIONS[v as keyof typeof DEFAULT_SECTIONS]] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sections</Label>
              <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto">
                {DEFAULT_SECTIONS[form.type as keyof typeof DEFAULT_SECTIONS].map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.sections.includes(s)} onCheckedChange={() => toggleSection(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: !!v }))} /> Set as default template</label>
            <Button onClick={handleSaveTemplate} className="w-full">{editTemplate ? 'Update' : 'Create'} Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Report Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Generate Report</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Template</Label>
              <Select value={genForm.template_id} onValueChange={v => { setGenForm(g => ({ ...g, template_id: v })); const t = templates.find(t => t.id === v); if (t) setQuickPeriod(t.type); }}>
                <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id!}>{t.name} ({t.type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Project</Label>
              <Select value={genForm.project_id} onValueChange={v => setGenForm(g => ({ ...g, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period Start</Label><Input type="date" value={genForm.period_start} onChange={e => setGenForm(g => ({ ...g, period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={genForm.period_end} onChange={e => setGenForm(g => ({ ...g, period_end: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod('daily')}><Clock className="h-3.5 w-3.5 mr-1" /> Today</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod('weekly')}><Calendar className="h-3.5 w-3.5 mr-1" /> This Week</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod('monthly')}><Calendar className="h-3.5 w-3.5 mr-1" /> This Month</Button>
            </div>
            <Button onClick={handleGenerate} className="w-full">Generate Report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
