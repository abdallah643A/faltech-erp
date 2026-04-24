import { useState, useRef, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Download, Upload, FileSpreadsheet, FileText, File, Search,
  CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowRight, Database,
  DollarSign, TrendingUp, ShoppingCart, Package, Users, FolderKanban, HardDrive, Activity,
} from 'lucide-react';
import { dtwModules, type DTWEntity, type DTWModule } from '@/config/dtwEntities';
import {
  generateTemplate, parseFile, autoMapColumns, validateRows, exportData,
  type ParsedFile, type ColumnMapping, type ValidationResult,
} from '@/utils/dtwEngine';

const moduleIcons: Record<string, React.ElementType> = {
  DollarSign, TrendingUp, ShoppingCart, Package, Users, FolderKanban, HardDrive, Activity,
};

type ImportStep = 'select' | 'upload' | 'mapping' | 'validate' | 'importing' | 'done';

export default function DataTransferWorkbench() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const isAr = language === 'ar';
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(dtwModules[0].id);

  // Import workflow state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('select');
  const [selectedEntity, setSelectedEntity] = useState<DTWEntity | null>(null);
  const [importMode, setImportMode] = useState<'insert' | 'upsert'>('insert');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ total: number; success: number; failed: number } | null>(null);

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'txt'>('xlsx');
  const [exportEntity, setExportEntity] = useState<DTWEntity | null>(null);
  const [exporting, setExporting] = useState(false);

  const filteredModules = useMemo(() => {
    if (!search) return dtwModules;
    const q = search.toLowerCase();
    return dtwModules.map(mod => ({
      ...mod,
      entities: mod.entities.filter(e =>
        e.label.toLowerCase().includes(q) || e.labelAr.includes(q) || e.id.includes(q)
      ),
    })).filter(m => m.entities.length > 0);
  }, [search]);

  // ─── Import Workflow ───────────────────────────────────────────

  function openImport(entity: DTWEntity) {
    setSelectedEntity(entity);
    setImportMode('insert');
    setParsedFile(null);
    setMappings([]);
    setValidationResult(null);
    setImportProgress(0);
    setImportStats(null);
    setImportStep('upload');
    setImportOpen(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedEntity) return;
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);
      const autoMapped = autoMapColumns(parsed.headers, selectedEntity.columns);
      setMappings(autoMapped);
      setImportStep('mapping');
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function updateMapping(fileHeader: string, entityKey: string) {
    if (!selectedEntity) return;
    setMappings(prev => prev.map(m => {
      if (m.fileHeader !== fileHeader) return m;
      const col = entityKey === '__none__' ? null : selectedEntity.columns.find(c => c.key === entityKey) ?? null;
      return { ...m, entityColumn: col };
    }));
  }

  function runValidation() {
    if (!parsedFile || !selectedEntity) return;
    const result = validateRows(parsedFile.rows, mappings, selectedEntity);
    setValidationResult(result);
    setImportStep('validate');
  }

  async function executeImport() {
    if (!selectedEntity || !validationResult) return;
    setImportStep('importing');
    const rows = validationResult.validRows;
    const batchSize = 50;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map(r => ({
        ...r,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }));

      try {
        if (importMode === 'upsert') {
          const { error } = await (supabase.from(selectedEntity.table as any).upsert(batch as any, { onConflict: selectedEntity.keyField }) as any);
          if (error) throw error;
        } else {
          const { error } = await (supabase.from(selectedEntity.table as any).insert(batch as any) as any);
          if (error) throw error;
        }
        success += batch.length;
      } catch {
        failed += batch.length;
      }

      setImportProgress(Math.round(((i + batch.length) / rows.length) * 100));
    }

    setImportStats({ total: rows.length, success, failed });
    setImportStep('done');
  }

  function closeImport() {
    setImportOpen(false);
    setImportStep('select');
  }

  // ─── Export Workflow ───────────────────────────────────────────

  function openExport(entity: DTWEntity) {
    setExportEntity(entity);
    setExportFormat('xlsx');
    setExportOpen(true);
  }

  async function executeExport() {
    if (!exportEntity) return;
    setExporting(true);
    try {
      let q = (supabase.from(exportEntity.table as any).select('*') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(10000);
      if (error) throw error;
      exportData(data || [], exportEntity, exportFormat);
      toast({ title: isAr ? 'تم التصدير' : 'Export Complete' });
      setExportOpen(false);
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────

  const renderEntityCard = (entity: DTWEntity) => (
    <Card key={entity.id} className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{isAr ? entity.labelAr : entity.label}</CardTitle>
          <Badge variant="secondary" className="text-xs">{entity.columns.length} {isAr ? 'عمود' : 'cols'}</Badge>
        </div>
        <CardDescription className="text-xs">{isAr ? entity.descriptionAr : entity.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => generateTemplate(entity, 'xlsx')}>
            <Download className="h-3 w-3" />
            {isAr ? 'قالب' : 'Template'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => openImport(entity)}>
            <Upload className="h-3 w-3" />
            {isAr ? 'استيراد' : 'Import'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => openExport(entity)}>
            <FileSpreadsheet className="h-3 w-3" />
            {isAr ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderModuleTab = (mod: DTWModule) => {
    const Icon = moduleIcons[mod.icon] || Database;
    return (
      <TabsTrigger key={mod.id} value={mod.id} className="gap-1.5 text-xs">
        <Icon className="h-3.5 w-3.5" />
        {isAr ? mod.labelAr : mod.label}
        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{mod.entities.length}</Badge>
      </TabsTrigger>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'ورشة نقل البيانات' : 'Data Transfer Workbench'}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'استيراد وتصدير البيانات الرئيسية والمعاملات' : 'Import & export master data and transactions across all modules'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isAr ? 'بحث عن كيان...' : 'Search entities...'}
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Module Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="flex w-max gap-1">
            {filteredModules.map(renderModuleTab)}
          </TabsList>
        </ScrollArea>

        {filteredModules.map(mod => (
          <TabsContent key={mod.id} value={mod.id} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {mod.entities.map(renderEntityCard)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ─── Import Dialog ─────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={v => { if (!v) closeImport(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {isAr ? 'استيراد' : 'Import'}: {selectedEntity && (isAr ? selectedEntity.labelAr : selectedEntity.label)}
            </DialogTitle>
            <DialogDescription>
              {importStep === 'upload' && (isAr ? 'ارفع ملف Excel أو CSV أو نص' : 'Upload an Excel, CSV, or text file')}
              {importStep === 'mapping' && (isAr ? 'ربط أعمدة الملف بحقول النظام' : 'Map file columns to system fields')}
              {importStep === 'validate' && (isAr ? 'مراجعة نتائج التحقق' : 'Review validation results')}
              {importStep === 'importing' && (isAr ? 'جاري الاستيراد...' : 'Importing records...')}
              {importStep === 'done' && (isAr ? 'اكتمل الاستيراد' : 'Import complete')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {/* Step: Upload */}
            {importStep === 'upload' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{isAr ? 'وضع الاستيراد' : 'Import Mode'}</Label>
                  <RadioGroup value={importMode} onValueChange={v => setImportMode(v as 'insert' | 'upsert')} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="insert" id="insert" />
                      <Label htmlFor="insert">{isAr ? 'إضافة فقط' : 'Insert Only'}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upsert" id="upsert" />
                      <Label htmlFor="upsert">{isAr ? 'إضافة وتحديث' : 'Insert + Update (Upsert)'}</Label>
                    </div>
                  </RadioGroup>
                  {importMode === 'upsert' && selectedEntity && (
                    <p className="text-xs text-muted-foreground">
                      {isAr ? 'سيتم المطابقة بـ' : 'Matching by'}: <Badge variant="outline">{selectedEntity.keyField}</Badge>
                    </p>
                  )}
                </div>

                <div
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">{isAr ? 'اضغط لاختيار ملف' : 'Click to select a file'}</p>
                  <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv, .txt</p>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFileSelect} />

                <Button variant="outline" size="sm" onClick={() => selectedEntity && generateTemplate(selectedEntity, 'xlsx')}>
                  <Download className="h-4 w-4 mr-1" />
                  {isAr ? 'تحميل القالب أولاً' : 'Download Template First'}
                </Button>
              </div>
            )}

            {/* Step: Mapping */}
            {importStep === 'mapping' && parsedFile && selectedEntity && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>{isAr ? 'ملف' : 'File'}: <Badge variant="outline">{parsedFile.fileName}</Badge></span>
                  <span>{parsedFile.rows.length} {isAr ? 'سجل' : 'rows'}</span>
                </div>

                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isAr ? 'عمود الملف' : 'File Column'}</TableHead>
                        <TableHead><ArrowRight className="h-4 w-4" /></TableHead>
                        <TableHead>{isAr ? 'حقل النظام' : 'System Field'}</TableHead>
                        <TableHead>{isAr ? 'نموذج' : 'Sample'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map(m => (
                        <TableRow key={m.fileHeader}>
                          <TableCell className="font-medium text-sm">{m.fileHeader}</TableCell>
                          <TableCell><ArrowRight className="h-3 w-3 text-muted-foreground" /></TableCell>
                          <TableCell>
                            <Select
                              value={m.entityColumn?.key || '__none__'}
                              onValueChange={v => updateMapping(m.fileHeader, v)}
                            >
                              <SelectTrigger className="w-48 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{isAr ? '— تخطي —' : '— Skip —'}</SelectItem>
                                {selectedEntity.columns.map(c => (
                                  <SelectItem key={c.key} value={c.key}>
                                    {c.header} {c.required ? '*' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                            {parsedFile.rows[0]?.[m.fileHeader] !== undefined ? String(parsedFile.rows[0][m.fileHeader]) : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Step: Validate */}
            {importStep === 'validate' && validationResult && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-lg font-bold">{validationResult.validRows.length}</p>
                        <p className="text-xs text-muted-foreground">{isAr ? 'صالح' : 'Valid'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="text-lg font-bold">{validationResult.errors.length}</p>
                        <p className="text-xs text-muted-foreground">{isAr ? 'أخطاء' : 'Errors'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-lg font-bold">{validationResult.warnings.length}</p>
                        <p className="text-xs text-muted-foreground">{isAr ? 'تحذيرات' : 'Warnings'}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Error list */}
                {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">{isAr ? 'صف' : 'Row'}</TableHead>
                          <TableHead>{isAr ? 'عمود' : 'Column'}</TableHead>
                          <TableHead>{isAr ? 'قيمة' : 'Value'}</TableHead>
                          <TableHead>{isAr ? 'رسالة' : 'Message'}</TableHead>
                          <TableHead className="w-20">{isAr ? 'نوع' : 'Type'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...validationResult.errors, ...validationResult.warnings].slice(0, 200).map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{e.row}</TableCell>
                            <TableCell className="text-xs font-medium">{e.column}</TableCell>
                            <TableCell className="text-xs max-w-24 truncate">{String(e.value ?? '')}</TableCell>
                            <TableCell className="text-xs">{e.message}</TableCell>
                            <TableCell>
                              <Badge variant={e.severity === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                                {e.severity}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Step: Importing */}
            {importStep === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-medium">{isAr ? 'جاري الاستيراد...' : 'Importing records...'}</p>
                <Progress value={importProgress} className="w-64" />
                <p className="text-sm text-muted-foreground">{importProgress}%</p>
              </div>
            )}

            {/* Step: Done */}
            {importStep === 'done' && importStats && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                <p className="text-lg font-bold">{isAr ? 'اكتمل الاستيراد' : 'Import Complete'}</p>
                <div className="flex gap-6 text-sm">
                  <span className="text-emerald-600 font-medium">{importStats.success} {isAr ? 'ناجح' : 'succeeded'}</span>
                  {importStats.failed > 0 && (
                    <span className="text-destructive font-medium">{importStats.failed} {isAr ? 'فشل' : 'failed'}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {importStep === 'mapping' && (
              <Button onClick={runValidation}>
                {isAr ? 'تحقق' : 'Validate'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {importStep === 'validate' && validationResult && validationResult.validRows.length > 0 && (
              <Button onClick={executeImport}>
                {isAr ? `استيراد ${validationResult.validRows.length} سجل` : `Import ${validationResult.validRows.length} Records`}
              </Button>
            )}
            {importStep === 'done' && (
              <Button onClick={closeImport}>{isAr ? 'إغلاق' : 'Close'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Export Dialog ─────────────────────────────────────── */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {isAr ? 'تصدير' : 'Export'}: {exportEntity && (isAr ? exportEntity.labelAr : exportEntity.label)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isAr ? 'صيغة الملف' : 'File Format'}</Label>
              <RadioGroup value={exportFormat} onValueChange={v => setExportFormat(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="xlsx" id="xlsx" />
                  <Label htmlFor="xlsx" className="flex items-center gap-1"><FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center gap-1"><FileText className="h-4 w-4 text-blue-600" /> CSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="txt" id="txt" />
                  <Label htmlFor="txt" className="flex items-center gap-1"><File className="h-4 w-4 text-gray-600" /> Text</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={executeExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              {isAr ? 'تصدير' : 'Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
