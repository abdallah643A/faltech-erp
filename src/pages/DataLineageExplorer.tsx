import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, GitCommit, Eye, Clock, Filter, ArrowRight } from 'lucide-react';

export default function DataLineageExplorer() {
  const [tab, setTab] = useState('field-history');
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [recordFilter, setRecordFilter] = useState('');

  const { data: auditEntries = [] } = useQuery({
    queryKey: ['audit-trail-lineage', tableFilter, recordFilter],
    queryFn: async () => {
      let q = (supabase.from('audit_trail' as any).select('*') as any);
      if (tableFilter) q = q.eq('table_name', tableFilter);
      if (recordFilter) q = q.eq('record_id', recordFilter);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return data as any[];
    },
  });

  const tables = [...new Set(auditEntries.map((e: any) => e.table_name))];
  const filtered = auditEntries.filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (e.table_name?.toLowerCase().includes(s) || e.record_id?.toLowerCase().includes(s) || e.user_email?.toLowerCase().includes(s) || JSON.stringify(e.changed_fields)?.toLowerCase().includes(s));
  });

  const getChangedFieldsDisplay = (entry: any) => {
    if (!entry.changed_fields || entry.changed_fields.length === 0) return null;
    return entry.changed_fields.slice(0, 4).map((f: string) => {
      const oldVal = entry.old_values?.[f];
      const newVal = entry.new_values?.[f];
      return { field: f, old: oldVal ?? '—', new: newVal ?? '—' };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitCommit className="h-6 w-6" />Data Lineage & Field Audit Explorer</h1>
          <p className="text-muted-foreground">Trace field-level changes and transaction lineage</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search changes..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={tableFilter} onValueChange={v => setTableFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Record ID" className="w-[200px]" value={recordFilter} onChange={e => setRecordFilter(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{filtered.length}</p><p className="text-xs text-muted-foreground">Total Changes</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{filtered.filter((e: any) => e.action === 'INSERT').length}</p><p className="text-xs text-muted-foreground">Creates</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{filtered.filter((e: any) => e.action === 'UPDATE').length}</p><p className="text-xs text-muted-foreground">Updates</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{filtered.filter((e: any) => e.action === 'DELETE').length}</p><p className="text-xs text-muted-foreground">Deletes</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="field-history">Field History</TabsTrigger>
          <TabsTrigger value="transaction-trace">Transaction Trace</TabsTrigger>
          <TabsTrigger value="lineage">Lineage Explorer</TabsTrigger>
          <TabsTrigger value="audit-filters">Audit Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="field-history">
          <div className="space-y-3">
            {filtered.filter((e: any) => e.action === 'UPDATE').slice(0, 50).map((e: any) => {
              const changes = getChangedFieldsDisplay(e);
              return (
                <Card key={e.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{e.table_name} → {e.record_id?.substring(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{e.user_email || e.user_name} • {new Date(e.created_at).toLocaleString()}</p>
                      </div>
                      <Badge variant="secondary">{e.action}</Badge>
                    </div>
                    {changes && (
                      <div className="mt-2 space-y-1">
                        {changes.map((c: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1 rounded">
                            <span className="font-mono text-xs text-muted-foreground w-32">{c.field}</span>
                            <span className="text-destructive line-through text-xs">{String(c.old).substring(0, 30)}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="text-green-600 text-xs">{String(c.new).substring(0, 30)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {filtered.filter((e: any) => e.action === 'UPDATE').length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No field changes found</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transaction-trace">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Fields</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.table_name}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{e.record_id?.substring(0, 8)}</TableCell>
                      <TableCell><Badge variant={e.action === 'DELETE' ? 'destructive' : e.action === 'INSERT' ? 'default' : 'secondary'} className="text-xs">{e.action}</Badge></TableCell>
                      <TableCell className="text-xs">{e.user_email || '—'}</TableCell>
                      <TableCell className="text-xs">{e.changed_fields?.join(', ') || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lineage">
          <div className="space-y-3">
            {recordFilter ? (
              filtered.map((e: any) => (
                <Card key={e.id}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{e.action} on {e.table_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()} by {e.user_email}</p>
                    </div>
                    <Badge variant="outline">{e.changed_fields?.length || 0} fields</Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Enter a Record ID above to trace its full lineage</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit-filters">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Most Changed Tables</CardTitle></CardHeader>
              <CardContent>
                {tables.sort((a, b) => filtered.filter((e: any) => e.table_name === b).length - filtered.filter((e: any) => e.table_name === a).length).slice(0, 10).map(t => (
                  <div key={t} className="flex items-center justify-between py-1 cursor-pointer hover:bg-muted/50 px-2 rounded" onClick={() => setTableFilter(t)}>
                    <span className="text-sm">{t}</span>
                    <Badge variant="outline">{filtered.filter((e: any) => e.table_name === t).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Most Active Users</CardTitle></CardHeader>
              <CardContent>
                {[...new Set(filtered.map((e: any) => e.user_email).filter(Boolean))].sort((a, b) => filtered.filter((e: any) => e.user_email === b).length - filtered.filter((e: any) => e.user_email === a).length).slice(0, 10).map(u => (
                  <div key={u} className="flex items-center justify-between py-1">
                    <span className="text-sm">{u}</span>
                    <Badge variant="outline">{filtered.filter((e: any) => e.user_email === u).length}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
