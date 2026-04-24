import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useSyncProgress } from '@/contexts/SyncProgressContext';

export type EntityType = 'business_partner' | 'item' | 'sales_order' | 'incoming_payment' | 'ar_invoice' | 'purchase_request' | 'purchase_quotation' | 'purchase_order' | 'goods_receipt' | 'ap_invoice_payable' | 'numbering_series' | 'sales_employee' | 'opportunity' | 'activity' | 'quote' | 'dimension' | 'dimension_levels' | 'cost_center' | 'distribution_rule' | 'inventory_goods_receipt' | 'inventory_goods_issue' | 'stock_transfer' | 'finance_alert' | 'payment_verification' | 'financial_clearance' | 'sales_target' | 'fixed_asset' | 'delivery_note' | 'service_order' | 'service_contract' | 'service_equipment' | 'pm_plan' | 'warranty_claim' | 'user_defaults' | 'sap_user' | 'budget' | 'chart_of_accounts' | 'cpms_invoice' | 'cpms_collection' | 'branch' | 'journal_entry' | 'journal_voucher';
export type SyncDirection = 'to_sap' | 'from_sap' | 'bidirectional';

interface PushResult {
  success: boolean;
  entityId: string;
  entityCode: string;
  sapDocEntry?: string;
  error?: string;
}

interface SyncResult {
  success: boolean;
  synced?: number;
  created?: number;
  conflicts?: any[];
  pushResults?: PushResult[];
  hasMore?: boolean;
  nextSkip?: number | null;
  error?: string;
}

