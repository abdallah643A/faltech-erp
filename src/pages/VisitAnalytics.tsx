import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { VisitAnalyticsCards } from '@/components/visits/VisitAnalyticsCards';
import { VisitMap } from '@/components/visits/VisitMap';
import { SalesRepPerformanceTable } from '@/components/visits/SalesRepPerformanceTable';
import { VisitTrendsChart } from '@/components/visits/VisitTrendsChart';
import { Skeleton } from '@/components/ui/skeleton';

interface Visit {
  id: string;
  sales_rep_id: string;
  business_partner_id: string | null;
  visit_date: string;
  latitude: number;
  longitude: number;
  address: string | null;
  visit_type: string;
  notes: string | null;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  created_at: string;
  business_partners?: {
    card_name: string;
    card_code: string;
  } | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

export default function VisitAnalytics() {
  const { t } = useLanguage();
  const { hasAnyRole } = useAuth();

  // Fetch all visits with business partner info
  const { data: visits, isLoading: visitsLoading } = useQuery({
    queryKey: ['visit-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          business_partners (card_name, card_code)
        `)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      return data as Visit[];
    },
    enabled: hasAnyRole(['admin', 'manager']),
  });

  // Fetch all profiles for sales rep names
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (error) throw error;
      return data as Profile[];
    },
    enabled: hasAnyRole(['admin', 'manager']),
  });

  // Create a map of user_id to profile
  const profileMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles?.forEach(p => {
      map[p.user_id] = p;
    });
    return map;
  }, [profiles]);

  // Enhance visits with profile info
  const visitsWithProfiles = useMemo(() => {
    return visits?.map(v => ({
      ...v,
      profiles: profileMap[v.sales_rep_id] || null,
    })) || [];
  }, [visits, profileMap]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!visits || visits.length === 0) {
      return {
        totalVisits: 0,
        totalSalesReps: 0,
        visitsThisMonth: 0,
        avgVisitsPerRep: 0,
        visitsTrend: 0,
        monthlyData: [],
        typeDistribution: [],
        salesRepPerformance: [],
        maxVisits: 0,
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Total visits
    const totalVisits = visits.length;

    // Unique sales reps
    const uniqueSalesReps = new Set(visits.map(v => v.sales_rep_id));
    const totalSalesReps = uniqueSalesReps.size;

    // Visits this month
    const visitsThisMonth = visits.filter(v => {
      const date = new Date(v.visit_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    // Visits last month
    const visitsLastMonth = visits.filter(v => {
      const date = new Date(v.visit_date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    // Trend calculation
    const visitsTrend = visitsLastMonth > 0 
      ? Math.round(((visitsThisMonth - visitsLastMonth) / visitsLastMonth) * 100)
      : visitsThisMonth > 0 ? 100 : 0;

    // Average visits per rep
    const avgVisitsPerRep = totalSalesReps > 0 ? totalVisits / totalSalesReps : 0;

    // Monthly data for chart (last 6 months)
    const monthlyData: { month: string; visits: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthVisits = visits.filter(v => {
        const vDate = new Date(v.visit_date);
        return vDate.getMonth() === date.getMonth() && vDate.getFullYear() === date.getFullYear();
      }).length;
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        visits: monthVisits,
      });
    }

    // Visit type distribution
    const typeCounts: Record<string, number> = {};
    visits.forEach(v => {
      typeCounts[v.visit_type] = (typeCounts[v.visit_type] || 0) + 1;
    });
    const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));

    // Sales rep performance
    const repData: Record<string, {
      totalVisits: number;
      completedVisits: number;
      thisMonthVisits: number;
      visitTypes: Record<string, number>;
      firstVisit: Date;
      lastVisit: Date;
    }> = {};

    visits.forEach(v => {
      if (!repData[v.sales_rep_id]) {
        repData[v.sales_rep_id] = {
          totalVisits: 0,
          completedVisits: 0,
          thisMonthVisits: 0,
          visitTypes: {},
          firstVisit: new Date(v.visit_date),
          lastVisit: new Date(v.visit_date),
        };
      }

      const rep = repData[v.sales_rep_id];
      rep.totalVisits++;
      if (v.status === 'completed') rep.completedVisits++;
      
      const vDate = new Date(v.visit_date);
      if (vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear) {
        rep.thisMonthVisits++;
      }

      rep.visitTypes[v.visit_type] = (rep.visitTypes[v.visit_type] || 0) + 1;

      if (vDate < rep.firstVisit) rep.firstVisit = vDate;
      if (vDate > rep.lastVisit) rep.lastVisit = vDate;
    });

    const salesRepPerformance = Object.entries(repData).map(([salesRepId, data]) => {
      const topType = Object.entries(data.visitTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'routine';
      const daysDiff = Math.max(1, Math.ceil((data.lastVisit.getTime() - data.firstVisit.getTime()) / (1000 * 60 * 60 * 24)));
      const avgPerDay = data.totalVisits / daysDiff;

      return {
        salesRepId,
        salesRepName: profileMap[salesRepId]?.full_name || 'Unknown',
        totalVisits: data.totalVisits,
        completedVisits: data.completedVisits,
        thisMonthVisits: data.thisMonthVisits,
        topVisitType: topType,
        avgPerDay,
      };
    }).sort((a, b) => b.totalVisits - a.totalVisits);

    const maxVisits = salesRepPerformance.length > 0 
      ? Math.max(...salesRepPerformance.map(r => r.totalVisits))
      : 0;

    return {
      totalVisits,
      totalSalesReps,
      visitsThisMonth,
      avgVisitsPerRep,
      visitsTrend,
      monthlyData,
      typeDistribution,
      salesRepPerformance,
      maxVisits,
    };
  }, [visits, profileMap]);

  const isLoading = visitsLoading;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('analytics.visitAnalytics') || 'Visit Analytics'}
        </h1>
        <p className="text-muted-foreground">
          {t('analytics.visitAnalyticsDesc') || 'Track and analyze sales rep visit performance'}
        </p>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <VisitAnalyticsCards
          totalVisits={analytics.totalVisits}
          totalSalesReps={analytics.totalSalesReps}
          visitsThisMonth={analytics.visitsThisMonth}
          avgVisitsPerRep={analytics.avgVisitsPerRep}
          visitsTrend={analytics.visitsTrend}
        />
      )}

      {/* Map View */}
      <VisitMap 
        visits={visitsWithProfiles} 
        isLoading={isLoading}
        height="450px"
      />

      {/* Charts */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
        </div>
      ) : (
        <VisitTrendsChart
          monthlyData={analytics.monthlyData}
          typeDistribution={analytics.typeDistribution}
        />
      )}

      {/* Sales Rep Performance Table */}
      {isLoading ? (
        <Skeleton className="h-[400px]" />
      ) : (
        <SalesRepPerformanceTable
          data={analytics.salesRepPerformance}
          maxVisits={analytics.maxVisits}
        />
      )}
    </div>
  );
}
