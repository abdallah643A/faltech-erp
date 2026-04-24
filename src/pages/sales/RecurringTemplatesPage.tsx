import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  { key: 'doc_type', header: 'Doc Type' },
  { key: 'customer', header: 'Customer' },
  { key: 'amount', header: 'Amount' },
  { key: 'frequency', header: 'Frequency' },
  { key: 'period', header: 'Period' },
  { key: 'active', header: 'Active' },
];


const mockTemplates = [
  { id: '1', code: 'TPL-001', name: 'Monthly Invoice', docType: 'A/R Invoice', customer: 'Al Rajhi Corp', amount: 15000, frequency: 'Monthly', startDate: '2025-01-01', endDate: '2025-12-31', active: true },
  { id: '2', code: 'TPL-002', name: 'Quarterly Service', docType: 'A/R Invoice', customer: 'SABIC', amount: 45000, frequency: 'Quarterly', startDate: '2025-01-01', endDate: '2025-12-31', active: true },
];

export default function RecurringTemplatesPage() {
  const [templates] = useState(mockTemplates);

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Recurring Transaction Templates</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="recurring-templates-page" title="Recurring Templates Page" />
        <Button size="sm" variant="secondary" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Template</Button>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
            <th className="text-left px-3 py-2">Code</th>
            <th className="text-left px-3 py-2">Name</th>
            <th className="text-left px-3 py-2">Doc Type</th>
            <th className="text-left px-3 py-2">Customer</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="text-left px-3 py-2">Frequency</th>
            <th className="text-left px-3 py-2">Period</th>
            <th className="text-center px-3 py-2">Active</th>
            <th className="w-20" />
          </tr></thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id} className="border-b border-[#d0d5dd] hover:bg-blue-50/30">
                <td className="px-3 py-2.5 font-mono">{t.code}</td>
                <td className="px-3 py-2.5 font-semibold">{t.name}</td>
                <td className="px-3 py-2.5">{t.docType}</td>
                <td className="px-3 py-2.5">{t.customer}</td>
                <td className="px-3 py-2.5 text-right font-mono">{t.amount.toLocaleString()}</td>
                <td className="px-3 py-2.5"><Badge variant="outline">{t.frequency}</Badge></td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{t.startDate} → {t.endDate}</td>
                <td className="px-3 py-2.5 text-center"><Switch checked={t.active} /></td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
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
