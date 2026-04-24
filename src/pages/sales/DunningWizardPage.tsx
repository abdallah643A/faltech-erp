import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'code', header: 'Code' },
  { key: 'customer', header: 'Customer' },
  { key: 'balance', header: 'Balance' },
  { key: 'overdue_days', header: 'Overdue Days' },
  { key: 'current_level', header: 'Current Level' },
  { key: 'proposed', header: 'Proposed' },
];


const steps = ['Parameters', 'Customer Selection', 'Preview Letters', 'Execute'];

export default function DunningWizardPage() {
  const [step, setStep] = useState(0);
  const [dunningDate, setDunningDate] = useState<Date>(new Date());
  const [dunningLevel, setDunningLevel] = useState(1);
  const [minBalance, setMinBalance] = useState(1000);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sendVia, setSendVia] = useState('Email');
  const [executing, setExecuting] = useState(false);

  const mockCustomers = [
    { id: '1', code: 'C-10001', name: 'Al Rajhi Corp', balance: 125000, overdueDays: 45, currentLevel: 1, proposedLevel: 2 },
    { id: '2', code: 'C-10002', name: 'SABIC Industries', balance: 89500, overdueDays: 32, currentLevel: 0, proposedLevel: 1 },
    { id: '3', code: 'C-10003', name: 'Aramco Services', balance: 234000, overdueDays: 67, currentLevel: 2, proposedLevel: 3 },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Dunning Wizard</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="dunning-wizard-page" title="Dunning Wizard Page" />
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              i === step ? "bg-[#0066cc] text-white" : i < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
            )}>{i < step ? '✓' : i + 1}</div>
            <span className={cn("text-sm", i === step ? "font-semibold" : "text-gray-400")}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded border border-[#d0d5dd] p-6 min-h-[300px]">
        {step === 0 && (
          <div className="grid grid-cols-3 gap-4 max-w-2xl">
            <div className="space-y-1">
              <Label className="text-xs">Dunning Date</Label>
              <Popover><PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start"><CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(dunningDate, 'yyyy-MM-dd')}</Button>
              </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dunningDate} onSelect={d => d && setDunningDate(d)} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dunning Level</Label>
              <div className="flex gap-2">{[1, 2, 3].map(l => (
                <Button key={l} size="sm" variant={dunningLevel === l ? 'default' : 'outline'} onClick={() => setDunningLevel(l)} className={dunningLevel === l ? 'bg-[#0066cc]' : ''}>{l}</Button>
              ))}</div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Minimum Balance</Label>
              <Input type="number" value={minBalance} onChange={e => setMinBalance(Number(e.target.value))} className="h-8 text-sm border-[#d0d5dd]" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => setSelectedCustomers(mockCustomers.map(c => c.id))}>Select All</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedCustomers([])}>Deselect All</Button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
                <th className="w-8 px-2 py-2" /><th className="text-left px-2 py-2">Code</th><th className="text-left px-2 py-2">Customer</th><th className="text-right px-2 py-2">Balance</th><th className="text-right px-2 py-2">Overdue Days</th><th className="text-center px-2 py-2">Current Level</th><th className="text-center px-2 py-2">Proposed</th>
              </tr></thead>
              <tbody>
                {mockCustomers.map(c => (
                  <tr key={c.id} className="border-b border-[#d0d5dd] hover:bg-blue-50/30">
                    <td className="px-2 py-2"><Checkbox checked={selectedCustomers.includes(c.id)} onCheckedChange={ch => setSelectedCustomers(ch ? [...selectedCustomers, c.id] : selectedCustomers.filter(x => x !== c.id))} /></td>
                    <td className="px-2 py-2 font-mono">{c.code}</td>
                    <td className="px-2 py-2">{c.name}</td>
                    <td className="px-2 py-2 text-right font-mono">{c.balance.toLocaleString()}</td>
                    <td className={cn("px-2 py-2 text-right", c.overdueDays > 60 ? "text-red-600" : c.overdueDays > 30 ? "text-amber-600" : "text-green-600")}>{c.overdueDays}</td>
                    <td className="px-2 py-2 text-center"><Badge variant="outline">{c.currentLevel}</Badge></td>
                    <td className="px-2 py-2 text-center"><Badge className="bg-amber-100 text-amber-800">{c.proposedLevel}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            {mockCustomers.filter(c => selectedCustomers.includes(c.id)).map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-[#d0d5dd] rounded hover:bg-[#f0f2f4]">
                <div><span className="font-semibold">{c.name}</span> — Level {c.proposedLevel} dunning letter</div>
                <Button size="sm" variant="outline" className="gap-1"><Eye className="h-3.5 w-3.5" /> Preview Letter</Button>
              </div>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 text-center py-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Label className="text-sm">Send via:</Label>
              {['Email', 'Print'].map(v => (
                <Button key={v} size="sm" variant={sendVia === v ? 'default' : 'outline'} onClick={() => setSendVia(v)} className={sendVia === v ? 'bg-[#0066cc]' : ''}>{v}</Button>
              ))}
            </div>
            {!executing ? (
              <Button onClick={() => setExecuting(true)} className="bg-[#0066cc]">Execute Dunning</Button>
            ) : (
              <div>
                <p className="text-sm text-green-600 font-semibold mb-2">✓ Dunning letters sent to {selectedCustomers.length} customers via {sendVia}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
        {step < 3 && <Button onClick={() => setStep(s => s + 1)} className="bg-[#0066cc]">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>}
      </div>
    </div>
  );
}
