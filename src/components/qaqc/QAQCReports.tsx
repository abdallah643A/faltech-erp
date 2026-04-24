import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BarChart3, FileText, Download, TrendingUp, AlertTriangle, Users, Clock, 
  CheckCircle2, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const reports = [
  { id: 'defect-aging', name: 'Defect Aging Report', nameAr: 'تقرير أعمار العيوب', icon: Clock, desc: 'Analysis of open defects by age and severity' },
  { id: 'defect-density', name: 'Defect Density Report', nameAr: 'تقرير كثافة العيوب', icon: BarChart3, desc: 'Defects per floor/zone/trade' },
  { id: 'ncr-summary', name: 'NCR Summary Report', nameAr: 'ملخص عدم المطابقة', icon: AlertTriangle, desc: 'Active and closed NCRs with CAPA status' },
  { id: 'inspection-pass-fail', name: 'Inspection Pass/Fail', nameAr: 'نتائج الفحص', icon: CheckCircle2, desc: 'Pass/fail rates by type and inspector' },
  { id: 'rework-trend', name: 'Rework Trend Analysis', nameAr: 'تحليل اتجاه إعادة العمل', icon: TrendingUp, desc: 'Rework frequency and cost over time' },
  { id: 'contractor-quality', name: 'Contractor Quality Performance', nameAr: 'أداء جودة المقاولين', icon: Users, desc: 'Quality metrics by subcontractor' },
  { id: 'closure-time', name: 'Closure Time Analysis', nameAr: 'تحليل وقت الإغلاق', icon: Clock, desc: 'Average time to resolve by category' },
  { id: 'approval-turnaround', name: 'Approval Turnaround', nameAr: 'دوران الموافقات', icon: Activity, desc: 'SLA compliance for approval workflows' },
  { id: 'root-cause', name: 'Root Cause Analysis', nameAr: 'تحليل السبب الجذري', icon: PieChartIcon, desc: 'Common root causes and patterns' },
  { id: 'handover-readiness', name: 'Handover Readiness', nameAr: 'جاهزية التسليم', icon: CheckCircle2, desc: 'Outstanding items before handover' },
  { id: 'executive-summary', name: 'Executive Summary', nameAr: 'الملخص التنفيذي', icon: FileText, desc: 'High-level quality overview for management' },
];

const agingData = [
  { range: '0-7d', critical: 2, major: 5, minor: 8 },
  { range: '8-14d', critical: 1, major: 3, minor: 4 },
  { range: '15-30d', critical: 1, major: 2, minor: 2 },
  { range: '30+d', critical: 1, major: 1, minor: 1 },
];

const rootCauseData = [
  { name: 'Workmanship', value: 35 }, { name: 'Material', value: 20 },
  { name: 'Design', value: 15 }, { name: 'Process', value: 12 },
  { name: 'Supervision', value: 10 }, { name: 'Other', value: 8 },
];
const RC_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280'];

export function QAQCReports() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6">
      {/* Quick Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'تقادم العيوب' : 'Defect Aging Distribution'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                <Bar dataKey="major" stackId="a" fill="#f59e0b" name="Major" />
                <Bar dataKey="minor" stackId="a" fill="#3b82f6" name="Minor" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'تحليل السبب الجذري' : 'Root Cause Analysis'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={rootCauseData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {rootCauseData.map((_, i) => <Cell key={i} fill={RC_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Report Catalog */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{isAr ? 'كتالوج التقارير' : 'Report Catalog'}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><report.icon className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">{isAr ? report.nameAr : report.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{report.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-1"><FileText className="h-3 w-3 mr-1" />View</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs"><Download className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
