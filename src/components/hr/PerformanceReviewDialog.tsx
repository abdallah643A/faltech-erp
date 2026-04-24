import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePerformanceReviews, PerformanceCycle } from '@/hooks/usePerformance';
import { Employee } from '@/hooks/useEmployees';
import { Loader2, Star } from 'lucide-react';

interface PerformanceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  cycles: PerformanceCycle[];
}

export function PerformanceReviewDialog({
  open,
  onOpenChange,
  employees,
  cycles,
}: PerformanceReviewDialogProps) {
  const { createReview } = usePerformanceReviews();
  
  const [employeeId, setEmployeeId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [overallRating, setOverallRating] = useState<number>(3);
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [achievements, setAchievements] = useState('');
  const [goalsForNextPeriod, setGoalsForNextPeriod] = useState('');
  const [reviewerComments, setReviewerComments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createReview.mutate({
      employee_id: employeeId,
      cycle_id: cycleId || undefined,
      reviewer_id: reviewerId || undefined,
      review_date: reviewDate || undefined,
      overall_rating: overallRating,
      strengths: strengths || undefined,
      areas_for_improvement: areasForImprovement || undefined,
      achievements: achievements || undefined,
      goals_for_next_period: goalsForNextPeriod || undefined,
      reviewer_comments: reviewerComments || undefined,
    });
    
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setEmployeeId('');
    setCycleId('');
    setReviewerId('');
    setReviewDate(new Date().toISOString().split('T')[0]);
    setOverallRating(3);
    setStrengths('');
    setAreasForImprovement('');
    setAchievements('');
    setGoalsForNextPeriod('');
    setReviewerComments('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Performance Review</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="reviewer">Reviewer</Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reviewer" />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cycle">Performance Cycle</Label>
              <Select value={cycleId} onValueChange={setCycleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewDate">Review Date</Label>
              <Input
                id="reviewDate"
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Overall Rating</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setOverallRating(rating)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-8 w-8 ${
                      rating <= overallRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-lg font-medium">{overallRating}/5</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strengths">Strengths</Label>
            <Textarea
              id="strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Employee's key strengths..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areasForImprovement">Areas for Improvement</Label>
            <Textarea
              id="areasForImprovement"
              value={areasForImprovement}
              onChange={(e) => setAreasForImprovement(e.target.value)}
              placeholder="Areas that need development..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="achievements">Key Achievements</Label>
            <Textarea
              id="achievements"
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="Notable achievements during the period..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalsForNextPeriod">Goals for Next Period</Label>
            <Textarea
              id="goalsForNextPeriod"
              value={goalsForNextPeriod}
              onChange={(e) => setGoalsForNextPeriod(e.target.value)}
              placeholder="Goals and objectives for the upcoming period..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewerComments">Reviewer Comments</Label>
            <Textarea
              id="reviewerComments"
              value={reviewerComments}
              onChange={(e) => setReviewerComments(e.target.value)}
              placeholder="Additional comments from the reviewer..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createReview.isPending}>
              {createReview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Review
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
