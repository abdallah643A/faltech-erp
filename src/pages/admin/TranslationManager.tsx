import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Globe, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ur', label: 'اردو' },
  { code: 'hi', label: 'हिन्दी' },
];

interface TranslationRow {
  id: string;
  namespace: string;
  key: string;
  language: string;
  value: string;
  notes: string | null;
  updated_at: string;
}

/**
 * Admin page to manage UI translation overrides across EN/AR/UR/HI.
 * Stored in app_translations; falls back to bundled keys when no row exists.
 */
export default function TranslationManager() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Partial<TranslationRow> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['app-translations'],
    queryFn: async (): Promise<TranslationRow[]> => {
      const { data } = await supabase
        .from('app_translations')
        .select('*')
        .order('key', { ascending: true })
        .limit(2000);
      return (data ?? []) as TranslationRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Partial<TranslationRow>) => {
      if (row.id) {
        const { error } = await supabase
          .from('app_translations')
          .update({ value: row.value!, notes: row.notes ?? null })
          .eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('app_translations').insert({
          namespace: row.namespace || 'app',
          key: row.key!,
          language: row.language!,
          value: row.value!,
          notes: row.notes ?? null,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-translations'] });
      setEditing(null);
      toast.success('Translation saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_translations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-translations'] });
      toast.success('Removed');
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (langFilter === 'all' || r.language === langFilter) &&
      (!q || r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q) || r.namespace.toLowerCase().includes(q))
    );
  }, [rows, search, langFilter]);

  if (!hasRole('admin')) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Admin role required to manage translations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Translations
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Override UI strings per language. Empty rows fall back to bundled defaults.
              </p>
            </div>
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditing({ namespace: 'app', language: 'en' })}>
                  <Plus className="h-4 w-4 mr-1" /> New translation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing?.id ? 'Edit translation' : 'New translation'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Namespace</Label>
                      <Input value={editing?.namespace ?? 'app'}
                        onChange={(e) => setEditing(p => ({ ...p, namespace: e.target.value }))}
                        disabled={!!editing?.id} />
                    </div>
                    <div>
                      <Label>Language</Label>
                      <Select value={editing?.language ?? 'en'}
                        onValueChange={(v) => setEditing(p => ({ ...p, language: v }))}
                        disabled={!!editing?.id}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGS.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Key</Label>
                    <Input value={editing?.key ?? ''}
                      onChange={(e) => setEditing(p => ({ ...p, key: e.target.value }))}
                      placeholder="e.g. header.search" disabled={!!editing?.id} />
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input value={editing?.value ?? ''}
                      onChange={(e) => setEditing(p => ({ ...p, value: e.target.value }))}
                      placeholder="Translated text" />
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Input value={editing?.notes ?? ''}
                      onChange={(e) => setEditing(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button
                    onClick={() => editing && save.mutate(editing)}
                    disabled={!editing?.key || !editing?.value || !editing?.language || save.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by key, value, or namespace…"
                className="pl-7 h-8 text-sm" />
            </div>
            <Select value={langFilter} onValueChange={setLangFilter}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {LANGS.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Namespace</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="w-20">Lang</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No translations</TableCell></TableRow>
                )}
                {filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setEditing(r)}>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.namespace}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.key}</TableCell>
                    <TableCell><Badge className="text-[10px]">{r.language}</Badge></TableCell>
                    <TableCell className="text-sm">{r.value}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); remove.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
