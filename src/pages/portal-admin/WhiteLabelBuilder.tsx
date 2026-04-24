import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortalBranding, PortalType } from '@/hooks/useUnifiedPortal';
import { Palette, Save } from 'lucide-react';

const PORTAL_TYPES: (PortalType | 'all')[] = ['all', 'client', 'supplier', 'subcontractor', 'saas_admin'];

export default function WhiteLabelBuilder() {
  const [portalType, setPortalType] = useState<PortalType | 'all'>('all');
  const { data: profile, upsert, isLoading } = usePortalBranding(portalType);

  const [form, setForm] = useState<any>({
    brand_name: '', logo_url: '', primary_color: '#0F172A', accent_color: '#3B82F6',
    background_color: '#FFFFFF', footer_text: '', custom_domain: '',
    email_from_name: '', email_signature: '', white_label: false,
  });

  useEffect(() => {
    if (profile) setForm({ ...form, ...profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const save = () => upsert.mutate(form);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" /> White-label Builder</h1>
          <p className="text-sm text-muted-foreground">Customize portal branding per audience.</p>
        </div>
        <Select value={portalType} onValueChange={(v) => setPortalType(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{PORTAL_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Brand identity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Brand name</Label><Input value={form.brand_name || ''} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} /></div>
            <div><Label>Logo URL</Label><Input value={form.logo_url || ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Primary</Label><Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
              <div><Label>Accent</Label><Input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></div>
              <div><Label>Background</Label><Input type="color" value={form.background_color} onChange={(e) => setForm({ ...form, background_color: e.target.value })} /></div>
            </div>
            <div><Label>Footer text</Label><Textarea value={form.footer_text || ''} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} /></div>
            <div className="flex items-center justify-between pt-2">
              <Label>Hide "Powered by" footer</Label>
              <Switch checked={!!form.white_label} onCheckedChange={(v) => setForm({ ...form, white_label: v })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Domains & email</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Custom domain</Label><Input value={form.custom_domain || ''} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} placeholder="portal.example.com" /></div>
            <div><Label>Email from name</Label><Input value={form.email_from_name || ''} onChange={(e) => setForm({ ...form, email_from_name: e.target.value })} /></div>
            <div><Label>Email signature</Label><Textarea rows={4} value={form.email_signature || ''} onChange={(e) => setForm({ ...form, email_signature: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Live preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border p-6" style={{ background: form.background_color }}>
              <div className="flex items-center gap-3 mb-4">
                {form.logo_url && <img src={form.logo_url} alt="" className="h-10 w-10 rounded object-contain" />}
                <h2 className="text-xl font-bold" style={{ color: form.primary_color }}>{form.brand_name || 'Your brand'}</h2>
              </div>
              <Button style={{ background: form.accent_color, color: '#fff' }}>Sample CTA</Button>
              {form.footer_text && <p className="mt-6 text-xs" style={{ color: form.primary_color, opacity: 0.7 }}>{form.footer_text}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={isLoading || upsert.isPending}><Save className="h-4 w-4 mr-2" />Save branding</Button>
      </div>
    </div>
  );
}
