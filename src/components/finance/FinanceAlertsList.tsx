import { format } from 'date-fns';
import { Bell, CheckCircle, Clock, AlertTriangle, ExternalLink, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinanceAlerts } from '@/hooks/useFinance';
import { useNavigate } from 'react-router-dom';

interface FinanceAlertsListProps {
  searchQuery?: string;
}

export function FinanceAlertsList({ searchQuery = '' }: FinanceAlertsListProps) {
  const { pendingAlerts, resolvedAlerts, isLoading, markAsRead, resolveAlert } = useFinanceAlerts();
  const navigate = useNavigate();

  const filteredPending = pendingAlerts.filter(a => 
    !searchQuery || 
    a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.sales_order?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredResolved = resolvedAlerts.filter(a => 
    !searchQuery || 
    a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.sales_order?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string | null): "destructive" | "secondary" | "outline" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Pending Alerts ({filteredPending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPending.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending alerts</p>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge variant={getPriorityColor(alert.priority)}>
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.description?.replace(/\. Payment slip attached: .+$/, '')}</p>
                      {alert.description?.includes('Payment slip attached:') && (
                        <a
                          href={alert.description.split('Payment slip attached: ')[1]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <FileDown className="h-3 w-3" />
                          View Payment Slip
                        </a>
                      )}
                      {alert.sales_order && (
                        <div className="text-xs text-muted-foreground mt-2">
                          SO-{alert.sales_order.doc_num} • {alert.sales_order.customer_name}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(alert.created_at), 'PPp')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {alert.sales_order_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sales-orders`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => resolveAlert.mutate(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Alerts */}
      {filteredResolved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-5 w-5" />
              Resolved Alerts ({filteredResolved.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredResolved.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg opacity-60"
                >
                  <div>
                    <h4 className="font-medium text-sm">{alert.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Resolved {alert.resolved_at && format(new Date(alert.resolved_at), 'PPp')}
                    </p>
                  </div>
                  <Badge variant="outline">Resolved</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
