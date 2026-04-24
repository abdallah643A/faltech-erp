import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import type { Asset } from '@/hooks/useAssets';

export interface DepreciationRun {
  id: string;
  asset_id: string;
  run_date: string;
  period_start: string;
  period_end: string;
  depreciation_method: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value_before: number;
  book_value_after: number;
  useful_life_years: number | null;
  salvage_value: number;
  units_produced: number | null;
  total_estimated_units: number | null;
  status: string;
  created_at: string;
}

export interface CostAllocation {
  id: string;
  asset_id: string;
  cost_center_id: string | null;
  distribution_rule_id: string | null;
  allocation_percentage: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

export interface ROISnapshot {
  id: string;
  asset_id: string;
  snapshot_date: string;
  revenue_generated: number;
  cost_of_ownership: number;
  maintenance_cost: number;
  depreciation_cost: number;
  roi_percentage: number;
  notes: string | null;
}

// ─── Depreciation calculators ───────────────────────────────────
export function calculateStraightLine(
  purchaseValue: number, salvageValue: number, usefulLifeYears: number, periodsElapsed: number
): { periodDepreciation: number; accumulated: number; bookValue: number } {
  const depreciableBase = purchaseValue - salvageValue;
  const annual = depreciableBase / usefulLifeYears;
  const periodDepreciation = annual / 12; // monthly
  const accumulated = Math.min(periodDepreciation * periodsElapsed, depreciableBase);
  const bookValue = Math.max(purchaseValue - accumulated, salvageValue);
  return { periodDepreciation, accumulated, bookValue };
}

export function calculateDecliningBalance(
  purchaseValue: number, salvageValue: number, rate: number, periodsElapsed: number
): { periodDepreciation: number; accumulated: number; bookValue: number } {
  let bookValue = purchaseValue;
  let accumulated = 0;
  const monthlyRate = rate / 100 / 12;

  for (let i = 0; i < periodsElapsed; i++) {
    const dep = Math.max(bookValue * monthlyRate, 0);
    if (bookValue - dep < salvageValue) {
      accumulated += bookValue - salvageValue;
      bookValue = salvageValue;
      break;
    }
    accumulated += dep;
    bookValue -= dep;
  }

  const periodDepreciation = bookValue > salvageValue ? bookValue * monthlyRate : 0;
  return { periodDepreciation, accumulated, bookValue };
}

export function calculateUnitsOfProduction(
  purchaseValue: number, salvageValue: number,
  totalUnits: number, unitsProduced: number
): { periodDepreciation: number; accumulated: number; bookValue: number } {
  const depreciableBase = purchaseValue - salvageValue;
  const perUnit = totalUnits > 0 ? depreciableBase / totalUnits : 0;
  const accumulated = Math.min(perUnit * unitsProduced, depreciableBase);
  const bookValue = Math.max(purchaseValue - accumulated, salvageValue);
  const periodDepreciation = perUnit;
  return { periodDepreciation, accumulated, bookValue };
}

// ─── Asset performance analytics ─────────────────────────────────
export function calculateAssetROI(asset: Asset, maintenanceCost: number, revenue: number) {
  const totalCost = (asset.purchase_value || 0) + maintenanceCost;
  const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;
  return roi;
}

export function calculateTCO(asset: Asset, maintenanceCosts: number[], depreciationTotal: number) {
  const purchaseCost = asset.purchase_value || 0;
  const totalMaintenance = maintenanceCosts.reduce((s, c) => s + c, 0);
  return purchaseCost + totalMaintenance + depreciationTotal;
}

// ─── Hook ────────────────────────────────────────────────────────
export function useAssetFinance() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  // Depreciation runs
  const depreciationRuns = useQuery({
    queryKey: ['asset-depreciation-runs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('asset_depreciation_runs' as any).select('*').order('run_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as DepreciationRun[];
    },
  });

  // Cost allocations
  const costAllocations = useQuery({
    queryKey: ['asset-cost-allocations', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('asset_cost_allocations' as any).select('*').eq('is_active', true);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CostAllocation[];
    },
  });

