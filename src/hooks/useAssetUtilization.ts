import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAssets } from '@/hooks/useAssets';

export interface UtilizationLog {
  id: string;
  asset_id: string;
  log_date: string;
  hours_used: number;
  hours_available: number;
  usage_type: string;
  department: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface UtilizationBenchmark {
  id: string;
  category_id: string | null;
  benchmark_name: string;
  target_utilization_pct: number;
  min_acceptable_pct: number;
  industry_avg_pct: number;
}

// Industry default benchmarks when no custom ones exist
const DEFAULT_BENCHMARKS: Record<string, { target: number; min: number; industryAvg: number }> = {
  'Vehicles': { target: 75, min: 50, industryAvg: 65 },
  'Heavy Equipment': { target: 70, min: 45, industryAvg: 60 },
  'IT Equipment': { target: 85, min: 60, industryAvg: 72 },
  'Office Equipment': { target: 80, min: 55, industryAvg: 68 },
  'Tools': { target: 65, min: 40, industryAvg: 55 },
  'Machinery': { target: 72, min: 48, industryAvg: 62 },
  'Default': { target: 70, min: 45, industryAvg: 60 },
};

export function useAssetUtilization() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { assets, categories } = useAssets();

  // Fetch all utilization logs
  const logs = useQuery({
    queryKey: ['asset-utilization-logs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('asset_utilization_logs' as any).select('*').order('log_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as UtilizationLog[];
    },
  });

  // Fetch benchmarks
  const benchmarks = useQuery({
    queryKey: ['asset-utilization-benchmarks', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('asset_utilization_benchmarks' as any).select('*');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as UtilizationBenchmark[];
    },
  });

