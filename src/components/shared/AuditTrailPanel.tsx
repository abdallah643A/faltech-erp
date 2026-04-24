import { useState, useMemo } from 'react';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ChevronDown, ChevronRight, User, Clock, Edit, Plus, Trash2, CheckCircle, XCircle, RefreshCw, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface AuditTrailPanelProps {
  /** The DB table name, e.g. 'sales_orders' */
  tableName: string;
  /** The specific record ID to show history for. If omitted, shows all records for the table. */
  recordId?: string;
  /** Max height of the panel */
  maxHeight?: string;
  /** Whether to show the table name column (useful when showing all tables) */
  showTable?: boolean;
  /** Title override */
  title?: string;
}

const CRITICAL_FIELDS = [
  'status', 'workflow_status', 'total', 'subtotal', 'tax_amount',
  'contract_value', 'unit_price', 'quantity', 'amount',
  'vendor_code', 'vendor_name', 'vendor_id',
  'customer_code', 'customer_name', 'customer_id',
  'project_id', 'business_partner_id',
  'doc_date', 'doc_due_date', 'posting_date', 'expected_close',
  'stage', 'probability', 'value', 'priority',
  'employment_status', 'department_id', 'position_id', 'manager_id',
  'sync_status', 'sap_doc_entry',
];

const ACTION_CONFIG: Record<string, { icon: typeof Edit; color: string; label: string }> = {
  INSERT: { icon: Plus, color: 'text-green-600 bg-green-100 dark:bg-green-900/30', label: 'Created' },
  UPDATE: { icon: Edit, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', label: 'Edited' },
  DELETE: { icon: Trash2, color: 'text-red-600 bg-red-100 dark:bg-red-900/30', label: 'Deleted' },
};

function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  // Check if date string
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try { return format(new Date(val), 'dd MMM yyyy HH:mm'); } catch { return val; }
  }
  return String(val);
}

function getActionFromEntry(entry: any): string {
  // Infer richer action types from field changes
  if (entry.action === 'UPDATE' && entry.changed_fields) {
    const fields = entry.changed_fields as string[];
    if (fields.includes('sync_status') || fields.includes('last_synced_at')) return 'SYNC';
    if (fields.includes('workflow_status')) {
      const newStatus = entry.new_values?.workflow_status;
      if (newStatus === 'finance_approved' || newStatus === 'approved') return 'APPROVE';
      if (newStatus === 'finance_rejected' || newStatus === 'rejected') return 'REJECT';
    }
    if (fields.includes('status')) {
      const newStatus = entry.new_values?.status;
      if (newStatus === 'approved') return 'APPROVE';
      if (newStatus === 'rejected') return 'REJECT';
    }
  }
  return entry.action;
}

