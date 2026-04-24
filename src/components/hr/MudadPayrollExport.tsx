import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePayrollPeriods, usePayslips } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';

export function MudadPayrollExport() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const { payrollPeriods } = usePayrollPeriods();
  const { payslips } = usePayslips(selectedPeriod || undefined);
  const { employees } = useEmployees(false);
  const { toast } = useToast();

  const processedPeriods = payrollPeriods.filter(p => p.status === 'processed');

  const getEmployee = (employeeId: string) => employees.find(e => e.id === employeeId);

  const exportMudadReport = () => {
    if (!selectedPeriod || payslips.length === 0) {
      toast({ title: 'No data', description: 'Select a processed payroll period', variant: 'destructive' });
      return;
    }

    const period = payrollPeriods.find(p => p.id === selectedPeriod);
    
    // Mudad format fields
    const header = [
      'Employer ID', 'Employee ID (Iqama/National ID)', 'Employee Name',
      'Nationality', 'Bank Name', 'IBAN', 'Basic Salary', 'Housing Allowance',
      'Other Earnings', 'Deductions', 'Net Salary', 'Payment Month',
      'Days Worked', 'Absent Days', 'Notes'
    ].join(',');

    const rows = payslips.map(slip => {
      const emp = getEmployee(slip.employee_id);
      if (!emp) return null;
      
      const otherEarnings = (slip.transport_allowance || 0) + (slip.other_allowances || 0) + 
                           (slip.overtime_pay || 0) + (slip.bonus || 0);
      
      return [
        '""', // Employer ID - to be filled
        `"${emp.national_id || ''}"`,
        `"${emp.first_name} ${emp.last_name}"`,
        `"${emp.nationality || ''}"`,
        `"${emp.bank_name || ''}"`,
        `"${emp.iban || ''}"`,
        slip.basic_salary || 0,
        slip.housing_allowance || 0,
        otherEarnings,
        slip.total_deductions || 0,
        slip.net_salary || 0,
        `"${period?.name || ''}"`,
        slip.work_days || 30,
        slip.absent_days || 0,
        '""'
      ].join(',');
    }).filter(Boolean);

    const csv = header + '\n' + rows.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mudad_Payroll_${period?.name || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Mudad report exported', description: `${rows.length} employee records exported` });
  };

  const exportWPSFile = () => {
    if (!selectedPeriod || payslips.length === 0) {
      toast({ title: 'No data', description: 'Select a processed payroll period', variant: 'destructive' });
      return;
    }

    const period = payrollPeriods.find(p => p.id === selectedPeriod);
    
    // WPS SIF (Salary Information File) format for Al Rajhi Bank
    const lines: string[] = [];
    
    // Header record
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push(`EDH${dateStr}0001SIF`); // Header

    payslips.forEach((slip, idx) => {
      const emp = getEmployee(slip.employee_id);
      if (!emp) return;
      
      const netSalary = (slip.net_salary || 0).toFixed(2).replace('.', '').padStart(15, '0');
      const empId = (emp.national_id || '').padEnd(15, ' ');
      const empName = `${emp.first_name} ${emp.last_name}`.padEnd(40, ' ').slice(0, 40);
      const iban = (emp.iban || '').padEnd(24, ' ');
      const bankCode = (emp.bank_name || 'RJHI').slice(0, 4).padEnd(4, ' ');
      
      lines.push(`EDR${(idx + 1).toString().padStart(6, '0')}${empId}${empName}${bankCode}${iban}${netSalary}`);
    });

    // Footer
    const totalNet = payslips.reduce((s, p) => s + (p.net_salary || 0), 0);
    lines.push(`EDT${payslips.length.toString().padStart(6, '0')}${totalNet.toFixed(2).replace('.', '').padStart(15, '0')}`);

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WPS_SIF_${period?.name || 'file'}.sif`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'WPS file exported', description: `SIF file generated for ${payslips.length} employees` });
  };

  // Validation checks
  const validationIssues = payslips.map(slip => {
    const emp = getEmployee(slip.employee_id);
    const issues: string[] = [];
    if (!emp?.iban) issues.push('Missing IBAN');
    if (!emp?.bank_name) issues.push('Missing bank');
    if (!emp?.national_id) issues.push('Missing ID');
    if ((slip.net_salary || 0) <= 0) issues.push('Zero salary');
    return { employee: emp, issues };
  }).filter(v => v.issues.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-sm">Mudad & WPS Export / تصدير مدد وحماية الأجور</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period selector */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select payroll period" />
            </SelectTrigger>
            <SelectContent>
              {processedPeriods.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button size="sm" onClick={exportMudadReport} disabled={!selectedPeriod}>
              <Download className="h-4 w-4 mr-1" /> Mudad CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportWPSFile} disabled={!selectedPeriod}>
              <Download className="h-4 w-4 mr-1" /> WPS / SIF
            </Button>
          </div>
        </div>

        {/* Summary */}
        {selectedPeriod && payslips.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-lg font-bold">{payslips.length}</p>
              <p className="text-[10px] text-muted-foreground">Employees</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-lg font-bold">
                {payslips.reduce((s, p) => s + (p.gross_salary || 0), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Gross Total (SAR)</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-lg font-bold">
                {payslips.reduce((s, p) => s + (p.total_deductions || 0), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Deductions (SAR)</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {payslips.reduce((s, p) => s + (p.net_salary || 0), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Net Total (SAR)</p>
            </div>
          </div>
        )}

        {/* Validation issues */}
        {validationIssues.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-700">Validation Issues ({validationIssues.length})</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-auto">
              {validationIssues.slice(0, 10).map((v, i) => (
                <div key={i} className="text-xs flex gap-2">
                  <span className="font-medium">{v.employee?.first_name} {v.employee?.last_name}:</span>
                  {v.issues.map(issue => (
                    <Badge key={issue} variant="outline" className="text-[10px]">{issue}</Badge>
                  ))}
                </div>
              ))}
              {validationIssues.length > 10 && (
                <p className="text-[10px] text-muted-foreground">+{validationIssues.length - 10} more issues</p>
              )}
            </div>
          </div>
        )}

        {/* Format info */}
        <div className="text-xs text-muted-foreground bg-accent/30 rounded-lg p-3 space-y-1">
          <p className="font-semibold">Export Formats:</p>
          <p>📋 <strong>Mudad CSV</strong>: Monthly payroll report for مدد compliance submission</p>
          <p>🏦 <strong>WPS/SIF</strong>: Salary Information File for bank transfer (Al Rajhi Bank compatible)</p>
        </div>
      </CardContent>
    </Card>
  );
}
