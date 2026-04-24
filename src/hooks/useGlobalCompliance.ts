import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

const table = (name: string) => supabase.from(name as any);

export function useGlobalComplianceStats() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['global-compliance-stats', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const [packs, rules, entities, reports, calendars, languages, banking, payroll] = await Promise.all([
        table('global_country_packs').select('id,is_active,pack_type,country_code', { count: 'exact' }).eq('company_id', activeCompanyId!),
        table('global_regulatory_rules').select('id,status,rule_domain', { count: 'exact' }).eq('company_id', activeCompanyId!),
        table('global_legal_entity_compliance').select('id,status,country_code', { count: 'exact' }).eq('company_id', activeCompanyId!),
        table('global_statutory_reports').select('id,status,report_domain', { count: 'exact' }).eq('company_id', activeCompanyId!),
        table('global_regional_calendars').select('id,country_code', { count: 'exact' }).eq('company_id', activeCompanyId!),
        table('global_language_packs').select('id,language_code,direction', { count: 'exact' }).eq('company_id', activeCompanyId!),
        table('global_banking_formats').select('id,standard,format_type', { count: 'exact' }).eq('company_id', activeCompanyId!),
        table('global_payroll_rule_sets').select('id,status', { count: 'exact' }).eq('company_id', activeCompanyId!),
      ]);
      [packs, rules, entities, reports, calendars, languages, banking, payroll].forEach((r) => { if (r.error) throw r.error; });
      return { packs, rules, entities, reports, calendars, languages, banking, payroll };
    },
  });
}

