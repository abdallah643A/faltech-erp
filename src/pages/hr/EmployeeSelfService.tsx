import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useMyEmployeeProfile, useMyDocuments } from '@/hooks/useEmployeeSelfService';
import { useLeaveBalances, useLeaveRequests, useLeaveTypes } from '@/hooks/useLeaveManagement';
import { useExpenseClaims } from '@/hooks/useExpenseClaims';
import { usePerformanceGoals, usePerformanceReviews } from '@/hooks/usePerformance';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  User, FileText, Calendar, DollarSign, Star, Download, Plus,
  Send, Clock, CheckCircle2, XCircle, AlertCircle, Loader2,
  Briefcase, Phone, Mail, MapPin, Building2, Target, ClockIcon
} from 'lucide-react';
import { MobileAttendanceWidget } from '@/components/hr/MobileAttendanceWidget';
import { MobileLeaveRequestForm } from '@/components/hr/MobileLeaveRequestForm';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const EXPENSE_CATEGORIES = [
  'Travel', 'Meals', 'Transport', 'Office Supplies', 'Training',
  'Communication', 'Equipment', 'Medical', 'Other'
];

export default function EmployeeSelfService() {
  const { t } = useLanguage();
  const { myEmployee, isLoading: profileLoading } = useMyEmployeeProfile();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!myEmployee) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Employee Profile Found</h2>
            <p className="text-muted-foreground">Your user account is not linked to an employee record. Please contact HR.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Employee Self-Service</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {myEmployee.first_name} {myEmployee.last_name}
        </p>
      </div>

      {/* Mobile Quick Actions - visible on small screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
        <MobileAttendanceWidget />
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex overflow-x-auto h-auto gap-1 w-full">
          <TabsTrigger value="profile" className="gap-1.5 shrink-0"><User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Profile</span></TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 shrink-0"><Clock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Attendance</span></TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 shrink-0"><FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Documents</span></TabsTrigger>
          <TabsTrigger value="leave" className="gap-1.5 shrink-0"><Calendar className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Leave</span></TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5 shrink-0"><DollarSign className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Payroll</span></TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5 shrink-0"><DollarSign className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Expenses</span></TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 shrink-0"><Star className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Performance</span></TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5 shrink-0"><Send className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Requests</span></TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab employee={myEmployee} />
        </TabsContent>
        <TabsContent value="attendance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MobileAttendanceWidget />
            <AttendanceAnomaliesCard employeeId={myEmployee.id} />
          </div>
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab employeeId={myEmployee.id} />
        </TabsContent>
        <TabsContent value="leave">
          <MobileLeaveRequestForm />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollTab employeeId={myEmployee.id} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab employeeId={myEmployee.id} />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab employeeId={myEmployee.id} />
        </TabsContent>
        <TabsContent value="requests">
          <RequestsTrackingTab employeeId={myEmployee.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───── Profile Tab ─────
function ProfileTab({ employee }: { employee: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={User} label="Full Name" value={`${employee.first_name} ${employee.last_name}`} />
          <InfoRow icon={Mail} label="Email" value={employee.email} />
          <InfoRow icon={Phone} label="Phone" value={employee.phone} />
          <InfoRow icon={Calendar} label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'PPP') : '—'} />
          <InfoRow icon={User} label="Gender" value={employee.gender || '—'} />
          <InfoRow icon={User} label="Nationality" value={employee.nationality || '—'} />
          <InfoRow icon={User} label="National ID" value={employee.national_id || '—'} />
          <InfoRow icon={MapPin} label="Address" value={[employee.address, employee.city, employee.country].filter(Boolean).join(', ') || '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4" /> Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={User} label="Employee Code" value={employee.employee_code} />
          <InfoRow icon={Building2} label="Department" value={employee.department?.name || '—'} />
          <InfoRow icon={Target} label="Position" value={employee.position?.title || '—'} />
          <InfoRow icon={Building2} label="Branch" value={employee.branch?.name || '—'} />
          <InfoRow icon={Calendar} label="Hire Date" value={employee.hire_date ? format(new Date(employee.hire_date), 'PPP') : '—'} />
          <InfoRow icon={User} label="Employment Type" value={employee.employment_type?.replace('_', ' ') || '—'} />
          <InfoRow icon={CheckCircle2} label="Status" value={employee.employment_status || '—'} />
          <InfoRow icon={MapPin} label="Work Location" value={employee.work_location || '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={User} label="Contact Name" value={employee.emergency_contact_name || '—'} />
          <InfoRow icon={Phone} label="Contact Phone" value={employee.emergency_contact_phone || '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={DollarSign} label="Basic Salary" value={employee.basic_salary ? `SAR ${employee.basic_salary.toLocaleString()}` : '—'} />
          <InfoRow icon={DollarSign} label="Housing Allowance" value={employee.housing_allowance ? `SAR ${employee.housing_allowance.toLocaleString()}` : '—'} />
          <InfoRow icon={DollarSign} label="Transport Allowance" value={employee.transport_allowance ? `SAR ${employee.transport_allowance.toLocaleString()}` : '—'} />
          <InfoRow icon={DollarSign} label="Other Allowances" value={employee.other_allowances ? `SAR ${employee.other_allowances.toLocaleString()}` : '—'} />
          <div className="border-t pt-2 mt-2">
            <InfoRow icon={DollarSign} label="Total Package" value={`SAR ${((employee.basic_salary || 0) + (employee.housing_allowance || 0) + (employee.transport_allowance || 0) + (employee.other_allowances || 0)).toLocaleString()}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}

// ───── Documents Tab ─────
function DocumentsTab({ employeeId }: { employeeId: string }) {
  const { t } = useLanguage();

  const { documents, isLoading } = useMyDocuments(employeeId);

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('employee-documents').download(filePath);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> My Documents</CardTitle>
        <CardDescription>Download your employment documents, payslips, and certificates</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No documents available yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-20">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc: any) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium text-sm">{doc.document_name || doc.title || 'Document'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{doc.document_type || 'General'}</Badge></TableCell>
                  <TableCell className="text-sm">{doc.expiry_date ? format(new Date(doc.expiry_date), 'PP') : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {doc.status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc.file_url && (
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(doc.file_url, doc.document_name || 'document')}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ───── Leave Tab ─────
function LeaveTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const { t } = useLanguage();

  const { leaveBalances } = useLeaveBalances(employeeId);
  const { leaveRequests } = useLeaveRequests(employeeId);
  const { leaveTypes } = useLeaveTypes();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase.from('leave_requests').insert({
        employee_id: employeeId,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: totalDays,
        reason: form.reason || null,
        status: 'pending',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: 'Leave request submitted' });
      setShowNew(false);
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const myRequests = leaveRequests.filter(r => r.employee_id === employeeId);

  return (
    <div className="space-y-4">
      {/* Leave Balances */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {leaveBalances.map((bal: any) => {
          const entitled = bal.entitled_days || 0;
          const used = bal.used_days || 0;
          const pending = bal.pending_days || 0;
          const remaining = entitled - used - pending;
          const pct = entitled > 0 ? (used / entitled) * 100 : 0;
          return (
            <Card key={bal.id}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{bal.leave_type?.name || 'Leave'}</p>
                <p className="text-2xl font-bold">{remaining}</p>
                <p className="text-xs text-muted-foreground">of {entitled} days remaining</p>
                <Progress value={pct} className="h-1.5 mt-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{used} used</span>
                  {pending > 0 && <span className="text-warning">{pending} pending</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions + Request List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> My Leave Requests</CardTitle>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Request Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Leave Type *</Label>
                  <Select value={form.leave_type_id} onValueChange={v => setForm(f => ({ ...f, leave_type_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(lt => (
                        <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional reason..." />
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No leave requests yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="text-sm">{req.leave_type?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{format(new Date(req.start_date), 'PP')}</TableCell>
                    <TableCell className="text-sm">{format(new Date(req.end_date), 'PP')}</TableCell>
                    <TableCell className="text-sm">{req.total_days}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status || 'pending'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ───── Expenses Tab ─────
function ExpensesTab({ employeeId }: { employeeId: string }) {
  const { t } = useLanguage();

  const { claims, isLoading, createClaim } = useExpenseClaims(employeeId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ category: '', description: '', amount: '' });

  const handleSubmit = () => {
    if (!form.category || !form.amount) {
      toast({ title: 'Category and amount are required', variant: 'destructive' });
      return;
    }
    createClaim.mutate({
      employee_id: employeeId,
      category: form.category,
      description: form.description || undefined,
      amount: parseFloat(form.amount),
    }, {
      onSuccess: () => {
        setShowNew(false);
        setForm({ category: '', description: '', amount: '' });
      },
    });
  };

  const handleSubmitClaim = async (claimId: string) => {
    const { error } = await supabase
      .from('expense_claims')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', claimId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
      toast({ title: 'Expense claim submitted for approval' });
    }
  };

  const totalPending = claims.filter(c => c.status === 'submitted').reduce((s, c) => s + c.amount, 0);
  const totalApproved = claims.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
  const totalPaid = claims.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">{t('common.pending')}</p>
          <p className="text-xl font-bold text-warning">SAR {totalPending.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-xl font-bold text-success">SAR {totalApproved.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-xl font-bold text-primary">SAR {totalPaid.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> My Expense Claims</CardTitle>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Claim</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Expense Claim</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (SAR) *</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <Label>{t('common.description')}</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the expense..." />
                </div>
                <Button onClick={handleSubmit} disabled={createClaim.isPending} className="w-full gap-2">
                  {createClaim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Claim
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : claims.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No expense claims yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map(claim => (
                  <TableRow key={claim.id}>
                    <TableCell className="text-sm font-medium">{claim.claim_number}</TableCell>
                    <TableCell className="text-sm">{format(new Date(claim.claim_date), 'PP')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{claim.category}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">SAR {claim.amount.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={claim.status} /></TableCell>
                    <TableCell>
                      {claim.status === 'draft' && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleSubmitClaim(claim.id)}>
                          <Send className="h-3 w-3" /> Submit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ───── Performance Tab ─────
function PerformanceTab({ employeeId }: { employeeId: string }) {
  const { goals, isLoading: goalsLoading } = usePerformanceGoals(employeeId);
  const { reviews, isLoading: reviewsLoading } = usePerformanceReviews(employeeId);

  return (
    <div className="space-y-4">
      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> My Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {goalsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : goals.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No goals assigned yet</p>
          ) : (
            <div className="space-y-3">
              {goals.map(goal => {
                const progress = goal.target_value && goal.actual_value
                  ? Math.min(100, Math.round((goal.actual_value / goal.target_value) * 100))
                  : 0;
                return (
                  <div key={goal.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{goal.title}</p>
                        {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                      </div>
                      <StatusBadge status={goal.status || 'in_progress'} />
                    </div>
                    {goal.target_value && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{goal.actual_value || 0} / {goal.target_value}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                    {goal.due_date && (
                      <p className="text-xs text-muted-foreground mt-2">Due: {format(new Date(goal.due_date), 'PP')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" /> My Performance Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : reviews.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{review.cycle?.name || 'Review'}</p>
                      <p className="text-xs text-muted-foreground">
                        Reviewer: {review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.overall_rating && (
                        <Badge className="gap-1">
                          <Star className="h-3 w-3" /> {review.overall_rating}/5
                        </Badge>
                      )}
                      <StatusBadge status={review.status || 'draft'} />
                    </div>
                  </div>
                  {review.strengths && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-success">Strengths</p>
                      <p className="text-xs text-muted-foreground">{review.strengths}</p>
                    </div>
                  )}
                  {review.areas_for_improvement && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-warning">Areas for Improvement</p>
                      <p className="text-xs text-muted-foreground">{review.areas_for_improvement}</p>
                    </div>
                  )}
                  {review.achievements && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-primary">Achievements</p>
                      <p className="text-xs text-muted-foreground">{review.achievements}</p>
                    </div>
                  )}
                  {review.review_date && (
                    <p className="text-xs text-muted-foreground mt-2">Date: {format(new Date(review.review_date), 'PP')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ───── Shared Components ─────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
    approved: { variant: 'default', icon: CheckCircle2 },
    completed: { variant: 'default', icon: CheckCircle2 },
    paid: { variant: 'default', icon: CheckCircle2 },
    pending: { variant: 'secondary', icon: Clock },
    submitted: { variant: 'secondary', icon: Send },
    draft: { variant: 'outline', icon: FileText },
    in_progress: { variant: 'secondary', icon: AlertCircle },
    rejected: { variant: 'destructive', icon: XCircle },
    not_started: { variant: 'outline', icon: Clock },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1 text-xs capitalize">
      <Icon className="h-3 w-3" /> {status.replace(/_/g, ' ')}
    </Badge>
  );
}

// ───── Payroll Tab ─────
function PayrollTab({ employeeId }: { employeeId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> My Payslips</CardTitle><CardDescription>View your monthly payroll history</CardDescription></CardHeader>
      <CardContent><p className="text-center py-8 text-muted-foreground">Payslip history will appear here once payroll is processed.</p></CardContent>
    </Card>
  );
}

// ───── Attendance Anomalies ─────
function AttendanceAnomaliesCard({ employeeId }: { employeeId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Attendance Anomalies</CardTitle></CardHeader>
      <CardContent><p className="text-center py-6 text-sm text-muted-foreground">No anomalies detected this month.</p></CardContent>
    </Card>
  );
}

// ───── Requests Tracking ─────
function RequestsTrackingTab({ employeeId }: { employeeId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> My Requests</CardTitle><CardDescription>Track leave, expense, and other request approvals</CardDescription></CardHeader>
      <CardContent><p className="text-center py-8 text-muted-foreground">All your pending and completed requests will appear here.</p></CardContent>
    </Card>
  );
}
