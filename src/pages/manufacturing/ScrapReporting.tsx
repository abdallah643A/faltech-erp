import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useWOScrap } from '@/hooks/useMfgCore';

export default function ScrapReportingPage() {
  const { scrap, isLoading, reportScrap } = useWOScrap();
  return (
    <MfgWiredPage
      title="Scrap Reporting"
      description="Capture scrap quantities, reasons, and cost impact per work order."
      data={scrap || []}
      isLoading={isLoading}
      onCreate={(v) => reportScrap.mutateAsync(v)}
      createLabel="Report Scrap"
      columns={[
        { key: 'scrap_date', label: 'Date', type: 'date' },
        { key: 'item_code', label: 'Item' },
        { key: 'item_description', label: 'Description' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'reason_code', label: 'Reason' },
        { key: 'unit_cost', label: 'Unit Cost', type: 'currency' },
        { key: 'total_cost', label: 'Total Cost', type: 'currency' },
      ]}
      formFields={[
        { key: 'wo_id', label: 'Work Order ID', type: 'text', placeholder: 'Optional WO link' },
        { key: 'scrap_date', label: 'Scrap date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { key: 'item_code', label: 'Item code', type: 'text' },
        { key: 'item_description', label: 'Item description', type: 'text', required: true },
        { key: 'qty', label: 'Quantity', type: 'number', required: true, defaultValue: 0 },
        { key: 'uom', label: 'UOM', type: 'text', defaultValue: 'EA' },
        { key: 'reason_code', label: 'Reason', type: 'select', defaultValue: 'defect',
          options: [
            { value: 'defect', label: 'Defect' }, { value: 'setup', label: 'Setup' },
            { value: 'material', label: 'Material' }, { value: 'machine', label: 'Machine' },
            { value: 'operator', label: 'Operator' }, { value: 'other', label: 'Other' },
          ] },
        { key: 'unit_cost', label: 'Unit cost', type: 'number', defaultValue: 0 },
        { key: 'reason_notes', label: 'Notes', type: 'textarea' },
      ]}
    />
  );
}
