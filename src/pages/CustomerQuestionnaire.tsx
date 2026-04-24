import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Star, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SignoffData {
  id: string;
  title: string;
  contract_number: string | null;
  contract_value: number | null;
  customer_name: string | null;
  questionnaire_submitted_at: string | null;
}

export default function CustomerQuestionnaire() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signoff, setSignoff] = useState<SignoffData | null>(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [salesRating, setSalesRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [installationRating, setInstallationRating] = useState(5);
  const [projectTimeRating, setProjectTimeRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (token) fetchSignoff();
    else { setError('Invalid questionnaire link'); setLoading(false); }
  }, [token]);

  const fetchSignoff = async () => {
    const { data, error: err } = await supabase
      .from('project_signoffs')
      .select('id, title, contract_number, contract_value, customer_name, questionnaire_submitted_at')
      .eq('questionnaire_token', token)
      .single();

    if (err || !data) {
      setError('Questionnaire not found or link has expired');
    } else if (data.questionnaire_submitted_at) {
      setSignoff(data as SignoffData);
      setSubmitted(true);
    } else {
      setSignoff(data as SignoffData);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!signoff) return;
    setSubmitting(true);
    const { error: err } = await supabase
      .from('project_signoffs')
      .update({
        sales_rating: salesRating,
        delivery_rating: deliveryRating,
        installation_rating: installationRating,
        project_time_rating: projectTimeRating,
        customer_feedback: feedback,
        satisfaction_score: Math.round((salesRating + deliveryRating + installationRating + projectTimeRating) / 4),
        questionnaire_submitted_at: new Date().toISOString(),
      })
      .eq('id', signoff.id);

    if (err) {
      setError('Failed to submit. Please try again.');
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const RatingSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-2">
      <Label className="text-base font-semibold">{label}: {value}/10</Label>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">1</span>
        <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={1} max={10} step={1} className="flex-1" />
        <span className="text-xs text-gray-400">10</span>
        <div className="flex items-center gap-1 ml-2">
          <Star className={`h-5 w-5 ${value >= 7 ? 'text-amber-500 fill-amber-500' : value >= 4 ? 'text-amber-400' : 'text-red-400'}`} />
          <span className="font-bold text-lg">{value}</span>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  if (error && !signoff) return (
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
          <p className="text-gray-600">Your feedback has been submitted successfully. We appreciate your time.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Customer Satisfaction Questionnaire</CardTitle>
          {signoff?.contract_number && (
            <p className="text-sm text-gray-500 mt-1">Contract: {signoff.contract_number}</p>
          )}
          {signoff?.customer_name && (
            <p className="text-sm text-gray-500">Customer: {signoff.customer_name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600 text-center">Please rate each aspect of your experience from 1 (Poor) to 10 (Excellent)</p>

          <RatingSlider label="Sales Team" value={salesRating} onChange={setSalesRating} />
          <RatingSlider label="Delivery Team" value={deliveryRating} onChange={setDeliveryRating} />
          <RatingSlider label="Installation Team" value={installationRating} onChange={setInstallationRating} />
          <RatingSlider label="Project Timeline" value={projectTimeRating} onChange={setProjectTimeRating} />

          <div className="space-y-2">
            <Label className="text-base font-semibold">Additional Notes & Feedback</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share any additional comments, suggestions, or concerns..."
              rows={4}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Overall Average:</span>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-xl">
                  {((salesRating + deliveryRating + installationRating + projectTimeRating) / 4).toFixed(1)}/10
                </span>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Submit Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
