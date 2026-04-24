import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GitBranch, Check, X, Play, Lock, Send, RotateCcw } from 'lucide-react';
import { BudgetVersion, useBudgetVersions } from '@/hooks/useBudgetMasters';
import { format } from 'date-fns';
import { formatSAR } from '@/lib/currency';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-green-500 text-white',
  rejected: 'bg-destructive/10 text-destructive',
  superseded: 'bg-muted text-muted-foreground line-through',
  closed: 'bg-muted text-muted-foreground',
  frozen: 'bg-blue-200 text-blue-800',
};

interface Props {
  budgetId: string;
  activeVersionId: string | null;
  onVersionSelect: (v: BudgetVersion) => void;
}

export function BudgetVersionsTab({ budgetId, activeVersionId, onVersionSelect }: Props) {
  const { data: versions = [], createRevision, updateStatus } = useBudgetVersions(budgetId);
  const [revisionDialog, setRevisionDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ versionId: string; action: string } | null>(null);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  const handleCreateRevision = () => {
    createRevision.mutate({ budgetId, reason });
    setRevisionDialog(false);
    setReason('');
  };

  const handleAction = () => {
    if (!actionDialog) return;
    updateStatus.mutate({ versionId: actionDialog.versionId, status: actionDialog.action, comments });
    setActionDialog(null);
    setComments('');
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />Versions & Revisions
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setRevisionDialog(true)}>
            <RotateCcw className="h-4 w-4 mr-1" />Create Revision
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Original</TableHead>
              <TableHead className="text-right">Revised</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map(v => (
              <TableRow key={v.id} className={v.id === activeVersionId ? 'bg-primary/5' : ''}>
                <TableCell>
                  <button onClick={() => onVersionSelect(v)} className="font-medium text-primary hover:underline">
                    v{v.version_number}
                  </button>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${STATUS_COLORS[v.status] || ''}`}>
                    {v.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{v.revision_reason || '—'}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatSAR(v.total_original)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatSAR(v.total_revised)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatSAR(v.total_committed)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatSAR(v.total_actual)}</TableCell>
                <TableCell className="text-xs">{format(new Date(v.created_at), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {v.status === 'draft' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActionDialog({ versionId: v.id, action: 'submitted' })}>
                        <Send className="h-3 w-3 mr-1" />Submit
                      </Button>
                    )}
                    {v.status === 'submitted' && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => setActionDialog({ versionId: v.id, action: 'approved' })}>
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setActionDialog({ versionId: v.id, action: 'rejected' })}>
                          <X className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </>
                    )}
                    {v.status === 'approved' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActionDialog({ versionId: v.id, action: 'active' })}>
                        <Play className="h-3 w-3 mr-1" />Activate
                      </Button>
                    )}
                    {v.status === 'active' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActionDialog({ versionId: v.id, action: 'frozen' })}>
                        <Lock className="h-3 w-3 mr-1" />Freeze
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Revision Dialog */}
      <Dialog open={revisionDialog} onOpenChange={setRevisionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Budget Revision</DialogTitle></DialogHeader>
          <div>
            <Label>Revision Reason *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this revision needed?" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRevision} disabled={!reason || createRevision.isPending}>Create Revision</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="capitalize">{actionDialog?.action?.replace('_', ' ')} Budget Version</DialogTitle></DialogHeader>
          <div>
            <Label>Comments</Label>
            <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Add comments..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleAction} disabled={updateStatus.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
