import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const expCols: ColumnDef[] = [
  { key: 'customer', header: 'Customer' }, { key: 'current', header: 'Current' },
  { key: 'd30', header: '1-30 Days' }, { key: 'd60', header: '31-60 Days' },
  { key: 'd90', header: '61-90 Days' }, { key: 'over90', header: '90+ Days' }, { key: 'total', header: 'Total' },
];

const mockData = [
  { customer: 'Al Rajhi Corp', current: 50000, d30: 35000, d60: 25000, d90: 15000, over90: 0, total: 125000 },
  { customer: 'SABIC Industries', current: 89500, d30: 0, d60: 0, d90: 0, over90: 0, total: 89500 },
  { customer: 'Aramco Services', current: 0, d30: 100000, d60: 80000, d90: 34000, over90: 20000, total: 234000 },
  { customer: 'STC', current: 0, d30: 0, d60: 0, d90: 0, over90: 67000, total: 67000 },
];

function cellColor(val: number, max: number) {
  if (val === 0) return '';
  const intensity = Math.min(val / max, 1);
  if (intensity > 0.7) return 'bg-red-100';
  if (intensity > 0.4) return 'bg-amber-50';
  return 'bg-green-50';
}

export default function CustomerReceivablesAging() {
  const maxVal = Math.max(...mockData.flatMap(d => [d.current, d.d30, d.d60, d.d90, d.over90]));

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Customer Receivables Aging</h1>
        <div className="flex gap-2">
          <ExportImportButtons data={mockData} columns={expCols} filename="customer-receivables-aging" title="Customer Receivables Aging" buttonVariant="secondary" />
          <Button size="sm" variant="secondary" className="gap-1"><Printer className="h-3.5 w-3.5" /> Print</Button>
        </div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">As Of Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" defaultValue="2025-04-08" /></div>
        <div className="space-y-1"><Label className="text-xs">Customer Group</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="bg-[#0066cc] h-8">Apply</Button></div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
            <th className="text-left px-3 py-2">Customer</th>
            <th className="text-right px-3 py-2">Current</th>
            <th className="text-right px-3 py-2">1-30 days</th>
            <th className="text-right px-3 py-2">31-60 days</th>
            <th className="text-right px-3 py-2">61-90 days</th>
            <th className="text-right px-3 py-2">90+ days</th>
            <th className="text-right px-3 py-2 font-bold">Total</th>
          </tr></thead>
          <tbody>
            {mockData.map(r => (
              <tr key={r.customer} className="border-b border-[#d0d5dd]">
                <td className="px-3 py-2.5 font-semibold">{r.customer}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono", cellColor(r.current, maxVal))}>{r.current > 0 ? r.current.toLocaleString() : '-'}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono", cellColor(r.d30, maxVal))}>{r.d30 > 0 ? r.d30.toLocaleString() : '-'}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono", cellColor(r.d60, maxVal))}>{r.d60 > 0 ? r.d60.toLocaleString() : '-'}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono", cellColor(r.d90, maxVal))}>{r.d90 > 0 ? r.d90.toLocaleString() : '-'}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono", cellColor(r.over90, maxVal))}>{r.over90 > 0 ? r.over90.toLocaleString() : '-'}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold">{r.total.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="bg-[#f0f2f4] font-bold">
              <td className="px-3 py-2.5">Total</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.current, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.d30, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.d60, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.d90, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.over90, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
