import { useState } from 'react';
import { executePosting, SAP_DOCUMENT_TYPES, ROW_TYPES, ACCOUNT_TYPE_LABELS, type PostingContext, type PostingResult, type CandidateRule } from '@/services/sapPostingEngine';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Play, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PostingSimulator() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompanyId } = useActiveCompany();

  const [ctx, setCtx] = useState<PostingContext>({
    document_type: 'ar_invoice',
    total: 11500,
    subtotal: 10000,
    tax_amount: 1500,
    row_type: 'inventory_item',
    perpetual_inventory: true,
  });
  const [result, setResult] = useState<PostingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await executePosting(ctx, activeCompanyId || undefined);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const docInfo = SAP_DOCUMENT_TYPES.find(d => d.value === ctx.document_type);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5" />
            {isAr ? 'محاكاة الترحيل' : 'Posting Simulation / JE Preview'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'اختبر كيف سيتم تحديد الحسابات وإنشاء القيد المحاسبي' : 'Test how accounts will be determined and the journal entry generated'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Info */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Document Type *</Label>
              <Select value={ctx.document_type} onValueChange={v => setCtx({ ...ctx, document_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAP_DOCUMENT_TYPES.filter(d => d.creates_je).map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Row Type</Label>
              <Select value={ctx.row_type || 'inventory_item'} onValueChange={v => setCtx({ ...ctx, row_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROW_TYPES.map(rt => <SelectItem key={rt} value={rt}>{rt.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={ctx.perpetual_inventory !== false} onCheckedChange={v => setCtx({ ...ctx, perpetual_inventory: v })} />
              <Label>Perpetual Inventory</Label>
            </div>
            <div>
              <Label>Document #</Label>
              <Input value={ctx.document_number || ''} onChange={e => setCtx({ ...ctx, document_number: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label>Total</Label>
              <Input type="number" value={ctx.total} onChange={e => setCtx({ ...ctx, total: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Subtotal</Label>
              <Input type="number" value={ctx.subtotal} onChange={e => setCtx({ ...ctx, subtotal: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Tax Amount</Label>
              <Input type="number" value={ctx.tax_amount} onChange={e => setCtx({ ...ctx, tax_amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Discount</Label>
              <Input type="number" value={ctx.discount_amount || 0} onChange={e => setCtx({ ...ctx, discount_amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Price Diff</Label>
              <Input type="number" value={ctx.price_difference || 0} onChange={e => setCtx({ ...ctx, price_difference: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Criteria */}
          <Accordion type="single" collapsible>
            <AccordionItem value="criteria">
              <AccordionTrigger className="text-sm font-medium">Advanced Criteria (optional)</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-4 gap-3">
                  <div><Label className="text-xs">Item Group</Label><Input value={ctx.item_group || ''} onChange={e => setCtx({ ...ctx, item_group: e.target.value })} className="h-8" /></div>
                  <div><Label className="text-xs">Item Code</Label><Input value={ctx.item_code || ''} onChange={e => setCtx({ ...ctx, item_code: e.target.value })} className="h-8" /></div>
                  <div><Label className="text-xs">Warehouse</Label><Input value={ctx.warehouse || ''} onChange={e => setCtx({ ...ctx, warehouse: e.target.value })} className="h-8" /></div>
                  <div><Label className="text-xs">BP Group</Label><Input value={ctx.bp_group || ''} onChange={e => setCtx({ ...ctx, bp_group: e.target.value })} className="h-8" /></div>
                  <div><Label className="text-xs">BP Code</Label><Input value={ctx.bp_code || ''} onChange={e => setCtx({ ...ctx, bp_code: e.target.value })} className="h-8" /></div>
                  <div><Label className="text-xs">Branch</Label><Input value={ctx.branch || ''} onChange={e => setCtx({ ...ctx, branch: e.target.value })} className="h-8" /></div>
                  <div><Label className="text-xs">Project</Label><Input value={ctx.project || ''} onChange={e => setCtx({ ...ctx, project: e.target.value })} className="h-8" /></div>
                  <div><Label className="text-xs">Cost Center</Label><Input value={ctx.cost_center || ''} onChange={e => setCtx({ ...ctx, cost_center: e.target.value })} className="h-8" /></div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button onClick={runSimulation} disabled={loading} className="w-full" size="lg">
            <Play className="h-4 w-4 mr-2" /> {loading ? 'Simulating...' : 'Run Simulation'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Status */}
          <Card className={result.status === 'error' ? 'border-destructive' : result.status === 'warning' ? 'border-yellow-500' : 'border-green-500'}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {result.status === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : result.status === 'warning' ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                  <span className="font-semibold text-lg">
                    {result.matched_rule ? `Advanced Rule: ${result.matched_rule.rule_name}` : 'Default Account Determination'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge variant={result.is_balanced ? 'default' : 'destructive'}>{result.is_balanced ? 'Balanced' : 'Unbalanced'}</Badge>
                  <Badge variant="outline">{result.account_source}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{result.posting_rationale}</p>
              <div className="flex gap-6 text-sm mt-2">
                <span>Total Debit: <strong className="font-mono">{result.total_debit.toFixed(2)}</strong></span>
                <span>Total Credit: <strong className="font-mono">{result.total_credit.toFixed(2)}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Errors & Warnings */}
          {result.errors.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-4 space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-destructive"><XCircle className="h-3.5 w-3.5 shrink-0" />{e}</div>
                ))}
              </CardContent>
            </Card>
          )}
          {result.warnings.length > 0 && (
            <Card className="border-yellow-500">
              <CardContent className="pt-4 space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-yellow-600"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w}</div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* JE Preview */}
          {result.lines.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Generated Journal Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.lines.map(l => (
                      <TableRow key={l.line_order}>
                        <TableCell>{l.line_order}</TableCell>
                        <TableCell className="font-mono">{l.acct_code || <Badge variant="destructive">MISSING</Badge>}</TableCell>
                        <TableCell className="text-sm">{l.acct_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{ACCOUNT_TYPE_LABELS[l.account_purpose] || l.account_purpose}</Badge></TableCell>
                        <TableCell className="font-mono">{l.side === 'debit' ? l.amount.toFixed(2) : ''}</TableCell>
                        <TableCell className="font-mono">{l.side === 'credit' ? l.amount.toFixed(2) : ''}</TableCell>
                        <TableCell>
                          <Badge variant={l.account_source === 'advanced_rule' ? 'default' : l.account_source === 'fallback' ? 'destructive' : 'secondary'} className="text-xs">
                            {l.account_source}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="font-mono">{result.total_debit.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">{result.total_credit.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Candidate Rules Competition */}
          {result.candidate_rules && result.candidate_rules.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Rule Competition ({result.candidate_rules.length} rules evaluated)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.candidate_rules.map((c: CandidateRule, i: number) => (
                      <TableRow key={i} className={c.status === 'winner' ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                        <TableCell>
                          <div className="font-medium text-sm">{c.rule_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{c.rule_code}</div>
                        </TableCell>
                        <TableCell className="font-mono">{c.priority}</TableCell>
                        <TableCell className="font-mono">{c.match_score}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'winner' ? 'default' : 'secondary'} className="text-xs">
                            {c.status === 'winner' ? '✓ Winner' : '✗ Rejected'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                          {c.status === 'winner' ? 'Best specificity + priority' : c.rejection_reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Resolution Path */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Resolution Path (Why was this account used?)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.resolution_path.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="shrink-0 mt-0.5">Step {step.step}</Badge>
                    <div>
                      <p className="font-medium">{step.action}</p>
                      <p className="text-muted-foreground text-xs">{step.details}</p>
                      {step.source && <Badge variant="secondary" className="text-xs mt-1">{step.source}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
