import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { newTables } from "@/integrations/supabase/new-tables";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, GraduationCap, Award, Users, AlertTriangle, CheckCircle, Clock, BookOpen, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from '@/contexts/LanguageContext';

export default function TrainingCompetency() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("programs");
  const [programDialog, setProgramDialog] = useState(false);
  const [skillDialog, setSkillDialog] = useState(false);
  const [programForm, setProgramForm] = useState({ title: "", description: "", category: "general", trainer: "", cost: 0, max_participants: 0 });
  const [skillForm, setSkillForm] = useState({ skill_name: "", skill_category: "technical", description: "", required_level: 1, department: "", role: "" });

  const { data: programs = [], isLoading: loadingP } = useQuery({
    queryKey: ["training_programs", activeCompanyId],
    queryFn: async () => {
      const q = supabase.from("training_programs").select("*").order("created_at", { ascending: false });
      if (activeCompanyId && activeCompanyId !== "all") q.eq("company_id", activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["employee_trainings", activeCompanyId],
    queryFn: async () => {
      const q = newTables.employeeTrainings().select("*, employees(first_name, last_name), training_programs(title)").order("created_at", { ascending: false });
      if (activeCompanyId && activeCompanyId !== "all") q.eq("company_id", activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["competency_matrices", activeCompanyId],
    queryFn: async () => {
      const q = (supabase as any).from("competency_matrices").select("*").order("created_at", { ascending: false });
      if (activeCompanyId && activeCompanyId !== "all") q.eq("company_id", activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: competencies = [] } = useQuery({
    queryKey: ["employee_competencies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("employee_competencies").select("*, employees(first_name, last_name), competency_matrices(skill_name, skill_category)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createProgram = useMutation({
    mutationFn: async (values: typeof programForm) => {
      const { error } = await supabase.from("training_programs").insert({ ...values, company_id: activeCompanyId || null } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training_programs"] }); setProgramDialog(false); toast.success("Program created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSkill = useMutation({
    mutationFn: async (values: typeof skillForm) => {
      const { error } = await (supabase as any).from("competency_matrices").insert({ ...values, company_id: activeCompanyId || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["competency_matrices"] }); setSkillDialog(false); toast.success("Skill added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mandatoryCount = programs.filter((p: any) => p.is_mandatory).length;
  const completedTrainings = trainings.filter((t: any) => t.status === "completed").length;
  const expiringSoon = trainings.filter((t: any) => {
    if (!t.expiry_date) return false;
    const days = (new Date(t.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  }).length;

  const catColors: Record<string, string> = { general: "bg-blue-500/20 text-blue-400", safety: "bg-red-500/20 text-red-400", technical: "bg-purple-500/20 text-purple-400", compliance: "bg-yellow-500/20 text-yellow-400", leadership: "bg-emerald-500/20 text-emerald-400" };
  const statusColors: Record<string, string> = { scheduled: "bg-blue-500/20 text-blue-400", in_progress: "bg-yellow-500/20 text-yellow-400", completed: "bg-green-500/20 text-green-400", expired: "bg-red-500/20 text-red-400", failed: "bg-red-500/20 text-red-400" };

  return (
    <div className="space-y-6 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Training & Competency Tracking</h1>
          <p className="text-sm text-muted-foreground">Manage training programs, certifications, and skills matrices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSkillDialog(true)}><Target className="h-4 w-4 mr-2" />Add Skill</Button>
          <Button onClick={() => setProgramDialog(true)}><Plus className="h-4 w-4 mr-2" />New Program</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><GraduationCap className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{programs.length}</p><p className="text-xs text-muted-foreground">Programs</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Award className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold">{completedTrainings}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold">{expiringSoon}</p><p className="text-xs text-muted-foreground">Expiring Soon</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Target className="h-8 w-8 text-purple-400" /><div><p className="text-2xl font-bold">{skills.length}</p><p className="text-xs text-muted-foreground">Skills Tracked</p></div></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3">
          <TabsList><TabsTrigger value="programs">Programs</TabsTrigger><TabsTrigger value="trainings">Employee Trainings</TabsTrigger><TabsTrigger value="skills">Skills Matrix</TabsTrigger><TabsTrigger value="competencies">Competency Map</TabsTrigger></TabsList>
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('common.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        </div>

        <TabsContent value="programs">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Program</TableHead><TableHead>Category</TableHead><TableHead>Trainer</TableHead><TableHead>Max Participants</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Cost</TableHead></TableRow></TableHeader>
              <TableBody>
                {loadingP ? <TableRow><TableCell colSpan={6} className="text-center py-8">{t('common.loading')}</TableCell></TableRow> :
                programs.filter((p: any) => !search || p.title?.toLowerCase().includes(search.toLowerCase())).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell><Badge className={catColors[p.category] || ""}>{p.category}</Badge></TableCell>
                    <TableCell>{p.trainer || "-"}</TableCell>
                    <TableCell>{p.max_participants || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{p.status || "active"}</Badge></TableCell>
                    <TableCell>{p.cost?.toLocaleString() || "0"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="trainings">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>{t('hr.employee')}</TableHead><TableHead>Program</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Scheduled</TableHead><TableHead>Completed</TableHead><TableHead>Expiry</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
              <TableBody>
                {trainings.filter((t: any) => !search || (t.employees as any)?.first_name?.toLowerCase().includes(search.toLowerCase())).map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{(t.employees as any)?.first_name} {(t.employees as any)?.last_name}</TableCell>
                    <TableCell>{(t.training_programs as any)?.title || "-"}</TableCell>
                    <TableCell><Badge className={statusColors[t.status] || ""}>{t.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.scheduled_date ? format(new Date(t.scheduled_date), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.completed_date ? format(new Date(t.completed_date), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell className="text-sm">{t.expiry_date ? format(new Date(t.expiry_date), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell>{t.score ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Skill</TableHead><TableHead>Category</TableHead><TableHead>{t('hr.department')}</TableHead><TableHead>Role</TableHead><TableHead>Required Level</TableHead><TableHead>{t('common.status')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {skills.filter((s: any) => !search || s.skill_name?.toLowerCase().includes(search.toLowerCase())).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.skill_name}</TableCell>
                    <TableCell><Badge className={catColors[s.skill_category] || ""}>{s.skill_category}</Badge></TableCell>
                    <TableCell>{s.department || "All"}</TableCell>
                    <TableCell>{s.role || "All"}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={s.required_level * 20} className="w-16 h-2" /><span className="text-sm">{s.required_level}/5</span></div></TableCell>
                    <TableCell>{s.is_active ? <Badge className="bg-green-500/20 text-green-400">{t('common.active')}</Badge> : <Badge variant="outline">{t('common.inactive')}</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="competencies">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>{t('hr.employee')}</TableHead><TableHead>Skill</TableHead><TableHead>Category</TableHead><TableHead>Current</TableHead><TableHead>Target</TableHead><TableHead>Gap</TableHead><TableHead>Certification</TableHead></TableRow></TableHeader>
              <TableBody>
                {competencies.filter((c: any) => !search || (c.employees as any)?.first_name?.toLowerCase().includes(search.toLowerCase())).map((c: any) => {
                  const gap = (c.target_level || 0) - (c.current_level || 0);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{(c.employees as any)?.first_name} {(c.employees as any)?.last_name}</TableCell>
                      <TableCell>{(c.competency_matrices as any)?.skill_name || "-"}</TableCell>
                      <TableCell><Badge className={catColors[(c.competency_matrices as any)?.skill_category] || ""}>{(c.competency_matrices as any)?.skill_category}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={(c.current_level || 0) * 20} className="w-16 h-2" /><span className="text-sm">{c.current_level}/5</span></div></TableCell>
                      <TableCell>{c.target_level}/5</TableCell>
                      <TableCell className={gap > 0 ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>{gap > 0 ? `-${gap}` : "✓"}</TableCell>
                      <TableCell><Badge className={c.certification_status === "certified" ? "bg-green-500/20 text-green-400" : c.certification_status === "expired" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"}>{c.certification_status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Program Dialog */}
      <Dialog open={programDialog} onOpenChange={setProgramDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Training Program</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Program Title</Label><Input value={programForm.title} onChange={e => setProgramForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Category</Label><Select value={programForm.category} onValueChange={v => setProgramForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="technical">Technical</SelectItem><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="leadership">Leadership</SelectItem></SelectContent></Select></div>
              <div><Label>Max Participants</Label><Input type="number" value={programForm.max_participants} onChange={e => setProgramForm(p => ({ ...p, max_participants: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Trainer</Label><Input value={programForm.trainer} onChange={e => setProgramForm(p => ({ ...p, trainer: e.target.value }))} /></div>
              <div><Label>Cost</Label><Input type="number" value={programForm.cost} onChange={e => setProgramForm(p => ({ ...p, cost: +e.target.value }))} /></div>
            </div>
            <div><Label>{t('common.description')}</Label><Textarea value={programForm.description} onChange={e => setProgramForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setProgramDialog(false)}>{t('common.cancel')}</Button><Button onClick={() => createProgram.mutate(programForm)} disabled={!programForm.title}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill Dialog */}
      <Dialog open={skillDialog} onOpenChange={setSkillDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Competency Skill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Skill Name</Label><Input value={skillForm.skill_name} onChange={e => setSkillForm(p => ({ ...p, skill_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Category</Label><Select value={skillForm.skill_category} onValueChange={v => setSkillForm(p => ({ ...p, skill_category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="technical">Technical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="leadership">Leadership</SelectItem><SelectItem value="general">General</SelectItem></SelectContent></Select></div>
              <div><Label>Required Level (1-5)</Label><Input type="number" min={1} max={5} value={skillForm.required_level} onChange={e => setSkillForm(p => ({ ...p, required_level: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('hr.department')}</Label><Input value={skillForm.department} onChange={e => setSkillForm(p => ({ ...p, department: e.target.value }))} placeholder="All" /></div>
              <div><Label>Role</Label><Input value={skillForm.role} onChange={e => setSkillForm(p => ({ ...p, role: e.target.value }))} placeholder="All" /></div>
            </div>
            <div><Label>{t('common.description')}</Label><Textarea value={skillForm.description} onChange={e => setSkillForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSkillDialog(false)}>{t('common.cancel')}</Button><Button onClick={() => createSkill.mutate(skillForm)} disabled={!skillForm.skill_name}>Add Skill</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
