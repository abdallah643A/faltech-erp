import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, Plus, RefreshCw, Ban, CheckCircle, DollarSign, Users, History } from 'lucide-react';
import { useCustomerCreditLimits, useCreditCheckLog } from '@/hooks/useCreditManagement';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreditManagementPage() {
  const { t } = useLanguage();
  const { creditLimits, isLoading, createCreditLimit, updateCreditLimit, refreshOutstanding } = useCustomerCreditLimits();
  const { logs } = useCreditCheckLog();
  const { businessPartners } = useBusinessPartners();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ customer_id: '', customer_code: '', customer_name: '', approved_credit_limit: 0, risk_level: 'low', review_date: '', notes: '' });

  const customers = (businessPartners || []).filter(bp => bp.card_type === 'customer' || bp.card_type === 'C');

  const totalCreditExposure = creditLimits.reduce((s, c) => s + (c.current_outstanding || 0), 0);
  const totalCreditLimit = creditLimits.reduce((s, c) => s + (c.approved_credit_limit || 0), 0);
  const utilizationPct = totalCreditLimit > 0 ? (totalCreditExposure / totalCreditLimit) * 100 : 0;
  const highRiskCount = creditLimits.filter(c => c.risk_level === 'high').length;
  const blockedCount = creditLimits.filter(c => c.credit_status === 'blocked').length;

  const chartData = creditLimits.slice(0, 10).map(c => ({
    name: c.customer_name?.length > 12 ? c.customer_name.substring(0, 12) + '...' : c.customer_name,
    limit: c.approved_credit_limit || 0,
    outstanding: c.current_outstanding || 0,
  }));

  const handleCreate = () => {
    createCreditLimit.mutate(form);
    setShowCreate(false);
    setForm({ customer_id: '', customer_code: '', customer_name: '', approved_credit_limit: 0, risk_level: 'low', review_date: '', notes: '' });
  };

  const handleSelectCustomer = (customerId: string) => {
    const c = customers.find(bp => bp.id === customerId);
    if (c) {
      setForm({ ...form, customer_id: c.id, customer_code: c.card_code, customer_name: c.card_name });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Credit Management</h1>
          <p className="text-muted-foreground">Credit limits, automated checks & dunning</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refreshOutstanding.mutate()} disabled={refreshOutstanding.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshOutstanding.isPending ? 'animate-spin' : ''}`} /> Refresh Balances
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Set Credit Limit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Customer Credit Limit</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Customer</Label>
                  <Select value={form.customer_id} onValueChange={handleSelectCustomer}>
                    <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.card_code} - {c.card_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Approved Credit Limit (SAR)</Label><Input type="number" value={form.approved_credit_limit} onChange={e => setForm({ ...form, approved_credit_limit: +e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Risk Level</Label>
                    <Select value={form.risk_level} onValueChange={v => setForm({ ...form, risk_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Review Date</Label><Input type="date" value={form.review_date} onChange={e => setForm({ ...form, review_date: e.target.value })} /></div>
                </div>
                <div><Label>{t('common.notes')}</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={handleCreate} disabled={createCreditLimit.isPending || !form.customer_code}>Set Limit</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Customers with Limits</div>
          <div className="text-2xl font-bold">{creditLimits.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Total Exposure</div>
          <div className="text-2xl font-bold">{totalCreditExposure.toLocaleString()} SAR</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Utilization</div>
          <div className="flex items-center gap-2">
            <Progress value={utilizationPct} className="h-2 flex-1" />
            <span className="text-sm font-bold">{utilizationPct.toFixed(1)}%</span>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">High Risk</div>
          <div className="text-2xl font-bold text-yellow-600">{highRiskCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Blocked</div>
          <div className="text-2xl font-bold text-destructive">{blockedCount}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="limits">
        <TabsList>
          <TabsTrigger value="limits">Credit Limits</TabsTrigger>
          <TabsTrigger value="exposure">Exposure Chart</TabsTrigger>
          <TabsTrigger value="log">Check Log ({(logs || []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="limits">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditLimits.map((c: any) => {
                    const utilPct = c.approved_credit_limit > 0 ? (c.current_outstanding / c.approved_credit_limit) * 100 : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{c.customer_code}</div>
                        </TableCell>
                        <TableCell className="font-medium">{(c.approved_credit_limit || 0).toLocaleString()} SAR</TableCell>
                        <TableCell className="text-destructive">{(c.current_outstanding || 0).toLocaleString()} SAR</TableCell>
                        <TableCell className="text-green-600">{(c.available_credit || 0).toLocaleString()} SAR</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={utilPct} className="h-2 w-16" />
                            <span className="text-xs">{utilPct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.risk_level === 'high' ? 'destructive' : c.risk_level === 'medium' ? 'secondary' : 'default'}>
                            {c.risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.credit_status === 'blocked' ? 'destructive' : 'default'}>{c.credit_status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.credit_status !== 'blocked' ? (
                              <Button variant="ghost" size="sm" onClick={() => updateCreditLimit.mutate({ id: c.id, credit_status: 'blocked' })}>
                                <Ban className="h-3 w-3 mr-1" /> Block
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => updateCreditLimit.mutate({ id: c.id, credit_status: 'active' })}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Unblock
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {creditLimits.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No credit limits configured</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exposure">
          <Card>
            <CardHeader><CardTitle className="text-base">Credit Exposure by Customer</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="limit" name="Credit Limit" fill="hsl(var(--muted-foreground))" />
                      <Bar dataKey="outstanding" name="Outstanding" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No credit data to display</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs || []).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                      <TableCell>{l.customer_code}</TableCell>
                      <TableCell>{(l.order_amount || 0).toLocaleString()} SAR</TableCell>
                      <TableCell>{(l.outstanding_before || 0).toLocaleString()} SAR</TableCell>
                      <TableCell>{(l.credit_limit || 0).toLocaleString()} SAR</TableCell>
                      <TableCell>
                        <Badge variant={l.result === 'passed' ? 'default' : 'destructive'}>{l.result}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{l.blocked_reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(logs || []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No credit checks logged</TableCell></TableRow>
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
