import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'doc_no', header: 'Doc No.' },
  { key: 'customer', header: 'Customer' },
  { key: 'date', header: 'Date' },
  { key: 'amount', header: 'Amount' },
  { key: 'status', header: 'Status' },
  { key: 'from_document', header: 'From Document' },
  { key: 'target', header: '→ Target' },
];


const steps = ['Selection Criteria', 'Documents to Process', 'Consolidation Options', 'Review', 'Results'];

export default function DocumentGenerationWizard() {
  const [step, setStep] = useState(0);
  const [sourceType, setSourceType] = useState('Sales Orders');
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [consolidate, setConsolidate] = useState(false);
  const [targetType, setTargetType] = useState('A/R Invoice');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const mockDocs = [
    { id: '1', docNo: 'SO-2025-00142', customer: 'Al Rajhi Corp', date: '2025-04-01', amount: 125000, status: 'Open' },
    { id: '2', docNo: 'SO-2025-00143', customer: 'SABIC Industries', date: '2025-04-02', amount: 89500, status: 'Open' },
    { id: '3', docNo: 'SO-2025-00144', customer: 'Aramco Services', date: '2025-04-03', amount: 234000, status: 'Open' },
  ];

  const handleGenerate = () => {
    setGenerating(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      setProgress(p);
      if (p >= 100) { clearInterval(interval); setGenerating(false); }
    }, 500);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Document Generation Wizard</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="document-generation-wizard" title="Document Generation Wizard" />
      </div>

      {/* Steps indicator */}
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
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-1"><Label className="text-xs">Source Document Type</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Sales Orders">Sales Orders</SelectItem><SelectItem value="Deliveries">Deliveries</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Date From</Label>
              <Popover><PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-8 text-sm border-[#d0d5dd] justify-start"><CalendarIcon className="mr-2 h-3.5 w-3.5" />{format(dateFrom, 'yyyy-MM-dd')}</Button>
              </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateFrom} onSelect={d => d && setDateFrom(d)} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => setSelectedDocs(mockDocs.map(d => d.id))}>Select All</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedDocs([])}>Deselect All</Button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
                <th className="w-8 px-2 py-2" /><th className="text-left px-2 py-2">Doc No.</th><th className="text-left px-2 py-2">Customer</th><th className="text-left px-2 py-2">Date</th><th className="text-right px-2 py-2">Amount</th><th className="text-left px-2 py-2">Status</th>
              </tr></thead>
              <tbody>
                {mockDocs.map(doc => (
                  <tr key={doc.id} className="border-b border-[#d0d5dd] hover:bg-blue-50/30">
                    <td className="px-2 py-2"><Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={c => setSelectedDocs(c ? [...selectedDocs, doc.id] : selectedDocs.filter(x => x !== doc.id))} /></td>
                    <td className="px-2 py-2 font-mono">{doc.docNo}</td>
                    <td className="px-2 py-2">{doc.customer}</td>
                    <td className="px-2 py-2">{doc.date}</td>
                    <td className="px-2 py-2 text-right font-mono">{doc.amount.toLocaleString()}</td>
                    <td className="px-2 py-2"><Badge variant="outline" className="text-xs">{doc.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 max-w-md">
            <div className="flex items-center gap-3">
              <Checkbox checked={consolidate} onCheckedChange={c => setConsolidate(!!c)} />
              <Label className="text-sm">Consolidate per Customer</Label>
            </div>
            <div className="space-y-1"><Label className="text-xs">Target Document Type</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="A/R Invoice">A/R Invoice</SelectItem><SelectItem value="Delivery">Delivery</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Summary — {selectedDocs.length} documents will be processed</h3>
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
                <th className="text-left px-2 py-2">From Document</th><th className="text-left px-2 py-2">→ Target</th><th className="text-left px-2 py-2">Customer</th><th className="text-right px-2 py-2">Amount</th>
              </tr></thead>
              <tbody>
                {mockDocs.filter(d => selectedDocs.includes(d.id)).map(doc => (
                  <tr key={doc.id} className="border-b border-[#d0d5dd]">
                    <td className="px-2 py-2 font-mono">{doc.docNo}</td>
                    <td className="px-2 py-2">{targetType}</td>
                    <td className="px-2 py-2">{doc.customer}</td>
                    <td className="px-2 py-2 text-right font-mono">{doc.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            {generating ? (
              <div className="text-center py-8">
                <Progress value={progress} className="w-64 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Generating documents... {progress}%</p>
              </div>
            ) : progress >= 100 ? (
              <div>
                <h3 className="text-sm font-semibold mb-3">Results</h3>
                {mockDocs.filter(d => selectedDocs.includes(d.id)).map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 py-2 border-b border-[#d0d5dd]">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-mono">{doc.docNo} → INV-2025-{String(Math.floor(Math.random() * 9999)).padStart(5, '0')}</span>
                    <Badge className="bg-green-100 text-green-700 text-xs">Created</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Button onClick={handleGenerate} className="bg-[#0066cc]">Generate Documents</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)} className="bg-[#0066cc]">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button variant="outline" onClick={() => { setStep(0); setProgress(0); setSelectedDocs([]); }}>Start Over</Button>
        )}
      </div>
    </div>
  );
}
