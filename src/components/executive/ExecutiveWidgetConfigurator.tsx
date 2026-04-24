import { useState } from 'react';
import { useExecutiveReporting } from '@/hooks/useExecutiveReporting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from 'lucide-react';

const AVAILABLE_WIDGETS = [
  { key: 'kpi_grid', label: 'KPI Grid' },
  { key: 'pending_actions', label: 'Pending Approvals' },
  { key: 'cross_company_kpis', label: 'Cross-Company KPIs' },
  { key: 'top_risks', label: 'Top Risks' },
  { key: 'doc_expiry', label: 'Document Expiry' },
  { key: 'ai_insights', label: 'AI Insights' },
  { key: 'shortcuts', label: 'Module Shortcuts' },
];

const ROLES = ['ceo', 'cfo', 'coo', 'board', 'manager'];

/**
 * Premium configurator: per-role widget visibility for the Executive Workspace.
 * Persists to exec_role_widget_configs via useExecutiveReporting().upsertWidgetConfig.
 */
export function ExecutiveWidgetConfigurator() {
  const { widgetConfigs, upsertWidgetConfig } = useExecutiveReporting();
  const [role, setRole] = useState<string>('ceo');

  const isVisible = (widgetKey: string) => {
    const cfg = (widgetConfigs.data ?? []).find((c: any) => c.role === role && c.widget_key === widgetKey);
    return cfg?.is_visible ?? true;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Layout className="h-4 w-4" /> Role-Based Widgets
        </CardTitle>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        {AVAILABLE_WIDGETS.map((w, idx) => (
          <div key={w.key} className="flex items-center justify-between border rounded p-2">
            <span className="text-sm">{w.label}</span>
            <Switch
              checked={isVisible(w.key)}
              onCheckedChange={(checked) =>
                upsertWidgetConfig.mutate({
                  role, widget_key: w.key, is_visible: checked, display_order: idx,
                })
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
