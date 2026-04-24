import { useState } from 'react';
import { useCadences, type CadenceStep } from '@/hooks/useCadences';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Clock, Phone, Mail, Calendar, CheckCircle, FileText,
  ArrowRight, Loader2, Play, Pause, X, Users, ListOrdered, Save, Edit2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Cadence } from '@/hooks/useCadences';

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
  cadence: Cadence;
}

export function CadenceDetailDialog({ open, onOpenChange, cadence }: Props) {
  const { language } = useLanguage();
  const { steps, enrollments, cancelEnrollment, pauseEnrollment } = useCadences();

  const cadenceSteps = steps
    .filter(s => s.cadence_id === cadence.id)
    .sort((a, b) => a.step_order - b.step_order);

  const cadenceEnrollments = enrollments.filter(e => e.cadence_id === cadence.id);
  const activeEnrollments = cadenceEnrollments.filter(e => e.status === 'active');
  const completedEnrollments = cadenceEnrollments.filter(e => e.status === 'completed');
  const totalDays = cadenceSteps.reduce((sum, s) => sum + s.delay_days, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">{cadence.name}</DialogTitle>
            <Badge variant={cadence.is_active ? 'default' : 'secondary'} className="text-[10px]">
              {cadence.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{cadence.target_type}</Badge>
          </div>
          {cadence.description && (
            <p className="text-sm text-muted-foreground">{cadence.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span>{cadenceSteps.length} steps</span>
            <span>{totalDays} days total</span>
            <span>{activeEnrollments.length} active</span>
            <span>{completedEnrollments.length} completed</span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="steps" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="steps" className="gap-1.5 text-xs">
              <ListOrdered className="h-3.5 w-3.5" />Steps ({cadenceSteps.length})
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />Enrollments ({cadenceEnrollments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {/* Visual timeline */}
            <div className="flex items-center gap-1 overflow-x-auto pb-3 px-1">
              {cadenceSteps.map((step, idx) => {
                const Icon = actionIcons[step.action_type] || CheckCircle;
                return (
                  <div key={step.id} className="flex items-center shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${actionColors[step.action_type] || 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="text-center max-w-[90px]">
                        <p className="text-[10px] font-medium truncate">{step.subject}</p>
                        <p className="text-[9px] text-muted-foreground">Day {step.delay_days}</p>
                      </div>
                    </div>
                    {idx < cadenceSteps.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-1.5 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detailed step list */}
            {cadenceSteps.map((step, idx) => {
              const Icon = actionIcons[step.action_type] || CheckCircle;
              return (
                <Card key={step.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${actionColors[step.action_type]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">#{step.step_order}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{step.subject}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] capitalize">{step.action_type}</Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />Day {step.delay_days}
                          </span>
                          {step.priority && (
                            <Badge variant="secondary" className="text-[10px] capitalize">{step.priority}</Badge>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {cadenceSteps.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No steps defined</div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-2">
              <p className="font-medium mb-1">💡 How it works:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Go to <strong>Leads</strong> page and use the <strong>"Enroll in Cadence"</strong> action on any lead</li>
                <li>The system will automatically create activities based on these steps</li>
                <li>Each step generates an activity (call, email, meeting, etc.) after the specified delay</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="enrollments" className="flex-1 overflow-y-auto space-y-2 mt-3">
            {cadenceEnrollments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No enrollments yet</p>
                <p className="text-xs mt-1">Enroll leads from the Leads page using the cadence action</p>
              </div>
            ) : (
              cadenceEnrollments.map(enrollment => {
                const currentStepData = cadenceSteps.find(s => s.step_order === enrollment.current_step);
                const CurrentIcon = currentStepData ? (actionIcons[currentStepData.action_type] || CheckCircle) : CheckCircle;

                return (
                  <Card key={enrollment.id} className={enrollment.status === 'completed' ? 'opacity-60' : ''}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">
                            Step {enrollment.current_step}/{cadenceSteps.length}
                          </Badge>
                          <Badge className={`text-[10px] ${
                            enrollment.status === 'active' ? 'bg-success/10 text-success' :
                            enrollment.status === 'completed' ? 'bg-primary/10 text-primary' :
                            enrollment.status === 'paused' ? 'bg-warning/10 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {enrollment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {currentStepData && enrollment.status === 'active' && (
                            <span className="flex items-center gap-1">
                              <CurrentIcon className="h-3 w-3" />
                              Next: {currentStepData.subject}
                            </span>
                          )}
                          {enrollment.next_action_at && enrollment.status === 'active' && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(enrollment.next_action_at), { addSuffix: true })}
                              </span>
                            </>
                          )}
                          {enrollment.completed_at && (
                            <span>Completed {formatDistanceToNow(new Date(enrollment.completed_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                      {enrollment.status === 'active' || enrollment.status === 'paused' ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => pauseEnrollment.mutate({
                              id: enrollment.id,
                              status: enrollment.status === 'paused' ? 'active' : 'paused',
                            })}
                          >
                            {enrollment.status === 'paused' ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => cancelEnrollment.mutate(enrollment.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
