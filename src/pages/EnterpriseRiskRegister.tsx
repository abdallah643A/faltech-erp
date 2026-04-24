import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatSAR } from '@/lib/currency';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ShieldAlert, Plus, Search, Eye, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, TrendingDown, DollarSign, Target, Filter, Download,
  Pencil, BarChart3, Flame, XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const CATEGORIES = ['finance', 'hr', 'procurement', 'operations', 'construction', 'compliance', 'technology', 'market', 'environmental', 'legal', 'safety', 'supply_chain'];
const STRATEGIES = ['avoid', 'mitigate', 'transfer', 'accept', 'escalate'];
const STATUSES = ['open', 'under_review', 'mitigating', 'mitigated', 'closed', 'materialized'];

const probLabels = ['', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const impactLabels = ['', 'Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  mitigating: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  mitigated: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-muted text-muted-foreground',
  materialized: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

function getHeatColor(score: number): string {
  if (score >= 20) return 'bg-red-600 text-white';
  if (score >= 15) return 'bg-red-500 text-white';
  if (score >= 10) return 'bg-orange-500 text-white';
  if (score >= 5) return 'bg-amber-400 text-black';
  return 'bg-green-400 text-black';
}

function getScoreLabel(score: number): string {
  if (score >= 20) return 'Critical';
  if (score >= 15) return 'Very High';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

const emptyForm = {
  risk_title: '', category: 'operations', description: '', cause: '', impact_description: '',
  severity: 'medium', likelihood: 'medium',
  probability_score: 3, impact_level: 3,
  trigger_conditions: '', mitigation_plan: '', contingency_plan: '',
  owner_name: '', risk_response_strategy: 'mitigate',
  financial_exposure: 0, financial_exposure_max: 0,
  portfolio: '', risk_type: 'threat', notes: '',
  residual_probability: 1, residual_impact: 1,
};

export default function EnterpriseRiskRegister() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('register');

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['enterprise-risks', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('enterprise_risks' as any).select('*').order('risk_score', { ascending: false });
      if (activeCompanyId) q = (q as any).eq('company_id', activeCompanyId);
      const { data, error } = await q as any;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list-for-risks', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('projects').select('id, name').order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  const createOrUpdate = useMutation({
    mutationFn: async () => {
      const prob = Number(form.probability_score);
      const imp = Number(form.impact_level);
      const riskScore = prob * imp;
      const residualScore = Number(form.residual_probability) * Number(form.residual_impact);

      const payload: any = {
        ...form,
        company_id: activeCompanyId,
        probability_score: prob,
        impact_level: imp,
        impact_score: imp,
        risk_score: riskScore,
        residual_risk_score: residualScore,
        residual_probability: Number(form.residual_probability),
        residual_impact: Number(form.residual_impact),
        financial_exposure: Number(form.financial_exposure),
        financial_exposure_max: Number(form.financial_exposure_max),
      };

      if (editId) {
        const { error } = await (supabase.from('enterprise_risks' as any).update(payload).eq('id', editId) as any);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await (supabase.from('enterprise_risks' as any).insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-risks'] });
      toast({ title: editId ? 'Risk updated' : 'Risk registered' });
      setShowForm(false);
      setEditId(null);
      setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRiskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'materialized') {
        updates.materialized = true;
        updates.materialized_at = new Date().toISOString();
      }
      const { error } = await (supabase.from('enterprise_risks' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-risks'] });
      toast({ title: 'Status updated' });
    },
  });

  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      risk_title: r.risk_title || '', category: r.category || 'operations',
      description: r.description || '', cause: r.cause || '',
      impact_description: r.impact_description || '',
      severity: r.severity || 'medium', likelihood: r.likelihood || 'medium',
      probability_score: r.probability_score || 3, impact_level: r.impact_level || 3,
      trigger_conditions: r.trigger_conditions || '',
      mitigation_plan: r.mitigation_plan || '', contingency_plan: r.contingency_plan || '',
      owner_name: r.owner_name || '', risk_response_strategy: r.risk_response_strategy || 'mitigate',
      financial_exposure: r.financial_exposure || 0, financial_exposure_max: r.financial_exposure_max || 0,
      portfolio: r.portfolio || '', risk_type: r.risk_type || 'threat', notes: '',
      residual_probability: r.residual_probability || 1, residual_impact: r.residual_impact || 1,
    });
    setShowForm(true);
  };

  const exportRisks = () => {
    const rows = risks.map((r: any) => ({
      'Risk Title': r.risk_title, Category: r.category, Status: r.status,
      'Probability (1-5)': r.probability_score, 'Impact (1-5)': r.impact_level,
      'Risk Score': r.risk_score, Cause: r.cause,
      'Mitigation Plan': r.mitigation_plan, Strategy: r.risk_response_strategy,
      'Residual Score': r.residual_risk_score, Owner: r.owner_name,
      'Financial Exposure': r.financial_exposure, Portfolio: r.portfolio,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Risk Register');
    XLSX.writeFile(wb, 'Risk_Register.xlsx');
  };

  const filtered = useMemo(() => {
    let f = risks;
    if (catFilter !== 'all') f = f.filter((r: any) => r.category === catFilter);
    if (statusFilter !== 'all') f = f.filter((r: any) => r.status === statusFilter);
    if (searchTerm) f = f.filter((r: any) =>
      r.risk_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return f;
  }, [risks, catFilter, statusFilter, searchTerm]);

  // KPIs
  const openRisks = risks.filter((r: any) => r.status === 'open').length;
  const criticalRisks = risks.filter((r: any) => (r.risk_score || 0) >= 15).length;
  const totalExposure = risks.reduce((s: number, r: any) => s + (r.financial_exposure || 0), 0);
  const materializedCount = risks.filter((r: any) => r.materialized).length;
  const mitigatedCount = risks.filter((r: any) => r.status === 'mitigated' || r.status === 'closed').length;

  // Heatmap data: 5x5 grid
  const heatmapData = useMemo(() => {
    const grid: any[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
    risks.forEach((r: any) => {
      const p = Math.min(Math.max(r.probability_score || 1, 1), 5);
      const i = Math.min(Math.max(r.impact_level || 1, 1), 5);
      grid[5 - p][i - 1].push(r);
    });
    return grid;
  }, [risks]);

  // By portfolio
  const portfolioGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    risks.forEach((r: any) => {
      const key = r.portfolio || 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [risks]);

  // By category
  const categoryGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    risks.forEach((r: any) => {
      const key = r.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [risks]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-primary" />
            Advanced Project Risk Register
          </h1>
          <p className="text-muted-foreground">Comprehensive risk management with heatmap, financial exposure, and portfolio views</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditId(null); setForm({ ...emptyForm }); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Register Risk
          </Button>
          <Button variant="outline" onClick={exportRisks} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Risks</p>
          <p className="text-2xl font-bold text-primary">{risks.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="text-2xl font-bold text-red-600">{openRisks}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Critical (≥15)</p>
          <p className="text-2xl font-bold text-red-700">{criticalRisks}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Mitigated</p>
          <p className="text-2xl font-bold text-green-600">{mitigatedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Materialized</p>
          <p className="text-2xl font-bold text-purple-600">{materializedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Exposure</p>
          <p className="text-lg font-bold text-primary">{formatSAR(totalExposure)}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="register">Risk Register</TabsTrigger>
          <TabsTrigger value="heatmap">Risk Heatmap</TabsTrigger>
          <TabsTrigger value="portfolio">By Portfolio</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
        </TabsList>

        {/* Register Tab */}
        <TabsContent value="register">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search risks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">P×I</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Residual</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead className="text-right">Exposure</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No risks found</TableCell></TableRow>
                    ) : filtered.map((r: any) => {
                      const score = r.risk_score || (r.probability_score || 1) * (r.impact_level || 1);
                      const resScore = r.residual_risk_score || 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{r.risk_title}</div>
                            <div className="text-[10px] text-muted-foreground max-w-[200px] truncate">{r.cause || r.description}</div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{r.category}</Badge></TableCell>
                          <TableCell className="text-center text-xs">{r.probability_score || '?'}×{r.impact_level || '?'}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${getHeatColor(score)} text-xs`}>{score}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${getHeatColor(resScore)} text-xs`}>{resScore}</Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize">{r.risk_response_strategy || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{r.financial_exposure ? formatSAR(r.financial_exposure) : '-'}</TableCell>
                          <TableCell className="text-xs">{r.owner_name || '-'}</TableCell>
                          <TableCell><Badge className={`text-[10px] ${statusColors[r.status] || 'bg-muted text-muted-foreground'}`}>{r.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setShowDetail(r)}><Eye className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-red-500" /> Risk Heatmap (Probability × Impact)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <div className="min-w-[600px]">
                  <div className="flex">
                    <div className="w-24 flex flex-col justify-center items-center">
                      <span className="text-xs font-semibold text-muted-foreground -rotate-90 whitespace-nowrap">← PROBABILITY →</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-center text-xs font-semibold text-muted-foreground mb-2">← IMPACT →</div>
                      <div className="grid grid-cols-5 gap-1 mb-1">
                        {impactLabels.slice(1).map((l, i) => (
                          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium">{l}</div>
                        ))}
                      </div>
                      {heatmapData.map((row, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-5 gap-1 mb-1">
                          {row.map((cell: any[], colIdx: number) => {
                            const prob = 5 - rowIdx;
                            const imp = colIdx + 1;
                            const score = prob * imp;
                            return (
                              <TooltipProvider key={colIdx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`${getHeatColor(score)} rounded p-2 min-h-[60px] flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105`}>
                                      <span className="text-lg font-bold">{cell.length}</span>
                                      <span className="text-[9px] opacity-80">{score}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[300px]">
                                    <p className="font-bold">{probLabels[prob]} × {impactLabels[imp]} = {score}</p>
                                    {cell.length > 0 ? cell.map((r: any) => (
                                      <p key={r.id} className="text-xs">• {r.risk_title}</p>
                                    )) : <p className="text-xs text-muted-foreground">No risks</p>}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      ))}
                      <div className="grid grid-cols-5 gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="text-center text-[10px] text-muted-foreground">{i}</div>
                        ))}
                      </div>
                    </div>
                    <div className="w-16 flex flex-col justify-between items-center py-1">
                      {probLabels.slice(1).reverse().map((l, i) => (
                        <span key={i} className="text-[10px] text-muted-foreground">{l}</span>
                      ))}
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex gap-4 mt-4 justify-center">
                    {[
                      { label: 'Low (1-4)', cls: 'bg-green-400' },
                      { label: 'Medium (5-9)', cls: 'bg-amber-400' },
                      { label: 'High (10-14)', cls: 'bg-orange-500' },
                      { label: 'Very High (15-19)', cls: 'bg-red-500' },
                      { label: 'Critical (20-25)', cls: 'bg-red-600' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1">
                        <div className={`w-4 h-4 rounded ${l.cls}`} />
                        <span className="text-[10px] text-muted-foreground">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio">
          <div className="space-y-4">
            {Object.entries(portfolioGroups).map(([portfolio, pRisks]) => {
              const exposure = pRisks.reduce((s: number, r: any) => s + (r.financial_exposure || 0), 0);
              const avgScore = pRisks.reduce((s: number, r: any) => s + (r.risk_score || 0), 0) / (pRisks.length || 1);
              return (
                <Card key={portfolio}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{portfolio}</CardTitle>
                      <div className="flex gap-4 text-sm">
                        <span>{pRisks.length} risks</span>
                        <span>Avg Score: <Badge className={getHeatColor(avgScore)}>{avgScore.toFixed(0)}</Badge></span>
                        <span>Exposure: <strong>{formatSAR(exposure)}</strong></span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Risk</TableHead><TableHead>Score</TableHead><TableHead>Strategy</TableHead>
                        <TableHead className="text-right">Exposure</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {pRisks.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium text-sm">{r.risk_title}</TableCell>
                            <TableCell><Badge className={getHeatColor(r.risk_score || 0)}>{r.risk_score || 0}</Badge></TableCell>
                            <TableCell className="text-xs capitalize">{r.risk_response_strategy || '-'}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{r.financial_exposure ? formatSAR(r.financial_exposure) : '-'}</TableCell>
                            <TableCell className="text-xs">{r.owner_name || '-'}</TableCell>
                            <TableCell><Badge className={`text-[10px] ${statusColors[r.status]}`}>{r.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Category Tab */}
        <TabsContent value="category">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categoryGroups).map(([cat, cRisks]) => {
              const critical = cRisks.filter((r: any) => (r.risk_score || 0) >= 15).length;
              const exposure = cRisks.reduce((s: number, r: any) => s + (r.financial_exposure || 0), 0);
              return (
                <Card key={cat}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize flex items-center justify-between">
                      {cat}
                      <Badge variant="outline">{cRisks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Critical:</span>
                      <span className="font-bold text-red-600">{critical}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Exposure:</span>
                      <span className="font-bold">{formatSAR(exposure)}</span>
                    </div>
                    <div className="space-y-1">
                      {cRisks.slice(0, 5).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between text-xs p-1 rounded bg-muted/50">
                          <span className="truncate max-w-[150px]">{r.risk_title}</span>
                          <Badge className={`${getHeatColor(r.risk_score || 0)} text-[9px]`}>{r.risk_score || 0}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Risk' : 'Register New Risk'}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            {/* Basic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Label>Risk Title *</Label><Input value={form.risk_title} onChange={e => setForm(p => ({ ...p, risk_title: e.target.value }))} /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Risk Type</Label>
                <Select value={form.risk_type} onValueChange={v => setForm(p => ({ ...p, risk_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="threat">Threat</SelectItem><SelectItem value="opportunity">Opportunity</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {/* Cause & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Cause / Root Cause</Label><Textarea value={form.cause} onChange={e => setForm(p => ({ ...p, cause: e.target.value }))} rows={2} /></div>
              <div><Label>Impact Description</Label><Textarea value={form.impact_description} onChange={e => setForm(p => ({ ...p, impact_description: e.target.value }))} rows={2} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>

            {/* Scoring */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Risk Assessment (Inherent)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><Label>Probability (1-5)</Label>
                  <Select value={String(form.probability_score)} onValueChange={v => setForm(p => ({ ...p, probability_score: +v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} - {probLabels[n]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Impact (1-5)</Label>
                  <Select value={String(form.impact_level)} onValueChange={v => setForm(p => ({ ...p, impact_level: +v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} - {impactLabels[n]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Risk Score</Label>
                  <div className="mt-2">
                    <Badge className={`${getHeatColor(form.probability_score * form.impact_level)} text-lg px-4 py-1`}>
                      {form.probability_score * form.impact_level} - {getScoreLabel(form.probability_score * form.impact_level)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Mitigation & Response */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Response & Mitigation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Response Strategy</Label>
                  <Select value={form.risk_response_strategy} onValueChange={v => setForm(p => ({ ...p, risk_response_strategy: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STRATEGIES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Owner</Label><Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} /></div>
              </div>
              <div className="mt-3"><Label>Mitigation Plan</Label><Textarea value={form.mitigation_plan} onChange={e => setForm(p => ({ ...p, mitigation_plan: e.target.value }))} rows={2} /></div>
              <div className="mt-3"><Label>Contingency Plan</Label><Textarea value={form.contingency_plan} onChange={e => setForm(p => ({ ...p, contingency_plan: e.target.value }))} rows={2} /></div>
              <div className="mt-3"><Label>Trigger Conditions</Label><Textarea value={form.trigger_conditions} onChange={e => setForm(p => ({ ...p, trigger_conditions: e.target.value }))} rows={2} placeholder="What conditions would trigger this risk..." /></div>
            </div>

            {/* Residual Risk */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Residual Risk (After Mitigation)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Residual Prob (1-5)</Label>
                  <Select value={String(form.residual_probability)} onValueChange={v => setForm(p => ({ ...p, residual_probability: +v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Residual Impact (1-5)</Label>
                  <Select value={String(form.residual_impact)} onValueChange={v => setForm(p => ({ ...p, residual_impact: +v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Residual Score</Label>
                  <div className="mt-2"><Badge className={`${getHeatColor(form.residual_probability * form.residual_impact)} px-3`}>{form.residual_probability * form.residual_impact}</Badge></div>
                </div>
              </div>
            </div>

            {/* Financial */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Financial Exposure</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Expected Exposure (SAR)</Label><Input type="number" value={form.financial_exposure} onChange={e => setForm(p => ({ ...p, financial_exposure: +e.target.value }))} /></div>
                <div><Label>Maximum Exposure (SAR)</Label><Input type="number" value={form.financial_exposure_max} onChange={e => setForm(p => ({ ...p, financial_exposure_max: +e.target.value }))} /></div>
              </div>
            </div>

            {/* Portfolio */}
            <div><Label>Portfolio / Project Group</Label><Input value={form.portfolio} onChange={e => setForm(p => ({ ...p, portfolio: e.target.value }))} placeholder="e.g. Infrastructure, Commercial, Residential" /></div>

            <Button onClick={() => createOrUpdate.mutate()} disabled={!form.risk_title || createOrUpdate.isPending} className="w-full">
              {createOrUpdate.isPending ? 'Saving...' : editId ? 'Update Risk' : 'Register Risk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{showDetail?.risk_title}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-muted-foreground text-[10px]">Category</Label><Badge variant="outline">{showDetail.category}</Badge></div>
                <div><Label className="text-muted-foreground text-[10px]">Status</Label><Badge className={statusColors[showDetail.status]}>{showDetail.status}</Badge></div>
                <div><Label className="text-muted-foreground text-[10px]">Risk Score</Label><Badge className={getHeatColor(showDetail.risk_score || 0)}>{showDetail.risk_score || 0}</Badge></div>
                <div><Label className="text-muted-foreground text-[10px]">Residual Score</Label><Badge className={getHeatColor(showDetail.residual_risk_score || 0)}>{showDetail.residual_risk_score || 0}</Badge></div>
                <div><Label className="text-muted-foreground text-[10px]">Probability</Label><p className="text-sm">{showDetail.probability_score}/5 ({probLabels[showDetail.probability_score || 1]})</p></div>
                <div><Label className="text-muted-foreground text-[10px]">Impact</Label><p className="text-sm">{showDetail.impact_level}/5 ({impactLabels[showDetail.impact_level || 1]})</p></div>
                <div><Label className="text-muted-foreground text-[10px]">Strategy</Label><p className="text-sm capitalize">{showDetail.risk_response_strategy || '-'}</p></div>
                <div><Label className="text-muted-foreground text-[10px]">Owner</Label><p className="text-sm">{showDetail.owner_name || '-'}</p></div>
              </div>

              {showDetail.cause && <div><Label className="text-muted-foreground text-[10px]">Root Cause</Label><p className="text-sm">{showDetail.cause}</p></div>}
              {showDetail.description && <div><Label className="text-muted-foreground text-[10px]">Description</Label><p className="text-sm">{showDetail.description}</p></div>}
              {showDetail.impact_description && <div><Label className="text-muted-foreground text-[10px]">Impact Description</Label><p className="text-sm">{showDetail.impact_description}</p></div>}
              {showDetail.trigger_conditions && <div><Label className="text-muted-foreground text-[10px]">Trigger Conditions</Label><p className="text-sm">{showDetail.trigger_conditions}</p></div>}
              {showDetail.mitigation_plan && <div><Label className="text-muted-foreground text-[10px]">Mitigation Plan</Label><p className="text-sm">{showDetail.mitigation_plan}</p></div>}
              {showDetail.contingency_plan && <div><Label className="text-muted-foreground text-[10px]">Contingency Plan</Label><p className="text-sm">{showDetail.contingency_plan}</p></div>}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><Label className="text-muted-foreground text-[10px]">Financial Exposure</Label><p className="font-bold">{formatSAR(showDetail.financial_exposure || 0)}</p></div>
                <div><Label className="text-muted-foreground text-[10px]">Max Exposure</Label><p className="font-bold">{formatSAR(showDetail.financial_exposure_max || 0)}</p></div>
                {showDetail.actual_impact_cost > 0 && <div><Label className="text-muted-foreground text-[10px]">Actual Cost</Label><p className="font-bold text-red-600">{formatSAR(showDetail.actual_impact_cost)}</p></div>}
                <div><Label className="text-muted-foreground text-[10px]">Portfolio</Label><p className="text-sm">{showDetail.portfolio || '-'}</p></div>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 pt-3 border-t flex-wrap">
                {STATUSES.filter(s => s !== showDetail.status).map(s => (
                  <Button key={s} size="sm" variant={s === 'materialized' ? 'destructive' : 'outline'} onClick={() => updateRiskStatus.mutate({ id: showDetail.id, status: s })}>
                    {s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
