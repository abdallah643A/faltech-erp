import { useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubscriptionPlans, useMemberships, useCreatePlan, useCreateMembership, useUpdateMembership } from "@/hooks/useSubscriptionBilling";
import { CreditCard, Users, RefreshCw, Plus, Pause, Play, XCircle } from "lucide-react";
import { format } from "date-fns";

const SubscriptionBilling = () => {
  const { t, language } = useLanguage();
  const { active_company_id: companyId } = useAuth();
  const isRTL = language === "ar";
  const [activeTab, setActiveTab] = useState("plans");
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ plan_name: "", billing_cycle: "monthly", price: 0, grace_period_days: 7, auto_renew: true });
  const [memberForm, setMemberForm] = useState({ customer_name: "", plan_id: "", auto_renew: true, payment_method: "manual" });
  const { data: plans = [] } = useSubscriptionPlans(companyId);
  const { data: memberships = [] } = useMemberships(companyId);
  const createPlan = useCreatePlan();
  const createMembership = useCreateMembership();
  const updateMembership = useUpdateMembership();

  const statusColors: Record<string, string> = { active: "bg-green-100 text-green-800", suspended: "bg-yellow-100 text-yellow-800", cancelled: "bg-red-100 text-red-800", expired: "bg-muted text-muted-foreground" };

  const stats = {
    totalActive: memberships.filter((m: any) => m.status === "active").length,
    totalSuspended: memberships.filter((m: any) => m.status === "suspended").length,
    totalRevenue: memberships.reduce((s: number, m: any) => s + (m.total_paid || 0), 0),
    autoRenew: memberships.filter((m: any) => m.auto_renew).length,
  };

  return (
    
      <div className={`p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isRTL ? "اشتراكات وعضويات" : "Subscription & Membership Billing"}</h1>
            <p className="text-muted-foreground">{isRTL ? "إدارة الخطط والعضويات المتكررة" : "Manage recurring plans and memberships"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isRTL ? "أعضاء نشطون" : "Active Members"}</p><p className="text-2xl font-bold">{stats.totalActive}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Pause className="h-5 w-5 text-yellow-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "معلّقون" : "Suspended"}</p><p className="text-2xl font-bold">{stats.totalSuspended}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</p><p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} SAR</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "تجديد تلقائي" : "Auto-Renew"}</p><p className="text-2xl font-bold">{stats.autoRenew}</p></div></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="plans">{isRTL ? "الخطط" : "Plans"}</TabsTrigger>
            <TabsTrigger value="memberships">{isRTL ? "العضويات" : "Memberships"}</TabsTrigger>
            <TabsTrigger value="billing">{isRTL ? "الفوترة" : "Billing"}</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "خطة جديدة" : "New Plan"}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{isRTL ? "إنشاء خطة اشتراك" : "Create Subscription Plan"}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>{isRTL ? "اسم الخطة" : "Plan Name"}</Label><Input value={planForm.plan_name} onChange={e => setPlanForm(p => ({ ...p, plan_name: e.target.value }))} /></div>
                    <div><Label>{isRTL ? "دورة الفوترة" : "Billing Cycle"}</Label>
                      <Select value={planForm.billing_cycle} onValueChange={v => setPlanForm(p => ({ ...p, billing_cycle: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">{isRTL ? "أسبوعي" : "Weekly"}</SelectItem>
                          <SelectItem value="monthly">{isRTL ? "شهري" : "Monthly"}</SelectItem>
                          <SelectItem value="quarterly">{isRTL ? "ربع سنوي" : "Quarterly"}</SelectItem>
                          <SelectItem value="yearly">{isRTL ? "سنوي" : "Yearly"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>{isRTL ? "السعر" : "Price"}</Label><Input type="number" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: Number(e.target.value) }))} /></div>
                    <div><Label>{isRTL ? "فترة السماح (أيام)" : "Grace Period (days)"}</Label><Input type="number" value={planForm.grace_period_days} onChange={e => setPlanForm(p => ({ ...p, grace_period_days: Number(e.target.value) }))} /></div>
                    <div className="flex items-center gap-2"><Switch checked={planForm.auto_renew} onCheckedChange={v => setPlanForm(p => ({ ...p, auto_renew: v }))} /><Label>{isRTL ? "تجديد تلقائي" : "Auto-Renew"}</Label></div>
                    <Button className="w-full" onClick={() => { createPlan.mutate(planForm); setShowPlanDialog(false); }}>{isRTL ? "إنشاء" : "Create"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan: any) => (
                <Card key={plan.id}>
                  <CardHeader><CardTitle className="flex items-center justify-between">{plan.plan_name}<Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}</Badge></CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">{plan.price} <span className="text-sm text-muted-foreground">{plan.currency}/{plan.billing_cycle}</span></p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>{isRTL ? "فترة السماح" : "Grace period"}: {plan.grace_period_days} {isRTL ? "يوم" : "days"}</p>
                      <p>{isRTL ? "تعليق بعد" : "Suspend after"}: {plan.suspension_after_days} {isRTL ? "يوم" : "days"}</p>
                      <p>{plan.auto_renew ? (isRTL ? "تجديد تلقائي" : "Auto-renew") : (isRTL ? "يدوي" : "Manual")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {plans.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">{isRTL ? "لا توجد خطط بعد" : "No plans yet"}</p>}
            </div>
          </TabsContent>

          <TabsContent value="memberships" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "عضوية جديدة" : "New Membership"}</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{isRTL ? "إنشاء عضوية" : "Create Membership"}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>{isRTL ? "اسم العميل" : "Customer Name"}</Label><Input value={memberForm.customer_name} onChange={e => setMemberForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
                    <div><Label>{isRTL ? "الخطة" : "Plan"}</Label>
                      <Select value={memberForm.plan_id} onValueChange={v => setMemberForm(p => ({ ...p, plan_id: v }))}>
                        <SelectTrigger><SelectValue placeholder={isRTL ? "اختر خطة" : "Select plan"} /></SelectTrigger>
                        <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>{isRTL ? "طريقة الدفع" : "Payment Method"}</Label>
                      <Select value={memberForm.payment_method} onValueChange={v => setMemberForm(p => ({ ...p, payment_method: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">{isRTL ? "يدوي" : "Manual"}</SelectItem>
                          <SelectItem value="auto_charge">{isRTL ? "خصم تلقائي" : "Auto-Charge"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={memberForm.auto_renew} onCheckedChange={v => setMemberForm(p => ({ ...p, auto_renew: v }))} /><Label>{isRTL ? "تجديد تلقائي" : "Auto-Renew"}</Label></div>
                    <Button className="w-full" onClick={() => { createMembership.mutate(memberForm); setShowMemberDialog(false); }}>{isRTL ? "إنشاء" : "Create"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "رقم العضوية" : "Membership #"}</TableHead>
                <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
                <TableHead>{isRTL ? "الخطة" : "Plan"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isRTL ? "تاريخ البدء" : "Start Date"}</TableHead>
                <TableHead>{isRTL ? "الفوترة القادمة" : "Next Billing"}</TableHead>
                <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {memberships.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono">{m.membership_number}</TableCell>
                    <TableCell>{m.customer_name}</TableCell>
                    <TableCell>{m.pos_subscription_plans?.plan_name || "-"}</TableCell>
                    <TableCell><Badge className={statusColors[m.status] || ""}>{m.status}</Badge></TableCell>
                    <TableCell>{m.start_date}</TableCell>
                    <TableCell>{m.next_billing_date || "-"}</TableCell>
                    <TableCell className="flex gap-1">
                      {m.status === "active" && <Button size="sm" variant="outline" onClick={() => updateMembership.mutate({ id: m.id, status: "suspended", suspension_date: new Date().toISOString().split("T")[0] })}><Pause className="h-3 w-3" /></Button>}
                      {m.status === "suspended" && <Button size="sm" variant="outline" onClick={() => updateMembership.mutate({ id: m.id, status: "active", suspension_date: null })}><Play className="h-3 w-3" /></Button>}
                      <Button size="sm" variant="destructive" onClick={() => updateMembership.mutate({ id: m.id, status: "cancelled", cancellation_date: new Date().toISOString().split("T")[0] })}><XCircle className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="billing">
            <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "سجل الفوترة والمعاملات" : "Billing history and transaction log"}<br />{isRTL ? "سيظهر هنا بعد تسجيل أول معاملة" : "Will appear here after the first transaction is recorded"}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    
  );
};

export default SubscriptionBilling;
