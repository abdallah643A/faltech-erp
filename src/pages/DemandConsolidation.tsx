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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Layers, DollarSign, Package, TrendingUp, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from '@/contexts/LanguageContext';

export default function DemandConsolidation() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ group_name: "", consolidation_type: "by_item", item_code: "", item_description: "", estimated_savings: 0, notes: "" });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["demand_consolidation", activeCompanyId],
    queryFn: async () => {
      const q = supabase.from("demand_consolidation_groups").select("*").order("created_at", { ascending: false });
      if (activeCompanyId && activeCompanyId !== "all") q.eq("company_id", activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("demand_consolidation_groups").insert({ ...values, company_id: activeCompanyId === "all" ? null : activeCompanyId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["demand_consolidation"] }); setDialogOpen(false); toast.success("Consolidation group created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("demand_consolidation_groups").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["demand_consolidation"] }); toast.success("Status updated"); },
  });

  const filtered = groups.filter((g: any) => !search || g.group_name?.toLowerCase().includes(search.toLowerCase()) || g.item_code?.toLowerCase().includes(search.toLowerCase()));

  const totalSavings = groups.reduce((s: number, g: any) => s + (g.estimated_savings || 0), 0);
  const pendingCount = groups.filter((g: any) => g.status === "pending").length;
  const approvedCount = groups.filter((g: any) => g.status === "approved").length;

  const statusColors: Record<string, string> = { pending: "bg-yellow-500/20 text-yellow-400", approved: "bg-green-500/20 text-green-400", consolidated: "bg-blue-500/20 text-blue-400", cancelled: "bg-red-500/20 text-red-400" };

  return (
    <div className="space-y-6 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Procurement Demand Consolidation</h1>
          <p className="text-sm text-muted-foreground">Group and consolidate purchase requests for better pricing</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Group</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Layers className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{groups.length}</p><p className="text-xs text-muted-foreground">Total Groups</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Package className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">{t('common.pending')}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold">{approvedCount}</p><p className="text-xs text-muted-foreground">Approved</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-emerald-400" /><div><p className="text-2xl font-bold">{totalSavings.toLocaleString()}</p><p className="text-xs text-muted-foreground">Est. Savings</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Group Name</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Item</TableHead><TableHead>Total Qty</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="text-right">Est. Savings</TableHead><TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">{t('common.loading')}</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No consolidation groups found</TableCell></TableRow> :
              filtered.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.group_name}</TableCell>
                  <TableCell><Badge variant="outline">{g.consolidation_type === "by_item" ? "By Item" : g.consolidation_type === "by_supplier" ? "By Supplier" : "By Date"}</Badge></TableCell>
                  <TableCell>{g.item_code ? `${g.item_code} - ${g.item_description || ""}` : "-"}</TableCell>
                  <TableCell>{g.total_quantity || 0}</TableCell>
                  <TableCell><Badge className={statusColors[g.status] || ""}>{g.status}</Badge></TableCell>
                  <TableCell className="text-right text-emerald-400 font-semibold">{(g.estimated_savings || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {g.status === "pending" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: g.id, status: "approved" })}>Approve</Button>}
                      {g.status === "approved" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: g.id, status: "consolidated" })}>Create PO</Button>}
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
          <DialogHeader><DialogTitle>New Consolidation Group</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Group Name</Label><Input value={form.group_name} onChange={e => setForm(p => ({ ...p, group_name: e.target.value }))} placeholder="Q2 Steel Consolidation" /></div>
            <div><Label>Consolidation Type</Label><Select value={form.consolidation_type} onValueChange={v => setForm(p => ({ ...p, consolidation_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="by_item">By Item</SelectItem><SelectItem value="by_supplier">By Supplier</SelectItem><SelectItem value="by_date">By Delivery Date</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Item Code</Label><Input value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} /></div>
              <div><Label>Est. Savings</Label><Input type="number" value={form.estimated_savings} onChange={e => setForm(p => ({ ...p, estimated_savings: +e.target.value }))} /></div>
            </div>
            <div><Label>Item Description</Label><Input value={form.item_description} onChange={e => setForm(p => ({ ...p, item_description: e.target.value }))} /></div>
            <div><Label>{t('common.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => createMutation.mutate(form)} disabled={!form.group_name}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
