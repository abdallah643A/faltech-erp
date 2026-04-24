import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LifeBuoy, CheckCircle } from 'lucide-react';

export default function PortalSubmitServiceRequest() {
  const { slug } = useParams();
  const [portalId, setPortalId] = useState<string>('');
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', severity: 'normal', email: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Resolve portal id from slug on first interaction
  const ensurePortal = async () => {
    if (portalId) return portalId;
    const { data } = await supabase.from('client_portals').select('id').eq('portal_slug', slug).maybeSingle();
    if (!data) { toast.error('Portal not found'); return ''; }
    setPortalId(data.id);
    return data.id;
  };

  const submit = async () => {
    if (!form.subject) return toast.error('Subject required');
    setLoading(true);
    try {
      const pid = await ensurePortal();
      if (!pid) return;
      const { error } = await supabase.from('portal_service_requests').insert({
        portal_id: pid,
        subject: form.subject,
        description: form.description,
        category: form.category,
        severity: form.severity,
      });
      if (error) throw error;
      // Push activity feed event
      await supabase.from('portal_activity_feed').insert({
        portal_id: pid,
        direction: 'inbound',
        event_type: 'service_request_submitted',
        title: `New service request: ${form.subject}`,
        description: form.description?.slice(0, 200),
      });
      setSubmitted(true);
      toast.success('Request submitted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit');
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Card><CardContent className="pt-8 text-center space-y-3">
          <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
          <h2 className="text-xl font-bold">Thank you</h2>
          <p className="text-muted-foreground">Your service request has been received. Our team will reach out shortly.</p>
          <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ subject: '', description: '', category: 'general', severity: 'normal', email: '' }); }}>Submit another</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="flex items-center gap-2 mb-4"><LifeBuoy className="h-6 w-6" /><h1 className="text-2xl font-bold">Submit a service request</h1></div>
      <Card><CardContent className="pt-6 space-y-4">
        <div><Label>Your email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Severity</Label>
            <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Description</Label><Textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <Button className="w-full" onClick={submit} disabled={loading}>{loading ? 'Submitting…' : 'Submit request'}</Button>
      </CardContent></Card>
    </div>
  );
}
