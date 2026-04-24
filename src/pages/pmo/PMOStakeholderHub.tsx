import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Mail, FileText, Send, Clock, Users, Plus, CalendarDays,
  CheckCircle2, AlertTriangle, BarChart3, Eye
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const REPORT_TYPES = ['status_update', 'risk_summary', 'milestone_report', 'executive_brief', 'weekly_digest'];
const SCHEDULE_TYPES = ['daily', 'weekly', 'biweekly', 'monthly'];

export default function PMOStakeholderHub() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { profile } = useAuth();
  const { projects = [] } = useProjects();
  const { risks, issues, programs } = usePMOPortfolio();
  const [activeTab, setActiveTab] = useState('reports');
  const [createDialog, setCreateDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', report_type: 'status_update', project_id: '', schedule_type: '',
    recipients: [] as { name: string; email: string; role: string }[],
    recipientName: '', recipientEmail: '', recipientRole: '',
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['pmo-stakeholder-reports', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_stakeholder_reports').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createReport = useMutation({
    mutationFn: async (data: any) => {
      // Auto-generate KPI highlights and risk summary
      const project = projects.find(p => p.id === data.project_id);
      const projectRisks = risks.filter(r => r.project_id === data.project_id);
      const projectIssues = issues.filter(i => i.project_id === data.project_id);

      const kpiHighlights = [
        { label: 'Budget Health', value: project?.status || 'N/A', status: 'green' },
        { label: 'Schedule Status', value: project?.status || 'N/A', status: project?.status === 'on_hold' ? 'yellow' : 'green' },
        { label: 'Open Risks', value: projectRisks.filter(r => r.status === 'open').length, status: projectRisks.filter(r => r.status === 'open' && r.risk_score > 15).length > 0 ? 'red' : 'green' },
        { label: 'Open Issues', value: projectIssues.filter(i => i.status === 'open').length, status: projectIssues.filter(i => i.severity === 'critical').length > 0 ? 'red' : 'green' },
      ];

      const riskSummary = projectRisks.slice(0, 5).map(r => ({
        title: r.title, score: r.risk_score, status: r.status, mitigation: r.mitigation_plan,
      }));

      const { error } = await supabase.from('pmo_stakeholder_reports').insert({
        title: data.title,
        report_type: data.report_type,
        project_id: data.project_id || null,
        kpi_highlights: kpiHighlights,
        risk_summary: riskSummary,
        recipients: data.recipients,
        schedule_type: data.schedule_type || null,
        status: 'draft',
        company_id: activeCompanyId,
        created_by: profile?.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-stakeholder-reports'] });
      toast({ title: 'Report created' });
      setCreateDialog(false);
      setForm({ title: '', report_type: 'status_update', project_id: '', schedule_type: '', recipients: [], recipientName: '', recipientEmail: '', recipientRole: '' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const sendReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.from('pmo_stakeholder_reports').update({
        status: 'sent', sent_at: new Date().toISOString(), sent_by: profile?.full_name, sent_by_id: profile?.user_id,
      }).eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-stakeholder-reports'] });
      toast({ title: 'Report marked as sent' });
    },
  });

  const addRecipient = () => {
    if (!form.recipientName || !form.recipientEmail) return;
    setForm(p => ({
      ...p,
      recipients: [...p.recipients, { name: p.recipientName, email: p.recipientEmail, role: p.recipientRole }],
      recipientName: '', recipientEmail: '', recipientRole: '',
    }));
  };

  const drafts = reports.filter(r => r.status === 'draft');
  const sent = reports.filter(r => r.status === 'sent');
  const scheduled = reports.filter(r => r.schedule_type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stakeholder Communication Hub</h1>
          <p className="text-muted-foreground">Automated status reports, KPI highlights, and risk summaries</p>
        </div>
        <Button size="sm" onClick={() => setCreateDialog(true)}><Plus className="h-4 w-4 mr-1" /> Create Report</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Total Reports</span></div>
          <p className="text-2xl font-bold">{reports.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Drafts</span></div>
          <p className="text-2xl font-bold">{drafts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Send className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Sent</span></div>
          <p className="text-2xl font-bold">{sent.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><CalendarDays className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Scheduled</span></div>
          <p className="text-2xl font-bold">{scheduled.length}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1" /> All Reports</TabsTrigger>
          <TabsTrigger value="scheduled"><CalendarDays className="h-4 w-4 mr-1" /> Scheduled</TabsTrigger>
          <TabsTrigger value="templates"><BarChart3 className="h-4 w-4 mr-1" /> Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell><Badge variant="outline">{r.report_type?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'sent' ? 'default' : r.status === 'draft' ? 'secondary' : 'outline'}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{Array.isArray(r.recipients) ? r.recipients.length : 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setPreviewDialog(r)}><Eye className="h-3.5 w-3.5" /></Button>
                          {r.status === 'draft' && (
                            <Button size="sm" variant="ghost" onClick={() => sendReport.mutate(r.id)}><Send className="h-3.5 w-3.5" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No reports yet. Create your first stakeholder report.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardContent className="pt-4">
              {scheduled.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No scheduled reports. Create a report with a schedule to automate delivery.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Next Send</TableHead>
                      <TableHead>Recipients</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduled.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell><Badge variant="outline">{r.schedule_type}</Badge></TableCell>
                        <TableCell className="text-xs">{r.next_send_at ? new Date(r.next_send_at).toLocaleString() : '-'}</TableCell>
                        <TableCell>{Array.isArray(r.recipients) ? r.recipients.length : 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REPORT_TYPES.map(type => (
              <Card key={type} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setForm(p => ({ ...p, report_type: type, title: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) })); setCreateDialog(true); }}>
                <CardContent className="pt-4">
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-medium capitalize">{type.replace(/_/g, ' ')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {type === 'status_update' && 'Project status with KPIs and timeline'}
                    {type === 'risk_summary' && 'Risk register overview with mitigations'}
                    {type === 'milestone_report' && 'Milestone completion tracking'}
                    {type === 'executive_brief' && 'High-level executive summary'}
                    {type === 'weekly_digest' && 'Weekly activity and progress digest'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Report Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Stakeholder Report</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Report Type</Label>
              <Select value={form.report_type} onValueChange={v => setForm(p => ({ ...p, report_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Project (optional)</Label>
              <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Schedule (optional)</Label>
              <Select value={form.schedule_type} onValueChange={v => setForm(p => ({ ...p, schedule_type: v }))}>
                <SelectTrigger><SelectValue placeholder="No schedule (manual)" /></SelectTrigger>
                <SelectContent>{SCHEDULE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3">
              <Label>Recipients</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="Name" value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} className="flex-1" />
                <Input placeholder="Email" value={form.recipientEmail} onChange={e => setForm(p => ({ ...p, recipientEmail: e.target.value }))} className="flex-1" />
                <Button size="sm" variant="outline" onClick={addRecipient}>Add</Button>
              </div>
              {form.recipients.length > 0 && (
                <div className="mt-2 space-y-1">
                  {form.recipients.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-muted rounded">
                      <span>{r.name} ({r.email})</span>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setForm(p => ({ ...p, recipients: p.recipients.filter((_, idx) => idx !== i) }))}>×</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => createReport.mutate(form)} disabled={!form.title}>Create Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDialog} onOpenChange={() => setPreviewDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{previewDialog?.title}</DialogTitle></DialogHeader>
          {previewDialog && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline">{previewDialog.report_type?.replace(/_/g, ' ')}</Badge>
                <Badge variant={previewDialog.status === 'sent' ? 'default' : 'secondary'}>{previewDialog.status}</Badge>
              </div>

              {Array.isArray(previewDialog.kpi_highlights) && previewDialog.kpi_highlights.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">KPI Highlights</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(previewDialog.kpi_highlights as any[]).map((kpi: any, i: number) => (
                      <div key={i} className="p-2 border rounded flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{kpi.label}</span>
                        <Badge variant={kpi.status === 'red' ? 'destructive' : kpi.status === 'yellow' ? 'secondary' : 'default'}>
                          {String(kpi.value)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(previewDialog.risk_summary) && previewDialog.risk_summary.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Risk Summary</h4>
                  <div className="space-y-2">
                    {(previewDialog.risk_summary as any[]).map((risk: any, i: number) => (
                      <div key={i} className="p-2 border rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{risk.title}</span>
                          <Badge variant={risk.score > 15 ? 'destructive' : 'secondary'}>Score: {risk.score}</Badge>
                        </div>
                        {risk.mitigation && <p className="text-xs text-muted-foreground mt-1">{risk.mitigation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