const EXTENDED_ACTION_CONFIG: Record<string, { icon: typeof Edit; color: string; label: string }> = {
  ...ACTION_CONFIG,
  SYNC: { icon: RefreshCw, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30', label: 'Synced' },
  APPROVE: { icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30', label: 'Approved' },
  REJECT: { icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30', label: 'Rejected' },
};

export function AuditTrailPanel({
  tableName,
  recordId,
  maxHeight = '500px',
  showTable = false,
  title,
}: AuditTrailPanelProps) {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { entries, isLoading } = useAuditTrail({
    table_name: tableName,
    record_id: recordId,
    limit: 500,
  });

  const enrichedEntries = useMemo(() => {
    if (!entries) return [];
    return entries.map(e => ({
      ...e,
      richAction: getActionFromEntry(e),
    }));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = enrichedEntries;
    if (actionFilter !== 'all') {
      result = result.filter(e => e.richAction === actionFilter);
    }
    if (userFilter) {
      const lf = userFilter.toLowerCase();
      result = result.filter(e =>
        e.user_name?.toLowerCase().includes(lf) ||
        e.user_email?.toLowerCase().includes(lf)
      );
    }
    return result;
  }, [enrichedEntries, actionFilter, userFilter]);

  // Get unique users for reference
  const uniqueActions = useMemo(() => {
    const set = new Set(enrichedEntries.map(e => e.richAction));
    return Array.from(set);
  }, [enrichedEntries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        {title && <h3 className="text-sm font-semibold mr-auto">{title}</h3>}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-7 text-xs w-[120px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(a => (
                  <SelectItem key={a} value={a}>
                    {EXTENDED_ACTION_CONFIG[a]?.label || a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Filter by user..."
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="h-7 text-xs pl-7 w-[150px]"
            />
          </div>
          <Badge variant="outline" className="text-[10px] h-5">{filteredEntries.length} entries</Badge>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea style={{ maxHeight }}>
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No audit history found
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-1">
              {filteredEntries.map((entry) => {
                const config = EXTENDED_ACTION_CONFIG[entry.richAction] || ACTION_CONFIG.UPDATE;
                const Icon = config.icon;
                const isExpanded = expandedId === entry.id;
                const changedFields = (entry.changed_fields as string[]) || [];
                const criticalChanges = changedFields.filter(f => CRITICAL_FIELDS.includes(f));
                const otherChanges = changedFields.filter(f => !CRITICAL_FIELDS.includes(f) && !['updated_at', 'last_synced_at', 'created_at'].includes(f));

                return (
                  <Collapsible
                    key={entry.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-start gap-3 py-2 px-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors relative">
                        {/* Icon */}
                        <div className={`relative z-10 flex items-center justify-center h-8 w-8 rounded-full ${config.color} flex-shrink-0`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{config.label}</Badge>
                            {showTable && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {entry.table_name?.replace(/_/g, ' ')}
                              </Badge>
                            )}
                            {criticalChanges.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {criticalChanges.slice(0, 3).map(formatFieldName).join(', ')}
                                {criticalChanges.length > 3 && ` +${criticalChanges.length - 3}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              {entry.user_name || entry.user_email || 'System'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy HH:mm') : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Expand indicator */}
                        {(changedFields.length > 0 || entry.action === 'INSERT' || entry.action === 'DELETE') && (
                          <div className="flex-shrink-0 mt-1">
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="ml-11 mb-2 p-2.5 rounded-md border bg-muted/30 text-xs space-y-2">
                        {/* Critical field changes */}
                        {criticalChanges.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Changes</p>
                            <div className="space-y-1">
                              {criticalChanges.map(field => (
                                <div key={field} className="flex items-center gap-2">
                                  <span className="font-medium text-foreground min-w-[100px]">{formatFieldName(field)}</span>
                                  <span className="text-muted-foreground line-through">
                                    {formatValue(entry.old_values?.[field])}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-foreground font-medium">
                                    {formatValue(entry.new_values?.[field])}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other field changes */}
                        {otherChanges.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Other Changes</p>
                            <div className="space-y-1">
                              {otherChanges.slice(0, 10).map(field => (
                                <div key={field} className="flex items-center gap-2">
                                  <span className="font-medium text-foreground min-w-[100px]">{formatFieldName(field)}</span>
                                  <span className="text-muted-foreground line-through text-[10px]">
                                    {formatValue(entry.old_values?.[field])}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-foreground text-[10px]">
                                    {formatValue(entry.new_values?.[field])}
                                  </span>
                                </div>
                              ))}
                              {otherChanges.length > 10 && (
                                <p className="text-muted-foreground">+{otherChanges.length - 10} more fields</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* For INSERT - show created values */}
                        {entry.action === 'INSERT' && entry.new_values && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Created With</p>
                            <div className="space-y-1">
                              {Object.entries(entry.new_values)
                                .filter(([k]) => CRITICAL_FIELDS.includes(k) && entry.new_values[k] != null)
                                .slice(0, 10)
                                .map(([k, v]) => (
                                  <div key={k} className="flex items-center gap-2">
                                    <span className="font-medium min-w-[100px]">{formatFieldName(k)}</span>
                                    <span className="text-foreground">{formatValue(v)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* For DELETE - show deleted values */}
                        {entry.action === 'DELETE' && entry.old_values && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Deleted Record</p>
                            <div className="space-y-1">
                              {Object.entries(entry.old_values)
                                .filter(([k]) => CRITICAL_FIELDS.includes(k) && entry.old_values[k] != null)
                                .slice(0, 10)
                                .map(([k, v]) => (
                                  <div key={k} className="flex items-center gap-2">
                                    <span className="font-medium min-w-[100px]">{formatFieldName(k)}</span>
                                    <span className="text-foreground">{formatValue(v)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {entry.ip_address && (
                          <p className="text-[10px] text-muted-foreground">IP: {entry.ip_address}</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
