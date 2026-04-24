import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Star, TrendingUp, AlertTriangle, Clock, CheckCircle, Award, BarChart3 } from 'lucide-react';
import { useVendorPerformance, useVendorAcknowledgments } from '@/hooks/useVendorAnalytics';
import { usePurchaseOrders } from '@/hooks/useProcurement';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getRiskBadge(score: number) {
  if (score >= 80) return <Badge variant="default" className="bg-green-600">Low Risk</Badge>;
  if (score >= 60) return <Badge variant="secondary" className="bg-yellow-500 text-black">Medium Risk</Badge>;
  return <Badge variant="destructive">High Risk</Badge>;
}

export default function VendorManagementPage() {
  const { t } = useLanguage();
  const { vendors, isLoading, recalculate } = useVendorPerformance();
  const { acknowledgments } = useVendorAcknowledgments();
  const { purchaseOrders } = usePurchaseOrders();
  const [ackDialog, setAckDialog] = useState<any>(null);
  const [promisedDate, setPromisedDate] = useState('');
  const [ackNotes, setAckNotes] = useState('');

  const topVendors = [...(vendors || [])].sort((a, b) => b.reliability_score - a.reliability_score).slice(0, 10);
  const avgReliability = vendors.length > 0 ? vendors.reduce((s, v) => s + (v.reliability_score || 0), 0) / vendors.length : 0;
  const totalSpend = vendors.reduce((s, v) => s + (v.total_spend || 0), 0);
  const atRiskVendors = vendors.filter(v => v.reliability_score < 60).length;

  const chartData = topVendors.map(v => ({
    name: v.vendor_name?.length > 15 ? v.vendor_name.substring(0, 15) + '...' : v.vendor_name,
    score: v.reliability_score || 0,
    orders: v.total_orders || 0,
  }));

  // Lead time analysis
  const leadTimeData = topVendors.filter(v => v.avg_lead_time_days > 0).map(v => ({
    name: v.vendor_name?.length > 12 ? v.vendor_name.substring(0, 12) + '...' : v.vendor_name,
    actual: v.avg_lead_time_days,
    promised: v.promised_lead_time_days || 0,
  }));

  // Pending POs for acknowledgment
  const pendingPOs = (purchaseOrders || []).filter(po =>
    ['draft', 'approved'].includes(po.status) &&
    !(acknowledgments || []).some(a => a.purchase_order_id === po.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Management</h1>
          <p className="text-muted-foreground">Lead-time analytics & vendor reliability scoring</p>
        </div>
        <Button onClick={() => recalculate.mutate()} disabled={recalculate.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} /> Recalculate Scores
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Active Vendors</div>
          <div className="text-2xl font-bold">{vendors.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Avg Reliability</div>
          <div className={`text-2xl font-bold ${getScoreColor(avgReliability)}`}>{avgReliability.toFixed(1)}%</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Spend</div>
          <div className="text-2xl font-bold">{totalSpend.toLocaleString()} SAR</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">At-Risk Vendors</div>
          <div className="text-2xl font-bold text-destructive">{atRiskVendors}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="scorecard">
        <TabsList>
          <TabsTrigger value="scorecard">Vendor Scorecard</TabsTrigger>
          <TabsTrigger value="leadtime">Lead Time Analysis</TabsTrigger>
          <TabsTrigger value="acknowledgments">PO Acknowledgments ({pendingPOs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scorecard" className="space-y-4">
          {/* Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Vendor Reliability Scores</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" name="Reliability %">
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.score >= 80 ? '#22c55e' : entry.score >= 60 ? '#eab308' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Reliability</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>On-Time</TableHead>
                    <TableHead>Avg Lead (days)</TableHead>
                    <TableHead>Total Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topVendors.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.vendor_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={v.reliability_score || 0} className="h-2 w-16" />
                          <span className={`text-sm font-medium ${getScoreColor(v.reliability_score || 0)}`}>{(v.reliability_score || 0).toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRiskBadge(v.reliability_score || 0)}</TableCell>
                      <TableCell>{v.total_orders || 0}</TableCell>
                      <TableCell>{v.on_time_deliveries || 0}/{v.total_delivered || 0}</TableCell>
                      <TableCell>{(v.avg_lead_time_days || 0).toFixed(1)}</TableCell>
                      <TableCell>{(v.total_spend || 0).toLocaleString()} SAR</TableCell>
                    </TableRow>
                  ))}
                  {vendors.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Click "Recalculate Scores" to generate vendor analytics</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leadtime">
          <Card>
            <CardHeader><CardTitle className="text-base">Actual vs Promised Lead Time (days)</CardTitle></CardHeader>
            <CardContent>
              {leadTimeData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadTimeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="actual" name="Actual Lead Time" fill="hsl(var(--primary))" />
                      <Bar dataKey="promised" name="Promised Lead Time" fill="hsl(var(--muted-foreground))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No lead time data available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acknowledgments">
          <Card>
            <CardHeader><CardTitle className="text-base">Pending PO Acknowledgments</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>{t('common.total')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPOs.map(po => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.vendor_name}</TableCell>
                      <TableCell>{(po.total || 0).toLocaleString()} SAR</TableCell>
                      <TableCell><Badge variant="secondary">{po.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setAckDialog(po)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Acknowledge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingPOs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">All POs acknowledged</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
