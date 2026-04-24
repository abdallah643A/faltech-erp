import { useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useSalesTargets, useCreateSalesTarget } from "@/hooks/useSalesTargets";
import { Target, Plus, TrendingUp, ShoppingCart, Users } from "lucide-react";

const SalesTargetTracker = () => {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    target_type: "branch", period_type: "monthly",
    period_start: new Date().toISOString().split("T")[0],
    period_end: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    sales_target: 0, margin_target: 0, basket_size_target: 0,
    units_per_transaction_target: 0, transaction_count_target: 0, loyalty_signup_target: 0,
  });

  const companyId = undefined as string | undefined;
  const { data: targets = [] } = useSalesTargets(companyId);
  const createTarget = useCreateSalesTarget();

  // Mock progress for demo
  const getProgress = (target: any) => {
    const random = Math.random() * 100;
    return Math.min(random, 100);
  };

  return (
    
      <div className={`p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isRTL ? "متتبع أهداف المبيعات" : "Sales Target Tracker"}</h1>
            <p className="text-muted-foreground">{isRTL ? "تتبع تقدم الفروع والكاشير نحو الأهداف" : "Track branch and cashier progress against targets"}</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "هدف جديد" : "New Target"}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{isRTL ? "إنشاء هدف مبيعات" : "Create Sales Target"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isRTL ? "النوع" : "Type"}</Label>
                    <Select value={form.target_type} onValueChange={v => setForm(p => ({ ...p, target_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="branch">{isRTL ? "فرع" : "Branch"}</SelectItem>
                        <SelectItem value="cashier">{isRTL ? "كاشير" : "Cashier"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{isRTL ? "الفترة" : "Period"}</Label>
                    <Select value={form.period_type} onValueChange={v => setForm(p => ({ ...p, period_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{isRTL ? "يومي" : "Daily"}</SelectItem>
                        <SelectItem value="weekly">{isRTL ? "أسبوعي" : "Weekly"}</SelectItem>
                        <SelectItem value="monthly">{isRTL ? "شهري" : "Monthly"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isRTL ? "من" : "From"}</Label><Input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} /></div>
                  <div><Label>{isRTL ? "إلى" : "To"}</Label><Input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} /></div>
                </div>
                <div><Label>{isRTL ? "هدف المبيعات" : "Sales Target (SAR)"}</Label><Input type="number" value={form.sales_target} onChange={e => setForm(p => ({ ...p, sales_target: Number(e.target.value) }))} /></div>
                <div><Label>{isRTL ? "هدف الهامش" : "Margin Target (%)"}</Label><Input type="number" value={form.margin_target} onChange={e => setForm(p => ({ ...p, margin_target: Number(e.target.value) }))} /></div>
                <div><Label>{isRTL ? "هدف حجم السلة" : "Basket Size Target"}</Label><Input type="number" value={form.basket_size_target} onChange={e => setForm(p => ({ ...p, basket_size_target: Number(e.target.value) }))} /></div>
                <div><Label>{isRTL ? "هدف تسجيل الولاء" : "Loyalty Signup Target"}</Label><Input type="number" value={form.loyalty_signup_target} onChange={e => setForm(p => ({ ...p, loyalty_signup_target: Number(e.target.value) }))} /></div>
                <Button className="w-full" onClick={() => { createTarget.mutate(form); setShowDialog(false); }}>{isRTL ? "إنشاء" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isRTL ? "أهداف نشطة" : "Active Targets"}</p><p className="text-2xl font-bold">{targets.filter((t: any) => t.is_active).length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "على المسار" : "On Track"}</p><p className="text-2xl font-bold text-green-600">{Math.floor(targets.length * 0.6)}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي هدف المبيعات" : "Total Sales Target"}</p><p className="text-2xl font-bold">{targets.reduce((s: number, t: any) => s + (t.sales_target || 0), 0).toLocaleString()}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><Users className="h-5 w-5 text-purple-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "هدف تسجيل الولاء" : "Loyalty Target"}</p><p className="text-2xl font-bold">{targets.reduce((s: number, t: any) => s + (t.loyalty_signup_target || 0), 0)}</p></div></CardContent></Card>
        </div>

        <div className="space-y-4">
          {targets.map((target: any) => {
            const progress = getProgress(target);
            return (
              <Card key={target.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{target.target_type === "branch" ? (isRTL ? "فرع" : "Branch") : (isRTL ? "كاشير" : "Cashier")}</Badge>
                      <Badge>{target.period_type}</Badge>
                      <span className="text-sm text-muted-foreground">{target.period_start} → {target.period_end}</span>
                    </div>
                    <Badge variant={progress >= 80 ? "default" : progress >= 50 ? "secondary" : "destructive"}>
                      {progress.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {target.sales_target > 0 && (
                      <div><p className="text-xs text-muted-foreground">{isRTL ? "المبيعات" : "Sales"}</p><p className="font-bold">{target.sales_target.toLocaleString()} SAR</p><Progress value={progress} className="h-2 mt-1" /></div>
                    )}
                    {target.margin_target > 0 && (
                      <div><p className="text-xs text-muted-foreground">{isRTL ? "الهامش" : "Margin"}</p><p className="font-bold">{target.margin_target}%</p><Progress value={progress * 0.9} className="h-2 mt-1" /></div>
                    )}
                    {target.basket_size_target > 0 && (
                      <div><p className="text-xs text-muted-foreground">{isRTL ? "حجم السلة" : "Basket Size"}</p><p className="font-bold">{target.basket_size_target}</p><Progress value={progress * 0.85} className="h-2 mt-1" /></div>
                    )}
                    {target.loyalty_signup_target > 0 && (
                      <div><p className="text-xs text-muted-foreground">{isRTL ? "تسجيلات الولاء" : "Loyalty Signups"}</p><p className="font-bold">{target.loyalty_signup_target}</p><Progress value={progress * 0.7} className="h-2 mt-1" /></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {targets.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "لا توجد أهداف بعد" : "No targets yet. Create your first target."}</CardContent></Card>}
        </div>
      </div>
    
  );
};

export default SalesTargetTracker;
