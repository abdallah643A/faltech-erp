import { MfgWiredPage } from '@/components/manufacturing/MfgWiredPage';
import { useBOMVersions } from '@/hooks/useMfgCore';
import { Button } from '@/components/ui/button';

export default function BOMVersionsPage() {
  const { versions, isLoading, createVersion, approveVersion } = useBOMVersions();
  return (
    <MfgWiredPage
      title="BOM Versions"
      description="Track BOM changes with effective dates and version control."
      data={versions || []}
      isLoading={isLoading}
      onCreate={(v) => createVersion.mutateAsync(v)}
      createLabel="New Version"
      rowActions={(row) =>
        row.status !== 'approved' ? (
          <Button size="sm" variant="outline" onClick={() => approveVersion.mutate(row.id)}>Approve</Button>
        ) : <span className="text-xs text-muted-foreground">Approved</span>
      }
      columns={[
        { key: 'version_number', label: 'Version', type: 'number' },
        { key: 'effective_from', label: 'Effective From', type: 'date' },
        { key: 'effective_to', label: 'Effective To', type: 'date' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'change_notes', label: 'Notes' },
      ]}
      formFields={[
        { key: 'version_number', label: 'Version #', type: 'number', required: true, defaultValue: 1 },
        { key: 'effective_from', label: 'Effective from', type: 'date', required: true },
        { key: 'effective_to', label: 'Effective to', type: 'date' },
        { key: 'change_notes', label: 'Change notes', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', defaultValue: 'draft',
          options: [{ value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approved' }, { value: 'obsolete', label: 'Obsolete' }] },
      ]}
    />
  );
}
