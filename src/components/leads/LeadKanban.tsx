import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Phone, Mail, Star, ArrowUp, ArrowDown, RefreshCw, Users } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface LeadKanbanProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onAddActivity: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onSyncToSAP: (id: string) => void;
  getUserName: (userId: string | null) => string;
}

const stages = [
  { key: 'New', label: 'New', color: 'bg-success/10 border-success/30', headerColor: 'text-success' },
  { key: 'Hot', label: 'Hot', color: 'bg-destructive/10 border-destructive/30', headerColor: 'text-destructive' },
  { key: 'Warm', label: 'Warm', color: 'bg-warning/10 border-warning/30', headerColor: 'text-warning' },
  { key: 'Cold', label: 'Cold', color: 'bg-info/10 border-info/30', headerColor: 'text-info' },
];

// Normalize status: map DB values (active/inactive/blocked) back to UI stages
function getLeadStage(lead: Lead): string {
  const s = lead.status?.toLowerCase();
  if (s === 'active') return 'Hot';
  if (s === 'inactive') return 'Cold';
  if (s === 'blocked') return 'Cold';
  // Direct match
  if (['New', 'Hot', 'Warm', 'Cold'].includes(lead.status || '')) return lead.status!;
  return 'New';
}

export function LeadKanban({ leads, onEdit, onConvert, onAddActivity, onDelete, onSyncToSAP, getUserName }: LeadKanbanProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const getScoreColor = (score: number | null) => {
    const s = score || 50;
    if (s >= 80) return 'text-success';
    if (s >= 50) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stages.map(stage => {
        const stageLeads = leads.filter(l => getLeadStage(l) === stage.key);
        return (
          <div
            key={stage.key}
            className={cn(
              'enterprise-card border-t-4 min-h-[300px] transition-colors',
              stage.color,
              dragOverStage === stage.key && 'ring-2 ring-primary'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={() => setDragOverStage(null)}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className={cn('font-semibold text-sm', stage.headerColor)}>{stage.label}</h3>
                <Badge variant="outline" className="text-xs">{stageLeads.length}</Badge>
              </div>
            </div>
            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
              {stageLeads.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No leads</p>
              ) : (
                stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onEdit(lead)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {lead.card_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{lead.card_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{lead.card_code}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(lead); }}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConvert(lead); }}>Convert to Opportunity</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddActivity(lead); }}>Add Activity</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSyncToSAP(lead.id); }}>
                            <ArrowUp className="mr-2 h-4 w-4" />Sync to SAP
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(lead); }}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-1.5">
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Mail className="h-3 w-3" /><span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Phone className="h-3 w-3" /><span>{lead.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <div className="relative w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              background: `conic-gradient(${
                                (lead.score || 50) >= 80 ? 'hsl(var(--success))' :
                                (lead.score || 50) >= 50 ? 'hsl(var(--warning))' :
                                'hsl(var(--muted-foreground))'
                              } ${((lead.score || 50) / 100) * 360}deg, hsl(var(--muted)) 0deg)`
                            }}
                          >
                            <div className="w-5 h-5 rounded-full bg-card flex items-center justify-center">
                              <span className={cn('text-[9px] font-bold', getScoreColor(lead.score))}>{lead.score || 50}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span className="truncate max-w-[80px]">{getUserName(lead.assigned_to)}</span>
                        </div>
                      </div>
                      {lead.source && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{lead.source}</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
