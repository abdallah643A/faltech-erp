import { useState } from 'react';
import { useSupplierOnboarding, type OnboardingApp } from '@/hooks/useSupplierOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { UserPlus, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColor: Record<OnboardingApp['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline', submitted: 'secondary', under_review: 'secondary',
  approved: 'default', rejected: 'destructive', active: 'default',
};

export default function SupplierOnboardingWizard() {
  const { t } = useLanguage();
  const { apps, questions, create, update, submit, review } = useSupplierOnboarding();
  const [tab, setTab] = useState<'all' | OnboardingApp['status']>('all');
  const [editing, setEditing] = useState<OnboardingApp | null>(null);
  const [creating, setCreating] = useState(false);
  const [newApp, setNewApp] = useState({ legal_name: '', trade_name: '', contact_name: '', contact_email: '', contact_phone: '', category: '', country: '' });

  const filtered = (apps.data || []).filter(a => tab === 'all' || a.status === tab);

  const computeScore = (answers: Record<string, any>) => {
    const qs = questions.data || [];
    let total = 0, weight = 0;
    qs.forEach(q => {
      const v = answers[q.id];
      if (v == null || v === '') return;
      weight += q.weight;
      if (q.answer_type === 'boolean') total += (v === true || v === 'true') ? q.weight : 0;
      else if (q.answer_type === 'number') total += Math.min(1, Number(v) / 100) * q.weight;
      else total += q.weight; // any answer counts
    });
    return weight > 0 ? Math.round((total / weight) * 100) : 0;
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><UserPlus className="h-5 w-5" />{t('proc.onboard.title')}</span>
            <Button size="sm" onClick={() => setCreating(true)}>{t('proc.onboard.newApp')}</Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('proc.onboard.subtitle')}</p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="under_review">Review</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {!filtered.length ? (
                <div className="text-center text-muted-foreground py-8">{t('proc.onboard.noApps')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.created')}</TableHead>
                      <TableHead>{t('proc.onboard.legalName')}</TableHead>
                      <TableHead>{t('proc.onboard.category')}</TableHead>
                      <TableHead>{t('proc.onboard.step')}</TableHead>
                      <TableHead>{t('proc.onboard.score')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{format(new Date(a.created_at), 'yyyy-MM-dd')}</TableCell>
                        <TableCell><div className="font-medium">{a.legal_name}</div><div className="text-xs text-muted-foreground">{a.contact_email}</div></TableCell>
                        <TableCell>{a.category || '—'}</TableCell>
                        <TableCell><div className="w-24"><Progress value={(a.current_step / a.total_steps) * 100} /></div></TableCell>
                        <TableCell className="tabular-nums">{a.qualification_score?.toFixed(0) ?? '—'}</TableCell>
                        <TableCell><Badge variant={statusColor[a.status]}>{a.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditing(a)} className="gap-1"><FileText className="h-3.5 w-3.5" />{t('proc.onboard.open')}</Button>
                            {(a.status === 'submitted' || a.status === 'under_review') && (
                              <>
                                <Button size="sm" onClick={() => review.mutate({ id: a.id, decision: 'approved' })} className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{t('common.approved')}</Button>
                                <Button size="sm" variant="destructive" onClick={() => review.mutate({ id: a.id, decision: 'rejected', reason: 'Insufficient documentation' })} className="gap-1"><XCircle className="h-3.5 w-3.5" />{t('common.rejected')}</Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('proc.onboard.newApp')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t('proc.onboard.legalName')} *</Label><Input value={newApp.legal_name} onChange={(e) => setNewApp({ ...newApp, legal_name: e.target.value })} /></div>
            <div><Label>{t('proc.onboard.tradeName')}</Label><Input value={newApp.trade_name} onChange={(e) => setNewApp({ ...newApp, trade_name: e.target.value })} /></div>
            <div><Label>{t('proc.onboard.contactName')}</Label><Input value={newApp.contact_name} onChange={(e) => setNewApp({ ...newApp, contact_name: e.target.value })} /></div>
            <div><Label>{t('proc.onboard.email')}</Label><Input type="email" value={newApp.contact_email} onChange={(e) => setNewApp({ ...newApp, contact_email: e.target.value })} /></div>
            <div><Label>{t('proc.onboard.phone')}</Label><Input value={newApp.contact_phone} onChange={(e) => setNewApp({ ...newApp, contact_phone: e.target.value })} /></div>
            <div><Label>{t('proc.onboard.category')}</Label><Input value={newApp.category} onChange={(e) => setNewApp({ ...newApp, category: e.target.value })} /></div>
            <div><Label>{t('proc.onboard.country')}</Label><Input value={newApp.country} onChange={(e) => setNewApp({ ...newApp, country: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>{t('common.close')}</Button>
            <Button disabled={!newApp.legal_name} onClick={() => create.mutate(newApp as any, { onSuccess: () => { setCreating(false); setNewApp({ legal_name: '', trade_name: '', contact_name: '', contact_email: '', contact_phone: '', category: '', country: '' }); } })}>{t('proc.onboard.createDraft')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Application — {editing?.legal_name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs">Status</Label><div><Badge variant={statusColor[editing.status]}>{editing.status}</Badge></div></div>
                <div><Label className="text-xs">Score</Label><div className="font-medium">{editing.qualification_score?.toFixed(0) ?? '—'}</div></div>
              </div>
              <div className="space-y-2">
                <Label>{t('proc.onboard.questionnaire')}</Label>
                {(questions.data || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">{t('proc.onboard.noQuestions')}</div>
                ) : (questions.data || []).map(q => (
                  <div key={q.id} className="border rounded p-2">
                    <Label className="text-xs">{q.question_en} {q.is_required && <span className="text-destructive">*</span>}</Label>
                    {q.answer_type === 'boolean' ? (
                      <select className="w-full h-8 border rounded text-sm"
                        value={editing.answers?.[q.id] ?? ''}
                        onChange={(e) => setEditing({ ...editing, answers: { ...editing.answers, [q.id]: e.target.value === 'true' } })}>
                        <option value="">—</option><option value="true">Yes</option><option value="false">No</option>
                      </select>
                    ) : q.answer_type === 'number' ? (
                      <Input type="number" value={editing.answers?.[q.id] ?? ''} onChange={(e) => setEditing({ ...editing, answers: { ...editing.answers, [q.id]: e.target.value } })} />
                    ) : (
                      <Textarea rows={2} value={editing.answers?.[q.id] ?? ''} onChange={(e) => setEditing({ ...editing, answers: { ...editing.answers, [q.id]: e.target.value } })} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('common.close')}</Button>
            {editing && editing.status === 'draft' && (
              <>
                <Button variant="secondary" onClick={() => update.mutate({ id: editing.id, answers: editing.answers })}>{t('proc.onboard.saveDraft')}</Button>
                <Button onClick={() => { const score = computeScore(editing.answers); submit.mutate({ id: editing.id, answers: editing.answers, score }, { onSuccess: () => setEditing(null) }); }}>{t('proc.onboard.submitReview')}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
