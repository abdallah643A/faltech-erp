import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Loader2,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSAPSync, EntityType, SyncDirection } from '@/hooks/useSAPSync';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { SAPConnectionSettings } from './SAPConnectionSettings';

interface SyncLog {
  id: string;
  entity_type: string;
  direction: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface SyncConflict {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  crm_value: string;
  sap_value: string;
  resolved: boolean;
  created_at: string;
}

const statusIcons = {
  pending: <Clock className="h-4 w-4 text-warning" />,
  synced: <CheckCircle className="h-4 w-4 text-success" />,
  conflict: <AlertTriangle className="h-4 w-4 text-warning" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
};

const statusBadgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  synced: 'default',
  conflict: 'outline',
  error: 'destructive',
};

const directionIcons = {
  to_sap: <ArrowUp className="h-4 w-4" />,
  from_sap: <ArrowDown className="h-4 w-4" />,
  bidirectional: <ArrowLeftRight className="h-4 w-4" />,
};

export function SAPSyncDashboard() {
  const { t } = useLanguage();
  const { sync, testConnection, isLoading } = useSAPSync();
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchData = async () => {
    setLoadingLogs(true);
    
    const [logsResult, conflictsResult] = await Promise.all([
      supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('sync_conflicts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (logsResult.data) setSyncLogs(logsResult.data);
    if (conflictsResult.data) setConflicts(conflictsResult.data);
    setLoadingLogs(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBulkSync = async (entity: EntityType, direction: SyncDirection) => {
    await sync(entity, direction);
    fetchData();
  };

  const resolveConflict = async (conflictId: string, resolution: 'use_crm' | 'use_sap') => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    await supabase
      .from('sync_conflicts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution,
        resolved_value: resolution === 'use_crm' ? conflict.crm_value : conflict.sap_value,
      })
      .eq('id', conflictId);

    fetchData();
  };

  const entities: { key: EntityType; label: string }[] = [
    { key: 'business_partner', label: 'Business Partners' },
    { key: 'item', label: 'Items' },
    { key: 'sales_order', label: 'Sales Orders' },
    { key: 'incoming_payment', label: 'Incoming Payments' },
    { key: 'purchase_request', label: 'Purchase Requests' },
    { key: 'purchase_quotation', label: 'Purchase Quotations' },
    { key: 'purchase_order', label: 'Purchase Orders' },
    { key: 'goods_receipt', label: 'Goods Receipts' },
    { key: 'ap_invoice_payable', label: 'AP Invoices' },
    { key: 'opportunity', label: 'Opportunities' },
    { key: 'activity', label: 'Activities' },
    { key: 'quote', label: 'Quotes' },
    { key: 'journal_entry', label: 'Journal Entries' },
    { key: 'journal_voucher', label: 'Journal Vouchers' },
  ];

  return (
    <div className="space-y-6">
      {/* SAP Connection Settings */}
      <SAPConnectionSettings />

      {/* Bulk Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data Synchronization
          </CardTitle>
          <CardDescription>
            Sync data between CRM and SAP Business One
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {entities.map(({ key, label }) => (
              <Card key={key} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleBulkSync(key, 'from_sap')}
                    disabled={isLoading}
                  >
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Pull from SAP
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleBulkSync(key, 'to_sap')}
                    disabled={isLoading}
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Push to SAP
                  </Button>
                  <Button 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => handleBulkSync(key, 'bidirectional')}
                    disabled={isLoading}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Two-way Sync
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Logs and Conflicts */}
      <Tabs defaultValue="conflicts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conflicts" className="relative">
            Conflicts
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs">
                {conflicts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Pending Conflicts
              </CardTitle>
              <CardDescription>
                Review and resolve data conflicts between CRM and SAP B1
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                  <p>No pending conflicts</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>CRM Value</TableHead>
                      <TableHead>SAP Value</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map((conflict) => (
                      <TableRow key={conflict.id}>
                        <TableCell>
                          <Badge variant="outline">{conflict.entity_type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{conflict.field_name}</TableCell>
                        <TableCell className="max-w-32 truncate" title={conflict.crm_value}>
                          {conflict.crm_value || '-'}
                        </TableCell>
                        <TableCell className="max-w-32 truncate" title={conflict.sap_value}>
                          {conflict.sap_value || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(conflict.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => resolveConflict(conflict.id, 'use_crm')}
                            >
                              Use CRM
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => resolveConflict(conflict.id, 'use_sap')}
                            >
                              Use SAP
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>Recent synchronization operations</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loadingLogs}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : syncLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2" />
                  <p>No sync history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="min-w-[300px]">Error Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcons[log.status as keyof typeof statusIcons]}
                            <Badge variant={statusBadgeVariants[log.status]}>
                              {log.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{log.entity_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {directionIcons[log.direction as keyof typeof directionIcons]}
                            <span className="text-sm">{log.direction}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(log.started_at), 'MMM d, HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.completed_at 
                            ? format(new Date(log.completed_at), 'MMM d, HH:mm:ss')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {log.error_message ? (
                            <div className="text-destructive text-sm max-w-[400px]">
                              <details className="cursor-pointer">
                                <summary className="truncate hover:text-clip">
                                  {log.error_message.slice(0, 80)}
                                  {log.error_message.length > 80 ? '...' : ''}
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap text-xs bg-destructive/10 p-2 rounded max-h-40 overflow-auto">
                                  {log.error_message}
                                </pre>
                              </details>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
