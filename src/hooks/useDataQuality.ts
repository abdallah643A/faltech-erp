import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export type QualityModule = 'customers' | 'vendors' | 'employees' | 'items' | 'projects';

export interface DuplicateGroup {
  ids: string[];
  names: string[];
  reason: string;
  score: number;
}

export interface IncompleteRecord {
  id: string;
  name: string;
  missingFields: string[];
  completeness: number;
}

export interface FormatIssue {
  id: string;
  name: string;
  field: string;
  value: string;
  issue: string;
}

export interface StatusAnomaly {
  status: string;
  count: number;
  expected: boolean;
}

export interface ModuleQuality {
  module: QualityModule;
  totalRecords: number;
  duplicates: DuplicateGroup[];
  incompleteRecords: IncompleteRecord[];
  formatIssues: FormatIssue[];
  statusAnomalies: StatusAnomaly[];
  overallScore: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+\-().]{7,20}$/;

function similarity(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 100;
  if (al.includes(bl) || bl.includes(al)) return 80;
  const aw = al.split(/\s+/);
  const bw = bl.split(/\s+/);
  const common = aw.filter(w => bw.includes(w)).length;
  return Math.round((common / Math.max(aw.length, bw.length)) * 100);
}

function findDuplicates(
  records: { id: string; name: string; email?: string | null; phone?: string | null }[],
  threshold = 75
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const used = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    if (used.has(records[i].id)) continue;
    const group = [records[i]];
    let bestReason = '';

    for (let j = i + 1; j < records.length; j++) {
      if (used.has(records[j].id)) continue;
      let score = 0;
      let reason = '';

      if (records[i].email && records[j].email &&
        records[i].email.toLowerCase() === records[j].email.toLowerCase()) {
        score = 95; reason = 'Same email';
      } else if (records[i].phone && records[j].phone &&
        records[i].phone.replace(/\D/g, '') === records[j].phone.replace(/\D/g, '')) {
        score = 90; reason = 'Same phone';
      } else {
        const ns = similarity(records[i].name, records[j].name);
        if (ns >= threshold) { score = ns; reason = 'Similar name'; }
      }

      if (score >= threshold) {
        group.push(records[j]);
        used.add(records[j].id);
        if (!bestReason) bestReason = reason;
      }
    }

    if (group.length > 1) {
      used.add(records[i].id);
      groups.push({
        ids: group.map(r => r.id),
        names: group.map(r => r.name),
        reason: bestReason,
        score: group.length > 2 ? 95 : similarity(group[0].name, group[1].name),
      });
    }
  }
  return groups;
}

function checkFormat(records: { id: string; name: string; email?: string | null; phone?: string | null }[]): FormatIssue[] {
  const issues: FormatIssue[] = [];
  for (const r of records) {
    if (r.email && !EMAIL_REGEX.test(r.email)) {
      issues.push({ id: r.id, name: r.name, field: 'email', value: r.email, issue: 'Invalid email format' });
    }
    if (r.phone && !PHONE_REGEX.test(r.phone)) {
      issues.push({ id: r.id, name: r.name, field: 'phone', value: r.phone, issue: 'Invalid phone format' });
    }
  }
  return issues;
}

function calcScore(total: number, dupCount: number, incompleteCount: number, formatCount: number): number {
  const dupPenalty = Math.min(dupCount * 5, 30);
  const incompletePenalty = Math.min((incompleteCount / Math.max(total, 1)) * 40, 40);
  const formatPenalty = Math.min(formatCount * 2, 20);
  return Math.max(0, Math.round(100 - dupPenalty - incompletePenalty - formatPenalty));
}

function buildStatusAnomalies(records: any[], field: string, validStatuses: string[]): StatusAnomaly[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const s = r[field] || 'null';
    map.set(s, (map.get(s) || 0) + 1);
  }
  return Array.from(map.entries()).map(([status, count]) => ({
    status, count, expected: validStatuses.includes(status),
  }));
}

