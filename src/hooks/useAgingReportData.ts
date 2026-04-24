import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';

export interface AgingFilters {
  companyIds: string[];
  branchId: string;
  customerId: string;
  vendorId: string;
  asOfDate: string;
  projectId: string;
  costCenter: string;
  currency: string;
  includeZero: boolean;
  dateBasis: 'due_date' | 'doc_date';
  buckets: number[];
}

export interface AgingInvoice {
  id: string;
  docNum: number;
  docDate: string;
  dueDate: string;
  partnerCode: string;
  partnerName: string;
  branch: string;
  branchId: string | null;
  currency: string;
  total: number;
  balanceDue: number;
  paidAmount: number;
  daysOverdue: number;
  bucketIndex: number;
  status: string;
  projectId: string | null;
}

export interface AgingPartnerSummary {
  code: string;
  name: string;
  branch: string;
  invoiceCount: number;
  totalOutstanding: number;
  current: number;
  bucket1: number;
  bucket2: number;
  bucket3: number;
  bucket4: number;
  bucket5: number;
  invoices: AgingInvoice[];
}

export interface AgingReportData {
  partners: AgingPartnerSummary[];
  totalOutstanding: number;
  totalOverdue: number;
  currentTotal: number;
  above90Total: number;
  bucketTotals: number[];
  bucketLabels: string[];
  topOverdue: AgingPartnerSummary[];
  isLoading: boolean;
}

const DEFAULT_BUCKETS = [0, 30, 60, 90, 120];

function getBucketLabels(buckets: number[]): string[] {
  const labels: string[] = [];
  for (let i = 0; i < buckets.length; i++) {
    if (i === 0) labels.push(`Current (0-${buckets[1] || 30})`);
    else if (i === buckets.length - 1) labels.push(`${buckets[i] + 1}+`);
    else labels.push(`${buckets[i] + 1}-${buckets[i + 1]}`);
  }
  return labels;
}

function getBucketIndex(days: number, buckets: number[]): number {
  if (days <= 0) return 0;
  for (let i = 1; i < buckets.length; i++) {
    if (days <= buckets[i]) return i - 1;
  }
  return buckets.length - 1;
}

export function useARAgingData(filters: AgingFilters, enabled: boolean): AgingReportData {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['ar-aging-invoices', filters.companyIds, filters.branchId, filters.asOfDate],
    queryFn: async () => {
      let query = supabase.from('ar_invoices').select('id, doc_num, doc_date, doc_due_date, customer_code, customer_name, branch_id, currency, total, balance_due, paid_amount, status, company_id');
      if (filters.companyIds.length > 0) query = query.in('company_id', filters.companyIds);
      if (filters.branchId) query = query.eq('branch_id', filters.branchId);
      if (filters.asOfDate) query = query.lte('doc_date', filters.asOfDate);

      const allData: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await query.range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return allData;
    },
    enabled,
  });

  return useMemo(() => buildAgingData(invoices, filters, 'ar'), [invoices, filters]);
}

export function useAPAgingData(filters: AgingFilters, enabled: boolean): AgingReportData {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['ap-aging-invoices', filters.companyIds, filters.branchId, filters.asOfDate],
    queryFn: async () => {
      let query = supabase.from('ap_invoices').select('id, invoice_number, doc_date, doc_due_date, vendor_code, vendor_name, branch_id, currency, total, status, company_id');
      if (filters.companyIds.length > 0) query = query.in('company_id', filters.companyIds);
      if (filters.branchId) query = query.eq('branch_id', filters.branchId);
      if (filters.asOfDate) query = query.lte('doc_date', filters.asOfDate);

      const allData: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await query.range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return allData;
    },
    enabled,
  });

  return useMemo(() => buildAgingData(invoices, filters, 'ap'), [invoices, filters]);
}

