import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDocumentFlow, DocFlowNode, FlowChain } from '@/hooks/useDocumentFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ArrowRight, ExternalLink, CheckCircle2, Clock, AlertTriangle,
  XCircle, FileText, GitBranch, Loader2,
} from 'lucide-react';

interface DocumentRelationshipMapProps {
  chain: FlowChain;
  documentType: string;
  documentId: string;
  /** Compact mode for embedding in headers */
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  approved: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  closed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  open: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  draft: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted' },
  pending_finance: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  rejected: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  cancelled: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

function getStatusConfig(status: string | null) {
  if (!status) return STATUS_CONFIG.draft;
  const key = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_CONFIG[key] || STATUS_CONFIG.open;
}

export default function DocumentRelationshipMap({
  chain, documentType, documentId, compact = false, className,
}: DocumentRelationshipMapProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: nodes = [], isLoading } = useDocumentFlow({ chain, documentType, documentId });

  if (isLoading) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{isAr ? 'جاري تحميل سلسلة المستندات...' : 'Loading document flow...'}</span>
        </CardContent>
      </Card>
    );
  }

  if (nodes.length === 0) return null;

  // Find first missing step in the middle of existing steps
  const firstExisting = nodes.findIndex(n => n.exists);
  const lastExisting = nodes.length - 1 - [...nodes].reverse().findIndex(n => n.exists);
  const missingSteps = nodes.filter((n, i) => !n.exists && i > firstExisting && i < lastExisting);

  const content = (
    <div className={cn('relative', isAr && 'direction-ltr')}>
      {/* Flow container */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2 scrollbar-thin">
        {nodes.map((node, idx) => {
          const sc = getStatusConfig(node.status);
          const StatusIcon = sc.icon;
          const isLast = idx === nodes.length - 1;

          return (
            <div key={node.step} className="flex items-stretch shrink-0">
              {/* Node card */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative flex flex-col items-center border rounded-lg transition-all',
                        compact ? 'min-w-[100px] px-2 py-2' : 'min-w-[140px] px-3 py-3',
                        node.isCurrent && 'ring-2 ring-primary shadow-md',
                        node.exists
                          ? 'bg-card border-border cursor-pointer hover:shadow-md'
                          : 'bg-muted/30 border-dashed border-muted-foreground/30',
                      )}
                      onClick={() => node.exists && node.route && navigate(node.route)}
                    >
                      {/* Header label */}
                      <div className={cn(
                        'text-center font-semibold border-b pb-1.5 mb-1.5 w-full',
                        compact ? 'text-[10px]' : 'text-xs',
                        node.exists ? 'text-foreground border-border' : 'text-muted-foreground border-muted-foreground/20',
                      )}>
                        {isAr ? node.labelAr : node.label}
                      </div>

                      {node.exists ? (
                        <>
                          {/* Doc number */}
                          <p className={cn('font-mono font-medium text-center', compact ? 'text-[10px]' : 'text-xs')}>
                            {node.docNumber}
                          </p>
                          {/* Date */}
                          {node.createdAt && (
                            <p className={cn('text-muted-foreground text-center', compact ? 'text-[9px]' : 'text-[10px]')}>
                              {format(new Date(node.createdAt), 'dd.MM.yy')}
                            </p>
                          )}
                          {/* Amount */}
                          {node.total != null && (
                            <p className={cn(
                              'font-medium text-center mt-0.5',
                              compact ? 'text-[10px]' : 'text-xs',
                              node.status === 'rejected' || node.status === 'cancelled'
                                ? 'text-destructive line-through'
                                : 'text-foreground',
                            )}>
                              {node.currency || 'SAR'} {node.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                          {/* Status badge */}
                          <Badge className={cn('mt-1.5', sc.bg, sc.color, compact ? 'text-[8px] px-1 py-0' : 'text-[9px] px-1.5 py-0')}>
                            <StatusIcon className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3', 'mr-0.5')} />
                            {node.status || 'Active'}
                          </Badge>
                          {/* Open link */}
                          {node.route && !compact && (
                            <Button
                              variant="ghost" size="sm"
                              className="mt-1 h-5 text-[9px] text-primary gap-0.5 px-1"
                              onClick={(e) => { e.stopPropagation(); navigate(node.route!); }}
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> Open
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center flex-1 py-1">
                          <AlertTriangle className={cn('text-muted-foreground/40', compact ? 'h-3 w-3' : 'h-4 w-4')} />
                          <p className={cn('text-muted-foreground/50 text-center', compact ? 'text-[8px]' : 'text-[10px]')}>
                            {isAr ? 'لم يُنشأ بعد' : 'Not created'}
                          </p>
                        </div>
                      )}

                      {/* Current indicator */}
                      {node.isCurrent && (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                          <div className="bg-primary text-primary-foreground text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            {isAr ? 'الحالي' : 'Current'}
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="font-medium">{isAr ? node.labelAr : node.label}</p>
                    {node.exists ? (
                      <>
                        <p className="text-xs">{node.docNumber}</p>
                        {node.createdAt && <p className="text-xs text-muted-foreground">{format(new Date(node.createdAt), 'PPP')}</p>}
                        {node.total != null && <p className="text-xs font-medium">{node.currency || 'SAR'} {node.total.toLocaleString()}</p>}
                        <p className="text-xs">Status: {node.status || 'Active'}</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{isAr ? 'هذا المستند لم يُنشأ بعد في السلسلة' : 'This document has not been created yet in the chain'}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Arrow connector */}
              {!isLast && (
                <div className="flex items-center px-1">
                  <div className={cn(
                    'flex items-center',
                    node.exists && nodes[idx + 1]?.exists
                      ? 'text-primary'
                      : 'text-muted-foreground/30',
                  )}>
                    <div className={cn(
                      'h-[2px] border-t-2',
                      compact ? 'w-4' : 'w-6',
                      node.exists && nodes[idx + 1]?.exists
                        ? 'border-primary'
                        : 'border-dashed border-muted-foreground/30',
                    )} />
                    <ArrowRight className={compact ? 'h-3 w-3 -ml-1' : 'h-4 w-4 -ml-1'} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Missing step warnings */}
      {missingSteps.length > 0 && !compact && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {missingSteps.map(ms => (
            <Badge key={ms.step} variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/10">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {isAr ? `${ms.labelAr} مفقود` : `Missing: ${ms.label}`}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  if (compact) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="py-3 px-4 flex-row items-center gap-2 space-y-0 border-b bg-muted/30">
        <GitBranch className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-medium">
          {isAr ? 'خريطة العلاقات' : 'Relationship Map'}
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {chain === 'crm' ? (isAr ? 'مبيعات' : 'Sales') : (isAr ? 'مشتريات' : 'Procurement')}
        </Badge>
      </CardHeader>
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
}
