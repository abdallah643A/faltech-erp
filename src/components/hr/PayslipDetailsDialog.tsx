import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Payslip } from '@/hooks/usePayroll';
import { format } from 'date-fns';

interface PayslipDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslip: Payslip | null;
}

export function PayslipDetailsDialog({
  open,
  onOpenChange,
  payslip,
}: PayslipDetailsDialogProps) {
  if (!payslip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payslip Details</span>
            <Badge variant={payslip.status === 'paid' ? 'default' : 'secondary'}>
              {payslip.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium text-lg">
              {payslip.employee?.first_name} {payslip.employee?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">{payslip.employee?.employee_code}</p>
            {payslip.payroll_period && (
              <p className="text-sm text-muted-foreground mt-1">
                Period: {payslip.payroll_period.name}
              </p>
            )}
          </div>

          {/* Earnings */}
          <div>
            <h4 className="font-medium mb-3">Earnings</h4>
            <div className="space-y-2">
              <PayslipRow label="Basic Salary" value={payslip.basic_salary} />
              <PayslipRow label="Housing Allowance" value={payslip.housing_allowance} />
              <PayslipRow label="Transport Allowance" value={payslip.transport_allowance} />
              <PayslipRow label="Other Allowances" value={payslip.other_allowances} />
              {payslip.overtime_pay && payslip.overtime_pay > 0 && (
                <PayslipRow label="Overtime Pay" value={payslip.overtime_pay} />
              )}
              {payslip.bonus && payslip.bonus > 0 && (
                <PayslipRow label="Bonus" value={payslip.bonus} />
              )}
              <Separator />
              <PayslipRow label="Gross Salary" value={payslip.gross_salary} bold />
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h4 className="font-medium mb-3">Deductions</h4>
            <div className="space-y-2">
              <PayslipRow label="GOSI (Social Insurance)" value={payslip.gosi_deduction} negative />
              {payslip.tax_deduction && payslip.tax_deduction > 0 && (
                <PayslipRow label="Tax" value={payslip.tax_deduction} negative />
              )}
              {payslip.loan_deduction && payslip.loan_deduction > 0 && (
                <PayslipRow label="Loan Deduction" value={payslip.loan_deduction} negative />
              )}
              {payslip.other_deductions && payslip.other_deductions > 0 && (
                <PayslipRow label="Other Deductions" value={payslip.other_deductions} negative />
              )}
              <Separator />
              <PayslipRow label="Total Deductions" value={payslip.total_deductions} negative bold />
            </div>
          </div>

          {/* Net Salary */}
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Net Salary</span>
              <span className="text-2xl font-bold text-primary">
                SAR {(payslip.net_salary || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Additional Info */}
          {(payslip.work_days || payslip.absent_days || payslip.overtime_hours) && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold">{payslip.work_days || 0}</p>
                <p className="text-xs text-muted-foreground">Work Days</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold">{payslip.absent_days || 0}</p>
                <p className="text-xs text-muted-foreground">Absent Days</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-2xl font-bold">{payslip.overtime_hours || 0}</p>
                <p className="text-xs text-muted-foreground">Overtime Hours</p>
              </div>
            </div>
          )}

          {payslip.paid_at && (
            <p className="text-sm text-muted-foreground text-center">
              Paid on {format(new Date(payslip.paid_at), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayslipRow({ 
  label, 
  value, 
  negative = false, 
  bold = false 
}: { 
  label: string; 
  value: number | null; 
  negative?: boolean;
  bold?: boolean;
}) {
  const amount = value || 0;
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-medium' : ''}`}>
      <span>{label}</span>
      <span className={negative ? 'text-destructive' : ''}>
        {negative ? '- ' : ''}SAR {amount.toLocaleString()}
      </span>
    </div>
  );
}
