import { useState } from 'react';
import { useCadences, type Cadence, type CadenceStep } from '@/hooks/useCadences';
import { CadenceDetailDialog } from './CadenceDetailDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Clock, Phone, Mail, Calendar, CheckCircle, FileText,
  ArrowRight, Loader2, Play, Pause, X, Users, Zap, ListOrdered,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface StepDraft {
  step_order: number;
  delay_days: number;
  action_type: string;
  subject: string;
  description: string;
  priority: string;
}

export function CadenceManager() {
  const { language } = useLanguage();
  const {
    cadences, steps, enrollments, isLoading,
    createCadence, deleteCadence, toggleCadence,
    cancelEnrollment, pauseEnrollment,
  } = useCadences();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCadence, setSelectedCadence] = useState<Cadence | null>(null);
  const [newCadence, setNewCadence] = useState({ name: '', description: '', target_type: 'lead' });
  const [draftSteps, setDraftSteps] = useState<StepDraft[]>([
    { step_order: 1, delay_days: 1, action_type: 'email', subject: 'Introduction follow-up', description: '', priority: 'medium' },
    { step_order: 2, delay_days: 3, action_type: 'call', subject: 'Check-in call', description: '', priority: 'medium' },
    { step_order: 3, delay_days: 7, action_type: 'meeting', subject: 'Schedule demo meeting', description: '', priority: 'high' },
  ]);

  const addStep = () => {
    const lastStep = draftSteps[draftSteps.length - 1];
    setDraftSteps([...draftSteps, {
      step_order: draftSteps.length + 1,
      delay_days: (lastStep?.delay_days || 1) + 2,
      action_type: 'call',
      subject: '',
      description: '',
      priority: 'medium',
    }]);
  };

  const removeStep = (index: number) => {
    setDraftSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStep = (index: number, field: string, value: any) => {
    setDraftSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleCreate = () => {
    if (!newCadence.name || draftSteps.length === 0) return;
    createCadence.mutate({
      name: newCadence.name,
      description: newCadence.description,
      target_type: newCadence.target_type,
      steps: draftSteps,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setNewCadence({ name: '', description: '', target_type: 'lead' });
        setDraftSteps([
          { step_order: 1, delay_days: 1, action_type: 'email', subject: 'Introduction follow-up', description: '', priority: 'medium' },
          { step_order: 2, delay_days: 3, action_type: 'call', subject: 'Check-in call', description: '', priority: 'medium' },
          { step_order: 3, delay_days: 7, action_type: 'meeting', subject: 'Schedule demo meeting', description: '', priority: 'high' },
        ]);
      },
    });
  };

  const getStepsForCadence = (cadenceId: string) => steps.filter(s => s.cadence_id === cadenceId).sort((a, b) => a.step_order - b.step_order);
  const getEnrollmentsForCadence = (cadenceId: string) => enrollments.filter(e => e.cadence_id === cadenceId);

  const activeEnrollments = enrollments.filter(e => e.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'تسلسلات المتابعة' : 'Follow-up Cadences'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تسلسلات متابعة تلقائية متعددة الخطوات' : 'Multi-step automated follow-up sequences'}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إنشاء تسلسل' : 'Create Cadence'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ListOrdered, label: 'Total Cadences', value: cadences.length, color: 'bg-primary/10 text-primary' },
          { icon: Zap, label: 'Active', value: cadences.filter(c => c.is_active).length, color: 'bg-success/10 text-success' },
          { icon: Users, label: 'Active Enrollments', value: activeEnrollments.length, color: 'bg-info/10 text-info' },
          { icon: CheckCircle, label: 'Completed', value: enrollments.filter(e => e.status === 'completed').length, color: 'bg-emerald-500/10 text-emerald-600' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="cadences">
        <TabsList>
          <TabsTrigger value="cadences" className="gap-1.5"><ListOrdered className="h-4 w-4" />Cadences</TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-1.5"><Users className="h-4 w-4" />Active Enrollments ({activeEnrollments.length})</TabsTrigger>
        </TabsList>

        {/* Cadences Tab */}
        <TabsContent value="cadences" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : cadences.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ListOrdered className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No cadences yet</p>
                <p className="text-sm mt-1">Create your first follow-up sequence to automate lead engagement</p>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Create Cadence
                </Button>
              </CardContent>
            </Card>
          ) : (
            cadences.map(cadence => {
              const cadenceSteps = getStepsForCadence(cadence.id);
              const cadenceEnrollments = getEnrollmentsForCadence(cadence.id);
              const totalDays = cadenceSteps.reduce((sum, s) => sum + s.delay_days, 0);

              return (
                <Card key={cadence.id} className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${!cadence.is_active ? 'opacity-60' : ''}`} onClick={() => setSelectedCadence(cadence)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{cadence.name}</CardTitle>
                          <Badge variant={cadence.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {cadence.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{cadence.target_type}</Badge>
                        </div>
                        {cadence.description && <p className="text-xs text-muted-foreground mt-1">{cadence.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{cadenceSteps.length} steps</span>
                          <span>•</span>
                          <span>{totalDays} days total</span>
                          <span>•</span>
                          <span>{cadenceEnrollments.filter(e => e.status === 'active').length} active</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div onClick={e => e.stopPropagation()}>
                          <Switch checked={cadence.is_active} onCheckedChange={(v) => toggleCadence.mutate({ id: cadence.id, is_active: v })} />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteCadence.mutate(cadence.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Visual Step Timeline */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-2">
                      {cadenceSteps.map((step, idx) => {
                        const Icon = actionIcons[step.action_type] || CheckCircle;
                        return (
                          <div key={step.id} className="flex items-center shrink-0">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${actionColors[step.action_type] || 'bg-muted text-muted-foreground'}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="text-center max-w-[80px]">
                                <p className="text-[10px] font-medium truncate">{step.subject}</p>
                                <p className="text-[9px] text-muted-foreground">Day {step.delay_days}</p>
                              </div>
                            </div>
                            {idx < cadenceSteps.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments" className="space-y-3 mt-4">
          {activeEnrollments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No active enrollments. Enroll leads from the Leads page.
              </CardContent>
            </Card>
          ) : (
            activeEnrollments.map(enrollment => {
              const cadence = cadences.find(c => c.id === enrollment.cadence_id);
              const cadenceSteps = getStepsForCadence(enrollment.cadence_id);
              const currentStepData = cadenceSteps.find(s => s.step_order === enrollment.current_step);

              return (
                <Card key={enrollment.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{cadence?.name || 'Unknown'}</p>
                        <Badge variant="outline" className="text-[10px]">Step {enrollment.current_step}/{cadenceSteps.length}</Badge>
                        <Badge className={`text-[10px] ${enrollment.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {enrollment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {currentStepData && <span>Next: {currentStepData.action_type} — {currentStepData.subject}</span>}
                        {enrollment.next_action_at && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(enrollment.next_action_at), { addSuffix: true })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
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
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Create Cadence Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إنشاء تسلسل متابعة' : 'Create Follow-up Cadence'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cadence Name *</Label>
                <Input value={newCadence.name} onChange={e => setNewCadence({ ...newCadence, name: e.target.value })} placeholder="e.g. New Lead 7-Day Sequence" />
              </div>
              <div className="space-y-1.5">
                <Label>Target Type</Label>
                <Select value={newCadence.target_type} onValueChange={v => setNewCadence({ ...newCadence, target_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={newCadence.description} onChange={e => setNewCadence({ ...newCadence, description: e.target.value })} placeholder="Describe the cadence purpose..." rows={2} />
            </div>

            {/* Steps Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Sequence Steps</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" />Add Step
                </Button>
              </div>

              {draftSteps.map((step, idx) => {
                const Icon = actionIcons[step.action_type] || CheckCircle;
                return (
                  <div key={idx} className="relative border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${actionColors[step.action_type]}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">STEP {step.step_order}</span>
                      </div>
                      {draftSteps.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeStep(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Day</Label>
                        <Input type="number" min={1} value={step.delay_days} onChange={e => updateStep(idx, 'delay_days', parseInt(e.target.value) || 1)} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Action</Label>
                        <Select value={step.action_type} onValueChange={v => updateStep(idx, 'action_type', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">📞 Call</SelectItem>
                            <SelectItem value="email">📧 Email</SelectItem>
                            <SelectItem value="meeting">📅 Meeting</SelectItem>
                            <SelectItem value="task">✓ Task</SelectItem>
                            <SelectItem value="note">📝 Note</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px]">Subject *</Label>
                        <Input value={step.subject} onChange={e => updateStep(idx, 'subject', e.target.value)} placeholder="Activity subject..." className="h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCadence.isPending || !newCadence.name || draftSteps.some(s => !s.subject)}>
              {createCadence.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Cadence ({draftSteps.length} steps)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Cadence Detail Dialog */}
      {selectedCadence && (
        <CadenceDetailDialog
          open={!!selectedCadence}
          onOpenChange={(open) => { if (!open) setSelectedCadence(null); }}
          cadence={selectedCadence}
        />
      )}
    </div>
  );
}
