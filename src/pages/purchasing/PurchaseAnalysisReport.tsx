import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart2, Table } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const expCols: ColumnDef[] = [
  { key: 'month', header: 'Period' }, { key: 'amount', header: 'Amount' },
];

const mockData = [
  { month: 'Jan', amount: 45000 }, { month: 'Feb', amount: 52000 }, { month: 'Mar', amount: 48000 },
  { month: 'Apr', amount: 61000 }, { month: 'May', amount: 55000 }, { month: 'Jun', amount: 67000 },
];

export default function PurchaseAnalysisReport() {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Purchase Analysis</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'chart' ? 'secondary' : 'ghost'} onClick={() => setView('chart')} className="gap-1"><BarChart2 className="h-3.5 w-3.5" /> Chart</Button>
          <Button size="sm" variant={view === 'table' ? 'secondary' : 'ghost'} onClick={() => setView('table')} className="gap-1"><Table className="h-3.5 w-3.5" /> Table</Button>
          <ExportImportButtons data={mockData} columns={expCols} filename="purchase-analysis" title="Purchase Analysis" buttonVariant="secondary" />
        </div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-5 gap-4">
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">To Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Item</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">Buyer</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-4">
        {view === 'chart' ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={mockData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#0066cc" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Period</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th><th className="p-2 text-right border-b border-[#d0d5dd]">Amount</th><th className="p-2 text-right border-b border-[#d0d5dd]">Items</th><th className="p-2 text-right border-b border-[#d0d5dd]">Avg Lead Time</th></tr></thead>
            <tbody>{mockData.map(d => <tr key={d.month}><td className="p-2 border-b border-[#d0d5dd]">{d.month}</td><td className="p-2 border-b border-[#d0d5dd]">All</td><td className="p-2 text-right border-b border-[#d0d5dd]">{d.amount.toLocaleString()} SAR</td><td className="p-2 text-right border-b border-[#d0d5dd]">-</td><td className="p-2 text-right border-b border-[#d0d5dd]">-</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
