import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KPICard } from '@/components/ui/kpi-card';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import { useConsolidationData, type ConsolidationFilters } from '@/hooks/useConsolidationData';
import { formatSAR, formatSARShort } from '@/lib/currency';
import { DollarSign, Building2, TrendingUp, BarChart3, Filter, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'entity', header: 'Entity' },
  { key: 'revenue', header: 'Revenue' },
  { key: 'cogs', header: 'COGS' },
  { key: 'gross_profit', header: 'Gross Profit' },
  { key: 'opex', header: 'OpEx' },
  { key: 'net_profit', header: 'Net Profit' },
  { key: 'margin', header: 'Margin' },
];


const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const currentYear = new Date().getFullYear();

export default function ConsolidationDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ConsolidationFilters>({
    companyIds: [], fiscalYear: String(currentYear),
    dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    includeEliminations: true, includeAdjustments: true, accountRange: '',
  });
  const [generated, setGenerated] = useState(false);
  useDefaultReportCompanyIds(setFilters);
  const data = useConsolidationData(filters, generated);

  const revenueData = data.entities.map((e, i) => ({ name: e.companyName, value: Math.abs(e.revenue), fill: COLORS[i % COLORS.length] })).filter(d => d.value > 0);
  const profitData = data.entities.map(e => ({ name: e.companyName.length > 12 ? e.companyName.slice(0, 12) + '…' : e.companyName, revenue: e.revenue, profit: e.netProfit }));

  const links = [
    { label: 'Consolidated P&L', href: '/financial-reports/consolidation/profit-loss' },
    { label: 'Consolidated Balance Sheet', href: '/financial-reports/consolidation/balance-sheet' },
    { label: 'Consolidated Trial Balance', href: '/financial-reports/consolidation/trial-balance' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      <div>
        <h1 className="text-2xl font-bold">Consolidation Dashboard</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="consolidation-dashboard" title="Consolidation Dashboard" />
        <p className="text-sm text-muted-foreground">Multi-entity financial overview and consolidated reporting</p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label className="text-xs">Companies</Label><CompanyMultiSelect selectedIds={filters.companyIds} onChange={v => setFilters(f => ({ ...f, companyIds: v }))} /></div>
            <div><Label className="text-xs">Fiscal Year</Label><Input value={filters.fiscalYear} onChange={e => setFilters(f => ({ ...f, fiscalYear: e.target.value }))} /></div>
            <div><Label className="text-xs">Date From</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={() => setGenerated(true)}><Filter className="h-4 w-4 mr-1" />Generate</Button></div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Nav */}
      <div className="flex gap-2 flex-wrap">
        {links.map(l => <Button key={l.href} variant="outline" size="sm" onClick={() => navigate(l.href)}><Layers className="h-3 w-3 mr-1" />{l.label}</Button>)}
      </div>

      {generated && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={<DollarSign className="h-4 w-4 text-primary" />} label="Consolidated Revenue" value={`SAR ${formatSARShort(data.consolidated.revenue)}`} />
            <KPICard icon={<TrendingUp className="h-4 w-4 text-chart-2" />} label="Consolidated Net Profit" value={`SAR ${formatSARShort(data.consolidated.netProfit)}`} subtitle={data.consolidated.revenue > 0 ? `${((data.consolidated.netProfit / data.consolidated.revenue) * 100).toFixed(1)}% margin` : ''} />
            <KPICard icon={<BarChart3 className="h-4 w-4 text-chart-1" />} label="Total Assets" value={`SAR ${formatSARShort(data.consolidated.totalAssets)}`} />
            <KPICard icon={<Building2 className="h-4 w-4 text-muted-foreground" />} label="Entities" value={String(data.entities.length)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Entity</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={revenueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {revenueData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Entity Revenue vs Profit</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatSARShort(v)} />
                    <Tooltip formatter={(v: number) => `SAR ${formatSAR(v)}`} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Net Profit" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Entity Comparison Table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Entity Comparison</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Entity</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">COGS</th>
                  <th className="text-right p-3 font-medium">Gross Profit</th>
                  <th className="text-right p-3 font-medium">OpEx</th>
                  <th className="text-right p-3 font-medium">Net Profit</th>
                  <th className="text-right p-3 font-medium">Margin</th>
                </tr></thead>
                <tbody>
                  {data.entities.map(e => (
                    <tr key={e.companyId} className="border-b hover:bg-accent/30">
                      <td className="p-3 font-medium">{e.companyName}</td>
                      <td className="p-3 text-right">SAR {formatSAR(e.revenue)}</td>
                      <td className="p-3 text-right">SAR {formatSAR(e.cogs)}</td>
                      <td className="p-3 text-right">SAR {formatSAR(e.grossProfit)}</td>
                      <td className="p-3 text-right">SAR {formatSAR(e.operatingExpenses)}</td>
                      <td className="p-3 text-right font-medium">SAR {formatSAR(e.netProfit)}</td>
                      <td className="p-3 text-right">{e.revenue > 0 ? `${((e.netProfit / e.revenue) * 100).toFixed(1)}%` : '-'}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-bold">
                    <td className="p-3">Consolidated</td>
                    <td className="p-3 text-right">SAR {formatSAR(data.consolidated.revenue)}</td>
                    <td className="p-3 text-right">SAR {formatSAR(data.consolidated.cogs)}</td>
                    <td className="p-3 text-right">SAR {formatSAR(data.consolidated.grossProfit)}</td>
                    <td className="p-3 text-right">SAR {formatSAR(data.consolidated.operatingExpenses)}</td>
                    <td className="p-3 text-right">SAR {formatSAR(data.consolidated.netProfit)}</td>
                    <td className="p-3 text-right">{data.consolidated.revenue > 0 ? `${((data.consolidated.netProfit / data.consolidated.revenue) * 100).toFixed(1)}%` : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
