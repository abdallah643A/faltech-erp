import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuditBalanceSheet, useMultiCompanyBalanceSheet, BSLineResult, BSSectionResult, BSReportResult } from '@/hooks/useAuditBalanceSheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, Download, Printer, FileSpreadsheet, ChevronDown, ChevronRight, FileText, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

const fmt = (v: number) => {
  if (Math.abs(v) < 0.005) return '-';
  const abs = Math.abs(v);
  const formatted = new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
  return v < 0 ? `(${formatted})` : formatted;
};

function DrillDownRow({ line, isAr }: { line: BSLineResult; isAr: boolean }) {
  const [open, setOpen] = useState(false);
  const hasDetails = line.details.length > 0;

  return (
    <>
      <tr className="hover:bg-accent/30 transition-colors">
        <td className="py-1.5 px-4 text-xs">
          <div className="flex items-center gap-1 ps-6 cursor-pointer" onClick={() => hasDetails && setOpen(!open)}>
            {hasDetails && (open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />)}
            <span className="font-mono text-muted-foreground me-2">{line.order}.</span>
            {isAr ? line.label_ar : line.label_en}
          </div>
        </td>
        <td className={`py-1.5 px-4 text-xs text-end font-mono ${line.amount < 0 ? 'text-destructive' : ''}`}>
          {fmt(line.amount)}
        </td>
      </tr>
      {open && line.details.map((d, i) => (
        <tr key={i} className="bg-muted/20">
          <td className="py-1 px-4 text-[10px] text-muted-foreground">
            <div className="ps-12 flex items-center gap-2">
              <span className="font-mono">{d.acct_code}</span>
              <span>{d.acct_name}</span>
              {d.bp_name && <Badge variant="outline" className="text-[9px] h-4">{d.bp_name}</Badge>}
            </div>
          </td>
          <td className="py-1 px-4 text-[10px] text-end font-mono text-muted-foreground">
            {fmt(d.balance)}
          </td>
        </tr>
      ))}
    </>
  );
}

