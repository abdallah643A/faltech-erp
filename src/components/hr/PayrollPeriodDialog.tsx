import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePayrollPeriods } from '@/hooks/usePayroll';
import { Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';

interface PayrollPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollPeriodDialog({
  open,
  onOpenChange,
}: PayrollPeriodDialogProps) {
  const { createPayrollPeriod } = usePayrollPeriods();
  
  const now = new Date();
  const defaultStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const defaultEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const defaultPayDate = format(addMonths(endOfMonth(now), 0), 'yyyy-MM-dd');
  
  const [name, setName] = useState(`${format(now, 'MMMM yyyy')} Payroll`);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [payDate, setPayDate] = useState(defaultPayDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createPayrollPeriod.mutate({
      name,
      start_date: startDate,
      end_date: endDate,
      pay_date: payDate,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Payroll Period</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Period Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., January 2024 Payroll"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payDate">Pay Date</Label>
            <Input
              id="payDate"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPayrollPeriod.isPending}>
              {createPayrollPeriod.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Period
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
