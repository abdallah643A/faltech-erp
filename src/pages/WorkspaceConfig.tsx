import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings2, Plus, Trash2, Save, LayoutDashboard } from 'lucide-react';
import { WORKSPACES, type WorkspaceKey } from '@/hooks/useWorkspace';

// Default widget catalog per workspace
const WIDGET_CATALOG: Record<string, Array<{ id: string; label: string; labelAr: string }>> = {
  sales: [
    { id: 'kpi-cards', label: 'KPI Cards', labelAr: 'بطاقات المؤشرات' },
    { id: 'shortcuts', label: 'Quick Access', labelAr: 'وصول سريع' },
    { id: 'pending-actions', label: 'Pending Actions', labelAr: 'إجراءات معلقة' },
    { id: 'recent-docs', label: 'Recent Documents', labelAr: 'مستندات حديثة' },
    { id: 'sales-chart', label: 'Sales Chart', labelAr: 'مخطط المبيعات' },
    { id: 'top-opportunities', label: 'Top Opportunities', labelAr: 'أهم الفرص' },
  ],
  procurement: [
    { id: 'kpi-cards', label: 'KPI Cards', labelAr: 'بطاقات المؤشرات' },
    { id: 'shortcuts', label: 'Quick Access', labelAr: 'وصول سريع' },
    { id: 'pending-actions', label: 'Pending Actions', labelAr: 'إجراءات معلقة' },
    { id: 'recent-docs', label: 'Recent POs', labelAr: 'أوامر شراء حديثة' },
  ],
  hr: [
    { id: 'kpi-cards', label: 'KPI Cards', labelAr: 'بطاقات المؤشرات' },
    { id: 'shortcuts', label: 'Quick Access', labelAr: 'وصول سريع' },
    { id: 'pending-leaves', label: 'Pending Leave Requests', labelAr: 'طلبات إجازة معلقة' },
  ],
  finance: [
    { id: 'kpi-cards', label: 'KPI Cards', labelAr: 'بطاقات المؤشرات' },
    { id: 'shortcuts', label: 'Quick Access', labelAr: 'وصول سريع' },
    { id: 'finance-alerts', label: 'Finance Alerts', labelAr: 'تنبيهات مالية' },
    { id: 'recent-invoices', label: 'Recent Invoices', labelAr: 'فواتير حديثة' },
  ],
  manufacturing: [
    { id: 'kpi-cards', label: 'KPI Cards', labelAr: 'بطاقات المؤشرات' },
    { id: 'shortcuts', label: 'Quick Access', labelAr: 'وصول سريع' },
    { id: 'production-alerts', label: 'Production Alerts', labelAr: 'تنبيهات الإنتاج' },
  ],
  construction: [
    { id: 'kpi-cards', label: 'KPI Cards', labelAr: 'بطاقات المؤشرات' },
    { id: 'shortcuts', label: 'Quick Access', labelAr: 'وصول سريع' },
    { id: 'daily-reports', label: 'Recent Reports', labelAr: 'تقارير حديثة' },
  ],
  executive: [
    { id: 'kpi-cards', label: 'KPI Cards', labelAr: 'بطاقات المؤشرات' },
    { id: 'shortcuts', label: 'Quick Access', labelAr: 'وصول سريع' },
    { id: 'pending-approvals', label: 'Pending Approvals', labelAr: 'موافقات معلقة' },
  ],
};

export default function WorkspaceConfigPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { activeCompanyId, activeCompany } = useActiveCompany();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('sales');

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['workspace-configs-admin', activeCompanyId],
    queryFn: async () => {
      let query = (supabase.from('workspace_configs').select('*') as any).order('default_order', { ascending: true });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (items: Array<{ workspace_key: string; widget_id: string; widget_label: string; widget_label_ar?: string; default_visible: boolean; default_order: number }>) => {
      if (!activeCompanyId) throw new Error('No company selected');
      // Delete existing for this workspace + company
      const wsKey = items[0]?.workspace_key;
      if (wsKey) {
        await (supabase.from('workspace_configs').delete() as any).eq('workspace_key', wsKey).eq('company_id', activeCompanyId);
      }
      // Insert new
      const rows = items.map(i => ({ ...i, company_id: activeCompanyId }));
      const { error } = await supabase.from('workspace_configs').insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ الإعدادات' : 'Configuration saved');
      queryClient.invalidateQueries({ queryKey: ['workspace-configs-admin'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSaveWorkspace = (wsKey: string) => {
    const catalog = WIDGET_CATALOG[wsKey] || [];
    const existing = configs.filter((c: any) => c.workspace_key === wsKey);
    const items = catalog.map((w, idx) => {
      const cfg = existing.find((e: any) => e.widget_id === w.id);
      return {
        workspace_key: wsKey,
        widget_id: w.id,
        widget_label: w.label,
        widget_label_ar: w.labelAr,
        default_visible: cfg ? cfg.default_visible : true,
        default_order: cfg ? cfg.default_order : idx,
      };
    });
    saveMutation.mutate(items);
  };

  if (!hasRole('admin' as any)) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  const workspaceKeys = Object.keys(WIDGET_CATALOG);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            {isAr ? 'إعدادات مساحات العمل' : 'Workspace Configuration'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'تخصيص الويدجات الافتراضية لكل دور' : 'Customize default widgets for each role workspace'}
            {activeCompany && ` · ${(activeCompany as any).company_name || ''}`}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {workspaceKeys.map(k => {
            const ws = WORKSPACES.find(w => w.key === k);
            return (
              <TabsTrigger key={k} value={k} className="text-xs">
                {isAr ? ws?.labelAr || k : ws?.label || k}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {workspaceKeys.map(wsKey => {
          const catalog = WIDGET_CATALOG[wsKey] || [];
          const existing = configs.filter((c: any) => c.workspace_key === wsKey);

          return (
            <TabsContent key={wsKey} value={wsKey}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{isAr ? 'ويدجات' : 'Widgets'} ({catalog.length})</span>
                    <Button size="sm" onClick={() => handleSaveWorkspace(wsKey)} disabled={saveMutation.isPending}>
                      <Save className="h-3.5 w-3.5 mr-1" /> {isAr ? 'حفظ' : 'Save'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {catalog.map((w, idx) => {
                      const cfg = existing.find((e: any) => e.widget_id === w.id);
                      const visible = cfg ? cfg.default_visible : true;
                      return (
                        <div key={w.id} className={`flex items-center gap-3 p-3 rounded-lg border ${visible ? 'bg-muted/20' : 'opacity-50'}`}>
                          <Badge variant="outline" className="text-[10px] w-6 justify-center">{idx + 1}</Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{isAr ? w.labelAr : w.label}</p>
                            <p className="text-[10px] text-muted-foreground">{w.id}</p>
                          </div>
                          <Switch checked={visible} disabled className="scale-90" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
