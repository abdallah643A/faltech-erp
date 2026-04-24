import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePerformanceCycles } from '@/hooks/usePerformance';
import { Loader2 } from 'lucide-react';
import { format, startOfYear, endOfYear } from 'date-fns';

interface PerformanceCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PerformanceCycleDialog({
  open,
  onOpenChange,
}: PerformanceCycleDialogProps) {
  const { createCycle } = usePerformanceCycles();
  
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(`${currentYear} Annual Review`);
  const [year, setYear] = useState(currentYear);
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfYear(new Date()), 'yyyy-MM-dd'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createCycle.mutate({
      name,
      year,
      start_date: startDate,
      end_date: endDate,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Performance Cycle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Cycle Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 2024 Annual Review"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year *</Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              min={2020}
              max={2100}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCycle.isPending}>
              {createCycle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Cycle
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
