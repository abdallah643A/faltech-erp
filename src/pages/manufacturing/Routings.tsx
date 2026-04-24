import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useRoutings } from '@/hooks/useMfgCore';

export default function RoutingsPage() {
  const { routings, isLoading, createRouting } = useRoutings();
  return (
    <MfgWiredPage
      title="Routings"
      description="Define operation sequences, work centers, setup/run times, and QC requirements."
      data={routings || []}
      isLoading={isLoading}
      onCreate={(v) => createRouting.mutateAsync(v)}
      createLabel="New Routing"
      columns={[
        { key: 'routing_code', label: 'Code' },
        { key: 'description', label: 'Description' },
        { key: 'product_code', label: 'Product' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'created_at', label: 'Created', type: 'date' },
      ]}
      formFields={[
        { key: 'routing_code', label: 'Routing code', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'text', required: true },
        { key: 'product_code', label: 'Product code', type: 'text' },
        { key: 'status', label: 'Status', type: 'select', defaultValue: 'draft',
          options: [{ value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approved' }, { value: 'obsolete', label: 'Obsolete' }] },
      ]}
    />
  );
}
