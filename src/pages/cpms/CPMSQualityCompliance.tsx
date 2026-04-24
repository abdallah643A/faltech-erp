import { useState } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSQuality, Defect, PunchItem, Inspection } from '@/hooks/useCPMSQuality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Bug, ListChecks, ClipboardCheck, AlertTriangle, CheckCircle2, Clock, Eye, Pencil, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  major: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  minor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  verified: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-800',
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  conditional: 'bg-amber-100 text-amber-800',
};

export default function CPMSQualityCompliance() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const quality = useCPMSQuality(selectedProjectId || undefined);
  const [activeTab, setActiveTab] = useState('defects');
  const [showDefectDialog, setShowDefectDialog] = useState(false);
  const [showPunchDialog, setShowPunchDialog] = useState(false);
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [defectForm, setDefectForm] = useState<Partial<Defect>>({ severity: 'minor', category: 'workmanship', status: 'open' });
  const [punchForm, setPunchForm] = useState<Partial<PunchItem>>({ status: 'open', priority: 'medium' });
  const [inspForm, setInspForm] = useState<Partial<Inspection>>({ type: 'quality', status: 'scheduled' });

  const handleCreateDefect = async () => {
    if (!selectedProjectId || !defectForm.title) return;
    await quality.createDefect({ ...defectForm, project_id: selectedProjectId });
    setShowDefectDialog(false);
    setDefectForm({ severity: 'minor', category: 'workmanship', status: 'open' });
  };

  const handleCreatePunch = async () => {
    if (!selectedProjectId || !punchForm.title) return;
    await quality.createPunchItem({ ...punchForm, project_id: selectedProjectId });
    setShowPunchDialog(false);
    setPunchForm({ status: 'open', priority: 'medium' });
  };

  const handleCreateInspection = async () => {
    if (!selectedProjectId || !inspForm.title) return;
    await quality.createInspection({ ...inspForm, project_id: selectedProjectId });
    setShowInspectionDialog(false);
    setInspForm({ type: 'quality', status: 'scheduled' });
  };

  // Stats
  const defectStats = {
    total: quality.defects.length,
    open: quality.defects.filter(d => d.status === 'open').length,
    critical: quality.defects.filter(d => d.severity === 'critical').length,
    resolved: quality.defects.filter(d => ['resolved', 'verified', 'closed'].includes(d.status)).length,
  };

  const punchStats = {
    total: quality.punchLists.length,
    open: quality.punchLists.filter(p => p.status === 'open').length,
    completed: quality.punchLists.filter(p => ['completed', 'verified'].includes(p.status)).length,
  };

  const inspStats = {
    total: quality.inspections.length,
    passed: quality.inspections.filter(i => i.overall_result === 'pass').length,
    failed: quality.inspections.filter(i => i.overall_result === 'fail').length,
    scheduled: quality.inspections.filter(i => i.status === 'scheduled').length,
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Quality & Compliance
          </h1>
          <p className="text-sm text-muted-foreground">الجودة والامتثال – Defects, Inspections, Punch Lists</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Select a project to view quality data</CardContent></Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Open Defects</p>
                <p className="text-2xl font-bold text-red-600">{defectStats.open}</p>
                <p className="text-[10px] text-muted-foreground">{defectStats.critical} critical</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Punch Items</p>
                <p className="text-2xl font-bold text-amber-600">{punchStats.open}</p>
                <p className="text-[10px] text-muted-foreground">{punchStats.completed} completed</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Inspections</p>
                <p className="text-2xl font-bold text-emerald-600">{inspStats.passed}</p>
                <p className="text-[10px] text-muted-foreground">{inspStats.scheduled} scheduled</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quality Score</p>
                <p className="text-2xl font-bold">{Math.max(0, 100 - (defectStats.critical * 15) - (defectStats.open * 5))}</p>
                <Progress value={Math.max(0, 100 - (defectStats.critical * 15) - (defectStats.open * 5))} className="h-1 mt-1" />
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="defects"><Bug className="h-3 w-3 mr-1" /> Defects ({defectStats.total})</TabsTrigger>
              <TabsTrigger value="punch"><ListChecks className="h-3 w-3 mr-1" /> Punch List ({punchStats.total})</TabsTrigger>
              <TabsTrigger value="inspections"><ClipboardCheck className="h-3 w-3 mr-1" /> Inspections ({inspStats.total})</TabsTrigger>
            </TabsList>

            {/* Defects Tab */}
            <TabsContent value="defects" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowDefectDialog(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Log Defect
                </Button>
              </div>
              <Card>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Number</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Severity</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">{t('common.status')}</TableHead>
                        <TableHead className="text-xs">Assigned To</TableHead>
                        <TableHead className="text-xs">Due Date</TableHead>
                        <TableHead className="text-xs">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quality.defects.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No defects logged</TableCell></TableRow>
                      ) : (
                        quality.defects.map(d => (
                          <TableRow key={d.id}>
                            <TableCell className="text-xs font-mono">{d.defect_number}</TableCell>
                            <TableCell className="text-xs font-medium">{d.title}</TableCell>
                            <TableCell><Badge className={cn('text-[10px]', severityColors[d.severity])}>{d.severity}</Badge></TableCell>
                            <TableCell className="text-xs capitalize">{d.category}</TableCell>
                            <TableCell><Badge className={cn('text-[10px]', statusColors[d.status])}>{d.status}</Badge></TableCell>
                            <TableCell className="text-xs">{d.assigned_to || '—'}</TableCell>
                            <TableCell className="text-xs">{d.due_date || '—'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {d.status === 'open' && (
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                                    onClick={() => quality.updateDefect(d.id!, { status: 'resolved', resolved_date: new Date().toISOString().split('T')[0] })}>
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive"
                                  onClick={() => quality.deleteRecord('cpms_defects', d.id!)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Punch List Tab */}
            <TabsContent value="punch" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowPunchDialog(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Punch Item
                </Button>
              </div>
              <Card>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Number</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Area</TableHead>
                        <TableHead className="text-xs">Priority</TableHead>
                        <TableHead className="text-xs">{t('common.status')}</TableHead>
                        <TableHead className="text-xs">Assigned To</TableHead>
                        <TableHead className="text-xs">Due Date</TableHead>
                        <TableHead className="text-xs">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quality.punchLists.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No punch items</TableCell></TableRow>
                      ) : (
                        quality.punchLists.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs font-mono">{p.punch_number}</TableCell>
                            <TableCell className="text-xs font-medium">{p.title}</TableCell>
                            <TableCell className="text-xs">{p.area || '—'}</TableCell>
                            <TableCell><Badge className={cn('text-[10px]', severityColors[p.priority] || 'bg-slate-100 text-slate-800')}>{p.priority}</Badge></TableCell>
                            <TableCell><Badge className={cn('text-[10px]', statusColors[p.status])}>{p.status}</Badge></TableCell>
                            <TableCell className="text-xs">{p.assigned_to || '—'}</TableCell>
                            <TableCell className="text-xs">{p.due_date || '—'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {p.status !== 'completed' && (
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                                    onClick={() => quality.updatePunchItem(p.id!, { status: 'completed', completed_date: new Date().toISOString().split('T')[0] })}>
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive"
                                  onClick={() => quality.deleteRecord('cpms_punch_lists', p.id!)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Inspections Tab */}
            <TabsContent value="inspections" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowInspectionDialog(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Schedule Inspection
                </Button>
              </div>
              <Card>
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Number</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">{t('common.type')}</TableHead>
                        <TableHead className="text-xs">{t('common.status')}</TableHead>
                        <TableHead className="text-xs">Result</TableHead>
                        <TableHead className="text-xs">Score</TableHead>
                        <TableHead className="text-xs">{t('common.date')}</TableHead>
                        <TableHead className="text-xs">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quality.inspections.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No inspections</TableCell></TableRow>
                      ) : (
                        quality.inspections.map(i => (
                          <TableRow key={i.id}>
                            <TableCell className="text-xs font-mono">{i.inspection_number}</TableCell>
                            <TableCell className="text-xs font-medium">{i.title}</TableCell>
                            <TableCell className="text-xs capitalize">{i.type}</TableCell>
                            <TableCell><Badge className={cn('text-[10px]', statusColors[i.status])}>{i.status}</Badge></TableCell>
                            <TableCell>
                              {i.overall_result ? <Badge className={cn('text-[10px]', statusColors[i.overall_result])}>{i.overall_result}</Badge> : '—'}
                            </TableCell>
                            <TableCell className="text-xs">{i.score ?? '—'}</TableCell>
                            <TableCell className="text-xs">{i.scheduled_date || '—'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {i.status === 'scheduled' && (
                                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                                    onClick={() => quality.updateInspection(i.id!, {
                                      status: 'completed', completed_date: new Date().toISOString().split('T')[0],
                                      overall_result: 'pass', score: 85
                                    })}>
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive"
                                  onClick={() => quality.deleteRecord('cpms_inspections', i.id!)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Defect Dialog */}
      <Dialog open={showDefectDialog} onOpenChange={setShowDefectDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Defect</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title *</Label><Input value={defectForm.title || ''} onChange={e => setDefectForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label className="text-xs">{t('common.description')}</Label><Textarea rows={2} value={defectForm.description || ''} onChange={e => setDefectForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={defectForm.severity} onValueChange={v => setDefectForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={defectForm.category} onValueChange={v => setDefectForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workmanship">Workmanship</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Location</Label><Input value={defectForm.location || ''} onChange={e => setDefectForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div><Label className="text-xs">Area</Label><Input value={defectForm.area || ''} onChange={e => setDefectForm(f => ({ ...f, area: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Assigned To</Label><Input value={defectForm.assigned_to || ''} onChange={e => setDefectForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
              <div><Label className="text-xs">Due Date</Label><Input type="date" value={defectForm.due_date || ''} onChange={e => setDefectForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Cost to Fix (SAR)</Label><Input type="number" value={defectForm.cost_to_fix || ''} onChange={e => setDefectForm(f => ({ ...f, cost_to_fix: parseFloat(e.target.value) || 0 }))} /></div>
            <Button onClick={handleCreateDefect} className="w-full">Log Defect</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Punch Item Dialog */}
      <Dialog open={showPunchDialog} onOpenChange={setShowPunchDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Punch Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title *</Label><Input value={punchForm.title || ''} onChange={e => setPunchForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label className="text-xs">{t('common.description')}</Label><Textarea rows={2} value={punchForm.description || ''} onChange={e => setPunchForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Area</Label><Input value={punchForm.area || ''} onChange={e => setPunchForm(f => ({ ...f, area: e.target.value }))} /></div>
              <div><Label className="text-xs">Discipline</Label><Input value={punchForm.discipline || ''} onChange={e => setPunchForm(f => ({ ...f, discipline: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={punchForm.priority} onValueChange={v => setPunchForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Assigned To</Label><Input value={punchForm.assigned_to || ''} onChange={e => setPunchForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Due Date</Label><Input type="date" value={punchForm.due_date || ''} onChange={e => setPunchForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <Button onClick={handleCreatePunch} className="w-full">Create Punch Item</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Schedule Inspection</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title *</Label><Input value={inspForm.title || ''} onChange={e => setInspForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('common.type')}</Label>
                <Select value={inspForm.type} onValueChange={v => setInspForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Scheduled Date</Label><Input type="date" value={inspForm.scheduled_date || ''} onChange={e => setInspForm(f => ({ ...f, scheduled_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Area</Label><Input value={inspForm.area || ''} onChange={e => setInspForm(f => ({ ...f, area: e.target.value }))} /></div>
              <div><Label className="text-xs">Inspector</Label><Input value={inspForm.inspector_name || ''} onChange={e => setInspForm(f => ({ ...f, inspector_name: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">{t('common.notes')}</Label><Textarea rows={2} value={inspForm.notes || ''} onChange={e => setInspForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleCreateInspection} className="w-full">Schedule Inspection</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
