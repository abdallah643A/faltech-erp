import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAssets, Asset } from '@/hooks/useAssets';
import { useAssetUtilization, UtilizationLog } from '@/hooks/useAssetUtilization';

// ─── Predictive & Forecasting (#4) ───

export interface SeasonalAnalysis {
  month: string;
  avgUtilization: number;
  totalHours: number;
  isPeak: boolean;
}

export interface DemandForecast {
  category: string;
  currentAssets: number;
  currentUtilization: number;
  projectedDemand: number;
  assetsNeeded: number;
  recommendation: string;
}

// ─── Cost-Benefit (#5) ───

export interface AssetROI {
  asset: Asset;
  totalRevenue: number;
  totalCost: number;
  roi: number;
  revenuePerHour: number;
  costPerHour: number;
  breakEvenHours: number;
  currentHours: number;
  breakEvenMet: boolean;
  maintenanceCost: number;
  depreciationCost: number;
}

// ─── Operator Analytics (#6) ───

export interface OperatorMetrics {
  department: string;
  totalHours: number;
  avgUtilization: number;
  assetCount: number;
  efficiency: number;
  tier: 'power_user' | 'average' | 'underutilizer';
}

// ─── Lifecycle Utilization (#7) ───

export interface AgingAnalysis {
  ageGroup: string;
  assetCount: number;
  avgUtilization: number;
  avgConditionScore: number;
  replacementCandidates: number;
}

// ─── Comparative (#8) ───

export interface AssetComparison {
  asset: Asset;
  utilization: number;
  categoryAvg: number;
  variance: number;
  rank: number;
  totalInCategory: number;
  isBestPractice: boolean;
}

