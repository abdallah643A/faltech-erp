import { useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useLayawayOrders, useLayawayPayments, useCreateLayaway, useUpdateLayaway, useRecordLayawayPayment } from "@/hooks/useLayaway";
import { ShoppingBag, Plus, DollarSign, Clock, AlertTriangle, CheckCircle } from "lucide-react";

const LayawayInstallments = () => {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [selectedLayaway, setSelectedLayaway] = useState<string | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", total_amount: 0, deposit_amount: 0,
    installment_count: 3, items: JSON.stringify([{ name: "Sample Item", qty: 1, price: 100 }]),
  });

  const companyId = undefined as string | undefined;
  const { data: orders = [] } = useLayawayOrders(companyId);
  const { data: payments = [] } = useLayawayPayments(selectedLayaway || undefined);
  const createLayaway = useCreateLayaway();
  const updateLayaway = useUpdateLayaway();
  const recordPayment = useRecordLayawayPayment();

  const stats = {
    active: orders.filter((o: any) => o.status === "active" || o.status === "pending_deposit").length,
    overdue: orders.filter((o: any) => (o.overdue_days || 0) > 0).length,
    released: orders.filter((o: any) => o.status === "released").length,
    totalOutstanding: orders.reduce((s: number, o: any) => s + (o.remaining_amount || 0), 0),
  };

  const statusColors: Record<string, string> = { pending_deposit: "bg-yellow-100 text-yellow-800", active: "bg-blue-100 text-blue-800", released: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800", overdue: "bg-orange-100 text-orange-800" };

  return (
    
      <div className={`p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isRTL ? "التقسيط والحجز المسبق" : "Layaway & Installment Sales"}</h1>
            <p className="text-muted-foreground">{isRTL ? "إدارة المبيعات بالتقسيط والحجز" : "Manage layaway orders and payment schedules"}</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "حجز جديد" : "New Layaway"}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{isRTL ? "إنشاء طلب تقسيط" : "Create Layaway Order"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{isRTL ? "اسم العميل" : "Customer Name"}</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
                <div><Label>{isRTL ? "هاتف العميل" : "Customer Phone"}</Label><Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} /></div>
                <div><Label>{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: Number(e.target.value) }))} /></div>
                <div><Label>{isRTL ? "مبلغ العربون" : "Deposit Amount"}</Label><Input type="number" value={form.deposit_amount} onChange={e => setForm(p => ({ ...p, deposit_amount: Number(e.target.value) }))} /></div>
                <div><Label>{isRTL ? "عدد الأقساط" : "Installment Count"}</Label><Input type="number" value={form.installment_count} onChange={e => setForm(p => ({ ...p, installment_count: Number(e.target.value) }))} /></div>
                <Button className="w-full" onClick={() => {
                  const remaining = form.total_amount - form.deposit_amount;
                  const installmentAmt = remaining / form.installment_count;
                  createLayaway.mutate({ ...form, remaining_amount: remaining, installment_amount: installmentAmt, items: JSON.parse(form.items) });
                  setShowDialog(false);
                }}>{isRTL ? "إنشاء" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "طلبات نشطة" : "Active"}</p><p className="text-2xl font-bold">{stats.active}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "متأخرة" : "Overdue"}</p><p className="text-2xl font-bold text-orange-600">{stats.overdue}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "مُفرج عنها" : "Released"}</p><p className="text-2xl font-bold">{stats.released}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isRTL ? "مستحقات معلقة" : "Outstanding"}</p><p className="text-2xl font-bold">{stats.totalOutstanding.toLocaleString()} SAR</p></div></CardContent></Card>
        </div>

        <Table>
          <TableHeader><TableRow>
            <TableHead>{isRTL ? "رقم الحجز" : "Layaway #"}</TableHead>
            <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
            <TableHead>{isRTL ? "الإجمالي" : "Total"}</TableHead>
            <TableHead>{isRTL ? "العربون" : "Deposit"}</TableHead>
            <TableHead>{isRTL ? "المتبقي" : "Remaining"}</TableHead>
            <TableHead>{isRTL ? "الأقساط" : "Installments"}</TableHead>
            <TableHead>{isRTL ? "التقدم" : "Progress"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
            <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.map((o: any) => {
              const paidPercent = o.total_amount > 0 ? ((o.total_amount - (o.remaining_amount || 0)) / o.total_amount) * 100 : 0;
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.layaway_number}</TableCell>
                  <TableCell><div>{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.customer_phone}</div></TableCell>
                  <TableCell>{o.total_amount?.toLocaleString()}</TableCell>
                  <TableCell>{o.deposit_amount?.toLocaleString()}</TableCell>
                  <TableCell>{o.remaining_amount?.toLocaleString()}</TableCell>
                  <TableCell>{o.installment_count}x {o.installment_amount?.toLocaleString()}</TableCell>
                  <TableCell><div className="w-20"><Progress value={paidPercent} className="h-2" /><span className="text-xs">{paidPercent.toFixed(0)}%</span></div></TableCell>
                  <TableCell><Badge className={statusColors[o.status] || ""}>{o.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    {(o.status === "active" || o.status === "pending_deposit") && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedLayaway(o.id); setPayAmount(o.installment_amount || 0); setShowPayDialog(true); }}>
                        <DollarSign className="h-3 w-3 mr-1" />{isRTL ? "دفع" : "Pay"}
                      </Button>
                    )}
                    {o.remaining_amount <= 0 && o.status !== "released" && (
                      <Button size="sm" onClick={() => updateLayaway.mutate({ id: o.id, status: "released", released_at: new Date().toISOString() })}>
                        <CheckCircle className="h-3 w-3 mr-1" />{isRTL ? "إفراج" : "Release"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{isRTL ? "تسجيل دفعة" : "Record Payment"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{isRTL ? "المبلغ" : "Amount"}</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} /></div>
              <Button className="w-full" onClick={() => {
                if (selectedLayaway) {
                  recordPayment.mutate({ layaway_id: selectedLayaway, amount: payAmount });
                  setShowPayDialog(false);
                }
              }}>{isRTL ? "تسجيل الدفعة" : "Record Payment"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    
  );
};

export default LayawayInstallments;
