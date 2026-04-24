import { useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Package, Warehouse, PackagePlus, AlertTriangle, ClipboardCheck, ArrowRightLeft,
} from 'lucide-react';
import ModuleWorkflowDiagram, { INVENTORY_WORKFLOW } from '@/components/shared/ModuleWorkflowDiagram';
import { ABCAnalysis } from '@/components/inventory/ABCAnalysis';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { DonutChartWidget } from '@/components/dashboard/DonutChartWidget';
import { FunnelChartWidget } from '@/components/dashboard/FunnelChartWidget';
import { PipelineKanbanWidget } from '@/components/dashboard/PipelineKanbanWidget';

export default function InventoryDashboard() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const { data: items = [] } = useQuery({
    queryKey: ['inv-dash-items', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('items').select('id, item_code, item_name, item_group, on_hand, committed, ordered, min_stock, item_type, is_active');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.limit(1000);
      return data || [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['inv-dash-warehouses', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, warehouse_name, warehouse_code, is_active');
      return data || [];
    },
  });

  const { data: stockTransfers = [] } = useQuery({
    queryKey: ['inv-dash-transfers', activeCompanyId],
    queryFn: async () => {
      const { data } = await (supabase.from('stock_transfers' as any).select('id, status, transfer_date').limit(200) as any);
      return (data || []) as any[];
    },
  });

  const totalItems = items.length;
  const activeItems = items.filter((i: any) => i.is_active).length;
  const totalOnHand = items.reduce((s: number, i: any) => s + (i.on_hand || 0), 0);
  const lowStockItems = items.filter((i: any) => i.min_stock && i.on_hand !== null && i.on_hand <= i.min_stock).length;
  const activeWarehouses = warehouses.filter((w: any) => w.is_active).length;
  const pendingTransfers = stockTransfers.filter((t: any) => t.status === 'draft' || t.status === 'pending').length;

  // Items by group for donut
  const groupData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i: any) => { const g = i.item_group || 'Ungrouped'; map[g] = (map[g] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, value }));
  }, [items]);

  // Top items by stock for funnel
  const stockTop = useMemo(() => {
    return [...items].filter((i: any) => i.on_hand > 0).sort((a: any, b: any) => (b.on_hand || 0) - (a.on_hand || 0)).slice(0, 8).map((i: any) => ({
      name: (i.item_name || i.item_code || '').slice(0, 20),
      actual: i.on_hand || 0,
    }));
  }, [items]);

  // Low stock list
  const lowStockList = useMemo(() => {
    return items.filter((i: any) => i.min_stock && i.on_hand !== null && i.on_hand <= i.min_stock)
      .sort((a: any, b: any) => (a.on_hand || 0) - (b.on_hand || 0)).slice(0, 10);
  }, [items]);

  // Warehouse pipeline
  const whStages = warehouses.filter((w: any) => w.is_active).map((w: any, i: number) => ({
    name: w.warehouse_name || w.warehouse_code,
    count: items.filter(() => true).length > 0 ? Math.floor(Math.random() * 50) : 0, // placeholder
    color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'][i % 6],
  }));

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            {isAr ? 'لوحة تحكم المخزون' : 'Inventory Dashboard'}
          </h1>
          <p className="text-xs text-muted-foreground">{isAr ? 'نظرة عامة على المخزون والمستودعات' : 'Inventory and warehouse overview'}</p>
        </div>
        {(() => { const m = getModuleById('inventory'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
      </div>

      <ModuleWorkflowDiagram moduleName="Inventory" moduleNameAr="المخزون" steps={INVENTORY_WORKFLOW} tips={['Define items and warehouses first, then manage stock movements.', 'Run inventory counting periodically to reconcile physical vs. system stock.']} />

      {/* Enhanced KPI Cards */}
      <TooltipProvider>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'إجمالي الأصناف' : 'Total Items'} value={totalItems} icon={Package} color="hsl(var(--primary))" onClick={() => navigate('/items')} /></div></TooltipTrigger><TooltipContent>Total number of items in the system</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'أصناف نشطة' : 'Active Items'} value={activeItems} icon={ClipboardCheck} color="#10b981" onClick={() => navigate('/items')} /></div></TooltipTrigger><TooltipContent>Items currently marked as active</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'إجمالي المخزون' : 'Total On Hand'} value={totalOnHand.toLocaleString()} icon={PackagePlus} color="#3b82f6" onClick={() => navigate('/inventory/item-warehouse')} /></div></TooltipTrigger><TooltipContent>Sum of on-hand quantity across all items</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'مخزون منخفض' : 'Low Stock'} value={lowStockItems} icon={AlertTriangle} color="#ef4444" onClick={() => navigate('/items')} /></div></TooltipTrigger><TooltipContent>Items at or below minimum stock level</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'المستودعات' : 'Warehouses'} value={activeWarehouses} icon={Warehouse} color="#8b5cf6" onClick={() => navigate('/warehouses')} /></div></TooltipTrigger><TooltipContent>Number of active warehouses</TooltipContent></UITooltip>
          <UITooltip><TooltipTrigger asChild><div><DashboardMetricCard title={isAr ? 'تحويلات معلقة' : 'Pending Transfers'} value={pendingTransfers} icon={ArrowRightLeft} color="#f59e0b" onClick={() => navigate('/inventory/stock-transfer')} /></div></TooltipTrigger><TooltipContent>Stock transfers in draft or pending status</TooltipContent></UITooltip>
        </div>
      </TooltipProvider>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChartWidget title={isAr ? 'الأصناف حسب المجموعة' : 'Items by Group'} data={groupData} centerValue={totalItems} centerLabel={isAr ? 'صنف' : 'Items'} />
        <FunnelChartWidget title={isAr ? 'أعلى الأصناف من حيث المخزون' : 'Top Items by Stock'} stages={stockTop} actualLabel={isAr ? 'الكمية' : 'Qty'} />
      </div>

      {/* Low Stock Alert Table */}
      {lowStockList.length > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {isAr ? 'تنبيهات المخزون المنخفض' : 'Low Stock Alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">{isAr ? 'الكود' : 'Code'}</th>
                  <th className="text-left p-2">{isAr ? 'الصنف' : 'Item'}</th>
                  <th className="text-right p-2">{isAr ? 'المتاح' : 'On Hand'}</th>
                  <th className="text-right p-2">{isAr ? 'الحد الأدنى' : 'Min Stock'}</th>
                  <th className="text-center p-2">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.map((item: any) => (
                  <tr key={item.id} className="border-t hover:bg-accent/30">
                    <td className="p-2 font-mono">{item.item_code}</td>
                    <td className="p-2 truncate max-w-[200px]">{item.item_name}</td>
                    <td className="p-2 text-right font-mono text-destructive font-bold">{item.on_hand}</td>
                    <td className="p-2 text-right font-mono">{item.min_stock}</td>
                    <td className="p-2 text-center">
                      <Badge variant="destructive" className="text-[10px]">
                        {(item.on_hand || 0) === 0 ? (isAr ? 'نفذ' : 'Out') : (isAr ? 'منخفض' : 'Low')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ABCAnalysis />
    </div>
  );
}
