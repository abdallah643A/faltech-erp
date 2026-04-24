import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'doc_no', header: 'Doc No.' },
  { key: 'item', header: 'Item' },
  { key: 'revenue', header: 'Revenue' },
  { key: 'cost_old', header: 'Cost (Old)' },
  { key: 'cost_new', header: 'Cost (New)' },
  { key: 'gp_old', header: 'GP% (Old)' },
  { key: 'gp_new', header: 'GP% (New)' },
  { key: 'difference', header: 'Difference' },
];


const mockResults = [
  { id: '1', docNo: 'INV-2025-00142', item: 'Item-A001', revenue: 50000, costOld: 32000, costNew: 33500, gpOld: 36.0, gpNew: 33.0, diff: -1500 },
  { id: '2', docNo: 'INV-2025-00143', item: 'Item-B002', revenue: 89500, costOld: 58000, costNew: 57200, gpOld: 35.2, gpNew: 36.1, diff: 800 },
  { id: '3', docNo: 'INV-2025-00144', item: 'Item-C003', revenue: 120000, costOld: 78000, costNew: 81000, gpOld: 35.0, gpNew: 32.5, diff: -3000 },
];

export default function GrossProfitRecalcWizard() {
  const { toast } = useToast();
  const [calculated, setCalculated] = useState(false);

  return (
    <div className="space-y-4 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Gross Profit Recalculation Wizard</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="gross-profit-recalc-wizard" title="Gross Profit Recalc Wizard" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs">Document Type</Label>
          <Select defaultValue="A/R Invoice"><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="A/R Invoice">A/R Invoice</SelectItem><SelectItem value="Credit Memo">Credit Memo</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Date From</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs">Date To</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="flex items-end">
          <Button onClick={() => setCalculated(true)} className="bg-[#0066cc] h-8">Calculate</Button>
        </div>
      </div>

      {calculated && (
        <>
          <div className="bg-white rounded border border-[#d0d5dd]">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
                <th className="text-left px-3 py-2">Doc No.</th>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-right px-3 py-2">Revenue</th>
                <th className="text-right px-3 py-2">Cost (Old)</th>
                <th className="text-right px-3 py-2">Cost (New)</th>
                <th className="text-right px-3 py-2">GP% (Old)</th>
                <th className="text-right px-3 py-2">GP% (New)</th>
                <th className="text-right px-3 py-2">Difference</th>
              </tr></thead>
              <tbody>
                {mockResults.map(r => (
                  <tr key={r.id} className="border-b border-[#d0d5dd]">
                    <td className="px-3 py-2.5 font-mono">{r.docNo}</td>
                    <td className="px-3 py-2.5">{r.item}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{r.revenue.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{r.costOld.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{r.costNew.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{r.gpOld.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-right">{r.gpNew.toFixed(1)}%</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.diff < 0 ? 'text-red-600' : 'text-green-600'}`}>{r.diff.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild><Button className="bg-[#0066cc]">Post Differences</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Post GP Differences?</AlertDialogTitle>
                  <AlertDialogDescription>This will create adjustment journal entries for the cost differences. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toast({ title: 'Differences posted successfully' })}>Post</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );
}
