import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign, ListChecks, Calculator, Clock, FileText, TrendingUp, CheckCircle2,
} from 'lucide-react';

const ipaSteps = [
  { step: 1, title: 'Measurement', desc: 'On-site measurement of completed works against BOQ line items. Joint measurement with Engineer\'s Representative.', status: 'required' },
  { step: 2, title: 'Valuation', desc: 'Apply BOQ rates to measured quantities. Include material on-site and advance payment recovery.', status: 'required' },
  { step: 3, title: 'Variations', desc: 'Price and include approved Variation Orders (VOs). Separate omissions from additions.', status: 'if applicable' },
  { step: 4, title: 'Claims', desc: 'Include contractual claims (EOT cost, disruption). Reference specific contract clauses.', status: 'if applicable' },
  { step: 5, title: 'Price Adjustment', desc: 'Apply price escalation/de-escalation formula if contract allows (CPI-based).', status: 'if applicable' },
  { step: 6, title: 'Summary', desc: 'Compile gross value, deductions (retention, AP recovery, contra charges), calculate net due.', status: 'required' },
  { step: 7, title: 'Submission', desc: 'Submit IPA with all backup documents to Engineer/PM for certification within contract deadline.', status: 'required' },
  { step: 8, title: 'Review & Certification', desc: 'Engineer reviews, issues Payment Certificate. Client pays within contractual period.', status: 'required' },
];

const ipaCalculation = [
  { line: 'A', desc: 'Contract Sum (at Award)', amount: 50000000, type: 'info', basis: 'BOQ Total' },
  { line: 'B', desc: 'Approved Variations to Date', amount: 2400000, type: 'info', basis: 'VO Register' },
  { line: 'C', desc: 'Assessed Variations (unapproved)', amount: 750000, type: 'info', basis: 'Own Assessment' },
  { line: 'D', desc: 'Prolongation / Claims', amount: 300000, type: 'info', basis: 'Notified Events' },
  { line: 'E', desc: 'Price Adjustment (Fluctuations)', amount: 180000, type: 'info', basis: 'Formula method' },
  { line: 'F', desc: 'Gross Value to Date (A+B+C+D+E × %complete)', amount: 34697500, type: 'subtotal', basis: '65% Progress' },
  { line: 'G', desc: 'Less: Retention (5% of F)', amount: -1734875, type: 'deduct', basis: 'Clause 14.3' },
  { line: 'H', desc: 'Less: Advance Payment Recovery (30% prog.)', amount: -1500000, type: 'deduct', basis: 'AP Recovery Sched.' },
  { line: 'I', desc: 'Net Value to Date (F−G−H)', amount: 31462625, type: 'subtotal', basis: '' },
  { line: 'J', desc: 'Less: Previous IPC Certified', amount: -27810000, type: 'deduct', basis: 'IPA #7 IPC' },
  { line: 'K', desc: 'NET AMOUNT DUE THIS PERIOD (I−J)', amount: 3652625, type: 'net', basis: '' },
  { line: 'L', desc: 'Add: VAT (15%)', amount: 547894, type: 'add', basis: 'KSA VAT' },
  { line: 'M', desc: 'TOTAL INVOICE AMOUNT (K+L)', amount: 4200519, type: 'total', basis: '' },
];

const paymentTimeline = [
  { day: 'D+0', event: 'Contractor submits IPA application', status: 'contractor' },
  { day: 'D+7', event: 'Engineer acknowledges receipt', status: 'engineer' },
  { day: 'D+14', event: 'Joint site measurement (if required)', status: 'joint' },
  { day: 'D+21', event: 'Engineer completes valuation review', status: 'engineer' },
  { day: 'D+28', event: 'Payment Certificate issued by Engineer', status: 'engineer' },
  { day: 'D+35', event: 'Client reviews and raises queries (if any)', status: 'client' },
  { day: 'D+42', event: 'Client approves payment', status: 'client' },
  { day: 'D+56', event: 'Payment received in Contractor account', status: 'payment' },
];

