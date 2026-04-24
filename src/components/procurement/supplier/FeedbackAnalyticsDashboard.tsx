import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, Star, AlertTriangle, Award, RefreshCw, Calendar } from 'lucide-react';
import { useSupplierFeedback } from '@/hooks/useSupplierFeedback';
import { useMonthlyScoreCards } from '@/hooks/useSupplierFeedback';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const gradeColors: Record<string, string> = {
  'A+': 'bg-green-100 text-green-800', 'A': 'bg-green-50 text-green-700',
  'B': 'bg-blue-100 text-blue-800', 'C': 'bg-amber-100 text-amber-800',
  'D': 'bg-orange-100 text-orange-800', 'F': 'bg-red-100 text-red-800',
};

const trendIcons: Record<string, any> = {
  improving: TrendingUp, declining: TrendingDown, stable: Minus,
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function FeedbackAnalyticsDashboard() {
  const { feedbacks } = useSupplierFeedback();
  const { scorecards, isLoading, generateScorecard } = useMonthlyScoreCards();
  const now = new Date();
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genYear, setGenYear] = useState(now.getFullYear());

  // Vendor performance trends (last 6 months)
  const trendData = useMemo(() => {
    const months: { month: string; avg: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mFbs = feedbacks.filter(f => {
        const fd = new Date(f.feedback_date);
        return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
      });
      months.push({
        month: MONTHS[d.getMonth()],
        avg: mFbs.length > 0 ? Math.round(mFbs.reduce((s, f) => s + (f.overall_score || 0), 0) / mFbs.length) : 0,
      });
    }
    return months;
  }, [feedbacks]);

  // Issue patterns
  const issuePatterns = useMemo(() => {
    const patterns: Record<string, number> = {};
    feedbacks.forEach(f => {
      if (f.quality_issue_type && f.quality_issue_type !== 'none') {
        patterns[f.quality_issue_type] = (patterns[f.quality_issue_type] || 0) + 1;
      }
    });
    return Object.entries(patterns).map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count);
  }, [feedbacks]);

  // Cross-site comparison
  const crossSiteData = useMemo(() => {
    const vendorSites: Record<string, { sites: Record<string, number[]> }> = {};
    feedbacks.forEach(f => {
      const v = f.vendor_name;
      const s = f.site_name || 'Unknown';
      if (!vendorSites[v]) vendorSites[v] = { sites: {} };
      if (!vendorSites[v].sites[s]) vendorSites[v].sites[s] = [];
      vendorSites[v].sites[s].push(f.overall_score || 0);
    });

    return Object.entries(vendorSites)
      .filter(([, d]) => Object.keys(d.sites).length > 1)
      .map(([vendor, d]) => {
        const siteAvgs = Object.entries(d.sites).map(([site, scores]) => ({
          site,
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          count: scores.length,
        }));
        const maxDiff = siteAvgs.length > 1
          ? Math.max(...siteAvgs.map(s => s.avg)) - Math.min(...siteAvgs.map(s => s.avg))
          : 0;
        return { vendor, sites: siteAvgs, maxDiff };
      })
      .sort((a, b) => b.maxDiff - a.maxDiff);
  }, [feedbacks]);

  // Top/bottom vendors radar
  const radarData = useMemo(() => {
    const vendorAvgs: Record<string, { delivery: number[]; quality: number[]; prof: number[] }> = {};
    feedbacks.forEach(f => {
      if (!vendorAvgs[f.vendor_name]) vendorAvgs[f.vendor_name] = { delivery: [], quality: [], prof: [] };
      vendorAvgs[f.vendor_name].delivery.push((f.delivery_on_time_score + f.delivery_quantity_score + f.delivery_condition_score) / 3);
      vendorAvgs[f.vendor_name].quality.push((f.quality_spec_compliance_score + f.quality_defect_score + f.quality_packaging_score) / 3);
      vendorAvgs[f.vendor_name].prof.push((f.prof_communication_score + f.prof_behavior_score + f.prof_responsiveness_score) / 3);
    });

    const sorted = Object.entries(vendorAvgs).map(([v, d]) => ({
      vendor: v,
      delivery: d.delivery.reduce((a, b) => a + b, 0) / d.delivery.length,
      quality: d.quality.reduce((a, b) => a + b, 0) / d.quality.length,
      prof: d.prof.reduce((a, b) => a + b, 0) / d.prof.length,
    })).sort((a, b) => (b.delivery + b.quality + b.prof) - (a.delivery + a.quality + a.prof));

    const top5 = sorted.slice(0, 5);
    return ['Delivery', 'Quality', 'Professionalism'].map(metric => {
      const point: any = { metric };
      top5.forEach(v => {
        point[v.vendor] = Math.round((metric === 'Delivery' ? v.delivery : metric === 'Quality' ? v.quality : v.prof) * 20);
      });
      return point;
    });
  }, [feedbacks]);

  const topVendorNames = useMemo(() => {
    const vendorScores: Record<string, number[]> = {};
    feedbacks.forEach(f => {
      if (!vendorScores[f.vendor_name]) vendorScores[f.vendor_name] = [];
      vendorScores[f.vendor_name].push(f.overall_score || 0);
    });
    return Object.entries(vendorScores)
      .map(([v, scores]) => ({ v, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(x => x.v);
  }, [feedbacks]);

  // Critical alerts
  const criticalAlerts = feedbacks.filter(f => (f.is_critical || f.is_safety_related) && f.escalation_status !== 'resolved');

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">{criticalAlerts.length} Active Critical/Safety Alerts</span>
            </div>
            {criticalAlerts.slice(0, 5).map(f => (
              <p key={f.id} className="text-xs text-muted-foreground ml-6">
                <strong>{f.vendor_name}</strong> — Score {f.overall_score}/100
                {f.is_safety_related && ' ⚠️ SAFETY'}
                {f.quality_notes && ` — ${f.quality_notes.slice(0, 60)}...`}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Performance Trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Performance Trend (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Avg Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Comparison */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 5 Vendor Comparison</CardTitle></CardHeader>
          <CardContent>
            {radarData.length > 0 && topVendorNames.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  {topVendorNames.map((v, i) => (
                    <Radar key={v} name={v} dataKey={v}
                      stroke={['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'][i]}
                      fill={['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'][i]}
                      fillOpacity={0.1} />
                  ))}
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8 text-muted-foreground text-sm">Submit feedback to see comparisons</p>}
          </CardContent>
        </Card>

        {/* Issue Patterns */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recurring Issue Patterns</CardTitle></CardHeader>
          <CardContent>
            {issuePatterns.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={issuePatterns} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" name="Occurrences" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8 text-muted-foreground text-sm">No quality issues reported yet</p>}
          </CardContent>
        </Card>

        {/* Cross-Site Variance */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cross-Site Performance Gaps</CardTitle></CardHeader>
          <CardContent>
            {crossSiteData.length > 0 ? (
              <div className="space-y-3">
                {crossSiteData.slice(0, 5).map(v => (
                  <div key={v.vendor} className="border rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{v.vendor}</span>
                      <Badge variant="outline" className={`text-xs ${v.maxDiff > 20 ? 'border-destructive text-destructive' : 'border-amber-500 text-amber-600'}`}>
                        {v.maxDiff} pts gap
                      </Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {v.sites.map(s => (
                        <span key={s.site} className="text-xs bg-muted rounded px-2 py-0.5">
                          {s.site}: <strong>{s.avg}</strong> ({s.count})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center py-8 text-muted-foreground text-sm">Need multi-site feedback to compare</p>}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Scorecards */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" /> Monthly Scorecards</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={String(genMonth)} onValueChange={v => setGenMonth(+v)}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(genYear)} onValueChange={v => setGenYear(+v)}>
                <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => generateScorecard.mutate({ month: genMonth, year: genYear })}
                disabled={generateScorecard.isPending}>
                <RefreshCw className={`h-3 w-3 mr-1 ${generateScorecard.isPending ? 'animate-spin' : ''}`} /> Generate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scorecards.length === 0 ? <p className="text-center py-4 text-muted-foreground text-sm">No scorecards yet. Generate one above.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Prof.</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Feedbacks</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorecards.map(sc => {
                    const TrendIcon = trendIcons[sc.trend] || Minus;
                    return (
                      <TableRow key={sc.id}>
                        <TableCell className="text-xs">{MONTHS[sc.period_month - 1]} {sc.period_year}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {sc.is_top_performer && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                            <span className="text-sm font-medium">{sc.vendor_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{sc.delivery_score}</TableCell>
                        <TableCell className="text-sm">{sc.quality_score}</TableCell>
                        <TableCell className="text-sm">{sc.professionalism_score}</TableCell>
                        <TableCell className="font-bold text-sm">{sc.overall_score}</TableCell>
                        <TableCell><Badge className={gradeColors[sc.grade] || ''} variant="secondary">{sc.grade}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendIcon className={`h-3 w-3 ${sc.trend === 'improving' ? 'text-green-600' : sc.trend === 'declining' ? 'text-red-600' : 'text-muted-foreground'}`} />
                            {sc.score_change_from_prev !== 0 && (
                              <span className={`text-xs ${sc.score_change_from_prev > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {sc.score_change_from_prev > 0 ? '+' : ''}{sc.score_change_from_prev}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{sc.total_feedbacks}</TableCell>
                        <TableCell>
                          {(sc.critical_issues > 0 || sc.safety_issues > 0) ? (
                            <span className="text-xs text-destructive">{sc.critical_issues}C / {sc.safety_issues}S</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
