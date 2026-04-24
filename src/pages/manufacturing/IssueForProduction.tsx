import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useMfgWorkOrders } from '@/hooks/useMfgCore';

export default function IssueForProductionPage() {
  const { workOrders, isLoading, createWO } = useMfgWorkOrders();
  return (
    <MfgWiredPage
      title="Issue for Production"
      description="Production work orders that drive material issues from inventory to WIP."
      data={workOrders || []}
      isLoading={isLoading}
      onCreate={(v) => createWO.mutateAsync(v)}
      createLabel="New Work Order"
      columns={[
        { key: 'wo_number', label: 'WO #' },
        { key: 'product_name', label: 'Product' },
        { key: 'planned_qty', label: 'Planned', type: 'number' },
        { key: 'produced_qty', label: 'Produced', type: 'number' },
        { key: 'planned_start', label: 'Planned Start', type: 'date' },
        { key: 'planned_end', label: 'Planned End', type: 'date' },
        { key: 'status', label: 'Status', type: 'status' },
      ]}
      formFields={[
        { key: 'product_code', label: 'Product code', type: 'text' },
        { key: 'product_name', label: 'Product name', type: 'text', required: true },
        { key: 'planned_qty', label: 'Planned qty', type: 'number', required: true, defaultValue: 1 },
        { key: 'uom', label: 'UOM', type: 'text', defaultValue: 'EA' },
        { key: 'warehouse_code', label: 'Warehouse', type: 'text' },
        { key: 'planned_start', label: 'Planned start', type: 'date' },
        { key: 'planned_end', label: 'Planned end', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', defaultValue: 'draft',
          options: [
            { value: 'draft', label: 'Draft' }, { value: 'released', label: 'Released' },
            { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' },
            { value: 'closed', label: 'Closed' }, { value: 'cancelled', label: 'Cancelled' },
          ] },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
    />
  );
}
