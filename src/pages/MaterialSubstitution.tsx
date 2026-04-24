import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ArrowRightLeft, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, MessageSquare, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Draft', labelAr: 'مسودة', variant: 'secondary', icon: Clock },
  pending_technical: { label: 'Technical Review', labelAr: 'مراجعة فنية', variant: 'outline', icon: Clock },
  pending_commercial: { label: 'Commercial Review', labelAr: 'مراجعة تجارية', variant: 'outline', icon: Clock },
  approved: { label: 'Approved', labelAr: 'معتمد', variant: 'default', icon: CheckCircle },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', labelAr: 'ملغي', variant: 'secondary', icon: XCircle },
};

const CATEGORIES = [
  { value: 'availability', label: 'Availability', labelAr: 'التوفر' },
  { value: 'cost_saving', label: 'Cost Saving', labelAr: 'توفير التكلفة' },
  { value: 'quality_upgrade', label: 'Quality Upgrade', labelAr: 'تحسين الجودة' },
  { value: 'lead_time', label: 'Lead Time', labelAr: 'وقت التسليم' },
  { value: 'specification_change', label: 'Spec Change', labelAr: 'تغيير المواصفات' },
  { value: 'vendor_change', label: 'Vendor Change', labelAr: 'تغيير المورد' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

const QUALITY_IMPACTS = [
  { value: 'equivalent', label: 'Equivalent', labelAr: 'مكافئ' },
  { value: 'superior', label: 'Superior', labelAr: 'أفضل' },
  { value: 'inferior', label: 'Inferior', labelAr: 'أقل' },
  { value: 'unknown', label: 'Unknown', labelAr: 'غير معروف' },
];

export default function MaterialSubstitution() {
  const { language } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const isAr = language === 'ar';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: substitutions = [], isLoading } = useQuery({
    queryKey: ['material-substitutions', activeCompanyId, statusFilter, categoryFilter],
    queryFn: async () => {
      let q = supabase.from('material_substitutions' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (categoryFilter !== 'all') q = q.eq('category', categoryFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = {
    total: substitutions.length,
    pending: substitutions.filter((s: any) => s.status === 'pending_technical' || s.status === 'pending_commercial').length,
    approved: substitutions.filter((s: any) => s.status === 'approved').length,
    costSaving: substitutions.filter((s: any) => s.status === 'approved').reduce((sum: number, s: any) => sum + (Number(s.cost_impact) || 0), 0),
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'بدائل المواد' : 'Material Substitution'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'إدارة طلبات استبدال المواد والموافقات' : 'Manage material substitution requests and approvals'}</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{isAr ? 'طلب استبدال جديد' : 'New Substitution'}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isAr ? 'طلب استبدال مادة' : 'Material Substitution Request'}</DialogTitle>
            </DialogHeader>
            <CreateSubstitutionForm
              companyId={activeCompanyId}
              onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['material-substitutions'] }); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'الإجمالي' : 'Total Requests'}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'قيد المراجعة' : 'Pending Review'}</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'معتمد' : 'Approved'}</p>
          <p className="text-2xl font-bold text-primary">{stats.approved}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{isAr ? 'أثر التكلفة' : 'Cost Impact'}</p>
          <p className={cn('text-2xl font-bold', stats.costSaving < 0 ? 'text-primary' : stats.costSaving > 0 ? 'text-destructive' : '')}>
            {stats.costSaving < 0 ? '' : '+'}{stats.costSaving.toLocaleString()}
          </p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Status'}</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{isAr ? v.labelAr : v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'كل الفئات' : 'All Categories'}</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{isAr ? c.labelAr : c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'رقم' : '#'}</TableHead>
                <TableHead>{isAr ? 'المادة الأصلية' : 'Original Item'}</TableHead>
                <TableHead>{isAr ? 'البديل المقترح' : 'Proposed Item'}</TableHead>
                <TableHead>{isAr ? 'الفئة' : 'Category'}</TableHead>
                <TableHead>{isAr ? 'أثر التكلفة' : 'Cost Impact'}</TableHead>
                <TableHead>{isAr ? 'الجودة' : 'Quality'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{isAr ? 'الطالب' : 'Requester'}</TableHead>
                <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : substitutions.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد طلبات' : 'No substitution requests found'}</TableCell></TableRow>
              ) : substitutions.map((sub: any) => {
                const sc = STATUS_CONFIG[sub.status] || STATUS_CONFIG.draft;
                const Icon = sc.icon;
                const costImpact = Number(sub.cost_impact) || 0;
                const cat = CATEGORIES.find(c => c.value === sub.category);
                return (
                  <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedSub(sub); setShowDetail(true); }}>
                    <TableCell className="font-mono text-xs">{sub.substitution_number}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{sub.original_item_code}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{sub.original_item_description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{sub.proposed_item_code}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{sub.proposed_item_description}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{isAr ? cat?.labelAr : cat?.label}</Badge></TableCell>
                    <TableCell>
                      <span className={cn('text-sm font-medium flex items-center gap-1', costImpact < 0 ? 'text-primary' : costImpact > 0 ? 'text-destructive' : '')}>
                        {costImpact < 0 ? <TrendingDown className="h-3 w-3" /> : costImpact > 0 ? <TrendingUp className="h-3 w-3" /> : null}
                        {costImpact < 0 ? '' : '+'}{costImpact.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.quality_impact === 'superior' ? 'default' : sub.quality_impact === 'inferior' ? 'destructive' : 'outline'} className="text-xs">
                        {sub.quality_impact || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant={sc.variant} className="gap-1"><Icon className="h-3 w-3" />{isAr ? sc.labelAr : sc.label}</Badge></TableCell>
                    <TableCell className="text-xs">{sub.requested_by_name}</TableCell>
                    <TableCell className="text-xs">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : ''}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSub && (
            <SubstitutionDetail
              sub={selectedSub}
              onUpdate={() => { qc.invalidateQueries({ queryKey: ['material-substitutions'] }); setShowDetail(false); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateSubstitutionForm({ companyId, onSuccess }: { companyId: string | null; onSuccess: () => void }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [form, setForm] = useState({
    original_item_code: '', original_item_description: '', original_brand: '', original_specification: '', original_unit_price: 0, original_lead_time_days: 0, original_quantity: 1,
    proposed_item_code: '', proposed_item_description: '', proposed_brand: '', proposed_specification: '', proposed_unit_price: 0, proposed_lead_time_days: 0, proposed_quantity: 1,
    quality_impact: 'equivalent', category: 'availability', urgency: 'normal', reason: '',
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('material_substitutions' as any).insert({
        ...form,
        company_id: companyId,
        requested_by: user?.id,
        requested_by_name: user?.email,
        status: 'draft',
        lead_time_impact_days: (form.proposed_lead_time_days || 0) - (form.original_lead_time_days || 0),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isAr ? 'تم إنشاء الطلب' : 'Substitution request created'); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Original */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
          <h3 className="font-semibold text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-muted-foreground" />{isAr ? 'المادة الأصلية' : 'Original Item'}</h3>
          <div><Label className="text-xs">{isAr ? 'كود المادة' : 'Item Code'}</Label><Input value={form.original_item_code} onChange={e => set('original_item_code', e.target.value)} /></div>
          <div><Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label><Input value={form.original_item_description} onChange={e => set('original_item_description', e.target.value)} /></div>
          <div><Label className="text-xs">{isAr ? 'العلامة التجارية' : 'Brand'}</Label><Input value={form.original_brand} onChange={e => set('original_brand', e.target.value)} /></div>
          <div><Label className="text-xs">{isAr ? 'المواصفات' : 'Specification'}</Label><Textarea value={form.original_specification} onChange={e => set('original_specification', e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">{isAr ? 'السعر' : 'Price'}</Label><Input type="number" value={form.original_unit_price} onChange={e => set('original_unit_price', +e.target.value)} /></div>
            <div><Label className="text-xs">{isAr ? 'الكمية' : 'Qty'}</Label><Input type="number" value={form.original_quantity} onChange={e => set('original_quantity', +e.target.value)} /></div>
            <div><Label className="text-xs">{isAr ? 'أيام التسليم' : 'Lead (days)'}</Label><Input type="number" value={form.original_lead_time_days} onChange={e => set('original_lead_time_days', +e.target.value)} /></div>
          </div>
        </div>
        {/* Proposed */}
        <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="font-semibold text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />{isAr ? 'البديل المقترح' : 'Proposed Item'}</h3>
          <div><Label className="text-xs">{isAr ? 'كود المادة' : 'Item Code'}</Label><Input value={form.proposed_item_code} onChange={e => set('proposed_item_code', e.target.value)} /></div>
          <div><Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label><Input value={form.proposed_item_description} onChange={e => set('proposed_item_description', e.target.value)} /></div>
          <div><Label className="text-xs">{isAr ? 'العلامة التجارية' : 'Brand'}</Label><Input value={form.proposed_brand} onChange={e => set('proposed_brand', e.target.value)} /></div>
          <div><Label className="text-xs">{isAr ? 'المواصفات' : 'Specification'}</Label><Textarea value={form.proposed_specification} onChange={e => set('proposed_specification', e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">{isAr ? 'السعر' : 'Price'}</Label><Input type="number" value={form.proposed_unit_price} onChange={e => set('proposed_unit_price', +e.target.value)} /></div>
            <div><Label className="text-xs">{isAr ? 'الكمية' : 'Qty'}</Label><Input type="number" value={form.proposed_quantity} onChange={e => set('proposed_quantity', +e.target.value)} /></div>
            <div><Label className="text-xs">{isAr ? 'أيام التسليم' : 'Lead (days)'}</Label><Input type="number" value={form.proposed_lead_time_days} onChange={e => set('proposed_lead_time_days', +e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* Comparison Summary */}
      {(form.original_unit_price > 0 || form.proposed_unit_price > 0) && (
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-2">{isAr ? 'ملخص المقارنة' : 'Comparison Summary'}</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{isAr ? 'فرق التكلفة' : 'Cost Difference'}:</span>
                <span className={cn('font-bold ml-2', ((form.proposed_unit_price * form.proposed_quantity) - (form.original_unit_price * form.original_quantity)) < 0 ? 'text-primary' : 'text-destructive')}>
                  {((form.proposed_unit_price * form.proposed_quantity) - (form.original_unit_price * form.original_quantity)).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{isAr ? 'فرق وقت التسليم' : 'Lead Time Diff'}:</span>
                <span className="font-bold ml-2">{(form.proposed_lead_time_days - form.original_lead_time_days)} {isAr ? 'يوم' : 'days'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">{isAr ? 'الفئة' : 'Category'}</Label>
          <Select value={form.category} onValueChange={v => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{isAr ? c.labelAr : c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{isAr ? 'أثر الجودة' : 'Quality Impact'}</Label>
          <Select value={form.quality_impact} onValueChange={v => set('quality_impact', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{QUALITY_IMPACTS.map(q => <SelectItem key={q.value} value={q.value}>{isAr ? q.labelAr : q.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{isAr ? 'الأولوية' : 'Urgency'}</Label>
          <Select value={form.urgency} onValueChange={v => set('urgency', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{isAr ? 'منخفضة' : 'Low'}</SelectItem>
              <SelectItem value="normal">{isAr ? 'عادية' : 'Normal'}</SelectItem>
              <SelectItem value="high">{isAr ? 'عالية' : 'High'}</SelectItem>
              <SelectItem value="critical">{isAr ? 'حرجة' : 'Critical'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">{isAr ? 'سبب الاستبدال' : 'Reason for Substitution'}</Label>
        <Textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={3} placeholder={isAr ? 'اشرح سبب الاستبدال...' : 'Explain why this substitution is needed...'} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onSuccess()}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending || !form.original_item_code || !form.proposed_item_code || !form.reason}>
          {create.isPending ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'إنشاء الطلب' : 'Create Request')}
        </Button>
      </div>
    </div>
  );
}

function SubstitutionDetail({ sub, onUpdate }: { sub: any; onUpdate: () => void }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [comment, setComment] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['sub-comments', sub.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from('material_substitution_comments' as any).select('*').eq('substitution_id', sub.id).order('created_at') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from('material_substitution_comments' as any).insert({ substitution_id: sub.id, comment, comment_by: user?.id, comment_by_name: user?.email }) as any);
    },
    onSuccess: () => { setComment(''); toast.success(isAr ? 'تم إضافة التعليق' : 'Comment added'); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ action, role }: { action: string; role: 'technical' | 'commercial' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updates: any = {};
      if (role === 'technical') {
        updates.technical_reviewer_id = user?.id;
        updates.technical_reviewer_name = user?.email;
        updates.technical_decision = action;
        updates.technical_comments = reviewComment;
        updates.technical_reviewed_at = new Date().toISOString();
        updates.status = action === 'rejected' ? 'rejected' : 'pending_commercial';
      } else {
        updates.commercial_reviewer_id = user?.id;
        updates.commercial_reviewer_name = user?.email;
        updates.commercial_decision = action;
        updates.commercial_comments = reviewComment;
        updates.commercial_reviewed_at = new Date().toISOString();
        updates.status = action === 'rejected' ? 'rejected' : 'approved';
        if (action !== 'rejected') {
          updates.final_decision = 'approved';
          updates.final_decision_notes = reviewComment;
        }
      }
      const { error } = await (supabase.from('material_substitutions' as any).update(updates).eq('id', sub.id) as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isAr ? 'تم التحديث' : 'Updated'); onUpdate(); },
  });

  const submitForReview = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('material_substitutions' as any).update({ status: 'pending_technical' }).eq('id', sub.id) as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isAr ? 'تم الإرسال للمراجعة' : 'Submitted for review'); onUpdate(); },
  });

  const costImpact = Number(sub.cost_impact) || 0;
  const leadImpact = sub.lead_time_impact_days || 0;
  const sc = STATUS_CONFIG[sub.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <ArrowRightLeft className="h-5 w-5" />
          {sub.substitution_number}
          <Badge variant={sc.variant}>{isAr ? sc.labelAr : sc.label}</Badge>
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="comparison">
        <TabsList>
          <TabsTrigger value="comparison">{isAr ? 'المقارنة' : 'Comparison'}</TabsTrigger>
          <TabsTrigger value="approval">{isAr ? 'الموافقات' : 'Approvals'}</TabsTrigger>
          <TabsTrigger value="comments">{isAr ? 'التعليقات' : 'Comments'} ({comments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-muted">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'المادة الأصلية' : 'Original Item'}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">{isAr ? 'الكود' : 'Code'}:</span> <span className="font-medium">{sub.original_item_code}</span></div>
                <div><span className="text-muted-foreground">{isAr ? 'الوصف' : 'Desc'}:</span> {sub.original_item_description}</div>
                <div><span className="text-muted-foreground">{isAr ? 'العلامة' : 'Brand'}:</span> {sub.original_brand || '-'}</div>
                <div><span className="text-muted-foreground">{isAr ? 'المواصفات' : 'Spec'}:</span> {sub.original_specification || '-'}</div>
                <div><span className="text-muted-foreground">{isAr ? 'السعر' : 'Price'}:</span> {Number(sub.original_unit_price).toLocaleString()}</div>
                <div><span className="text-muted-foreground">{isAr ? 'الكمية' : 'Qty'}:</span> {sub.original_quantity}</div>
                <div><span className="text-muted-foreground">{isAr ? 'التسليم' : 'Lead'}:</span> {sub.original_lead_time_days} {isAr ? 'يوم' : 'days'}</div>
                <div className="font-semibold border-t pt-2">{isAr ? 'الإجمالي' : 'Total'}: {(Number(sub.original_unit_price) * Number(sub.original_quantity)).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="border-primary/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">{isAr ? 'البديل المقترح' : 'Proposed Item'}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">{isAr ? 'الكود' : 'Code'}:</span> <span className="font-medium">{sub.proposed_item_code}</span></div>
                <div><span className="text-muted-foreground">{isAr ? 'الوصف' : 'Desc'}:</span> {sub.proposed_item_description}</div>
                <div><span className="text-muted-foreground">{isAr ? 'العلامة' : 'Brand'}:</span> {sub.proposed_brand || '-'}</div>
                <div><span className="text-muted-foreground">{isAr ? 'المواصفات' : 'Spec'}:</span> {sub.proposed_specification || '-'}</div>
                <div><span className="text-muted-foreground">{isAr ? 'السعر' : 'Price'}:</span> {Number(sub.proposed_unit_price).toLocaleString()}</div>
                <div><span className="text-muted-foreground">{isAr ? 'الكمية' : 'Qty'}:</span> {sub.proposed_quantity}</div>
                <div><span className="text-muted-foreground">{isAr ? 'التسليم' : 'Lead'}:</span> {sub.proposed_lead_time_days} {isAr ? 'يوم' : 'days'}</div>
                <div className="font-semibold border-t pt-2">{isAr ? 'الإجمالي' : 'Total'}: {(Number(sub.proposed_unit_price) * Number(sub.proposed_quantity)).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Impact Summary */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3">{isAr ? 'ملخص الأثر' : 'Impact Summary'}</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{isAr ? 'أثر التكلفة' : 'Cost Impact'}</span>
                  <p className={cn('font-bold', costImpact < 0 ? 'text-primary' : costImpact > 0 ? 'text-destructive' : '')}>
                    {costImpact < 0 ? '' : '+'}{costImpact.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isAr ? 'أثر التسليم' : 'Lead Time'}</span>
                  <p className={cn('font-bold', leadImpact < 0 ? 'text-primary' : leadImpact > 0 ? 'text-destructive' : '')}>
                    {leadImpact > 0 ? '+' : ''}{leadImpact} {isAr ? 'يوم' : 'days'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{isAr ? 'أثر الجودة' : 'Quality'}</span>
                  <Badge variant={sub.quality_impact === 'superior' ? 'default' : sub.quality_impact === 'inferior' ? 'destructive' : 'outline'}>{sub.quality_impact}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{isAr ? 'الفئة' : 'Category'}</span>
                  <p className="font-medium">{CATEGORIES.find(c => c.value === sub.category)?.[isAr ? 'labelAr' : 'label']}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <span className="text-muted-foreground text-sm">{isAr ? 'السبب' : 'Reason'}:</span>
                <p className="text-sm mt-1">{sub.reason}</p>
              </div>
            </CardContent>
          </Card>

          {sub.status === 'draft' && (
            <div className="flex justify-end">
              <Button onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                {isAr ? 'إرسال للمراجعة الفنية' : 'Submit for Technical Review'}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          {/* Technical Review */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'المراجعة الفنية' : 'Technical Review'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {sub.technical_decision ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={sub.technical_decision === 'approved' || sub.technical_decision === 'conditionally_approved' ? 'default' : 'destructive'}>
                      {sub.technical_decision}
                    </Badge>
                    <span className="text-muted-foreground">by {sub.technical_reviewer_name}</span>
                    <span className="text-muted-foreground">{sub.technical_reviewed_at ? new Date(sub.technical_reviewed_at).toLocaleDateString() : ''}</span>
                  </div>
                  {sub.technical_comments && <p className="text-muted-foreground">{sub.technical_comments}</p>}
                </div>
              ) : sub.status === 'pending_technical' ? (
                <div className="space-y-3">
                  <Textarea placeholder={isAr ? 'ملاحظات فنية...' : 'Technical review comments...'} value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus.mutate({ action: 'approved', role: 'technical' })}><CheckCircle className="h-3 w-3 mr-1" />{isAr ? 'موافقة' : 'Approve'}</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ action: 'conditionally_approved', role: 'technical' })}>{isAr ? 'موافقة مشروطة' : 'Conditional'}</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ action: 'rejected', role: 'technical' })}><XCircle className="h-3 w-3 mr-1" />{isAr ? 'رفض' : 'Reject'}</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{isAr ? 'في الانتظار' : 'Awaiting submission'}</p>
              )}
            </CardContent>
          </Card>

          {/* Commercial Review */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'المراجعة التجارية' : 'Commercial Review'}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {sub.commercial_decision ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={sub.commercial_decision === 'approved' || sub.commercial_decision === 'conditionally_approved' ? 'default' : 'destructive'}>
                      {sub.commercial_decision}
                    </Badge>
                    <span className="text-muted-foreground">by {sub.commercial_reviewer_name}</span>
                    <span className="text-muted-foreground">{sub.commercial_reviewed_at ? new Date(sub.commercial_reviewed_at).toLocaleDateString() : ''}</span>
                  </div>
                  {sub.commercial_comments && <p className="text-muted-foreground">{sub.commercial_comments}</p>}
                </div>
              ) : sub.status === 'pending_commercial' ? (
                <div className="space-y-3">
                  <Textarea placeholder={isAr ? 'ملاحظات تجارية...' : 'Commercial review comments...'} value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus.mutate({ action: 'approved', role: 'commercial' })}><CheckCircle className="h-3 w-3 mr-1" />{isAr ? 'موافقة' : 'Approve'}</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ action: 'conditionally_approved', role: 'commercial' })}>{isAr ? 'موافقة مشروطة' : 'Conditional'}</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ action: 'rejected', role: 'commercial' })}><XCircle className="h-3 w-3 mr-1" />{isAr ? 'رفض' : 'Reject'}</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{isAr ? 'في انتظار المراجعة الفنية' : 'Awaiting technical review'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{isAr ? 'لا توجد تعليقات' : 'No comments yet'}</p>}
            {comments.map((c: any) => (
              <div key={c.id} className="p-3 bg-muted/30 rounded-lg text-sm">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{c.comment_by_name}</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <p>{c.comment}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={comment} onChange={e => setComment(e.target.value)} placeholder={isAr ? 'أضف تعليق...' : 'Add a comment...'} onKeyDown={e => e.key === 'Enter' && comment && addComment.mutate()} />
            <Button size="sm" onClick={() => addComment.mutate()} disabled={!comment || addComment.isPending}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
