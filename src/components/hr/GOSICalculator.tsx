import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Calculator } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';

interface GOSICalculatorProps {
  employees: Employee[];
}

// GOSI Rates for KSA (2024)
const GOSI_RATES = {
  saudi: {
    employer: { annuity: 0.0975, occupationalHazards: 0.02 },
    employee: { annuity: 0.0975 },
  },
  nonSaudi: {
    employer: { occupationalHazards: 0.02 },
    employee: {},
  },
};

const GOSI_MAX_SALARY = 45000; // SAR monthly cap

function calcGOSI(emp: Employee) {
  const basic = Math.min(emp.basic_salary || 0, GOSI_MAX_SALARY);
  const housing = Math.min(emp.housing_allowance || 0, GOSI_MAX_SALARY - basic > 0 ? GOSI_MAX_SALARY - basic : 0);
  const contributableSalary = basic + housing;
  const isSaudi = (emp.nationality || '').toLowerCase() === 'saudi' || (emp.nationality || '').toLowerCase() === 'سعودي';

  if (isSaudi) {
    const employerAnnuity = contributableSalary * GOSI_RATES.saudi.employer.annuity;
    const employerHazards = contributableSalary * GOSI_RATES.saudi.employer.occupationalHazards;
    const employeeAnnuity = contributableSalary * GOSI_RATES.saudi.employee.annuity;
    return {
      contributableSalary,
      isSaudi: true,
      employerShare: employerAnnuity + employerHazards,
      employeeShare: employeeAnnuity,
      total: employerAnnuity + employerHazards + employeeAnnuity,
      breakdown: { employerAnnuity, employerHazards, employeeAnnuity },
    };
  } else {
    const employerHazards = contributableSalary * GOSI_RATES.nonSaudi.employer.occupationalHazards;
    return {
      contributableSalary,
      isSaudi: false,
      employerShare: employerHazards,
      employeeShare: 0,
      total: employerHazards,
      breakdown: { employerAnnuity: 0, employerHazards, employeeAnnuity: 0 },
    };
  }
}

export function GOSICalculator({ employees }: GOSICalculatorProps) {
  const activeEmployees = employees.filter(e => e.employment_status === 'active');
  const calculations = activeEmployees.map(emp => ({ employee: emp, gosi: calcGOSI(emp) }));
  
  const totalEmployer = calculations.reduce((s, c) => s + c.gosi.employerShare, 0);
  const totalEmployee = calculations.reduce((s, c) => s + c.gosi.employeeShare, 0);
  const grandTotal = totalEmployer + totalEmployee;
  const saudiCount = calculations.filter(c => c.gosi.isSaudi).length;
  const nonSaudiCount = calculations.length - saudiCount;

  const exportCSV = () => {
    const header = 'Employee Code,Name,Nationality,Contributable Salary,Employer Share,Employee Share,Total\n';
    const rows = calculations.map(c =>
      `${c.employee.employee_code},"${c.employee.first_name} ${c.employee.last_name}",${c.gosi.isSaudi ? 'Saudi' : 'Non-Saudi'},${c.gosi.contributableSalary.toFixed(2)},${c.gosi.employerShare.toFixed(2)},${c.gosi.employeeShare.toFixed(2)},${c.gosi.total.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GOSI_Report_${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-green-600" />
          <CardTitle className="text-sm">GOSI Calculator / حاسبة التأمينات الاجتماعية</CardTitle>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Employees</p>
            <p className="text-lg font-bold">{calculations.length}</p>
            <p className="text-[10px] text-muted-foreground">{saudiCount} Saudi / {nonSaudiCount} Non-Saudi</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Employer Share</p>
            <p className="text-lg font-bold text-destructive">{totalEmployer.toLocaleString('en', { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-muted-foreground">SAR / month</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Employee Share</p>
            <p className="text-lg font-bold text-primary">{totalEmployee.toLocaleString('en', { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-muted-foreground">SAR / month</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Monthly Total</p>
            <p className="text-lg font-bold">{grandTotal.toLocaleString('en', { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-muted-foreground">SAR</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Annual Total</p>
            <p className="text-lg font-bold">{(grandTotal * 12).toLocaleString('en', { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-muted-foreground">SAR</p>
          </div>
        </div>

        {/* Rate reference */}
        <div className="text-xs text-muted-foreground bg-accent/30 rounded-lg p-3 space-y-1">
          <p className="font-semibold">GOSI Contribution Rates:</p>
          <p>🇸🇦 <strong>Saudi</strong>: Employer 9.75% (Annuity) + 2% (Hazards) = 11.75% | Employee 9.75% (Annuity)</p>
          <p>🌍 <strong>Non-Saudi</strong>: Employer 2% (Occupational Hazards only) | Employee 0%</p>
          <p>📊 Max contributable salary: SAR {GOSI_MAX_SALARY.toLocaleString()} (basic + housing)</p>
        </div>

        {/* Detailed table */}
        <div className="max-h-[400px] overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead className="text-right">Contributable</TableHead>
                <TableHead className="text-right">Employer</TableHead>
                <TableHead className="text-right">Employee</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculations.map(({ employee: emp, gosi }) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.first_name} {emp.last_name}</TableCell>
                  <TableCell>
                    <Badge variant={gosi.isSaudi ? 'default' : 'secondary'}>
                      {gosi.isSaudi ? '🇸🇦 Saudi' : '🌍 Non-Saudi'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{gosi.contributableSalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">{gosi.employerShare.toFixed(0)}</TableCell>
                  <TableCell className="text-right text-primary">{gosi.employeeShare.toFixed(0)}</TableCell>
                  <TableCell className="text-right font-semibold">{gosi.total.toFixed(0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
