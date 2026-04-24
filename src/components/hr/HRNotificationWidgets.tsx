import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Cake, FileX, Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, setYear, format } from 'date-fns';
import { Employee } from '@/hooks/useEmployees';
import { LeaveRequest } from '@/hooks/useLeaveManagement';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface HRNotificationWidgetsProps {
  employees: Employee[];
  pendingLeaveRequests: number;
  leaveRequests: LeaveRequest[];
}

export function HRNotificationWidgets({ employees, pendingLeaveRequests, leaveRequests }: HRNotificationWidgetsProps) {
  const navigate = useNavigate();

  // Document expiry alerts (next 30 days)
  const { data: expiringDocs = [] } = useQuery({
    queryKey: ['hr-expiring-documents'],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          id, document_type, title, expiry_date,
          employee:employees!employee_documents_employee_id_fkey(first_name, last_name, employee_code)
        `)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Birthday alerts (next 7 days)
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    return employees
      .filter(e => e.date_of_birth && e.employment_status === 'active')
      .map(e => {
        const bd = setYear(new Date(e.date_of_birth!), now.getFullYear());
        if (bd < now) bd.setFullYear(now.getFullYear() + 1);
        const days = differenceInDays(bd, now);
        return { employee: e, date: bd, daysUntil: days };
      })
      .filter(b => b.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [employees]);

  // Work anniversaries (next 7 days)
  const upcomingAnniversaries = useMemo(() => {
    const now = new Date();
    return employees
      .filter(e => e.hire_date && e.employment_status === 'active')
      .map(e => {
        const hd = setYear(new Date(e.hire_date!), now.getFullYear());
        if (hd < now) hd.setFullYear(now.getFullYear() + 1);
        const days = differenceInDays(hd, now);
        const years = now.getFullYear() - new Date(e.hire_date!).getFullYear();
        return { employee: e, date: hd, daysUntil: days, years };
      })
      .filter(a => a.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [employees]);

  const totalAlerts = pendingLeaveRequests + expiringDocs.length + upcomingBirthdays.length;

  if (totalAlerts === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Pending Leave Approvals */}
      {pendingLeaveRequests > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="relative">
                <Calendar className="h-4 w-4 text-warning" />
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-warning text-[9px] text-warning-foreground flex items-center justify-center font-bold">
                  {pendingLeaveRequests}
                </span>
              </div>
              Leave Approvals Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaveRequests.filter(l => l.status === 'pending').slice(0, 3).map(req => (
                <div key={req.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{req.employee?.first_name} {req.employee?.last_name}</span>
                  <Badge variant="secondary" className="text-[10px]">{req.total_days}d</Badge>
                </div>
              ))}
              {pendingLeaveRequests > 3 && (
                <p className="text-xs text-muted-foreground">+{pendingLeaveRequests - 3} more</p>
              )}
            </div>
            <Button size="sm" variant="outline" className="w-full mt-3 text-xs" onClick={() => navigate('/hr/leave')}>
              Review All
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Document Expiry Alerts */}
      {expiringDocs.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="relative">
                <FileX className="h-4 w-4 text-destructive" />
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] text-destructive-foreground flex items-center justify-center font-bold">
                  {expiringDocs.length}
                </span>
              </div>
              Documents Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringDocs.slice(0, 3).map((doc: any) => {
                const days = differenceInDays(new Date(doc.expiry_date), new Date());
                return (
                  <div key={doc.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium">{doc.employee?.first_name} {doc.employee?.last_name}</span>
                      <span className="text-muted-foreground ml-1">({doc.document_type})</span>
                    </div>
                    <Badge variant={days <= 7 ? 'destructive' : 'secondary'} className="text-[10px]">
                      {days}d left
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Birthday & Anniversary Reminders */}
      {(upcomingBirthdays.length > 0 || upcomingAnniversaries.length > 0) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cake className="h-4 w-4 text-primary" />
              Upcoming Celebrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingBirthdays.map(b => (
                <div key={`bd-${b.employee.id}`} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Cake className="h-3 w-3 text-pink-500" />
                    <span className="font-medium">{b.employee.first_name} {b.employee.last_name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {b.daysUntil === 0 ? '🎂 Today!' : `in ${b.daysUntil}d`}
                  </Badge>
                </div>
              ))}
              {upcomingAnniversaries.map(a => (
                <div key={`ann-${a.employee.id}`} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="font-medium">{a.employee.first_name} {a.employee.last_name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {a.years}yr • {a.daysUntil === 0 ? '🎉 Today!' : `in ${a.daysUntil}d`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
