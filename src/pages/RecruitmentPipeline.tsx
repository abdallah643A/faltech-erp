import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Briefcase, Users, UserCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const STAGES = ['applied', 'screening', 'interview', 'evaluation', 'offer', 'hired', 'rejected'];

export default function RecruitmentPipeline() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [showAddReq, setShowAddReq] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [reqForm, setReqForm] = useState({ title: '', department_name: '', positions_count: '1', priority: 'medium', budget_per_position: '', requirements: '', description: '', location: '', employment_type: 'full_time' });
  const [candForm, setCandForm] = useState({ name: '', email: '', phone: '', source: 'direct', rating: '0' });

  const { data: requisitions = [] } = useQuery({
    queryKey: ['job-requisitions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('job_requisitions' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['candidates', activeCompanyId, selectedReq],
    queryFn: async () => {
      let q = supabase.from('candidates' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (selectedReq) q = q.eq('requisition_id', selectedReq);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const addReq = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('job_requisitions' as any).insert({
        ...reqForm, positions_count: Number(reqForm.positions_count), budget_per_position: Number(reqForm.budget_per_position) || 0,
        created_by: user?.id, hiring_manager_id: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-requisitions'] }); setShowAddReq(false); toast.success('Requisition created'); },
  });

  const addCandidate = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('candidates' as any).insert({
        ...candForm, rating: Number(candForm.rating), requisition_id: selectedReq,
        created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); setShowAddCandidate(false); setCandForm({ name: '', email: '', phone: '', source: 'direct', rating: '0' }); toast.success('Candidate added'); },
  });

  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      await (supabase.from('candidates' as any).update({ stage }).eq('id', id) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); toast.success('Stage updated'); },
  });

  const pipelineData = STAGES.map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), count: candidates.filter((c: any) => c.stage === s).length }));
  const totalPositions = requisitions.reduce((s: number, r: any) => s + Number(r.positions_count || 0), 0);
  const openReqs = requisitions.filter((r: any) => r.status !== 'closed').length;
  const hiredCount = candidates.filter((c: any) => c.stage === 'hired').length;

  const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);
  const stageColor = (s: string) => s === 'hired' ? 'default' : s === 'rejected' ? 'destructive' : s === 'offer' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Recruitment Pipeline</h1><p className="text-muted-foreground">Job requisitions, candidates, and hiring workflow</p></div>
        <Dialog open={showAddReq} onOpenChange={setShowAddReq}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Requisition</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Job Requisition</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div><Label>Job Title</Label><Input value={reqForm.title} onChange={e => setReqForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t('hr.department')}</Label><Input value={reqForm.department_name} onChange={e => setReqForm(p => ({ ...p, department_name: e.target.value }))} /></div>
                <div><Label>Location</Label><Input value={reqForm.location} onChange={e => setReqForm(p => ({ ...p, location: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Positions</Label><Input type="number" value={reqForm.positions_count} onChange={e => setReqForm(p => ({ ...p, positions_count: e.target.value }))} /></div>
                <div><Label>Priority</Label><Select value={reqForm.priority} onValueChange={v => setReqForm(p => ({ ...p, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
                <div><Label>{t('common.type')}</Label><Select value={reqForm.employment_type} onValueChange={v => setReqForm(p => ({ ...p, employment_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_time">Full Time</SelectItem><SelectItem value="part_time">Part Time</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>Budget/Position</Label><Input type="number" value={reqForm.budget_per_position} onChange={e => setReqForm(p => ({ ...p, budget_per_position: e.target.value }))} /></div>
              <div><Label>Requirements</Label><Textarea value={reqForm.requirements} onChange={e => setReqForm(p => ({ ...p, requirements: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => addReq.mutate()} disabled={!reqForm.title}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><Briefcase className="h-8 w-8 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{openReqs}</p><p className="text-xs text-muted-foreground">Open Requisitions</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Users className="h-8 w-8 mx-auto text-blue-500 mb-2" /><p className="text-2xl font-bold">{totalPositions}</p><p className="text-xs text-muted-foreground">Total Positions</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" /><p className="text-2xl font-bold">{candidates.length}</p><p className="text-xs text-muted-foreground">Total Candidates</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><UserCheck className="h-8 w-8 mx-auto text-green-500 mb-2" /><p className="text-2xl font-bold">{hiredCount}</p><p className="text-xs text-muted-foreground">Hired</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Pipeline Funnel</CardTitle></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={250}><BarChart data={pipelineData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>
      </CardContent></Card>

      <Tabs defaultValue="requisitions">
        <TabsList><TabsTrigger value="requisitions">Requisitions ({requisitions.length})</TabsTrigger><TabsTrigger value="candidates">Candidates ({candidates.length})</TabsTrigger></TabsList>

        <TabsContent value="requisitions"><Card><CardContent className="pt-4">
          <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>{t('hr.department')}</TableHead><TableHead>Positions</TableHead><TableHead>Priority</TableHead><TableHead>Budget</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{requisitions.map((r: any) => (
              <TableRow key={r.id} className={selectedReq === r.id ? 'bg-primary/5' : ''}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.department_name || '-'}</TableCell>
                <TableCell>{r.positions_count}</TableCell>
                <TableCell><Badge variant={r.priority === 'urgent' ? 'destructive' : 'outline'}>{r.priority}</Badge></TableCell>
                <TableCell>{r.budget_per_position ? fmt(r.budget_per_position) : '-'}</TableCell>
                <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => { setSelectedReq(r.id); setShowAddCandidate(true); }}>+ Candidate</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card></TabsContent>

        <TabsContent value="candidates"><Card><CardContent className="pt-4">
          <Table><TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.email')}</TableHead><TableHead>Source</TableHead><TableHead>Rating</TableHead><TableHead>Stage</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{candidates.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell><Badge variant="outline">{c.source}</Badge></TableCell>
                <TableCell>{'⭐'.repeat(Math.min(c.rating || 0, 5))}</TableCell>
                <TableCell><Badge variant={stageColor(c.stage) as any}>{c.stage}</Badge></TableCell>
                <TableCell>
                  <Select onValueChange={v => moveStage.mutate({ id: c.id, stage: v })}>
                    <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue placeholder="Move..." /></SelectTrigger>
                    <SelectContent>{STAGES.filter(s => s !== c.stage).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={showAddCandidate} onOpenChange={setShowAddCandidate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('common.name')}</Label><Input value={candForm.name} onChange={e => setCandForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.email')}</Label><Input type="email" value={candForm.email} onChange={e => setCandForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>{t('common.phone')}</Label><Input value={candForm.phone} onChange={e => setCandForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Source</Label><Select value={candForm.source} onValueChange={v => setCandForm(p => ({ ...p, source: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Direct</SelectItem><SelectItem value="referral">Referral</SelectItem><SelectItem value="job_board">Job Board</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem><SelectItem value="agency">Agency</SelectItem></SelectContent></Select></div>
              <div><Label>Rating (1-5)</Label><Input type="number" min="0" max="5" value={candForm.rating} onChange={e => setCandForm(p => ({ ...p, rating: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={() => addCandidate.mutate()} disabled={!candForm.name}>Add Candidate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
