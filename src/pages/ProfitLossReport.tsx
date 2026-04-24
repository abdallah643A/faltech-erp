import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, FileText, MessageSquare } from 'lucide-react';
import { PLFilterBar, type PLFilters } from '@/components/finance/pl/PLFilterBar';
import { PLKPICards } from '@/components/finance/pl/PLKPICards';
import { PLCharts } from '@/components/finance/pl/PLCharts';
import { PLStatementTable } from '@/components/finance/pl/PLStatementTable';
import { PLMonthlyView } from '@/components/finance/pl/PLMonthlyView';
import { PLDrillDownDialog } from '@/components/finance/pl/PLDrillDownDialog';
import { PLNoteDialog } from '@/components/finance/pl/PLNoteDialog';
import { useProfitLossData, usePLMonthlyData } from '@/hooks/useProfitLossData';
import { useDefaultReportCompanyIds } from '@/hooks/useDefaultReportCompanyIds';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatSAR } from '@/lib/currency';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();

export default function ProfitLossReport() {
  const [filters, setFilters] = useState<PLFilters>({
    companyIds: [], dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
    compareDateFrom: '', compareDateTo: '', comparisonMode: 'none', branchId: '',
    costCenter: '', projectCode: '', departmentId: '', fiscalYear: String(currentYear),
    includeUnposted: false, viewMode: 'summary',
  });
  const [generated, setGenerated] = useState(false);
  const [drillDown, setDrillDown] = useState<{ open: boolean; acctCode: string; acctName: string }>({ open: false, acctCode: '', acctName: '' });
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; sectionKey: string; lineLabel: string }>({ open: false, sectionKey: '', lineLabel: '' });
  useDefaultReportCompanyIds(setFilters);

  const showComparison = filters.comparisonMode !== 'none' && filters.comparisonMode !== 'budget';
  const showBudget = filters.comparisonMode === 'budget';

  const { sections, isLoading } = useProfitLossData({
    companyIds: filters.companyIds, dateFrom: filters.dateFrom, dateTo: filters.dateTo,
    compareDateFrom: showComparison ? filters.compareDateFrom : undefined,
    compareDateTo: showComparison ? filters.compareDateTo : undefined,
    branchId: filters.branchId || undefined, costCenter: filters.costCenter || undefined,
    projectCode: filters.projectCode || undefined, includeUnposted: filters.includeUnposted,
  }, generated);

  const { data: monthlyData } = usePLMonthlyData({
    companyIds: filters.companyIds, dateFrom: filters.dateFrom, dateTo: filters.dateTo,
    branchId: filters.branchId || undefined, costCenter: filters.costCenter || undefined,
    projectCode: filters.projectCode || undefined,
  }, generated && (filters.viewMode === 'monthly' || filters.viewMode === 'summary'));

  const handleGenerate = () => setGenerated(true);

  const handleDrillDown = useCallback((acctCode: string, acctName: string) => {
    setDrillDown({ open: true, acctCode, acctName });
  }, []);

  const handleAddNote = useCallback((sectionKey: string, lineLabel: string) => {
    setNoteDialog({ open: true, sectionKey, lineLabel });
  }, []);

  const exportExcel = () => {
    const rows = sections.map(s => ({
      'Description': s.label,
      'Amount (SAR)': s.amount,
      ...(showComparison ? { 'Prior Period': s.compareAmount, 'Variance': s.amount - s.compareAmount } : {}),
      ...(showBudget ? { 'Budget': s.budgetAmount, 'Variance': s.amount - s.budgetAmount } : {}),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'P&L');
    XLSX.writeFile(wb, `PnL_${filters.dateFrom}_${filters.dateTo}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Profit & Loss Statement', 14, 20);
    doc.setFontSize(9);
    doc.text(`Period: ${filters.dateFrom} to ${filters.dateTo}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 33);

    const rows = sections.map(s => {
      const row = [s.label, formatSAR(s.amount)];
      if (showComparison || showBudget) {
        const cmp = showBudget ? s.budgetAmount : s.compareAmount;
        row.push(formatSAR(cmp), formatSAR(s.amount - cmp));
      }
      return row;
    });
    const head = ['Description', 'Amount (SAR)'];
    if (showComparison || showBudget) head.push(showBudget ? 'Budget' : 'Prior Period', 'Variance');

    autoTable(doc, { head: [head], body: rows, startY: 38, styles: { fontSize: 8 }, headStyles: { fillColor: [59, 130, 246] } });
    doc.save(`PnL_${filters.dateFrom}_${filters.dateTo}.pdf`);
  };

  const comparisonLabel = filters.comparisonMode === 'same_period_last_year' ? 'Prior Year'
    : filters.comparisonMode === 'previous_period' ? 'Prior Period'
    : filters.comparisonMode === 'ytd' ? 'YTD' : filters.comparisonMode === 'qtd' ? 'QTD' : 'Comparison';

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />Profit & Loss Report
          </h1>
          <p className="text-xs text-muted-foreground">Enterprise P&L statement with drill-down and comparisons</p>
        </div>
        {generated && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-3 w-3 mr-1" />Excel</Button>
            <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-3 w-3 mr-1" />PDF</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-3 w-3 mr-1" />Print</Button>
          </div>
        )}
      </div>

      <PLFilterBar filters={filters} onChange={setFilters} onGenerate={handleGenerate} />

      {generated && !isLoading && (
        <div className="space-y-4">
          <PLKPICards sections={sections} />
          <PLCharts sections={sections} monthlyData={monthlyData || undefined} />

          {filters.viewMode === 'monthly' && monthlyData ? (
            <PLMonthlyView monthlyData={monthlyData} />
          ) : (
            <PLStatementTable
              sections={sections}
              showComparison={showComparison}
              showBudget={showBudget}
              comparisonLabel={comparisonLabel}
              onDrillDown={handleDrillDown}
              onAddNote={handleAddNote}
            />
          )}
        </div>
      )}

      {generated && isLoading && (
        <div className="text-center py-16 text-muted-foreground">Loading P&L data...</div>
      )}

      {!generated && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Configure filters and click <strong>Generate Report</strong> to view the Profit & Loss statement</p>
        </div>
      )}

      <PLDrillDownDialog
        open={drillDown.open} onOpenChange={o => setDrillDown(p => ({ ...p, open: o }))}
        acctCode={drillDown.acctCode} acctName={drillDown.acctName}
        dateFrom={filters.dateFrom} dateTo={filters.dateTo} companyIds={filters.companyIds}
      />

      <PLNoteDialog
        open={noteDialog.open} onOpenChange={o => setNoteDialog(p => ({ ...p, open: o }))}
        sectionKey={noteDialog.sectionKey} lineLabel={noteDialog.lineLabel}
        period={`${filters.dateFrom}|${filters.dateTo}`}
        companyId={filters.companyIds[0]}
      />
    </div>
  );
}