function buildAgingData(rawInvoices: any[], filters: AgingFilters, type: 'ar' | 'ap'): AgingReportData {
  const buckets = filters.buckets.length >= 2 ? filters.buckets : DEFAULT_BUCKETS;
  const bucketLabels = getBucketLabels(buckets);
  const asOf = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
  const isAR = type === 'ar';

  const invoices: AgingInvoice[] = rawInvoices
    .map(inv => {
      const balanceDue = isAR ? (inv.balance_due ?? inv.total ?? 0) : (inv.total ?? 0);
      const refDate = filters.dateBasis === 'due_date'
        ? (inv.doc_due_date || inv.doc_date)
        : inv.doc_date;
      const days = differenceInDays(asOf, new Date(refDate));
      const bucketIdx = getBucketIndex(days, buckets);
      return {
        id: inv.id,
        docNum: isAR ? inv.doc_num : parseInt(inv.invoice_number || '0'),
        docDate: inv.doc_date,
        dueDate: inv.doc_due_date || inv.doc_date,
        partnerCode: isAR ? inv.customer_code : (inv.vendor_code || ''),
        partnerName: isAR ? inv.customer_name : inv.vendor_name,
        branch: '',
        branchId: inv.branch_id,
        currency: inv.currency || 'SAR',
        total: inv.total || 0,
        balanceDue,
        paidAmount: isAR ? (inv.paid_amount || 0) : 0,
        daysOverdue: Math.max(0, days),
        bucketIndex: bucketIdx,
        status: inv.status || 'open',
        projectId: null,
      };
    })
    .filter(inv => filters.includeZero || inv.balanceDue > 0);

  // Apply partner filter
  let filtered = invoices;
  if (filters.customerId && isAR) filtered = filtered.filter(i => i.partnerCode === filters.customerId);
  if (filters.vendorId && !isAR) filtered = filtered.filter(i => i.partnerCode === filters.vendorId);
  if (filters.currency) filtered = filtered.filter(i => i.currency === filters.currency);

  // Group by partner
  const partnerMap = new Map<string, AgingPartnerSummary>();
  filtered.forEach(inv => {
    const key = inv.partnerCode || inv.partnerName;
    if (!partnerMap.has(key)) {
      partnerMap.set(key, {
        code: inv.partnerCode,
        name: inv.partnerName,
        branch: inv.branch,
        invoiceCount: 0,
        totalOutstanding: 0,
        current: 0,
        bucket1: 0,
        bucket2: 0,
        bucket3: 0,
        bucket4: 0,
        bucket5: 0,
        invoices: [],
      });
    }
    const p = partnerMap.get(key)!;
    p.invoiceCount++;
    p.totalOutstanding += inv.balanceDue;
    p.invoices.push(inv);

    const bi = inv.bucketIndex;
    if (bi === 0) p.current += inv.balanceDue;
    else if (bi === 1) p.bucket1 += inv.balanceDue;
    else if (bi === 2) p.bucket2 += inv.balanceDue;
    else if (bi === 3) p.bucket3 += inv.balanceDue;
    else p.bucket5 += inv.balanceDue;
  });

  const partners = Array.from(partnerMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  const bucketTotals = bucketLabels.map((_, i) =>
    filtered.filter(inv => inv.bucketIndex === i).reduce((s, inv) => s + inv.balanceDue, 0)
  );

  const totalOutstanding = filtered.reduce((s, i) => s + i.balanceDue, 0);
  const totalOverdue = filtered.filter(i => i.daysOverdue > (buckets[1] || 30)).reduce((s, i) => s + i.balanceDue, 0);
  const currentTotal = bucketTotals[0] || 0;
  const above90Total = filtered.filter(i => i.daysOverdue > 90).reduce((s, i) => s + i.balanceDue, 0);

  return {
    partners,
    totalOutstanding,
    totalOverdue,
    currentTotal,
    above90Total,
    bucketTotals,
    bucketLabels,
    topOverdue: partners.slice(0, 10),
    isLoading: false,
  };
}
