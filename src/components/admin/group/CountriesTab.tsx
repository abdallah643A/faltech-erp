import { useState } from 'react';
import { useCountries, useUpsertCountry } from '@/hooks/useGroupStructure';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function CountriesTab() {
  const { data: countries = [], isLoading } = useCountries();
  const upsert = useUpsertCountry();
  const [q, setQ] = useState('');
  const filtered = countries.filter(c =>
    !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.name_en.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input className="pl-8" placeholder="Search country..." value={q} onChange={e => setQ(e.target.value)} aria-label="Search countries" />
      </div>
      <div className="enterprise-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead>e-Invoicing</TableHead>
              <TableHead className="text-right">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground p-6">Loading…</TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.code}>
                <TableCell className="font-mono">{c.code}</TableCell>
                <TableCell>
                  <div className="font-medium">{c.name_en}</div>
                  {c.name_ar && <div className="text-xs text-muted-foreground" dir="rtl">{c.name_ar}</div>}
                </TableCell>
                <TableCell><Badge variant="outline">{c.default_currency}</Badge></TableCell>
                <TableCell className="uppercase text-xs">{c.default_language}</TableCell>
                <TableCell className="text-xs">{c.default_timezone}</TableCell>
                <TableCell>{c.vat_required ? <Badge>Required</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                <TableCell className="text-xs">{c.einvoicing_standard || '—'}</TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => upsert.mutate({ ...c, is_active: v })}
                    aria-label={`Toggle ${c.name_en} active`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