const supportingDocs = [
  'Progress photographs (before/after)',
  'Joint measurement sheets (signed)',
  'Material delivery receipts & invoices',
  'Variation Order approvals',
  'Test certificates & inspection reports',
  'Labour allocation records',
  'Plant utilization records',
  'Subcontractor invoices & valuations',
  'Programme update (as-built vs planned)',
  'Claim substantiation documents',
];

const underCertResponse = [
  { step: 1, action: 'Review Payment Certificate line by line against submission', timeline: 'Within 7 days' },
  { step: 2, action: 'Identify specific items reduced or omitted by Engineer', timeline: 'Within 7 days' },
  { step: 3, action: 'Request written reasons for under-certification (contractual right)', timeline: 'Within 14 days' },
  { step: 4, action: 'Prepare detailed rebuttal with supporting evidence', timeline: 'Within 21 days' },
  { step: 5, action: 'Submit formal dispute/disagreement notice under contract', timeline: 'Within 28 days' },
  { step: 6, action: 'Escalate to Senior Management / DAB / Arbitration if unresolved', timeline: 'Per contract' },
];

const cashFlowStrategies = [
  { strategy: 'Front-load preliminary items', impact: 'High', desc: 'Maximise early recovery by properly pricing mobilization and setup items. Legal and contractual.' },
  { strategy: 'Negotiate advance payment (10-20%)', impact: 'High', desc: 'Secure upfront cash to fund initial mobilization and material purchases against bank guarantee.' },
  { strategy: 'Early material procurement & on-site storage', impact: 'Medium', desc: 'Claim materials on-site value as soon as vesting clause is triggered — significant cash flow benefit on long-lead items.' },
  { strategy: 'Minimize retention percentage', impact: 'Medium', desc: 'Negotiate 5% instead of 10%, or cap at a fixed amount.' },
  { strategy: 'Accelerate measurement cycles', impact: 'Medium', desc: 'Monthly IPAs instead of quarterly; weekly progress tracking.' },
  { strategy: 'Maintain strict VO documentation', impact: 'High', desc: 'Ensure all variations are priced and approved before execution.' },
  { strategy: 'Parallel processing of claims', impact: 'Medium', desc: 'Submit claims alongside IPAs, not after project completion.' },
  { strategy: 'Early IPA submission', impact: 'Medium', desc: 'Submit IPA 2 weeks before deadline. Allows joint measurement meetings and reduces disputes before certification.' },
  { strategy: 'Suspension right (last resort)', impact: 'High', desc: 'Under HGCRA 1996 / FIDIC 16.1, contractor can suspend after 7 days\' notice if payment not made by due date.' },
];

const dayColor: Record<string, string> = {
  contractor: 'bg-blue-100 text-blue-800',
  engineer: 'bg-purple-100 text-purple-800',
  joint: 'bg-yellow-100 text-yellow-800',
  client: 'bg-orange-100 text-orange-800',
  payment: 'bg-green-100 text-green-800',
};

