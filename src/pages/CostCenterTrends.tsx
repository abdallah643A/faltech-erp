import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useCostCenterReportData, type CCFilters } from '@/hooks/useCostCenterReportData';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { Filter, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

const currentYear = new Date().getFullYear();

export default function CostCenterTrends() {
  const [filters, setFilters] = useState<CCFilters>({
    companyIds: [], branchId: '', costCenterId: '', departmentId: '',
    projectId: '', fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    accountRange: '', includeUnposted: false,
  });
  const [generated, setGenerated] = useState(false);
  const [selectedCC, setSelectedCC] = useState<string>('all');
  useDefaultReportCompanyIds(setFilters);

  const data = useCostCenterReportData(filters, generated);

  // Build monthly trend data
  const monthlyData = useMemo(() => {
    const months = new Map<string, number>();
    const ccs = selectedCC === 'all' ? data.costCenters : data.costCenters.filter(c => c.code === selectedCC);
    ccs.forEach(cc => {
      Object.entries(cc.monthlyActuals).forEach(([m, v]) => {
        months.set(m, (months.get(m) || 0) + v);
      });
    });
    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }, [data.costCenters, selectedCC]);

  // Top CC comparison
  const topCCData = useMemo(() => {
    return data.costCenters.slice(0, 10).map(cc => ({
      name: cc.name.length > 15 ? cc.name.slice(0, 15) + '…' : cc.name,
      actual: cc.actual,
      budget: cc.budget,
    }));
  }, [data.costCenters]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div>
        <h1 className="text-2xl font-bold">Cost Center Trend Analysis</h1>
        <p className="text-sm text-muted-foreground">Monthly spending trends and cost center comparisons</p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label className="text-xs">Companies</Label><CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters(f => ({ ...f, companyIds: v }))} /></div>
            <div><Label className="text-xs">Date From</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
            <div><Label className="text-xs">Cost Center</Label>
              <Select value={selectedCC} onValueChange={setSelectedCC}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cost Centers</SelectItem>
                  {data.costCenters.map(cc => <SelectItem key={cc.code} value={cc.code}>{cc.code} - {cc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button className="w-full" onClick={() => setGenerated(true)}><Filter className="h-4 w-4 mr-1" />Generate</Button></div>
          </div>
        </CardContent>
      </Card>

      {generated && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Monthly Spending Trend{selectedCC !== 'all' ? ` — ${selectedCC}` : ' — All Centers'}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                  <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Cost Centers — Budget vs Actual</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topCCData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={130} />
                  <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
