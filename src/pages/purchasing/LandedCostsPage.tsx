import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calculator, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'grpo_no', header: 'GRPO No.' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'date', header: 'Date' },
  { key: 'total_amount', header: 'Total Amount' },
  { key: 'cost_type', header: 'Cost Type' },
  { key: 'amount_sar', header: 'Amount (SAR)' },
  { key: 'allocation_method', header: 'Allocation Method' },
  { key: 'item', header: 'Item' },
  { key: 'grpo', header: 'GRPO' },
  { key: 'qty', header: 'Qty' },
];


export default function LandedCostsPage() {
  const { toast } = useToast();
  const [grpos] = useState<any[]>([]);
  const [costLines] = useState<{ costType: string; vendor: string; amount: number; method: string }[]>([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Landed Costs</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="landed-costs-page" title="Landed Costs Page" />
          <span className="text-sm opacity-80">LC-2025-00001</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800">Open</Badge>
          <Button size="sm" variant="secondary" className="gap-1"><Save className="h-3.5 w-3.5" /> Save</Button>
        </div>
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-4 grid grid-cols-4 gap-4">
        <div className="space-y-1"><Label className="text-xs text-gray-600">Document No.</Label><Input className="h-8 text-sm border-[#d0d5dd]" defaultValue="LC-2025-00001" readOnly /></div>
        <div className="space-y-1"><Label className="text-xs text-gray-600">Vendor</Label><Input className="h-8 text-sm border-[#d0d5dd]" placeholder="🔍 Select vendor" /></div>
        <div className="space-y-1"><Label className="text-xs text-gray-600">Posting Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
        <div className="space-y-1"><Label className="text-xs text-gray-600">Branch</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
      </div>

      {/* Base Documents */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Base Documents (Goods Receipt POs)</h3>
          <Button size="sm" variant="outline" className="gap-1 text-sm"><Plus className="h-3.5 w-3.5" /> Add GRPO</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">GRPO No.</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th><th className="p-2 text-left border-b border-[#d0d5dd]">Date</th><th className="p-2 text-right border-b border-[#d0d5dd]">Total Amount</th></tr></thead>
          <tbody>{grpos.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No GRPOs linked. Click "Add GRPO" to begin.</td></tr>}</tbody>
        </table>
      </div>

      {/* Landed Cost Lines */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Landed Cost Lines</h3>
          <Button size="sm" variant="outline" className="gap-1 text-sm"><Plus className="h-3.5 w-3.5" /> Add Cost</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Cost Type</th><th className="p-2 text-left border-b border-[#d0d5dd]">Vendor</th><th className="p-2 text-right border-b border-[#d0d5dd]">Amount (SAR)</th><th className="p-2 text-left border-b border-[#d0d5dd]">Allocation Method</th></tr></thead>
          <tbody>{costLines.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No cost lines added.</td></tr>}</tbody>
        </table>
      </div>

      {/* Allocation Preview */}
      <div className="bg-white rounded border border-[#d0d5dd] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Allocation Preview</h3>
          <Button size="sm" className="gap-1 bg-[#0066cc]"><Calculator className="h-3.5 w-3.5" /> Calculate</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#f0f2f4]"><tr><th className="p-2 text-left border-b border-[#d0d5dd]">Item</th><th className="p-2 text-left border-b border-[#d0d5dd]">GRPO</th><th className="p-2 text-right border-b border-[#d0d5dd]">Qty</th><th className="p-2 text-right border-b border-[#d0d5dd]">Original Cost</th><th className="p-2 text-right border-b border-[#d0d5dd]">Allocated</th><th className="p-2 text-right border-b border-[#d0d5dd]">New Unit Cost</th></tr></thead>
          <tbody><tr><td colSpan={6} className="p-4 text-center text-gray-400">Click "Calculate" after adding GRPOs and cost lines.</td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
