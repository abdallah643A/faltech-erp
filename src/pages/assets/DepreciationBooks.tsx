import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, BookOpen } from 'lucide-react';
import { useDepreciationBooks } from '@/hooks/useAssetEnhanced';

export default function DepreciationBooks() {
  const { data: books = [], upsert } = useDepreciationBooks();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ book_type: 'ifrs', base_currency: 'SAR', is_active: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" />Depreciation Books</h1>
          <p className="text-muted-foreground">Multi-book depreciation: IFRS / Tax / Management / Group (SOCPA-aligned)</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Book</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Books</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
              <TableHead>Currency</TableHead><TableHead>Primary</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {books.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.book_code}</TableCell>
                  <TableCell><div className="font-medium">{b.book_name}</div><div className="text-xs text-muted-foreground" dir="rtl">{b.book_name_ar}</div></TableCell>
                  <TableCell><Badge variant="outline">{b.book_type}</Badge></TableCell>
                  <TableCell>{b.base_currency}</TableCell>
                  <TableCell>{b.is_primary && <Badge>Primary</Badge>}</TableCell>
                  <TableCell><Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
              {books.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No books</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Depreciation Book</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code</Label><Input value={draft.book_code || ''} onChange={(e) => setDraft({ ...draft, book_code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Name</Label><Input value={draft.book_name || ''} onChange={(e) => setDraft({ ...draft, book_name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Name (AR)</Label><Input dir="rtl" value={draft.book_name_ar || ''} onChange={(e) => setDraft({ ...draft, book_name_ar: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={draft.book_type} onValueChange={(v) => setDraft({ ...draft, book_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['ifrs', 'tax', 'management', 'statutory', 'group'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Currency</Label><Input value={draft.base_currency} onChange={(e) => setDraft({ ...draft, base_currency: e.target.value.toUpperCase() })} /></div>
            <div className="flex items-center gap-2"><Switch checked={draft.is_primary} onCheckedChange={(v) => setDraft({ ...draft, is_primary: v })} /><Label>Primary</Label></div>
            <div className="flex items-center gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); }} disabled={!draft.book_code || !draft.book_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
