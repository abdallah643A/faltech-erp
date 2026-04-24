import { useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSAR } from '@/lib/currency';
import type { PLSection } from '@/hooks/useProfitLossData';

interface PLStatementTableProps {
  sections: PLSection[];
  showComparison: boolean;
  showBudget: boolean;
  comparisonLabel?: string;
  onDrillDown?: (acctCode: string, acctName: string) => void;
  onAddNote?: (sectionKey: string, lineLabel: string) => void;
}

export function PLStatementTable({ sections, showComparison, showBudget, comparisonLabel = 'Prior Period', onDrillDown, onAddNote }: PLStatementTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((key: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);

  const fmt = (n: number) => {
    const formatted = formatSAR(Math.abs(n));
    return n < 0 ? `(${formatted})` : formatted;
  };

  const varianceCell = (amount: number, compare: number) => {
    if (!showComparison && !showBudget) return null;
    const variance = amount - compare;
    const pct = compare !== 0 ? ((variance / Math.abs(compare)) * 100) : 0;
    return (
      <>
        <TableCell className="text-right font-mono text-xs">{fmt(compare)}</TableCell>
        <TableCell className={cn('text-right font-mono text-xs', variance >= 0 ? 'text-green-600' : 'text-destructive')}>
          {fmt(variance)}
        </TableCell>
        <TableCell className={cn('text-right font-mono text-xs', variance >= 0 ? 'text-green-600' : 'text-destructive')}>
          {Math.abs(pct).toFixed(1)}%
        </TableCell>
      </>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="text-right w-[15%]">Amount (SAR)</TableHead>
            {(showComparison || showBudget) && (
              <>
                <TableHead className="text-right w-[15%]">{showBudget ? 'Budget' : comparisonLabel}</TableHead>
                <TableHead className="text-right w-[15%]">Variance</TableHead>
                <TableHead className="text-right w-[15%]">Var %</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map(section => {
            const isCalc = section.type === 'calculated';
            const isExpanded = expanded.has(section.key);
            const hasLines = section.lines.length > 0;
            const compareVal = showBudget ? section.budgetAmount : section.compareAmount;

            return (
              <> 
                {/* Section header */}
                <TableRow
                  key={section.key}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isCalc ? 'bg-primary/5 font-bold border-t-2 border-primary/20' : 'bg-muted/30 font-semibold',
                    'hover:bg-accent/30'
                  )}
                  onClick={() => hasLines && toggleSection(section.key)}
                >
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      {hasLines && (
                        <span className="w-4 h-4 flex items-center">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </span>
                      )}
                      {!hasLines && <span className="w-4" />}
                      <span className={cn('text-sm', isCalc && 'text-primary')}>{section.label}</span>
                      {isCalc && <Badge variant="outline" className="text-[9px] h-4 ml-1">Calculated</Badge>}
                      {onAddNote && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); onAddNote(section.key, section.label); }}>
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-sm py-2', isCalc && 'text-primary font-bold', section.amount < 0 && 'text-destructive')}>
                    {fmt(section.amount)}
                  </TableCell>
                  {varianceCell(section.amount, compareVal)}
                </TableRow>

                {/* Expanded lines */}
                {isExpanded && section.lines.map(line => (
                  <TableRow
                    key={line.id}
                    className="hover:bg-accent/20 cursor-pointer"
                    onClick={() => onDrillDown?.(line.id, line.label)}
                  >
                    <TableCell className="py-1.5 pl-12">
                      <span className="text-xs text-muted-foreground font-mono mr-2">{line.id}</span>
                      <span className="text-xs">{line.label}</span>
                    </TableCell>
                    <TableCell className={cn('text-right font-mono text-xs py-1.5', line.amount < 0 && 'text-destructive')}>
                      {fmt(line.amount)}
                    </TableCell>
                    {(showComparison || showBudget) && varianceCell(line.amount, showBudget ? line.budgetAmount : line.compareAmount)}
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
