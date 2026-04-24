import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantSSO } from '@/hooks/usePortalEnhanced';
import { useSaasTenants } from '@/hooks/useSaasAdmin';
import { KeyRound, Save } from 'lucide-react';

export default function TenantSSOConfig() {
  const { data: tenants = [] } = useSaasTenants();
  const [tenantId, setTenantId] = useState<string>('');
  const { data, upsert } = useTenantSSO(tenantId || undefined);
  const [form, setForm] = useState<any>({});
  const v = { ...(data ?? {}), ...form };
  const set = (k: string, val: any) => setForm((s: any) => ({ ...s, [k]: val }));

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2"><KeyRound className="h-6 w-6" /><h1 className="text-2xl font-bold">Tenant SSO (SAML / OIDC)</h1></div>
      <Card>
        <CardContent className="pt-6">
          <Label>Tenant</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger><SelectValue placeholder="Select tenant…" /></SelectTrigger>
            <SelectContent>
              {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {tenantId && (
        <>
          <Card>
            <CardHeader><CardTitle>Identity provider</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Protocol</Label>
                <Select value={v.protocol ?? 'saml'} onValueChange={(p) => set('protocol', p)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saml">SAML 2.0</SelectItem>
                    <SelectItem value="oidc">OIDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(v.protocol ?? 'saml') === 'saml' ? (
                <>
                  <div><Label>SAML Metadata URL</Label><Input value={v.metadata_url ?? ''} onChange={e => set('metadata_url', e.target.value)} placeholder="https://idp.example.com/metadata" /></div>
                  <div><Label>SAML Metadata XML (alternative)</Label><Textarea rows={4} value={v.metadata_xml ?? ''} onChange={e => set('metadata_xml', e.target.value)} /></div>
                </>
              ) : (
                <>
                  <div><Label>OIDC Issuer</Label><Input value={v.oidc_issuer ?? ''} onChange={e => set('oidc_issuer', e.target.value)} placeholder="https://issuer.example.com" /></div>
                  <div><Label>Client ID</Label><Input value={v.oidc_client_id ?? ''} onChange={e => set('oidc_client_id', e.target.value)} /></div>
                  <div><Label>Client secret</Label><Input type="password" value={v.oidc_client_secret ?? ''} onChange={e => set('oidc_client_secret', e.target.value)} /></div>
                </>
              )}

              <div>
                <Label>Email domains (comma separated)</Label>
                <Input
                  value={(v.email_domains ?? []).join(', ')}
                  onChange={e => set('email_domains', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="example.com, corp.example.com"
                />
              </div>

              <div className="flex items-center justify-between"><Label>Enable SSO</Label><Switch checked={!!v.is_enabled} onCheckedChange={c => set('is_enabled', c)} /></div>
            </CardContent>
          </Card>

          <Button onClick={() => upsert.mutate(v)} disabled={upsert.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save SSO configuration
          </Button>
        </>
      )}
    </div>
  );
}
