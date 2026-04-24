import { useState } from 'react';
import { useWorkbooks, useSheets, useSSComments } from '@/hooks/useSpreadsheetStudio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, CheckCircle, Clock, User, Send } from 'lucide-react';
import { format } from 'date-fns';

const COL_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function CommentsReview() {
  const { data: workbooks = [] } = useWorkbooks();
  const [selectedWb, setSelectedWb] = useState('');
  const { data: sheets = [] } = useSheets(selectedWb || undefined);
  const [selectedSheet, setSelectedSheet] = useState('');
  const { data: comments = [], create, resolve } = useSSComments(selectedSheet || undefined);
  const [newComment, setNewComment] = useState('');
  const [newRow, setNewRow] = useState('1');
  const [newCol, setNewCol] = useState('0');
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const filteredComments = comments.filter(c => {
    if (filter === 'open') return !c.is_resolved;
    if (filter === 'resolved') return c.is_resolved;
    return true;
  });

  const handleAddComment = () => {
    if (!selectedSheet || !newComment.trim()) return;
    const mentions = newComment.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
    create.mutate({
      sheet_id: selectedSheet,
      row_index: parseInt(newRow) - 1,
      col_index: parseInt(newCol),
      comment: newComment,
      mentions,
    }, { onSuccess: () => setNewComment('') });
  };

  const openCount = comments.filter(c => !c.is_resolved).length;
  const resolvedCount = comments.filter(c => c.is_resolved).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6" />Comments & Review</h1>
        <p className="text-muted-foreground">Review and manage cell-level comments across workbooks</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><MessageCircle className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{comments.length}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-500" /><div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-muted-foreground">Open</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{resolvedCount}</p><p className="text-xs text-muted-foreground">Resolved</p></div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Select value={selectedWb} onValueChange={v => { setSelectedWb(v); setSelectedSheet(''); }}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Workbook" /></SelectTrigger>
          <SelectContent>{workbooks.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
        </Select>
        {sheets.length > 0 && (
          <Select value={selectedSheet} onValueChange={setSelectedSheet}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select Sheet" /></SelectTrigger>
            <SelectContent>{sheets.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedSheet && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add Comment</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="w-24"><Input placeholder="Row" value={newRow} onChange={e => setNewRow(e.target.value)} type="number" min={1} /></div>
              <div className="w-32">
                <Select value={newCol} onValueChange={setNewCol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COL_LABELS.slice(0, 12).map((l, i) => <SelectItem key={i} value={String(i)}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment... use @name to mention" className="flex-1" />
              <Button onClick={handleAddComment} disabled={!newComment.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filteredComments.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No comments found</CardContent></Card>
        ) : filteredComments.map(c => (
          <Card key={c.id} className={c.is_resolved ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">{COL_LABELS[c.col_index]}{c.row_index + 1}</Badge>
                  <span className="text-sm font-medium flex items-center gap-1"><User className="h-3 w-3" />{c.author_name || 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'MMM dd, HH:mm')}</span>
                </div>
                {!c.is_resolved && (
                  <Button size="sm" variant="outline" onClick={() => resolve.mutate(c.id)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />Resolve
                  </Button>
                )}
              </div>
              <p className="text-sm">{c.comment}</p>
              {c.mentions && c.mentions.length > 0 && (
                <div className="mt-2 flex gap-1">{c.mentions.map((m: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">@{m}</Badge>)}</div>
              )}
              {c.is_resolved && <Badge className="mt-2 bg-green-500/10 text-green-700">Resolved</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
