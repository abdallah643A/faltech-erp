import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useKBArticles, useUpsertKBArticle } from '@/hooks/useServiceITSM';
import { Plus, Search, BookOpen } from 'lucide-react';

export default function ITSMKnowledgeBasePage() {
  const [search, setSearch] = useState('');
  const { data: articles = [] } = useKBArticles({ search });
  const upsert = useUpsertKBArticle();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: 'draft' });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Knowledge Base</h1><p className="text-sm text-muted-foreground">Self-service articles for tickets and customers.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Article</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>KB Article</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Body</Label><Textarea rows={8} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => upsert.mutate({ ...form, status: 'draft' }, { onSuccess: () => setOpen(false) })} disabled={!form.title || !form.body}>Save Draft</Button>
                <Button onClick={() => upsert.mutate({ ...form, status: 'published', published_at: new Date().toISOString() }, { onSuccess: () => setOpen(false) })} disabled={!form.title || !form.body}>Publish</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input placeholder="Search articles..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Article #</TableHead><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Views</TableHead><TableHead>Helpful</TableHead></TableRow></TableHeader>
            <TableBody>
              {articles.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.article_number}</TableCell>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{a.category || '—'}</TableCell>
                  <TableCell><Badge variant={a.status === 'published' ? 'default' : 'outline'}>{a.status}</Badge></TableCell>
                  <TableCell>{a.view_count}</TableCell>
                  <TableCell>{a.helpful_count}</TableCell>
                </TableRow>
              ))}
              {articles.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No articles</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
