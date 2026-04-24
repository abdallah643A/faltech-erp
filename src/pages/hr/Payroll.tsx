import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePayrollPeriods, usePayslips } from '@/hooks/usePayroll';
import { Plus, Play, Eye, DollarSign, Loader2, Download } from 'lucide-react';
import { PayrollPeriodDialog } from '@/components/hr/PayrollPeriodDialog';
import { PayslipDetailsDialog } from '@/components/hr/PayslipDetailsDialog';
import { PayslipPreviewDialog } from '@/components/hr/PayslipPreviewDialog';
import { format } from 'date-fns';
import { Payslip } from '@/hooks/usePayroll';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { generatePayslipPDF } from '@/utils/payslipPDF';

const payslipColumns: ColumnDef[] = [
  { key: 'employee_code', header: 'Code' },
  { key: 'basic_salary', header: 'Basic Salary' },
  { key: 'housing_allowance', header: 'Housing' },
  { key: 'transport_allowance', header: 'Transport' },
  { key: 'gross_salary', header: 'Gross' },
  { key: 'total_deductions', header: 'Deductions' },
  { key: 'net_salary', header: 'Net Salary' },
];
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Payroll() {
  const { t } = useLanguage();
  const { payrollPeriods, isLoading: periodsLoading, processPayroll } = usePayrollPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const { payslips, isLoading: payslipsLoading } = usePayslips(selectedPeriod || undefined);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewPeriodId, setPreviewPeriodId] = useState<string | null>(null);

  const handleProcess = (periodId: string) => {
    setPreviewPeriodId(periodId);
    // First process to generate draft payslips, then show preview
    processPayroll.mutate(periodId, {
      onSuccess: () => {
        setSelectedPeriod(periodId);
        setPreviewDialogOpen(true);
      }
    });
  };

  const handleViewPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setPayslipDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-100 text-green-800">Processed</Badge>;
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800">Paid</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const currentPeriod = payrollPeriods.find(p => p.id === selectedPeriod);
  const previewPeriod = payrollPeriods.find(p => p.id === previewPeriodId);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Payroll / الرواتب</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            KSA-compliant payroll with GOSI calculations (Saudi 10%/12%, Non-Saudi 0%/2%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={payslips} columns={payslipColumns} filename="payslips" title="Payslips" />
          <Button onClick={() => setPeriodDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Payroll Period
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Periods List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Payroll Periods</CardTitle>
          </CardHeader>
          <CardContent>
            {periodsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : payrollPeriods.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payroll periods</p>
            ) : (
              <div className="space-y-2">
                {payrollPeriods.map((period) => (
                  <div
                    key={period.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPeriod === period.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedPeriod(period.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{period.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {getStatusBadge(period.status)}
                    </div>
                    {period.status === 'processed' && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          Net: <span className="font-medium text-foreground">
                            SAR {(period.total_net || 0).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    )}
                    {period.status === 'draft' && (
                      <Button
                        size="sm"
                        className="mt-2 w-full"
                        disabled={processPayroll.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProcess(period.id);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {processPayroll.isPending ? 'Processing...' : 'Process Payroll'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payslips */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payslips
              {currentPeriod && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {currentPeriod.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPeriod ? (
              <p className="text-center text-muted-foreground py-8">
                Select a payroll period to view payslips
              </p>
            ) : payslipsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : payslips.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payslips for this period
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('hr.employee')}</TableHead>
                    <TableHead>Basic</TableHead>
                    <TableHead className="hidden md:table-cell">Allowances</TableHead>
                    <TableHead className="hidden md:table-cell">GOSI</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('common.status')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payslip.employee?.first_name} {payslip.employee?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payslip.employee?.employee_code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        SAR {(payslip.basic_salary || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        SAR {((payslip.housing_allowance || 0) + (payslip.transport_allowance || 0) + (payslip.other_allowances || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-destructive">
                        - SAR {(payslip.gosi_deduction || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        SAR {(payslip.net_salary || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{getStatusBadge(payslip.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewPayslip(payslip)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => generatePayslipPDF(payslip)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PayrollPeriodDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
      />

      <PayslipDetailsDialog
        open={payslipDialogOpen}
        onOpenChange={setPayslipDialogOpen}
        payslip={selectedPayslip}
      />

      {previewDialogOpen && (
        <PayslipPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          payslips={payslips}
          periodName={previewPeriod?.name || ''}
          onConfirmProcess={() => setPreviewDialogOpen(false)}
          isProcessing={false}
        />
      )}
    </div>
  );
}
