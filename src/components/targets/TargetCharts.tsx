import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SalesTarget } from '@/hooks/useTargets';

interface TargetChartsProps {
  targets: SalesTarget[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function TargetCharts({ targets }: TargetChartsProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  if (targets.length === 0) return null;

  // Aggregate by sales employee / user
  const userMap = new Map<string, { user: string; salesTarget: number; salesActual: number; collectionTarget: number; collectionActual: number }>();
  targets.forEach(t => {
    const key = t.sales_employee_name || t.user_name;
    const existing = userMap.get(key) || { user: key, salesTarget: 0, salesActual: 0, collectionTarget: 0, collectionActual: 0 };
    existing.salesTarget += Number(t.sales_target);
    existing.salesActual += Number(t.sales_actual);
    existing.collectionTarget += Number(t.collection_target);
    existing.collectionActual += Number(t.collection_actual);
    userMap.set(key, existing);
  });
  const barData = Array.from(userMap.values());

  // Achievement distribution for pie chart
  const achieved = targets.filter(t => Number(t.sales_actual) >= Number(t.sales_target)).length;
  const inProgress = targets.filter(t => {
    const pct = Number(t.sales_target) > 0 ? (Number(t.sales_actual) / Number(t.sales_target)) * 100 : 0;
    return pct >= 50 && pct < 100;
  }).length;
  const behind = targets.length - achieved - inProgress;

  const pieData = [
    { name: isAr ? 'مكتمل' : 'Achieved', value: achieved },
    { name: isAr ? 'قيد التقدم' : 'In Progress', value: inProgress },
    { name: isAr ? 'متأخر' : 'Behind', value: behind },
  ].filter(d => d.value > 0);

  const pieColors = ['hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

  // Business Line breakdown
  const blMap = new Map<string, { businessLine: string; target: number; actual: number }>();
  targets.forEach(t => {
    if (t.business_line_name) {
      const key = t.business_line_code || t.business_line_name;
      const existing = blMap.get(key) || { businessLine: t.business_line_name, target: 0, actual: 0 };
      existing.target += Number(t.sales_target);
      existing.actual += Number(t.sales_actual);
      blMap.set(key, existing);
    }
  });
  const blData = Array.from(blMap.values());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isAr ? 'الأداء حسب موظف المبيعات' : 'Performance by Sales Employee'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="user" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(val: number) => val.toLocaleString()} />
              <Legend />
              <Bar dataKey="salesTarget" name={isAr ? 'هدف المبيعات' : 'Sales Target'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="salesActual" name={isAr ? 'المبيعات الفعلية' : 'Sales Actual'} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collectionTarget" name={isAr ? 'هدف التحصيل' : 'Collection Target'} fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collectionActual" name={isAr ? 'التحصيل الفعلي' : 'Collection Actual'} fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isAr ? 'توزيع الإنجاز' : 'Achievement Distribution'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Business Line breakdown chart */}
      {blData.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isAr ? 'الأداء حسب خط الأعمال' : 'Performance by Business Line'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={blData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="businessLine" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: number) => val.toLocaleString()} />
                <Legend />
                <Bar dataKey="target" name={isAr ? 'الهدف' : 'Target'} fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name={isAr ? 'الفعلي' : 'Actual'} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
