import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, CheckCircle2, XCircle, Send, Play, Lock, RotateCcw, FileText } from 'lucide-react';
import { useBudgetApprovalHistory } from '@/hooks/useBudgetMasters';
import { format } from 'date-fns';

const ACTION_ICONS: Record<string, any> = {
  created: FileText,
  submitted: Send,
  approved: CheckCircle2,
  rejected: XCircle,
  activated: Play,
  frozen: Lock,
  closed: Lock,
  revised: RotateCcw,
  returned: RotateCcw,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-muted-foreground',
  submitted: 'text-blue-600',
  approved: 'text-green-600',
  rejected: 'text-destructive',
  activated: 'text-green-700',
  frozen: 'text-blue-700',
  closed: 'text-muted-foreground',
  revised: 'text-amber-600',
  returned: 'text-amber-600',
};

interface Props {
  versionId: string;
}

export function BudgetApprovalsTab({ versionId }: Props) {
  const { data: history = [], isLoading } = useBudgetApprovalHistory(versionId);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />Approval History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {history.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(h => {
                const Icon = ACTION_ICONS[h.action] || FileText;
                return (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${ACTION_COLORS[h.action] || ''}`} />
                        <Badge variant="outline" className="capitalize text-xs">{h.action}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{h.acted_by_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.role || '—'}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">{h.comments || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(h.acted_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {isLoading ? 'Loading...' : 'No approval history yet'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
