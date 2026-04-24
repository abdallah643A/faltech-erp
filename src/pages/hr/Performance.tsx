import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePerformanceCycles, usePerformanceGoals, usePerformanceReviews } from '@/hooks/usePerformance';
import { useCompetencyDefinitions, useCompetencyAssessments, usePerformanceFeedback } from '@/hooks/usePerformanceExpanded';
import { useEmployees } from '@/hooks/useEmployees';
import { Plus, Target, Star, Loader2, Eye, MessageSquare, BarChart3, Award, Users } from 'lucide-react';
import { PerformanceCycleDialog } from '@/components/hr/PerformanceCycleDialog';
import { PerformanceGoalDialog } from '@/components/hr/PerformanceGoalDialog';
import { PerformanceReviewDialog } from '@/components/hr/PerformanceReviewDialog';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const goalColumns: ColumnDef[] = [
  { key: 'title', header: 'Goal' },
  { key: 'description', header: 'Description' },
  { key: 'weight', header: 'Weight' },
  { key: 'target_value', header: 'Target' },
  { key: 'actual_value', header: 'Actual' },
  { key: 'status', header: 'Status' },
];

const RELATIONSHIPS = ['peer', 'manager', 'direct_report', 'self', 'external'];
const COMPETENCY_CATEGORIES = ['technical', 'leadership', 'communication', 'teamwork', 'problem_solving', 'adaptability'];