export function useDataQuality(module: QualityModule) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['data-quality', module, activeCompanyId],
    queryFn: async (): Promise<ModuleQuality> => {
      switch (module) {
        case 'customers':
        case 'vendors': {
          const cardType = module === 'customers' ? 'customer' : 'supplier';
          let q = supabase.from('business_partners')
            .select('id, card_code, card_name, card_type, email, phone, status, billing_address, city, country, contact_person')
            .eq('card_type', cardType);
          if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
          const { data: bps } = await q;
          const rows = bps || [];

          const records = rows.map(b => ({ id: b.id, name: b.card_name, email: b.email, phone: b.phone }));
          const requiredFields = ['email', 'phone', 'billing_address', 'city', 'country'];
          const incomplete: IncompleteRecord[] = [];
          for (const bp of rows) {
            const missing = requiredFields.filter(f => !(bp as any)[f]);
            if (missing.length > 0) {
              incomplete.push({
                id: bp.id, name: bp.card_name, missingFields: missing,
                completeness: Math.round(((requiredFields.length - missing.length) / requiredFields.length) * 100),
              });
            }
          }

          return {
            module, totalRecords: records.length,
            duplicates: findDuplicates(records),
            incompleteRecords: incomplete,
            formatIssues: checkFormat(records),
            statusAnomalies: buildStatusAnomalies(rows, 'status', ['active', 'inactive', 'blocked']),
            overallScore: calcScore(records.length, findDuplicates(records).length, incomplete.length, checkFormat(records).length),
          };
        }

        case 'employees': {
          let q = supabase.from('employees')
            .select('id, first_name, last_name, email, phone, employment_status, department_id, position_id');
          if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
          const { data: emps } = await q;
          const rows = emps || [];

          const records = rows.map(e => ({
            id: e.id, name: `${e.first_name} ${e.last_name}`, email: e.email, phone: e.phone,
          }));
          const requiredFields = ['email', 'phone', 'position_id', 'department_id'];
          const incomplete: IncompleteRecord[] = [];
          for (const e of rows) {
            const missing = requiredFields.filter(f => !(e as any)[f]);
            if (missing.length > 0) {
              incomplete.push({
                id: e.id, name: `${e.first_name} ${e.last_name}`,
                missingFields: missing,
                completeness: Math.round(((requiredFields.length - missing.length) / requiredFields.length) * 100),
              });
            }
          }

          const duplicates = findDuplicates(records);
          const formatIssues = checkFormat(records);

          return {
            module, totalRecords: records.length, duplicates, incompleteRecords: incomplete,
            formatIssues,
            statusAnomalies: buildStatusAnomalies(rows, 'employment_status', ['active', 'inactive', 'terminated']),
            overallScore: calcScore(records.length, duplicates.length, incomplete.length, formatIssues.length),
          };
        }

        case 'items': {
          let q = supabase.from('items')
            .select('id, item_code, description, item_group, status, unit_price, barcode');
          if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
          const { data: items } = await q.limit(2000);
          const rows = items || [];

          const records = rows.map(i => ({ id: i.id, name: i.description || i.item_code }));
          const requiredFields = ['item_group', 'unit_price'];
          const incomplete: IncompleteRecord[] = [];
          for (const item of rows) {
            const missing = requiredFields.filter(f => {
              const v = (item as any)[f];
              return v === null || v === undefined || v === '' || v === 0;
            });
            if (missing.length > 0) {
              incomplete.push({
                id: item.id, name: item.description || item.item_code,
                missingFields: missing,
                completeness: Math.round(((requiredFields.length - missing.length) / requiredFields.length) * 100),
              });
            }
          }

          const duplicates = findDuplicates(records, 85);

          return {
            module, totalRecords: records.length, duplicates, incompleteRecords: incomplete,
            formatIssues: [],
            statusAnomalies: buildStatusAnomalies(rows, 'status', ['active', 'inactive']),
            overallScore: calcScore(records.length, duplicates.length, incomplete.length, 0),
          };
        }

        case 'projects': {
          let q = supabase.from('projects')
            .select('id, name, description, status, project_type, current_phase, contract_value, business_partner_id');
          if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
          const { data: projects } = await q;
          const rows = projects || [];

          const records = rows.map(p => ({ id: p.id, name: p.name }));
          const requiredFields = ['description', 'contract_value', 'business_partner_id'];
          const incomplete: IncompleteRecord[] = [];
          for (const p of rows) {
            const missing = requiredFields.filter(f => !(p as any)[f]);
            if (missing.length > 0) {
              incomplete.push({
                id: p.id, name: p.name, missingFields: missing,
                completeness: Math.round(((requiredFields.length - missing.length) / requiredFields.length) * 100),
              });
            }
          }

          const duplicates = findDuplicates(records, 80);

          return {
            module, totalRecords: records.length, duplicates, incompleteRecords: incomplete,
            formatIssues: [],
            statusAnomalies: buildStatusAnomalies(rows, 'status', ['draft', 'in_progress', 'completed', 'cancelled', 'on_hold']),
            overallScore: calcScore(records.length, duplicates.length, incomplete.length, 0),
          };
        }

        default:
          return { module, totalRecords: 0, duplicates: [], incompleteRecords: [], formatIssues: [], statusAnomalies: [], overallScore: 100 };
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
