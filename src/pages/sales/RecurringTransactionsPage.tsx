import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'transaction_no', header: 'Transaction No.' },
  { key: 'customer', header: 'Customer' },
  { key: 'template', header: 'Template' },
  { key: 'amount', header: 'Amount' },
  { key: 'frequency', header: 'Frequency' },
  { key: 'next_execution', header: 'Next Execution' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: 'Actions' },
];


const mockTransactions = [
  { id: '1', transNo: 'RT-001', customer: 'Al Rajhi Corp', template: 'Monthly Invoice', amount: 15000, frequency: 'Monthly', nextDate: '2025-05-01', status: 'Active' },
  { id: '2', transNo: 'RT-002', customer: 'SABIC', template: 'Quarterly Service', amount: 45000, frequency: 'Quarterly', nextDate: '2025-07-01', status: 'Active' },
  { id: '3', transNo: 'RT-003', customer: 'Aramco', template: 'Annual Maintenance', amount: 120000, frequency: 'Annual', nextDate: '2026-01-01', status: 'Paused' },
];

export default function RecurringTransactionsPage() {
  const { toast } = useToast();
  const [transactions] = useState(mockTransactions);

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Recurring Transactions</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="recurring-transactions-page" title="Recurring Transactions Page" />
      </div>

      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
            <th className="text-left px-3 py-2">Transaction No.</th>
            <th className="text-left px-3 py-2">Customer</th>
            <th className="text-left px-3 py-2">Template</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="text-left px-3 py-2">Frequency</th>
            <th className="text-left px-3 py-2">Next Execution</th>
            <th className="text-center px-3 py-2">Status</th>
            <th className="text-center px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="border-b border-[#d0d5dd] hover:bg-blue-50/30 cursor-pointer">
                <td className="px-3 py-2.5 font-mono">{t.transNo}</td>
                <td className="px-3 py-2.5">{t.customer}</td>
                <td className="px-3 py-2.5">{t.template}</td>
                <td className="px-3 py-2.5 text-right font-mono">{t.amount.toLocaleString()}</td>
                <td className="px-3 py-2.5">{t.frequency}</td>
                <td className="px-3 py-2.5">{t.nextDate}</td>
                <td className="px-3 py-2.5 text-center">
                  <Badge className={t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{t.status}</Badge>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast({ title: 'Running transaction...' })}><Play className="h-3.5 w-3.5 text-green-600" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Pause className="h-3.5 w-3.5 text-amber-600" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
