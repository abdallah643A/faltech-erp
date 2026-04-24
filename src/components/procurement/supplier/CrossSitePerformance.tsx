import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { useDeliveryVerifications, useSupplierIssues, useSupplierSites } from '@/hooks/useSupplierManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

export function CrossSitePerformance() {
  const { verifications } = useDeliveryVerifications();
  const { issues } = useSupplierIssues();
  const { supplierSites } = useSupplierSites();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list-perf'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name');
      return data || [];
    },
  });

  // Build vendor-by-site performance matrix
  const vendorSiteMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, {
      deliveries: number; onTime: number; avgRating: number; ratings: number[];
      issueCount: number; criticalIssues: number;
    }>> = {};

    // From verifications
    verifications.forEach((v: any) => {
      const vendor = v.vendor_name || 'Unknown';
      const projectId = v.project_id || 'unassigned';
      if (!matrix[vendor]) matrix[vendor] = {};
      if (!matrix[vendor][projectId]) matrix[vendor][projectId] = { deliveries: 0, onTime: 0, avgRating: 0, ratings: [], issueCount: 0, criticalIssues: 0 };
      matrix[vendor][projectId].deliveries++;
      if (v.delivery_on_time) matrix[vendor][projectId].onTime++;
      if (v.supplier_rating) matrix[vendor][projectId].ratings.push(v.supplier_rating);
    });

    // From issues
    issues.forEach((i: any) => {
      const vendor = i.vendor_name || 'Unknown';
      const projectId = i.project_id || 'unassigned';
      if (!matrix[vendor]) matrix[vendor] = {};
      if (!matrix[vendor][projectId]) matrix[vendor][projectId] = { deliveries: 0, onTime: 0, avgRating: 0, ratings: [], issueCount: 0, criticalIssues: 0 };
      matrix[vendor][projectId].issueCount++;
      if (i.severity === 'critical') matrix[vendor][projectId].criticalIssues++;
    });

    // Calculate averages
    Object.values(matrix).forEach(sites => {
      Object.values(sites).forEach(data => {
        data.avgRating = data.ratings.length > 0
          ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0;
      });
    });

    return matrix;
  }, [verifications, issues]);

  // Aggregate per vendor
  const vendorSummaries = useMemo(() => {
    return Object.entries(vendorSiteMatrix).map(([vendor, sites]) => {
      const siteCount = Object.keys(sites).length;
      const totalDeliveries = Object.values(sites).reduce((s, d) => s + d.deliveries, 0);
      const totalOnTime = Object.values(sites).reduce((s, d) => s + d.onTime, 0);
      const totalIssues = Object.values(sites).reduce((s, d) => s + d.issueCount, 0);
      const allRatings = Object.values(sites).flatMap(d => d.ratings);
      const avgRating = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
      const onTimeRate = totalDeliveries > 0 ? (totalOnTime / totalDeliveries) * 100 : 0;

      // Performance variance across sites
      const siteRatings = Object.values(sites).map(d => d.avgRating).filter(r => r > 0);
      const ratingVariance = siteRatings.length > 1
        ? Math.max(...siteRatings) - Math.min(...siteRatings) : 0;

      const overallScore = Math.round(
        (onTimeRate * 0.4) + (Math.min(avgRating * 20, 100) * 0.3) + (Math.max(100 - totalIssues * 10, 0) * 0.3)
      );
      const grade = overallScore >= 85 ? 'A+' : overallScore >= 75 ? 'A' : overallScore >= 65 ? 'B' : overallScore >= 50 ? 'C' : 'D';

      return {
        vendor, siteCount, totalDeliveries, totalOnTime, onTimeRate,
        totalIssues, avgRating, ratingVariance, overallScore, grade,
        sites,
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [vendorSiteMatrix]);

  // Radar chart data for top vendors
  const radarData = useMemo(() => {
    const topVendors = vendorSummaries.slice(0, 5);
    const metrics = ['Delivery', 'Quality', 'Reliability', 'Issue-Free'];
    return metrics.map(metric => {
      const point: any = { metric };
      topVendors.forEach(v => {
        point[v.vendor] = metric === 'Delivery' ? v.onTimeRate
          : metric === 'Quality' ? v.avgRating * 20
          : metric === 'Reliability' ? Math.min(v.totalDeliveries * 10, 100)
          : Math.max(100 - v.totalIssues * 15, 0);
      });
      return point;
    });
  }, [vendorSummaries]);

  const gradeColors: Record<string, string> = {
    'A+': 'bg-green-100 text-green-800', 'A': 'bg-green-50 text-green-700',
    'B': 'bg-blue-100 text-blue-800', 'C': 'bg-amber-100 text-amber-800', 'D': 'bg-red-100 text-red-800',
  };

  // Bar chart: issues per vendor
  const issueBarData = vendorSummaries.slice(0, 10).map(v => ({
    name: v.vendor.length > 15 ? v.vendor.slice(0, 15) + '...' : v.vendor,
    issues: v.totalIssues,
    deliveries: v.totalDeliveries,
  }));

  // Alerts: vendors with high variance
  const varianceAlerts = vendorSummaries.filter(v => v.ratingVariance > 1.5 && v.siteCount > 1);

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {varianceAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Performance Variance Alerts</span>
            </div>
            {varianceAlerts.map(v => (
              <p key={v.vendor} className="text-xs text-amber-700 ml-6">
                <strong>{v.vendor}</strong> shows {v.ratingVariance.toFixed(1)}-star variance across {v.siteCount} sites — investigate site-specific issues
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 5 Supplier Comparison</CardTitle></CardHeader>
          <CardContent>
            {vendorSummaries.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  {vendorSummaries.slice(0, 5).map((v, i) => (
                    <Radar key={v.vendor} name={v.vendor} dataKey={v.vendor}
                      stroke={['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'][i]}
                      fill={['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'][i]}
                      fillOpacity={0.15} />
                  ))}
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>}
          </CardContent>
        </Card>

        {/* Issues bar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Issues vs Deliveries by Vendor</CardTitle></CardHeader>
          <CardContent>
            {issueBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={issueBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="deliveries" fill="hsl(var(--primary))" name="Deliveries" />
                  <Bar dataKey="issues" fill="hsl(var(--destructive))" name="Issues" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8 text-muted-foreground text-sm">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Vendor Ranking Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cross-Site Vendor Ranking</CardTitle></CardHeader>
        <CardContent>
          {vendorSummaries.length === 0 ? <p className="text-center py-4 text-muted-foreground text-sm">No performance data yet. Start by verifying deliveries.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Sites</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead>On-Time %</TableHead>
                    <TableHead>Avg Rating</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorSummaries.map((v, i) => (
                    <TableRow key={v.vendor}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{v.vendor}</TableCell>
                      <TableCell>{v.siteCount}</TableCell>
                      <TableCell>{v.totalDeliveries}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {v.onTimeRate >= 80 ? <TrendingUp className="h-3 w-3 text-green-600" /> :
                           v.onTimeRate >= 60 ? <Minus className="h-3 w-3 text-amber-600" /> :
                           <TrendingDown className="h-3 w-3 text-red-600" />}
                          <span className="text-sm">{v.onTimeRate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Star className={`h-3 w-3 ${v.avgRating >= 3 ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                          <span className="text-sm">{v.avgRating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={v.totalIssues > 3 ? 'text-destructive font-medium' : ''}>{v.totalIssues}</span>
                      </TableCell>
                      <TableCell>
                        {v.ratingVariance > 1.5 ? (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                            {v.ratingVariance.toFixed(1)}★ gap
                          </Badge>
                        ) : v.siteCount > 1 ? (
                          <span className="text-xs text-green-600">Consistent</span>
                        ) : <span className="text-xs text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="font-bold">{v.overallScore}</TableCell>
                      <TableCell><Badge className={gradeColors[v.grade] || ''}>{v.grade}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