function SectionBlock({ section, isAr }: { section: BSSectionResult; isAr: boolean }) {
  return (
    <>
      {/* Section Header */}
      <tr className="bg-primary/5 border-t">
        <td colSpan={2} className="py-2 px-4 font-bold text-sm text-primary">
          {isAr ? section.header_ar : section.header_en}
        </td>
      </tr>
      {/* Line Items */}
      {section.lines.map(line => (
        <DrillDownRow key={line.order} line={line} isAr={isAr} />
      ))}
      {/* Section Total */}
      {section.total_label_ar && (
        <tr className="bg-muted/40 font-semibold border-t">
          <td className="py-1.5 px-4 text-xs ps-6">
            {isAr ? section.total_label_ar : section.total_label_en}
          </td>
          <td className={`py-1.5 px-4 text-xs text-end font-mono font-bold ${section.total_amount < 0 ? 'text-destructive' : ''}`}>
            {fmt(section.total_amount)}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditBalanceSheet() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [companyId, setCompanyId] = useState<string>(activeCompanyId || '');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [multiMode, setMultiMode] = useState(false);
  const [branchId, setBranchId] = useState<string>('');
  const [generated, setGenerated] = useState(false);
  const [appliedParams, setAppliedParams] = useState({ fromDate: '', toDate: '', companyId: '', companyIds: [] as string[], branchId: '' });

  const { data: companies = [] } = useQuery({
    queryKey: ['bs-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('sap_companies').select('id, company_name').eq('is_active', true);
      return data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['bs-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name').eq('is_active', true);
      return data || [];
    },
  });

  const handleGenerate = () => {
    setAppliedParams({ fromDate, toDate, companyId, companyIds: multiMode ? selectedCompanyIds : [companyId], branchId });
    setGenerated(true);
  };

  const companyNameMap: Record<string, string> = {};
  companies.forEach(c => { companyNameMap[c.id] = c.company_name; });

  const { data: report, isLoading } = useAuditBalanceSheet({
    fromDate: appliedParams.fromDate,
    toDate: appliedParams.toDate,
    companyId: (!multiMode && appliedParams.companyId) ? appliedParams.companyId : undefined,
    branchId: appliedParams.branchId || undefined,
  });

  const { data: multiReport, isLoading: multiLoading } = useMultiCompanyBalanceSheet({
    fromDate: appliedParams.fromDate,
    toDate: appliedParams.toDate,
    companyIds: multiMode ? appliedParams.companyIds : [],
    companyNames: companyNameMap,
    branchId: appliedParams.branchId || undefined,
  });

  const isMultiActive = multiMode && appliedParams.companyIds.length > 1;
  const activeLoading = isMultiActive ? multiLoading : isLoading;

  const companyName = companies.find(c => c.id === appliedParams.companyId)?.company_name || companies.find(c => c.id === companyId)?.company_name || 'Al-Rajhi Building and Construction Company';

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <title>${isAr ? 'تقرير الميزانية العمومية' : 'Audit Balance Sheet Report'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 10px; color: #333; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 8px; border-bottom: 1px solid #e5e5e5; }
          th { background: #1a365d; color: white; text-align: start; font-size: 10px; }
          .header { text-align: center; margin-bottom: 16px; }
          .header h1 { font-size: 16px; margin: 4px 0; }
          .header p { font-size: 11px; color: #666; margin: 2px 0; }
          .section-header { background: #f0f4ff; font-weight: bold; font-size: 11px; color: #1a365d; }
          .total-row { background: #f5f5f5; font-weight: bold; }
          .grand-total { background: #1a365d; color: white; font-weight: bold; font-size: 11px; }
          .amount { text-align: end; font-family: monospace; }
          .negative { color: #dc2626; }
          .indent { padding-inline-start: 24px; }
          .warning { background: #fef3c7; padding: 8px; border: 1px solid #f59e0b; margin-top: 8px; font-size: 11px; color: #92400e; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const toggleCompany = (cid: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]
    );
  };

  const handleExportExcel = () => {
    if (isMultiActive && multiReport) {
      const cNames = multiReport.companyReports.map(cr => cr.companyName);
      const header = [isAr ? 'القسم' : 'Section', isAr ? 'البند' : 'Line Item', ...cNames, isAr ? 'الإجمالي' : 'Total'];
      const rows: string[][] = [header];
      const templateReport = multiReport.companyReports[0]?.report;
      if (templateReport) {
        for (const section of templateReport.sections) {
          rows.push([isAr ? section.header_ar : section.header_en, '', ...cNames.map(() => ''), '']);
          for (const line of section.lines) {
            const amounts = multiReport.companyReports.map(cr => {
              const sec = cr.report.sections.find(s => s.key === section.key);
              const ln = sec?.lines.find(l => l.order === line.order);
              return ln?.amount || 0;
            });
            const total = amounts.reduce((s, a) => s + a, 0);
            rows.push(['', isAr ? line.label_ar : line.label_en, ...amounts.map(a => a.toFixed(2)), total.toFixed(2)]);
          }
          const secAmounts = multiReport.companyReports.map(cr => {
            const sec = cr.report.sections.find(s => s.key === section.key);
            return sec?.total_amount || 0;
          });
          const secTotal = secAmounts.reduce((s, a) => s + a, 0);
          rows.push([isAr ? section.total_label_ar : section.total_label_en, '', ...secAmounts.map(a => a.toFixed(2)), secTotal.toFixed(2)]);
        }
      }
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-balance-sheet-multi-${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (!report) return;
    const rows: string[][] = [
      [isAr ? 'القسم' : 'Section', isAr ? 'البند' : 'Line Item', isAr ? 'المبلغ' : 'Amount'],
    ];

    for (const section of report.sections) {
      rows.push([isAr ? section.header_ar : section.header_en, '', '']);
      for (const line of section.lines) {
        rows.push(['', isAr ? line.label_ar : line.label_en, line.amount.toFixed(2)]);
      }
      rows.push([isAr ? section.total_label_ar : section.total_label_en, '', section.total_amount.toFixed(2)]);
    }

    for (const gt of report.grandTotals) {
      rows.push([isAr ? gt.label_ar : gt.label_en, '', gt.amount.toFixed(2)]);
    }

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-balance-sheet-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group sections for display
  const assetSections = report?.sections.filter(s => s.key === 'non_current_assets' || s.key === 'current_assets') || [];
  const equitySections = report?.sections.filter(s => s.key === 'equity') || [];
  const liabilitySections = report?.sections.filter(s => s.key === 'non_current_liabilities' || s.key === 'current_liabilities') || [];

  const canGenerate = multiMode ? (selectedCompanyIds.length > 0 && !!fromDate && !!toDate) : (!!companyId && !!fromDate && !!toDate);

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isAr ? 'تقرير الميزانية العمومية التدقيقي' : 'Audit Balance Sheet Report'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'تقرير مفصل حسب تصنيف المراجعة' : 'Detailed report per audit classification'}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={multiMode} onCheckedChange={(v) => setMultiMode(!!v)} />
              {isAr ? 'شركات متعددة' : 'Multi-Company'}
            </label>
          </div>
          {!multiMode ? (
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue placeholder={isAr ? 'اختر الشركة' : 'Select Company'} />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex flex-wrap gap-1 items-center border rounded-md px-2 py-1 min-w-[200px] max-w-[400px] bg-background">
              {selectedCompanyIds.length === 0 && <span className="text-xs text-muted-foreground">{isAr ? 'اختر الشركات...' : 'Select companies...'}</span>}
              {selectedCompanyIds.map(cid => (
                <Badge key={cid} variant="secondary" className="text-[10px] gap-0.5 h-5">
                  {companyNameMap[cid] || cid}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleCompany(cid)} />
                </Badge>
              ))}
              <Select value="" onValueChange={(v) => { if (v) toggleCompany(v); }}>
                <SelectTrigger className="h-6 text-[10px] w-6 border-0 p-0 shadow-none">
                  <ChevronDown className="h-3 w-3" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id} disabled={selectedCompanyIds.includes(c.id)}>
                      <span className="flex items-center gap-2">
                        {selectedCompanyIds.includes(c.id) && <span className="text-primary">✓</span>}
                        {c.company_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs w-32" />
          <span className="text-xs text-muted-foreground">{isAr ? 'إلى' : 'to'}</span>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-xs w-32" />
          {branches.length > 0 && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder={isAr ? 'كل الفروع' : 'All Branches'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'كل الفروع' : 'All Branches'}</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate}>
            <FileText className="h-3.5 w-3.5 me-1" />{isAr ? 'إنشاء التقرير' : 'Generate Report'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isMultiActive ? !multiReport : !report}>
            <FileSpreadsheet className="h-3.5 w-3.5 me-1" />{isAr ? 'تصدير' : 'Export'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={isMultiActive ? !multiReport : !report}>
            <Printer className="h-3.5 w-3.5 me-1" />{isAr ? 'طباعة' : 'Print'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/bs-report-config')}>
            <Settings className="h-3.5 w-3.5 me-1" />{isAr ? 'إعدادات التقرير' : 'Report Config'}
          </Button>
        </div>
      </div>

      {/* Balance Warning */}
      {report && !report.isBalanced && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {isAr
            ? `تحذير: الميزانية غير متوازنة. الفرق = ${fmt(report.difference)} ريال`
            : `Warning: Balance sheet is not balanced. Difference = SAR ${fmt(report.difference)}`}
        </div>
      )}

      {!generated && !activeLoading && (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            {isAr ? 'حدد نطاق التاريخ ثم اضغط "إنشاء التقرير"' : 'Select a date range then click "Generate Report"'}
          </p>
        </Card>
      )}

      {activeLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {generated && isMultiActive && multiReport && (
        <Card className="overflow-hidden">
          <div ref={printRef}>
            <div className="header bg-gradient-to-b from-primary to-primary/90 px-6 py-4 text-center text-primary-foreground">
              <h1 className="text-lg font-bold">
                {isAr ? 'تقرير الميزانية العمومية - شركات متعددة' : 'Audit Balance Sheet - Multi-Company'}
              </h1>
              <h2 className="text-sm font-semibold mt-1">
                {multiReport.companyReports.map(cr => cr.companyName).join(' | ')}
              </h2>
              <p className="text-xs opacity-80 mt-1">
                {isAr ? 'من تاريخ' : 'From Date'}: {appliedParams.fromDate} &nbsp;&nbsp; {isAr ? 'إلى تاريخ' : 'To Date'}: {appliedParams.toDate}
              </p>
              <p className="text-[10px] opacity-60 mt-0.5">
                {isAr ? 'تاريخ الطباعة' : 'Print Date'}: {format(new Date(), 'dd/MM/yyyy')} &nbsp; {format(new Date(), 'hh:mm:ss a')}
              </p>
            </div>

            <MultiCompanyTable multiReport={multiReport} isAr={isAr} />
          </div>
        </Card>
      )}

      {generated && !isMultiActive && report && (
        <Card className="overflow-hidden">
          <div ref={printRef}>
            {/* Report Header */}
            <div className="header bg-gradient-to-b from-primary to-primary/90 px-6 py-4 text-center text-primary-foreground">
              <h1 className="text-lg font-bold">{companyName}</h1>
              <h2 className="text-sm font-semibold mt-1">
                {isAr ? 'تقرير الميزانية العمومية التدقيقي' : 'Audit Balance Sheet Report'}
              </h2>
              <p className="text-xs opacity-80 mt-1">
                {isAr ? 'من تاريخ' : 'From Date'}: {fromDate} &nbsp;&nbsp; {isAr ? 'إلى تاريخ' : 'To Date'}: {toDate}
              </p>
              <p className="text-[10px] opacity-60 mt-0.5">
                {isAr ? 'تاريخ الطباعة' : 'Print Date'}: {format(new Date(), 'dd/MM/yyyy')} &nbsp; {format(new Date(), 'hh:mm:ss a')}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="py-2 px-4 text-start text-xs font-semibold">{isAr ? 'البند' : 'Item'}</th>
                    <th className="py-2 px-4 text-end text-xs font-semibold w-[180px]">{isAr ? 'المبلغ (ريال)' : 'Amount (SAR)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* === ASSETS === */}
                  <tr className="bg-primary/10 border-t-2 border-primary">
                    <td colSpan={2} className="py-2 px-4 font-bold text-base text-primary">
                      {isAr ? 'الموجودات' : 'ASSETS'}
                    </td>
                  </tr>
                  {assetSections.map(s => (
                    <SectionBlock key={s.key} section={s} isAr={isAr} />
                  ))}
                  {/* Total Assets */}
                  <tr className="grand-total bg-primary text-primary-foreground font-bold border-t-2">
                    <td className="py-2 px-4 text-sm">
                      {isAr ? report.grandTotals[0]?.label_ar : report.grandTotals[0]?.label_en}
                    </td>
                    <td className="py-2 px-4 text-sm text-end font-mono">
                      {fmt(report.grandTotals[0]?.amount || 0)}
                    </td>
                  </tr>

                  {/* Spacer */}
                  <tr><td colSpan={2} className="py-2" /></tr>

                  {/* === EQUITY === */}
                  <tr className="bg-primary/10 border-t-2 border-primary">
                    <td colSpan={2} className="py-2 px-4 font-bold text-base text-primary">
                      {isAr ? 'حقوق الملكية والمطلوبات' : 'EQUITY & LIABILITIES'}
                    </td>
                  </tr>
                  {equitySections.map(s => (
                    <SectionBlock key={s.key} section={s} isAr={isAr} />
                  ))}
                  {/* Total Equity */}
                  <tr className="bg-muted font-bold border-t">
                    <td className="py-1.5 px-4 text-xs">
                      {isAr ? report.grandTotals[1]?.label_ar : report.grandTotals[1]?.label_en}
                    </td>
                    <td className={`py-1.5 px-4 text-xs text-end font-mono ${(report.grandTotals[1]?.amount || 0) < 0 ? 'text-destructive' : ''}`}>
                      {fmt(report.grandTotals[1]?.amount || 0)}
                    </td>
                  </tr>

                  {/* === LIABILITIES === */}
                  <tr className="bg-primary/10 border-t-2 border-primary">
                    <td colSpan={2} className="py-2 px-4 font-bold text-base text-primary">
                      {isAr ? 'المطلوبات' : 'LIABILITIES'}
                    </td>
                  </tr>
                  {liabilitySections.map(s => (
                    <SectionBlock key={s.key} section={s} isAr={isAr} />
                  ))}
                  {/* Total Liabilities */}
                  <tr className="bg-muted font-bold border-t">
                    <td className="py-1.5 px-4 text-xs">
                      {isAr ? report.grandTotals[2]?.label_ar : report.grandTotals[2]?.label_en}
                    </td>
                    <td className={`py-1.5 px-4 text-xs text-end font-mono ${(report.grandTotals[2]?.amount || 0) < 0 ? 'text-destructive' : ''}`}>
                      {fmt(report.grandTotals[2]?.amount || 0)}
                    </td>
                  </tr>

                  {/* Grand Total: Equity + Liabilities */}
                  <tr className="grand-total bg-primary text-primary-foreground font-bold border-t-2">
                    <td className="py-2 px-4 text-sm">
                      {isAr ? report.grandTotals[3]?.label_ar : report.grandTotals[3]?.label_en}
                    </td>
                    <td className="py-2 px-4 text-sm text-end font-mono">
                      {fmt(report.grandTotals[3]?.amount || 0)}
                    </td>
                  </tr>

                  {/* Balance Check */}
                  <tr className={`border-t-2 ${report.isBalanced ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-destructive/10'}`}>
                    <td className="py-2 px-4 text-xs font-semibold flex items-center gap-2">
                      {report.isBalanced ? '✓' : '⚠'}
                      {isAr ? 'التحقق من التوازن' : 'Balance Check'}
                    </td>
                    <td className={`py-2 px-4 text-xs text-end font-mono font-bold ${report.isBalanced ? 'text-emerald-600' : 'text-destructive'}`}>
                      {report.isBalanced
                        ? (isAr ? 'متوازن' : 'Balanced')
                        : `${isAr ? 'فرق' : 'Diff'}: ${fmt(report.difference)}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ====== Multi-Company Columnar Table ====== */
function MultiCompanyTable({ multiReport, isAr }: { multiReport: { companyReports: { companyId: string; companyName: string; report: BSReportResult }[] }; isAr: boolean }) {
  const reports = multiReport.companyReports;
  const templateReport = reports[0]?.report;
  if (!templateReport) return null;

  const colCount = reports.length + 2; // item + companies + total

  const renderSectionGroup = (title: string, sectionKeys: string[]) => {
    const sections = templateReport.sections.filter(s => sectionKeys.includes(s.key));
    if (sections.length === 0) return null;

    return (
      <>
        <tr className="bg-primary/10 border-t-2 border-primary">
          <td colSpan={colCount} className="py-2 px-4 font-bold text-base text-primary">{title}</td>
        </tr>
        {sections.map(section => (
          <MultiSectionBlock key={section.key} sectionKey={section.key} template={section} reports={reports} isAr={isAr} />
        ))}
      </>
    );
  };

  // Grand totals
  const grandTotalRows = templateReport.grandTotals.map(gt => {
    const amounts = reports.map(cr => cr.report.grandTotals.find(g => g.key === gt.key)?.amount || 0);
    const total = amounts.reduce((s, a) => s + a, 0);
    return { ...gt, amounts, total };
  });

  const totalAssetsRow = grandTotalRows.find(r => r.key === 'total_assets');
  const totalEquityRow = grandTotalRows.find(r => r.key === 'total_equity');
  const totalLiabRow = grandTotalRows.find(r => r.key === 'total_liabilities');
  const totalEqLiabRow = grandTotalRows.find(r => r.key === 'total_equity_and_liabilities');

  const renderGrandTotal = (row: typeof grandTotalRows[0] | undefined, isPrimary = false) => {
    if (!row) return null;
    return (
      <tr className={isPrimary ? 'bg-primary text-primary-foreground font-bold border-t-2' : 'bg-muted font-bold border-t'}>
        <td className={`py-2 px-4 ${isPrimary ? 'text-sm' : 'text-xs'}`}>{isAr ? row.label_ar : row.label_en}</td>
        {row.amounts.map((a, i) => (
          <td key={i} className={`py-2 px-4 text-end font-mono ${isPrimary ? 'text-sm' : 'text-xs'} ${a < 0 ? 'text-destructive' : ''}`}>{fmt(a)}</td>
        ))}
        <td className={`py-2 px-4 text-end font-mono font-bold ${isPrimary ? 'text-sm' : 'text-xs'} ${row.total < 0 ? 'text-destructive' : ''}`}>{fmt(row.total)}</td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="py-2 px-4 text-start text-xs font-semibold">{isAr ? 'البند' : 'Item'}</th>
            {reports.map(cr => (
              <th key={cr.companyId} className="py-2 px-4 text-end text-xs font-semibold min-w-[140px]">{cr.companyName}</th>
            ))}
            <th className="py-2 px-4 text-end text-xs font-semibold min-w-[140px] bg-primary/5">{isAr ? 'الإجمالي' : 'Total'}</th>
          </tr>
        </thead>
        <tbody>
          {renderSectionGroup(isAr ? 'الموجودات' : 'ASSETS', ['non_current_assets', 'current_assets'])}
          {renderGrandTotal(totalAssetsRow, true)}

          <tr><td colSpan={colCount} className="py-2" /></tr>

          {renderSectionGroup(isAr ? 'حقوق الملكية والمطلوبات' : 'EQUITY & LIABILITIES', ['equity'])}
          {renderGrandTotal(totalEquityRow)}

          {renderSectionGroup(isAr ? 'المطلوبات' : 'LIABILITIES', ['non_current_liabilities', 'current_liabilities'])}
          {renderGrandTotal(totalLiabRow)}

          {renderGrandTotal(totalEqLiabRow, true)}

          {/* Balance Check per company */}
          <tr className="border-t-2 bg-muted/30">
            <td className="py-2 px-4 text-xs font-semibold">{isAr ? 'التحقق من التوازن' : 'Balance Check'}</td>
            {reports.map(cr => {
              const bal = cr.report.isBalanced;
              return (
                <td key={cr.companyId} className={`py-2 px-4 text-xs text-end font-mono font-bold ${bal ? 'text-emerald-600' : 'text-destructive'}`}>
                  {bal ? (isAr ? 'متوازن' : 'Balanced') : `${isAr ? 'فرق' : 'Diff'}: ${fmt(cr.report.difference)}`}
                </td>
              );
            })}
            <td className="py-2 px-4 text-xs text-end font-mono">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MultiSectionBlock({ sectionKey, template, reports, isAr }: {
  sectionKey: string;
  template: BSSectionResult;
  reports: { companyId: string; companyName: string; report: BSReportResult }[];
  isAr: boolean;
}) {
  const colCount = reports.length + 2;
  return (
    <>
      <tr className="bg-primary/5 border-t">
        <td colSpan={colCount} className="py-2 px-4 font-bold text-sm text-primary">
          {isAr ? template.header_ar : template.header_en}
        </td>
      </tr>
      {template.lines.map(line => {
        const amounts = reports.map(cr => {
          const sec = cr.report.sections.find(s => s.key === sectionKey);
          return sec?.lines.find(l => l.order === line.order)?.amount || 0;
        });
        const total = amounts.reduce((s, a) => s + a, 0);
        return (
          <tr key={line.order} className="hover:bg-accent/30 transition-colors">
            <td className="py-1.5 px-4 text-xs">
              <div className="ps-6">
                <span className="font-mono text-muted-foreground me-2">{line.order}.</span>
                {isAr ? line.label_ar : line.label_en}
              </div>
            </td>
            {amounts.map((a, i) => (
              <td key={i} className={`py-1.5 px-4 text-xs text-end font-mono ${a < 0 ? 'text-destructive' : ''}`}>{fmt(a)}</td>
            ))}
            <td className={`py-1.5 px-4 text-xs text-end font-mono font-semibold bg-primary/5 ${total < 0 ? 'text-destructive' : ''}`}>{fmt(total)}</td>
          </tr>
        );
      })}
      {template.total_label_ar && (() => {
        const secAmounts = reports.map(cr => {
          const sec = cr.report.sections.find(s => s.key === sectionKey);
          return sec?.total_amount || 0;
        });
        const secTotal = secAmounts.reduce((s, a) => s + a, 0);
        return (
          <tr className="bg-muted/40 font-semibold border-t">
            <td className="py-1.5 px-4 text-xs ps-6">{isAr ? template.total_label_ar : template.total_label_en}</td>
            {secAmounts.map((a, i) => (
              <td key={i} className={`py-1.5 px-4 text-xs text-end font-mono font-bold ${a < 0 ? 'text-destructive' : ''}`}>{fmt(a)}</td>
            ))}
            <td className={`py-1.5 px-4 text-xs text-end font-mono font-bold bg-primary/5 ${secTotal < 0 ? 'text-destructive' : ''}`}>{fmt(secTotal)}</td>
          </tr>
        );
      })()}
    </>
  );
}
