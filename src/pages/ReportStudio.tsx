import { useState, useMemo } from 'react';
import { useReportDefinitions, useSavedQueries, ReportDefinition } from '@/hooks/useMetadataStudio';
import { Card } from '@/components/ui/card';
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
  FileText, Plus, Search, Edit, Trash2, Eye, Printer, Download,
  LayoutTemplate, Settings2, BarChart3, Copy, Rocket,
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZES = ['A4', 'Letter', 'Legal', 'Custom'];
const ORIENTATIONS = ['portrait', 'landscape'];
const CATEGORIES = ['general', 'finance', 'sales', 'purchasing', 'inventory', 'hr', 'operations'];

export default function ReportStudio() {
  const { reports, create, update, remove } = useReportDefinitions();
  const { queries } = useSavedQueries();
  const [activeTab, setActiveTab] = useState('manager');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Partial<ReportDefinition>>({});
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);

  // Columns editor state
  const [columnDefs, setColumnDefs] = useState<Array<{ field: string; label: string; width: number; format: string; align: string }>>([]);
  const [newCol, setNewCol] = useState({ field: '', label: '', width: 150, format: '', align: 'left' });

  const filtered = useMemo(() => {
    if (!search) return reports;
    return reports.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [reports, search]);

  const handleSave = () => {
    if (!editing.name) return;
    const payload = {
      ...editing,
      columns_config: columnDefs.length ? columnDefs : editing.columns_config,
    };
    if (editing.id) {
      update.mutate(payload as ReportDefinition & { id: string });
    } else {
      create.mutate(payload);
    }
    setShowDialog(false);
    setEditing({});
    setColumnDefs([]);
  };

  const handlePublish = (r: ReportDefinition) => {
    if (!confirm(`Publish report "${r.name}"?`)) return;
    update.mutate({ id: r.id, status: 'published', version: r.version + 1 });
  };

  const openDesigner = (r: ReportDefinition) => {
    setSelectedReport(r);
    setEditing(r);
    setColumnDefs(Array.isArray(r.columns_config) ? r.columns_config : []);
    setActiveTab('designer');
  };

  const addColumn = () => {
    if (!newCol.field) return;
    setColumnDefs(prev => [...prev, { ...newCol }]);
    setNewCol({ field: '', label: '', width: 150, format: '', align: 'left' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" /> Report Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Design, manage, and run custom reports with headers, tables, grouping, and exports</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="manager" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Report Manager</TabsTrigger>
          <TabsTrigger value="designer" className="gap-1.5 text-xs"><LayoutTemplate className="h-3.5 w-3.5" /> Designer</TabsTrigger>
        </TabsList>

        {/* ─── Report Manager ─── */}
        <TabsContent value="manager" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Button size="sm" className="text-xs gap-1" onClick={() => { setEditing({ status: 'draft', page_size: 'A4', page_orientation: 'portrait', data_source_type: 'query', sharing: 'private' }); setColumnDefs([]); setShowDialog(true); }}>
              <Plus className="h-3 w-3" /> New Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.length === 0 && (
              <Card className="col-span-full p-12 text-center text-muted-foreground">
                <LayoutTemplate className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No reports yet. Create your first report.</p>
              </Card>
            )}
            {filtered.map(r => (
              <Card key={r.id} className="p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openDesigner(r)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold">{r.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{r.category || 'general'} · {r.page_size} {r.page_orientation}</p>
                  </div>
                  <Badge variant={r.status === 'published' ? 'default' : 'secondary'} className="text-[9px]">{r.status}</Badge>
                </div>
                {r.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{r.description}</p>}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={e => { e.stopPropagation(); openDesigner(r); }}>
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={e => { e.stopPropagation(); create.mutate({ ...r, id: undefined, name: `${r.name} (copy)`, status: 'draft' } as any); }}>
                    <Copy className="h-3 w-3" /> Clone
                  </Button>
                  {r.status === 'draft' && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={e => { e.stopPropagation(); handlePublish(r); }}>
                      <Rocket className="h-3 w-3" /> Publish
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-destructive ml-auto" onClick={e => { e.stopPropagation(); if (confirm('Delete?')) remove.mutate(r.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── Report Designer ─── */}
        <TabsContent value="designer" className="space-y-4">
          {selectedReport || editing.name ? (
            <div className="grid grid-cols-12 gap-4">
              {/* Left: Settings */}
              <Card className="col-span-4 overflow-hidden">
                <ScrollArea className="h-[65vh]">
                  <div className="p-4 space-y-4">
                    <h3 className="text-sm font-semibold">Report Settings</h3>

                    <fieldset className="space-y-3 border rounded-lg p-3">
                      <legend className="text-xs font-semibold text-muted-foreground px-2">Basic</legend>
                      <div><Label className="text-xs">Name *</Label><Input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" /></div>
                      <div><Label className="text-xs">Description</Label><Textarea value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} className="text-sm min-h-[50px]" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Category</Label>
                          <Select value={editing.category || 'general'} onValueChange={v => setEditing(p => ({ ...p, category: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label className="text-xs">Sharing</Label>
                          <Select value={editing.sharing || 'private'} onValueChange={v => setEditing(p => ({ ...p, sharing: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="shared">Shared</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3 border rounded-lg p-3">
                      <legend className="text-xs font-semibold text-muted-foreground px-2">Page Layout</legend>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Page Size</Label>
                          <Select value={editing.page_size || 'A4'} onValueChange={v => setEditing(p => ({ ...p, page_size: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{PAGE_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label className="text-xs">Orientation</Label>
                          <Select value={editing.page_orientation || 'portrait'} onValueChange={v => setEditing(p => ({ ...p, page_orientation: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{ORIENTATIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {['top', 'bottom', 'left', 'right'].map(side => (
                          <div key={side}>
                            <Label className="text-[10px] capitalize">{side} (mm)</Label>
                            <Input type="number" value={(editing as any)[`margin_${side}`] ?? 20} onChange={e => setEditing(p => ({ ...p, [`margin_${side}`]: parseInt(e.target.value) || 0 }))} className="h-7 text-xs" />
                          </div>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3 border rounded-lg p-3">
                      <legend className="text-xs font-semibold text-muted-foreground px-2">Data Source</legend>
                      <div><Label className="text-xs">Source Type</Label>
                        <Select value={editing.data_source_type || 'query'} onValueChange={v => setEditing(p => ({ ...p, data_source_type: v }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="query">Saved Query</SelectItem>
                            <SelectItem value="table">Direct Table</SelectItem>
                            <SelectItem value="sql">Custom SQL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {editing.data_source_type === 'query' && (
                        <div><Label className="text-xs">Select Query</Label>
                          <Select value={editing.data_source_query_id || 'none'} onValueChange={v => setEditing(p => ({ ...p, data_source_query_id: v === 'none' ? null : v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {queries.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {editing.data_source_type === 'table' && (
                        <div><Label className="text-xs">Table Name</Label><Input value={editing.data_source_table || ''} onChange={e => setEditing(p => ({ ...p, data_source_table: e.target.value }))} className="h-8 text-sm" /></div>
                      )}
                      {editing.data_source_type === 'sql' && (
                        <div><Label className="text-xs">SQL</Label><Textarea value={editing.data_source_sql || ''} onChange={e => setEditing(p => ({ ...p, data_source_sql: e.target.value }))} className="font-mono text-xs min-h-[80px]" /></div>
                      )}
                    </fieldset>

                    <fieldset className="space-y-3 border rounded-lg p-3">
                      <legend className="text-xs font-semibold text-muted-foreground px-2">Header</legend>
                      <div><Label className="text-xs">Title</Label><Input value={(editing.header_config as any)?.title || ''} onChange={e => setEditing(p => ({ ...p, header_config: { ...(p.header_config || {}), title: e.target.value } }))} className="h-8 text-sm" /></div>
                      <div><Label className="text-xs">Subtitle</Label><Input value={(editing.header_config as any)?.subtitle || ''} onChange={e => setEditing(p => ({ ...p, header_config: { ...(p.header_config || {}), subtitle: e.target.value } }))} className="h-8 text-sm" /></div>
                      <div className="flex items-center justify-between"><Label className="text-xs">Show Logo</Label>
                        <Switch checked={(editing.header_config as any)?.show_logo ?? true} onCheckedChange={v => setEditing(p => ({ ...p, header_config: { ...(p.header_config || {}), show_logo: v } }))} />
                      </div>
                      <div className="flex items-center justify-between"><Label className="text-xs">Show Date</Label>
                        <Switch checked={(editing.header_config as any)?.show_date ?? true} onCheckedChange={v => setEditing(p => ({ ...p, header_config: { ...(p.header_config || {}), show_date: v } }))} />
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3 border rounded-lg p-3">
                      <legend className="text-xs font-semibold text-muted-foreground px-2">Footer</legend>
                      <div className="flex items-center justify-between"><Label className="text-xs">Show Page Numbers</Label>
                        <Switch checked={(editing.footer_config as any)?.show_page_numbers ?? true} onCheckedChange={v => setEditing(p => ({ ...p, footer_config: { ...(p.footer_config || {}), show_page_numbers: v } }))} />
                      </div>
                      <div><Label className="text-xs">Footer Text</Label><Input value={(editing.footer_config as any)?.text || ''} onChange={e => setEditing(p => ({ ...p, footer_config: { ...(p.footer_config || {}), text: e.target.value } }))} className="h-8 text-sm" /></div>
                    </fieldset>

                    <Button className="w-full text-xs gap-1.5" onClick={handleSave}><Settings2 className="h-3.5 w-3.5" /> Save Report</Button>
                  </div>
                </ScrollArea>
              </Card>

              {/* Right: Columns & Preview */}
              <div className="col-span-8 space-y-3">
                <Card className="p-4 space-y-3">
                  <h4 className="text-xs font-semibold">Report Columns</h4>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1"><Label className="text-[10px]">Field</Label><Input value={newCol.field} onChange={e => setNewCol(p => ({ ...p, field: e.target.value }))} className="h-7 text-xs" placeholder="column_name" /></div>
                    <div className="flex-1"><Label className="text-[10px]">Label</Label><Input value={newCol.label} onChange={e => setNewCol(p => ({ ...p, label: e.target.value }))} className="h-7 text-xs" placeholder="Display Label" /></div>
                    <div className="w-20"><Label className="text-[10px]">Width</Label><Input type="number" value={newCol.width} onChange={e => setNewCol(p => ({ ...p, width: parseInt(e.target.value) || 100 }))} className="h-7 text-xs" /></div>
                    <div className="w-24"><Label className="text-[10px]">Align</Label>
                      <Select value={newCol.align} onValueChange={v => setNewCol(p => ({ ...p, align: v }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="h-7 text-xs" onClick={addColumn} disabled={!newCol.field}><Plus className="h-3 w-3" /></Button>
                  </div>

                  {columnDefs.length > 0 && (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-xs">Field</TableHead>
                        <TableHead className="text-xs">Label</TableHead>
                        <TableHead className="text-xs">Width</TableHead>
                        <TableHead className="text-xs">Align</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {columnDefs.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-mono">{c.field}</TableCell>
                            <TableCell className="text-xs">{c.label || c.field}</TableCell>
                            <TableCell className="text-xs">{c.width}px</TableCell>
                            <TableCell className="text-xs">{c.align}</TableCell>
                            <TableCell><Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => setColumnDefs(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>

                {/* Preview */}
                <Card className="p-6 min-h-[40vh] bg-white border-2">
                  <div className="text-center mb-4 border-b pb-4">
                    {(editing.header_config as any)?.show_logo && <div className="w-12 h-12 bg-muted rounded mx-auto mb-2 flex items-center justify-center text-xs text-muted-foreground">Logo</div>}
                    <h2 className="text-lg font-bold">{(editing.header_config as any)?.title || editing.name || 'Report Title'}</h2>
                    {(editing.header_config as any)?.subtitle && <p className="text-sm text-muted-foreground">{(editing.header_config as any)?.subtitle}</p>}
                    {(editing.header_config as any)?.show_date && <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString()}</p>}
                  </div>

                  {columnDefs.length > 0 ? (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-foreground/20">
                          {columnDefs.map((c, i) => (
                            <th key={i} className="py-1.5 px-2 font-semibold" style={{ width: c.width, textAlign: c.align as any }}>{c.label || c.field}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map(row => (
                          <tr key={row} className="border-b border-muted">
                            {columnDefs.map((c, i) => (
                              <td key={i} className="py-1 px-2 text-muted-foreground" style={{ textAlign: c.align as any }}>Sample {row}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs">Add columns above to see report preview</div>
                  )}

                  <div className="mt-6 pt-3 border-t flex justify-between text-[10px] text-muted-foreground">
                    <span>{(editing.footer_config as any)?.text || ''}</span>
                    {(editing.footer_config as any)?.show_page_numbers && <span>Page 1 of 1</span>}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <LayoutTemplate className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a report from the Manager tab or create a new one</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} className="text-sm min-h-[50px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Category</Label>
                <Select value={editing.category || 'general'} onValueChange={v => setEditing(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Data Source</Label>
                <Select value={editing.data_source_type || 'query'} onValueChange={v => setEditing(p => ({ ...p, data_source_type: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="query">Saved Query</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="sql">SQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setShowDialog(false); setActiveTab('designer'); }} disabled={!editing.name}>Open Designer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
