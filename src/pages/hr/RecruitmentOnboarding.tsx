import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDepartments, usePositions } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Briefcase, Plus, Users, UserPlus, ClipboardCheck, FileText, Star, CheckCircle, XCircle, Download, Send, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const PIPELINE_STAGES = ['applied', 'shortlisted', 'interview', 'evaluated', 'offered', 'accepted', 'onboarding', 'hired', 'rejected'];
const STAGE_COLORS: Record<string, string> = {
  applied: 'bg-gray-100 text-gray-800', shortlisted: 'bg-blue-100 text-blue-800',
  interview: 'bg-purple-100 text-purple-800', evaluated: 'bg-indigo-100 text-indigo-800',
  offered: 'bg-yellow-100 text-yellow-800', accepted: 'bg-green-100 text-green-800',
  onboarding: 'bg-teal-100 text-teal-800', hired: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};
const OFFER_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' }, pending_approval: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'secondary' }, sent: { label: 'Sent', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'default' }, rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'destructive' }, withdrawn: { label: 'Withdrawn', variant: 'destructive' },
};
const ONBOARD_STATUS: Record<string, string> = {
  pending: 'Pending', documents_pending: 'Docs Pending', documents_received: 'Docs Received',
  it_setup: 'IT Setup', orientation: 'Orientation', completed: 'Completed', cancelled: 'Cancelled',
};
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(262, 80%, 50%)', 'hsl(25, 95%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(220, 70%, 50%)'];

export default function RecruitmentOnboarding() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { departments } = useDepartments();
  const { positions } = usePositions();
  const [tab, setTab] = useState('pipeline');
  const [showPostingDialog, setShowPostingDialog] = useState(false);
  const [showApplicantDialog, setShowApplicantDialog] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [selectedPostingId, setSelectedPostingId] = useState('');

  // Queries
  const { data: postings = [] } = useQuery({
    queryKey: ['job-postings-full', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('job_postings').select('*, department:departments(id, name)').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: applicants = [] } = useQuery({
    queryKey: ['job-applicants-full', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('job_applicants').select('*').order('created_at', { ascending: false }).limit(500) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ['interview-evaluations', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('interview_evaluations' as any).select('*').order('interview_date', { ascending: false }).limit(300) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ['offer-letters', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('offer_letters' as any).select('*').order('created_at', { ascending: false }).limit(300) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: onboardings = [] } = useQuery({
    queryKey: ['recruitment-onboarding', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('recruitment_onboarding' as any).select('*').order('created_at', { ascending: false }).limit(200) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // KPIs
  const kpis = useMemo(() => ({
    openPositions: postings.filter((p: any) => p.status === 'open').length,
    totalApplicants: applicants.length,
    inPipeline: applicants.filter((a: any) => !['hired', 'rejected'].includes(a.status || '')).length,
    interviewsScheduled: interviews.filter((i: any) => i.status === 'scheduled').length,
    pendingOffers: offers.filter((o: any) => o.status === 'sent' || o.status === 'pending_approval').length,
    onboardingActive: onboardings.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length,
    hiredThisMonth: applicants.filter((a: any) => a.status === 'hired' && a.updated_at?.startsWith(format(new Date(), 'yyyy-MM'))).length,
  }), [postings, applicants, interviews, offers, onboardings]);

  // Pipeline summary
  const pipelineData = useMemo(() =>
    PIPELINE_STAGES.filter(s => s !== 'rejected').map(stage => ({
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      count: applicants.filter((a: any) => a.status === stage).length,
    })),
  [applicants]);

  // Forms
  const [postForm, setPostForm] = useState({ title: '', department_id: '', position_id: '', description: '', requirements: '', employment_type: 'full_time', location: '', salary_range_min: 0, salary_range_max: 0, closing_date: '' });
  const [appForm, setAppForm] = useState({ job_posting_id: '', first_name: '', last_name: '', email: '', phone: '', cover_letter: '' });
  const [intForm, setIntForm] = useState({ candidate_name: '', interviewer_name: '', interview_date: format(new Date(), 'yyyy-MM-dd'), interview_type: 'in_person', round_number: 1, technical_score: 3, communication_score: 3, cultural_fit_score: 3, leadership_score: 3, problem_solving_score: 3, recommendation: 'pending', strengths: '', weaknesses: '', notes: '', job_posting_id: '' });
  const [offerForm, setOfferForm] = useState({ candidate_name: '', candidate_email: '', position_title: '', department: '', offered_salary: 0, joining_date: '', probation_months: 3, contract_type: 'permanent', benefits: '', terms_conditions: '', expiry_date: '', job_posting_id: '' });
  const [onbForm, setOnbForm] = useState({ candidate_name: '', position_title: '', department: '', joining_date: '', mentor_assigned: '', offer_id: '' });

  // Mutations
  const createPosting = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('job_postings').insert({
        ...postForm, company_id: activeCompanyId,
        department_id: postForm.department_id || null, position_id: postForm.position_id || null,
        salary_range_min: postForm.salary_range_min || null, salary_range_max: postForm.salary_range_max || null,
        closing_date: postForm.closing_date || null, status: 'open', posted_date: format(new Date(), 'yyyy-MM-dd'),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-postings-full'] }); setShowPostingDialog(false); toast.success(t('recruit.postingCreated')); },
    onError: () => toast.error('Failed'),
  });

  const createApplicant = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('job_applicants').insert({
        ...appForm, company_id: activeCompanyId,
        job_posting_id: appForm.job_posting_id || null,
        phone: appForm.phone || null, cover_letter: appForm.cover_letter || null,
        status: 'applied',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-applicants-full'] }); setShowApplicantDialog(false); toast.success(t('recruit.applicantAdded')); },
    onError: () => toast.error('Failed'),
  });

  const updateApplicantStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('job_applicants').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-applicants-full'] }); toast.success('Status updated'); },
  });

  const createInterview = useMutation({
    mutationFn: async () => {
      const overall = ((intForm.technical_score + intForm.communication_score + intForm.cultural_fit_score + intForm.leadership_score + intForm.problem_solving_score) / 5);
      const { error } = await (supabase.from('interview_evaluations' as any).insert({
        ...intForm, company_id: activeCompanyId, overall_rating: Math.round(overall * 10) / 10,
        job_posting_id: intForm.job_posting_id || null, status: 'completed',
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interview-evaluations'] }); setShowInterviewDialog(false); toast.success(t('recruit.interviewSaved')); },
    onError: () => toast.error('Failed'),
  });

  const createOffer = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('offer_letters' as any).insert({
        ...offerForm, company_id: activeCompanyId,
        joining_date: offerForm.joining_date || null, expiry_date: offerForm.expiry_date || null,
        job_posting_id: offerForm.job_posting_id || null, status: 'draft', offer_date: format(new Date(), 'yyyy-MM-dd'),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['offer-letters'] }); setShowOfferDialog(false); toast.success(t('recruit.offerCreated')); },
    onError: () => toast.error('Failed'),
  });

  const updateOfferStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'accepted') updates.response_date = format(new Date(), 'yyyy-MM-dd');
      const { error } = await (supabase.from('offer_letters' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['offer-letters'] }); toast.success('Updated'); },
  });

  const createOnboarding = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('recruitment_onboarding' as any).insert({
        ...onbForm, company_id: activeCompanyId,
        offer_id: onbForm.offer_id || null, joining_date: onbForm.joining_date || null,
        status: 'pending',
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment-onboarding'] }); setShowOnboardDialog(false); toast.success(t('recruit.onboardingCreated')); },
    onError: () => toast.error('Failed'),
  });

  const updateOnboardingField = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await (supabase.from('recruitment_onboarding' as any).update({ [field]: value }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment-onboarding'] }); },
  });

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(applicants.map((a: any) => ({
      Name: `${a.first_name} ${a.last_name}`, Email: a.email, Phone: a.phone, Status: a.status, Applied: a.created_at?.split('T')[0],
    }))), 'Applicants');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offers.map((o: any) => ({
      Candidate: o.candidate_name, Position: o.position_title, Salary: o.offered_salary, Status: o.status, Joining: o.joining_date,
    }))), 'Offers');
    XLSX.writeFile(wb, `recruitment_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const calcOnboardPct = (o: any) => {
    const fields = ['id_copy_received', 'passport_received', 'visa_received', 'education_certs_received', 'medical_report_received',
      'bank_details_received', 'photo_received', 'contract_signed', 'workstation_ready', 'email_created',
      'access_card_issued', 'safety_induction', 'it_equipment_issued', 'joining_confirmed', 'orientation_completed'];
    const done = fields.filter(f => o[f]).length;
    return Math.round((done / fields.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6" />{t('nav.recruitmentOnboarding')}</h1>
          <p className="text-muted-foreground">{t('recruit.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />{t('common.export')}</Button>
          <Button size="sm" onClick={() => setShowPostingDialog(true)}><Plus className="h-4 w-4 mr-1" />{t('recruit.newPosting')}</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: t('recruit.openPositions'), value: kpis.openPositions, icon: Briefcase },
          { label: t('recruit.totalApplicants'), value: kpis.totalApplicants, icon: Users },
          { label: t('recruit.inPipeline'), value: kpis.inPipeline, icon: UserPlus },
          { label: t('recruit.interviews'), value: kpis.interviewsScheduled, icon: Star },
          { label: t('recruit.pendingOffers'), value: kpis.pendingOffers, icon: FileText },
          { label: t('recruit.activeOnboarding'), value: kpis.onboardingActive, icon: ClipboardCheck },
          { label: t('recruit.hiredMonth'), value: kpis.hiredThisMonth, icon: UserCheck },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-3 flex items-center gap-2">
            <k.icon className="h-4 w-4 text-primary" />
            <div><div className="text-lg font-bold">{k.value}</div><div className="text-[10px] text-muted-foreground leading-tight">{k.label}</div></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pipeline">{t('recruit.pipeline')}</TabsTrigger>
          <TabsTrigger value="postings">{t('recruit.postings')}</TabsTrigger>
          <TabsTrigger value="applicants">{t('recruit.applicants')}</TabsTrigger>
          <TabsTrigger value="interviews">{t('recruit.interviewsTab')}</TabsTrigger>
          <TabsTrigger value="offers">{t('recruit.offersTab')}</TabsTrigger>
          <TabsTrigger value="onboarding">{t('recruit.onboarding')}</TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline">
          <Card><CardHeader><CardTitle className="text-base">{t('recruit.candidatePipeline')}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={100} tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Postings Tab */}
        <TabsContent value="postings">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('recruit.jobTitle')}</TableHead><TableHead>{t('hr.department')}</TableHead>
                <TableHead>{t('common.type')}</TableHead><TableHead>{t('recruit.salary')}</TableHead>
                <TableHead>{t('recruit.closing')}</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {postings.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.department?.name || '—'}</TableCell>
                    <TableCell className="capitalize">{(p.employment_type || '').replace('_', ' ')}</TableCell>
                    <TableCell>{p.salary_range_min && p.salary_range_max ? `${p.salary_range_min}-${p.salary_range_max}` : '—'}</TableCell>
                    <TableCell>{p.closing_date || '—'}</TableCell>
                    <TableCell><Badge variant={p.status === 'open' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {postings.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Applicants Tab */}
        <TabsContent value="applicants">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowApplicantDialog(true)}><Plus className="h-4 w-4 mr-1" />{t('recruit.addApplicant')}</Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('common.name')}</TableHead><TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('recruit.posting')}</TableHead><TableHead>{t('recruit.stage')}</TableHead>
                <TableHead>{t('recruit.applied')}</TableHead><TableHead>{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {applicants.map((a: any) => {
                  const posting = postings.find((p: any) => p.id === a.job_posting_id) as any;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.first_name} {a.last_name}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell className="text-xs">{posting?.title || '—'}</TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[a.status || 'applied'] || ''}`}>{a.status || 'applied'}</span></TableCell>
                      <TableCell>{a.created_at?.split('T')[0]}</TableCell>
                      <TableCell>
                        <Select value={a.status || 'applied'} onValueChange={v => updateApplicantStatus.mutate({ id: a.id, status: v })}>
                          <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {applicants.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowInterviewDialog(true)}><Plus className="h-4 w-4 mr-1" />{t('recruit.addInterview')}</Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('recruit.candidate')}</TableHead><TableHead>{t('recruit.interviewer')}</TableHead>
                <TableHead>{t('common.date')}</TableHead><TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('recruit.round')}</TableHead><TableHead>{t('recruit.overall')}</TableHead>
                <TableHead>{t('recruit.recommendation')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {interviews.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.candidate_name}</TableCell>
                    <TableCell>{i.interviewer_name}</TableCell>
                    <TableCell>{i.interview_date}</TableCell>
                    <TableCell className="capitalize">{(i.interview_type || '').replace('_', ' ')}</TableCell>
                    <TableCell>Round {i.round_number}</TableCell>
                    <TableCell><Badge variant="outline">{i.overall_rating}/5</Badge></TableCell>
                    <TableCell><Badge variant={
                      i.recommendation === 'strong_hire' || i.recommendation === 'hire' ? 'default' :
                      i.recommendation === 'reject' || i.recommendation === 'strong_reject' ? 'destructive' : 'secondary'
                    }>{(i.recommendation || '').replace('_', ' ')}</Badge></TableCell>
                  </TableRow>
                ))}
                {interviews.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Offers Tab */}
        <TabsContent value="offers">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowOfferDialog(true)}><Plus className="h-4 w-4 mr-1" />{t('recruit.createOffer')}</Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('recruit.candidate')}</TableHead><TableHead>{t('hr.position')}</TableHead>
                <TableHead>{t('recruit.salary')}</TableHead><TableHead>{t('recruit.joining')}</TableHead>
                <TableHead>{t('recruit.contract')}</TableHead><TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {offers.map((o: any) => {
                  const st = OFFER_STATUS[o.status] || OFFER_STATUS.draft;
                  return (
                    <TableRow key={o.id}>
                      <TableCell><div className="font-medium">{o.candidate_name}</div><div className="text-xs text-muted-foreground">{o.candidate_email}</div></TableCell>
                      <TableCell>{o.position_title}</TableCell>
                      <TableCell>{o.offered_salary?.toLocaleString()} {o.salary_currency}</TableCell>
                      <TableCell>{o.joining_date || '—'}</TableCell>
                      <TableCell className="capitalize">{(o.contract_type || '').replace('_', ' ')}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {o.status === 'draft' && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateOfferStatus.mutate({ id: o.id, status: 'sent' })}><Send className="h-3 w-3 mr-1" />Send</Button>}
                          {o.status === 'sent' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => updateOfferStatus.mutate({ id: o.id, status: 'accepted' })}><CheckCircle className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => updateOfferStatus.mutate({ id: o.id, status: 'rejected' })}><XCircle className="h-3 w-3" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {offers.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowOnboardDialog(true)}><Plus className="h-4 w-4 mr-1" />{t('recruit.startOnboarding')}</Button>
          </div>
          <div className="space-y-4">
            {onboardings.map((o: any) => {
              const pct = calcOnboardPct(o);
              const docFields = ['id_copy_received', 'passport_received', 'visa_received', 'education_certs_received', 'medical_report_received', 'bank_details_received', 'photo_received', 'contract_signed'];
              const preFields = ['workstation_ready', 'email_created', 'access_card_issued', 'safety_induction', 'it_equipment_issued'];
              const joinFields = ['joining_confirmed', 'orientation_completed'];
              return (
                <Card key={o.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{o.candidate_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{o.position_title} — {o.department} — {t('recruit.joining')}: {o.joining_date || '—'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={o.status === 'completed' ? 'default' : 'outline'}>{ONBOARD_STATUS[o.status] || o.status}</Badge>
                        <div className="flex items-center gap-2 min-w-[120px]"><Progress value={pct} className="h-2" /><span className="text-xs font-medium">{pct}%</span></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('recruit.documents')}</h4>
                        <div className="space-y-1">
                          {docFields.map(f => (
                            <label key={f} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={o[f] || false} onChange={e => updateOnboardingField.mutate({ id: o.id, field: f, value: e.target.checked })} className="rounded" />
                              {f.replace(/_/g, ' ').replace(/received|copy/g, '').trim()}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('recruit.preJoining')}</h4>
                        <div className="space-y-1">
                          {preFields.map(f => (
                            <label key={f} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={o[f] || false} onChange={e => updateOnboardingField.mutate({ id: o.id, field: f, value: e.target.checked })} className="rounded" />
                              {f.replace(/_/g, ' ')}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('recruit.joiningConf')}</h4>
                        <div className="space-y-1">
                          {joinFields.map(f => (
                            <label key={f} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={o[f] || false} onChange={e => updateOnboardingField.mutate({ id: o.id, field: f, value: e.target.checked })} className="rounded" />
                              {f.replace(/_/g, ' ')}
                            </label>
                          ))}
                          {o.mentor_assigned && <p className="text-xs text-muted-foreground mt-2">{t('recruit.mentor')}: {o.mentor_assigned}</p>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {onboardings.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">{t('common.noData')}</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Posting Dialog */}
      <Dialog open={showPostingDialog} onOpenChange={setShowPostingDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('recruit.newPosting')}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>{t('recruit.jobTitle')}</Label><Input value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('hr.department')}</Label>
                <Select value={postForm.department_id || '_'} onValueChange={v => setPostForm(p => ({ ...p, department_id: v === '_' ? '' : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="_">—</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('hr.position')}</Label>
                <Select value={postForm.position_id || '_'} onValueChange={v => setPostForm(p => ({ ...p, position_id: v === '_' ? '' : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="_">—</SelectItem>{positions.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{t('common.description')}</Label><Textarea value={postForm.description} onChange={e => setPostForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('recruit.location')}</Label><Input value={postForm.location} onChange={e => setPostForm(p => ({ ...p, location: e.target.value }))} /></div>
              <div><Label>{t('recruit.closing')}</Label><Input type="date" value={postForm.closing_date} onChange={e => setPostForm(p => ({ ...p, closing_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('recruit.minSalary')}</Label><Input type="number" value={postForm.salary_range_min || ''} onChange={e => setPostForm(p => ({ ...p, salary_range_min: +e.target.value }))} /></div>
              <div><Label>{t('recruit.maxSalary')}</Label><Input type="number" value={postForm.salary_range_max || ''} onChange={e => setPostForm(p => ({ ...p, salary_range_max: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => createPosting.mutate()} disabled={!postForm.title}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Applicant Dialog */}
      <Dialog open={showApplicantDialog} onOpenChange={setShowApplicantDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('recruit.addApplicant')}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>{t('recruit.posting')}</Label>
              <Select value={appForm.job_posting_id} onValueChange={v => setAppForm(p => ({ ...p, job_posting_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                <SelectContent>{postings.filter((p: any) => p.status === 'open').map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('recruit.firstName')}</Label><Input value={appForm.first_name} onChange={e => setAppForm(p => ({ ...p, first_name: e.target.value }))} /></div>
              <div><Label>{t('recruit.lastName')}</Label><Input value={appForm.last_name} onChange={e => setAppForm(p => ({ ...p, last_name: e.target.value }))} /></div>
            </div>
            <div><Label>{t('common.email')}</Label><Input type="email" value={appForm.email} onChange={e => setAppForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>{t('common.phone')}</Label><Input value={appForm.phone} onChange={e => setAppForm(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createApplicant.mutate()} disabled={!appForm.first_name || !appForm.email}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Evaluation Dialog */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('recruit.addInterview')}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>{t('recruit.candidate')}</Label><Input value={intForm.candidate_name} onChange={e => setIntForm(p => ({ ...p, candidate_name: e.target.value }))} /></div>
            <div><Label>{t('recruit.interviewer')}</Label><Input value={intForm.interviewer_name} onChange={e => setIntForm(p => ({ ...p, interviewer_name: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('common.date')}</Label><Input type="date" value={intForm.interview_date} onChange={e => setIntForm(p => ({ ...p, interview_date: e.target.value }))} /></div>
              <div><Label>{t('common.type')}</Label>
                <Select value={intForm.interview_type} onValueChange={v => setIntForm(p => ({ ...p, interview_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['phone', 'video', 'in_person', 'panel', 'technical', 'hr'].map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('recruit.round')}</Label><Input type="number" min={1} value={intForm.round_number} onChange={e => setIntForm(p => ({ ...p, round_number: +e.target.value }))} /></div>
            </div>
            {['technical_score', 'communication_score', 'cultural_fit_score', 'leadership_score', 'problem_solving_score'].map(field => (
              <div key={field} className="flex items-center gap-3">
                <Label className="w-32 text-xs capitalize">{field.replace('_score', '').replace('_', ' ')}</Label>
                <Slider min={1} max={5} step={1} value={[(intForm as any)[field]]} onValueChange={v => setIntForm(p => ({ ...p, [field]: v[0] }))} className="flex-1" />
                <span className="text-sm font-medium w-6">{(intForm as any)[field]}</span>
              </div>
            ))}
            <div><Label>{t('recruit.recommendation')}</Label>
              <Select value={intForm.recommendation} onValueChange={v => setIntForm(p => ({ ...p, recommendation: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['strong_hire', 'hire', 'hold', 'reject', 'strong_reject'].map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t('recruit.strengths')}</Label><Textarea value={intForm.strengths} onChange={e => setIntForm(p => ({ ...p, strengths: e.target.value }))} rows={2} /></div>
            <div><Label>{t('recruit.weaknesses')}</Label><Textarea value={intForm.weaknesses} onChange={e => setIntForm(p => ({ ...p, weaknesses: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={() => createInterview.mutate()} disabled={!intForm.candidate_name || !intForm.interviewer_name}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Letter Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('recruit.createOffer')}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('recruit.candidate')}</Label><Input value={offerForm.candidate_name} onChange={e => setOfferForm(p => ({ ...p, candidate_name: e.target.value }))} /></div>
              <div><Label>{t('common.email')}</Label><Input value={offerForm.candidate_email} onChange={e => setOfferForm(p => ({ ...p, candidate_email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('hr.position')}</Label><Input value={offerForm.position_title} onChange={e => setOfferForm(p => ({ ...p, position_title: e.target.value }))} /></div>
              <div><Label>{t('hr.department')}</Label><Input value={offerForm.department} onChange={e => setOfferForm(p => ({ ...p, department: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('recruit.offeredSalary')}</Label><Input type="number" value={offerForm.offered_salary || ''} onChange={e => setOfferForm(p => ({ ...p, offered_salary: +e.target.value }))} /></div>
              <div><Label>{t('recruit.joining')}</Label><Input type="date" value={offerForm.joining_date} onChange={e => setOfferForm(p => ({ ...p, joining_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('recruit.probation')}</Label><Input type="number" value={offerForm.probation_months} onChange={e => setOfferForm(p => ({ ...p, probation_months: +e.target.value }))} /></div>
              <div><Label>{t('recruit.contract')}</Label>
                <Select value={offerForm.contract_type} onValueChange={v => setOfferForm(p => ({ ...p, contract_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['permanent', 'contract', 'temporary', 'part_time'].map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{t('recruit.benefits')}</Label><Textarea value={offerForm.benefits} onChange={e => setOfferForm(p => ({ ...p, benefits: e.target.value }))} rows={2} /></div>
            <div><Label>{t('recruit.expiry')}</Label><Input type="date" value={offerForm.expiry_date} onChange={e => setOfferForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createOffer.mutate()} disabled={!offerForm.candidate_name || !offerForm.position_title}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Onboarding Dialog */}
      <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('recruit.startOnboarding')}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>{t('recruit.candidate')}</Label><Input value={onbForm.candidate_name} onChange={e => setOnbForm(p => ({ ...p, candidate_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('hr.position')}</Label><Input value={onbForm.position_title} onChange={e => setOnbForm(p => ({ ...p, position_title: e.target.value }))} /></div>
              <div><Label>{t('hr.department')}</Label><Input value={onbForm.department} onChange={e => setOnbForm(p => ({ ...p, department: e.target.value }))} /></div>
            </div>
            <div><Label>{t('recruit.joining')}</Label><Input type="date" value={onbForm.joining_date} onChange={e => setOnbForm(p => ({ ...p, joining_date: e.target.value }))} /></div>
            <div><Label>{t('recruit.mentor')}</Label><Input value={onbForm.mentor_assigned} onChange={e => setOnbForm(p => ({ ...p, mentor_assigned: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createOnboarding.mutate()} disabled={!onbForm.candidate_name}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
