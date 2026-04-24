import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCPMS } from '@/hooks/useCPMS';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Leaf, Droplets, Recycle, Zap, Wind, Plus, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface SustLog { id?: string; project_id: string; log_date: string; category: string; subcategory?: string; quantity: number; unit: string; source?: string; notes?: string; }
interface ESGTarget { id?: string; project_id: string; category: string; metric_name: string; target_value: number; current_value: number; unit: string; period: string; status: string; }

const CATEGORIES = [
  { value: 'carbon', label: 'Carbon Emissions', icon: Wind, color: 'text-gray-600', bg: 'bg-gray-100', unit: 'kg CO₂e' },
  { value: 'waste', label: 'Waste Management', icon: Recycle, color: 'text-orange-600', bg: 'bg-orange-100', unit: 'tonnes' },
  { value: 'water', label: 'Water Usage', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100', unit: 'm³' },
  { value: 'energy', label: 'Energy Consumption', icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100', unit: 'kWh' },
];

const PIE_COLORS = ['hsl(0, 0%, 45%)', 'hsl(24, 95%, 53%)', 'hsl(217, 91%, 60%)', 'hsl(48, 96%, 53%)'];

export default function CPMSSustainability() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects } = useCPMS();
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<SustLog[]>([]);
  const [targets, setTargets] = useState<ESGTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [logForm, setLogForm] = useState<Partial<SustLog>>({ category: 'carbon', quantity: 0, unit: 'kg CO₂e', log_date: format(new Date(), 'yyyy-MM-dd') });
  const [targetForm, setTargetForm] = useState<Partial<ESGTarget>>({ category: 'carbon', target_value: 0, current_value: 0, period: 'monthly', status: 'on_track' });

  const fetchAll = async () => {
    setLoading(true);
    const [lRes, tRes] = await Promise.all([
      supabase.from('cpms_sustainability_logs' as any).select('*').order('log_date', { ascending: false }).limit(500),
      supabase.from('cpms_esg_targets' as any).select('*').order('created_at', { ascending: false }),
    ]);
    setLogs((lRes.data || []) as any[]);
    setTargets((tRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredLogs = selectedProject === 'all' ? logs : logs.filter(l => l.project_id === selectedProject);
  const filteredTargets = selectedProject === 'all' ? targets : targets.filter(t => t.project_id === selectedProject);

  const handleSaveLog = async () => {
    if (!logForm.project_id || !logForm.category) return;
    await supabase.from('cpms_sustainability_logs' as any).insert({ ...logForm, created_by: user?.id } as any);
    toast({ title: 'Log recorded' });
    setShowLogForm(false);
    fetchAll();
  };

  const handleSaveTarget = async () => {
    if (!targetForm.project_id || !targetForm.metric_name) return;
    await supabase.from('cpms_esg_targets' as any).insert(targetForm as any);
    toast({ title: 'ESG target created' });
    setShowTargetForm(false);
    fetchAll();
  };

  // Aggregated stats
  const categoryTotals = CATEGORIES.map(cat => {
    const catLogs = filteredLogs.filter(l => l.category === cat.value);
    const total = catLogs.reduce((s, l) => s + (l.quantity || 0), 0);
    return { ...cat, total, count: catLogs.length };
  });

  const pieData = categoryTotals.filter(c => c.total > 0).map(c => ({ name: c.label, value: c.total }));

  // Monthly trend
  const monthlyTrend = filteredLogs.reduce((acc: any[], l) => {
    const month = l.log_date?.substring(0, 7) || '';
    const existing = acc.find(a => a.month === month);
    if (existing) { existing[l.category] = (existing[l.category] || 0) + (l.quantity || 0); }
    else { acc.push({ month, [l.category]: l.quantity || 0 }); }
    return acc;
  }, []).sort((a, b) => a.month.localeCompare(b.month));

  const statusColor = (s: string) => s === 'on_track' ? 'text-green-600' : s === 'at_risk' ? 'text-yellow-600' : s === 'behind' ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cpms')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><Leaf className="h-6 w-6 text-green-600" /> Sustainability & ESG</h1>
          <p className="text-sm text-muted-foreground">الاستدامة والحوكمة البيئية – Carbon, Waste, Water, Energy tracking</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowLogForm(true)}><Plus className="h-4 w-4 mr-1" /> Log Data</Button>
        <Button variant="outline" onClick={() => setShowTargetForm(true)}><Target className="h-4 w-4 mr-1" /> Set Target</Button>
      </div>

      {/* Category KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categoryTotals.map(cat => {
          const Icon = cat.icon;
          return (
            <Card key={cat.value} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${cat.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{cat.label}</p>
                    <p className="text-lg font-bold">{cat.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{cat.unit} · {cat.count} entries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="overview">
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="targets">ESG Targets ({filteredTargets.length})</TabsTrigger><TabsTrigger value="logs">Data Logs ({filteredLogs.length})</TabsTrigger></TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Environmental Impact Distribution</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">No data logged yet</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Trends</CardTitle></CardHeader>
              <CardContent>
                {monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="carbon" name="Carbon" fill={PIE_COLORS[0]} stackId="a" />
                      <Bar dataKey="waste" name="Waste" fill={PIE_COLORS[1]} stackId="a" />
                      <Bar dataKey="water" name="Water" fill={PIE_COLORS[2]} stackId="a" />
                      <Bar dataKey="energy" name="Energy" fill={PIE_COLORS[3]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">No trend data</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="targets">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTargets.map((t: any) => {
              const pct = t.target_value > 0 ? Math.min(100, (t.current_value / t.target_value) * 100) : 0;
              return (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div><p className="text-sm font-medium">{t.metric_name}</p><p className="text-xs text-muted-foreground capitalize">{t.category} · {t.period}</p></div>
                      <Badge variant="outline" className={`capitalize ${statusColor(t.status)}`}>{t.status.replace('_', ' ')}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs font-mono">{t.current_value}/{t.target_value} {t.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredTargets.length === 0 && <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No ESG targets set</CardContent></Card>}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>{t('common.date')}</TableHead><TableHead>Category</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Source</TableHead><TableHead>{t('common.notes')}</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 50).map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.log_date}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{l.category}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{l.quantity?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{l.unit}</TableCell>
                      <TableCell className="text-xs">{l.source || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {filteredLogs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No logs recorded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Form */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Sustainability Data</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={logForm.project_id} onValueChange={v => setLogForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={logForm.category} onValueChange={v => { const cat = CATEGORIES.find(c => c.value === v); setLogForm(f => ({ ...f, category: v, unit: cat?.unit || '' })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t('common.date')}</Label><Input type="date" value={logForm.log_date} onChange={e => setLogForm(f => ({ ...f, log_date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity</Label><Input type="number" value={logForm.quantity} onChange={e => setLogForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Unit</Label><Input value={logForm.unit} onChange={e => setLogForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div><Label>Source</Label><Input value={logForm.source || ''} onChange={e => setLogForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Diesel generator, concrete plant" /></div>
            <div><Label>{t('common.notes')}</Label><Textarea value={logForm.notes || ''} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <Button onClick={handleSaveLog} className="w-full">Save Log</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Target Form */}
      <Dialog open={showTargetForm} onOpenChange={setShowTargetForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Set ESG Target</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project</Label>
              <Select value={targetForm.project_id} onValueChange={v => setTargetForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={targetForm.category} onValueChange={v => setTargetForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Metric Name</Label><Input value={targetForm.metric_name || ''} onChange={e => setTargetForm(f => ({ ...f, metric_name: e.target.value }))} placeholder="e.g. CO₂ reduction target" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target Value</Label><Input type="number" value={targetForm.target_value} onChange={e => setTargetForm(f => ({ ...f, target_value: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Current Value</Label><Input type="number" value={targetForm.current_value} onChange={e => setTargetForm(f => ({ ...f, current_value: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Unit</Label><Input value={targetForm.unit || ''} onChange={e => setTargetForm(f => ({ ...f, unit: e.target.value }))} /></div>
            <div><Label>Period</Label>
              <Select value={targetForm.period} onValueChange={v => setTargetForm(f => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveTarget} className="w-full">Create Target</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
