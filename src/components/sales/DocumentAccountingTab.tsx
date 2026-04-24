import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentHeaderData } from './DocumentHeader';

interface Props {
  data: DocumentHeaderData;
  onChange: (data: DocumentHeaderData) => void;
  isReadOnly?: boolean;
}

export function DocumentAccountingTab({ data, onChange, isReadOnly }: Props) {
  const update = (key: string, val: any) => onChange({ ...data, [key]: val });

  return (
    <div className="bg-white rounded border border-[#d0d5dd] p-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Payment Terms</Label>
            <Select value={data.paymentTerms || ''} onValueChange={v => update('paymentTerms', v)} disabled={isReadOnly}>
              <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="net30">Net 30</SelectItem>
                <SelectItem value="net60">Net 60</SelectItem>
                <SelectItem value="net90">Net 90</SelectItem>
                <SelectItem value="cod">COD</SelectItem>
                <SelectItem value="immediate">Immediate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Payment Method</Label>
            <Select value={data.paymentMethod || ''} onValueChange={v => update('paymentMethod', v)} disabled={isReadOnly}>
              <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">BP Bank Account</Label>
            <Input value={data.bpBankAccount || ''} onChange={e => update('bpBankAccount', e.target.value)} className="h-8 text-sm border-[#d0d5dd]" readOnly={isReadOnly} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Project</Label>
            <Input value={data.project || ''} onChange={e => update('project', e.target.value)} className="h-8 text-sm border-[#d0d5dd]" readOnly={isReadOnly} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Cost Center</Label>
            <Input value={data.costCenter || ''} onChange={e => update('costCenter', e.target.value)} className="h-8 text-sm border-[#d0d5dd]" readOnly={isReadOnly} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Sales Employee</Label>
            <Input value={data.salesEmployee || ''} onChange={e => update('salesEmployee', e.target.value)} className="h-8 text-sm border-[#d0d5dd]" readOnly={isReadOnly} />
          </div>
        </div>
      </div>
    </div>
  );
}