export function useAssetAdvancedAnalytics() {
  const { activeCompanyId } = useActiveCompany();
  const { assets, categories } = useAssets();
  const { logs, getAssetUtilization, getDepartmentUtilization } = useAssetUtilization();

  const allLogs = logs.data || [];
  const allAssets = (assets || []).filter(a => a.status !== 'disposed');

  // ═══════════════════════════════════════
  // #4 PREDICTIVE & FORECASTING
  // ═══════════════════════════════════════

  const getSeasonalAnalysis = (): SeasonalAnalysis[] => {
    const monthMap: Record<string, { used: number; available: number; count: number }> = {};
    for (const l of allLogs) {
      const month = new Date(l.log_date).toLocaleString('en', { month: 'short' });
      if (!monthMap[month]) monthMap[month] = { used: 0, available: 0, count: 0 };
      monthMap[month].used += l.hours_used || 0;
      monthMap[month].available += l.hours_available || 0;
      monthMap[month].count++;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const results = months.map(m => {
      const v = monthMap[m] || { used: 0, available: 0, count: 0 };
      const avgUtil = v.available > 0 ? (v.used / v.available) * 100 : 0;
      return { month: m, avgUtilization: avgUtil, totalHours: v.used, isPeak: false };
    });
    const maxUtil = Math.max(...results.map(r => r.avgUtilization));
    const threshold = maxUtil * 0.75;
    results.forEach(r => { r.isPeak = r.avgUtilization >= threshold && r.avgUtilization > 0; });
    return results;
  };

  const getDemandForecasts = (): DemandForecast[] => {
    const catMap: Record<string, { catName: string; assets: Asset[]; used: number; available: number }> = {};
    for (const a of allAssets) {
      const catId = a.category_id || 'uncategorized';
      const catName = (categories || []).find(c => c.id === catId)?.name || 'Uncategorized';
      if (!catMap[catId]) catMap[catId] = { catName, assets: [], used: 0, available: 0 };
      catMap[catId].assets.push(a);
      const u = getAssetUtilization(a.id, 90);
      catMap[catId].used += u.totalUsed;
      catMap[catId].available += u.totalAvailable;
    }

    return Object.values(catMap).map(v => {
      const utilPct = v.available > 0 ? (v.used / v.available) * 100 : 0;
      const projectedDemand = utilPct > 80 ? Math.ceil(v.assets.length * 1.2) : utilPct > 60 ? v.assets.length : Math.floor(v.assets.length * 0.8);
      const assetsNeeded = Math.max(0, projectedDemand - v.assets.length);
      let recommendation = 'Maintain current fleet';
      if (assetsNeeded > 0) recommendation = `Acquire ${assetsNeeded} more assets`;
      else if (projectedDemand < v.assets.length) recommendation = `Consider retiring ${v.assets.length - projectedDemand} assets`;

      return { category: v.catName, currentAssets: v.assets.length, currentUtilization: utilPct, projectedDemand, assetsNeeded, recommendation };
    });
  };

  const getUtilizationPrediction = (days = 90) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    // Simple linear regression on daily utilization
    const dayMap: Record<string, { used: number; available: number }> = {};
    for (const l of recent) {
      if (!dayMap[l.log_date]) dayMap[l.log_date] = { used: 0, available: 0 };
      dayMap[l.log_date].used += l.hours_used || 0;
      dayMap[l.log_date].available += l.hours_available || 0;
    }

    const points = Object.entries(dayMap)
      .map(([date, v]) => ({
        x: new Date(date).getTime(),
        y: v.available > 0 ? (v.used / v.available) * 100 : 0,
      }))
      .sort((a, b) => a.x - b.x);

    if (points.length < 3) return { trend: 'insufficient_data' as const, slope: 0, predicted30: 0, predicted60: 0, predicted90: 0, points: [] };

    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n;

    const now = Date.now();
    const msPerDay = 86400000;
    const predicted30 = Math.max(0, Math.min(100, slope * (now + 30 * msPerDay) + intercept));
    const predicted60 = Math.max(0, Math.min(100, slope * (now + 60 * msPerDay) + intercept));
    const predicted90 = Math.max(0, Math.min(100, slope * (now + 90 * msPerDay) + intercept));

    const trend = slope > 0.00001 ? 'increasing' as const : slope < -0.00001 ? 'decreasing' as const : 'stable' as const;

    // Generate forecast points
    const forecastPoints = [];
    for (let i = 1; i <= 30; i++) {
      const futureTime = now + i * msPerDay;
      forecastPoints.push({
        date: new Date(futureTime).toISOString().split('T')[0],
        predicted: Math.max(0, Math.min(100, slope * futureTime + intercept)),
      });
    }

    return { trend, slope, predicted30, predicted60, predicted90, points: forecastPoints };
  };

  // ═══════════════════════════════════════
  // #5 COST-BENEFIT ANALYSIS
  // ═══════════════════════════════════════

  const getAssetROI = (days = 365): AssetROI[] => {
    return allAssets.map(a => {
      const u = getAssetUtilization(a.id, days);
      const purchaseValue = a.purchase_value || 0;
      const depreciationRate = a.depreciation_rate || 20;
      const annualDepreciation = purchaseValue * (depreciationRate / 100);
      const depreciationCost = annualDepreciation * (days / 365);
      const maintenanceCost = purchaseValue * 0.05 * (days / 365); // Estimated 5% annual
      const totalCost = depreciationCost + maintenanceCost;

      // Estimated revenue (proxy: hours used × avg hourly revenue rate)
      const avgHourlyRate = purchaseValue > 100000 ? 150 : purchaseValue > 50000 ? 100 : 50;
      const totalRevenue = u.totalUsed * avgHourlyRate;
      const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
      const revenuePerHour = u.totalUsed > 0 ? totalRevenue / u.totalUsed : 0;
      const costPerHour = u.totalUsed > 0 ? totalCost / u.totalUsed : 0;
      const breakEvenHours = avgHourlyRate > 0 ? totalCost / avgHourlyRate : 0;
      const breakEvenMet = u.totalUsed >= breakEvenHours;

      return {
        asset: a, totalRevenue, totalCost, roi, revenuePerHour, costPerHour,
        breakEvenHours, currentHours: u.totalUsed, breakEvenMet,
        maintenanceCost, depreciationCost,
      };
    }).sort((a, b) => b.roi - a.roi);
  };

  const getUtilizationVsMaintenanceCost = () => {
    return allAssets.map(a => {
      const u = getAssetUtilization(a.id, 365);
      const maintenanceCost = (a.purchase_value || 0) * 0.05;
      return {
        name: a.name,
        utilization: u.utilizationPct,
        maintenanceCost,
        purchaseValue: a.purchase_value || 0,
      };
    }).filter(a => a.utilization > 0 || a.maintenanceCost > 0);
  };

  // ═══════════════════════════════════════
  // #6 OPERATOR / DEPARTMENT ANALYTICS
  // ═══════════════════════════════════════

  const getOperatorMetrics = (days = 30): OperatorMetrics[] => {
    const deptUtil = getDepartmentUtilization(days);
    const avgAll = deptUtil.length > 0 ? deptUtil.reduce((s, d) => s + d.utilizationPct, 0) / deptUtil.length : 0;

    return deptUtil.map(d => {
      const efficiency = avgAll > 0 ? (d.utilizationPct / avgAll) * 100 : 0;
      let tier: 'power_user' | 'average' | 'underutilizer' = 'average';
      if (d.utilizationPct > avgAll * 1.2) tier = 'power_user';
      else if (d.utilizationPct < avgAll * 0.6) tier = 'underutilizer';

      return {
        department: d.department,
        totalHours: d.hoursUsed,
        avgUtilization: d.utilizationPct,
        assetCount: d.assetCount,
        efficiency,
        tier,
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  };

  const getSharingEfficiency = (days = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    // How many departments share each asset
    const assetDepts: Record<string, Set<string>> = {};
    for (const l of recent) {
      if (!assetDepts[l.asset_id]) assetDepts[l.asset_id] = new Set();
      assetDepts[l.asset_id].add(l.department || 'Unassigned');
    }

    const shared = Object.entries(assetDepts).filter(([, depts]) => depts.size > 1);
    const exclusive = Object.entries(assetDepts).filter(([, depts]) => depts.size === 1);

    return {
      sharedAssets: shared.length,
      exclusiveAssets: exclusive.length,
      sharingRate: (shared.length / Math.max(Object.keys(assetDepts).length, 1)) * 100,
      details: shared.map(([assetId, depts]) => ({
        asset: allAssets.find(a => a.id === assetId),
        departments: Array.from(depts),
        departmentCount: depts.size,
      })),
    };
  };

  // ═══════════════════════════════════════
  // #7 LIFECYCLE UTILIZATION
  // ═══════════════════════════════════════

  const getAgingAnalysis = (days = 90): AgingAnalysis[] => {
    const now = new Date();
    const groups: Record<string, { assets: Asset[]; totalUtil: number; count: number }> = {
      '0-1 years': { assets: [], totalUtil: 0, count: 0 },
      '1-3 years': { assets: [], totalUtil: 0, count: 0 },
      '3-5 years': { assets: [], totalUtil: 0, count: 0 },
      '5-10 years': { assets: [], totalUtil: 0, count: 0 },
      '10+ years': { assets: [], totalUtil: 0, count: 0 },
    };

    for (const a of allAssets) {
      const purchaseDate = a.purchase_date ? new Date(a.purchase_date) : null;
      const ageYears = purchaseDate ? (now.getTime() - purchaseDate.getTime()) / (365.25 * 86400000) : 3;
      const u = getAssetUtilization(a.id, days);

      let group = '10+ years';
      if (ageYears < 1) group = '0-1 years';
      else if (ageYears < 3) group = '1-3 years';
      else if (ageYears < 5) group = '3-5 years';
      else if (ageYears < 10) group = '5-10 years';

      groups[group].assets.push(a);
      groups[group].totalUtil += u.utilizationPct;
      groups[group].count++;
    }

    return Object.entries(groups).map(([ageGroup, v]) => {
      const conditionScore = v.assets.reduce((s, a) => {
        const cMap: Record<string, number> = { excellent: 100, good: 75, fair: 50, poor: 25 };
        return s + (cMap[a.condition || 'fair'] || 50);
      }, 0) / Math.max(v.count, 1);

      const replacementCandidates = v.assets.filter(a => {
        const u = getAssetUtilization(a.id, days);
        return u.utilizationPct < 20 && (a.condition === 'poor' || a.condition === 'fair');
      }).length;

      return {
        ageGroup,
        assetCount: v.count,
        avgUtilization: v.count > 0 ? v.totalUtil / v.count : 0,
        avgConditionScore: conditionScore,
        replacementCandidates,
      };
    });
  };

  const getDeclineCurve = () => {
    const now = new Date();
    return allAssets.map(a => {
      const purchaseDate = a.purchase_date ? new Date(a.purchase_date) : now;
      const ageMonths = Math.max(1, Math.floor((now.getTime() - purchaseDate.getTime()) / (30.44 * 86400000)));
      const u = getAssetUtilization(a.id, 365);
      return { name: a.name, ageMonths, utilization: u.utilizationPct, condition: a.condition || 'fair' };
    }).sort((a, b) => a.ageMonths - b.ageMonths);
  };

  const getReplacementRecommendations = () => {
    const now = new Date();
    return allAssets.map(a => {
      const purchaseDate = a.purchase_date ? new Date(a.purchase_date) : now;
      const ageYears = (now.getTime() - purchaseDate.getTime()) / (365.25 * 86400000);
      const u = getAssetUtilization(a.id, 180);
      const depRate = a.depreciation_rate || 20;
      const usefulLife = 100 / depRate;
      const remainingLife = Math.max(0, usefulLife - ageYears);
      const currentValue = a.current_value || 0;
      const purchaseValue = a.purchase_value || 0;
      const valueRatio = purchaseValue > 0 ? currentValue / purchaseValue : 0;

      let timing: 'immediate' | 'within_1_year' | 'within_3_years' | 'not_needed' = 'not_needed';
      let reason = '';

      if (remainingLife < 0.5 && u.utilizationPct < 30) {
        timing = 'immediate';
        reason = 'End of useful life with low utilization';
      } else if (a.condition === 'poor' && u.utilizationPct < 40) {
        timing = 'immediate';
        reason = 'Poor condition affecting productivity';
      } else if (remainingLife < 1.5 || valueRatio < 0.15) {
        timing = 'within_1_year';
        reason = 'Approaching end of useful life';
      } else if (remainingLife < 3 && u.utilizationPct < 50) {
        timing = 'within_3_years';
        reason = 'Declining utilization with aging';
      }

      return {
        asset: a, ageYears, remainingLife, utilization: u.utilizationPct,
        valueRatio, timing, reason, currentValue, purchaseValue,
      };
    }).filter(r => r.timing !== 'not_needed')
      .sort((a, b) => {
        const tMap = { immediate: 0, within_1_year: 1, within_3_years: 2, not_needed: 3 };
        return tMap[a.timing] - tMap[b.timing];
      });
  };

  // ═══════════════════════════════════════
  // #8 COMPARATIVE ANALYSIS
  // ═══════════════════════════════════════

  const getAssetComparisons = (days = 90): AssetComparison[] => {
    const catGrouped: Record<string, { assets: Asset[]; totalUtil: number }> = {};
    for (const a of allAssets) {
      const catId = a.category_id || 'uncategorized';
      if (!catGrouped[catId]) catGrouped[catId] = { assets: [], totalUtil: 0 };
      const u = getAssetUtilization(a.id, days);
      catGrouped[catId].assets.push(a);
      catGrouped[catId].totalUtil += u.utilizationPct;
    }

    const results: AssetComparison[] = [];
    for (const [, v] of Object.entries(catGrouped)) {
      if (v.assets.length < 2) continue;
      const categoryAvg = v.totalUtil / v.assets.length;
      const ranked = v.assets.map(a => {
        const u = getAssetUtilization(a.id, days);
        return { asset: a, utilization: u.utilizationPct };
      }).sort((a, b) => b.utilization - a.utilization);

      ranked.forEach((r, i) => {
        results.push({
          ...r,
          categoryAvg,
          variance: r.utilization - categoryAvg,
          rank: i + 1,
          totalInCategory: ranked.length,
          isBestPractice: i === 0 && r.utilization > categoryAvg * 1.2,
        });
      });
    }

    return results.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  };

  const getVarianceAnalysis = (days = 90) => {
    const comparisons = getAssetComparisons(days);
    const highVariance = comparisons.filter(c => Math.abs(c.variance) > 20);
    const bestPractices = comparisons.filter(c => c.isBestPractice);
    const underperformers = comparisons.filter(c => c.variance < -20);

    return { highVariance, bestPractices, underperformers, total: comparisons.length };
  };

  // ═══════════════════════════════════════
  // #9 SCHEDULING & AVAILABILITY (static analytics)
  // ═══════════════════════════════════════

  const getAvailabilityOverview = (days = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Assets with usage logs vs without
    const usedAssetIds = new Set(
      allLogs.filter(l => new Date(l.log_date) >= cutoff).map(l => l.asset_id)
    );

    const available = allAssets.filter(a => !usedAssetIds.has(a.id) && a.status === 'active');
    const inUse = allAssets.filter(a => usedAssetIds.has(a.id));
    const maintenance = allAssets.filter(a => a.status === 'maintenance');

    return { available: available.length, inUse: inUse.length, maintenance: maintenance.length, total: allAssets.length };
  };

  const getConflictDetection = (days = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = allLogs.filter(l => new Date(l.log_date) >= cutoff);

    // Same-day, same-asset, different-department usage
    const conflicts: { asset: Asset | undefined; date: string; departments: string[] }[] = [];
    const dayAssetMap: Record<string, Set<string>> = {};

    for (const l of recent) {
      const key = `${l.asset_id}|${l.log_date}`;
      if (!dayAssetMap[key]) dayAssetMap[key] = new Set();
      dayAssetMap[key].add(l.department || 'Unassigned');
    }

    for (const [key, depts] of Object.entries(dayAssetMap)) {
      if (depts.size > 1) {
        const [assetId, date] = key.split('|');
        conflicts.push({
          asset: allAssets.find(a => a.id === assetId),
          date,
          departments: Array.from(depts),
        });
      }
    }

    return conflicts.sort((a, b) => b.date.localeCompare(a.date));
  };

  // ═══════════════════════════════════════
  // #10 EXECUTIVE REPORTS
  // ═══════════════════════════════════════

  const getExecutiveSummary = (days = 30) => {
    const topUtilized = allAssets.map(a => {
      const u = getAssetUtilization(a.id, days);
      return { ...a, ...u };
    }).sort((a, b) => b.utilizationPct - a.utilizationPct);

    const top10 = topUtilized.slice(0, 10);
    const bottom10 = [...topUtilized].reverse().slice(0, 10);

    const totalValue = allAssets.reduce((s, a) => s + (a.current_value || 0), 0);
    const avgUtilization = topUtilized.length > 0
      ? topUtilized.reduce((s, a) => s + a.utilizationPct, 0) / topUtilized.length : 0;

    const anomalies = topUtilized.filter(a => {
      // Assets with sudden drop or spike
      const u90 = getAssetUtilization(a.id, 90);
      const u30 = getAssetUtilization(a.id, 30);
      const diff = Math.abs(u30.utilizationPct - u90.utilizationPct);
      return diff > 30;
    });

    return { top10, bottom10, totalValue, avgUtilization, anomalies, totalAssets: allAssets.length };
  };

  return {
    // Predictive
    getSeasonalAnalysis,
    getDemandForecasts,
    getUtilizationPrediction,
    // Cost-Benefit
    getAssetROI,
    getUtilizationVsMaintenanceCost,
    // Operator
    getOperatorMetrics,
    getSharingEfficiency,
    // Lifecycle
    getAgingAnalysis,
    getDeclineCurve,
    getReplacementRecommendations,
    // Comparative
    getAssetComparisons,
    getVarianceAnalysis,
    // Scheduling
    getAvailabilityOverview,
    getConflictDetection,
    // Executive
    getExecutiveSummary,
  };
}
