import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Search, FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-400",
  under_review: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  implemented: "bg-purple-500/20 text-purple-400",
};

const typeLabels: Record<string, string> = {
  addition: "Scope Addition",
  omission: "Scope Omission",
  modification: "Modification",
  substitution: "Substitution",
};

export default function VariationOrderControl() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    variation_number: "", title: "", description: "", variation_type: "addition",
    cost_impact: 0, revenue_impact: 0, boq_reference: "", scope_change_summary: "", justification: "",
  });

  const { data: variations = [], isLoading } = useQuery({
    queryKey: ["variation_orders", activeCompanyId],
    queryFn: async () => {
      const q = supabase.from("variation_orders").select("*").order("created_at", { ascending: false });
      if (activeCompanyId && activeCompanyId !== "all") q.eq("company_id", activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("variation_orders").insert({
        ...values,
        company_id: activeCompanyId === "all" ? null : activeCompanyId,
        margin_impact: values.revenue_impact - values.cost_impact,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["variation_orders"] }); setDialogOpen(false); toast.success("Variation order created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("variation_orders").update({ status, ...(status === "approved" ? { approved_date: new Date().toISOString().split("T")[0] } : {}) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["variation_orders"] }); toast.success("Status updated"); },
  });

  const filtered = variations.filter((v: any) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (search && !v.title?.toLowerCase().includes(search.toLowerCase()) && !v.variation_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCost = filtered.reduce((s: number, v: any) => s + (v.cost_impact || 0), 0);
  const totalRevenue = filtered.reduce((s: number, v: any) => s + (v.revenue_impact || 0), 0);
  const pending = filtered.filter((v: any) => ["submitted", "under_review"].includes(v.status)).length;

  return (
    <div className="space-y-6 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Variation & Change-Order Control</h1>
          <p className="text-sm text-muted-foreground">Manage scope changes with cost/revenue impact tracking</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Variation Order</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-xs text-muted-foreground">Total VOs</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-red-400" /><div><p className="text-2xl font-bold">{totalCost.toLocaleString()}</p><p className="text-xs text-muted-foreground">Cost Impact</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold">{totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Revenue Impact</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending Review</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search variations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>VO #</TableHead><TableHead>Title</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="text-right">Cost Impact</TableHead><TableHead className="text-right">Revenue Impact</TableHead><TableHead className="text-right">Net Margin</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8">{t('common.loading')}</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No variation orders found</TableCell></TableRow> :
              filtered.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm">{v.variation_number}</TableCell>
                  <TableCell className="font-medium">{v.title}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[v.variation_type] || v.variation_type}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[v.status]}>{v.status}</Badge></TableCell>
                  <TableCell className="text-right text-red-400">{(v.cost_impact || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-400">{(v.revenue_impact || 0).toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-semibold ${(v.margin_impact || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(v.margin_impact || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.requested_date ? format(new Date(v.requested_date), "dd MMM yyyy") : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {v.status === "draft" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: v.id, status: "submitted" })}>{t('common.submit')}</Button>}
                      {v.status === "submitted" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: v.id, status: "approved" })}><CheckCircle className="h-3 w-3" /></Button>}
                      {v.status === "submitted" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: v.id, status: "rejected" })}><XCircle className="h-3 w-3" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Variation Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>VO Number</Label><Input value={form.variation_number} onChange={e => setForm(p => ({ ...p, variation_number: e.target.value }))} placeholder="VO-001" /></div>
              <div><Label>{t('common.type')}</Label><Select value={form.variation_type} onValueChange={v => setForm(p => ({ ...p, variation_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="addition">Scope Addition</SelectItem><SelectItem value="omission">Scope Omission</SelectItem><SelectItem value="modification">Modification</SelectItem><SelectItem value="substitution">Substitution</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cost Impact</Label><Input type="number" value={form.cost_impact} onChange={e => setForm(p => ({ ...p, cost_impact: +e.target.value }))} /></div>
              <div><Label>Revenue Impact</Label><Input type="number" value={form.revenue_impact} onChange={e => setForm(p => ({ ...p, revenue_impact: +e.target.value }))} /></div>
            </div>
            <div><Label>BOQ Reference</Label><Input value={form.boq_reference} onChange={e => setForm(p => ({ ...p, boq_reference: e.target.value }))} /></div>
            <div><Label>Justification</Label><Textarea value={form.justification} onChange={e => setForm(p => ({ ...p, justification: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.variation_number}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
