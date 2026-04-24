import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMyEmployeeProfile, useMyDocuments } from '@/hooks/useEmployeeSelfService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Calendar, Clock, FileText, DollarSign, Users, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { format } from 'date-fns';

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800', active: 'bg-green-100 text-green-800',
};

export default function EmployeeManagerSelfServiceHub() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [tab, setTab] = useState('profile');
  const { myEmployee, isLoading: empLoading } = useMyEmployeeProfile();
  const { documents } = useMyDocuments(myEmployee?.id);

  // Leave requests for logged-in user's employee
  const { data: myLeaves = [] } = useQuery({
    queryKey: ['my-leaves', myEmployee?.id],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data, error } = await supabase.from('leave_requests').select('*').eq('employee_id', myEmployee.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!myEmployee?.id,
  });

  // Attendance for logged-in user's employee
  const { data: myAttendance = [] } = useQuery({
    queryKey: ['my-attendance', myEmployee?.id],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data, error } = await supabase.from('attendance').select('*').eq('employee_id', myEmployee.id).order('date', { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!myEmployee?.id,
  });

  // Manager view: team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['my-team', myEmployee?.id, activeCompanyId],
    queryFn: async () => {
      if (!myEmployee?.id) return [];
      const { data, error } = await (supabase.from('employees' as any).select('id, first_name, last_name, employee_code, status, department:departments(name), position:positions(title)')
        .eq('manager_id', myEmployee.id).eq('company_id', activeCompanyId!).eq('status', 'active') as any);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!myEmployee?.id && !!activeCompanyId,
  });

  // Team pending leaves
  const { data: teamLeaves = [] } = useQuery({
    queryKey: ['team-leaves', myEmployee?.id],
    queryFn: async () => {
      if (!teamMembers.length) return [];
      const ids = teamMembers.map(m => m.id);
      const { data, error } = await supabase.from('leave_requests').select('*, employee:employees(first_name, last_name)')
        .in('employee_id', ids).eq('status', 'pending').order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: teamMembers.length > 0,
  });

  if (empLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{isAr ? 'مركز الخدمة الذاتية' : 'Employee & Manager Self-Service Hub'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'إدارة المهام اليومية بسهولة' : 'Complete common HR tasks without HR dependency'}</p>
      </div>

      {myEmployee && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>
            <div>
              <h3 className="font-semibold">{myEmployee.first_name} {myEmployee.last_name}</h3>
              <p className="text-sm text-muted-foreground">{(myEmployee.position as any)?.title || '-'} • {(myEmployee.department as any)?.name || '-'}</p>
              <p className="text-xs text-muted-foreground">#{myEmployee.employee_code}</p>
            </div>
            <Badge className={`ml-auto ${statusColor[(myEmployee as any).status] || ''}`}>{(myEmployee as any).status}</Badge>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" />Profile</TabsTrigger>
          <TabsTrigger value="leave"><Calendar className="h-4 w-4 mr-1" />Leave</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="h-4 w-4 mr-1" />Attendance</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" />Documents</TabsTrigger>
          {teamMembers.length > 0 && <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" />My Team</TabsTrigger>}
          {teamMembers.length > 0 && <TabsTrigger value="team-approvals"><CheckCircle className="h-4 w-4 mr-1" />Approvals</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
            <CardContent>
              {myEmployee ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{myEmployee.first_name} {myEmployee.last_name}</span></div>
              <div><span className="text-muted-foreground">Employee #:</span> <span className="font-medium">{myEmployee.employee_code}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{(myEmployee.department as any)?.name || '-'}</span></div>
              <div><span className="text-muted-foreground">Position:</span> <span className="font-medium">{(myEmployee.position as any)?.title || '-'}</span></div>
              <div><span className="text-muted-foreground">Branch:</span> <span className="font-medium">{(myEmployee.branch as any)?.name || '-'}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{myEmployee.email || '-'}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{myEmployee.phone || '-'}</span></div>
              <div><span className="text-muted-foreground">Join Date:</span> <span className="font-medium">{myEmployee.hire_date ? format(new Date(myEmployee.hire_date), 'dd/MM/yyyy') : '-'}</span></div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No employee profile linked to your account</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Leave Requests</CardTitle>
              <Button size="sm" onClick={() => window.location.href = '/hr/leave'}>New Request</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {myLeaves.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="capitalize">{l.leave_type_id || 'Leave'}</TableCell>
                      <TableCell>{l.start_date}</TableCell>
                      <TableCell>{l.end_date}</TableCell>
                      <TableCell>{l.total_days || '-'}</TableCell>
                      <TableCell><Badge className={statusColor[l.status] || ''}>{l.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {myLeaves.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>My Attendance (Last 30 Days)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Status</TableHead><TableHead>Hours</TableHead></TableRow></TableHeader>
                <TableBody>
                  {myAttendance.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>{a.check_in_time || '-'}</TableCell>
                      <TableCell>{a.check_out_time || '-'}</TableCell>
                      <TableCell><Badge className={statusColor[a.status] || 'bg-muted text-muted-foreground'}>{a.status || 'present'}</Badge></TableCell>
                      <TableCell>{a.work_hours ? `${a.work_hours}h` : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {myAttendance.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No attendance records</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle>My Documents</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {documents.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.document_name || d.file_name}</TableCell>
                      <TableCell>{d.document_type || '-'}</TableCell>
                      <TableCell>{d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{d.file_url && <a href={d.file_url} target="_blank" className="text-primary underline text-sm">Download</a>}</TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No documents</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {teamMembers.length > 0 && (
          <TabsContent value="team">
            <Card>
              <CardHeader><CardTitle>My Team ({teamMembers.length} members)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Employee #</TableHead><TableHead>Position</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {teamMembers.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                        <TableCell>{m.employee_code}</TableCell>
                        <TableCell>{(m.position as any)?.title || '-'}</TableCell>
                        <TableCell>{(m.department as any)?.name || '-'}</TableCell>
                        <TableCell><Badge className={statusColor[m.status] || ''}>{m.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {teamMembers.length > 0 && (
          <TabsContent value="team-approvals">
            <Card>
              <CardHeader><CardTitle>Pending Team Approvals</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {teamLeaves.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{(l.employee as any)?.first_name} {(l.employee as any)?.last_name}</TableCell>
                        <TableCell>{l.leave_type_id || 'Leave'}</TableCell>
                        <TableCell>{l.start_date}</TableCell>
                        <TableCell>{l.end_date}</TableCell>
                        <TableCell><Badge className="bg-amber-100 text-amber-800">Pending</Badge></TableCell>
                      </TableRow>
                    ))}
                    {teamLeaves.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pending approvals</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
