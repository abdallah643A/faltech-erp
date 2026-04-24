import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { usePortalSecurityPolicy } from '@/hooks/usePortalEnhanced';
import { Shield, Save } from 'lucide-react';

export default function PortalSecurityPolicies() {
  const [params] = useSearchParams();
  const portalId = useParams().portalId || params.get('portal_id') || '';
  const { data, upsert } = usePortalSecurityPolicy(portalId);
  const [form, setForm] = useState<any>({});

  const v = { ...(data ?? {}), ...form };
  const set = (k: string, val: any) => setForm((s: any) => ({ ...s, [k]: val }));

  if (!portalId) {
    return (
      <div className="container mx-auto py-6">
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          Select a portal first. Pass <code>?portal_id=&lt;id&gt;</code> in the URL.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Security Policy</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Password & sessions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Min password length</Label><Input type="number" value={v.min_password_length ?? 10} onChange={e => set('min_password_length', +e.target.value)} /></div>
            <div><Label>Password expiry (days)</Label><Input type="number" value={v.password_expiry_days ?? ''} onChange={e => set('password_expiry_days', +e.target.value || null)} /></div>
            <div><Label>Max failed attempts</Label><Input type="number" value={v.max_failed_attempts ?? 5} onChange={e => set('max_failed_attempts', +e.target.value)} /></div>
            <div><Label>Lockout (minutes)</Label><Input type="number" value={v.lockout_minutes ?? 15} onChange={e => set('lockout_minutes', +e.target.value)} /></div>
            <div><Label>Session TTL (minutes)</Label><Input type="number" value={v.session_ttl_minutes ?? 720} onChange={e => set('session_ttl_minutes', +e.target.value)} /></div>
          </div>
          <Separator />
          <div className="flex items-center justify-between"><Label>Require uppercase</Label><Switch checked={!!v.require_uppercase} onCheckedChange={c => set('require_uppercase', c)} /></div>
          <div className="flex items-center justify-between"><Label>Require number</Label><Switch checked={!!v.require_number} onCheckedChange={c => set('require_number', c)} /></div>
          <div className="flex items-center justify-between"><Label>Require symbol</Label><Switch checked={!!v.require_symbol} onCheckedChange={c => set('require_symbol', c)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Login methods</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>Allow magic-link login</Label><Switch checked={!!v.allow_magic_link} onCheckedChange={c => set('allow_magic_link', c)} /></div>
          <div className="flex items-center justify-between"><Label>Allow TOTP MFA</Label><Switch checked={!!v.allow_totp_mfa} onCheckedChange={c => set('allow_totp_mfa', c)} /></div>
          <div className="flex items-center justify-between"><Label>Require MFA for all users</Label><Switch checked={!!v.require_mfa} onCheckedChange={c => set('require_mfa', c)} /></div>
        </CardContent>
      </Card>

      <Button onClick={() => upsert.mutate(v)} disabled={upsert.isPending}>
        <Save className="h-4 w-4 mr-2" /> Save policy
      </Button>
    </div>
  );
}