export default function Performance() {
  const { t } = useLanguage();
  const { cycles, isLoading: cyclesLoading, createCycle } = usePerformanceCycles();
  const { goals, isLoading: goalsLoading } = usePerformanceGoals();
  const { reviews, isLoading: reviewsLoading } = usePerformanceReviews();
  const { employees } = useEmployees();
  const { competencies, createCompetency } = useCompetencyDefinitions();
  const { assessments } = useCompetencyAssessments();
  const { feedback, createFeedback } = usePerformanceFeedback();

  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [competencyDialogOpen, setCompetencyDialogOpen] = useState(false);

  const [fbForm, setFbForm] = useState({ employee_id: '', feedback_from_id: '', relationship: 'peer', rating: '', strengths: '', improvements: '', comments: '', is_anonymous: true });
  const [compForm, setCompForm] = useState({ name: '', category: 'technical', description: '' });

  const activeCycle = cycles.find(c => c.status === 'active');

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Progress</Badge>;
      case 'submitted': return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Submitted</Badge>;
      default: return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getRatingStars = (rating: number | null) => {
    if (!rating) return '-';
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
        ))}
        <span className="ml-1 text-sm">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // Rating distribution for analytics
  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      if (r.overall_rating) dist[Math.min(4, Math.floor(r.overall_rating) - 1)]++;
    });
    return [
      { rating: '1 Star', count: dist[0] },
      { rating: '2 Stars', count: dist[1] },
      { rating: '3 Stars', count: dist[2] },
      { rating: '4 Stars', count: dist[3] },
      { rating: '5 Stars', count: dist[4] },
    ];
  }, [reviews]);

  // Competency radar data
  const radarData = useMemo(() => {
    const byCategory = new Map<string, number[]>();
    assessments.forEach(a => {
      const cat = a.competency?.category || 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(a.level);
    });
    return Array.from(byCategory.entries()).map(([category, levels]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '),
      average: levels.length > 0 ? Math.round((levels.reduce((s, l) => s + l, 0) / levels.length) * 10) / 10 : 0,
      max: 5,
    }));
  }, [assessments]);

  const handleFeedbackSubmit = () => {
    if (!fbForm.employee_id || !fbForm.feedback_from_id) return;
    createFeedback.mutate({
      employee_id: fbForm.employee_id,
      feedback_from_id: fbForm.feedback_from_id,
      relationship: fbForm.relationship,
      rating: fbForm.rating ? parseFloat(fbForm.rating) : undefined,
      strengths: fbForm.strengths || undefined,
      improvements: fbForm.improvements || undefined,
      comments: fbForm.comments || undefined,
      is_anonymous: fbForm.is_anonymous,
    }, {
      onSuccess: () => {
        setFeedbackDialogOpen(false);
        setFbForm({ employee_id: '', feedback_from_id: '', relationship: 'peer', rating: '', strengths: '', improvements: '', comments: '', is_anonymous: true });
      },
    });
  };

  const handleCompetencySubmit = () => {
    if (!compForm.name) return;
    createCompetency.mutate({
      name: compForm.name,
      category: compForm.category,
      description: compForm.description || undefined,
    }, {
      onSuccess: () => {
        setCompetencyDialogOpen(false);
        setCompForm({ name: '', category: 'technical', description: '' });
      },
    });
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Performance Management</h1>
          <p className="text-sm text-muted-foreground">Track goals, reviews, feedback, and competencies</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={goals} columns={goalColumns} filename="performance-goals" title="Performance Goals" />
          <Button variant="outline" size="sm" onClick={() => setCycleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Cycle
          </Button>
        </div>
      </div>

      {activeCycle && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{activeCycle.name}</p>
              <p className="text-sm text-muted-foreground">
                {activeCycle.start_date && format(new Date(activeCycle.start_date), 'MMM d, yyyy')} - {activeCycle.end_date && format(new Date(activeCycle.end_date), 'MMM d, yyyy')}
              </p>
            </div>
            <Badge variant="default">Active Cycle</Badge>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="goals">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="goals" className="gap-1"><Target className="h-3.5 w-3.5" /> Goals ({goals.length})</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1"><Star className="h-3.5 w-3.5" /> Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1"><MessageSquare className="h-3.5 w-3.5" /> 360° Feedback ({feedback.length})</TabsTrigger>
          <TabsTrigger value="competencies" className="gap-1"><Award className="h-3.5 w-3.5" /> Competencies</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
          <TabsTrigger value="cycles">Cycles ({cycles.length})</TabsTrigger>
        </TabsList>

        {/* ── Goals Tab ── */}
        <TabsContent value="goals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Performance Goals</CardTitle>
              <Button size="sm" onClick={() => setGoalDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Goal</Button>
            </CardHeader>
            <CardContent>
              {goalsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                goals.length === 0 ? <p className="text-center text-muted-foreground py-8">No goals defined</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('hr.employee')}</TableHead><TableHead>Goal</TableHead><TableHead>Category</TableHead>
                      <TableHead>Progress</TableHead><TableHead>Due Date</TableHead><TableHead>{t('common.status')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {goals.map(goal => {
                        const progress = goal.target_value && goal.actual_value ? Math.min(100, (goal.actual_value / goal.target_value) * 100) : 0;
                        return (
                          <TableRow key={goal.id}>
                            <TableCell className="text-sm">{goal.employee?.first_name} {goal.employee?.last_name}</TableCell>
                            <TableCell><p className="text-sm font-medium">{goal.title}</p>{goal.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{goal.description}</p>}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{goal.category || '-'}</Badge></TableCell>
                            <TableCell><div className="w-24"><Progress value={progress} className="h-2" /><p className="text-xs text-muted-foreground mt-0.5">{goal.actual_value || 0}/{goal.target_value || 0}</p></div></TableCell>
                            <TableCell className="text-sm">{goal.due_date ? format(new Date(goal.due_date), 'PP') : '-'}</TableCell>
                            <TableCell>{getStatusBadge(goal.status)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reviews Tab ── */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Performance Reviews</CardTitle>
              <Button size="sm" onClick={() => setReviewDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Review</Button>
            </CardHeader>
            <CardContent>
              {reviewsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                reviews.length === 0 ? <p className="text-center text-muted-foreground py-8">No reviews yet</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('hr.employee')}</TableHead><TableHead>Cycle</TableHead><TableHead>Reviewer</TableHead>
                      <TableHead>Rating</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>{t('common.status')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {reviews.map(review => (
                        <TableRow key={review.id}>
                          <TableCell><p className="text-sm font-medium">{review.employee?.first_name} {review.employee?.last_name}</p><p className="text-xs text-muted-foreground">{review.employee?.employee_code}</p></TableCell>
                          <TableCell className="text-sm">{review.cycle?.name || '-'}</TableCell>
                          <TableCell className="text-sm">{review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : '-'}</TableCell>
                          <TableCell>{getRatingStars(review.overall_rating)}</TableCell>
                          <TableCell className="text-sm">{review.review_date ? format(new Date(review.review_date), 'PP') : '-'}</TableCell>
                          <TableCell>{getStatusBadge(review.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 360° Feedback Tab ── */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> 360° Feedback</CardTitle>
              <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Give Feedback</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Give 360° Feedback</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Employee Being Reviewed *</Label>
                      <Select value={fbForm.employee_id} onValueChange={v => setFbForm(f => ({ ...f, employee_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Feedback From *</Label>
                      <Select value={fbForm.feedback_from_id} onValueChange={v => setFbForm(f => ({ ...f, feedback_from_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Relationship</Label>
                        <Select value={fbForm.relationship} onValueChange={v => setFbForm(f => ({ ...f, relationship: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Rating (1-5)</Label>
                        <Input type="number" min={1} max={5} step={0.5} value={fbForm.rating} onChange={e => setFbForm(f => ({ ...f, rating: e.target.value }))} />
                      </div>
                    </div>
                    <div><Label>Strengths</Label><Textarea value={fbForm.strengths} onChange={e => setFbForm(f => ({ ...f, strengths: e.target.value }))} /></div>
                    <div><Label>Areas for Improvement</Label><Textarea value={fbForm.improvements} onChange={e => setFbForm(f => ({ ...f, improvements: e.target.value }))} /></div>
                    <div><Label>Comments</Label><Textarea value={fbForm.comments} onChange={e => setFbForm(f => ({ ...f, comments: e.target.value }))} /></div>
                    <Button onClick={handleFeedbackSubmit} disabled={createFeedback.isPending} className="w-full">
                      {createFeedback.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Submit Feedback
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {feedback.length === 0 ? <p className="text-center text-muted-foreground py-8">No feedback submitted yet</p> : (
                <div className="space-y-3">
                  {feedback.map(fb => (
                    <div key={fb.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">
                            {fb.employee?.first_name} {fb.employee?.last_name}
                            <span className="text-muted-foreground font-normal"> ← </span>
                            {fb.is_anonymous ? 'Anonymous' : `${fb.feedback_from?.first_name} ${fb.feedback_from?.last_name}`}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">{fb.relationship.replace('_', ' ')}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {fb.rating && getRatingStars(fb.rating)}
                          {getStatusBadge(fb.status)}
                        </div>
                      </div>
                      {fb.strengths && <p className="text-xs mt-1"><span className="font-medium text-success">Strengths:</span> {fb.strengths}</p>}
                      {fb.improvements && <p className="text-xs mt-1"><span className="font-medium text-warning">Improvements:</span> {fb.improvements}</p>}
                      {fb.comments && <p className="text-xs mt-1 text-muted-foreground">{fb.comments}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Competencies Tab ── */}
        <TabsContent value="competencies">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" /> Competency Framework</CardTitle>
                <Dialog open={competencyDialogOpen} onOpenChange={setCompetencyDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Competency</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Name *</Label><Input value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div>
                        <Label>Category</Label>
                        <Select value={compForm.category} onValueChange={v => setCompForm(f => ({ ...f, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{COMPETENCY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>{t('common.description')}</Label><Textarea value={compForm.description} onChange={e => setCompForm(f => ({ ...f, description: e.target.value }))} /></div>
                      <Button onClick={handleCompetencySubmit} disabled={createCompetency.isPending} className="w-full">Create Competency</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {competencies.length === 0 ? <p className="text-center text-muted-foreground py-6">No competencies defined</p> : (
                  <div className="space-y-2">
                    {competencies.map(c => (
                      <div key={c.id} className="flex items-center justify-between border rounded p-2">
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs">{c.category.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Competency Radar */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Competency Overview</CardTitle></CardHeader>
              <CardContent>
                {radarData.length === 0 ? <p className="text-center text-muted-foreground py-6">No assessment data yet</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid className="stroke-muted" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
                      <Radar name="Avg Level" dataKey="average" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rating Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Rating Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ratingDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="rating" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Reviews" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Performance Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{goals.length}</p>
                    <p className="text-xs text-muted-foreground">Total Goals</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{goals.filter(g => g.status === 'completed').length}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{reviews.length}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">
                      {reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.overall_rating || 0), 0) / reviews.filter(r => r.overall_rating).length || 0).toFixed(1) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{feedback.length}</p>
                    <p className="text-xs text-muted-foreground">360° Feedback</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{assessments.length}</p>
                    <p className="text-xs text-muted-foreground">Assessments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Cycles Tab ── */}
        <TabsContent value="cycles">
          <Card>
            <CardHeader><CardTitle className="text-sm">Performance Cycles</CardTitle></CardHeader>
            <CardContent>
              {cyclesLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                cycles.length === 0 ? <p className="text-center text-muted-foreground py-8">No cycles defined</p> : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('common.name')}</TableHead><TableHead>Year</TableHead><TableHead>Period</TableHead><TableHead>{t('common.status')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {cycles.map(cycle => (
                        <TableRow key={cycle.id}>
                          <TableCell className="font-medium">{cycle.name}</TableCell>
                          <TableCell>{cycle.year}</TableCell>
                          <TableCell className="text-sm">{cycle.start_date && format(new Date(cycle.start_date), 'PP')} - {cycle.end_date && format(new Date(cycle.end_date), 'PP')}</TableCell>
                          <TableCell><Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>{cycle.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PerformanceCycleDialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen} />
      <PerformanceGoalDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} employees={employees} cycles={cycles} />
      <PerformanceReviewDialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen} employees={employees} cycles={cycles} />
    </div>
  );
}
