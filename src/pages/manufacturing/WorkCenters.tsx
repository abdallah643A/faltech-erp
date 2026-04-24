import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useWorkCenters } from '@/hooks/useMfgCore';

export default function WorkCentersPage() {
  const { workCenters, isLoading, createWC } = useWorkCenters();
  return (
    <MfgWiredPage
      title="Work Centers"
      description="Define capacity, shift calendar, and labor/overhead rates for production areas."
      data={workCenters || []}
      isLoading={isLoading}
      onCreate={(v) => createWC.mutateAsync(v)}
      createLabel="New Work Center"
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'capacity_per_day_hours', label: 'Capacity (h/day)', type: 'number' },
        { key: 'efficiency_pct', label: 'Efficiency %', type: 'number' },
        { key: 'labor_rate', label: 'Labor Rate', type: 'currency' },
        { key: 'overhead_rate', label: 'Overhead Rate', type: 'currency' },
        { key: 'is_active', label: 'Active', formatter: (r) => r.is_active ? 'Yes' : 'No' },
      ]}
      formFields={[
        { key: 'code', label: 'Code', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'capacity_per_day_hours', label: 'Capacity (hours/day)', type: 'number', defaultValue: 8 },
        { key: 'efficiency_pct', label: 'Efficiency %', type: 'number', defaultValue: 100 },
        { key: 'labor_rate', label: 'Labor rate (per hour)', type: 'number', defaultValue: 0 },
        { key: 'overhead_rate', label: 'Overhead rate (per hour)', type: 'number', defaultValue: 0 },
        { key: 'setup_cost', label: 'Setup cost', type: 'number', defaultValue: 0 },
        { key: 'cost_center', label: 'Cost center', type: 'text' },
      ]}
    />
  );
}