  // ROI snapshots
  const roiSnapshots = useQuery({
    queryKey: ['asset-roi-snapshots', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('asset_roi_snapshots' as any).select('*').order('snapshot_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ROISnapshot[];
    },
  });

  // Run depreciation for a single asset
  const runDepreciation = useMutation({
    mutationFn: async (params: {
      asset: Asset;
      method: string;
      periodStart: string;
      periodEnd: string;
      usefulLifeYears?: number;
      salvageValue?: number;
      unitsProduced?: number;
      totalEstimatedUnits?: number;
    }) => {
      const { asset, method, periodStart, periodEnd, usefulLifeYears = 5, salvageValue = 0, unitsProduced, totalEstimatedUnits } = params;
      const purchaseValue = asset.purchase_value || 0;
      const purchaseDate = asset.purchase_date ? new Date(asset.purchase_date) : new Date();
      const endDate = new Date(periodEnd);

      // Calculate months elapsed since purchase
      const monthsElapsed = Math.max(
        (endDate.getFullYear() - purchaseDate.getFullYear()) * 12 + (endDate.getMonth() - purchaseDate.getMonth()),
        1
      );

      let result: { periodDepreciation: number; accumulated: number; bookValue: number };

      if (method === 'declining') {
        result = calculateDecliningBalance(purchaseValue, salvageValue, asset.depreciation_rate || 20, monthsElapsed);
      } else if (method === 'units_of_production') {
        result = calculateUnitsOfProduction(purchaseValue, salvageValue, totalEstimatedUnits || 1, unitsProduced || 0);
      } else {
        result = calculateStraightLine(purchaseValue, salvageValue, usefulLifeYears, monthsElapsed);
      }

      const { error } = await supabase.from('asset_depreciation_runs' as any).insert({
        asset_id: asset.id,
        run_date: new Date().toISOString().split('T')[0],
        period_start: periodStart,
        period_end: periodEnd,
        depreciation_method: method,
        depreciation_amount: Math.round(result.periodDepreciation * 100) / 100,
        accumulated_depreciation: Math.round(result.accumulated * 100) / 100,
        book_value_before: asset.current_value || purchaseValue,
        book_value_after: Math.round(result.bookValue * 100) / 100,
        useful_life_years: usefulLifeYears,
        salvage_value: salvageValue,
        units_produced: unitsProduced || null,
        total_estimated_units: totalEstimatedUnits || null,
        status: 'posted',
        created_by: user?.id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (error) throw error;

      // Update asset current value
      await supabase.from('assets').update({ current_value: Math.round(result.bookValue * 100) / 100 }).eq('id', asset.id);

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-depreciation-runs'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      toast({ title: 'Depreciation run completed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Save cost allocation
  const saveCostAllocation = useMutation({
    mutationFn: async (data: Partial<CostAllocation> & { asset_id: string }) => {
      const { error } = await supabase.from('asset_cost_allocations' as any).insert({
        ...data,
        created_by: user?.id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-cost-allocations'] });
      toast({ title: 'Cost allocation saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Save ROI snapshot
  const saveROISnapshot = useMutation({
    mutationFn: async (data: Partial<ROISnapshot> & { asset_id: string }) => {
      const { error } = await supabase.from('asset_roi_snapshots' as any).insert({
        ...data,
        created_by: user?.id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-roi-snapshots'] });
      toast({ title: 'ROI snapshot saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Get depreciation schedule preview for an asset
  const getDepreciationSchedule = (
    asset: Asset, method: string, usefulLifeYears = 5, salvageValue = 0, totalUnits = 0
  ) => {
    const purchaseValue = asset.purchase_value || 0;
    const periods = usefulLifeYears * 12;
    const schedule: Array<{
      period: number; year: number; month: number;
      depreciation: number; accumulated: number; bookValue: number;
    }> = [];

    for (let i = 1; i <= periods; i++) {
      let result;
      if (method === 'declining') {
        result = calculateDecliningBalance(purchaseValue, salvageValue, asset.depreciation_rate || 20, i);
      } else if (method === 'units_of_production') {
        const unitsPerPeriod = totalUnits / periods;
        result = calculateUnitsOfProduction(purchaseValue, salvageValue, totalUnits, unitsPerPeriod * i);
      } else {
        result = calculateStraightLine(purchaseValue, salvageValue, usefulLifeYears, i);
      }

      schedule.push({
        period: i,
        year: Math.ceil(i / 12),
        month: ((i - 1) % 12) + 1,
        depreciation: result.periodDepreciation,
        accumulated: result.accumulated,
        bookValue: result.bookValue,
      });

      if (result.bookValue <= salvageValue) break;
    }

    return schedule;
  };

  // Asset fleet financial summary
  const getFleetFinancialSummary = (assets: Asset[]) => {
    const active = assets.filter(a => a.status !== 'disposed');
    const totalPurchaseValue = active.reduce((s, a) => s + (a.purchase_value || 0), 0);
    const totalCurrentValue = active.reduce((s, a) => s + (a.current_value || 0), 0);
    const totalDepreciation = totalPurchaseValue - totalCurrentValue;
    const depreciationPct = totalPurchaseValue > 0 ? (totalDepreciation / totalPurchaseValue) * 100 : 0;

    const runs = depreciationRuns.data || [];
    const totalRunDepreciation = runs.reduce((s, r) => s + (r.depreciation_amount || 0), 0);

    // By method
    const byMethod: Record<string, { count: number; value: number }> = {};
    for (const a of active) {
      const m = a.depreciation_method || 'straight_line';
      if (!byMethod[m]) byMethod[m] = { count: 0, value: 0 };
      byMethod[m].count++;
      byMethod[m].value += a.current_value || 0;
    }

    // By category
    const byCat: Record<string, { count: number; purchaseValue: number; currentValue: number }> = {};
    for (const a of active) {
      const cat = a.asset_categories?.name || 'Uncategorized';
      if (!byCat[cat]) byCat[cat] = { count: 0, purchaseValue: 0, currentValue: 0 };
      byCat[cat].count++;
      byCat[cat].purchaseValue += a.purchase_value || 0;
      byCat[cat].currentValue += a.current_value || 0;
    }

    return {
      totalAssets: active.length,
      totalPurchaseValue,
      totalCurrentValue,
      totalDepreciation,
      depreciationPct,
      totalRunDepreciation,
      byMethod: Object.entries(byMethod).map(([method, v]) => ({ method, ...v })),
      byCategory: Object.entries(byCat).map(([category, v]) => ({ category, ...v })),
    };
  };

  return {
    depreciationRuns,
    costAllocations,
    roiSnapshots,
    runDepreciation,
    saveCostAllocation,
    saveROISnapshot,
    getDepreciationSchedule,
    getFleetFinancialSummary,
  };
}
