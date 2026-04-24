import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCustomerFeedback } from '@/hooks/useCustomerFeedback';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Plus, Star, ThumbsUp, ThumbsDown, Minus, AlertTriangle } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Customer Feedback', ar: 'ملاحظات العملاء' },
  newFeedback: { en: 'New Feedback', ar: 'ملاحظة جديدة' },
  customer: { en: 'Customer Name', ar: 'اسم العميل' },
  rating: { en: 'Rating', ar: 'التقييم' },
  type: { en: 'Type', ar: 'النوع' },
  comments: { en: 'Comments', ar: 'التعليقات' },
  submit: { en: 'Submit', ar: 'إرسال' },
  resolve: { en: 'Resolve', ar: 'حل' },
  avgRating: { en: 'Avg Rating', ar: 'متوسط التقييم' },
  escalated: { en: 'Escalated', ar: 'مصعد' },
  all: { en: 'All', ar: 'الكل' },
};

const sentimentIcons: Record<string, any> = { positive: ThumbsUp, neutral: Minus, negative: ThumbsDown };
const sentimentColors: Record<string, string> = { positive: 'text-green-600', neutral: 'text-yellow-600', negative: 'text-red-600' };
const typeOptions = ['general', 'service', 'product', 'speed', 'cleanliness', 'staff', 'other'];

export default function CustomerFeedbackPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const { feedback, isLoading, stats, submitFeedback, resolveFeedback } = useCustomerFeedback({ sentiment: sentimentFilter });
  const [form, setForm] = useState({ customer_name: '', rating: 5, feedback_type: 'general', feedback_text: '' });

  const handleSubmit = () => {
    submitFeedback.mutate(form);
    setOpen(false);
    setForm({ customer_name: '', rating: 5, feedback_type: 'general', feedback_text: '' });
  };

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6" />{t.title[lang]}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t.newFeedback[lang]}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.newFeedback[lang]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t.customer[lang]}</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label>{t.rating[lang]}</Label>
                <div className="flex gap-1">{[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setForm(p => ({ ...p, rating: r }))} className="p-1">
                    <Star className={`h-6 w-6 ${r <= form.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}</div>
              </div>
              <div><Label>{t.type[lang]}</Label><Select value={form.feedback_type} onValueChange={v => setForm(p => ({ ...p, feedback_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t.comments[lang]}</Label><Textarea value={form.feedback_text} onChange={e => setForm(p => ({ ...p, feedback_text: e.target.value }))} /></div>
              <Button onClick={handleSubmit} className="w-full">{t.submit[lang]}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" /><p className="text-2xl font-bold">{stats.avgRating}</p><p className="text-xs text-muted-foreground">{t.avgRating[lang]}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><ThumbsUp className="h-5 w-5 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold">{stats.positive}</p><p className="text-xs text-muted-foreground">Positive</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><ThumbsDown className="h-5 w-5 mx-auto mb-1 text-red-600" /><p className="text-2xl font-bold">{stats.negative}</p><p className="text-xs text-muted-foreground">Negative</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-600" /><p className="text-2xl font-bold">{stats.escalated}</p><p className="text-xs text-muted-foreground">{t.escalated[lang]}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {['all', 'positive', 'neutral', 'negative'].map(s => (
          <Button key={s} variant={sentimentFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setSentimentFilter(s)}>{s === 'all' ? t.all[lang] : s}</Button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? <p>Loading...</p> : feedback.map(fb => {
          const SIcon = sentimentIcons[fb.sentiment || 'neutral'];
          return (
            <Card key={fb.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <SIcon className={`h-5 w-5 mt-1 ${sentimentColors[fb.sentiment || 'neutral']}`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">{[1, 2, 3, 4, 5].map(r => <Star key={r} className={`h-3 w-3 ${r <= (fb.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />)}</div>
                        <Badge variant="outline">{fb.feedback_type}</Badge>
                        {fb.is_escalated && !fb.resolved && <Badge variant="destructive">Escalated</Badge>}
                        {fb.resolved && <Badge className="bg-green-100 text-green-800">Resolved</Badge>}
                      </div>
                      <p className="text-sm font-medium">{fb.customer_name || 'Anonymous'}</p>
                      {fb.feedback_text && <p className="text-xs text-muted-foreground mt-1">{fb.feedback_text}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(fb.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {fb.is_escalated && !fb.resolved && (
                    <Button size="sm" variant="outline" onClick={() => resolveFeedback.mutate({ id: fb.id })}>{t.resolve[lang]}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
