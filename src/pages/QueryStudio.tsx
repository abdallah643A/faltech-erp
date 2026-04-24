import { useState, useMemo } from 'react';
import { useSavedQueries, useQueryFolders, SavedQuery, QueryFolder } from '@/hooks/useMetadataStudio';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, Plus, Play, Star, Download, Copy, Edit, Trash2, Folder, Clock,
  Code2, Eye, BarChart3, FolderPlus, StarOff, FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export default function QueryStudio() {
  const { queries, create, update, remove } = useSavedQueries();
  const { folders, create: createFolder } = useQueryFolders();
  const [activeTab, setActiveTab] = useState('manager');
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [showQueryDialog, setShowQueryDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingQuery, setEditingQuery] = useState<Partial<SavedQuery>>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [sqlText, setSqlText] = useState('');
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [filterFolder, setFilterFolder] = useState<string | null>(null);

  const filteredQueries = useMemo(() => {
    let list = queries;
    if (search) list = list.filter(q => q.name.toLowerCase().includes(search.toLowerCase()));
    if (filterFolder) list = list.filter(q => q.folder_id === filterFolder);
    return list;
  }, [queries, search, filterFolder]);

  const runQuery = async (sql: string) => {
    if (!sql.trim()) { toast.error('Enter a SQL query'); return; }
    const lower = sql.trim().toLowerCase();
    if (/^(drop|truncate|delete|update|alter|insert|create)\b/.test(lower)) {
      toast.error('Only SELECT queries are allowed');
      return;
    }

    setIsRunning(true);
    setQueryError(null);
    setQueryResults(null);
    const start = performance.now();

    try {
      const { data, error } = await supabase.rpc('execute_readonly_query' as any, { query_text: sql });
      if (error) {
        // Fallback: try direct
        setQueryError(error.message);
      } else {
        setQueryResults(data as any[]);
      }
    } catch (e: any) {
      setQueryError(e.message);
    }

    setExecutionTime(Math.round(performance.now() - start));
    setIsRunning(false);
  };

  const handleSaveQuery = () => {
    if (!editingQuery.name) return;
    const payload = { ...editingQuery, sql_text: sqlText || editingQuery.sql_text };
    if (editingQuery.id) {
      update.mutate(payload as SavedQuery & { id: string });
    } else {
      create.mutate(payload);
    }
    setShowQueryDialog(false);
  };

  const handleExportCSV = () => {
    if (!queryResults?.length) return;
    const keys = Object.keys(queryResults[0]);
    const csv = [keys.join(','), ...queryResults.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'query-results.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" /> Query Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Build, save, and run queries with visual or SQL mode</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="manager" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Query Manager</TabsTrigger>
          <TabsTrigger value="editor" className="gap-1.5 text-xs"><Code2 className="h-3.5 w-3.5" /> SQL Editor</TabsTrigger>
        </TabsList>

        {/* ─── Query Manager ─── */}
        <TabsContent value="manager" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search queries..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={filterFolder || 'all'} onValueChange={v => setFilterFolder(v === 'all' ? null : v)}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Folders" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowFolderDialog(true)}>
              <FolderPlus className="h-3 w-3" /> Folder
            </Button>
            <Button size="sm" className="text-xs gap-1" onClick={() => { setEditingQuery({ query_type: 'sql', sharing: 'private' }); setSqlText(''); setShowQueryDialog(true); }}>
              <Plus className="h-3 w-3" /> New Query
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Sharing</TableHead>
                  <TableHead className="text-xs">Last Run</TableHead>
                  <TableHead className="text-xs">Runs</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueries.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No saved queries</TableCell></TableRow>
                )}
                {filteredQueries.map(q => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => update.mutate({ id: q.id, is_favorite: !q.is_favorite })}>
                        {q.is_favorite ? <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> : <StarOff className="h-3 w-3 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{q.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px]">{q.query_type}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-[9px]">{q.sharing}</Badge></TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{q.last_run_at ? new Date(q.last_run_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-xs">{q.run_count}</TableCell>
                    <TableCell><Badge variant={q.status === 'active' ? 'default' : 'secondary'} className="text-[9px]">{q.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setSqlText(q.sql_text || ''); setActiveTab('editor'); }}>
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingQuery(q); setSqlText(q.sql_text || ''); setShowQueryDialog(true); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => create.mutate({ ...q, id: undefined, name: `${q.name} (copy)` } as any)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => { if (confirm('Delete?')) remove.mutate(q.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── SQL Editor ─── */}
        <TabsContent value="editor" className="space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-xs gap-1" onClick={() => runQuery(sqlText)} disabled={isRunning}>
              <Play className="h-3 w-3" /> {isRunning ? 'Running...' : 'Run Query'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setEditingQuery({ query_type: 'sql', sharing: 'private', sql_text: sqlText }); setShowQueryDialog(true); }}>
              Save Query
            </Button>
            {queryResults && (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleExportCSV}>
                <Download className="h-3 w-3" /> Export CSV
              </Button>
            )}
            {executionTime !== null && (
              <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                <Clock className="h-3 w-3" /> {executionTime}ms
                {queryResults && <span>· {queryResults.length} rows</span>}
              </span>
            )}
          </div>

          <Textarea
            value={sqlText}
            onChange={e => setSqlText(e.target.value)}
            className="font-mono text-sm min-h-[200px] bg-muted/30"
            placeholder="SELECT * FROM ar_invoices LIMIT 10;"
          />

          {queryError && (
            <Card className="p-3 border-destructive bg-destructive/5">
              <p className="text-xs text-destructive font-mono">{queryError}</p>
            </Card>
          )}

          {queryResults && queryResults.length > 0 && (
            <Card className="overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(queryResults[0]).map(k => (
                      <TableHead key={k} className="text-xs whitespace-nowrap">{k}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryResults.slice(0, 200).map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((v: any, j) => (
                        <TableCell key={j} className="text-xs whitespace-nowrap max-w-[200px] truncate">{v !== null ? String(v) : '—'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {queryResults && queryResults.length === 0 && (
            <Card className="p-6 text-center text-xs text-muted-foreground">Query returned no results.</Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Query Dialog */}
      <Dialog open={showQueryDialog} onOpenChange={setShowQueryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Save Query</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input value={editingQuery.name || ''} onChange={e => setEditingQuery(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Description</Label><Input value={editingQuery.description || ''} onChange={e => setEditingQuery(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Folder</Label>
                <Select value={editingQuery.folder_id || 'none'} onValueChange={v => setEditingQuery(p => ({ ...p, folder_id: v === 'none' ? null : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Sharing</Label>
                <Select value={editingQuery.sharing || 'private'} onValueChange={v => setEditingQuery(p => ({ ...p, sharing: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="shared">Shared by Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowQueryDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveQuery} disabled={!editingQuery.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <div><Label className="text-xs">Folder Name</Label><Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="h-8 text-sm" /></div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowFolderDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { createFolder.mutate({ name: newFolderName }); setShowFolderDialog(false); setNewFolderName(''); }} disabled={!newFolderName}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