export function useSAPSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const { startSync, endSync, updateProgress } = useSyncProgress();

  const entityLabels: Record<string, string> = {
    business_partner: 'Business Partners', item: 'Items', sales_order: 'Sales Orders',
    incoming_payment: 'Incoming Payments', ar_invoice: 'AR Invoices',
    purchase_request: 'Purchase Requests', purchase_quotation: 'Purchase Quotations',
    purchase_order: 'Purchase Orders', goods_receipt: 'Goods Receipts',
    ap_invoice_payable: 'AP Invoices', numbering_series: 'Numbering Series',
    sales_employee: 'Sales Employees', opportunity: 'Opportunities',
    activity: 'Activities', quote: 'Quotes', dimension: 'Dimensions', dimension_levels: 'Dimension Levels',
    inventory_goods_receipt: 'Goods Receipts (Inv)', inventory_goods_issue: 'Goods Issues (Inv)',
    stock_transfer: 'Stock Transfers', finance_alert: 'Finance Alerts',
    payment_verification: 'Payment Verifications', financial_clearance: 'Financial Clearances',
    sales_target: 'Sales Targets', fixed_asset: 'Fixed Assets',
    delivery_note: 'Delivery Notes', service_order: 'Service Orders',
    service_contract: 'Service Contracts', service_equipment: 'Service Equipment',
    pm_plan: 'PM Plans', warranty_claim: 'Warranty Claims',
    user_defaults: 'User Defaults', sap_user: 'SAP Users',
    budget: 'Budgets', chart_of_accounts: 'Chart of Accounts',
    cpms_invoice: 'CPMS Invoices', cpms_collection: 'CPMS Collections',
    branch: 'Branches (Warehouses)',
    journal_entry: 'Journal Entries',
    journal_voucher: 'Journal Vouchers',
  };

  const sync = async (entity: EntityType, direction: SyncDirection, entityId?: string, limit: number = 100, dateFrom?: string, dateTo?: string, deltaSync: boolean = true): Promise<SyncResult> => {
    setIsLoading(true);
    startSync(entityLabels[entity] || entity, 0, dateFrom, dateTo);
    try {
      const shouldBatchSync = (entity === 'journal_entry' || entity === 'journal_voucher');
      const aggregatedResult: SyncResult = {
        success: true,
        synced: 0,
        created: 0,
        conflicts: [],
        pushResults: [],
      };
      let nextSkip = 0;
      let batchCount = 0;

      while (true) {
        const { data, error } = await supabase.functions.invoke('sap-sync', {
          body: { action: 'sync', entity, direction, entityId, limit, company_id: activeCompanyId, dateFrom, dateTo, skip: nextSkip, deltaSync },
        });

        if (error) throw error;

        const result = data as SyncResult & { totalToSync?: number };
        aggregatedResult.success = aggregatedResult.success && result.success;
        aggregatedResult.synced = (aggregatedResult.synced || 0) + (result.synced || 0);
        aggregatedResult.created = (aggregatedResult.created || 0) + (result.created || 0);
        aggregatedResult.conflicts = [...(aggregatedResult.conflicts || []), ...(result.conflicts || [])];
        aggregatedResult.pushResults = [...(aggregatedResult.pushResults || []), ...(result.pushResults || [])];
        aggregatedResult.error = result.error || aggregatedResult.error;

        // Update live progress in context
        const totalSynced = (aggregatedResult.synced || 0) + (aggregatedResult.created || 0);
        const total = result.totalToSync || totalSynced;
        updateProgress(totalSynced, total);

        if (!shouldBatchSync || !result.hasMore || !result.nextSkip) {
          break;
        }

        nextSkip = result.nextSkip;
        batchCount += 1;

        if (batchCount >= 1000) {
          throw new Error('Journal entry sync exceeded safe batch limit. Please narrow the date range and try again.');
        }
      }

      setLastResult(aggregatedResult);

      // Refresh relevant queries after sync so new records appear immediately
      if ((aggregatedResult.synced || 0) > 0 || (aggregatedResult.created || 0) > 0) {
        const queryKeyMap: Record<string, string[]> = {
          activity: ['activities'],
          business_partner: ['businessPartners', 'business-partners', 'business-partners-list', 'leads'],
          item: ['items'],
          sales_order: ['salesOrders'],
          incoming_payment: ['incomingPayments'],
          ar_invoice: ['arInvoices'],
          opportunity: ['opportunities'],
          quote: ['quotes'],
          purchase_request: ['purchaseRequests'],
          purchase_order: ['purchaseOrders'],
          purchase_quotation: ['purchaseQuotations'],
          goods_receipt: ['goodsReceipts'],
          ap_invoice_payable: ['apInvoices'],
          dimension: ['dimensions', 'cost-centers', 'dist-rules'],
          cost_center: ['cost-centers'],
          distribution_rule: ['dist-rules'],
          inventory_goods_receipt: ['inventoryGoodsReceipts'],
          inventory_goods_issue: ['inventoryGoodsIssues'],
          stock_transfer: ['stockTransfers'],
          finance_alert: ['finance-alerts'],
          payment_verification: ['payment-verifications'],
          financial_clearance: ['financial-clearances'],
          sales_target: ['sales-targets'],
          fixed_asset: ['fa-assets', 'assets', 'capitalizations', 'retirements', 'asset-transfers-fa', 'transfers', 'manual-depreciations', 'depreciation-runs', 'asset-revaluations', 'revaluations'],
          service_order: ['service-orders'],
          service_contract: ['service-contracts'],
          service_equipment: ['service-equipment'],
          pm_plan: ['pm-plans'],
          warranty_claim: ['warranty-claims'],
          sap_user: ['users-profiles-all'],
          budget: ['budgets', 'budget-scenarios'],
          chart_of_accounts: ['chartOfAccounts'],
          branch: ['config-branches', 'branches-lookup'],
          journal_entry: ['journal-entries'],
          journal_voucher: ['journal-vouchers'],
        };
        const keys = queryKeyMap[entity] || [];
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }

      // Check for push errors
      const failedPushes = (aggregatedResult.pushResults || []).filter(r => !r.success);
      
      if (aggregatedResult.success && failedPushes.length === 0) {
        const conflictMsg = aggregatedResult.conflicts?.length ? ` (${aggregatedResult.conflicts.length} conflicts need review)` : '';
        toast({
          title: 'Sync Complete',
          description: `Synced: ${aggregatedResult.synced || 0}, Created: ${aggregatedResult.created || 0}${conflictMsg}`,
        });
      } else if (failedPushes.length > 0) {
        // Show detailed error for failed pushes
        const errorSummary = failedPushes.slice(0, 3).map(r => `${r.entityCode}: ${r.error?.slice(0, 50)}`).join('\n');
        const moreErrors = failedPushes.length > 3 ? `\n... and ${failedPushes.length - 3} more errors` : '';
        toast({
          title: `Sync Completed with ${failedPushes.length} Error(s)`,
          description: `${errorSummary}${moreErrors}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: aggregatedResult.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      }

      endSync(aggregatedResult);
      return aggregatedResult;
    } catch (error: any) {
      const result = { success: false, error: error.message, pushResults: [] };
      setLastResult(result);
      endSync(result);
      toast({
        title: 'Sync Error',
        description: error.message,
        variant: 'destructive',
      });
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sap-sync', {
        body: { action: 'test_connection' },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: data.message,
        });
        return true;
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sync,
    testConnection,
    isLoading,
    lastResult,
  };
}
