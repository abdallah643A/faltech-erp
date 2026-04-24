import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useReworkOrders } from '@/hooks/useMfgCore';

export default function ReworkOrdersPage() {
  const { reworks, isLoading, createRework } = useReworkOrders();
  return (
    <MfgWiredPage
      title="Rework Orders"
      description="Track rework on defective production with cost capture and status."
      data={reworks || []}
      isLoading={isLoading}
      onCreate={(v) => createRework.mutateAsync(v)}
      createLabel="New Rework"
      columns={[
        { key: 'rework_number', label: 'Rework #' },
        { key: 'item_code', label: 'Item' },
        { key: 'item_description', label: 'Description' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'rework_cost', label: 'Cost', type: 'currency' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'created_at', label: 'Created', type: 'date' },
      ]}
      formFields={[
        { key: 'source_wo_id', label: 'Source WO ID', type: 'text', placeholder: 'Optional' },
        { key: 'item_code', label: 'Item code', type: 'text' },
        { key: 'item_description', label: 'Item description', type: 'text', required: true },
        { key: 'qty', label: 'Quantity', type: 'number', required: true, defaultValue: 1 },
        { key: 'reason', label: 'Reason', type: 'text' },
        { key: 'rework_cost', label: 'Estimated cost', type: 'number', defaultValue: 0 },
        { key: 'status', label: 'Status', type: 'select', defaultValue: 'open',
          options: [{ value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'done', label: 'Done' }, { value: 'scrapped', label: 'Scrapped' }] },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
    />
  );
}
