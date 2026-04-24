import { useMemo, useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useLeaveRequests } from '@/hooks/useLeaveManagement';
import { useAttendance } from '@/hooks/useAttendance';
import { usePayrollPeriods } from '@/hooks/usePayroll';
import { Users, Calendar, DollarSign, UserCheck, TrendingUp, TrendingDown, AlertTriangle, Cake, FileX, Clock } from 'lucide-react';
import ModuleWorkflowDiagram, { HR_WORKFLOW } from '@/components/shared/ModuleWorkflowDiagram';
import { OrgChart } from '@/components/hr/OrgChart';
import { UpcomingEvents } from '@/components/hr/UpcomingEvents';
import { SkillsMatrix } from '@/components/hr/SkillsMatrix';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { PipelineKanbanWidget } from '@/components/dashboard/PipelineKanbanWidget';
import { DonutChartWidget } from '@/components/dashboard/DonutChartWidget';
import { FunnelChartWidget } from '@/components/dashboard/FunnelChartWidget';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { HRNotificationWidgets } from '@/components/hr/HRNotificationWidgets';
import { ExpiringDocumentsWidget } from '@/components/hr/ExpiringDocumentsWidget';
import { HRAnalyticsCharts } from '@/components/hr/HRAnalyticsCharts';
import { differenceInYears, differenceInMonths } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const employeeExportColumns: ColumnDef[] = [
  { key: 'employee_code', header: 'Code' },
  { key: 'first_name', header: 'First Name' },
  { key: 'last_name', header: 'Last Name' },
  { key: 'email', header: 'Email' },
  { key: 'employment_status', header: 'Status' },
  { key: 'employment_type', header: 'Type' },
  { key: 'hire_date', header: 'Hire Date' },
  { key: 'basic_salary', header: 'Basic Salary' },
];

