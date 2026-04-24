import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Upload, FileSpreadsheet, FileText, Loader2, FileDown, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { exportToExcel, exportToPDF, importFromExcel, type ColumnDef } from '@/utils/exportImportUtils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExportImportButtonsProps {
  data: any[];
  columns: ColumnDef[];
  filename: string;
  title: string;
  onImport?: (rows: any[]) => Promise<void> | void;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  buttonClassName?: string;
}

export function ExportImportButtons({ data, columns, filename, title, onImport, buttonVariant = 'outline', buttonClassName }: ExportImportButtonsProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const isAr = language === 'ar';

  const handleDownloadTemplate = () => {
    const headers: Record<string, string> = {};
    columns.forEach(col => { headers[col.header] = ''; });
    const ws = XLSX.utils.json_to_sheet([headers]);
    // Set column widths
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${filename}-template-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({
      title: isAr ? 'تم تنزيل القالب' : 'Template Downloaded',
      description: isAr ? 'قم بملء البيانات ثم ارفع الملف' : 'Fill in the data then upload the file',
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    setImporting(true);
    try {
      const rows = await importFromExcel(file);
      await onImport(rows);
      toast({ title: isAr ? 'تم الاستيراد' : 'Import Complete', description: `${rows.length} ${isAr ? 'سجل' : 'records imported'}` });
      setImportDialogOpen(false);
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ في الاستيراد' : 'Import Error', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={buttonVariant} size="sm" className={`gap-1.5 ${buttonClassName || ''}`}>
            <Download className="h-4 w-4" />
            {isAr ? 'تصدير' : 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportToExcel(data, columns, filename)}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-primary" />
            {isAr ? 'تصدير Excel' : 'Export to Excel'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportToPDF(data, columns, filename, title)}>
            <FileText className="h-4 w-4 mr-2 text-destructive" />
            {isAr ? 'تصدير PDF' : 'Export to PDF'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onImport && (
        <>
          <Button variant={buttonVariant} size="sm" className={`gap-1.5 ${buttonClassName || ''}`} onClick={() => setImportDialogOpen(true)} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isAr ? 'استيراد' : 'Import'}
          </Button>

          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isAr ? `استيراد ${title}` : `Import ${title}`}</DialogTitle>
                <DialogDescription>
                  {isAr
                    ? 'قم بتنزيل القالب أولاً، ثم قم بملء البيانات وارفع الملف'
                    : 'Download the template first, fill in your data, then upload the file'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Step 1: Download Template */}
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleDownloadTemplate}>
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                    <FileDown className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{isAr ? 'الخطوة 1: تنزيل القالب' : 'Step 1: Download Template'}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAr
                        ? `ملف Excel يحتوي على ${columns.length} عمود جاهز للتعبئة`
                        : `Excel file with ${columns.length} columns ready to fill`}
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                {/* Step 2: Upload File */}
                <div
                  className="flex items-center gap-3 p-4 border rounded-lg border-dashed hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/50 shrink-0">
                    <Upload className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{isAr ? 'الخطوة 2: رفع الملف' : 'Step 2: Upload File'}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? 'اختر ملف Excel أو CSV' : 'Select your Excel or CSV file'}
                    </p>
                  </div>
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Column reference */}
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {isAr ? 'الأعمدة المتوقعة:' : 'Expected Columns:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {columns.map(col => (
                      <span key={col.key} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-muted font-medium">
                        {col.header}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
        </>
      )}
    </div>
  );
}
