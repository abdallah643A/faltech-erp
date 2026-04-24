import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, CheckCircle2, XCircle, FileQuestion, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { usePrequalAssessments, usePrequalActions } from '@/hooks/useSupplierPortalEnhanced';
import { useSupplierOnboarding } from '@/hooks/useSupplierOnboarding';

const riskColor = (r: string) => r === 'low' ? 'bg-green-500/10 text-green-500' : r === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : r === 'high' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500';

export default function SupplierPrequalification() {
  const { data: assessments = [] } = usePrequalAssessments();
  const { questions } = useSupplierOnboarding();
  const { create, saveAnswers, generateAIRisk, decide } = usePrequalActions();
  const [selected, setSelected] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newApp, setNewApp] = useState({ vendor_name: '', category: '' });
  const [answers, setAnswers] = useState<Record<string, { value: string; score: number }>>({});

  const handleSaveAnswers = async () => {
    if (!selected) return;
    const rows = (questions.data || []).map(q => {
      const a = answers[q.id] || { value: '', score: 0 };
      return {
        question_id: q.id,
        question_text: q.question_en,
        category: q.category,
        answer_value: a.value,
        answer_score: a.score,
        weight: q.weight || 1,
        weighted_score: (a.score || 0) * (q.weight || 1),
      };
    });
    await saveAnswers.mutateAsync({ assessmentId: selected.id, answers: rows });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supplier Prequalification</h2>
          <p className="text-sm text-muted-foreground">Weighted questionnaires with AI risk analysis</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><FileQuestion className="h-4 w-4 mr-2" />New Assessment</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Category</TableHead><TableHead>Score</TableHead><TableHead>Risk</TableHead><TableHead>AI</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {assessments.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assessments yet</TableCell></TableRow> :
                assessments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.vendor_name || a.vendor_id?.slice(0, 8) || '-'}</TableCell>
                    <TableCell>{a.category || '-'}</TableCell>
                    <TableCell>{a.score_pct?.toFixed(1) || '0.0'}%</TableCell>
                    <TableCell><Badge className={riskColor(a.risk_level)}>{a.risk_level || 'unknown'}</Badge></TableCell>
                    <TableCell>{a.ai_generated_at ? <Sparkles className="h-4 w-4 text-purple-500" /> : '-'}</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(a)}>Open</Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New assessment dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Prequalification Assessment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Vendor name</Label><Input value={newApp.vendor_name} onChange={e => setNewApp(p => ({ ...p, vendor_name: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={newApp.category} onChange={e => setNewApp(p => ({ ...p, category: e.target.value }))} placeholder="e.g. construction, IT, services" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await create.mutateAsync(newApp); setCreateOpen(false); setNewApp({ vendor_name: '', category: '' }); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assessment — {selected?.vendor_name || selected?.id?.slice(0, 8)}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{selected.score_pct?.toFixed(1) || 0}%</p><p className="text-xs text-muted-foreground">Score</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><Badge className={riskColor(selected.risk_level)}>{selected.risk_level}</Badge><p className="text-xs text-muted-foreground mt-1">Risk</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-sm font-medium">{selected.ai_recommendation || '-'}</p><p className="text-xs text-muted-foreground">AI Reco</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-sm font-medium">{selected.status}</p><p className="text-xs text-muted-foreground">Status</p></CardContent></Card>
              </div>

              {selected.ai_risk_summary && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" />AI Risk Summary</CardTitle></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{selected.ai_risk_summary}</p></CardContent>
                </Card>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Questionnaire ({(questions.data || []).length} questions)</p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {(questions.data || []).map(q => (
                    <div key={q.id} className="border rounded p-2 space-y-1">
                      <Label className="text-xs">{q.category} • weight {q.weight}</Label>
                      <p className="text-sm">{q.question_en}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Answer" value={answers[q.id]?.value || ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], value: e.target.value, score: p[q.id]?.score || 0 } }))} />
                        <Select value={String(answers[q.id]?.score ?? 0)} onValueChange={v => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], value: p[q.id]?.value || '', score: Number(v) } }))}>
                          <SelectTrigger><SelectValue placeholder="Score 0-5" /></SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={handleSaveAnswers} disabled={saveAnswers.isPending}>Save Answers</Button>
            <Button variant="outline" onClick={() => selected && generateAIRisk.mutate(selected.id)} disabled={generateAIRisk.isPending}>
              {generateAIRisk.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Risk
            </Button>
            <Button variant="default" className="bg-green-600" onClick={() => selected && decide.mutate({ id: selected.id, decision: 'approved' })}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Approve
            </Button>
            <Button variant="destructive" onClick={() => selected && decide.mutate({ id: selected.id, decision: 'rejected' })}>
              <XCircle className="h-4 w-4 mr-2" />Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
