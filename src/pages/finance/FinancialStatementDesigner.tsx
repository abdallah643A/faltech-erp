import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useStatementTemplates, useStatementLines } from '@/hooks/useFinanceEnhanced';
import { FileSpreadsheet, Plus, ChevronRight, Trash2 } from 'lucide-react';

export default function FinancialStatementDesigner() {
  const { data: templates, upsert, remove } = useStatementTemplates();
  const [selected, setSelected] = useState<any>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [tplForm, setTplForm] = useState<any>({ template_name: '', template_name_ar: '', statement_type: 'balance_sheet', framework: 'IFRS', description: '' });
  const [lineForm, setLineForm] = useState<any>({ line_order: 10, line_code: '', line_label: '', line_label_ar: '', line_type: 'detail', sign_multiplier: 1, account_codes: '' });
  const { data: lines, upsert: upsertLine, remove: removeLine } = useStatementLines(selected?.id);

  const saveLine = async () => {
    const accts = lineForm.account_codes ? lineForm.account_codes.split(',').map((s: string) => s.trim()) : null;
    await upsertLine.mutateAsync({ ...lineForm, account_codes: accts });
    setLineOpen(false);
    setLineForm({ line_order: (lineForm.line_order || 0) + 10, line_code: '', line_label: '', line_label_ar: '', line_type: 'detail', sign_multiplier: 1, account_codes: '' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-6 w-6" /> Financial Statement Designer</h1>
          <p className="text-muted-foreground">Build IFRS/SOCPA statements with custom lines, formulas, and bilingual labels</p>
        </div>
        <Dialog open={tplOpen} onOpenChange={setTplOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Template</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Statement Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={tplForm.template_name} onChange={e => setTplForm({ ...tplForm, template_name: e.target.value })} /></div>
              <div><Label>Name (AR)</Label><Input dir="rtl" value={tplForm.template_name_ar} onChange={e => setTplForm({ ...tplForm, template_name_ar: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={tplForm.statement_type} onValueChange={v => setTplForm({ ...tplForm, statement_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                    <SelectItem value="income_statement">Income Statement (P&L)</SelectItem>
                    <SelectItem value="cash_flow">Cash Flow</SelectItem>
                    <SelectItem value="equity_changes">Changes in Equity</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Framework</Label>
                <Select value={tplForm.framework} onValueChange={v => setTplForm({ ...tplForm, framework: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IFRS">IFRS</SelectItem>
                    <SelectItem value="SOCPA">SOCPA</SelectItem>
                    <SelectItem value="GAAP">GAAP</SelectItem>
                    <SelectItem value="MGT">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={tplForm.description} onChange={e => setTplForm({ ...tplForm, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={async () => { await upsert.mutateAsync(tplForm); setTplOpen(false); }}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader><CardTitle>Templates ({templates.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {templates.map((t: any) => (
              <button key={t.id} onClick={() => setSelected(t)}
                className={`w-full p-2 rounded text-left hover:bg-accent flex items-center justify-between ${selected?.id === t.id ? 'bg-accent' : ''}`}>
                <div>
                  <div className="font-medium text-sm flex items-center gap-1">
                    {t.template_name}
                    {t.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{t.framework} · {t.statement_type}</div>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Lines {selected ? `· ${selected.template_name}` : ''}</CardTitle>
            {selected && (
              <Dialog open={lineOpen} onOpenChange={setLineOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Line</Button></DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader><DialogTitle>New Line</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Order</Label><Input type="number" value={lineForm.line_order} onChange={e => setLineForm({ ...lineForm, line_order: +e.target.value })} /></div>
                    <div><Label>Code</Label><Input value={lineForm.line_code} onChange={e => setLineForm({ ...lineForm, line_code: e.target.value })} /></div>
                    <div className="col-span-2"><Label>Label *</Label><Input value={lineForm.line_label} onChange={e => setLineForm({ ...lineForm, line_label: e.target.value })} /></div>
                    <div className="col-span-2"><Label>Label (AR)</Label><Input dir="rtl" value={lineForm.line_label_ar} onChange={e => setLineForm({ ...lineForm, line_label_ar: e.target.value })} /></div>
                    <div><Label>Type</Label>
                      <Select value={lineForm.line_type} onValueChange={v => setLineForm({ ...lineForm, line_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="detail">Detail</SelectItem>
                          <SelectItem value="subtotal">Subtotal</SelectItem>
                          <SelectItem value="total">Total</SelectItem>
                          <SelectItem value="formula">Formula</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Sign Multiplier</Label><Input type="number" step="0.01" value={lineForm.sign_multiplier} onChange={e => setLineForm({ ...lineForm, sign_multiplier: +e.target.value })} /></div>
                    <div className="col-span-2"><Label>Account Codes (comma-separated)</Label><Input value={lineForm.account_codes} onChange={e => setLineForm({ ...lineForm, account_codes: e.target.value })} placeholder="e.g. 4100,4200,4300" /></div>
                  </div>
                  <DialogFooter><Button onClick={saveLine}>Save Line</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? <p className="text-sm text-muted-foreground">Select a template</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Code</TableHead><TableHead>Label</TableHead><TableHead>Type</TableHead><TableHead>Accounts</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {(lines || []).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.line_order}</TableCell>
                      <TableCell className="font-mono text-xs">{l.line_code || '—'}</TableCell>
                      <TableCell className={l.is_bold ? 'font-bold' : ''}>{l.line_label}</TableCell>
                      <TableCell><Badge variant="outline">{l.line_type}</Badge></TableCell>
                      <TableCell className="text-xs">{(l.account_codes || []).join(', ') || '—'}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => removeLine.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
