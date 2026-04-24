import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';
import { Payslip } from '@/hooks/usePayroll';
import { generatePayslipPDF } from '@/utils/payslipPDF';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslips: Payslip[];
  periodName: string;
  onConfirmProcess: () => void;
  isProcessing: boolean;
}

export function PayslipPreviewDialog({ open, onOpenChange, payslips, periodName, onConfirmProcess, isProcessing }: Props) {
  const totalGross = payslips.reduce((s, p) => s + (p.gross_salary || 0), 0);
  const totalDeductions = payslips.reduce((s, p) => s + (p.total_deductions || 0), 0);
  const totalNet = payslips.reduce((s, p) => s + (p.net_salary || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Payroll Preview — {periodName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Gross</p>
            <p className="text-lg font-bold">SAR {totalGross.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Deductions</p>
            <p className="text-lg font-bold text-destructive">SAR {totalDeductions.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Net</p>
            <p className="text-lg font-bold text-primary">SAR {totalNet.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-auto">
          {payslips.map(slip => (
            <div key={slip.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">
                  {slip.employee?.first_name} {slip.employee?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{slip.employee?.employee_code}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">SAR {(slip.net_salary || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">GOSI: SAR {(slip.gosi_deduction || 0).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => generatePayslipPDF(slip)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirmProcess} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Confirm & Process Payroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
