import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { Employee } from '@/hooks/useEmployees';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface HRAnalyticsChartsProps {
  employees: Employee[];
  dateRange: '3m' | '6m' | '1y' | 'all';
}

export function HRAnalyticsCharts({ employees, dateRange }: HRAnalyticsChartsProps) {
  const monthsBack = dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : dateRange === '1y' ? 12 : 24;

  // Monthly hire vs termination trends
  const trendData = useMemo(() => {
    const now = new Date();
    const data: { month: string; hired: number; terminated: number; net: number }[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const label = format(monthStart, 'MMM yy');

      const hired = employees.filter(e => {
        if (!e.hire_date) return false;
        const d = new Date(e.hire_date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;

      const terminated = employees.filter(e => {
        if (!e.termination_date) return false;
        const d = new Date(e.termination_date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;

      data.push({ month: label, hired, terminated, net: hired - terminated });
    }
    return data;
  }, [employees, monthsBack]);

  // Cumulative headcount trend
  const headcountTrend = useMemo(() => {
    const now = new Date();
    const data: { month: string; headcount: number }[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthEnd = endOfMonth(subMonths(now, i));
      const label = format(monthEnd, 'MMM yy');
      const headcount = employees.filter(e => {
        const hired = e.hire_date ? new Date(e.hire_date) <= monthEnd : false;
        const terminated = e.termination_date ? new Date(e.termination_date) <= monthEnd : false;
        return hired && !terminated;
      }).length;
      data.push({ month: label, headcount });
    }
    return data;
  }, [employees, monthsBack]);

  // Year-over-year comparison
  const yoyData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return months.slice(0, now.getMonth() + 1).map((month, i) => {
      const thisYearHires = employees.filter(e =>
        e.hire_date && new Date(e.hire_date).getFullYear() === currentYear && new Date(e.hire_date).getMonth() === i
      ).length;
      const lastYearHires = employees.filter(e =>
        e.hire_date && new Date(e.hire_date).getFullYear() === lastYear && new Date(e.hire_date).getMonth() === i
      ).length;
      return { month, [String(currentYear)]: thisYearHires, [String(lastYear)]: lastYearHires };
    });
  }, [employees]);

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Turnover Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Hire vs. Termination Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="hired" fill="#10b981" radius={[2, 2, 0, 0]} name="Hired" />
              <Bar dataKey="terminated" fill="#ef4444" radius={[2, 2, 0, 0]} name="Terminated" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Headcount Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Headcount Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={headcountTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="headcount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Headcount" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Year-over-Year Comparison */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Year-over-Year Hiring Comparison ({lastYear} vs {currentYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={yoyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey={String(lastYear)} stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} name={String(lastYear)} />
              <Line type="monotone" dataKey={String(currentYear)} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name={String(currentYear)} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
