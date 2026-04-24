import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useMfgWorkOrders } from '@/hooks/useMfgCore';

export default function WIPMonitorPage() {
  const { workOrders, isLoading } = useMfgWorkOrders();
  const open = (workOrders || []).filter((w: any) => !['closed', 'cancelled', 'completed'].includes(w.status));
  return (
    <MfgWiredPage
      title="Work-in-Progress Monitor"
      description="Open production orders with WIP value and cost variance."
      data={open}
      isLoading={isLoading}
      onCreate={async () => {}}
      createLabel="WIP"
      columns={[
        { key: 'wo_number', label: 'WO #' },
        { key: 'product_name', label: 'Product' },
        { key: 'planned_qty', label: 'Planned', type: 'number' },
        { key: 'produced_qty', label: 'Produced', type: 'number' },
        { key: 'scrapped_qty', label: 'Scrapped', type: 'number' },
        { key: 'std_total_cost', label: 'Std Cost', type: 'currency' },
        { key: 'actual_total_cost', label: 'Actual Cost', type: 'currency' },
        { key: 'total_variance', label: 'Variance', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' },
      ]}
      formFields={[]}
    />
  );
}
