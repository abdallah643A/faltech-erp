import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const expCols: ColumnDef[] = [
  { key: 'soNo', header: 'SO No.' }, { key: 'customer', header: 'Customer' },
  { key: 'item', header: 'Item' }, { key: 'ordered', header: 'Ordered' },
  { key: 'delivered', header: 'Delivered' }, { key: 'backorder', header: 'Backorder' },
  { key: 'expectedDate', header: 'Expected Date' },
];

const mockData = [
  { id: '1', soNo: 'SO-2025-00142', customer: 'Al Rajhi Corp', item: 'Item-A001', ordered: 100, delivered: 60, backorder: 40, expectedDate: '2025-04-15', overdue: true },
  { id: '2', soNo: 'SO-2025-00143', customer: 'SABIC', item: 'Item-B002', ordered: 50, delivered: 50, backorder: 0, expectedDate: '2025-04-10', overdue: false },
  { id: '3', soNo: 'SO-2025-00144', customer: 'Aramco', item: 'Item-C003', ordered: 200, delivered: 120, backorder: 80, expectedDate: '2025-04-08', overdue: true },
  { id: '4', soNo: 'SO-2025-00145', customer: 'STC', item: 'Item-D004', ordered: 30, delivered: 10, backorder: 20, expectedDate: '2025-04-12', overdue: false },
];

export default function BackorderReport() {
  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Backorder Report</h1>
        <ExportImportButtons data={mockData} columns={expCols} filename="backorder-report" title="Backorder Report" buttonVariant="secondary" />
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
            <th className="text-left px-3 py-2">SO No.</th>
            <th className="text-left px-3 py-2">Customer</th>
            <th className="text-left px-3 py-2">Item</th>
            <th className="text-right px-3 py-2">Ordered</th>
            <th className="text-right px-3 py-2">Delivered</th>
            <th className="text-right px-3 py-2">Backorder</th>
            <th className="text-left px-3 py-2">Expected Date</th>
          </tr></thead>
          <tbody>
            {mockData.map(r => (
              <tr key={r.id} className={cn("border-b border-[#d0d5dd]",
                r.overdue ? "bg-red-50" : r.backorder > 0 ? "bg-amber-50" : ""
              )}>
                <td className="px-3 py-2.5 font-mono">{r.soNo}</td>
                <td className="px-3 py-2.5">{r.customer}</td>
                <td className="px-3 py-2.5">{r.item}</td>
                <td className="px-3 py-2.5 text-right">{r.ordered}</td>
                <td className="px-3 py-2.5 text-right">{r.delivered}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{r.backorder}</td>
                <td className="px-3 py-2.5">
                  <span className={r.overdue ? "text-red-600 font-semibold" : ""}>{r.expectedDate}</span>
                  {r.overdue && <Badge className="bg-red-100 text-red-700 text-[10px] ml-2">Overdue</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