export default function IPABillingPanel() {
  const [docChecked, setDocChecked] = useState<Record<number, boolean>>({});
  const docDone = Object.values(docChecked).filter(Boolean).length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" /> IPA Billing Reference Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="process" className="w-full">
          <TabsList className="w-full justify-start px-4 flex-wrap h-auto gap-1 py-1">
            <TabsTrigger value="process"><ListChecks className="h-3.5 w-3.5 mr-1" />8-Step Process</TabsTrigger>
            <TabsTrigger value="calculation"><Calculator className="h-3.5 w-3.5 mr-1" />Calculation Model</TabsTrigger>
            <TabsTrigger value="timeline"><Clock className="h-3.5 w-3.5 mr-1" />Payment Timeline</TabsTrigger>
            <TabsTrigger value="cashflow"><TrendingUp className="h-3.5 w-3.5 mr-1" />Cash Flow</TabsTrigger>
          </TabsList>

          {/* ── 8-Step Process ── */}
          <TabsContent value="process" className="px-4 pb-4 space-y-3">
            <h3 className="font-semibold">IPA Process Flow</h3>
            <div className="grid gap-2">
              {ipaSteps.map(s => (
                <div key={s.step} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {s.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{s.title}</span>
                      <Badge variant={s.status === 'required' ? 'default' : 'secondary'} className="text-xs">{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Calculation Model ── */}
          <TabsContent value="calculation" className="px-4 pb-4 space-y-3">
            <h3 className="font-semibold">IPA Summary Calculation Model (SAR)</h3>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Line</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-28">Basis</TableHead>
                      <TableHead className="text-right w-40">Amount (SAR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipaCalculation.map(row => (
                      <TableRow key={row.line} className={row.type === 'subtotal' || row.type === 'net' || row.type === 'total' ? 'bg-muted/50 font-bold' : ''}>
                        <TableCell className="font-mono">{row.line}</TableCell>
                        <TableCell className={`text-sm ${row.type === 'deduct' ? 'text-red-600' : ''}`}>{row.desc}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.basis}</TableCell>
                        <TableCell className={`text-right font-mono ${row.type === 'deduct' ? 'text-red-600' : row.type === 'total' ? 'text-green-700 text-base' : row.type === 'net' ? 'text-green-600' : ''}`}>
                          {row.amount < 0 ? `(${Math.abs(row.amount).toLocaleString()})` : row.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="p-3 bg-muted border border-border rounded-md font-mono text-xs space-y-1">
              <p className="text-primary">Retention Release at PC = Total Retention Held × 50%</p>
              <p className="text-primary">Retention Release at Defects End = Remaining Retention × 100%</p>
              <p className="text-primary">AP Recovery Rate = Advance Payment / (Contract Sum × 0.90) per period</p>
            </div>
          </TabsContent>

          {/* ── Payment Timeline ── */}
          <TabsContent value="timeline" className="px-4 pb-4 space-y-4">
            <h3 className="font-semibold">Payment Timeline Tracker</h3>
            <div className="space-y-2">
              {paymentTimeline.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Badge className={`w-14 justify-center ${dayColor[t.status]}`}>{t.day}</Badge>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm flex-[3]">{t.event}</span>
                </div>
              ))}
            </div>

            <h3 className="font-semibold pt-2">Supporting Documents</h3>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Checklist</span>
              <Badge variant="outline">{docDone}/{supportingDocs.length}</Badge>
            </div>
            <Progress value={(docDone / supportingDocs.length) * 100} className="h-2 mb-2" />
            <div className="grid gap-1">
              {supportingDocs.map((doc, i) => (
                <label key={i} className="flex items-center gap-3 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox checked={!!docChecked[i]} onCheckedChange={() => setDocChecked(prev => ({ ...prev, [i]: !prev[i] }))} />
                  <span className={docChecked[i] ? 'line-through text-muted-foreground' : ''}>{doc}</span>
                </label>
              ))}
            </div>

            <h3 className="font-semibold pt-2">Under-Certification Response Procedure</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-28">Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {underCertResponse.map(r => (
                  <TableRow key={r.step}>
                    <TableCell className="font-bold">{r.step}</TableCell>
                    <TableCell className="text-sm">{r.action}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.timeline}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── Cash Flow ── */}
          <TabsContent value="cashflow" className="px-4 pb-4 space-y-3">
            <h3 className="font-semibold">Cash Flow Optimisation Strategies</h3>
            <div className="grid gap-2">
              {cashFlowStrategies.map((s, i) => (
                <div key={i} className="flex gap-3 p-3 border rounded-lg">
                  <TrendingUp className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.strategy}</span>
                      <Badge variant={s.impact === 'High' ? 'default' : 'secondary'} className="text-xs">{s.impact} Impact</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
