import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Plus, Download, CheckCircle2, Clock, Send, BarChart3, BookOpen, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BoardPackGenerator() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState('templates');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', pack_type: 'monthly', description: '' });
  const [instanceForm, setInstanceForm] = useState({ template_id: '', title: '', reporting_period: '', narrative: '', executive_summary: '', strategic_notes: '' });
  const [showInstance, setShowInstance] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['board-pack-templates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('board_pack_templates' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: instances = [] } = useQuery({
    queryKey: ['board-pack-instances', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('board_pack_instances' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await (supabase.from('board_pack_templates' as any).insert({ ...t, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-pack-templates'] }); toast.success('Template created'); setShowCreate(false); },
  });

  const createInstance = useMutation({
    mutationFn: async (i: any) => {
      const { error } = await (supabase.from('board_pack_instances' as any).insert({ ...i, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-pack-instances'] }); toast.success('Board pack created'); setShowInstance(false); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from('board_pack_instances' as any).update({ status }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-pack-instances'] }); toast.success('Status updated'); },
  });

  const exportPDF = (inst: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(inst.title || 'Board Pack', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${inst.reporting_period}`, 14, 30);
    doc.text(`Status: ${inst.status}`, 14, 36);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);
    let y = 55;
    if (inst.executive_summary) {
      doc.setFontSize(14);
      doc.text('Executive Summary', 14, y);
      y += 8;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(inst.executive_summary, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 10;
    }
    if (inst.narrative) {
      doc.setFontSize(14);
      doc.text('Narrative', 14, y);
      y += 8;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(inst.narrative, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 10;
    }
    if (inst.strategic_notes) {
      doc.setFontSize(14);
      doc.text('Strategic Notes', 14, y);
      y += 8;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(inst.strategic_notes, 180);
      doc.text(lines, 14, y);
    }
    doc.save(`board-pack-${inst.reporting_period}.pdf`);
    toast.success('PDF exported');
  };

  const statusColor = (s: string) => {
    if (s === 'approved') return 'default';
    if (s === 'review') return 'secondary';
    if (s === 'exported') return 'outline';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Board Pack Generator</h1>
          <p className="text-muted-foreground">Assemble executive board packs from live ERP data</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="templates">Template Library</TabsTrigger>
          <TabsTrigger value="packs">Board Packs</TabsTrigger>
          <TabsTrigger value="review">Review & Approval</TabsTrigger>
          <TabsTrigger value="export">Export Center</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="flex justify-end mb-4">
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Template</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Pack Template</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Type</Label>
                    <Select value={form.pack_type} onValueChange={v => setForm({ ...form, pack_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="adhoc">Ad-hoc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                  <Button onClick={() => createTemplate.mutate(form)} disabled={!form.name}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((t: any) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    {t.name}
                    <Badge variant="outline">{t.pack_type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t.description || 'No description'}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => { setInstanceForm({ ...instanceForm, template_id: t.id, title: t.name }); setShowInstance(true); }}>
                    <FileText className="h-3 w-3 mr-1" />Generate Pack
                  </Button>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No templates yet</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="packs">
          <div className="flex justify-end mb-4">
            <Dialog open={showInstance} onOpenChange={setShowInstance}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Board Pack</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create Board Pack</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Title</Label><Input value={instanceForm.title} onChange={e => setInstanceForm({ ...instanceForm, title: e.target.value })} /></div>
                    <div><Label>Reporting Period</Label><Input placeholder="e.g. Q1 2026" value={instanceForm.reporting_period} onChange={e => setInstanceForm({ ...instanceForm, reporting_period: e.target.value })} /></div>
                  </div>
                  <div><Label>Executive Summary</Label><Textarea rows={3} value={instanceForm.executive_summary} onChange={e => setInstanceForm({ ...instanceForm, executive_summary: e.target.value })} /></div>
                  <div><Label>Narrative</Label><Textarea rows={4} value={instanceForm.narrative} onChange={e => setInstanceForm({ ...instanceForm, narrative: e.target.value })} /></div>
                  <div><Label>Strategic Notes</Label><Textarea rows={3} value={instanceForm.strategic_notes} onChange={e => setInstanceForm({ ...instanceForm, strategic_notes: e.target.value })} /></div>
                  <Button onClick={() => createInstance.mutate(instanceForm)} disabled={!instanceForm.title || !instanceForm.reporting_period}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {instances.map((i: any) => (
              <Card key={i.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedInstance(i)}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-sm text-muted-foreground">{i.reporting_period}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor(i.status)}>{i.status}</Badge>
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); exportPDF(i); }}><Download className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="review">
          <div className="space-y-3">
            {instances.filter((i: any) => i.status === 'draft' || i.status === 'review').map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-sm text-muted-foreground">{i.reporting_period} • {i.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {i.status === 'draft' && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: i.id, status: 'review' })}><Send className="h-4 w-4 mr-1" />Submit for Review</Button>}
                    {i.status === 'review' && <Button size="sm" onClick={() => updateStatus.mutate({ id: i.id, status: 'approved' })}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {instances.filter((i: any) => i.status === 'draft' || i.status === 'review').length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No packs pending review</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="export">
          <div className="space-y-3">
            {instances.filter((i: any) => i.status === 'approved' || i.status === 'exported').map((i: any) => (
              <Card key={i.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-sm text-muted-foreground">{i.reporting_period}</p>
                  </div>
                  <Button onClick={() => { exportPDF(i); updateStatus.mutate({ id: i.id, status: 'exported' }); }}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
                </CardContent>
              </Card>
            ))}
            {instances.filter((i: any) => i.status === 'approved' || i.status === 'exported').length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No approved packs to export</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
