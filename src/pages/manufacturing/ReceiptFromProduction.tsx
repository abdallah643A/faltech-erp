import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useWOQCChecks } from '@/hooks/useMfgCore';

export default function ReceiptFromProductionPage() {
  const { checks, isLoading, recordCheck } = useWOQCChecks();
  return (
    <MfgWiredPage
      title="Receipt from Production / QC Checkpoints"
      description="Record QC checkpoints tied to work orders. Pass to receive into finished goods; fail triggers scrap/rework."
      data={checks || []}
      isLoading={isLoading}
      onCreate={(v) => recordCheck.mutateAsync(v)}
      createLabel="Record Check"
      columns={[
        { key: 'created_at', label: 'Date', type: 'date' },
        { key: 'checkpoint_name', label: 'Checkpoint' },
        { key: 'inspection_type', label: 'Type' },
        { key: 'measured_value', label: 'Measured', type: 'number' },
        { key: 'spec_min', label: 'Min', type: 'number' },
        { key: 'spec_max', label: 'Max', type: 'number' },
        { key: 'defect_qty', label: 'Defects', type: 'number' },
        { key: 'result', label: 'Result', type: 'status' },
      ]}
      formFields={[
        { key: 'wo_id', label: 'Work Order ID', type: 'text', required: true },
        { key: 'checkpoint_name', label: 'Checkpoint name', type: 'text', required: true },
        { key: 'inspection_type', label: 'Inspection type', type: 'select', defaultValue: 'visual',
          options: [
            { value: 'visual', label: 'Visual' }, { value: 'dimensional', label: 'Dimensional' },
            { value: 'functional', label: 'Functional' }, { value: 'other', label: 'Other' },
          ] },
        { key: 'spec_min', label: 'Spec min', type: 'number' },
        { key: 'spec_max', label: 'Spec max', type: 'number' },
        { key: 'measured_value', label: 'Measured value', type: 'number' },
        { key: 'defect_qty', label: 'Defect qty', type: 'number', defaultValue: 0 },
        { key: 'result', label: 'Result', type: 'select', defaultValue: 'pending',
          options: [{ value: 'pending', label: 'Pending' }, { value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }] },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
    />
  );
}