export default function HRDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { employees } = useEmployees(false);
  const { departments } = useDepartments();
  const { leaveRequests } = useLeaveRequests();
  const { attendance } = useAttendance(undefined, new Date().toISOString().split('T')[0]);
  const { payrollPeriods } = usePayrollPeriods();
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '1y' | 'all'>('1y');

  const activeEmployees = employees.filter(e => e.employment_status === 'active').length;
  const onLeaveEmployees = employees.filter(e => e.employment_status === 'on_leave').length;
  const terminatedEmployees = employees.filter(e => e.employment_status === 'terminated').length;
  const pendingLeaveRequests = leaveRequests.filter(l => l.status === 'pending').length;
  const todayAttendance = attendance.length;

  const totalSalaryBill = employees.filter(e => e.employment_status === 'active')
    .reduce((sum, e) => sum + (e.basic_salary || 0) + (e.housing_allowance || 0) + (e.transport_allowance || 0) + (e.other_allowances || 0), 0);

  // ── Advanced KPIs ──
  const now = new Date();
  const currentYear = now.getFullYear();

  // Hiring rate: employees hired in the current year
  const hiredThisYear = employees.filter(e => e.hire_date && new Date(e.hire_date).getFullYear() === currentYear).length;
  const hiringRate = employees.length > 0 ? Math.round((hiredThisYear / employees.length) * 100) : 0;

  // Retention rate: (active / (active + terminated)) * 100
  const retentionRate = (activeEmployees + terminatedEmployees) > 0
    ? Math.round((activeEmployees / (activeEmployees + terminatedEmployees)) * 100)
    : 100;

  // Average tenure in years
  const tenures = employees
    .filter(e => e.hire_date && e.employment_status === 'active')
    .map(e => differenceInMonths(now, new Date(e.hire_date!)));
  const avgTenureMonths = tenures.length > 0 ? Math.round(tenures.reduce((s, t) => s + t, 0) / tenures.length) : 0;
  const avgTenureYears = (avgTenureMonths / 12).toFixed(1);

  // Turnover rate: terminated / total
  const turnoverRate = employees.length > 0 ? Math.round((terminatedEmployees / employees.length) * 100) : 0;

  // Department distribution for funnel chart
  const deptData = departments.map(dept => ({
    name: dept.name.length > 15 ? dept.name.slice(0, 15) + '…' : dept.name,
    actual: employees.filter(e => e.department_id === dept.id).length,
  })).filter(d => d.actual > 0);

  // Status donut
  const statusDonut = [
    { name: 'Active', value: activeEmployees, color: '#10b981' },
    { name: 'On Leave', value: onLeaveEmployees, color: '#f59e0b' },
    { name: 'Terminated', value: terminatedEmployees, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Employment type donut
  const typeDonut = [
    { name: 'Full Time', value: employees.filter(e => e.employment_type === 'full_time').length },
    { name: 'Part Time', value: employees.filter(e => e.employment_type === 'part_time').length },
    { name: 'Contract', value: employees.filter(e => e.employment_type === 'contract').length },
    { name: 'Internship', value: employees.filter(e => e.employment_type === 'internship').length },
  ].filter(d => d.value > 0);

  // Branch pipeline
  const branchMap = new Map<string, number>();
  employees.forEach(e => {
    const name = e.branch?.name || 'Unassigned';
    branchMap.set(name, (branchMap.get(name) || 0) + 1);
  });
  const branchStages = Array.from(branchMap.entries()).map(([name, count], i) => ({
    name, count, color: COLORS[i % COLORS.length],
  }));

  const recentLeaveRequests = leaveRequests.slice(0, 5);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">HR Dashboard</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Overview of human resources</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last 1 year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <ExportImportButtons data={employees} columns={employeeExportColumns} filename="hr-employees" title="HR Employee Report" />
          {(() => { const m = getModuleById('hr'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
        </div>
      </div>

      <ModuleWorkflowDiagram moduleName="Human Resources" moduleNameAr="الموارد البشرية" steps={HR_WORKFLOW} tips={['Start by setting up departments and positions before adding employees.', 'Process payroll after attendance and leave are finalized for the period.']} />

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardMetricCard title="Total Employees" value={employees.length} subtitle={`${activeEmployees} active`} icon={Users} color="#3b82f6" onClick={() => navigate('/hr/employees')} />
        <DashboardMetricCard title="Today's Attendance" value={todayAttendance} subtitle={`${activeEmployees > 0 ? Math.round((todayAttendance / activeEmployees) * 100) : 0}% present`} icon={UserCheck} color="#10b981" onClick={() => navigate('/hr/attendance')} />
        <DashboardMetricCard title="Pending Leaves" value={pendingLeaveRequests} subtitle="Awaiting approval" icon={Calendar} color="#f59e0b" onClick={() => navigate('/hr/leave')} />
        <DashboardMetricCard title="Monthly Salary Bill" value={`SAR ${totalSalaryBill.toLocaleString()}`} subtitle={`${activeEmployees} active employees`} icon={DollarSign} color="#8b5cf6" onClick={() => navigate('/hr/payroll')} />
      </div>

      {/* Advanced KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardMetricCard title="Hiring Rate" value={`${hiringRate}%`} subtitle={`${hiredThisYear} hired in ${currentYear}`} icon={TrendingUp} color="#06b6d4" onClick={() => navigate('/recruitment-pipeline')} />
        <DashboardMetricCard title="Retention Rate" value={`${retentionRate}%`} subtitle="Active vs terminated" icon={Users} color="#10b981" onClick={() => navigate('/hr/performance')} />
        <DashboardMetricCard title="Avg. Tenure" value={`${avgTenureYears} yrs`} subtitle={`${avgTenureMonths} months avg`} icon={Clock} color="#8b5cf6" onClick={() => navigate('/hr/employees')} />
        <DashboardMetricCard title="Turnover Rate" value={`${turnoverRate}%`} subtitle={`${terminatedEmployees} terminated`} icon={TrendingDown} color="#ef4444" onClick={() => navigate('/offboarding')} />
      </div>

      {/* Notification Widgets */}
      <HRNotificationWidgets
        employees={employees}
        pendingLeaveRequests={pendingLeaveRequests}
        leaveRequests={leaveRequests}
      />

      {/* Branch Distribution Pipeline */}
      {branchStages.length > 0 && (
        <PipelineKanbanWidget title="Employees by Branch" stages={branchStages} />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutChartWidget
          title="Employee Status"
          data={statusDonut}
          centerValue={employees.length}
          centerLabel="Total"
          size="sm"
        />
        <FunnelChartWidget
          title="By Department"
          stages={deptData}
          actualLabel="Employees"
        />
        <DonutChartWidget
          title="Employment Type"
          data={typeDonut}
          size="sm"
        />
      </div>

      {/* Turnover Analytics */}
      <HRAnalyticsCharts employees={employees} dateRange={dateRange} />

      {/* Recent Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Recent Leave Requests</CardTitle></CardHeader>
          <CardContent>
            {recentLeaveRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No leave requests</p>
            ) : (
              <div className="space-y-3">
                {recentLeaveRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{request.employee?.first_name} {request.employee?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{request.leave_type?.name} • {request.total_days} days</p>
                    </div>
                    <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>{request.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <UpcomingEvents employees={employees} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OrgChart employees={employees} />
        </div>
        <ExpiringDocumentsWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkillsMatrix employees={employees} />
      </div>
    </div>
  );
}
