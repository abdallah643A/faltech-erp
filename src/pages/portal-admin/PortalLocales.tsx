import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Languages } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { usePortalTranslations } from '@/hooks/usePortalEnhanced';

const LOCALES = ['en', 'ar', 'ur', 'hi'];

export default function PortalLocales() {
  const [params] = useSearchParams();
  const portalId = params.get('portal_id') || '';
  const { data: rows = [], upsert, remove } = usePortalTranslations(portalId);
  const [locale, setLocale] = useState('en');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const submit = () => {
    if (!key || !value) return;
    upsert.mutate({ locale, translation_key: key, translation_value: value }, {
      onSuccess: () => { setKey(''); setValue(''); },
    });
  };

  if (!portalId) {
    return <div className="container mx-auto py-6"><Card><CardContent className="pt-6 text-center text-muted-foreground">Pass <code>?portal_id=&lt;id&gt;</code> in URL.</CardContent></Card></div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2"><Languages className="h-6 w-6" /><h1 className="text-2xl font-bold">Multilingual Portal Content</h1></div>

      <Card>
        <CardHeader><CardTitle>Add / update translation</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div><Label>Locale</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOCALES.map(l => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Key</Label><Input value={key} onChange={e => setKey(e.target.value)} placeholder="welcome.title" /></div>
          <div><Label>Value</Label><Input value={value} onChange={e => setValue(e.target.value)} placeholder="Welcome to our portal" /></div>
          <Button onClick={submit} disabled={!key || !value}><Plus className="h-4 w-4 mr-2" /> Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Translations ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Locale</TableHead><TableHead>Key</TableHead><TableHead>Value</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="uppercase">{r.locale}</TableCell>
                  <TableCell className="font-mono text-xs">{r.translation_key}</TableCell>
                  <TableCell>{r.translation_value}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No translations yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
