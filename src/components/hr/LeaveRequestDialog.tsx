import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeaveRequests, LeaveType } from '@/hooks/useLeaveManagement';
import { Employee } from '@/hooks/useEmployees';
import { Loader2 } from 'lucide-react';
import { differenceInDays, addDays } from 'date-fns';

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  leaveTypes: LeaveType[];
}

export function LeaveRequestDialog({
  open,
  onOpenChange,
  employees,
  leaveTypes,
}: LeaveRequestDialogProps) {
  const { createLeaveRequest } = useLeaveRequests();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
    return Math.max(0, days);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createLeaveRequest.mutate({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      total_days: calculateDays(),
      reason: reason || undefined,
    });
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setEmployeeId('');
    setLeaveTypeId('');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type *</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} {type.is_paid ? '(Paid)' : '(Unpaid)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {startDate && endDate && (
            <div className="p-3 bg-muted rounded-lg text-center">
              <span className="text-lg font-bold">{calculateDays()}</span>
              <span className="text-muted-foreground ml-1">day(s)</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason for leave..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLeaveRequest.isPending}>
              {createLeaveRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
