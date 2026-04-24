import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Bug, ClipboardCheck, AlertTriangle, CheckCircle2, Clock, XCircle, TrendingUp,
  Users, BarChart3, Shield, FileWarning, Timer, UserCheck, UserPlus, Inbox
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const kpis = [
  { key: 'totalProjects', en: 'Total Projects', ar: 'إجمالي المشاريع', value: 12, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950', tab: 'projects' },
  { key: 'openTickets', en: 'Open Tickets', ar: 'تذاكر مفتوحة', value: 47, icon: Bug, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950', tab: 'tickets' },
  { key: 'inProgress', en: 'In Progress', ar: 'قيد التنفيذ', value: 23, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950', tab: 'tickets' },
  { key: 'dueSoon', en: 'Due Soon', ar: 'قريب الاستحقاق', value: 8, icon: Timer, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950', tab: 'tickets' },
  { key: 'overdue', en: 'Overdue', ar: 'متأخرة', value: 5, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900', tab: 'tickets' },
  { key: 'closedWeek', en: 'Closed This Week', ar: 'مغلقة هذا الأسبوع', value: 31, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950', tab: 'tickets' },
  { key: 'awaitingApproval', en: 'Awaiting Approval', ar: 'بانتظار الموافقة', value: 9, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950', tab: 'approvals' },
  { key: 'rejected', en: 'Rejected', ar: 'مرفوضة', value: 3, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950', tab: 'tickets' },
  { key: 'ncrCount', en: 'Active NCRs', ar: 'عدم المطابقة النشطة', value: 6, icon: FileWarning, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950', tab: 'ncr' },
  { key: 'inspPassRate', en: 'Inspection Pass Rate', ar: 'معدل النجاح', value: '87%', icon: ClipboardCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950', tab: 'inspections' },
  { key: 'slaCompliance', en: 'SLA Compliance', ar: 'الالتزام بالاتفاقيات', value: '92%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950', tab: 'reports' },
  { key: 'teamLoad', en: 'Active Assignees', ar: 'المكلفون النشطون', value: 18, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950', tab: 'tickets' },
];

const ticketKpis = [
  { key: 'createdByMe', en: 'Tickets Created by Me', ar: 'تذاكر أنشأتها', value: 15, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950', tab: 'tickets' },
  { key: 'assignedToMe', en: 'Tickets Assigned to Me', ar: 'تذاكر مكلف بها', value: 0, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950', tab: 'tickets' },
  { key: 'asReceiver', en: 'Tickets (as Receiver)', ar: 'تذاكر (كمستلم)', value: 0, icon: Inbox, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950', tab: 'tickets' },
  { key: 'ticketsOverdue', en: 'Tickets Overdue', ar: 'تذاكر متأخرة', value: 3, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950', tab: 'tickets' },
  { key: 'ticketsDueSoon', en: 'Tickets Due Soon', ar: 'تذاكر قريبة الاستحقاق', value: 7, icon: Timer, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950', tab: 'tickets' },
];

const trendData = [
  { week: 'W1', opened: 15, closed: 12 }, { week: 'W2', opened: 22, closed: 18 },
  { week: 'W3', opened: 18, closed: 25 }, { week: 'W4', opened: 20, closed: 22 },
  { week: 'W5', opened: 14, closed: 19 }, { week: 'W6', opened: 17, closed: 15 },
];

const categoryData = [
  { name: 'Structural', value: 18 }, { name: 'MEP', value: 25 },
  { name: 'Finishing', value: 32 }, { name: 'Waterproofing', value: 8 },
  { name: 'Safety', value: 12 }, { name: 'Other', value: 5 },
];
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#6b7280'];

const subcontractorData = [
  { name: 'Al-Futtaim MEP', defects: 12, resolved: 8 },
  { name: 'BESIX Concrete', defects: 8, resolved: 7 },
  { name: 'Drake & Scull', defects: 15, resolved: 10 },
  { name: 'Saudi Binladin', defects: 6, resolved: 5 },
  { name: 'AECOM Finishing', defects: 10, resolved: 6 },
];

const topIssues = [
  { issue: 'Concrete cracks – basement walls', count: 8, severity: 'critical' },
  { issue: 'Paint peeling – Tower A finishing', count: 6, severity: 'major' },
  { issue: 'Waterproofing failure – roof level', count: 5, severity: 'critical' },
  { issue: 'MEP pipe alignment deviation', count: 4, severity: 'minor' },
  { issue: 'Fire stopping gaps – stairwell', count: 3, severity: 'major' },
];

const tabPathMap: Record<string, string> = {
  dashboard: '/cpms/qaqc',
  projects: '/cpms',
  tickets: '/cpms/qaqc/tickets',
  inspections: '/cpms/qaqc/inspections',
  ncr: '/cpms/qaqc/ncr',
  checklists: '/cpms/qaqc/checklists',
  drawings: '/cpms/qaqc/drawings',
  siteview: '/cpms/qaqc/siteview',
  approvals: '/cpms/qaqc/approvals',
  reports: '/cpms/qaqc/reports',
};

export function QAQCDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const handleCardClick = (tab: string) => {
    const path = tabPathMap[tab];
    if (path) navigate(path);
  };

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <Card key={k.key} className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30" onClick={() => handleCardClick(k.tab)}>
            <CardContent className="p-3">
              <div className={`inline-flex p-1.5 rounded-lg ${k.bg} mb-2`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="text-lg font-bold">{k.value}</div>
              <p className="text-[11px] text-muted-foreground leading-tight">{isAr ? k.ar : k.en}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ticket Summary Cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{isAr ? 'ملخص التذاكر الشخصي' : 'My Ticket Summary'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {ticketKpis.map(k => (
            <Card key={k.key} className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30" onClick={() => handleCardClick(k.tab)}>
              <CardContent className="p-3 text-center">
                <div className={`inline-flex p-1.5 rounded-lg ${k.bg} mb-2`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <div className="text-xl font-bold">{k.value}</div>
                <p className="text-[11px] text-muted-foreground leading-tight">{isAr ? k.ar : k.en}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'اتجاه الجودة الأسبوعي' : 'Weekly Quality Trend'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" stroke="#ef4444" strokeWidth={2} name={isAr ? 'مفتوحة' : 'Opened'} />
                <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} name={isAr ? 'مغلقة' : 'Closed'} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'العيوب حسب الفئة' : 'Defects by Category'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'أداء المقاولين' : 'Subcontractor Performance'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subcontractorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                <Tooltip />
                <Bar dataKey="defects" fill="#ef4444" name={isAr ? 'عيوب' : 'Defects'} radius={[0, 4, 4, 0]} />
                <Bar dataKey="resolved" fill="#10b981" name={isAr ? 'محلولة' : 'Resolved'} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'أهم المشاكل المتكررة' : 'Top Recurring Issues'}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topIssues.map((issue, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{issue.issue}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Progress value={(issue.count / 10) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{issue.count}x</span>
                    </div>
                  </div>
                  <Badge variant={issue.severity === 'critical' ? 'destructive' : issue.severity === 'major' ? 'default' : 'secondary'} className="text-[10px]">
                    {issue.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
