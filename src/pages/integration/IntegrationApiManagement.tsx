import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useIntegrationApiClients, useIntegrationMutations } from '@/hooks/useIntegrationLayer';
import { KeyRound, Plus, Copy, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationApiManagement() {
  const { data: clients } = useIntegrationApiClients();
  const { createClient } = useIntegrationMutations();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [form, setForm] = useState({ client_name: '', client_code: '', auth_method: 'both', scopes: 'business_partners:read items:read sales_orders:read', allowed_entities: 'business_partners,items,sales_orders', rate_limit_per_minute: 120, owner_email: '' });

  const submit = async () => {
    const res = await createClient.mutateAsync({
      ...form,
      scopes: form.scopes.split(/[\s,]+/).filter(Boolean),
      allowed_entities: form.allowed_entities.split(',').map((x) => x.trim()).filter(Boolean),
    });
    setGenerated(res);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" /> Open API Management</h1><p className="text-sm text-muted-foreground">Partner API clients with API key and OAuth2 credentials</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setGenerated(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Client</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Partner Client</DialogTitle></DialogHeader>
            {!generated ? <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3"><div><Label>Name</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div><div><Label>Code</Label><Input value={form.client_code} onChange={(e) => setForm({ ...form, client_code: e.target.value })} /></div></div>
              <div><Label>Scopes</Label><Textarea value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} /></div>
              <div><Label>Allowed Entities</Label><Input value={form.allowed_entities} onChange={(e) => setForm({ ...form, allowed_entities: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-3"><div><Label>Rate / minute</Label><Input type="number" value={form.rate_limit_per_minute} onChange={(e) => setForm({ ...form, rate_limit_per_minute: Number(e.target.value) })} /></div><div><Label>Owner Email</Label><Input value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} /></div></div>
              <Button className="w-full" onClick={submit} disabled={createClient.isPending}>Create</Button>
            </div> : <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Copy these secrets now. They are not stored in readable form.</p>
              <Secret label="API Key" value={generated.api_key_once} />
              <Secret label="OAuth Client ID" value={generated.oauth_client_id} />
              <Secret label="OAuth Client Secret" value={generated.oauth_client_secret_once} />
            </div>}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Partner Clients</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(clients || []).map((c: any) => <div key={c.id} className="flex items-center gap-3 p-3 border rounded-md">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="flex-1"><p className="font-medium text-sm">{c.client_name}</p><p className="text-xs text-muted-foreground">{c.client_code} · {c.api_key_prefix || 'no key'} · {c.rate_limit_per_minute}/min</p></div>
            <div className="hidden md:flex gap-1">{(c.scopes || []).slice(0, 3).map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
            <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
          </div>)}
          {!clients?.length && <p className="text-sm text-muted-foreground text-center py-8">No API clients configured</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Secret({ label, value }: { label: string; value: string }) {
  return <div><Label>{label}</Label><div className="flex gap-2"><Input readOnly value={value || ''} className="font-mono text-xs" /><Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(value || ''); toast.success('Copied'); }}><Copy className="h-4 w-4" /></Button></div></div>;
}
