import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';

export interface RecentDoc {
  id: string;
  docNum: string;
  type: string;
  partner?: string;
  status: string;
  date: string;
  href: string;
  amount?: number;
}

const statusColors: Record<string, string> = {
  open: 'default',
  draft: 'secondary',
  approved: 'default',
  pending: 'outline',
  closed: 'secondary',
  cancelled: 'destructive',
};

interface Props {
  title?: string;
  docs: RecentDoc[];
}

export function WorkspaceRecentDocs({ title = 'Recent Documents', docs }: Props) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent documents</p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(doc.href)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{doc.docNum}</span>
                    <Badge variant={(statusColors[doc.status] || 'secondary') as any} className="text-[9px] px-1">
                      {doc.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {doc.type}{doc.partner ? ` · ${doc.partner}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {doc.amount !== undefined && (
                    <p className="text-xs font-medium">{doc.amount.toLocaleString()}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(doc.date), 'dd MMM')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
