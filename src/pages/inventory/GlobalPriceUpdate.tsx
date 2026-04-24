import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

const steps = ['Select Price Lists', 'Update Method', 'Preview', 'Execute'];

export default function GlobalPriceUpdate() {
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a3a5c] text-white px-4 py-3 rounded-lg">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Global Update of Prices</h1>
      </div>
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div key={s} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${i === step ? 'bg-[#0066cc] text-white' : i < step ? 'bg-green-100 text-green-800' : 'bg-[#f0f2f4] text-gray-500'}`}>
            {i < step ? <CheckCircle2 className="h-4 w-4" /> : <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">{i + 1}</span>}
            {s}
          </div>
        ))}
      </div>
      <div className="bg-white rounded border border-[#d0d5dd] p-6 min-h-[350px]">
        {step === 0 && <div className="max-w-md space-y-2"><p className="text-sm text-gray-600 mb-3">Select price lists to update:</p><div className="flex items-center gap-2"><Checkbox /><span className="text-sm">Default Price List</span></div><div className="flex items-center gap-2"><Checkbox /><span className="text-sm">Wholesale Price List</span></div></div>}
        {step === 1 && (
          <div className="max-w-md space-y-3">
            <div className="space-y-1"><Label className="text-xs">Update Method</Label>
              <Select defaultValue="increase"><SelectTrigger className="h-8 text-sm border-[#d0d5dd]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increase">Increase by %</SelectItem><SelectItem value="decrease">Decrease by %</SelectItem><SelectItem value="multiply">Multiply by Factor</SelectItem><SelectItem value="fixed">Set Fixed Price</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Value</Label><Input type="number" className="h-8 text-sm border-[#d0d5dd]" /></div>
          </div>
        )}
        {step === 2 && <div className="text-center text-gray-400 py-12">No items to preview</div>}
        {step === 3 && <div className="text-center py-12 space-y-4"><Progress value={0} className="max-w-md mx-auto" /><p className="text-sm text-gray-500">Ready to update prices</p><Button className="bg-[#0066cc]">Execute Update</Button></div>}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
        {step < steps.length - 1 ? <Button className="bg-[#0066cc]" onClick={() => setStep(step + 1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button> : <Button className="bg-[#1a7a4a]">Finish</Button>}
      </div>
    </div>
  );
}
