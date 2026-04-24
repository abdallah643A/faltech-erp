import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BudgetMaster, BudgetVersion } from '@/hooks/useBudgetMasters';
import { format } from 'date-fns';
import { FileText, Calendar, User, GitBranch } from 'lucide-react';

interface Props {
  budget: BudgetMaster;
  versions: BudgetVersion[];
}

export function BudgetAuditTrailTab({ budget, versions }: Props) {
  const events = [
    { action: 'Budget Created', date: budget.created_at, by: budget.budget_owner_name || 'System', detail: `Budget ${budget.budget_code} created as ${budget.budget_type}` },
    ...versions.flatMap(v => {
      const evts: any[] = [
        { action: `Version ${v.version_number} Created`, date: v.created_at, by: 'System', detail: v.revision_reason || 'Initial version' },
      ];
      if (v.submitted_at) evts.push({ action: `Version ${v.version_number} Submitted`, date: v.submitted_at, by: 'User', detail: 'Budget submitted for approval' });
      if (v.approved_at) evts.push({ action: `Version ${v.version_number} Approved`, date: v.approved_at, by: 'Approver', detail: 'Budget approved' });
      if (v.activated_at) evts.push({ action: `Version ${v.version_number} Activated`, date: v.activated_at, by: 'Finance', detail: 'Budget activated for use' });
      return evts;
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {events.map((e, i) => (
              <div key={i} className="relative pl-10">
                <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{e.action}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(e.date), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />{e.by}
                  </div>
                  <div className="text-xs mt-1">{e.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
