import { useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCashierPermissions, usePermissionOverrides, useCreatePermissionRole, useUpdatePermissionRole, useCreateOverride } from "@/hooks/useCashierPermissions";
import { ShieldCheck, Plus, Users, Lock, Unlock, Settings } from "lucide-react";

const AdvancedCashierPermissions = () => {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("roles");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    role_name: "", role_name_ar: "", description: "",
    can_refund: false, refund_limit: 0, can_void: false, void_limit: 0,
    can_discount: false, max_discount_percent: 0, max_discount_amount: 0,
    can_price_override: false, price_override_limit_percent: 0,
    can_open_drawer: false, can_delete_draft: false, can_approve_return: false, return_limit: 0,
    can_close_shift: true, can_reopen_shift: false, can_credit_sale: false, credit_limit: 0,
    requires_manager_approval_above: 0,
  });

  const companyId = undefined as string | undefined;
  const { data: roles = [] } = useCashierPermissions(companyId);
  const { data: overrides = [] } = usePermissionOverrides(companyId);
  const createRole = useCreatePermissionRole();
  const updateRole = useUpdatePermissionRole();

  const permissionItems = [
    { key: "can_refund", label: isRTL ? "المرتجعات" : "Refunds", limitKey: "refund_limit" },
    { key: "can_void", label: isRTL ? "الإلغاء" : "Voids", limitKey: "void_limit" },
    { key: "can_discount", label: isRTL ? "الخصومات" : "Discounts", limitKey: "max_discount_percent", limitLabel: isRTL ? "% أقصى" : "Max %" },
    { key: "can_price_override", label: isRTL ? "تعديل السعر" : "Price Override", limitKey: "price_override_limit_percent" },
    { key: "can_open_drawer", label: isRTL ? "فتح الدرج" : "Open Drawer" },
    { key: "can_delete_draft", label: isRTL ? "حذف المسودة" : "Delete Draft" },
    { key: "can_approve_return", label: isRTL ? "الموافقة على المرتجع" : "Approve Return", limitKey: "return_limit" },
    { key: "can_close_shift", label: isRTL ? "إغلاق الوردية" : "Close Shift" },
    { key: "can_reopen_shift", label: isRTL ? "إعادة فتح الوردية" : "Reopen Shift" },
    { key: "can_credit_sale", label: isRTL ? "بيع آجل" : "Credit Sale", limitKey: "credit_limit" },
  ];

  return (
    
      <div className={`p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isRTL ? "صلاحيات الكاشير المتقدمة" : "Advanced Cashier Permissions"}</h1>
            <p className="text-muted-foreground">{isRTL ? "تحكم دقيق في صلاحيات نقاط البيع" : "Granular POS permission controls"}</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "دور جديد" : "New Role"}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isRTL ? "إنشاء دور صلاحيات" : "Create Permission Role"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isRTL ? "اسم الدور (EN)" : "Role Name (EN)"}</Label><Input value={form.role_name} onChange={e => setForm(p => ({ ...p, role_name: e.target.value }))} /></div>
                  <div><Label>{isRTL ? "اسم الدور (AR)" : "Role Name (AR)"}</Label><Input value={form.role_name_ar} onChange={e => setForm(p => ({ ...p, role_name_ar: e.target.value }))} /></div>
                </div>
                <div><Label>{isRTL ? "الوصف" : "Description"}</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                
                <div className="border rounded p-4 space-y-3">
                  <h3 className="font-semibold">{isRTL ? "الصلاحيات" : "Permissions"}</h3>
                  {permissionItems.map(pi => (
                    <div key={pi.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={(form as any)[pi.key]} onCheckedChange={v => setForm(p => ({ ...p, [pi.key]: v }))} />
                        <Label>{pi.label}</Label>
                      </div>
                      {pi.limitKey && (form as any)[pi.key] && (
                        <Input type="number" className="w-32" placeholder={pi.limitLabel || (isRTL ? "الحد" : "Limit")}
                          value={(form as any)[pi.limitKey]} onChange={e => setForm(p => ({ ...p, [pi.limitKey!]: Number(e.target.value) }))} />
                      )}
                    </div>
                  ))}
                </div>

                <div><Label>{isRTL ? "موافقة المدير فوق" : "Manager Approval Above (SAR)"}</Label>
                  <Input type="number" value={form.requires_manager_approval_above} onChange={e => setForm(p => ({ ...p, requires_manager_approval_above: Number(e.target.value) }))} />
                </div>

                <Button className="w-full" onClick={() => { createRole.mutate(form); setShowDialog(false); }}>{isRTL ? "إنشاء" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isRTL ? "أدوار الصلاحيات" : "Permission Roles"}</p><p className="text-2xl font-bold">{roles.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "استثناءات نشطة" : "Active Overrides"}</p><p className="text-2xl font-bold">{overrides.filter((o: any) => o.is_active).length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><Lock className="h-5 w-5 text-red-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "مقيّدة" : "Restricted"}</p><p className="text-2xl font-bold">{roles.filter((r: any) => !r.can_refund && !r.can_void).length}</p></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="roles">{isRTL ? "الأدوار" : "Roles"}</TabsTrigger>
            <TabsTrigger value="overrides">{isRTL ? "الاستثناءات" : "Overrides"}</TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "الدور" : "Role"}</TableHead>
                <TableHead>{isRTL ? "مرتجع" : "Refund"}</TableHead>
                <TableHead>{isRTL ? "إلغاء" : "Void"}</TableHead>
                <TableHead>{isRTL ? "خصم" : "Discount"}</TableHead>
                <TableHead>{isRTL ? "تعديل سعر" : "Price"}</TableHead>
                <TableHead>{isRTL ? "درج" : "Drawer"}</TableHead>
                <TableHead>{isRTL ? "آجل" : "Credit"}</TableHead>
                <TableHead>{isRTL ? "حد الموافقة" : "Approval Limit"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {roles.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{r.role_name}</div>{r.role_name_ar && <div className="text-xs text-muted-foreground">{r.role_name_ar}</div>}</TableCell>
                    <TableCell>{r.can_refund ? <Badge className="bg-green-100 text-green-800">✓ {r.refund_limit ? `≤${r.refund_limit}` : ""}</Badge> : <Badge variant="secondary">✗</Badge>}</TableCell>
                    <TableCell>{r.can_void ? <Badge className="bg-green-100 text-green-800">✓</Badge> : <Badge variant="secondary">✗</Badge>}</TableCell>
                    <TableCell>{r.can_discount ? <Badge className="bg-green-100 text-green-800">≤{r.max_discount_percent}%</Badge> : <Badge variant="secondary">✗</Badge>}</TableCell>
                    <TableCell>{r.can_price_override ? <Badge className="bg-green-100 text-green-800">✓</Badge> : <Badge variant="secondary">✗</Badge>}</TableCell>
                    <TableCell>{r.can_open_drawer ? <Unlock className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-red-500" />}</TableCell>
                    <TableCell>{r.can_credit_sale ? <Badge className="bg-green-100 text-green-800">≤{r.credit_limit}</Badge> : <Badge variant="secondary">✗</Badge>}</TableCell>
                    <TableCell>{r.requires_manager_approval_above ? `${r.requires_manager_approval_above} SAR` : "-"}</TableCell>
                    <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {roles.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "لا توجد أدوار بعد" : "No roles yet"}</CardContent></Card>}
          </TabsContent>

          <TabsContent value="overrides">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "الكاشير" : "Cashier"}</TableHead>
                <TableHead>{isRTL ? "نوع الاستثناء" : "Override Type"}</TableHead>
                <TableHead>{isRTL ? "الدور الأصلي" : "Base Role"}</TableHead>
                <TableHead>{isRTL ? "السبب" : "Reason"}</TableHead>
                <TableHead>{isRTL ? "صالح حتى" : "Valid Until"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {overrides.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.cashier_user_id?.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{o.override_type}</Badge></TableCell>
                    <TableCell>{o.pos_cashier_permissions?.role_name || "-"}</TableCell>
                    <TableCell>{o.reason || "-"}</TableCell>
                    <TableCell>{o.valid_until ? new Date(o.valid_until).toLocaleDateString() : (isRTL ? "غير محدد" : "Indefinite")}</TableCell>
                    <TableCell><Badge variant={o.is_active ? "default" : "secondary"}>{o.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "منتهي" : "Expired")}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {overrides.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "لا توجد استثناءات" : "No overrides yet"}</CardContent></Card>}
          </TabsContent>
        </Tabs>
      </div>
    
  );
};

export default AdvancedCashierPermissions;
