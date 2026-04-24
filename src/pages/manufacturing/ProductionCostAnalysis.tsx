import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useMfgWorkOrders } from '@/hooks/useMfgCore';

export default function ProductionCostAnalysisPage() {
  const { workOrders, isLoading } = useMfgWorkOrders();
  return (
    <MfgWiredPage
      title="Production Cost Analysis"
      description="Standard vs actual costs by work order with material, labor, and overhead breakdown."
      data={workOrders || []}
      isLoading={isLoading}
      onCreate={async () => {}}
      createLabel="Refresh"
      columns={[
        { key: 'wo_number', label: 'WO #' },
        { key: 'product_name', label: 'Product' },
        { key: 'std_material_cost', label: 'Std Mat', type: 'currency' },
        { key: 'actual_material_cost', label: 'Act Mat', type: 'currency' },
        { key: 'std_labor_cost', label: 'Std Lab', type: 'currency' },
        { key: 'actual_labor_cost', label: 'Act Lab', type: 'currency' },
        { key: 'std_overhead_cost', label: 'Std OH', type: 'currency' },
        { key: 'actual_overhead_cost', label: 'Act OH', type: 'currency' },
        { key: 'std_total_cost', label: 'Std Total', type: 'currency' },
        { key: 'actual_total_cost', label: 'Act Total', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' },
      ]}
      formFields={[]}
    />
  );
}
