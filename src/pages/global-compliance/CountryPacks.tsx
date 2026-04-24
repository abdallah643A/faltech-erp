import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCountryPacks, useGlobalComplianceMutations } from '@/hooks/useGlobalCompliance';
import { Globe2, PackageCheck } from 'lucide-react';

export default function CountryPacks() {
  const { data: packs } = useCountryPacks();
  const { seedGenericPacks } = useGlobalComplianceMutations();
  return <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Globe2 className="h-6 w-6 text-primary" /> Country Packs</h1><p className="text-sm text-muted-foreground">Generic starter packs for regional regulatory enablement</p></div><Button onClick={() => seedGenericPacks.mutate()}>Seed Generic Packs</Button></div><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{(packs || []).map((p: any) => <Card key={p.id}><CardHeader className="pb-2 flex-row items-center justify-between"><CardTitle className="text-sm">{p.pack_name}</CardTitle><PackageCheck className="h-4 w-4 text-primary" /></CardHeader><CardContent className="space-y-3"><div className="flex gap-2"><Badge>{p.country_code}</Badge><Badge variant="outline">v{p.version}</Badge><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></div><div className="flex flex-wrap gap-1">{(p.supported_modules || []).map((m: string) => <Badge key={m} variant="secondary">{m.replace('_',' ')}</Badge>)}</div><p className="text-xs text-muted-foreground">Currency {p.default_currency || '—'} · Language {p.default_language || '—'}</p></CardContent></Card>)}{!packs?.length && <Card className="md:col-span-3"><CardContent className="p-10 text-center text-sm text-muted-foreground">No country packs yet</CardContent></Card>}</div></div>;
}
