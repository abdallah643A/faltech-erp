import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useBSReportConfig, DBLineAccount, DBSection, DBLine } from '@/hooks/useBSReportConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText, Settings, ChevronDown, ChevronRight, Plus, Trash2, Save, Download, AlertTriangle, CheckCircle, Loader2, Info, Pencil,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function BSReportConfig() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompanyId } = useActiveCompany();

  const {
    sections, lines, accounts, grandTotals,
    hasDBConfig, isLoading,
    seedFromDefaults, updateLineAccount, addLineAccount, deleteLineAccount,
    updateLine, updateSection, clearConfig,
  } = useBSReportConfig();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [editingAccount, setEditingAccount] = useState<DBLineAccount | null>(null);
  const [showAddAccount, setShowAddAccount] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({ acct_from: '', acct_to: '', label_ar: '', balance_rule: 'all', is_deduction: false });
  const [editingSection, setEditingSection] = useState<DBSection | null>(null);
  const [editingLine, setEditingLine] = useState<DBLine | null>(null);

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedSections(next);
  };

  const toggleLine = (id: string) => {
    const next = new Set(expandedLines);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedLines(next);
  };

  const handleSaveAccount = () => {
    if (!editingAccount) return;
    updateLineAccount.mutate({
      id: editingAccount.id,
      data: {
        acct_from: editingAccount.acct_from,
        acct_to: editingAccount.acct_to || null,
        label_ar: editingAccount.label_ar,
        balance_rule: editingAccount.balance_rule,
        is_deduction: editingAccount.is_deduction,
      },
    });
    setEditingAccount(null);
  };

  const handleAddAccount = () => {
    if (!showAddAccount || !newAccount.acct_from) return;
    addLineAccount.mutate({
      line_id: showAddAccount,
      acct_from: newAccount.acct_from,
      acct_to: newAccount.acct_to || null,
      label_ar: newAccount.label_ar,
      balance_rule: newAccount.balance_rule,
      is_deduction: newAccount.is_deduction,
      display_order: accounts.filter(a => a.line_id === showAddAccount).length,
    } as any);
    setShowAddAccount(null);
    setNewAccount({ acct_from: '', acct_to: '', label_ar: '', balance_rule: 'all', is_deduction: false });
  };

  const handleSaveSection = () => {
    if (!editingSection) return;
    updateSection.mutate({
      id: editingSection.id,
      data: {
        header_ar: editingSection.header_ar,
        header_en: editingSection.header_en,
        total_label_ar: editingSection.total_label_ar,
        total_label_en: editingSection.total_label_en,
      },
    });
    setEditingSection(null);
  };

  const handleSaveLine = () => {
    if (!editingLine) return;
    updateLine.mutate({
      id: editingLine.id,
      data: {
        label_ar: editingLine.label_ar,
        label_en: editingLine.label_en,
        line_order: editingLine.line_order,
      },
    });
    setEditingLine(null);
  };

  const ruleLabel = (rule: string) => {
    switch (rule) {
      case 'debit_only': return isAr ? 'مدين فقط' : 'Debit Only';
      case 'credit_only': return isAr ? 'دائن فقط' : 'Credit Only';
      default: return isAr ? 'الكل' : 'All';
    }
  };

  const ruleBadgeColor = (rule: string) => {
    switch (rule) {
      case 'debit_only': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'credit_only': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {isAr ? 'إعدادات الميزانية العمومية التدقيقية' : 'Audit Balance Sheet Configuration'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? 'تعريف ربط الحسابات بأقسام وبنود تقرير الميزانية العمومية - أي تعديل هنا ينعكس على التقرير'
              : 'Define how GL accounts map to balance sheet sections and line items — edits here drive the report'}
          </p>
        </div>
        <div className="flex gap-2">
          {hasDBConfig && (
            <Button variant="destructive" size="sm" onClick={() => clearConfig.mutate()} disabled={clearConfig.isPending}>
              <Trash2 className="h-4 w-4 mr-1" />
              {isAr ? 'مسح الإعدادات' : 'Clear Config'}
            </Button>
          )}
          {!hasDBConfig && (
            <Button size="sm" onClick={() => seedFromDefaults.mutate()} disabled={seedFromDefaults.isPending}>
              {seedFromDefaults.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Download className="h-4 w-4 mr-1" />
              {isAr ? 'تحميل الإعدادات الافتراضية' : 'Load Default Mapping'}
            </Button>
          )}
        </div>
      </div>

      {/* Concept explanation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">
                {isAr ? 'كيف يعمل تقرير الميزانية العمومية التدقيقية' : 'How the Audit Balance Sheet Report Works'}
              </p>
              <p className="text-muted-foreground">
                {isAr
                  ? 'يتم تقسيم التقرير إلى أقسام (مثل الموجودات غير المتداولة، حقوق الملكية). كل قسم يحتوي على بنود (مثل ممتلكات وآلات). كل بند مربوط بنطاقات حسابات محددة من دليل الحسابات مع قاعدة رصيد (الكل / مدين فقط / دائن فقط). عند إنشاء التقرير، يتم جمع أرصدة الحسابات المطابقة لكل بند.'
                  : 'The report is organized into Sections (e.g. Non-Current Assets, Equity). Each section contains Line Items (e.g. Property, Plant & Equipment). Each line item is mapped to one or more GL Account Ranges from the Chart of Accounts, with a Balance Rule (All / Debit Only / Credit Only). When the report runs, it sums journal entry balances matching each line\'s account ranges.'}
              </p>
              <div className="flex gap-4 mt-2">
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {isAr ? `${sections.length} قسم` : `${sections.length} Sections`}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {isAr ? `${lines.length} بند` : `${lines.length} Line Items`}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {isAr ? `${accounts.length} نطاق حساب` : `${accounts.length} Account Ranges`}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasDBConfig ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
            <p className="text-lg font-semibold mb-1">
              {isAr ? 'لم يتم تحميل الإعدادات بعد' : 'No Configuration Loaded'}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              {isAr
                ? 'التقرير يستخدم حالياً الإعدادات الافتراضية المضمنة. اضغط "تحميل الإعدادات الافتراضية" لنسخها إلى قاعدة البيانات حتى تتمكن من تعديلها.'
                : 'The report currently uses the built-in default mapping. Click "Load Default Mapping" to copy it to the database so you can edit it.'}
            </p>
            <Button onClick={() => seedFromDefaults.mutate()} disabled={seedFromDefaults.isPending}>
              {seedFromDefaults.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Download className="h-4 w-4 mr-1" />
              {isAr ? 'تحميل الإعدادات الافتراضية' : 'Load Default Mapping'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map(section => {
            const sectionLines = lines.filter(l => l.section_id === section.id);
            const isExpanded = expandedSections.has(section.id);

            return (
              <Card key={section.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/50 py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <CardTitle className="text-sm font-semibold">
                            {isAr ? section.header_ar : section.header_en}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">{section.section_key}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {sectionLines.length} {isAr ? 'بند' : 'lines'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingSection({ ...section }); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4">
                      {/* Section total labels */}
                      {section.total_label_ar && (
                        <div className="flex gap-2 mb-3 text-xs text-muted-foreground">
                          <span>{isAr ? 'إجمالي القسم' : 'Section Total'}:</span>
                          <span className="font-medium">{isAr ? section.total_label_ar : section.total_label_en}</span>
                        </div>
                      )}

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead>{isAr ? 'البند (عربي)' : 'Line (Arabic)'}</TableHead>
                            <TableHead>{isAr ? 'البند (إنجليزي)' : 'Line (English)'}</TableHead>
                            <TableHead className="text-center">{isAr ? 'نطاقات الحسابات' : 'Account Ranges'}</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sectionLines.map(line => {
                            const lineAccounts = accounts.filter(a => a.line_id === line.id);
                            const lineExpanded = expandedLines.has(line.id);

                            return (
                              <>
                                <TableRow key={line.id} className="cursor-pointer hover:bg-accent/30" onClick={() => toggleLine(line.id)}>
                                  <TableCell className="text-xs font-mono">{line.line_order}</TableCell>
                                  <TableCell className="text-xs font-medium">{line.label_ar}</TableCell>
                                  <TableCell className="text-xs">{line.label_en}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className="text-xs">
                                      {lineAccounts.length} {isAr ? 'نطاق' : 'ranges'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setEditingLine({ ...line }); }}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      {lineExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </div>
                                  </TableCell>
                                </TableRow>

                                {lineExpanded && (
                                  <TableRow key={`${line.id}-accounts`}>
                                    <TableCell colSpan={5} className="bg-muted/30 p-0">
                                      <div className="px-6 py-2">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="text-xs">{isAr ? 'من حساب' : 'From Account'}</TableHead>
                                              <TableHead className="text-xs">{isAr ? 'إلى حساب' : 'To Account'}</TableHead>
                                              <TableHead className="text-xs">{isAr ? 'الوصف' : 'Label'}</TableHead>
                                              <TableHead className="text-xs">{isAr ? 'قاعدة الرصيد' : 'Balance Rule'}</TableHead>
                                              <TableHead className="text-xs text-center">{isAr ? 'خصم' : 'Deduction'}</TableHead>
                                              <TableHead className="w-[80px]"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {lineAccounts.map(acc => (
                                              <TableRow key={acc.id}>
                                                <TableCell className="font-mono text-xs">{acc.acct_from}</TableCell>
                                                <TableCell className="font-mono text-xs">{acc.acct_to || '-'}</TableCell>
                                                <TableCell className="text-xs">{acc.label_ar}</TableCell>
                                                <TableCell>
                                                  <Badge variant="outline" className={`text-xs ${ruleBadgeColor(acc.balance_rule)}`}>
                                                    {ruleLabel(acc.balance_rule)}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  {acc.is_deduction && <CheckCircle className="h-3.5 w-3.5 text-destructive mx-auto" />}
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingAccount({ ...acc }); }}>
                                                      <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteLineAccount.mutate(acc.id); }}>
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                        <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); setShowAddAccount(line.id); }}>
                                          <Plus className="h-3 w-3 mr-1" /> {isAr ? 'إضافة نطاق حساب' : 'Add Account Range'}
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}

          {/* Grand Totals */}
          {grandTotals.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{isAr ? 'الإجماليات الكبرى' : 'Grand Totals'}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{isAr ? 'المفتاح' : 'Key'}</TableHead>
                      <TableHead className="text-xs">{isAr ? 'العنوان (عربي)' : 'Label (Arabic)'}</TableHead>
                      <TableHead className="text-xs">{isAr ? 'العنوان (إنجليزي)' : 'Label (English)'}</TableHead>
                      <TableHead className="text-xs">{isAr ? 'مجموع الأقسام' : 'Sum of Sections'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grandTotals.map(gt => (
                      <TableRow key={gt.id}>
                        <TableCell className="font-mono text-xs">{gt.total_key}</TableCell>
                        <TableCell className="text-xs">{gt.label_ar}</TableCell>
                        <TableCell className="text-xs">{gt.label_en}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {gt.sum_section_keys.map(k => (
                              <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل نطاق الحساب' : 'Edit Account Range'}</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">{isAr ? 'من حساب' : 'From Account'}</label>
                  <Input value={editingAccount.acct_from} onChange={e => setEditingAccount({ ...editingAccount, acct_from: e.target.value })} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs font-medium">{isAr ? 'إلى حساب' : 'To Account'}</label>
                  <Input value={editingAccount.acct_to || ''} onChange={e => setEditingAccount({ ...editingAccount, acct_to: e.target.value || null })} className="h-8 text-xs font-mono" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'الوصف' : 'Label (Arabic)'}</label>
                <Input value={editingAccount.label_ar} onChange={e => setEditingAccount({ ...editingAccount, label_ar: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'قاعدة الرصيد' : 'Balance Rule'}</label>
                <Select value={editingAccount.balance_rule} onValueChange={v => setEditingAccount({ ...editingAccount, balance_rule: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="debit_only">{isAr ? 'مدين فقط' : 'Debit Only'}</SelectItem>
                    <SelectItem value="credit_only">{isAr ? 'دائن فقط' : 'Credit Only'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingAccount.is_deduction} onCheckedChange={v => setEditingAccount({ ...editingAccount, is_deduction: v })} />
                <label className="text-xs">{isAr ? 'هذا خصم (مخصص/استقطاع)' : 'This is a deduction (provision/allowance)'}</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAccount(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveAccount} disabled={updateLineAccount.isPending}>
              <Save className="h-4 w-4 mr-1" /> {isAr ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={!!showAddAccount} onOpenChange={() => setShowAddAccount(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isAr ? 'إضافة نطاق حساب' : 'Add Account Range'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">{isAr ? 'من حساب' : 'From Account'}</label>
                <Input value={newAccount.acct_from} onChange={e => setNewAccount({ ...newAccount, acct_from: e.target.value })} className="h-8 text-xs font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'إلى حساب' : 'To Account'}</label>
                <Input value={newAccount.acct_to} onChange={e => setNewAccount({ ...newAccount, acct_to: e.target.value })} className="h-8 text-xs font-mono" placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">{isAr ? 'الوصف' : 'Label (Arabic)'}</label>
              <Input value={newAccount.label_ar} onChange={e => setNewAccount({ ...newAccount, label_ar: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium">{isAr ? 'قاعدة الرصيد' : 'Balance Rule'}</label>
              <Select value={newAccount.balance_rule} onValueChange={v => setNewAccount({ ...newAccount, balance_rule: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="debit_only">{isAr ? 'مدين فقط' : 'Debit Only'}</SelectItem>
                  <SelectItem value="credit_only">{isAr ? 'دائن فقط' : 'Credit Only'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newAccount.is_deduction} onCheckedChange={v => setNewAccount({ ...newAccount, is_deduction: v })} />
              <label className="text-xs">{isAr ? 'هذا خصم (مخصص/استقطاع)' : 'This is a deduction (provision/allowance)'}</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccount(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleAddAccount} disabled={!newAccount.acct_from || addLineAccount.isPending}>
              <Plus className="h-4 w-4 mr-1" /> {isAr ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل القسم' : 'Edit Section'}</DialogTitle>
          </DialogHeader>
          {editingSection && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">{isAr ? 'العنوان (عربي)' : 'Header (Arabic)'}</label>
                <Input value={editingSection.header_ar} onChange={e => setEditingSection({ ...editingSection, header_ar: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'العنوان (إنجليزي)' : 'Header (English)'}</label>
                <Input value={editingSection.header_en} onChange={e => setEditingSection({ ...editingSection, header_en: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'إجمالي القسم (عربي)' : 'Section Total Label (Arabic)'}</label>
                <Input value={editingSection.total_label_ar || ''} onChange={e => setEditingSection({ ...editingSection, total_label_ar: e.target.value || null })} className="h-8 text-xs" placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'إجمالي القسم (إنجليزي)' : 'Section Total Label (English)'}</label>
                <Input value={editingSection.total_label_en || ''} onChange={e => setEditingSection({ ...editingSection, total_label_en: e.target.value || null })} className="h-8 text-xs" placeholder="Optional" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveSection} disabled={updateSection.isPending}>
              <Save className="h-4 w-4 mr-1" /> {isAr ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Line Dialog */}
      <Dialog open={!!editingLine} onOpenChange={() => setEditingLine(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تعديل البند' : 'Edit Line Item'}</DialogTitle>
          </DialogHeader>
          {editingLine && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">{isAr ? 'الترتيب' : 'Order'}</label>
                <Input type="number" value={editingLine.line_order} onChange={e => setEditingLine({ ...editingLine, line_order: Number(e.target.value) })} className="h-8 text-xs w-24" />
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'البند (عربي)' : 'Label (Arabic)'}</label>
                <Input value={editingLine.label_ar} onChange={e => setEditingLine({ ...editingLine, label_ar: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium">{isAr ? 'البند (إنجليزي)' : 'Label (English)'}</label>
                <Input value={editingLine.label_en} onChange={e => setEditingLine({ ...editingLine, label_en: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLine(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveLine} disabled={updateLine.isPending}>
              <Save className="h-4 w-4 mr-1" /> {isAr ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
