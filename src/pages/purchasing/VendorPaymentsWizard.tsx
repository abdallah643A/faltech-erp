import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'vendor_code', header: 'Vendor Code' },
  { key: 'name', header: 'Name' },
  { key: 'open_balance', header: 'Open Balance' },
  { key: 'overdue', header: 'Overdue' },
  { key: 'proposed_payment', header: 'Proposed Payment' },
];


const steps = ['Parameters', 'Vendor Selection', 'Payment Details', 'Execute'];

export default function VendorPaymentsWizard() {
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Vendor Payments Wizard</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="vendor-payments-wizard" title="Vendor Payments Wizard" />
      </div>
      <div className="flex gap-2 mb-4">
        {steps.map((s, i) => (
          <div key={s} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${i === step ? 'bg-[#0066cc] text-white' : i < step ? 'bg-green-100 text-green-800' : 'bg-[#f0f2f4] text-gray-500'}`}>
            {i < step ? <CheckCircle2 className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">{i + 1}</span>}
            {s}
          </div>
        ))}
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-6 min-h-[400px]">
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1"><Label className="text-xs">Payment Date</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Payment Method</Label>
              <Select defaultValue="transfer"><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="check">Check</SelectItem><SelectItem value="transfer">Bank Transfer</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Bank Account</Label><Input className="h-8 text-sm border-[#d0d5dd]" /></div>
            <div className="space-y-1"><Label className="text-xs">Currency</Label><Input className="h-8 text-sm border-[#d0d5dd]" defaultValue="SAR" /></div>
            <div className="space-y-1"><Label className="text-xs">Include Invoices Due By</Label><Input type="date" className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
        )}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-3"><Checkbox /><span className="text-sm">Overdue Only</span></div>
            <table className="w-full text-sm"><thead className="bg-[#f0f2f4]"><tr><th className="p-2 w-8"><Checkbox /></th><th className="p-2 text-left">Vendor Code</th><th className="p-2 text-left">Name</th><th className="p-2 text-right">Open Balance</th><th className="p-2 text-right">Overdue</th><th className="p-2 text-right">Proposed Payment</th></tr></thead>
              <tbody><tr><td colSpan={6} className="p-4 text-center text-gray-400">No vendors with open balances</td></tr></tbody>
            </table>
          </div>
        )}
        {step === 2 && (
          <div className="text-center text-gray-400 py-12">Select vendors in previous step to view payment details</div>
        )}
        {step === 3 && (
          <div className="text-center py-12 space-y-4">
            <Progress value={0} className="max-w-md mx-auto" />
            <p className="text-sm text-gray-500">Ready to execute payments</p>
            <Button className="bg-[#0066cc]">Execute Payments</Button>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Button className="bg-[#0066cc]" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
    </div>
  );
}
