import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useMfgWorkOrders } from '@/hooks/useMfgCore';
import { Badge } from '@/components/ui/badge';

export default function ProductionVariancePage() {
  const { workOrders, isLoading } = useMfgWorkOrders();
  return (
    <MfgWiredPage
      title="Production Variance"
      description="Material, labor, and overhead variances vs standard cost."
      data={workOrders || []}
      isLoading={isLoading}
      onCreate={async () => {}}
      createLabel="Refresh"
      columns={[
        { key: 'wo_number', label: 'WO #' },
        { key: 'product_name', label: 'Product' },
        { key: 'material_variance', label: 'Material Var', type: 'currency' },
        { key: 'labor_variance', label: 'Labor Var', type: 'currency' },
        { key: 'overhead_variance', label: 'Overhead Var', type: 'currency' },
        { key: 'total_variance', label: 'Total Var',
          formatter: (r) => {
            const v = Number(r.total_variance || 0);
            const variant = v > 0 ? 'destructive' : v < 0 ? 'default' : 'outline';
            return <Badge variant={variant as any}>{v.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</Badge>;
          },
        },
        { key: 'status', label: 'Status', type: 'status' },
      ]}
      formFields={[]}
    />
  );
}
