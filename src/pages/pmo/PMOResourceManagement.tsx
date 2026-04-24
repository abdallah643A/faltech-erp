import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Users, AlertTriangle, TrendingUp, Calendar, BarChart3, Plus, Search,
  UserCheck, UserX, Clock, Target, Zap
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const SKILL_CATEGORIES = ['it', 'engineering', 'management', 'design', 'finance', 'operations', 'quality', 'procurement'];
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', '#10b981', '#8b5cf6', '#f97316'];

export default function PMOResourceManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { profile } = useAuth();
  const { resources, allocations, createResource, createAllocation } = usePMOPortfolio();
  const { projects = [] } = useProjects();
  const [activeTab, setActiveTab] = useState('capacity');
  const [search, setSearch] = useState('');
  const [skillDialog, setSkillDialog] = useState(false);
  const [skillForm, setSkillForm] = useState({ resource_id: '', skill_name: '', proficiency_level: 'intermediate', years_experience: 0, certified: false });

  // Resource skills
  const { data: skills = [] } = useQuery({
    queryKey: ['pmo-resource-skills', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_resource_skills').select('*');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  // Resource forecasts
  const { data: forecasts = [] } = useQuery({
    queryKey: ['pmo-resource-forecasts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('pmo_resource_forecasts').select('*').order('forecast_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const addSkill = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('pmo_resource_skills').insert({ ...data, company_id: activeCompanyId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-resource-skills'] }); toast({ title: 'Skill added' }); setSkillDialog(false); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Utilization calculations
  const resourceUtilization = useMemo(() => resources.map(r => {
    const totalAllocated = allocations.filter(a => a.resource_id === r.id && a.status === 'active').reduce((s, a) => s + (a.allocated_hours_per_week || 0), 0);
    const utilization = r.available_hours_per_week > 0 ? Math.round((totalAllocated / r.available_hours_per_week) * 100) : 0;
    const resourceSkills = skills.filter(s => s.resource_id === r.id);
    return { ...r, totalAllocated, utilization, isOverAllocated: utilization > 120, isUnderUtilized: utilization < 50, skills: resourceSkills };
  }), [resources, allocations, skills]);

  const overAllocated = resourceUtilization.filter(r => r.isOverAllocated).length;
  const underUtilized = resourceUtilization.filter(r => r.isUnderUtilized).length;
  const avgUtilization = resourceUtilization.length > 0 ? Math.round(resourceUtilization.reduce((s, r) => s + r.utilization, 0) / resourceUtilization.length) : 0;
  const optimalRange = resourceUtilization.filter(r => r.utilization >= 70 && r.utilization <= 100).length;

  // Skill gap analysis
  const allSkillNames = [...new Set(skills.map(s => s.skill_name))];
  const skillDistribution = SKILL_CATEGORIES.map(cat => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: resources.filter(r => r.skill_category === cat).length,
  }));

  // Utilization chart data
  const utilizationBands = [
    { range: '0-25%', count: resourceUtilization.filter(r => r.utilization <= 25).length, fill: '#ef4444' },
    { range: '26-50%', count: resourceUtilization.filter(r => r.utilization > 25 && r.utilization <= 50).length, fill: '#f59e0b' },
    { range: '51-75%', count: resourceUtilization.filter(r => r.utilization > 50 && r.utilization <= 75).length, fill: '#3b82f6' },
    { range: '76-100%', count: resourceUtilization.filter(r => r.utilization > 75 && r.utilization <= 100).length, fill: '#10b981' },
    { range: '>100%', count: resourceUtilization.filter(r => r.utilization > 100).length, fill: '#ef4444' },
  ];

  const filtered = resourceUtilization.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resource Capacity Planning</h1>
          <p className="text-muted-foreground">Utilization rates, skill gaps, and availability forecasting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSkillDialog(true)}><Zap className="h-4 w-4 mr-1" /> Add Skill</Button>
          <Button size="sm" onClick={() => createResource.mutate({ name: 'New Resource', resource_type: 'internal', available_hours_per_week: 40, skill_category: 'it' })}><Plus className="h-4 w-4 mr-1" /> Add Resource</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Total Resources</span></div>
          <p className="text-2xl font-bold">{resources.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Avg Utilization</span></div>
          <p className="text-2xl font-bold">{avgUtilization}%</p>
          <Progress value={avgUtilization} className="mt-1 h-1.5" />
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Over-Allocated</span></div>
          <p className="text-2xl font-bold text-destructive">{overAllocated}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><UserCheck className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Optimal (70-100%)</span></div>
          <p className="text-2xl font-bold text-green-600">{optimalRange}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="capacity"><BarChart3 className="h-4 w-4 mr-1" /> Capacity Planning</TabsTrigger>
          <TabsTrigger value="skills"><Target className="h-4 w-4 mr-1" /> Skill Gaps</TabsTrigger>
          <TabsTrigger value="forecast"><Calendar className="h-4 w-4 mr-1" /> Availability Forecast</TabsTrigger>
          <TabsTrigger value="allocations"><Users className="h-4 w-4 mr-1" /> Allocations</TabsTrigger>
        </TabsList>

        <TabsContent value="capacity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Utilization Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={utilizationBands}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" name="Resources">
                      {utilizationBands.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">By Department</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={skillDistribution.filter(s => s.count > 0)} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                      {skillDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Resource Utilization</CardTitle>
                <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" /></div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>{t('hr.department')}</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>Available (hrs/wk)</TableHead>
                    <TableHead>Allocated (hrs/wk)</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.department || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{r.resource_type}</Badge></TableCell>
                      <TableCell>{r.available_hours_per_week}</TableCell>
                      <TableCell>{r.totalAllocated}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(r.utilization, 100)} className="h-2 w-20" />
                          <span className="text-xs font-medium">{r.utilization}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.isOverAllocated ? <Badge variant="destructive">Over-allocated</Badge> :
                         r.isUnderUtilized ? <Badge variant="secondary">Under-utilized</Badge> :
                         <Badge className="bg-green-100 text-green-800">Optimal</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Skill Category Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={skillDistribution}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" fontSize={11} />
                    <PolarRadiusAxis />
                    <Radar name="Resources" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Skill Inventory</CardTitle></CardHeader>
              <CardContent>
                {allSkillNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No skills registered yet. Add skills to resources to see gap analysis.</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {allSkillNames.map(skill => {
                      const count = skills.filter(s => s.skill_name === skill).length;
                      const experts = skills.filter(s => s.skill_name === skill && s.proficiency_level === 'expert').length;
                      return (
                        <div key={skill} className="flex items-center justify-between p-2 rounded border">
                          <div>
                            <p className="text-sm font-medium">{skill}</p>
                            <p className="text-xs text-muted-foreground">{experts} expert{experts !== 1 ? 's' : ''}</p>
                          </div>
                          <Badge variant="outline">{count} resource{count !== 1 ? 's' : ''}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Resource Skills Matrix</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Proficiency</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Certified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map(s => {
                    const resource = resources.find(r => r.id === s.resource_id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{resource?.name || 'Unknown'}</TableCell>
                        <TableCell>{s.skill_name}</TableCell>
                        <TableCell><Badge variant={s.proficiency_level === 'expert' ? 'default' : 'outline'}>{s.proficiency_level}</Badge></TableCell>
                        <TableCell>{s.years_experience} yrs</TableCell>
                        <TableCell>{s.certified ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                  {skills.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No skills data yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Availability Forecast (Next 12 Weeks)</CardTitle></CardHeader>
            <CardContent>
              {forecasts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={forecasts.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="forecast_date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="available_hours" name="Available" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="allocated_hours" name="Allocated" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="leave_hours" name="Leave" stroke="#f59e0b" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No forecast data available. Resource forecasts are generated from allocations and leave records.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming Availability Gaps</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resourceUtilization.filter(r => r.isOverAllocated).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.totalAllocated}h allocated / {r.available_hours_per_week}h available</p>
                    </div>
                    <Badge variant="destructive">{r.utilization}% utilized</Badge>
                  </div>
                ))}
                {resourceUtilization.filter(r => r.isOverAllocated).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No availability gaps detected</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Active Allocations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hours/Week</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{(a as any).resource?.name || 'Unknown'}</TableCell>
                      <TableCell>{(a as any).project?.name || 'Unknown'}</TableCell>
                      <TableCell>{a.role_in_project || '-'}</TableCell>
                      <TableCell>{a.allocated_hours_per_week}h</TableCell>
                      <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {allocations.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No allocations yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Skill Dialog */}
      <Dialog open={skillDialog} onOpenChange={setSkillDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Resource Skill</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Resource</Label>
              <Select value={skillForm.resource_id} onValueChange={v => setSkillForm(p => ({ ...p, resource_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                <SelectContent>{resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Skill Name</Label><Input value={skillForm.skill_name} onChange={e => setSkillForm(p => ({ ...p, skill_name: e.target.value }))} /></div>
            <div><Label>Proficiency</Label>
              <Select value={skillForm.proficiency_level} onValueChange={v => setSkillForm(p => ({ ...p, proficiency_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROFICIENCY_LEVELS.map(l => <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Years Experience</Label><Input type="number" value={skillForm.years_experience} onChange={e => setSkillForm(p => ({ ...p, years_experience: +e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => addSkill.mutate(skillForm)} disabled={!skillForm.resource_id || !skillForm.skill_name}>Add Skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
