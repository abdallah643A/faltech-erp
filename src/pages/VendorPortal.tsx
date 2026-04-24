import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, Mail, CheckCircle, Clock, Eye, FileText, Send, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from '@/contexts/LanguageContext';

export default function VendorPortal() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("invitations");
  const [form, setForm] = useState({ vendor_code: "", vendor_name: "", contact_email: "" });

  const { data: invitations = [], isLoading: loadingInv } = useQuery({
    queryKey: ["vendor_invitations", activeCompanyId],
    queryFn: async () => {
      const q = supabase.from("vendor_portal_invitations").select("*").order("created_at", { ascending: false });
      if (activeCompanyId && activeCompanyId !== "all") q.eq("company_id", activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: submissions = [], isLoading: loadingSub } = useQuery({
    queryKey: ["vendor_submissions", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendor_portal_submissions").select("*, vendor_portal_invitations(vendor_name, vendor_code)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("vendor_portal_invitations").insert({
        ...values,
        company_id: activeCompanyId === "all" ? null : activeCompanyId,
        access_token: crypto.randomUUID(),
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor_invitations"] }); setDialogOpen(false); toast.success("Invitation sent"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewSubmission = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vendor_portal_submissions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor_submissions"] }); toast.success("Submission reviewed"); },
  });

  const filteredInv = invitations.filter((i: any) => !search || i.vendor_name?.toLowerCase().includes(search.toLowerCase()) || i.contact_email?.toLowerCase().includes(search.toLowerCase()));
  const filteredSub = submissions.filter((s: any) => !search || (s.vendor_portal_invitations as any)?.vendor_name?.toLowerCase().includes(search.toLowerCase()));

  const activeCount = invitations.filter((i: any) => i.status === "active").length;
  const pendingCount = invitations.filter((i: any) => i.status === "pending").length;
  const submissionCount = submissions.filter((s: any) => s.status === "submitted").length;

  const invStatusColors: Record<string, string> = { pending: "bg-yellow-500/20 text-yellow-400", active: "bg-green-500/20 text-green-400", revoked: "bg-red-500/20 text-red-400" };
  const subStatusColors: Record<string, string> = { submitted: "bg-blue-500/20 text-blue-400", accepted: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400", under_review: "bg-yellow-500/20 text-yellow-400" };

  return (
    <div className="space-y-6 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Self-Service Portal</h1>
          <p className="text-sm text-muted-foreground">Manage vendor access, RFQ responses, and document submissions</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Invite Vendor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{invitations.length}</p><p className="text-xs text-muted-foreground">Total Vendors</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">{t('common.active')}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Mail className="h-8 w-8 text-yellow-400" /><div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">Pending Invites</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-blue-400" /><div><p className="text-2xl font-bold">{submissionCount}</p><p className="text-xs text-muted-foreground">New Submissions</p></div></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3">
          <TabsList><TabsTrigger value="invitations">Vendor Access</TabsTrigger><TabsTrigger value="submissions">Submissions</TabsTrigger></TabsList>
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('common.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        </div>

        <TabsContent value="invitations">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Code</TableHead><TableHead>{t('common.email')}</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Invited</TableHead><TableHead>Last Login</TableHead><TableHead>Permissions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loadingInv ? <TableRow><TableCell colSpan={7} className="text-center py-8">{t('common.loading')}</TableCell></TableRow> :
                filteredInv.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No vendors found</TableCell></TableRow> :
                filteredInv.map((i: any) => {
                  const perms = i.portal_permissions || {};
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.vendor_name}</TableCell>
                      <TableCell className="font-mono text-sm">{i.vendor_code}</TableCell>
                      <TableCell>{i.contact_email}</TableCell>
                      <TableCell><Badge className={invStatusColors[i.status] || ""}>{i.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.invited_at ? format(new Date(i.invited_at), "dd MMM yyyy") : "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.last_login_at ? format(new Date(i.last_login_at), "dd MMM yyyy HH:mm") : "Never"}</TableCell>
                      <TableCell><div className="flex gap-1">{perms.view_rfqs && <Badge variant="outline" className="text-xs">RFQs</Badge>}{perms.submit_quotes && <Badge variant="outline" className="text-xs">Quotes</Badge>}{perms.view_payments && <Badge variant="outline" className="text-xs">Payments</Badge>}</div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Reference</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Submitted</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {loadingSub ? <TableRow><TableCell colSpan={6} className="text-center py-8">{t('common.loading')}</TableCell></TableRow> :
                filteredSub.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No submissions found</TableCell></TableRow> :
                filteredSub.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{(s.vendor_portal_invitations as any)?.vendor_name || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{s.submission_type}</Badge></TableCell>
                    <TableCell>{s.reference_document || "-"}</TableCell>
                    <TableCell><Badge className={subStatusColors[s.status] || ""}>{s.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(s.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {s.status === "submitted" && <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => reviewSubmission.mutate({ id: s.id, status: "accepted" })}><CheckCircle className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => reviewSubmission.mutate({ id: s.id, status: "rejected" })}>Reject</Button>
                      </div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Vendor to Portal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Vendor Code</Label><Input value={form.vendor_code} onChange={e => setForm(p => ({ ...p, vendor_code: e.target.value }))} placeholder="V-001" /></div>
            <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
            <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="vendor@company.com" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => inviteMutation.mutate(form)} disabled={!form.vendor_code || !form.vendor_name || !form.contact_email}><Send className="h-4 w-4 mr-2" />Send Invitation</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