  // Log usage
  const logUsage = useMutation({
    mutationFn: async (data: Partial<UtilizationLog>) => {
      const { error } = await supabase.from('asset_utilization_logs' as any).insert({
        ...data,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-utilization-logs'] });
      toast({ title: 'Usage logged successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Calculate per-asset utilization
  const getAssetUtilization = (assetId: string, days = 30) => {
    const allLogs = logs.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const assetLogs = allLogs.filter(
      l => l.asset_id === assetId && new Date(l.log_date) >= cutoff
    );
    const totalUsed = assetLogs.reduce((s, l) => s + (l.hours_used || 0), 0);
    const totalAvailable = assetLogs.reduce((s, l) => s + (l.hours_available || 0), 0);
    const utilizationPct = totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0;
    return { totalUsed, totalAvailable, utilizationPct, logCount: assetLogs.length };
  };

  // Idle assets (zero usage in N days)
  const getIdleAssets = (days = 30) => {
    const allLogs = logs.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const activeAssetIds = new Set(
      allLogs.filter(l => new Date(l.log_date) >= cutoff && (l.hours_used || 0) > 0).map(l => l.asset_id)
    );

    return (assets || []).filter(
      a => !activeAssetIds.has(a.id) && a.status !== 'disposed'
    );
  };

  // Multi-period idle detection (30/60/90)
  const getIdleAssetsByPeriod = () => {
    return {
      idle30: getIdleAssets(30),
      idle60: getIdleAssets(60),
      idle90: getIdleAssets(90),
    };
  };

  // Idle carrying cost
  const getIdleCarryingCost = (days = 30) => {
    const idle = getIdleAssets(days);
    return idle.reduce((total, a) => {
      const dailyDepreciation = ((a.purchase_value || 0) * ((a.depreciation_rate || 20) / 100)) / 365;
      return total + (dailyDepreciation * days);
    }, 0);
  };

  // Per-asset idle carrying cost breakdown
  const getIdleCostBreakdown = (days = 30) => {
    const idle = getIdleAssets(days);
    return idle.map(a => {
      const dailyDepreciation = ((a.purchase_value || 0) * ((a.depreciation_rate || 20) / 100)) / 365;
      const totalCost = dailyDepreciation * days;
      const storageCost = (a.purchase_value || 0) * 0.005 * (days / 30); // ~0.5% monthly storage
      const maintenanceCost = (a.purchase_value || 0) * 0.01 * (days / 30); // ~1% monthly maintenance
      return {
        asset: a,
        dailyDepreciation,
        depreciationCost: totalCost,
        storageCost,
        maintenanceCost,
        totalCarryingCost: totalCost + storageCost + maintenanceCost,
      };
    }).sort((a, b) => b.totalCarryingCost - a.totalCarryingCost);
  };

  // Reallocation recommendations for idle assets
  const getReallocationRecommendations = (days = 30) => {
    const idle = getIdleAssets(days);
    const deptUtil = getDepartmentUtilization(days);
    
    // Find departments with high utilization (need more assets)
    const highDemandDepts = deptUtil
      .filter(d => d.utilizationPct > 80)
      .sort((a, b) => b.utilizationPct - a.utilizationPct);

    return idle.map(a => {
      const dailyCost = ((a.purchase_value || 0) * ((a.depreciation_rate || 20) / 100)) / 365;
      const annualCost = dailyCost * 365;
      
      let action: 'reallocate' | 'lease' | 'dispose' | 'monitor' = 'monitor';
      let targetDept: string | null = null;
      let reason = '';
      let priority: 'high' | 'medium' | 'low' = 'low';
      let savingsPotential = 0;

      if (a.condition === 'poor' || (a.current_value || 0) < (a.purchase_value || 1) * 0.1) {
        action = 'dispose';
        reason = 'Low residual value or poor condition';
        priority = 'high';
        savingsPotential = dailyCost * 365;
      } else if (highDemandDepts.length > 0) {
        action = 'reallocate';
        targetDept = highDemandDepts[0].department;
        reason = `${targetDept} has ${highDemandDepts[0].utilizationPct.toFixed(0)}% utilization (over-utilized)`;
        priority = 'high';
        savingsPotential = dailyCost * 180;
      } else if (annualCost > 5000) {
        action = 'lease';
        reason = 'High carrying cost, consider leasing to generate revenue';
        priority = 'medium';
        savingsPotential = annualCost * 0.6;
      } else {
        action = 'monitor';
        reason = 'Continue monitoring for future needs';
        priority = 'low';
      }

      return { asset: a, action, targetDept, reason, priority, savingsPotential, dailyCost };
    }).sort((a, b) => {
      const pMap = { high: 3, medium: 2, low: 1 };
      return pMap[b.priority] - pMap[a.priority];
    });
  };

  // Department utilization
  const getDepartmentUtilization = (days = 30) => {
    const allLogs = logs.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    const deptMap: Record<string, { used: number; available: number; count: number; assetIds: Set<string> }> = {};
    for (const l of recent) {
      const dept = l.department || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { used: 0, available: 0, count: 0, assetIds: new Set() };
      deptMap[dept].used += l.hours_used || 0;
      deptMap[dept].available += l.hours_available || 0;
      deptMap[dept].count++;
      deptMap[dept].assetIds.add(l.asset_id);
    }

    return Object.entries(deptMap).map(([dept, v]) => {
      const utilizationPct = v.available > 0 ? (v.used / v.available) * 100 : 0;
      const costPerUse = v.used > 0 ? (v.available * 50) / v.used : 0; // Estimated hourly cost
      const assetCount = v.assetIds.size;
      
      return {
        department: dept,
        hoursUsed: v.used,
        hoursAvailable: v.available,
        utilizationPct,
        logCount: v.count,
        costPerUse,
        assetCount,
        capacityStatus: utilizationPct > 85 ? 'over-utilized' as const
          : utilizationPct > 60 ? 'optimal' as const
          : utilizationPct > 30 ? 'under-utilized' as const
          : 'critical' as const,
      };
    }).sort((a, b) => b.utilizationPct - a.utilizationPct);
  };

  // Department heatmap data (weekday × department)
  const getDepartmentHeatmap = (days = 30) => {
    const allLogs = logs.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmap: Record<string, Record<string, { used: number; available: number }>> = {};

    for (const l of recent) {
      const dept = l.department || 'Unassigned';
      const dayOfWeek = dayNames[new Date(l.log_date).getDay()];
      if (!heatmap[dept]) heatmap[dept] = {};
      if (!heatmap[dept][dayOfWeek]) heatmap[dept][dayOfWeek] = { used: 0, available: 0 };
      heatmap[dept][dayOfWeek].used += l.hours_used || 0;
      heatmap[dept][dayOfWeek].available += l.hours_available || 0;
    }

    const departments = Object.keys(heatmap);
    return { departments, dayNames, heatmap };
  };

  // Capacity planning recommendations
  const getCapacityRecommendations = (days = 30) => {
    const deptUtil = getDepartmentUtilization(days);
    return deptUtil.map(d => {
      let recommendation = '';
      let action: 'add_assets' | 'redistribute' | 'reduce_assets' | 'maintain' = 'maintain';
      let urgency: 'high' | 'medium' | 'low' = 'low';

      if (d.utilizationPct > 90) {
        recommendation = `Critical overload: Add ${Math.ceil(d.assetCount * 0.3)} more assets or redistribute workload`;
        action = 'add_assets';
        urgency = 'high';
      } else if (d.utilizationPct > 80) {
        recommendation = `Approaching capacity: Plan for ${Math.ceil(d.assetCount * 0.2)} additional assets`;
        action = 'add_assets';
        urgency = 'medium';
      } else if (d.utilizationPct < 20 && d.assetCount > 1) {
        recommendation = `Significantly under-utilized: Consider reducing by ${Math.floor(d.assetCount * 0.5)} assets`;
        action = 'reduce_assets';
        urgency = 'high';
      } else if (d.utilizationPct < 40 && d.assetCount > 2) {
        recommendation = `Under-utilized: Redistribute ${Math.floor(d.assetCount * 0.3)} assets to high-demand departments`;
        action = 'redistribute';
        urgency = 'medium';
      } else {
        recommendation = 'Operating within optimal range';
        action = 'maintain';
        urgency = 'low';
      }

      return { ...d, recommendation, action, urgency };
    });
  };

  // Utilization trends (daily aggregation)
  const getUtilizationTrend = (days = 30) => {
    const allLogs = logs.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    const dayMap: Record<string, { used: number; available: number }> = {};
    for (const l of recent) {
      if (!dayMap[l.log_date]) dayMap[l.log_date] = { used: 0, available: 0 };
      dayMap[l.log_date].used += l.hours_used || 0;
      dayMap[l.log_date].available += l.hours_available || 0;
    }

    return Object.entries(dayMap)
      .map(([date, v]) => ({
        date,
        hoursUsed: v.used,
        hoursAvailable: v.available,
        utilizationPct: v.available > 0 ? (v.used / v.available) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Weekly aggregation
  const getWeeklyTrend = (days = 90) => {
    const daily = getUtilizationTrend(days);
    const weekMap: Record<string, { used: number; available: number; count: number }> = {};
    for (const d of daily) {
      const date = new Date(d.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weekMap[key]) weekMap[key] = { used: 0, available: 0, count: 0 };
      weekMap[key].used += d.hoursUsed;
      weekMap[key].available += d.hoursAvailable;
      weekMap[key].count++;
    }
    return Object.entries(weekMap).map(([week, v]) => ({
      week,
      hoursUsed: v.used,
      hoursAvailable: v.available,
      utilizationPct: v.available > 0 ? (v.used / v.available) * 100 : 0,
    })).sort((a, b) => a.week.localeCompare(b.week));
  };

  // Monthly aggregation
  const getMonthlyTrend = (days = 365) => {
    const daily = getUtilizationTrend(days);
    const monthMap: Record<string, { used: number; available: number }> = {};
    for (const d of daily) {
      const key = d.date.substring(0, 7); // YYYY-MM
      if (!monthMap[key]) monthMap[key] = { used: 0, available: 0 };
      monthMap[key].used += d.hoursUsed;
      monthMap[key].available += d.hoursAvailable;
    }
    return Object.entries(monthMap).map(([month, v]) => ({
      month,
      hoursUsed: v.used,
      hoursAvailable: v.available,
      utilizationPct: v.available > 0 ? (v.used / v.available) * 100 : 0,
    })).sort((a, b) => a.month.localeCompare(b.month));
  };

  // Benchmark comparison
  const getBenchmarkComparison = (days = 30) => {
    const catMap: Record<string, { used: number; available: number; catName: string }> = {};
    const allLogs = logs.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    for (const l of recent) {
      const asset = (assets || []).find(a => a.id === l.asset_id);
      const catId = asset?.category_id || 'uncategorized';
      const catName = (categories || []).find(c => c.id === catId)?.name || 'Uncategorized';
      if (!catMap[catId]) catMap[catId] = { used: 0, available: 0, catName };
      catMap[catId].used += l.hours_used || 0;
      catMap[catId].available += l.hours_available || 0;
    }

    return Object.entries(catMap).map(([catId, v]) => {
      const actual = v.available > 0 ? (v.used / v.available) * 100 : 0;
      const bench = DEFAULT_BENCHMARKS[v.catName] || DEFAULT_BENCHMARKS['Default'];
      const customBench = (benchmarks.data || []).find(b => b.category_id === catId);
      
      return {
        category: v.catName,
        actual,
        target: customBench?.target_utilization_pct ?? bench.target,
        industryAvg: customBench?.industry_avg_pct ?? bench.industryAvg,
        minAcceptable: customBench?.min_acceptable_pct ?? bench.min,
        gap: actual - (customBench?.target_utilization_pct ?? bench.target),
        status: actual >= (customBench?.target_utilization_pct ?? bench.target) ? 'above_target' as const
          : actual >= (customBench?.min_acceptable_pct ?? bench.min) ? 'acceptable' as const
          : 'below_minimum' as const,
      };
    });
  };

  // Overall fleet utilization
  const getFleetSummary = (days = 30) => {
    const allLogs = logs.data || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    const totalUsed = recent.reduce((s, l) => s + (l.hours_used || 0), 0);
    const totalAvailable = recent.reduce((s, l) => s + (l.hours_available || 0), 0);
    const uniqueAssets = new Set(recent.map(l => l.asset_id)).size;
    const totalAssets = (assets || []).filter(a => a.status !== 'disposed').length;
    const idleAssets = getIdleAssets(days).length;
    const idleCost = getIdleCarryingCost(days);

    return {
      totalUsed,
      totalAvailable,
      utilizationPct: totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0,
      activeAssets: uniqueAssets,
      totalAssets,
      idleAssets,
      idleCost,
    };
  };

  return {
    logs,
    benchmarks,
    logUsage,
    getAssetUtilization,
    getIdleAssets,
    getIdleAssetsByPeriod,
    getIdleCarryingCost,
    getIdleCostBreakdown,
    getReallocationRecommendations,
    getDepartmentUtilization,
    getDepartmentHeatmap,
    getCapacityRecommendations,
    getUtilizationTrend,
    getWeeklyTrend,
    getMonthlyTrend,
    getBenchmarkComparison,
    getFleetSummary,
  };
}
