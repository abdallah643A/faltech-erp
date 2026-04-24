import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const expCols: ColumnDef[] = [
  { key: 'docNo', header: 'Doc No.' }, { key: 'customer', header: 'Customer' },
  { key: 'docDate', header: 'Doc Date' }, { key: 'dueDate', header: 'Due Date' },
  { key: 'amount', header: 'Amount' }, { key: 'paid', header: 'Paid' },
  { key: 'balance', header: 'Balance' }, { key: 'daysOverdue', header: 'Days Overdue' },
];

const mockData = [
  { id: '1', docNo: 'INV-2025-00142', customer: 'Al Rajhi Corp', docDate: '2025-03-01', dueDate: '2025-03-31', amount: 125000, paid: 50000, balance: 75000, daysOverdue: 8 },
  { id: '2', docNo: 'INV-2025-00130', customer: 'SABIC', docDate: '2025-02-15', dueDate: '2025-03-17', amount: 89500, paid: 0, balance: 89500, daysOverdue: 22 },
  { id: '3', docNo: 'INV-2025-00120', customer: 'Aramco', docDate: '2025-01-10', dueDate: '2025-02-10', amount: 234000, paid: 100000, balance: 134000, daysOverdue: 57 },
  { id: '4', docNo: 'INV-2024-00980', customer: 'STC', docDate: '2024-11-15', dueDate: '2024-12-15', amount: 67000, paid: 0, balance: 67000, daysOverdue: 114 },
];

function agingColor(days: number) {
  if (days <= 30) return 'text-green-600';
  if (days <= 60) return 'text-amber-600';
  return 'text-red-600';
}

export default function OpenItemsList() {
  const [agingFilter, setAgingFilter] = useState('All');

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Open Items List</h1>
        <ExportImportButtons data={mockData} columns={expCols} filename="open-items-list" title="Open Items List" buttonVariant="secondary" />
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-3">
        <div className="space-y-1"><Label className="text-xs">Customer</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="All" /></div>
        <div className="space-y-1"><Label className="text-xs">From Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Aging</Label>
          <div className="flex gap-1">{['All', '30', '60', '90+'].map(v => (
            <Button key={v} size="sm" variant={agingFilter === v ? 'default' : 'outline'} onClick={() => setAgingFilter(v)} className={cn("h-7 text-xs", agingFilter === v && "bg-[#0066cc]")}>{v === 'All' ? v : `${v} days`}</Button>
          ))}</div>
        </div>
        <div className="flex items-end"><Button className="bg-[#0066cc] h-8">Apply</Button></div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
            <th className="text-left px-3 py-2">Doc No.</th><th className="text-left px-3 py-2">Customer</th><th className="text-left px-3 py-2">Doc Date</th><th className="text-left px-3 py-2">Due Date</th>
            <th className="text-right px-3 py-2">Amount</th><th className="text-right px-3 py-2">Paid</th><th className="text-right px-3 py-2">Balance</th><th className="text-right px-3 py-2">Days Overdue</th>
          </tr></thead>
          <tbody>
            {mockData.map(r => (
              <tr key={r.id} className="border-b border-[#d0d5dd]">
                <td className="px-3 py-2.5 font-mono">{r.docNo}</td>
                <td className="px-3 py-2.5">{r.customer}</td>
                <td className="px-3 py-2.5">{r.docDate}</td>
                <td className="px-3 py-2.5">{r.dueDate}</td>
                <td className="px-3 py-2.5 text-right font-mono">{r.amount.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono">{r.paid.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold">{r.balance.toLocaleString()}</td>
                <td className={cn("px-3 py-2.5 text-right font-semibold", agingColor(r.daysOverdue))}>{r.daysOverdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
