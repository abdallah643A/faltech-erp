import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePerformanceGoals, PerformanceCycle } from '@/hooks/usePerformance';
import { Employee } from '@/hooks/useEmployees';
import { Loader2 } from 'lucide-react';

interface PerformanceGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  cycles: PerformanceCycle[];
}

export function PerformanceGoalDialog({
  open,
  onOpenChange,
  employees,
  cycles,
}: PerformanceGoalDialogProps) {
  const { createGoal } = usePerformanceGoals();
  
  const [employeeId, setEmployeeId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [weight, setWeight] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createGoal.mutate({
      employee_id: employeeId,
      cycle_id: cycleId || undefined,
      title,
      description: description || undefined,
      category: category || undefined,
      weight: weight || undefined,
      target_value: targetValue || undefined,
      due_date: dueDate || undefined,
    });
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setEmployeeId('');
    setCycleId('');
    setTitle('');
    setDescription('');
    setCategory('');
    setWeight(0);
    setTargetValue(0);
    setDueDate('');
  };

  const activeCycle = cycles.find(c => c.status === 'active');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Performance Goal</DialogTitle>
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
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycle">Performance Cycle</Label>
            <Select value={cycleId} onValueChange={setCycleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select cycle (optional)" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name} {cycle.status === 'active' ? '(Active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Increase sales by 20%"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the goal in detail..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="learning">Learning & Development</SelectItem>
                  <SelectItem value="teamwork">Teamwork</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (%)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target Value</Label>
              <Input
                id="targetValue"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGoal.isPending}>
              {createGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
