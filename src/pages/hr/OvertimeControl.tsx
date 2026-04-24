import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Clock, Plus, AlertTriangle, CheckCircle, XCircle, Shield, DollarSign, Users, TrendingUp, Download, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const OVERTIME_TYPES = [
  { value: 'regular', label: 'Regular', color: 'bg-blue-100 text-blue-800' },
  { value: 'weekend', label: 'Weekend', color: 'bg-purple-100 text-purple-800' },
  { value: 'holiday', label: 'Holiday', color: 'bg-orange-100 text-orange-800' },
  { value: 'emergency', label: 'Emergency', color: 'bg-red-100 text-red-800' },
  { value: 'night', label: 'Night', color: 'bg-indigo-100 text-indigo-800' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  manager_approved: { label: 'Mgr Approved', variant: 'secondary' },
  hr_approved: { label: 'HR Approved', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const EXCEPTION_SEVERITY: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(262, 80%, 50%)', 'hsl(25, 95%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(220, 70%, 50%)'];

export default function OvertimeControl() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('requests');
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch policies
  const { data: policies = [] } = useQuery({
    queryKey: ['overtime-policies', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('overtime_policies' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch requests
  const { data: requests = [] } = useQuery({
    queryKey: ['overtime-requests', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('overtime_requests' as any).select('*').order('request_date', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch exceptions
  const { data: exceptions = [] } = useQuery({
    queryKey: ['overtime-exceptions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('overtime_exceptions' as any).select('*').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('employees').select('id, first_name, last_name, employee_code, department_id') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.eq('status', 'active').limit(500);
      return data || [];
    },
  });

  // KPIs
  const kpis = useMemo(() => {
    const totalRequests = requests.length;
    const pendingCount = requests.filter((r: any) => r.status === 'pending' || r.status === 'manager_approved').length;
    const approvedHours = requests.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + (r.hours_approved || r.hours_requested || 0), 0);
    const totalPayroll = requests.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + (r.payroll_amount || 0), 0);
    const unresolvedExceptions = exceptions.filter((e: any) => !e.is_resolved).length;
    const avgHours = totalRequests > 0 ? requests.reduce((s: number, r: any) => s + (r.hours_requested || 0), 0) / totalRequests : 0;
    return { totalRequests, pendingCount, approvedHours, totalPayroll, unresolvedExceptions, avgHours };
  }, [requests, exceptions]);

  // Charts data
  const typeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    requests.forEach((r: any) => { map[r.overtime_type || 'regular'] = (map[r.overtime_type || 'regular'] || 0) + (r.hours_requested || 0); });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value * 10) / 10 }));
  }, [requests]);

  const monthlyTrend = useMemo(() => {
    const map: Record<string, { hours: number; cost: number; count: number }> = {};
    requests.forEach((r: any) => {
      const m = r.request_date?.substring(0, 7) || 'Unknown';
      if (!map[m]) map[m] = { hours: 0, cost: 0, count: 0 };
      map[m].hours += r.hours_requested || 0;
      map[m].cost += r.payroll_amount || 0;
      map[m].count++;
    });
    return Object.entries(map).sort().slice(-12).map(([month, d]) => ({ month, ...d }));
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((r: any) => r.status === statusFilter);
  }, [requests, statusFilter]);

  // Policy form
  const [policyForm, setPolicyForm] = useState({
    policy_name: '', policy_code: '', description: '',
    max_daily_hours: 4, max_weekly_hours: 20, max_monthly_hours: 60,
    approval_threshold_hours: 2, regular_multiplier: 1.5,
    weekend_multiplier: 2.0, holiday_multiplier: 2.5, night_multiplier: 1.75,
    meal_break_after_hours: 5, meal_break_duration_minutes: 30,
    manager_approval_required: true, hr_approval_required: false, hr_approval_above_hours: 8,
    applies_to_weekends: true, applies_to_holidays: true, is_active: true,
  });

  const savePolicyMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('overtime_policies' as any).insert({ ...policyForm, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['overtime-policies'] }); setShowPolicyDialog(false); toast.success('Policy created'); },
    onError: () => toast.error('Failed to create policy'),
  });

  // Request form
  const [requestForm, setRequestForm] = useState({
    employee_id: '', overtime_type: 'regular', request_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '17:00', end_time: '20:00', reason: '', task_description: '', policy_id: '',
  });

  const saveRequestMut = useMutation({
    mutationFn: async () => {
      const emp = employees.find((e: any) => e.id === requestForm.employee_id) as any;
      if (!emp) throw new Error('Select employee');
      const [sh, sm] = requestForm.start_time.split(':').map(Number);
      const [eh, em] = requestForm.end_time.split(':').map(Number);
      let hours = (eh + em / 60) - (sh + sm / 60);
      if (hours < 0) hours += 24;

      const policy = policies.find((p: any) => p.id === requestForm.policy_id) as any;
      const multiplier = policy ? (
        requestForm.overtime_type === 'weekend' ? policy.weekend_multiplier :
        requestForm.overtime_type === 'holiday' ? policy.holiday_multiplier :
        requestForm.overtime_type === 'night' ? policy.night_multiplier : policy.regular_multiplier
      ) : 1.5;

      let mealDeduct = 0;
      if (policy && hours >= (policy.meal_break_after_hours || 5)) {
        mealDeduct = policy.meal_break_duration_minutes || 30;
      }
      const netHours = Math.max(0, hours - mealDeduct / 60);

      const { error } = await (supabase.from('overtime_requests' as any).insert({
        company_id: activeCompanyId,
        employee_id: requestForm.employee_id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_code: emp.employee_code,
        overtime_type: requestForm.overtime_type,
        request_date: requestForm.request_date,
        start_time: requestForm.start_time,
        end_time: requestForm.end_time,
        hours_requested: Math.round(netHours * 100) / 100,
        reason: requestForm.reason,
        task_description: requestForm.task_description,
        policy_id: requestForm.policy_id || null,
        multiplier,
        includes_meal_break: mealDeduct > 0,
        meal_break_deducted_minutes: mealDeduct,
        status: 'pending',
      }) as any);
      if (error) throw error;

      // Check policy limits and create exceptions
      if (policy) {
        // Daily check
        const { data: dailyData } = await (supabase.from('overtime_requests' as any).select('hours_requested').eq('employee_id', requestForm.employee_id).eq('request_date', requestForm.request_date).neq('status', 'rejected').neq('status', 'cancelled') as any);
        const dailyTotal = (dailyData || []).reduce((s: number, r: any) => s + (r.hours_requested || 0), 0);
        if (dailyTotal > (policy.max_daily_hours || 4)) {
          await (supabase.from('overtime_exceptions' as any).insert({
            company_id: activeCompanyId, employee_id: requestForm.employee_id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            exception_type: 'daily_limit', severity: 'warning',
            description: `Daily OT of ${dailyTotal.toFixed(1)}h exceeds limit of ${policy.max_daily_hours}h`,
            policy_id: policy.id, policy_name: policy.policy_name,
            current_value: dailyTotal, limit_value: policy.max_daily_hours,
          }) as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-requests'] });
      queryClient.invalidateQueries({ queryKey: ['overtime-exceptions'] });
      setShowRequestDialog(false);
      toast.success('Overtime request submitted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to submit'),
  });

  // Approve/Reject
  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: string; comments?: string }) => {
      const updates: any = { status };
      if (status === 'approved' || status === 'manager_approved') {
        updates.manager_approved_at = new Date().toISOString();
        updates.manager_comments = comments;
      }
      if (status === 'rejected') updates.rejection_reason = comments;
      if (status === 'approved') {
        const req = requests.find((r: any) => r.id === id) as any;
        updates.hours_approved = req?.hours_requested;
        updates.payroll_amount = (req?.hours_requested || 0) * (req?.multiplier || 1.5) * (req?.base_hourly_rate || 0);
      }
      const { error } = await (supabase.from('overtime_requests' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['overtime-requests'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update'),
  });

  const resolveException = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await (supabase.from('overtime_exceptions' as any).update({ is_resolved: true, resolved_at: new Date().toISOString(), resolution_notes: notes || 'Resolved' }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['overtime-exceptions'] }); toast.success('Exception resolved'); },
  });

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(requests.map((r: any) => ({
      Employee: r.employee_name, Code: r.employee_code, Date: r.request_date,
      Type: r.overtime_type, Start: r.start_time, End: r.end_time,
      Hours: r.hours_requested, Approved: r.hours_approved, Multiplier: r.multiplier,
      Amount: r.payroll_amount, Status: r.status, Reason: r.reason,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Overtime');
    XLSX.writeFile(wb, `overtime_report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" />{t('nav.overtimeControl')}</h1>
          <p className="text-muted-foreground">{t('overtime.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />{t('common.export')}</Button>
          <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Shield className="h-4 w-4 mr-1" />{t('overtime.newPolicy')}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('overtime.newPolicy')}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>{t('common.name')}</Label><Input value={policyForm.policy_name} onChange={e => setPolicyForm(p => ({ ...p, policy_name: e.target.value }))} /></div>
                <div><Label>Code</Label><Input value={policyForm.policy_code} onChange={e => setPolicyForm(p => ({ ...p, policy_code: e.target.value }))} /></div>
                <div className="col-span-2"><Label>{t('common.description')}</Label><Textarea value={policyForm.description} onChange={e => setPolicyForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                <div><Label>{t('overtime.maxDaily')}</Label><Input type="number" value={policyForm.max_daily_hours} onChange={e => setPolicyForm(p => ({ ...p, max_daily_hours: +e.target.value }))} /></div>
                <div><Label>{t('overtime.maxWeekly')}</Label><Input type="number" value={policyForm.max_weekly_hours} onChange={e => setPolicyForm(p => ({ ...p, max_weekly_hours: +e.target.value }))} /></div>
                <div><Label>{t('overtime.maxMonthly')}</Label><Input type="number" value={policyForm.max_monthly_hours} onChange={e => setPolicyForm(p => ({ ...p, max_monthly_hours: +e.target.value }))} /></div>
                <div><Label>{t('overtime.approvalThreshold')}</Label><Input type="number" value={policyForm.approval_threshold_hours} onChange={e => setPolicyForm(p => ({ ...p, approval_threshold_hours: +e.target.value }))} /></div>
                <div><Label>{t('overtime.regularMult')}</Label><Input type="number" step="0.25" value={policyForm.regular_multiplier} onChange={e => setPolicyForm(p => ({ ...p, regular_multiplier: +e.target.value }))} /></div>
                <div><Label>{t('overtime.weekendMult')}</Label><Input type="number" step="0.25" value={policyForm.weekend_multiplier} onChange={e => setPolicyForm(p => ({ ...p, weekend_multiplier: +e.target.value }))} /></div>
                <div><Label>{t('overtime.holidayMult')}</Label><Input type="number" step="0.25" value={policyForm.holiday_multiplier} onChange={e => setPolicyForm(p => ({ ...p, holiday_multiplier: +e.target.value }))} /></div>
                <div><Label>{t('overtime.nightMult')}</Label><Input type="number" step="0.25" value={policyForm.night_multiplier} onChange={e => setPolicyForm(p => ({ ...p, night_multiplier: +e.target.value }))} /></div>
                <div><Label>{t('overtime.mealBreakAfter')}</Label><Input type="number" value={policyForm.meal_break_after_hours} onChange={e => setPolicyForm(p => ({ ...p, meal_break_after_hours: +e.target.value }))} /></div>
                <div><Label>{t('overtime.mealBreakDuration')}</Label><Input type="number" value={policyForm.meal_break_duration_minutes} onChange={e => setPolicyForm(p => ({ ...p, meal_break_duration_minutes: +e.target.value }))} /></div>
                <div className="flex items-center gap-2"><Switch checked={policyForm.manager_approval_required} onCheckedChange={v => setPolicyForm(p => ({ ...p, manager_approval_required: v }))} /><Label>{t('overtime.mgrApproval')}</Label></div>
                <div className="flex items-center gap-2"><Switch checked={policyForm.hr_approval_required} onCheckedChange={v => setPolicyForm(p => ({ ...p, hr_approval_required: v }))} /><Label>{t('overtime.hrApproval')}</Label></div>
                {policyForm.hr_approval_required && <div><Label>{t('overtime.hrAboveHours')}</Label><Input type="number" value={policyForm.hr_approval_above_hours} onChange={e => setPolicyForm(p => ({ ...p, hr_approval_above_hours: +e.target.value }))} /></div>}
              </div>
              <DialogFooter><Button onClick={() => savePolicyMut.mutate()} disabled={!policyForm.policy_name}>{t('common.save')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('overtime.newRequest')}</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('overtime.newRequest')}</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div><Label>{t('hr.employee')}</Label>
                  <Select value={requestForm.employee_id} onValueChange={v => setRequestForm(f => ({ ...f, employee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                    <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t('overtime.type')}</Label>
                  <Select value={requestForm.overtime_type} onValueChange={v => setRequestForm(f => ({ ...f, overtime_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OVERTIME_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t('common.date')}</Label><Input type="date" value={requestForm.request_date} onChange={e => setRequestForm(f => ({ ...f, request_date: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t('overtime.startTime')}</Label><Input type="time" value={requestForm.start_time} onChange={e => setRequestForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                  <div><Label>{t('overtime.endTime')}</Label><Input type="time" value={requestForm.end_time} onChange={e => setRequestForm(f => ({ ...f, end_time: e.target.value }))} /></div>
                </div>
                <div><Label>{t('overtime.policy')}</Label>
                  <Select value={requestForm.policy_id} onValueChange={v => setRequestForm(f => ({ ...f, policy_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                    <SelectContent>{policies.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.policy_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t('overtime.reason')}</Label><Textarea value={requestForm.reason} onChange={e => setRequestForm(f => ({ ...f, reason: e.target.value }))} rows={2} /></div>
                <div><Label>{t('overtime.taskDesc')}</Label><Input value={requestForm.task_description} onChange={e => setRequestForm(f => ({ ...f, task_description: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button onClick={() => saveRequestMut.mutate()} disabled={!requestForm.employee_id || !requestForm.start_time}>{t('common.submit')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t('overtime.totalRequests'), value: kpis.totalRequests, icon: Clock, color: 'text-primary' },
          { label: t('overtime.pending'), value: kpis.pendingCount, icon: AlertTriangle, color: 'text-yellow-600' },
          { label: t('overtime.approvedHours'), value: `${kpis.approvedHours.toFixed(1)}h`, icon: CheckCircle, color: 'text-green-600' },
          { label: t('overtime.payrollImpact'), value: `${kpis.totalPayroll.toFixed(0)}`, icon: DollarSign, color: 'text-blue-600' },
          { label: t('overtime.exceptions'), value: kpis.unresolvedExceptions, icon: AlertTriangle, color: 'text-red-600' },
          { label: t('overtime.avgHours'), value: `${kpis.avgHours.toFixed(1)}h`, icon: TrendingUp, color: 'text-purple-600' },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3">
            <k.icon className={`h-5 w-5 ${k.color}`} />
            <div><div className="text-xl font-bold">{k.value}</div><div className="text-xs text-muted-foreground">{k.label}</div></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests">{t('overtime.requests')}</TabsTrigger>
          <TabsTrigger value="policies">{t('overtime.policies')}</TabsTrigger>
          <TabsTrigger value="exceptions">{t('overtime.exceptionsTab')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('overtime.analytics')}</TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('overtime.requests')}</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('hr.employee')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('overtime.type')}</TableHead>
                  <TableHead>{t('overtime.time')}</TableHead>
                  <TableHead>{t('overtime.hours')}</TableHead>
                  <TableHead>{t('overtime.multiplier')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredRequests.map((r: any) => {
                    const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                    const ot = OVERTIME_TYPES.find(t => t.value === r.overtime_type);
                    return (
                      <TableRow key={r.id}>
                        <TableCell><div className="font-medium">{r.employee_name}</div><div className="text-xs text-muted-foreground">{r.employee_code}</div></TableCell>
                        <TableCell>{r.request_date}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${ot?.color || ''}`}>{ot?.label || r.overtime_type}</span></TableCell>
                        <TableCell>{r.start_time} - {r.end_time}</TableCell>
                        <TableCell className="font-medium">{r.hours_requested}h{r.includes_meal_break && <span className="text-xs text-muted-foreground ml-1">(-{r.meal_break_deducted_minutes}m)</span>}</TableCell>
                        <TableCell>×{r.multiplier}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell>
                          {r.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 text-green-600" onClick={() => updateStatusMut.mutate({ id: r.id, status: 'approved' })}><CheckCircle className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 text-red-600" onClick={() => updateStatusMut.mutate({ id: r.id, status: 'rejected', comments: 'Rejected' })}><XCircle className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                          {r.status === 'manager_approved' && (
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => updateStatusMut.mutate({ id: r.id, status: 'approved' })}>HR Approve</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredRequests.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>Daily/Wk/Mo Limits</TableHead>
                <TableHead>Multipliers (R/W/H/N)</TableHead>
                <TableHead>Meal Break</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {policies.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell><div className="font-medium">{p.policy_name}</div><div className="text-xs text-muted-foreground">{p.policy_code}</div></TableCell>
                    <TableCell>{p.max_daily_hours}h / {p.max_weekly_hours}h / {p.max_monthly_hours}h</TableCell>
                    <TableCell>×{p.regular_multiplier} / ×{p.weekend_multiplier} / ×{p.holiday_multiplier} / ×{p.night_multiplier}</TableCell>
                    <TableCell>{p.meal_break_after_hours}h → {p.meal_break_duration_minutes}min</TableCell>
                    <TableCell>
                      {p.manager_approval_required && <Badge variant="outline" className="mr-1">Mgr</Badge>}
                      {p.hr_approval_required && <Badge variant="outline">HR &gt;{p.hr_approval_above_hours}h</Badge>}
                    </TableCell>
                    <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? t('common.active') : t('common.inactive')}</Badge></TableCell>
                  </TableRow>
                ))}
                {policies.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Exceptions Tab */}
        <TabsContent value="exceptions">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('hr.employee')}</TableHead>
                <TableHead>{t('overtime.exceptionType')}</TableHead>
                <TableHead>{t('overtime.severity')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead>Current / Limit</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {exceptions.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.employee_name || '—'}</TableCell>
                    <TableCell>{e.exception_type?.replace(/_/g, ' ')}</TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${EXCEPTION_SEVERITY[e.severity] || ''}`}>{e.severity}</span></TableCell>
                    <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                    <TableCell>{e.current_value ?? '—'} / {e.limit_value ?? '—'}</TableCell>
                    <TableCell><Badge variant={e.is_resolved ? 'default' : 'destructive'}>{e.is_resolved ? t('common.resolved') : t('common.open')}</Badge></TableCell>
                    <TableCell>
                      {!e.is_resolved && <Button size="sm" variant="ghost" className="h-7" onClick={() => resolveException.mutate({ id: e.id })}>{t('common.resolve')}</Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {exceptions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base">{t('overtime.byType')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart><Pie data={typeDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}h`}>
                    {typeDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><RTooltip /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">{t('overtime.monthlyTrend')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="count" name="Requests" fill="hsl(262, 80%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
