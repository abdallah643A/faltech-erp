import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { newTables } from '@/integrations/supabase/new-tables';
import { differenceInDays } from 'date-fns';

/**
 * Customer 360 — Module 2 / Enhancement #2
 *
 * Aggregates a single customer's commercial footprint into one
 * dashboard payload: master data, contacts, lifetime value, open
 * documents, AR aging buckets, and recent activity.
 */

export interface ARBucket {
  current: number;   //  0–30
  bucket30: number;  // 31–60
  bucket60: number;  // 61–90
  bucket90: number;  // 91–120
  over120: number;   // 120+
  total: number;
}

export interface Customer360Data {
  partner: any | null;
  contacts: any[];
  lifetimeValue: number;
  invoiceCount: number;
  avgOrderValue: number;
  openQuotes: any[];
  openOrders: any[];
  unpaidInvoices: any[];
  arAging: ARBucket;
  recentActivities: any[];
  lastInvoiceDate: string | null;
}

export function useCustomer360(businessPartnerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-360', businessPartnerId],
    enabled: !!businessPartnerId,
    queryFn: async (): Promise<Customer360Data> => {
      const id = businessPartnerId!;
      const c = supabase as any;
      const ct = newTables;

      const partnerRes = await c.from('business_partners').select('*').eq('id', id).maybeSingle();
      const contactsRes = await ct.contacts().select('*').eq('business_partner_id', id).order('created_at', { ascending: false }).limit(20);
      const invoicesRes = await c.from('ar_invoices').select('id, doc_num, doc_date, doc_due_date, total, balance_due, status').eq('customer_id', id).order('doc_date', { ascending: false }).limit(200);
      const openQuotesRes = await ct.salesQuotations().select('id, doc_num, doc_date, total, status').eq('customer_id', id).in('status', ['Draft', 'Open', 'Sent']).order('doc_date', { ascending: false }).limit(20);
      const openOrdersRes = await c.from('sales_orders').select('id, doc_num, doc_date, total, status').eq('customer_id', id).in('status', ['Open', 'Confirmed', 'In Progress']).order('doc_date', { ascending: false }).limit(20);
      const activitiesRes = await c.from('activities').select('id, subject, type, status, due_date, completed_at, created_at').eq('business_partner_id', id).order('created_at', { ascending: false }).limit(15);

      const invoicesArr = (invoicesRes.data ?? []) as any[];
      const lifetimeValue = invoicesArr.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const unpaidInvoices = invoicesArr.filter((i) => Number(i.balance_due ?? 0) > 0.01);

      const today = new Date();
      const aging: ARBucket = { current: 0, bucket30: 0, bucket60: 0, bucket90: 0, over120: 0, total: 0 };
      unpaidInvoices.forEach((inv) => {
        const due = inv.doc_due_date ? new Date(inv.doc_due_date) : new Date(inv.doc_date);
        const days = differenceInDays(today, due);
        const bal = Number(inv.balance_due) || 0;
        aging.total += bal;
        if (days <= 0) aging.current += bal;
        else if (days <= 30) aging.bucket30 += bal;
        else if (days <= 60) aging.bucket60 += bal;
        else if (days <= 90) aging.bucket90 += bal;
        else aging.over120 += bal;
      });

      return {
        partner: partnerRes.data ?? null,
        contacts: (contactsRes.data ?? []) as any[],
        lifetimeValue,
        invoiceCount: invoicesArr.length,
        avgOrderValue: invoicesArr.length ? lifetimeValue / invoicesArr.length : 0,
        openQuotes: (openQuotesRes.data ?? []) as any[],
        openOrders: (openOrdersRes.data ?? []) as any[],
        unpaidInvoices,
        arAging: aging,
        recentActivities: (activitiesRes.data ?? []) as any[],
        lastInvoiceDate: invoicesArr[0]?.doc_date ?? null,
      };
    },
  });
}
