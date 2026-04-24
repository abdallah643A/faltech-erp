import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Table as TableIcon } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const expCols: ColumnDef[] = [
  { key: 'period', header: 'Period' }, { key: 'revenue', header: 'Revenue' },
  { key: 'cost', header: 'Cost' }, { key: 'gp', header: 'Gross Profit' }, { key: 'gpPct', header: 'GP%' },
];

const monthlyData = [
  { period: 'Jan', revenue: 450000, cost: 292500, gp: 157500, gpPct: 35 },
  { period: 'Feb', revenue: 520000, cost: 338000, gp: 182000, gpPct: 35 },
  { period: 'Mar', revenue: 480000, cost: 312000, gp: 168000, gpPct: 35 },
  { period: 'Apr', revenue: 610000, cost: 396500, gp: 213500, gpPct: 35 },
  { period: 'May', revenue: 570000, cost: 370500, gp: 199500, gpPct: 35 },
  { period: 'Jun', revenue: 690000, cost: 448500, gp: 241500, gpPct: 35 },
];

export default function SalesAnalysisReport() {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Sales Analysis</h1>
        <div className="flex gap-1">
          <Button size="sm" variant={viewMode === 'chart' ? 'secondary' : 'ghost'} onClick={() => setViewMode('chart')} className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Chart</Button>
          <Button size="sm" variant={viewMode === 'table' ? 'secondary' : 'ghost'} onClick={() => setViewMode('table')} className="gap-1"><TableIcon className="h-3.5 w-3.5" /> Table</Button>
          <ExportImportButtons data={monthlyData} columns={expCols} filename="sales-analysis" title="Sales Analysis" buttonVariant="secondary" />
        </div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-5 gap-3">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Customer</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Sales Employee</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="bg-[#0066cc] h-8">Apply</Button></div>
      </div>

      {viewMode === 'chart' ? (
        <div className="bg-white rounded border border-[#d0d5dd] p-4">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#0066cc" name="Revenue" />
              <Bar yAxisId="left" dataKey="cost" fill="#d0d5dd" name="Cost" />
              <Line yAxisId="right" type="monotone" dataKey="gpPct" stroke="#1a7a4a" name="GP%" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white rounded border border-[#d0d5dd]">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
              <th className="text-left px-3 py-2">Period</th>
              <th className="text-right px-3 py-2">Revenue</th>
              <th className="text-right px-3 py-2">Cost</th>
              <th className="text-right px-3 py-2">Gross Profit</th>
              <th className="text-right px-3 py-2">GP%</th>
            </tr></thead>
            <tbody>
              {monthlyData.map(d => (
                <tr key={d.period} className="border-b border-[#d0d5dd]">
                  <td className="px-3 py-2.5">{d.period}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{d.revenue.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{d.cost.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{d.gp.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right">{d.gpPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
