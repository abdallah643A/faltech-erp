import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Question {
  id: string;
  question_text: string;
  question_text_ar: string | null;
  question_type: string;
  options: string[];
  sort_order: number;
  is_required: boolean;
}

export default function PublicSurvey() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responseId, setResponseId] = useState('');
  const [answers, setAnswers] = useState<Record<string, { text?: string; rating?: number; choice?: string }>>({});

  useEffect(() => {
    if (token) fetchSurvey();
    else { setError('Invalid survey link'); setLoading(false); }
  }, [token]);

  const fetchSurvey = async () => {
    try {
      // Get response by token
      const { data: response, error: rErr } = await supabase
        .from('survey_responses')
        .select('id, questionnaire_id, submitted_at')
        .eq('token', token)
        .single();

      if (rErr || !response) { setError('Survey not found or link has expired'); setLoading(false); return; }
      if (response.submitted_at) { setSubmitted(true); setLoading(false); return; }

      setResponseId(response.id);

      // Get questionnaire
      const { data: questionnaire } = await supabase
        .from('survey_questionnaires')
        .select('title, title_ar, description, description_ar')
        .eq('id', response.questionnaire_id)
        .single();

      if (questionnaire) {
        setTitle(questionnaire.title);
        setDescription(questionnaire.description || '');
      }

      // Get questions
      const { data: qs } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('questionnaire_id', response.questionnaire_id)
        .order('sort_order');

      setQuestions((qs || []) as Question[]);

      // Initialize answers
      const init: Record<string, any> = {};
      (qs || []).forEach((q: any) => {
        if (q.question_type === 'rating') init[q.id] = { rating: 5 };
        else if (q.question_type === 'yes_no') init[q.id] = { choice: '' };
        else if (q.question_type === 'choice') init[q.id] = { choice: '' };
        else init[q.id] = { text: '' };
      });
      setAnswers(init);
    } catch {
      setError('Failed to load survey');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    // Validate required
    for (const q of questions) {
      if (q.is_required) {
        const a = answers[q.id];
        if (!a) { setError(`Please answer: ${q.question_text}`); return; }
        if (q.question_type === 'text' && !a.text) { setError(`Please answer: ${q.question_text}`); return; }
        if ((q.question_type === 'choice' || q.question_type === 'yes_no') && !a.choice) { setError(`Please answer: ${q.question_text}`); return; }
      }
    }

    setSubmitting(true);
    setError('');

    // Insert answers
    const answerRows = questions.map(q => ({
      response_id: responseId,
      question_id: q.id,
      answer_text: answers[q.id]?.text || null,
      answer_rating: answers[q.id]?.rating || null,
      answer_choice: answers[q.id]?.choice || null,
    }));

    const { error: aErr } = await supabase.from('survey_answers').insert(answerRows as any);
    if (aErr) { setError('Failed to submit. Please try again.'); setSubmitting(false); return; }

    // Mark response as submitted
    await supabase.from('survey_responses').update({ submitted_at: new Date().toISOString() } as any).eq('id', responseId);

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  if (error && !questions.length) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold mb-2">Thank You!</h2>
          <p className="text-gray-600">Your feedback has been submitted successfully.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <img src="/images/alrajhi-logo.png" alt="Logo" className="h-12 mx-auto mb-2" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2 p-4 border rounded-lg">
              <Label className="text-base font-semibold">
                {i + 1}. {q.question_text}
                {q.is_required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {q.question_text_ar && <p className="text-xs text-gray-400 dir-rtl">{q.question_text_ar}</p>}

              {q.question_type === 'rating' && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-gray-400">1</span>
                  <Slider
                    value={[answers[q.id]?.rating || 5]}
                    onValueChange={v => setAnswers(a => ({ ...a, [q.id]: { ...a[q.id], rating: v[0] } }))}
                    min={1} max={10} step={1} className="flex-1"
                  />
                  <span className="text-xs text-gray-400">10</span>
                  <div className="flex items-center gap-1 ml-2">
                    <Star className={`h-5 w-5 ${(answers[q.id]?.rating || 5) >= 7 ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                    <span className="font-bold text-lg">{answers[q.id]?.rating || 5}</span>
                  </div>
                </div>
              )}

              {q.question_type === 'text' && (
                <Textarea
                  value={answers[q.id]?.text || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: { ...a[q.id], text: e.target.value } }))}
                  placeholder="Type your answer..."
                  rows={3}
                />
              )}

              {q.question_type === 'yes_no' && (
                <RadioGroup
                  value={answers[q.id]?.choice || ''}
                  onValueChange={v => setAnswers(a => ({ ...a, [q.id]: { ...a[q.id], choice: v } }))}
                  className="flex gap-4 pt-2"
                >
                  <div className="flex items-center gap-2"><RadioGroupItem value="yes" id={`${q.id}-yes`} /><Label htmlFor={`${q.id}-yes`}>Yes</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="no" id={`${q.id}-no`} /><Label htmlFor={`${q.id}-no`}>No</Label></div>
                </RadioGroup>
              )}

              {q.question_type === 'choice' && Array.isArray(q.options) && (
                <RadioGroup
                  value={answers[q.id]?.choice || ''}
                  onValueChange={v => setAnswers(a => ({ ...a, [q.id]: { ...a[q.id], choice: v } }))}
                  className="space-y-2 pt-2"
                >
                  {q.options.map((opt: string, j: number) => (
                    <div key={j} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`${q.id}-${j}`} />
                      <Label htmlFor={`${q.id}-${j}`}>{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Submit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
