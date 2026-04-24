/**
 * Centralised helper for writing to `setup_audit_log`.
 *
 * Every CRUD form across the Administration & Setup module should call
 * `recordSetupAudit()` after a successful mutation so we keep a tamper-
 * proof trail (the audit table has no UPDATE/DELETE policies).
 *
 * Failures are swallowed and logged — audit must never block the user
 * from completing a configuration change, but we surface errors in the
 * console so they can be triaged.
 */
import { newTables } from '@/integrations/supabase/new-tables';
import { supabase } from '@/integrations/supabase/client';
import type { SetupAuditAction } from '@/types/data-contracts';

export interface RecordSetupAuditInput {
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  action: SetupAuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  reason?: string | null;
  companyId?: string | null;
}

/** Compute which top-level keys differ between two objects. */
export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

export async function recordSetupAudit(input: RecordSetupAuditInput): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const performedByName =
      (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
      user?.email ??
      null;

    await newTables.setupAuditLog().insert({
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      action: input.action,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      changed_fields: diffFields(input.oldValues, input.newValues),
      reason: input.reason ?? null,
      company_id: input.companyId ?? null,
      performed_by: user?.id ?? null,
      performed_by_name: performedByName,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[setupAudit] failed to record entry', err);
  }
}
