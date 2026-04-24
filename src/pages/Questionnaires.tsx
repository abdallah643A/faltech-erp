import { useState } from 'react';
import { useQuestionnaires, useQuestions, useSurveyResponses, useSurveyAnswers } from '@/hooks/useQuestionnaires';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Pencil, Trash2, Send, BarChart3, ClipboardList, Copy, ExternalLink, CheckCircle,
  Clock, Star, AlignLeft, List, ToggleLeft, Loader2, FileText,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const QUESTION_TYPES = [
  { value: 'rating', label: 'Rating (1-10)', icon: Star },
  { value: 'text', label: 'Free Text', icon: AlignLeft },
  { value: 'choice', label: 'Multiple Choice', icon: List },
  { value: 'yes_no', label: 'Yes / No', icon: ToggleLeft },
];

export default function Questionnaires() {
  const { t } = useLanguage();
  const { questionnairesQuery, createQuestionnaire, updateQuestionnaire, deleteQuestionnaire } = useQuestionnaires();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('manage');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendForm, setSendForm] = useState({ respondent_name: '', respondent_email: '', respondent_phone: '', customer_code: '' });

  const { questionsQuery, saveQuestion, deleteQuestion } = useQuestions(selectedId);
  const { responsesQuery, createResponse } = useSurveyResponses(selectedId);

  const submittedResponseIds = (responsesQuery.data || []).filter(r => r.submitted_at).map(r => r.id);
  const answersQuery = useSurveyAnswers(submittedResponseIds);

  const questionnaires = questionnairesQuery.data || [];
  const questions = questionsQuery.data || [];
  const responses = responsesQuery.data || [];
  const answers = answersQuery.data || [];

  const selected = questionnaires.find(q => q.id === selectedId);

  // Form state for questionnaire
  const [formTitle, setFormTitle] = useState('');
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDescAr, setFormDescAr] = useState('');

  // Form state for question
  const [qText, setQText] = useState('');
  const [qTextAr, setQTextAr] = useState('');
  const [qType, setQType] = useState('rating');
  const [qOptions, setQOptions] = useState('');
  const [qRequired, setQRequired] = useState(true);
  const [qOrder, setQOrder] = useState(0);

  const openCreateQuestionnaire = () => {
    setEditingQ(null);
    setFormTitle(''); setFormTitleAr(''); setFormDesc(''); setFormDescAr('');
    setShowFormDialog(true);
  };

  const openEditQuestionnaire = (q: any) => {
    setEditingQ(q);
    setFormTitle(q.title); setFormTitleAr(q.title_ar || ''); setFormDesc(q.description || ''); setFormDescAr(q.description_ar || '');
    setShowFormDialog(true);
  };

  const saveQuestionnaire = async () => {
    const payload = { title: formTitle, title_ar: formTitleAr || null, description: formDesc || null, description_ar: formDescAr || null };
    if (editingQ) {
      await updateQuestionnaire.mutateAsync({ id: editingQ.id, ...payload });
    } else {
      const result = await createQuestionnaire.mutateAsync(payload);
      setSelectedId((result as any).id);
    }
    setShowFormDialog(false);
  };

  const openCreateQuestion = () => {

    setEditingQuestion(null);
    setQText(''); setQTextAr(''); setQType('rating'); setQOptions(''); setQRequired(true); setQOrder(questions.length);
    setShowQuestionDialog(true);
  };

  const openEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setQText(q.question_text); setQTextAr(q.question_text_ar || ''); setQType(q.question_type);
    setQOptions(Array.isArray(q.options) ? q.options.join('\n') : '');
    setQRequired(q.is_required); setQOrder(q.sort_order);
    setShowQuestionDialog(true);
  };

  const handleSaveQuestion = async () => {
    const payload: any = {

      questionnaire_id: selectedId!,
      question_text: qText,
      question_text_ar: qTextAr || null,
      question_type: qType,
      options: qType === 'choice' ? qOptions.split('\n').filter(Boolean) : [],
      is_required: qRequired,
      sort_order: qOrder,
    };
    if (editingQuestion) payload.id = editingQuestion.id;
    await saveQuestion.mutateAsync(payload);
    setShowQuestionDialog(false);
    toast({ title: editingQuestion ? 'Question updated' : 'Question added' });
  };

  const handleSendSurvey = async () => {
    if (!selectedId) return;
    const result = await createResponse.mutateAsync({
      questionnaire_id: selectedId,
      ...sendForm,
    });
    const link = `${window.location.origin}/survey?token=${(result as any).token}`;
    await navigator.clipboard.writeText(link);
    toast({ title: 'Link copied to clipboard', description: link });
    setShowSendDialog(false);
    setSendForm({ respondent_name: '', respondent_email: '', respondent_phone: '', customer_code: '' });
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/survey?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied!' });
  };

  // Reports
  const getQuestionStats = (questionId: string) => {
    const qAnswers = answers.filter(a => a.question_id === questionId);
    const question = questions.find(q => q.id === questionId);
    if (!question || !qAnswers.length) return null;

    if (question.question_type === 'rating') {
      const ratings = qAnswers.map(a => a.answer_rating || 0).filter(Boolean);
      const avg = ratings.reduce((s, v) => s + v, 0) / (ratings.length || 1);
      return { type: 'rating', avg: avg.toFixed(1), count: ratings.length, distribution: Array.from({ length: 10 }, (_, i) => ratings.filter(r => r === i + 1).length) };
    }
    if (question.question_type === 'yes_no') {
      const yes = qAnswers.filter(a => a.answer_choice === 'yes').length;
      const no = qAnswers.filter(a => a.answer_choice === 'no').length;
      return { type: 'yes_no', yes, no, total: qAnswers.length };
    }
    if (question.question_type === 'choice') {
      const choices: Record<string, number> = {};
      qAnswers.forEach(a => { if (a.answer_choice) choices[a.answer_choice] = (choices[a.answer_choice] || 0) + 1; });
      return { type: 'choice', choices, total: qAnswers.length };
    }
    return { type: 'text', responses: qAnswers.map(a => a.answer_text).filter(Boolean) };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questionnaires</h1>
          <p className="text-sm text-muted-foreground">Create surveys, send to customers, and view reports</p>
        </div>
        <Button onClick={openCreateQuestionnaire}><Plus className="h-4 w-4 mr-2" />New Questionnaire</Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: List */}
        <div className="col-span-4 space-y-2">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">All Questionnaires</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {questionnaires.map(q => (
                <div
                  key={q.id}
                  onClick={() => { setSelectedId(q.id); setActiveTab('manage'); }}
                  className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedId === q.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{q.title}</span>
                    <Badge variant={q.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {q.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {q.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{q.description}</p>}
                </div>
              ))}
              {questionnaires.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No questionnaires yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Detail */}
        <div className="col-span-8">
          {!selected ? (
            <Card className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Select a questionnaire to manage</p>
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-3 px-4 flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selected.title}</CardTitle>
                  {selected.description && <p className="text-xs text-muted-foreground">{selected.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditQuestionnaire(selected)}><Pencil className="h-3 w-3 mr-1" />{t('common.edit')}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowSendDialog(true); }}><Send className="h-3 w-3 mr-1" />Send</Button>
                  <Button size="sm" variant="destructive" onClick={() => { deleteQuestionnaire.mutate(selected.id); setSelectedId(null); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
                    <TabsTrigger value="manage"><ClipboardList className="h-3 w-3 mr-1" />Questions</TabsTrigger>
                    <TabsTrigger value="responses"><Send className="h-3 w-3 mr-1" />Responses ({responses.length})</TabsTrigger>
                    <TabsTrigger value="reports"><BarChart3 className="h-3 w-3 mr-1" />Reports</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manage" className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Questions ({questions.length})</h3>
                      <Button size="sm" onClick={openCreateQuestion}><Plus className="h-3 w-3 mr-1" />Add Question</Button>
                    </div>
                    {questions.map((q, i) => (
                      <Card key={q.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{q.question_type}</Badge>
                              {q.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                              <span className="text-xs text-muted-foreground">#{q.sort_order + 1}</span>
                            </div>
                            <p className="font-medium text-sm mt-1">{q.question_text}</p>
                            {q.question_text_ar && <p className="text-xs text-muted-foreground mt-0.5 dir-rtl">{q.question_text_ar}</p>}
                            {q.question_type === 'choice' && Array.isArray(q.options) && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {q.options.map((o: string, j: number) => (
                                  <Badge key={j} variant="secondary" className="text-[10px]">{o}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditQuestion(q)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteQuestion.mutate(q.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {questions.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Add questions to this questionnaire</p>}
                  </TabsContent>

                  <TabsContent value="responses" className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('common.name')}</TableHead>
                          <TableHead>{t('common.email')}</TableHead>
                          <TableHead>{t('common.phone')}</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {responses.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.respondent_name || '—'}</TableCell>
                            <TableCell>{r.respondent_email || '—'}</TableCell>
                            <TableCell>{r.respondent_phone || '—'}</TableCell>
                            <TableCell>
                              {r.submitted_at ? (
                                <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Submitted</Badge>
                              ) : (
                                <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('common.pending')}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{format(new Date(r.created_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyLink(r.token)}><Copy className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(`/survey?token=${r.token}`, '_blank')}><ExternalLink className="h-3 w-3" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {responses.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No responses sent yet</p>}
                  </TabsContent>

                  <TabsContent value="reports" className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold">{responses.length}</p>
                        <p className="text-xs text-muted-foreground">Total Sent</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{responses.filter(r => r.submitted_at).length}</p>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                          {responses.length > 0 ? Math.round((responses.filter(r => r.submitted_at).length / responses.length) * 100) : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Response Rate</p>
                      </Card>
                    </div>

                    {questions.map(q => {
                      const stats = getQuestionStats(q.id);
                      if (!stats) return (
                        <Card key={q.id} className="p-3">
                          <p className="font-medium text-sm">{q.question_text}</p>
                          <p className="text-xs text-muted-foreground">No responses yet</p>
                        </Card>
                      );

                      return (
                        <Card key={q.id} className="p-4">
                          <p className="font-medium text-sm mb-2">{q.question_text}</p>
                          {stats.type === 'rating' && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                <span className="text-2xl font-bold">{(stats as any).avg}</span>
                                <span className="text-sm text-muted-foreground">/ 10 ({(stats as any).count} responses)</span>
                              </div>
                              <div className="flex gap-1 items-end h-12">
                                {(stats as any).distribution.map((count: number, i: number) => (
                                  <div key={i} className="flex-1 flex flex-col items-center">
                                    <div
                                      className="w-full bg-primary/20 rounded-t"
                                      style={{ height: `${Math.max(4, (count / Math.max(...(stats as any).distribution, 1)) * 40)}px` }}
                                    />
                                    <span className="text-[9px] text-muted-foreground">{i + 1}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {stats.type === 'yes_no' && (
                            <div className="flex gap-4">
                              <div className="flex items-center gap-1">
                                <div className="h-3 rounded bg-green-500" style={{ width: `${((stats as any).yes / (stats as any).total) * 100}px` }} />
                                <span className="text-sm">Yes: {(stats as any).yes}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="h-3 rounded bg-red-400" style={{ width: `${((stats as any).no / (stats as any).total) * 100}px` }} />
                                <span className="text-sm">No: {(stats as any).no}</span>
                              </div>
                            </div>
                          )}
                          {stats.type === 'choice' && (
                            <div className="space-y-1">
                              {Object.entries((stats as any).choices).map(([choice, count]) => (
                                <div key={choice} className="flex items-center gap-2">
                                  <div className="h-2 rounded bg-primary/60" style={{ width: `${((count as number) / (stats as any).total) * 120}px` }} />
                                  <span className="text-xs">{choice}: {count as number}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {stats.type === 'text' && (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {(stats as any).responses.map((t: string, i: number) => (
                                <p key={i} className="text-xs bg-muted p-2 rounded">{t}</p>
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Questionnaire Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingQ ? 'Edit Questionnaire' : 'New Questionnaire'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title (EN)</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} /></div>
            <div><Label>Title (AR)</Label><Input value={formTitleAr} onChange={e => setFormTitleAr(e.target.value)} dir="rtl" /></div>
            <div><Label>Description (EN)</Label><Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} /></div>
            <div><Label>Description (AR)</Label><Textarea value={formDescAr} onChange={e => setFormDescAr(e.target.value)} rows={2} dir="rtl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveQuestionnaire} disabled={!formTitle}>{editingQ ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Form Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Question (EN)</Label><Input value={qText} onChange={e => setQText(e.target.value)} /></div>
            <div><Label>Question (AR)</Label><Input value={qTextAr} onChange={e => setQTextAr(e.target.value)} dir="rtl" /></div>
            <div>
              <Label>{t('common.type')}</Label>
              <Select value={qType} onValueChange={setQType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {qType === 'choice' && (
              <div><Label>Options (one per line)</Label><Textarea value={qOptions} onChange={e => setQOptions(e.target.value)} rows={4} placeholder="Option 1&#10;Option 2&#10;Option 3" /></div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={qRequired} onCheckedChange={setQRequired} />
              <Label>Required</Label>
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={qOrder} onChange={e => setQOrder(Number(e.target.value))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveQuestion} disabled={!qText}>{editingQuestion ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Questionnaire</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Create a unique survey link for a customer. The link will be copied to your clipboard.</p>
          <div className="space-y-3">
            <div><Label>Customer Name</Label><Input value={sendForm.respondent_name} onChange={e => setSendForm(f => ({ ...f, respondent_name: e.target.value }))} /></div>
            <div><Label>{t('common.email')}</Label><Input value={sendForm.respondent_email} onChange={e => setSendForm(f => ({ ...f, respondent_email: e.target.value }))} /></div>
            <div><Label>{t('common.phone')}</Label><Input value={sendForm.respondent_phone} onChange={e => setSendForm(f => ({ ...f, respondent_phone: e.target.value }))} /></div>
            <div><Label>Customer Code</Label><Input value={sendForm.customer_code} onChange={e => setSendForm(f => ({ ...f, customer_code: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSendSurvey}><Send className="h-4 w-4 mr-2" />Generate & Copy Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
