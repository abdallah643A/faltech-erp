import { useTMOPortfolio } from '@/hooks/useTMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cpu, Map, Shield, Users, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Clock, Activity, RefreshCw, CheckCircle2, XCircle,
  Download, FileSpreadsheet
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line
} from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { TMOFilterPanel, EMPTY_FILTERS, type TMOFilters } from '@/components/tmo/TMOFilterPanel';
import { TMOAlertSystem } from '@/components/tmo/TMOAlertSystem';
import { TMOChartDrillDown } from '@/components/tmo/TMOChartDrillDown';
import { TMODashboardCustomizer } from '@/components/tmo/TMODashboardCustomizer';
import { useTMODashboardPrefs } from '@/hooks/useTMODashboardPrefs';
import { useLanguage } from '@/contexts/LanguageContext';

const LIFECYCLE_COLORS: Record<string, string> = {
  active: '#10b981', supported: '#3b82f6', end_of_life: '#f59e0b',
  decommissioned: '#6b7280', pilot: '#8b5cf6',
};

const REFRESH_INTERVAL = 5 * 60 * 1000;

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-2.5 text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TMOExecutiveDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    techAssets, techAssetsLoading,
    roadmapItems, roadmapLoading,
    decisions, decisionsLoading,
    standards, standardsLoading,
    vendors, vendorsLoading,
  } = useTMOPortfolio();

  const dashPrefs = useTMODashboardPrefs();
  const [filters, setFilters] = useState<TMOFilters>(EMPTY_FILTERS);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [drillDown, setDrillDown] = useState<{ title: string; data: any[]; columns: any[] } | null>(null);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tmo-tech-assets'] }),
        queryClient.invalidateQueries({ queryKey: ['tmo-roadmap'] }),
        queryClient.invalidateQueries({ queryKey: ['tmo-decisions'] }),
        queryClient.invalidateQueries({ queryKey: ['tmo-standards'] }),
        queryClient.invalidateQueries({ queryKey: ['tmo-vendors'] }),
      ]);
      setLastRefresh(new Date());
    } catch {
      setRefreshError('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    const interval = setInterval(handleManualRefresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [handleManualRefresh]);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Apply filters
  const filteredAssets = useMemo(() => {
    let result = techAssets;
    if (filters.category !== 'all') result = result.filter(a => a.category === filters.category);
    if (filters.lifecycleStatus !== 'all') result = result.filter(a => a.lifecycle_status === filters.lifecycleStatus);
    if (filters.vendor !== 'all') result = result.filter(a => a.vendor === filters.vendor);
    if (filters.businessUnit !== 'all') result = result.filter(a => a.owner_department === filters.businessUnit);
    if (filters.costMin) result = result.filter(a => a.total_cost_of_ownership >= parseFloat(filters.costMin) * 1000);
    if (filters.costMax) result = result.filter(a => a.total_cost_of_ownership <= parseFloat(filters.costMax) * 1000);
    return result;
  }, [techAssets, filters]);

  const filteredDecisions = useMemo(() => {
    if (filters.complianceStatus === 'all') return decisions;
    return decisions.filter(d => {
      if (filters.complianceStatus === 'high') return d.compliance_score >= 80;
      if (filters.complianceStatus === 'medium') return d.compliance_score >= 50 && d.compliance_score < 80;
      return d.compliance_score < 50;
    });
  }, [decisions, filters]);

  // KPIs
  const activeAssets = filteredAssets.filter(a => a.lifecycle_status === 'active').length;
  const eolAssets = filteredAssets.filter(a => a.lifecycle_status === 'end_of_life').length;
  const avgHealth = filteredAssets.length > 0 ? (filteredAssets.reduce((s, a) => s + (a.health_score || 0), 0) / filteredAssets.length) : 0;
  const totalTCO = filteredAssets.reduce((s, a) => s + (a.total_cost_of_ownership || 0), 0);
  const totalAnnualLicense = filteredAssets.reduce((s, a) => s + (a.annual_license_cost || 0), 0);
  const strategicVendors = vendors.filter(v => v.tier === 'strategic').length;
  const acceptedDecisions = filteredDecisions.filter(d => d.status === 'accepted').length;
  const avgCompliance = filteredDecisions.length > 0 ? Math.round(filteredDecisions.reduce((s, d) => s + (d.compliance_score || 0), 0) / filteredDecisions.length) : 0;
  const roadmapInProgress = roadmapItems.filter(r => r.status === 'in_progress').length;

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);
  const expiringContracts = vendors.filter(v => v.contract_end_date && new Date(v.contract_end_date) <= thirtyDays && new Date(v.contract_end_date) >= now).length;

  // Chart data
  const lifecycleData = Object.entries(
    filteredAssets.reduce((acc, a) => { acc[a.lifecycle_status] = (acc[a.lifecycle_status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: LIFECYCLE_COLORS[name] || '#6b7280' }));

  const categorySpend = Object.entries(
    filteredAssets.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + (a.total_cost_of_ownership || 0); return acc; }, {} as Record<string, number>)
  ).map(([category, tco]) => ({ category, tco: Math.round(tco / 1000) })).sort((a, b) => b.tco - a.tco);

  const vendorScoreData = vendors.filter(v => v.tier === 'strategic').slice(0, 6).map(v => ({
    name: v.name.length > 12 ? v.name.slice(0, 12) + '…' : v.name,
    fullName: v.name,
    delivery: v.delivery_score, quality: v.quality_score,
    innovation: v.innovation_score, responsiveness: v.responsiveness_score,
    overall: v.overall_score,
  }));

  const horizonData = [
    { horizon: '1-Year', count: roadmapItems.filter(r => r.horizon === '1_year').length },
    { horizon: '3-Year', count: roadmapItems.filter(r => r.horizon === '3_year').length },
    { horizon: '5-Year', count: roadmapItems.filter(r => r.horizon === '5_year').length },
  ];

  // Mini sparkline data (simulated 30-day trend)
  const generateSparkline = (base: number, variance: number) =>
    Array.from({ length: 7 }, (_, i) => ({ v: Math.max(0, base + (Math.random() - 0.5) * variance * 2) }));

  // Threshold helpers
  const healthStatus = avgHealth >= 4 ? 'green' : avgHealth >= 3 ? 'yellow' : 'red';
  const complianceStatus = avgCompliance >= 80 ? 'green' : avgCompliance >= 50 ? 'yellow' : 'red';

  // Extract unique values for filters
  const categories = [...new Set(techAssets.map(a => a.category))].sort();
  const vendorNames = [...new Set(techAssets.map(a => a.vendor).filter(Boolean) as string[])].sort();
  const departments = [...new Set(techAssets.map(a => a.owner_department).filter(Boolean) as string[])].sort();

  // Export all data as CSV
  const exportDashboardCSV = () => {
  const { t } = useLanguage();

    const rows = filteredAssets.map(a => `"${a.name}","${a.category}","${a.lifecycle_status}",${a.health_score},${a.total_cost_of_ownership},"${a.vendor || ''}"`);
    const csv = 'Name,Category,Lifecycle,Health,TCO,Vendor\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tmo_dashboard_export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Drill-down handlers
  const drillLifecycle = (status: string) => {
    const data = filteredAssets.filter(a => a.lifecycle_status === status);
    setDrillDown({
      title: `Assets: ${status}`,
      data,
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'health_score', label: 'Health', format: (v: number) => `${v}/5` },
        { key: 'total_cost_of_ownership', label: 'TCO', format: (v: number) => `${(v / 1000).toFixed(1)}K` },
      ],
    });
  };

  const drillCategory = (category: string) => {
    const data = filteredAssets.filter(a => a.category === category);
    setDrillDown({
      title: `TCO: ${category}`,
      data,
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'lifecycle_status', label: 'Status' },
        { key: 'annual_license_cost', label: 'License/yr', format: (v: number) => `${(v / 1000).toFixed(1)}K` },
        { key: 'annual_support_cost', label: 'Support/yr', format: (v: number) => `${(v / 1000).toFixed(1)}K` },
        { key: 'total_cost_of_ownership', label: 'Total TCO', format: (v: number) => `${(v / 1000).toFixed(1)}K` },
      ],
    });
  };

  const drillHorizon = (horizon: string) => {
    const hMap: Record<string, string> = { '1-Year': '1_year', '3-Year': '3_year', '5-Year': '5_year' };
    const data = roadmapItems.filter(r => r.horizon === hMap[horizon]);
    setDrillDown({
      title: `Roadmap: ${horizon}`,
      data,
      columns: [
        { key: 'title', label: 'Title' },
        { key: 'domain', label: 'Domain' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'budget', label: 'Budget', format: (v: number) => `${(v / 1000).toFixed(1)}K` },
        { key: 'start_date', label: 'Start' },
        { key: 'end_date', label: 'End' },
      ],
    });
  };

  // Widget renderer
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'kpi-tiles':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPITile label="Tech Assets" value={filteredAssets.length} sub={`${activeAssets} active`} icon={Cpu} loading={techAssetsLoading} onClick={() => navigate('/tmo')} sparkData={generateSparkline(filteredAssets.length, 3)} />
            <KPITile label="Avg Health" value={avgHealth.toFixed(1)} sub="/5" icon={Activity} trend={avgHealth >= 3.5 ? 'up' : 'down'} loading={techAssetsLoading} status={healthStatus} sparkData={generateSparkline(avgHealth, 0.5)} />
            <KPITile label="Total TCO" value={`${(totalTCO / 1000).toFixed(0)}K`} icon={DollarSign} loading={techAssetsLoading} sparkData={generateSparkline(totalTCO / 1000, 20)} />
            <KPITile label="EOL Assets" value={eolAssets} icon={AlertTriangle} variant={eolAssets > 0 ? 'danger' : undefined} loading={techAssetsLoading} status={eolAssets > 0 ? 'red' : 'green'} />
            <KPITile label="Roadmap" value={roadmapItems.length} sub={`${roadmapInProgress} active`} icon={Map} loading={roadmapLoading} sparkData={generateSparkline(roadmapItems.length, 2)} />
            <KPITile label="Vendors" value={vendors.length} sub={`${strategicVendors} strategic`} icon={Users} loading={vendorsLoading} />
            <KPITile label="Compliance" value={`${avgCompliance}%`} icon={Shield} loading={decisionsLoading} status={complianceStatus} sparkData={generateSparkline(avgCompliance, 10)} />
            <KPITile label="Expiring" value={expiringContracts} sub="30 days" icon={Clock} variant={expiringContracts > 0 ? 'danger' : undefined} loading={vendorsLoading} status={expiringContracts > 0 ? 'red' : 'green'} />
          </div>
        );

      case 'alerts':
        return <TMOAlertSystem techAssets={filteredAssets} roadmapItems={roadmapItems} decisions={filteredDecisions} vendors={vendors} />;

      case 'lifecycle-chart':
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Asset Lifecycle</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => drillLifecycle('active')}>
                  <FileSpreadsheet className="h-3 w-3 mr-0.5" />Drill
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {techAssetsLoading ? <Skeleton className="h-[180px] w-full" /> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={lifecycleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}
                        onClick={(d) => drillLifecycle(d.name)} className="cursor-pointer">
                        {lifecycleData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {lifecycleData.map(d => (
                      <button key={d.name} className="flex items-center gap-1 text-xs hover:underline cursor-pointer" onClick={() => drillLifecycle(d.name)}>
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}: {d.value}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );

      case 'tco-chart':
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">TCO by Category (K)</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => categorySpend[0] && drillCategory(categorySpend[0].category)}>
                  <FileSpreadsheet className="h-3 w-3 mr-0.5" />Drill
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {techAssetsLoading ? <Skeleton className="h-[200px] w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categorySpend} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 10 }} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="tco" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}
                      onClick={(d: any) => drillCategory(d.category)} className="cursor-pointer" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        );

      case 'horizon-chart':
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Roadmap by Horizon</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => drillHorizon('1-Year')}>
                  <FileSpreadsheet className="h-3 w-3 mr-0.5" />Drill
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {roadmapLoading ? <Skeleton className="h-[200px] w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={horizonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="horizon" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}
                      onClick={(d: any) => drillHorizon(d.horizon)} className="cursor-pointer" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        );

      case 'vendor-radar':
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Strategic Vendor Scores</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                  const stVendors = vendors.filter(v => v.tier === 'strategic');
                  setDrillDown({
                    title: 'Strategic Vendors',
                    data: stVendors,
                    columns: [
                      { key: 'name', label: 'Vendor' },
                      { key: 'delivery_score', label: 'Delivery' },
                      { key: 'quality_score', label: 'Quality' },
                      { key: 'innovation_score', label: 'Innovation' },
                      { key: 'responsiveness_score', label: 'Responsive' },
                      { key: 'overall_score', label: 'Overall' },
                      { key: 'contract_value', label: 'Contract', format: (v: number) => `${(v / 1000).toFixed(0)}K` },
                    ],
                  });
                }}>
                  <FileSpreadsheet className="h-3 w-3 mr-0.5" />Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? <Skeleton className="h-[250px] w-full" /> : vendorScoreData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={vendorScoreData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9 }} />
                    <Radar name="Delivery" dataKey="delivery" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                    <Radar name="Quality" dataKey="quality" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.15} />
                    <Radar name="Innovation" dataKey="innovation" stroke="hsl(var(--chart-3, 280 65% 60%))" fill="hsl(var(--chart-3, 280 65% 60%))" fillOpacity={0.1} />
                    <RechartsTooltip content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No strategic vendors defined</div>
              )}
            </CardContent>
          </Card>
        );

      case 'governance':
        return (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Architecture Governance Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(decisionsLoading || standardsLoading) ? (
                <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Standards</p>
                      <p className="text-xl font-bold">{standards.length}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">ADR Decisions</p>
                      <p className="text-xl font-bold">{filteredDecisions.length}</p>
                      <p className="text-xs text-muted-foreground">{acceptedDecisions} accepted</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Avg Compliance</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">{avgCompliance}%</p>
                        <StatusDot status={complianceStatus} />
                      </div>
                      <Progress value={avgCompliance} className="h-1.5 mt-1" />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Annual Licensing</p>
                      <p className="text-xl font-bold">{(totalAnnualLicense / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                  {expiringContracts > 0 && (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">{expiringContracts} vendor contract(s) expiring within 30 days</span>
                      </div>
                    </div>
                  )}
                  {eolAssets > 0 && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600">{eolAssets} asset(s) at End-of-Life status</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const orderedWidgets = dashPrefs.widgets.filter(w => w.visible);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TMO Executive Dashboard</h1>
          <p className="text-muted-foreground text-sm">Technology investment governance & portfolio insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            {refreshError ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            <span>Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportDashboardCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <TMODashboardCustomizer {...dashPrefs} />
          <Button variant="outline" size="sm" onClick={() => navigate('/tmo')}>
            <Cpu className="h-4 w-4 mr-1" /> Full TMO
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {refreshError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
          <XCircle className="h-4 w-4" /> {refreshError}
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-destructive" onClick={handleManualRefresh}>Retry</Button>
        </div>
      )}

      {/* Filters */}
      <TMOFilterPanel filters={filters} onFiltersChange={setFilters} categories={categories} vendors={vendorNames} departments={departments} />

      {/* Dynamic widget rendering */}
      {orderedWidgets.map(w => {
        if (w.size === 'full') {
          return <div key={w.id}>{renderWidget(w.id)}</div>;
        }
        return null;
      })}

      {/* Charts in grid layout */}
      {(() => {
        const chartWidgets = orderedWidgets.filter(w => w.size === 'chart');
        const rows: JSX.Element[] = [];
        for (let i = 0; i < chartWidgets.length; i += 3) {
          const chunk = chartWidgets.slice(i, i + 3);
          const colClass = chunk.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
          rows.push(
            <div key={i} className={`grid ${colClass} gap-4`}>
              {chunk.map(w => <div key={w.id}>{renderWidget(w.id)}</div>)}
            </div>
          );
        }
        return rows;
      })()}

      {/* Drill-down modal */}
      {drillDown && (
        <TMOChartDrillDown open={!!drillDown} onClose={() => setDrillDown(null)} title={drillDown.title} data={drillDown.data} columns={drillDown.columns} />
      )}
    </div>
  );
}

// Status indicator dot
function StatusDot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const colors = { green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-destructive' };
  return <div className={`h-2.5 w-2.5 rounded-full ${colors[status]} animate-pulse`} />;
}

// Enhanced KPI Tile with sparkline, status, click
function KPITile({ label, value, sub, icon: Icon, trend, variant, loading, onClick, sparkData, status }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType;
  trend?: 'up' | 'down'; variant?: 'danger'; loading?: boolean;
  onClick?: () => void; sparkData?: { v: number }[]; status?: 'green' | 'yellow' | 'red';
}) {
  if (loading) {
    return (
      <Card><CardContent className="pt-3 pb-2 px-3 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-12" /></CardContent></Card>
    );
  }
  return (
    <Card className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <CardContent className="pt-3 pb-2 px-3">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${variant === 'danger' ? 'text-destructive' : 'text-primary'}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
          {status && <StatusDot status={status} />}
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-xl font-bold">{value}</p>
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          {trend && (trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />)}
        </div>
        {sparkData && (
          <div className="mt-1 h-[20px]">
            <ResponsiveContainer width="100%" height={20}>
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
