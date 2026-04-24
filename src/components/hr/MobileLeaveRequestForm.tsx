import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeaveTypes, useLeaveRequests, useLeaveBalances } from '@/hooks/useLeaveManagement';
import { useMyEmployeeProfile } from '@/hooks/useEmployeeSelfService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Send, Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export function MobileLeaveRequestForm() {
  const { myEmployee } = useMyEmployeeProfile();
  const { leaveTypes } = useLeaveTypes();
  const { leaveRequests } = useLeaveRequests(myEmployee?.id);
  const { leaveBalances } = useLeaveBalances(myEmployee?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'form' | 'history'>('form');

  if (!myEmployee) return null;

  const totalDays = form.start_date && form.end_date
    ? Math.max(1, differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1)
    : 0;

  const handleSubmit = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast({ title: 'End date must be after start date', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('leave_requests').insert({
        employee_id: myEmployee.id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: totalDays,
        reason: form.reason || null,
        status: 'pending',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: 'Leave request submitted successfully' });
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const myRequests = leaveRequests.filter(r => r.employee_id === myEmployee.id);
  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Leave Balances - horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {leaveBalances.map((bal: any) => {
          const entitled = bal.entitled_days || 0;
          const used = bal.used_days || 0;
          const remaining = entitled - used - (bal.pending_days || 0);
          const pct = entitled > 0 ? (used / entitled) * 100 : 0;
          return (
            <Card key={bal.id} className="min-w-[140px] shrink-0">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground truncate">{bal.leave_type?.name || 'Leave'}</p>
                <p className="text-xl font-bold">{remaining}</p>
                <Progress value={pct} className="h-1 mt-1" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{used}/{entitled} used</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        <Button
          variant={view === 'form' ? 'default' : 'ghost'}
          className="flex-1 rounded-none h-10"
          onClick={() => setView('form')}
        >
          <Send className="h-4 w-4 mr-1.5" /> New Request
        </Button>
        <Button
          variant={view === 'history' ? 'default' : 'ghost'}
          className="flex-1 rounded-none h-10"
          onClick={() => setView('history')}
        >
          <Calendar className="h-4 w-4 mr-1.5" /> History ({myRequests.length})
        </Button>
      </div>

      {view === 'form' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Submit Leave Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Leave Type *</Label>
              <Select value={form.leave_type_id} onValueChange={v => setForm(f => ({ ...f, leave_type_id: v }))}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Start Date *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label className="text-sm">End Date *</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="h-12 text-base"
                />
              </div>
            </div>

            {totalDays > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{totalDays}</p>
                <p className="text-xs text-muted-foreground">day{totalDays !== 1 ? 's' : ''} requested</p>
              </div>
            )}

            <div>
              <Label className="text-sm">Reason (optional)</Label>
              <Textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for leave..."
                className="min-h-[80px] text-base"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 text-base gap-2"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Submit Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leave requests yet</p>
              </CardContent>
            </Card>
          ) : (
            myRequests.map(req => (
              <Card key={req.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium">{req.leave_type?.name || 'Leave'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(req.start_date), 'MMM d')} – {format(new Date(req.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(req.status || 'pending')}
                      <Badge
                        variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {req.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