export function useCountryPacks() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['global-country-packs', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await table('global_country_packs').select('*').eq('company_id', activeCompanyId!).order('pack_name');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useRegulatoryRules(packId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['global-regulatory-rules', activeCompanyId, packId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      let q = table('global_regulatory_rules').select('*, global_country_packs(pack_name, country_code)').eq('company_id', activeCompanyId!);
      if (packId) q = q.eq('country_pack_id', packId);
      const { data, error } = await q.order('rule_domain').order('priority');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useLegalEntityCompliance() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['global-legal-entity-compliance', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await table('global_legal_entity_compliance')
        .select('*, global_country_packs(pack_name, pack_code)')
        .eq('company_id', activeCompanyId!)
        .order('legal_entity_name');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useLocalizationAssets() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['global-localization-assets', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const [calendars, languages, banking, payroll] = await Promise.all([
        table('global_regional_calendars').select('*').eq('company_id', activeCompanyId!).order('calendar_name'),
        table('global_language_packs').select('*').eq('company_id', activeCompanyId!).order('language_name'),
        table('global_banking_formats').select('*').eq('company_id', activeCompanyId!).order('format_name'),
        table('global_payroll_rule_sets').select('*, global_country_packs(pack_name)').eq('company_id', activeCompanyId!).order('rule_set_name'),
      ]);
      if (calendars.error) throw calendars.error;
      if (languages.error) throw languages.error;
      if (banking.error) throw banking.error;
      if (payroll.error) throw payroll.error;
      return { calendars: calendars.data as any[], languages: languages.data as any[], banking: banking.data as any[], payroll: payroll.data as any[] };
    },
  });
}

export function useStatutoryReports() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['global-statutory-reports', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await table('global_statutory_reports')
        .select('*, global_country_packs(pack_name, country_code)')
        .eq('company_id', activeCompanyId!)
        .order('report_domain');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useGlobalComplianceMutations() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['global-compliance-stats'] });
    qc.invalidateQueries({ queryKey: ['global-country-packs'] });
    qc.invalidateQueries({ queryKey: ['global-regulatory-rules'] });
    qc.invalidateQueries({ queryKey: ['global-legal-entity-compliance'] });
    qc.invalidateQueries({ queryKey: ['global-localization-assets'] });
    qc.invalidateQueries({ queryKey: ['global-statutory-reports'] });
  };

  const upsert = (tableName: string, label: string) => useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await table(tableName).upsert({ ...payload, company_id: activeCompanyId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: `${label} saved` }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const seedGenericPacks = useMutation({
    mutationFn: async () => {
      const packs = [
        genericPack('vat_generic', 'Generic VAT / GST Pack', 'GLOBAL', 'VAT', 'USD'),
        genericPack('wht_generic', 'Generic Withholding Tax Pack', 'GLOBAL', 'WHT', 'USD'),
        genericPack('payroll_generic', 'Generic Payroll & Social Insurance Pack', 'GLOBAL', 'PAY', 'USD'),
        genericPack('banking_iso20022', 'Generic Banking ISO20022 Pack', 'GLOBAL', 'BANK', 'USD'),
        genericPack('edoc_generic', 'Generic E-Documents Pack', 'GLOBAL', 'EDOC', 'USD'),
      ].map((p) => ({ ...p, company_id: activeCompanyId }));
      const { data, error } = await table('global_country_packs').upsert(packs, { onConflict: 'company_id,pack_code,version' }).select();
      if (error) throw error;
      const byCode = Object.fromEntries((data as any[]).map((p) => [p.pack_code, p.id]));
      const rules = [
        rule(byCode.vat_generic, 'vat_standard_output', 'Standard Output VAT', 'tax', 'round(net_amount * tax_rate, 2)'),
        rule(byCode.vat_generic, 'vat_reverse_charge', 'Reverse Charge VAT', 'tax', 'if(is_reverse_charge, net_amount * tax_rate, 0)'),
        rule(byCode.wht_generic, 'wht_services', 'Service Withholding', 'withholding', 'round(gross_amount * wht_rate, 2)'),
        rule(byCode.payroll_generic, 'social_insurance_employee', 'Employee Social Insurance', 'payroll', 'min(basic_salary, ceiling) * employee_rate'),
        rule(byCode.payroll_generic, 'end_of_service', 'End of Service Accrual', 'payroll', 'monthly_basic_salary / 12 * service_factor'),
        rule(byCode.edoc_generic, 'invoice_qr_payload', 'E-Invoice QR Payload', 'e_documents', 'concat(seller_name, tax_number, invoice_total, tax_total)'),
      ].map((r) => ({ ...r, company_id: activeCompanyId }));
      const { error: ruleErr } = await table('global_regulatory_rules').upsert(rules, { onConflict: 'company_id,rule_code,version' });
      if (ruleErr) throw ruleErr;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Generic compliance packs seeded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return {
    seedGenericPacks,
    upsertPack: upsert('global_country_packs', 'Country pack'),
    upsertRule: upsert('global_regulatory_rules', 'Rule'),
    upsertEntity: upsert('global_legal_entity_compliance', 'Legal entity compliance'),
    upsertTaxProfile: upsert('global_tax_profiles', 'Tax profile'),
    upsertCalendar: upsert('global_regional_calendars', 'Calendar'),
    upsertLanguage: upsert('global_language_packs', 'Language pack'),
    upsertReport: upsert('global_statutory_reports', 'Statutory report'),
    upsertBanking: upsert('global_banking_formats', 'Banking format'),
    upsertPayroll: upsert('global_payroll_rule_sets', 'Payroll rules'),
  };
}

function genericPack(pack_code: string, pack_name: string, country_code: string, tag: string, currency: string) {
  return {
    pack_code,
    pack_name,
    country_code,
    region: 'Generic',
    pack_type: 'generic_template',
    default_currency: currency,
    default_language: 'en',
    tax_config: { taxTypes: ['VAT', 'GST', 'WHT'], rates: [{ code: `${tag}_STD`, rate: 0.15, formula: 'net_amount * rate' }] },
    invoice_config: { numbering: 'country/entity/year/sequence', requiredFields: ['seller', 'buyer', 'tax_number', 'total'] },
    e_document_config: { signing: 'configurable', qr: true, xml: true, clearanceMode: 'optional' },
    withholding_config: { vendorCategories: [], treatyOverrides: true },
    banking_config: { standards: ['ISO20022', 'MT940', 'CSV'], ibanRequired: true },
    payroll_config: { earnings: ['basic', 'allowance'], deductions: ['social_insurance', 'income_tax'], payslipLanguage: 'bilingual' },
    statutory_config: { obligations: ['tax_return', 'withholding_return', 'payroll_report'] },
    calendar_config: { weekendDays: [5, 6], fiscalYearStartMonth: 1 },
    language_config: { supported: ['en', 'ar'], rtl: ['ar'] },
    status: 'active',
  };
}

function rule(country_pack_id: string, rule_code: string, rule_name: string, rule_domain: string, formula_expression: string) {
  return {
    country_pack_id,
    rule_code,
    rule_name,
    rule_domain,
    formula_expression,
    input_schema: { amount: 'number', rate: 'number', date: 'date' },
    output_schema: { amount: 'number', currency: 'string' },
    status: 'approved',
    version: 1,
  };
}
