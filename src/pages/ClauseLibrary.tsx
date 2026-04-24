import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContractManagement } from '@/hooks/useContractManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Plus, Search, Shield, AlertTriangle } from 'lucide-react';

const categories = ['general', 'payment', 'liability', 'termination', 'confidentiality', 'warranty', 'indemnity', 'force_majeure', 'dispute_resolution', 'insurance', 'retention', 'penalties'];
const riskColors: Record<string, string> = { low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-red-100 text-red-800' };

export default function ClauseLibrary() {
  const { t } = useLanguage();
  const { clauses, createClause } = useContractManagement();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = clauses.filter((c: any) => {
    if (filterCat !== 'all' && c.category !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.title || '').toLowerCase().includes(s) || (c.clause_code || '').toLowerCase().includes(s) || (c.body || '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" />Clause Library</h1>
          <p className="text-sm text-muted-foreground">Reusable contract clause templates</p>
        </div>
        <Button onClick={() => { setForm({}); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />New Clause</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search clauses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" /></div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((clause: any) => (
          <Card key={clause.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setExpanded(expanded === clause.id ? null : clause.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {clause.clause_code && <span className="text-xs font-mono text-muted-foreground">{clause.clause_code}</span>}
                  {clause.is_mandatory && <Badge className="bg-red-100 text-red-800 text-xs">Mandatory</Badge>}
                </div>
                <Badge className={riskColors[clause.risk_level] || 'bg-muted'} >{clause.risk_level}</Badge>
              </div>
              <CardTitle className="text-sm">{clause.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant="outline" className="text-xs">{(clause.category || 'general').replace(/_/g, ' ')}</Badge>
              {expanded === clause.id && clause.body && (
                <div className="mt-3 p-3 bg-muted/50 rounded text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">{clause.body}</div>
              )}
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>v{clause.version || 1}</span>
                <span>{clause.language || 'en'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No clauses found. Create your first clause template.</p>
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Clause Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Clause Code</Label><Input value={form.clause_code || ''} onChange={e => setForm({ ...form, clause_code: e.target.value })} placeholder="CL-001" /></div>
            <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Select value={form.category || 'general'} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Risk Level</Label>
              <Select value={form.risk_level || 'low'} onValueChange={v => setForm({ ...form, risk_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_mandatory || false} onChange={e => setForm({ ...form, is_mandatory: e.target.checked })} /><Label>Mandatory Clause</Label></div>
            <div><Label>Body</Label><Textarea value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} rows={6} placeholder="Enter clause text..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => { createClause.mutate(form); setShowAdd(false); setForm({}); }} disabled={!form.title}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
