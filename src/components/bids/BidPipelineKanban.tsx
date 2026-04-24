import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBidManagement } from '@/hooks/useBidManagement';
import { DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

const stages = [
  { key: 'draft', label: 'Draft', color: 'border-t-muted-foreground' },
  { key: 'qualifying', label: 'Qualifying', color: 'border-t-blue-500' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-yellow-500' },
  { key: 'under_review', label: 'Under Review', color: 'border-t-purple-500' },
  { key: 'approved', label: 'Approved', color: 'border-t-emerald-500' },
  { key: 'submitted', label: 'Submitted', color: 'border-t-indigo-500' },
];

export default function BidPipelineKanban() {
  const { bids, updateBid } = useBidManagement();

  const bidsByStage = stages.map(stage => ({
    ...stage,
    bids: (bids.data || []).filter(b => b.status === stage.key),
    totalValue: (bids.data || []).filter(b => b.status === stage.key).reduce((s, b) => s + (b.estimated_value || 0), 0),
  }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {bidsByStage.map(stage => (
        <div key={stage.key} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
            <Badge variant="secondary" className="text-xs">{stage.bids.length}</Badge>
          </div>
          <div className="text-xs text-muted-foreground px-1">
            {stage.totalValue > 0 ? `${(stage.totalValue / 1000).toFixed(0)}K SAR` : '-'}
          </div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-2">
              {stage.bids.map(bid => {
                const daysLeft = bid.due_date ? differenceInDays(new Date(bid.due_date), new Date()) : null;
                const isUrgent = daysLeft !== null && daysLeft <= 3;
                return (
                  <Card key={bid.id} className={`border-t-4 ${stage.color} cursor-pointer hover:shadow-md transition-shadow`}>
                    <CardContent className="p-3 space-y-2">
                      <p className="font-medium text-sm leading-tight">{bid.title}</p>
                      <p className="text-xs text-muted-foreground">{bid.client_name || 'No client'}</p>
                      {bid.due_date && (
                        <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                          {isUrgent ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {daysLeft !== null && daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}
                          <span className="ml-auto">{format(new Date(bid.due_date), 'dd MMM')}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          {(bid.estimated_value || 0).toLocaleString()}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{bid.priority}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {stage.bids.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">No bids</div>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
