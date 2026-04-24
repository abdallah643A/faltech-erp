import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatSAR } from '@/lib/currency';
import { format, differenceInDays, addDays } from 'date-fns';
import {
  ShieldCheck, Plus, Search, Eye, FileText, Star, Ban, Clock, CheckCircle2,
  XCircle, AlertTriangle, Users, Building2, Award, Trash2, Download,
  RefreshCw, ThumbsUp, ThumbsDown, Filter,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  scoring: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  blacklisted: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200',
};

const requiredDocTypes = [
  'Trade License', 'Commercial Registration', 'Tax Registration Certificate',
  'Insurance Certificate', 'Financial Statements (Last 3 Years)', 'Safety Policy Document',
  'ISO Certification', 'Previous Project Portfolio', 'Bank Reference Letter',
  'Organization Chart', 'Equipment List', 'HSE Statistics',
];

export default function VendorPrequalification() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const [activeTab, setActiveTab] = useState('applications');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showScoring, setShowScoring] = useState<any>(null);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [form, setForm] = useState({
    applicant_type: 'vendor', company_name: '', trade_name: '', registration_number: '',
    tax_number: '', contact_person: '', contact_email: '', contact_phone: '',
    address: '', city: '', country: 'Saudi Arabia', years_in_business: 0,
    annual_revenue: 0, employee_count: 0, has_insurance: false, insurance_expiry: '',
    has_safety_certification: false, safety_certification_details: '',
    has_iso_certification: false, iso_details: '', bank_name: '', bank_reference: '',
    reference_1_company: '', reference_1_contact: '', reference_1_phone: '',
    reference_2_company: '', reference_2_contact: '', reference_2_phone: '',
    reference_3_company: '', reference_3_contact: '', reference_3_phone: '',
    notes: '',
  });

  const [blacklistForm, setBlacklistForm] = useState({
    company_name: '', action_type: 'suspension' as string, reason: '',
    effective_date: format(new Date(), 'yyyy-MM-dd'), expiry_date: '', is_permanent: false,
    application_id: '',
  });

  const [categoryForm, setCategoryForm] = useState({ category_code: '', category_name: '', description: '' });

  // === QUERIES ===
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['prequalification-apps', activeCompanyId, statusFilter],
    queryFn: async () => {
      let q = supabase.from('vendor_prequalification_applications').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: criteria = [] } = useQuery({
    queryKey: ['prequalification-criteria', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('prequalification_scoring_criteria').select('*').eq('is_active', true).order('sort_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      else q = q.is('company_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['prequalification-categories', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('prequalification_categories').select('*').eq('is_active', true).order('sort_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      else q = q.is('company_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: blacklist = [] } = useQuery({
    queryKey: ['prequalification-blacklist', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('prequalification_blacklist').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['prequalification-scores', showScoring?.id],
    enabled: !!showScoring,
    queryFn: async () => {
      const { data, error } = await supabase.from('prequalification_scores').select('*').eq('application_id', showScoring.id);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: appDocuments = [] } = useQuery({
    queryKey: ['prequalification-documents', showDetail?.id || showScoring?.id],
    enabled: !!(showDetail?.id || showScoring?.id),
    queryFn: async () => {
      const appId = showDetail?.id || showScoring?.id;
      const { data, error } = await supabase.from('prequalification_documents').select('*').eq('application_id', appId);
      if (error) throw error;
      return data as any[];
    },
  });

  // === MUTATIONS ===
  const createApplication = useMutation({
    mutationFn: async () => {
      const { data: appData, error: appError } = await supabase.from('vendor_prequalification_applications').insert({
        ...form, company_id: activeCompanyId, created_by: user?.id,
        years_in_business: Number(form.years_in_business),
        annual_revenue: Number(form.annual_revenue),
        employee_count: Number(form.employee_count),
        insurance_expiry: form.insurance_expiry || null,
      } as any).select().single();
      if (appError) throw appError;

      // Create required document entries
      const docs = requiredDocTypes.map(dt => ({
        application_id: (appData as any).id, document_type: dt, document_name: dt, is_required: true,
      }));
      await supabase.from('prequalification_documents').insert(docs as any);
      return appData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prequalification-apps'] });
      toast({ title: 'Application created with required documents checklist' });
      setShowForm(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, review_comments, rejection_reason, valid_from, valid_until }: any) => {
      const updates: any = { status };
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
        updates.valid_from = valid_from || format(new Date(), 'yyyy-MM-dd');
        updates.valid_until = valid_until || format(addDays(new Date(), 365), 'yyyy-MM-dd');
        updates.next_requalification_date = format(addDays(new Date(), 275), 'yyyy-MM-dd');
      }
      if (status === 'rejected') updates.rejection_reason = rejection_reason;
      if (status === 'under_review' || status === 'scoring') {
        updates.reviewer_id = user?.id;
        updates.reviewed_at = new Date().toISOString();
      }
      if (review_comments) updates.review_comments = review_comments;
      const { error } = await supabase.from('vendor_prequalification_applications').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prequalification-apps'] });
      toast({ title: 'Status updated' });
      setShowDetail(null);
      setShowScoring(null);
    },
  });

  const saveScore = useMutation({
    mutationFn: async ({ application_id, criteria_id, score, weight, max_score, comments }: any) => {
      const weighted = (score / max_score) * weight * max_score;
      const { error } = await supabase.from('prequalification_scores').upsert({
        application_id, criteria_id, score, weighted_score: weighted,
        reviewer_comments: comments, scored_by: user?.id,
      } as any, { onConflict: 'application_id,criteria_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prequalification-scores'] }),
  });

  const finalizeScoring = useMutation({
    mutationFn: async (appId: string) => {
      const { data: allScores, error: sErr } = await supabase.from('prequalification_scores').select('*').eq('application_id', appId);
      if (sErr) throw sErr;
      const totalScore = (allScores || []).reduce((s: number, sc: any) => s + (sc.weighted_score || 0), 0);
      const maxPossible = criteria.reduce((s: number, c: any) => s + (c.weight * c.max_score), 0);
      const pct = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
      const { error } = await supabase.from('vendor_prequalification_applications').update({
        total_score: totalScore, max_possible_score: maxPossible, score_percentage: pct, status: 'scoring',
      }).eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prequalification-apps'] });
      toast({ title: 'Scoring finalized' });
    },
  });

  const addBlacklist = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('prequalification_blacklist').insert({
        company_id: activeCompanyId, company_name: blacklistForm.company_name,
        action_type: blacklistForm.action_type, reason: blacklistForm.reason,
        effective_date: blacklistForm.effective_date,
        expiry_date: blacklistForm.expiry_date || null,
        is_permanent: blacklistForm.is_permanent,
        application_id: blacklistForm.application_id || null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
      if (blacklistForm.application_id) {
        await supabase.from('vendor_prequalification_applications')
          .update({ status: blacklistForm.action_type === 'blacklist' ? 'blacklisted' : 'suspended' })
          .eq('id', blacklistForm.application_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prequalification-blacklist'] });
      qc.invalidateQueries({ queryKey: ['prequalification-apps'] });
      toast({ title: `${blacklistForm.action_type === 'blacklist' ? 'Blacklisted' : 'Suspended'} successfully` });
      setShowBlacklist(false);
      setBlacklistForm({ company_name: '', action_type: 'suspension', reason: '', effective_date: format(new Date(), 'yyyy-MM-dd'), expiry_date: '', is_permanent: false, application_id: '' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const reinstate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prequalification_blacklist').update({
        reinstated: true, reinstated_by: user?.id, reinstated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prequalification-blacklist'] });
      toast({ title: 'Reinstated' });
    },
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('prequalification_categories').insert({
        ...categoryForm, company_id: activeCompanyId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prequalification-categories'] });
      toast({ title: 'Category added' });
      setShowCategoryForm(false);
      setCategoryForm({ category_code: '', category_name: '', description: '' });
    },
  });

  const resetForm = () => setForm({
    applicant_type: 'vendor', company_name: '', trade_name: '', registration_number: '',
    tax_number: '', contact_person: '', contact_email: '', contact_phone: '',
    address: '', city: '', country: 'Saudi Arabia', years_in_business: 0,
    annual_revenue: 0, employee_count: 0, has_insurance: false, insurance_expiry: '',
    has_safety_certification: false, safety_certification_details: '',
    has_iso_certification: false, iso_details: '', bank_name: '', bank_reference: '',
    reference_1_company: '', reference_1_contact: '', reference_1_phone: '',
    reference_2_company: '', reference_2_contact: '', reference_2_phone: '',
    reference_3_company: '', reference_3_contact: '', reference_3_phone: '',
    notes: '',
  });

  const filtered = useMemo(() => {
    if (!searchTerm) return applications;
    return applications.filter(a =>
      a.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [applications, searchTerm]);

  // KPIs
  const approved = applications.filter(a => a.status === 'approved').length;
  const pending = applications.filter(a => ['submitted', 'under_review', 'scoring'].includes(a.status)).length;
  const expiringSoon = applications.filter(a => a.valid_until && differenceInDays(new Date(a.valid_until), new Date()) <= 90 && differenceInDays(new Date(a.valid_until), new Date()) > 0).length;
  const blacklisted = blacklist.filter(b => !b.reinstated && b.action_type === 'blacklist').length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Vendor & Subcontractor Prequalification
          </h1>
          <p className="text-muted-foreground">Application forms, scoring, approval workflow, and compliance management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> New Application</Button>
          <Button onClick={() => setShowBlacklist(true)} variant="destructive" className="gap-2"><Ban className="h-4 w-4" /> Blacklist/Suspend</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Applications</p>
          <p className="text-2xl font-bold text-primary">{applications.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approved}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Expiring Soon</p>
          <p className="text-2xl font-bold text-orange-600">{expiringSoon}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Blacklisted</p>
          <p className="text-2xl font-bold text-red-600">{blacklisted}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="criteria">Scoring Criteria ({criteria.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist & Suspensions ({blacklist.length})</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search applications..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="scoring">Scoring</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No applications found</TableCell></TableRow>
                  ) : filtered.map(app => {
                    const daysLeft = app.valid_until ? differenceInDays(new Date(app.valid_until), new Date()) : null;
                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="font-medium">{app.company_name}</div>
                          <div className="text-xs text-muted-foreground">{app.registration_number}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{app.applicant_type}</Badge></TableCell>
                        <TableCell>
                          <div className="text-sm">{app.contact_person}</div>
                          <div className="text-xs text-muted-foreground">{app.contact_email}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {app.score_percentage > 0 ? (
                            <span className={`font-bold ${app.score_percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                              {app.score_percentage.toFixed(0)}%
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell><Badge className={statusColors[app.status]}>{app.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>
                          {app.valid_until ? (
                            <div>
                              <div className="text-xs">{format(new Date(app.valid_until), 'dd MMM yyyy')}</div>
                              {daysLeft !== null && daysLeft <= 90 && daysLeft > 0 && (
                                <div className="text-[10px] text-orange-600">{daysLeft}d remaining</div>
                              )}
                              {daysLeft !== null && daysLeft <= 0 && (
                                <div className="text-[10px] text-red-600">Expired</div>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setShowDetail(app)}><Eye className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowScoring(app)}><Star className="h-3 w-3" /></Button>
                            {app.status === 'submitted' && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: app.id, status: 'under_review' })}>
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Criteria Tab */}
        <TabsContent value="criteria">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Max Score</TableHead>
                    <TableHead className="text-right">Pass Threshold</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.criteria_name}</TableCell>
                      <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                      <TableCell className="text-right font-bold">{c.weight}x</TableCell>
                      <TableCell className="text-right">{c.max_score}</TableCell>
                      <TableCell className="text-right">{c.pass_threshold}</TableCell>
                      <TableCell>{c.is_mandatory ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{c.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Approved Work Categories</CardTitle>
              <Button size="sm" onClick={() => setShowCategoryForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold">{c.category_code}</TableCell>
                      <TableCell className="font-medium">{c.category_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.description || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blacklist.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No blacklist/suspension records</TableCell></TableRow>
                  ) : blacklist.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.company_name}</TableCell>
                      <TableCell><Badge className={b.action_type === 'blacklist' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>{b.action_type}</Badge></TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{b.reason}</TableCell>
                      <TableCell className="text-xs">{format(new Date(b.effective_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-xs">{b.is_permanent ? 'Permanent' : b.expiry_date ? format(new Date(b.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell>
                        {b.reinstated ? (
                          <Badge className="bg-green-100 text-green-800">Reinstated</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!b.reinstated && (
                          <Button size="sm" variant="ghost" onClick={() => reinstate.mutate(b.id)}>
                            <RefreshCw className="h-3 w-3" /> Reinstate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Application Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Prequalification Application</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Type *</Label>
                  <Select value={form.applicant_type} onValueChange={v => setForm(p => ({ ...p, applicant_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor / Supplier</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} /></div>
                <div><Label>Trade Name</Label><Input value={form.trade_name} onChange={e => setForm(p => ({ ...p, trade_name: e.target.value }))} /></div>
                <div><Label>Registration No.</Label><Input value={form.registration_number} onChange={e => setForm(p => ({ ...p, registration_number: e.target.value }))} /></div>
                <div><Label>Tax Number</Label><Input value={form.tax_number} onChange={e => setForm(p => ({ ...p, tax_number: e.target.value }))} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Contact Person</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Name</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
                <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} /></div>
              </div>
            </div>

            {/* Business Details */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Award className="h-4 w-4" /> Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Years in Business</Label><Input type="number" value={form.years_in_business} onChange={e => setForm(p => ({ ...p, years_in_business: +e.target.value }))} /></div>
                <div><Label>Annual Revenue (SAR)</Label><Input type="number" value={form.annual_revenue} onChange={e => setForm(p => ({ ...p, annual_revenue: +e.target.value }))} /></div>
                <div><Label>Employee Count</Label><Input type="number" value={form.employee_count} onChange={e => setForm(p => ({ ...p, employee_count: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.has_insurance} onCheckedChange={v => setForm(p => ({ ...p, has_insurance: !!v }))} />
                  <Label>Has Insurance</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.has_safety_certification} onCheckedChange={v => setForm(p => ({ ...p, has_safety_certification: !!v }))} />
                  <Label>Safety Certification</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.has_iso_certification} onCheckedChange={v => setForm(p => ({ ...p, has_iso_certification: !!v }))} />
                  <Label>ISO Certified</Label>
                </div>
              </div>
              {form.has_insurance && (
                <div className="mt-2"><Label>Insurance Expiry</Label><Input type="date" value={form.insurance_expiry} onChange={e => setForm(p => ({ ...p, insurance_expiry: e.target.value }))} /></div>
              )}
              {form.has_iso_certification && (
                <div className="mt-2"><Label>ISO Details</Label><Input value={form.iso_details} onChange={e => setForm(p => ({ ...p, iso_details: e.target.value }))} /></div>
              )}
            </div>

            {/* Bank & References */}
            <div>
              <h3 className="font-semibold mb-3">Bank & References</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></div>
                <div><Label>Bank Reference</Label><Input value={form.bank_reference} onChange={e => setForm(p => ({ ...p, bank_reference: e.target.value }))} /></div>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-3 gap-4 mt-3">
                  <div><Label>Ref {i} Company</Label><Input value={(form as any)[`reference_${i}_company`]} onChange={e => setForm(p => ({ ...p, [`reference_${i}_company`]: e.target.value }))} /></div>
                  <div><Label>Ref {i} Contact</Label><Input value={(form as any)[`reference_${i}_contact`]} onChange={e => setForm(p => ({ ...p, [`reference_${i}_contact`]: e.target.value }))} /></div>
                  <div><Label>Ref {i} Phone</Label><Input value={(form as any)[`reference_${i}_phone`]} onChange={e => setForm(p => ({ ...p, [`reference_${i}_phone`]: e.target.value }))} /></div>
                </div>
              ))}
            </div>

            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>

            <Button onClick={() => createApplication.mutate()} disabled={!form.company_name || createApplication.isPending} className="w-full">
              {createApplication.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{showDetail?.company_name} - Application Details</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><Label className="text-muted-foreground text-xs">Type</Label><p className="font-medium">{showDetail.applicant_type}</p></div>
                <div><Label className="text-muted-foreground text-xs">Status</Label><Badge className={statusColors[showDetail.status]}>{showDetail.status.replace('_', ' ')}</Badge></div>
                <div><Label className="text-muted-foreground text-xs">Score</Label><p className="font-bold">{showDetail.score_percentage > 0 ? showDetail.score_percentage.toFixed(0) + '%' : 'Not scored'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Applied</Label><p>{format(new Date(showDetail.application_date), 'dd MMM yyyy')}</p></div>
                <div><Label className="text-muted-foreground text-xs">Registration</Label><p>{showDetail.registration_number || '-'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Tax No</Label><p>{showDetail.tax_number || '-'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Years in Business</Label><p>{showDetail.years_in_business}</p></div>
                <div><Label className="text-muted-foreground text-xs">Employees</Label><p>{showDetail.employee_count}</p></div>
                <div><Label className="text-muted-foreground text-xs">Annual Revenue</Label><p>{formatSAR(showDetail.annual_revenue)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Insurance</Label><p>{showDetail.has_insurance ? 'Yes' : 'No'}</p></div>
                <div><Label className="text-muted-foreground text-xs">ISO</Label><p>{showDetail.has_iso_certification ? showDetail.iso_details || 'Yes' : 'No'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Safety Cert</Label><p>{showDetail.has_safety_certification ? 'Yes' : 'No'}</p></div>
              </div>

              {/* Required Documents */}
              <div>
                <h3 className="font-semibold mb-2">Required Documents</h3>
                <div className="space-y-2">
                  {appDocuments.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{doc.document_name}</span>
                        {doc.is_required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.is_uploaded ? (
                          <Badge className="bg-green-100 text-green-800 text-[10px]">Uploaded</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-[10px]">Missing</Badge>
                        )}
                        {doc.is_verified && <Badge className="bg-blue-100 text-blue-800 text-[10px]">Verified</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow Actions */}
              {showDetail.status !== 'approved' && showDetail.status !== 'rejected' && showDetail.status !== 'blacklisted' && (
                <div className="flex gap-3 pt-4 border-t">
                  {showDetail.status === 'scoring' && (
                    <Button className="flex-1 gap-2" onClick={() => updateStatus.mutate({ id: showDetail.id, status: 'approved' })}>
                      <ThumbsUp className="h-4 w-4" /> Approve
                    </Button>
                  )}
                  <Button variant="destructive" className="flex-1 gap-2" onClick={() => {
                    const reason = prompt('Rejection reason:');
                    if (reason) updateStatus.mutate({ id: showDetail.id, status: 'rejected', rejection_reason: reason });
                  }}>
                    <ThumbsDown className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={!!showScoring} onOpenChange={() => setShowScoring(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Score: {showScoring?.company_name}</DialogTitle></DialogHeader>
          {showScoring && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Weighted</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map(c => {
                    const existing = scores.find((s: any) => s.criteria_id === c.id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{c.criteria_name}</div>
                          {c.is_mandatory && <Badge variant="outline" className="text-[10px] mt-1">Mandatory</Badge>}
                        </TableCell>
                        <TableCell>{c.weight}x</TableCell>
                        <TableCell>{c.max_score}</TableCell>
                        <TableCell>
                          <Input type="number" min={0} max={c.max_score} className="w-20"
                            defaultValue={existing?.score || 0}
                            onBlur={e => {
                              const val = Math.min(Number(e.target.value), c.max_score);
                              saveScore.mutate({ application_id: showScoring.id, criteria_id: c.id, score: val, weight: c.weight, max_score: c.max_score });
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{existing?.weighted_score?.toFixed(1) || '0.0'}</TableCell>
                        <TableCell>
                          <Input placeholder="Comments" className="w-32" defaultValue={existing?.reviewer_comments || ''}
                            onBlur={e => {
                              if (existing) saveScore.mutate({ application_id: showScoring.id, criteria_id: c.id, score: existing.score, weight: c.weight, max_score: c.max_score, comments: e.target.value });
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">Total Weighted Score: </span>
                  <span className="font-bold">{scores.reduce((s: number, sc: any) => s + (sc.weighted_score || 0), 0).toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm"> / {criteria.reduce((s: number, c: any) => s + (c.weight * c.max_score), 0)}</span>
                </div>
                <Button onClick={() => finalizeScoring.mutate(showScoring.id)} disabled={finalizeScoring.isPending}>
                  Finalize Scoring
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Blacklist Dialog */}
      <Dialog open={showBlacklist} onOpenChange={setShowBlacklist}>
        <DialogContent>
          <DialogHeader><DialogTitle>Blacklist / Suspend Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Action Type</Label>
              <Select value={blacklistForm.action_type} onValueChange={v => setBlacklistForm(p => ({ ...p, action_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspension">Suspension (Temporary)</SelectItem>
                  <SelectItem value="blacklist">Blacklist (Permanent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Application (optional)</Label>
              <Select value={blacklistForm.application_id} onValueChange={v => {
                const app = applications.find(a => a.id === v);
                setBlacklistForm(p => ({ ...p, application_id: v, company_name: app?.company_name || p.company_name }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select application..." /></SelectTrigger>
                <SelectContent>
                  {applications.filter(a => !['blacklisted', 'suspended'].includes(a.status)).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Company Name *</Label><Input value={blacklistForm.company_name} onChange={e => setBlacklistForm(p => ({ ...p, company_name: e.target.value }))} /></div>
            <div><Label>Reason *</Label><Textarea value={blacklistForm.reason} onChange={e => setBlacklistForm(p => ({ ...p, reason: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Effective Date</Label><Input type="date" value={blacklistForm.effective_date} onChange={e => setBlacklistForm(p => ({ ...p, effective_date: e.target.value }))} /></div>
              {blacklistForm.action_type === 'suspension' && (
                <div><Label>Expiry Date</Label><Input type="date" value={blacklistForm.expiry_date} onChange={e => setBlacklistForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
              )}
            </div>
            {blacklistForm.action_type === 'blacklist' && (
              <div className="flex items-center gap-2">
                <Checkbox checked={blacklistForm.is_permanent} onCheckedChange={v => setBlacklistForm(p => ({ ...p, is_permanent: !!v }))} />
                <Label>Permanent Blacklist</Label>
              </div>
            )}
            <Button variant="destructive" onClick={() => addBlacklist.mutate()} disabled={!blacklistForm.company_name || !blacklistForm.reason} className="w-full">
              {blacklistForm.action_type === 'blacklist' ? 'Add to Blacklist' : 'Suspend Vendor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Work Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Code *</Label><Input value={categoryForm.category_code} onChange={e => setCategoryForm(p => ({ ...p, category_code: e.target.value.toUpperCase() }))} placeholder="e.g. ELE" /></div>
            <div><Label>Name *</Label><Input value={categoryForm.category_name} onChange={e => setCategoryForm(p => ({ ...p, category_name: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <Button onClick={() => addCategory.mutate()} disabled={!categoryForm.category_code || !categoryForm.category_name} className="w-full">Add Category</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
