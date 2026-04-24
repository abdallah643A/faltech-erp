import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Search, Lock } from 'lucide-react';
import { useSignatureAudit } from '@/hooks/useSignatureAudit';

export default function SignatureAuditViewer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: signatures = [] } = useQuery({
    queryKey: ['pos-digital-signatures-all', search],
    queryFn: async () => {
      let q = supabase.from('pos_digital_signatures').select('*').order('created_at', { ascending: false }).limit(100);
      if (search) q = q.or(`document_number.ilike.%${search}%,signer_name.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: audit = [] } = useSignatureAudit(selectedId || undefined);

  const EVENT_COLORS: Record<string, string> = {
    created: 'bg-blue-100 text-blue-800',
    otp_sent: 'bg-purple-100 text-purple-800',
    otp_verified: 'bg-emerald-100 text-emerald-800',
    otp_failed: 'bg-red-100 text-red-800',
    signed: 'bg-green-100 text-green-800',
    revoked: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Signature Audit</h1>
        <p className="text-sm text-muted-foreground">Tamper-evident lifecycle log for every digital signature.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Signatures</CardTitle></CardHeader>
          <CardContent>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-auto">
              {signatures.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-2 rounded border ${selectedId === s.id ? 'bg-accent border-primary' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{s.document_number || s.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{s.signer_name}</div>
                    </div>
                    <Badge variant={s.is_verified ? 'default' : 'outline'} className="text-xs">{s.is_verified ? <><Lock className="h-3 w-3 mr-1" />Sealed</> : 'Pending'}</Badge>
                  </div>
                  {s.certificate_hash && <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">cert: {s.certificate_hash.slice(0, 16)}…</div>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Audit trail</CardTitle></CardHeader>
          <CardContent>
            {!selectedId ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Select a signature to view its audit trail</div>
            ) : audit.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No audit events yet</div>
            ) : (
              <div className="space-y-2">
                {audit.map((e: any) => (
                  <div key={e.id} className="border-l-2 border-primary/40 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <Badge className={EVENT_COLORS[e.event_type] || ''}>{e.event_type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs mt-1">{e.actor_name || 'system'} · {e.ip_address || '—'}</div>
                    {e.event_data && Object.keys(e.event_data).length > 0 && (
                      <pre className="text-[10px] mt-1 bg-muted p-1 rounded overflow-x-auto">{JSON.stringify(e.event_data, null, 1)}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
