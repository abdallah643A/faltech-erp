import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useJEMappingRules, DOCUMENT_TYPES, AMOUNT_SOURCES, TRIGGER_TYPES, BUSINESS_VERTICALS,
  JEMappingRuleLine,
} from '@/hooks/useJEMappingRules';
import {
  Plus, Trash2, Edit, PlayCircle, Copy, CheckCircle2, AlertTriangle,
  FileSpreadsheet, Zap, RefreshCw, BookOpen, LayoutList, ArrowUpDown, Download,
} from 'lucide-react';
import JELedgerExpandable from '@/components/finance/JELedgerExpandable';
import { PageHelpTooltip } from '@/components/shared/PageHelpTooltip';
import { useLanguage } from '@/contexts/LanguageContext';

const emptyLine = (): JEMappingRuleLine => ({
  line_order: 1, acct_code: '', acct_name: '', entry_type: 'debit', amount_source: 'total', percentage: 100,
});

export default function JEMappingRules() {
  const { t } = useLanguage();
  const {
    rules, accounts, isLoading, postedJEs, isLoadingJEs, syncQueue, isLoadingSync,
    createRule, updateRule, toggleActive, deleteRule, cloneRule,
    testRule, getRuleLines, retrySyncQueue,
  } = useJEMappingRules();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');
  const [verticalFilter, setVerticalFilter] = useState('all');

  // Form state
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [description, setDescription] = useState('');
  const [triggerOn, setTriggerOn] = useState('post');
  const [triggerStatus, setTriggerStatus] = useState('');
  const [priority, setPriority] = useState(0);
  const [businessVertical, setBusinessVertical] = useState('all');
  const [lines, setLines] = useState<JEMappingRuleLine[]>([emptyLine()]);

  const resetForm = () => {
    setEditId(null); setName(''); setDocumentType(''); setDescription('');
    setTriggerOn('post'); setTriggerStatus(''); setPriority(0);
    setBusinessVertical('all'); setLines([emptyLine()]);
  };

  const openNew = () => { resetForm(); setFormOpen(true); };

  const openEdit = async (rule: any) => {
    setEditId(rule.id); setName(rule.name); setDocumentType(rule.document_type);
    setDescription(rule.description || ''); setTriggerOn(rule.trigger_on);
    setTriggerStatus(rule.trigger_status || ''); setPriority(rule.priority);
    setBusinessVertical(rule.business_vertical || 'all');
    const ruleLines = await getRuleLines(rule.id);
    setLines(ruleLines.length > 0 ? ruleLines : [emptyLine()]);
    setFormOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name, document_type: documentType, description,
      trigger_on: triggerOn, trigger_status: triggerStatus || undefined,
      priority, business_vertical: businessVertical, lines,
    };
    if (editId) await updateRule.mutateAsync({ id: editId, ...payload });
    else await createRule.mutateAsync(payload);
    setFormOpen(false); resetForm();
  };

  const addLine = () => setLines(prev => [...prev, { ...emptyLine(), line_order: prev.length + 1 }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: any) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === 'acct_code') {
        const acct = accounts.find(a => a.acct_code === value);
        updated.acct_name = acct?.acct_name || '';
      }
      return updated;
    }));
  };

  const handleTest = async (ruleId: string) => {
    const result = await testRule.mutateAsync({ ruleId });
    setTestResult(result); setTestOpen(true);
  };

  const docTypeLabel = (dt: string) => DOCUMENT_TYPES.find(d => d.value === dt)?.label || dt;
  const docTypeSAP = (dt: string) => DOCUMENT_TYPES.find(d => d.value === dt)?.sap || '';

  const filteredRules = rules.filter(r => {
    if (verticalFilter === 'all') return true;
    return (r as any).business_vertical === verticalFilter || (r as any).business_vertical === 'all' || !(r as any).business_vertical;
  });

  // PRD coverage check
  const coveredTypes = new Set(rules.map(r => r.document_type));
  const uncoveredTypes = DOCUMENT_TYPES.filter(dt => !coveredTypes.has(dt.value));

  // Sync stats
  const syncStats = {
    total: syncQueue.length,
    queued: syncQueue.filter((s: any) => s.status === 'QUEUED').length,
    synced: syncQueue.filter((s: any) => s.status === 'DONE').length,
    failed: syncQueue.filter((s: any) => s.status === 'FAILED').length,
    retry: syncQueue.filter((s: any) => s.status === 'RETRY').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">JE Mapping Engine</h1>
          <PageHelpTooltip content="Automated Journal Entry Engine. Define mapping rules for document types across Trading, Industrial, and Construction verticals." />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{rules.length}</p>
            <p className="text-xs text-muted-foreground">Total Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{rules.filter(r => r.is_active).length}</p>
            <p className="text-xs text-muted-foreground">{t('common.active')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{coveredTypes.size}</p>
            <p className="text-xs text-muted-foreground">Doc Types Covered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{uncoveredTypes.length}</p>
            <p className="text-xs text-muted-foreground">Not Covered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{postedJEs.length}</p>
            <p className="text-xs text-muted-foreground">Posted JEs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules"><ArrowUpDown className="h-3 w-3 mr-1" /> Mapping Rules</TabsTrigger>
          <TabsTrigger value="ledger"><LayoutList className="h-3 w-3 mr-1" /> JE Ledger</TabsTrigger>
          <TabsTrigger value="sync"><RefreshCw className="h-3 w-3 mr-1" /> SAP Sync Queue</TabsTrigger>
        </TabsList>

        {/* ============ MAPPING RULES TAB ============ */}
        <TabsContent value="rules">
          <div className="flex gap-2 mb-3 items-center">
            <Label className="text-sm">Vertical:</Label>
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUSINESS_VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>SAP Doc</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>{t('common.active')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && <p className="text-xs text-muted-foreground line-clamp-1">{rule.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{docTypeLabel(rule.document_type)}</Badge></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{docTypeSAP(rule.document_type)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {(rule as any).business_vertical || 'all'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {TRIGGER_TYPES.find(t => t.value === rule.trigger_on)?.label}
                        {rule.trigger_status && <span className="text-xs text-muted-foreground ml-1">({rule.trigger_status})</span>}
                      </TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        <Switch checked={rule.is_active} onCheckedChange={c => toggleActive.mutate({ id: rule.id, is_active: c })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button size="icon" variant="ghost" onClick={() => handleTest(rule.id)} title="Test Rule">
                            <PlayCircle className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => cloneRule.mutate(rule.id)} title="Clone">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(rule)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete?')) deleteRule.mutate(rule.id); }} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No mapping rules defined yet.</p>
                        <p className="text-xs mt-1">Click "New Rule" to create a mapping rule.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
              <CardDescription>All auto-generated journal entries from posted documents. Click a row to expand and view DR/CR lines.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <JELedgerExpandable postedJEs={postedJEs} docTypeLabel={docTypeLabel} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SAP SYNC QUEUE TAB ============ */}
        <TabsContent value="sync">
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{syncStats.queued}</p><p className="text-xs text-muted-foreground">Queued</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-primary">{syncStats.synced}</p><p className="text-xs text-muted-foreground">Done</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-destructive">{syncStats.failed}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{syncStats.retry}</p><p className="text-xs text-muted-foreground">Retry</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>SAP Sync Queue</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>JE Number</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Last Error</TableHead>
                    <TableHead>Queued At</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncQueue.map((sq: any) => (
                    <TableRow key={sq.id}>
                      <TableCell className="font-mono">{sq.finance_journal_entries?.je_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={sq.status === 'DONE' ? 'default' : sq.status === 'FAILED' ? 'destructive' : 'secondary'}>
                          {sq.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sq.attempt_count} / {sq.max_retries}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">{sq.last_error || '-'}</TableCell>
                      <TableCell className="text-sm">{new Date(sq.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {(sq.status === 'FAILED' || sq.status === 'RETRY') && (
                          <Button size="sm" variant="outline" onClick={() => retrySyncQueue.mutate(sq.id)}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {syncQueue.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No sync queue entries yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ============ RULE FORM DIALOG ============ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'New'} JE Mapping Rule</DialogTitle>
            <DialogDescription>Define how journal entries are automatically created for a document type.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AR Invoice → Revenue" />
            </div>
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label} ({dt.sap})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Business Vertical</Label>
              <Select value={businessVertical} onValueChange={setBusinessVertical}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={triggerOn} onValueChange={setTriggerOn}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trigger Status</Label>
              <Input value={triggerStatus} onChange={e => setTriggerStatus(e.target.value)} placeholder="e.g. POSTED" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} />
            </div>
            <div className="col-span-3 space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="PRD reference and what this rule does..." />
            </div>
          </div>

          {/* Lines */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Journal Entry Lines (Double-Entry)</h3>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>GL Account</TableHead>
                    <TableHead className="w-24">D/C</TableHead>
                    <TableHead>Amount Source</TableHead>
                    <TableHead className="w-20">%</TableHead>
                    <TableHead className="w-24">Fixed Amt</TableHead>
                    <TableHead>Tax Code</TableHead>
                    <TableHead>BP Source</TableHead>
                    <TableHead>Remarks Template</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Select value={line.acct_code} onValueChange={v => updateLine(idx, 'acct_code', v)}>
                          <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {accounts.map(a => <SelectItem key={a.acct_code} value={a.acct_code}>{a.acct_code} - {a.acct_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={line.entry_type} onValueChange={v => updateLine(idx, 'entry_type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Debit (DR)</SelectItem>
                            <SelectItem value="credit">Credit (CR)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={line.amount_source} onValueChange={v => updateLine(idx, 'amount_source', v)}>
                          <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AMOUNT_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={line.percentage ?? 100} onChange={e => updateLine(idx, 'percentage', Number(e.target.value))}
                          className="w-20" disabled={line.amount_source === 'fixed'} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={line.fixed_amount || ''} onChange={e => updateLine(idx, 'fixed_amount', Number(e.target.value))}
                          className="w-24" disabled={line.amount_source !== 'fixed'} placeholder="0.00" />
                      </TableCell>
                      <TableCell>
                        <Input value={line.tax_code || ''} onChange={e => updateLine(idx, 'tax_code', e.target.value)}
                          className="w-20" placeholder="VAT15" />
                      </TableCell>
                      <TableCell>
                        <Input value={line.bp_source || ''} onChange={e => updateLine(idx, 'bp_source', e.target.value)}
                          className="w-28" placeholder="customer_code" />
                      </TableCell>
                      <TableCell>
                        <Input value={line.remarks_template || ''} onChange={e => updateLine(idx, 'remarks_template', e.target.value)}
                          className="min-w-[140px]" placeholder="{doc_type} #{doc_num}" />
                      </TableCell>
                      <TableCell>
                        {lines.length > 1 && (
                          <Button size="icon" variant="ghost" onClick={() => removeLine(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-2 flex items-center gap-4 text-sm">
              <span>DR lines: <strong>{lines.filter(l => l.entry_type === 'debit').length}</strong></span>
              <span>CR lines: <strong>{lines.filter(l => l.entry_type === 'credit').length}</strong></span>
              <Badge variant={
                lines.filter(l => l.entry_type === 'debit').reduce((s, l) => s + (l.percentage || 100), 0) ===
                lines.filter(l => l.entry_type === 'credit').reduce((s, l) => s + (l.percentage || 100), 0) ? 'default' : 'destructive'
              }>
                {lines.filter(l => l.entry_type === 'debit').reduce((s, l) => s + (l.percentage || 100), 0) ===
                lines.filter(l => l.entry_type === 'credit').reduce((s, l) => s + (l.percentage || 100), 0) ? '✓ Balanced' : '⚠ Check Percentages'}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!name || !documentType || lines.some(l => !l.acct_code)}>
              {editId ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ TEST RESULT DIALOG ============ */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.status === 'success' ? (
                <><CheckCircle2 className="h-5 w-5 text-primary" /> Test Passed — JE Preview</>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-destructive" /> Test Warning</>
              )}
            </DialogTitle>
            <DialogDescription>
              Simulated JE using sample document total of 1,000.00 (PRD Section 9.1 — JE Preview)
            </DialogDescription>
          </DialogHeader>
          {testResult && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{testResult.message}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit (DR)</TableHead>
                    <TableHead className="text-right">Credit (CR)</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResult.lines?.map((l: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{l.acct_code}</TableCell>
                      <TableCell>{l.acct_name}</TableCell>
                      <TableCell className="text-right font-mono">{l.entry_type === 'debit' ? l.sample_amount.toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-right font-mono">{l.entry_type === 'credit' ? l.sample_amount.toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{AMOUNT_SOURCES.find(s => s.value === l.amount_source)?.label} ({l.percentage}%)</TableCell>
                      <TableCell className="text-xs">{l.tax_code || '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell colSpan={2}>{t('common.total')}</TableCell>
                    <TableCell className="text-right font-mono">{testResult.totalDebit?.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{testResult.totalCredit?.toFixed(2)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setTestOpen(false)}>{t('common.close')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
