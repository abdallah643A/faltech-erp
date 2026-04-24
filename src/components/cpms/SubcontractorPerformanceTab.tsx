import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Star, Plus, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const RECOMMENDATIONS = ['Excellent - Use Again', 'Good', 'Acceptable', 'Do Not Use'] as const;
const CATEGORIES = ['schedule', 'quality', 'safety', 'financial', 'communication'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  schedule: 'Schedule Performance',
  quality: 'Quality of Work',
  safety: 'Safety Compliance',
  financial: 'Financial Reliability',
  communication: 'Communication',
};

function StarInput({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-7 w-7' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sz} ${i <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'} ${onChange ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  );
}

function ScoreGauge({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-destructive';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score.toFixed(0)}/{max}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getTrend(reviews: any[]): 'up' | 'down' | 'stable' {
  if (reviews.length < 2) return 'stable';
  const sorted = [...reviews].sort((a, b) => new Date(a.review_date).getTime() - new Date(b.review_date).getTime());
  const recent = sorted.slice(-3);
  const older = sorted.slice(0, Math.max(1, sorted.length - 3));
  const recentAvg = recent.reduce((s: number, r: any) => s + Number(r.overall_rating), 0) / recent.length;
  const olderAvg = older.reduce((s: number, r: any) => s + Number(r.overall_rating), 0) / older.length;
  if (recentAvg > olderAvg + 0.2) return 'up';
  if (recentAvg < olderAvg - 0.2) return 'down';
  return 'stable';
}

interface SubPerformanceTabProps {
  subcontractorId: string;
  subcontractorName: string;
  projects: any[];
}

export default function SubcontractorPerformanceTab({ subcontractorId, subcontractorName, projects }: SubPerformanceTabProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['sub-reviews', subcontractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpms_subcontractor_reviews')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('review_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subData } = useQuery({
    queryKey: ['sub-detail', subcontractorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('cpms_subcontractors')
        .select('*')
        .eq('id', subcontractorId)
        .single();
      return data;
    },
  });

  const createReview = useMutation({
    mutationFn: async (review: any) => {
      const { error } = await supabase.from('cpms_subcontractor_reviews').insert({
        ...review,
        subcontractor_id: subcontractorId,
        reviewer_id: profile?.user_id,
        reviewer_name: profile?.full_name || 'Unknown',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-reviews', subcontractorId] });
      queryClient.invalidateQueries({ queryKey: ['sub-detail', subcontractorId] });
      queryClient.invalidateQueries({ queryKey: ['cpms-subcontractors'] });
      toast.success('Performance review saved');
      setShowReviewDialog(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const overallRating = Number(subData?.overall_performance_rating || 0);
  const trend = getTrend(reviews);

  // Chart data
  const chartData = useMemo(() => {
    return [...reviews]
      .sort((a, b) => new Date(a.review_date).getTime() - new Date(b.review_date).getTime())
      .map(r => ({
        date: format(new Date(r.review_date), 'MMM yy'),
        Schedule: r.schedule_rating,
        Quality: r.quality_rating,
        Safety: r.safety_rating,
        Financial: r.financial_rating,
        Communication: r.communication_rating,
        Overall: Number(r.overall_rating),
      }));
  }, [reviews]);

  const [form, setForm] = useState({
    project_id: '',
    review_date: new Date().toISOString().split('T')[0],
    schedule_rating: 3,
    quality_rating: 3,
    safety_rating: 3,
    financial_rating: 3,
    communication_rating: 3,
    strengths: '',
    areas_for_improvement: '',
    recommendation: 'Good',
  });

  const formOverall = ((form.schedule_rating + form.quality_rating + form.safety_rating + form.financial_rating + form.communication_rating) / 5).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Overall Performance Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground mb-2">Overall Rating</p>
            <div className="text-4xl font-bold mb-2">{overallRating.toFixed(1)}</div>
            <StarInput value={Math.round(overallRating)} size="lg" />
            <div className="flex items-center gap-1 mt-3">
              {trend === 'up' && <><TrendingUp className="h-4 w-4 text-emerald-500" /><span className="text-sm text-emerald-600">Improving</span></>}
              {trend === 'down' && <><TrendingDown className="h-4 w-4 text-destructive" /><span className="text-sm text-destructive">Declining</span></>}
              {trend === 'stable' && <><Minus className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Stable</span></>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{subData?.total_reviews || 0} reviews</p>
            {subData?.recommendation && (
              <Badge className={`mt-2 ${subData.recommendation === 'Excellent - Use Again' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                subData.recommendation === 'Do Not Use' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}`} variant="outline">
                {subData.recommendation}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Performance Scores</CardTitle>
              <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Review</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Performance Review - {subcontractorName}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Project</Label>
                        <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                          <SelectContent>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id!}>{p.project_number || p.code} - {p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Review Date</Label>
                        <Input type="date" value={form.review_date} onChange={e => setForm({ ...form, review_date: e.target.value })} />
                      </div>
                    </div>

                    <Separator />
                    <p className="text-sm font-semibold">Ratings (1-5)</p>

                    {CATEGORIES.map(cat => (
                      <div key={cat} className="flex items-center justify-between">
                        <Label className="text-sm">{CATEGORY_LABELS[cat]}</Label>
                        <StarInput value={form[`${cat}_rating` as keyof typeof form] as number} onChange={v => setForm({ ...form, [`${cat}_rating`]: v })} />
                      </div>
                    ))}

                    <Card className="bg-muted/30">
                      <CardContent className="pt-3 flex justify-between items-center">
                        <span className="text-sm font-medium">Overall Rating</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold">{formOverall}</span>
                          <StarInput value={Math.round(Number(formOverall))} size="sm" />
                        </div>
                      </CardContent>
                    </Card>

                    <div>
                      <Label>Strengths</Label>
                      <Textarea value={form.strengths} onChange={e => setForm({ ...form, strengths: e.target.value })} rows={2} placeholder="What did they do well?" />
                    </div>
                    <div>
                      <Label>Areas for Improvement</Label>
                      <Textarea value={form.areas_for_improvement} onChange={e => setForm({ ...form, areas_for_improvement: e.target.value })} rows={2} placeholder="Where can they improve?" />
                    </div>
                    <div>
                      <Label>Recommendation</Label>
                      <Select value={form.recommendation} onValueChange={v => setForm({ ...form, recommendation: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RECOMMENDATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => createReview.mutate({
                        ...form,
                        project_id: form.project_id || null,
                      })}
                      disabled={createReview.isPending}
                    >
                      Save Review
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScoreGauge label="Schedule" score={Number(subData?.schedule_score || 0)} />
            <ScoreGauge label="Quality" score={Number(subData?.quality_score || 0)} />
            <ScoreGauge label="Safety" score={Number(subData?.safety_score || 0)} />
            <ScoreGauge label="Financial" score={Number(subData?.financial_score || 0)} />
            <ScoreGauge label="Communication" score={Number(subData?.communication_score || 0)} />
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Performance Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Overall" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Schedule" stroke="hsl(142, 71%, 45%)" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="Quality" stroke="hsl(217, 91%, 60%)" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="Safety" stroke="hsl(45, 93%, 47%)" strokeWidth={1.5} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Review History ({reviews.length})</CardTitle></CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No performance reviews yet. Add the first review above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  <TableHead className="text-center">Schedule</TableHead>
                  <TableHead className="text-center">Quality</TableHead>
                  <TableHead className="text-center">Safety</TableHead>
                  <TableHead className="text-center">Financial</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.review_date}</TableCell>
                    <TableCell className="text-sm">{r.reviewer_name || '—'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold">{Number(r.overall_rating).toFixed(1)}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{r.schedule_rating}</TableCell>
                    <TableCell className="text-center">{r.quality_rating}</TableCell>
                    <TableCell className="text-center">{r.safety_rating}</TableCell>
                    <TableCell className="text-center">{r.financial_rating}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        r.recommendation === 'Excellent - Use Again' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        r.recommendation === 'Do Not Use' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        r.recommendation === 'Acceptable' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : ''
                      }>
                        {r.recommendation}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
