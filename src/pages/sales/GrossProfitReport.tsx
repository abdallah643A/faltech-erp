import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const expCols: ColumnDef[] = [
  { key: 'docNo', header: 'Doc No.' }, { key: 'customer', header: 'Customer' },
  { key: 'item', header: 'Item' }, { key: 'revenue', header: 'Revenue' },
  { key: 'cost', header: 'Cost' }, { key: 'gpAmt', header: 'GP Amount' }, { key: 'gpPct', header: 'GP%' },
];

const mockData = [
  { id: '1', docNo: 'INV-2025-00142', customer: 'Al Rajhi Corp', item: 'Service-A', revenue: 125000, cost: 81250, gpAmt: 43750, gpPct: 35.0 },
  { id: '2', docNo: 'INV-2025-00143', customer: 'SABIC', item: 'Product-B', revenue: 89500, cost: 58175, gpAmt: 31325, gpPct: 35.0 },
  { id: '3', docNo: 'INV-2025-00144', customer: 'Aramco', item: 'Material-C', revenue: 234000, cost: 163800, gpAmt: 70200, gpPct: 30.0 },
];

export default function GrossProfitReport() {
  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Gross Profit Report</h1>
        <ExportImportButtons data={mockData} columns={expCols} filename="gross-profit-report" title="Gross Profit Report" buttonVariant="secondary" />
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-3">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Customer</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="flex items-end"><Button className="bg-[#0066cc] h-8">Apply</Button></div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
            <th className="text-left px-3 py-2">Doc No.</th><th className="text-left px-3 py-2">Customer</th><th className="text-left px-3 py-2">Item</th>
            <th className="text-right px-3 py-2">Revenue</th><th className="text-right px-3 py-2">Cost</th><th className="text-right px-3 py-2">GP Amount</th><th className="text-right px-3 py-2">GP%</th>
          </tr></thead>
          <tbody>
            {mockData.map(r => (
              <tr key={r.id} className="border-b border-[#d0d5dd]">
                <td className="px-3 py-2.5 font-mono">{r.docNo}</td>
                <td className="px-3 py-2.5">{r.customer}</td>
                <td className="px-3 py-2.5">{r.item}</td>
                <td className="px-3 py-2.5 text-right font-mono">{r.revenue.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono">{r.cost.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono">{r.gpAmt.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{r.gpPct.toFixed(1)}%</td>
              </tr>
            ))}
            <tr className="bg-[#f0f2f4] font-bold">
              <td className="px-3 py-2.5" colSpan={3}>Total</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.revenue, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.cost, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono">{mockData.reduce((s, r) => s + r.gpAmt, 0).toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right">{((mockData.reduce((s, r) => s + r.gpAmt, 0) / mockData.reduce((s, r) => s + r.revenue, 0)) * 100).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
