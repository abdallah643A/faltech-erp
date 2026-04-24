import { useState } from 'react';
import { useCadences } from '@/hooks/useCadences';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, Calendar, CheckCircle, FileText, ArrowRight, Loader2, ListOrdered } from 'lucide-react';

const actionIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckCircle, note: FileText,
};

const actionColors: Record<string, string> = {
  call: 'bg-info/10 text-info',
  email: 'bg-primary/10 text-primary',
  meeting: 'bg-warning/10 text-warning',
  task: 'bg-success/10 text-success',
  note: 'bg-muted text-muted-foreground',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
}

export function EnrollCadenceDialog({ open, onOpenChange, leadId, leadName }: Props) {
  const { cadences, steps, enrollments, enrollLead } = useCadences();
  const [selectedCadence, setSelectedCadence] = useState<string | null>(null);

  const activeCadences = cadences.filter(c => c.is_active && c.target_type === 'lead');
  const existingEnrollments = enrollments.filter(e => e.lead_id === leadId && e.status === 'active');

  const handleEnroll = () => {
    if (!selectedCadence) return;
    enrollLead.mutate({ cadence_id: selectedCadence, lead_id: leadId }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedCadence(null);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Enroll "{leadName}" in Cadence</DialogTitle>
        </DialogHeader>

        {existingEnrollments.length > 0 && (
          <div className="text-xs text-warning bg-warning/10 p-2 rounded flex items-center gap-2">
            <ListOrdered className="h-3.5 w-3.5" />
            Already enrolled in {existingEnrollments.length} active cadence(s)
          </div>
        )}

        <div className="space-y-3 overflow-y-auto flex-1">
          {activeCadences.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active cadences available. Create one first.</p>
          ) : (
            activeCadences.map(cadence => {
              const cadenceSteps = steps.filter(s => s.cadence_id === cadence.id).sort((a, b) => a.step_order - b.step_order);
              const isSelected = selectedCadence === cadence.id;
              const alreadyEnrolled = existingEnrollments.some(e => e.cadence_id === cadence.id);

              return (
                <Card
                  key={cadence.id}
                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : ''} ${alreadyEnrolled ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => !alreadyEnrolled && setSelectedCadence(cadence.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{cadence.name}</p>
                        <p className="text-[10px] text-muted-foreground">{cadenceSteps.length} steps • {cadenceSteps.reduce((s, st) => s + st.delay_days, 0)} days</p>
                      </div>
                      {alreadyEnrolled && <Badge variant="secondary" className="text-[10px]">Already Enrolled</Badge>}
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {cadenceSteps.map((step, idx) => {
                        const Icon = actionIcons[step.action_type] || CheckCircle;
                        return (
                          <div key={step.id} className="flex items-center shrink-0">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${actionColors[step.action_type]}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            {idx < cadenceSteps.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground mx-0.5" />}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleEnroll} disabled={!selectedCadence || enrollLead.isPending}>
            {enrollLead.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Enroll in Cadence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
