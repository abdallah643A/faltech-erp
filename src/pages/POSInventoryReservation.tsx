import { useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventoryReservations, useCreateReservation, useReleaseReservation, useConvertToSale } from "@/hooks/useInventoryReservations";
import { Package, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { format, differenceInHours } from "date-fns";

const POSInventoryReservation = () => {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    item_code: "", item_description: "", quantity: 1, customer_name: "", warehouse_code: "",
    source_type: "quotation", source_doc_number: "",
    expires_at: new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 16),
  });

  const companyId = undefined as string | undefined;
  const { data: reservations = [] } = useInventoryReservations(companyId);
  const createReservation = useCreateReservation();
  const releaseReservation = useReleaseReservation();
  const convertToSale = useConvertToSale();

  const stats = {
    active: reservations.filter((r: any) => r.status === "active").length,
    expired: reservations.filter((r: any) => r.status === "expired" || (r.status === "active" && new Date(r.expires_at) < new Date())).length,
    converted: reservations.filter((r: any) => r.converted_to_sale).length,
    totalQty: reservations.filter((r: any) => r.status === "active").reduce((s: number, r: any) => s + (r.quantity || 0), 0),
  };

  const getStatusBadge = (r: any) => {
    if (r.converted_to_sale) return <Badge className="bg-green-100 text-green-800">{isRTL ? "تم التحويل" : "Converted"}</Badge>;
    if (r.status === "released") return <Badge variant="secondary">{isRTL ? "محرر" : "Released"}</Badge>;
    if (r.status === "active" && new Date(r.expires_at) < new Date()) return <Badge variant="destructive">{isRTL ? "منتهي" : "Expired"}</Badge>;
    if (r.status === "active") return <Badge className="bg-blue-100 text-blue-800">{isRTL ? "نشط" : "Active"}</Badge>;
    return <Badge variant="outline">{r.status}</Badge>;
  };

  return (
    
      <div className={`p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isRTL ? "حجز المخزون للعروض" : "POS Inventory Reservation"}</h1>
            <p className="text-muted-foreground">{isRTL ? "حجز الأصناف من العروض والتسعيرات" : "Reserve items from quotes and layaway orders"}</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "حجز جديد" : "New Reservation"}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{isRTL ? "حجز مخزون" : "Reserve Inventory"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{isRTL ? "كود الصنف" : "Item Code"}</Label><Input value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} /></div>
                <div><Label>{isRTL ? "وصف الصنف" : "Item Description"}</Label><Input value={form.item_description} onChange={e => setForm(p => ({ ...p, item_description: e.target.value }))} /></div>
                <div><Label>{isRTL ? "الكمية" : "Quantity"}</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} /></div>
                <div><Label>{isRTL ? "العميل" : "Customer"}</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
                <div><Label>{isRTL ? "المستودع" : "Warehouse"}</Label><Input value={form.warehouse_code} onChange={e => setForm(p => ({ ...p, warehouse_code: e.target.value }))} /></div>
                <div><Label>{isRTL ? "ينتهي في" : "Expires At"}</Label><Input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => { createReservation.mutate({ ...form, expires_at: new Date(form.expires_at).toISOString() }); setShowDialog(false); }}>{isRTL ? "حجز" : "Reserve"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-2"><Package className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "حجوزات نشطة" : "Active"}</p><p className="text-2xl font-bold">{stats.active}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><Clock className="h-5 w-5 text-red-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "منتهية" : "Expired"}</p><p className="text-2xl font-bold">{stats.expired}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "محوّلة" : "Converted"}</p><p className="text-2xl font-bold">{stats.converted}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي محجوز" : "Total Qty Reserved"}</p><p className="text-2xl font-bold">{stats.totalQty}</p></div></CardContent></Card>
        </div>

        <Table>
          <TableHeader><TableRow>
            <TableHead>{isRTL ? "رقم الحجز" : "Reservation #"}</TableHead>
            <TableHead>{isRTL ? "الصنف" : "Item"}</TableHead>
            <TableHead>{isRTL ? "الكمية" : "Qty"}</TableHead>
            <TableHead>{isRTL ? "العميل" : "Customer"}</TableHead>
            <TableHead>{isRTL ? "المستودع" : "Warehouse"}</TableHead>
            <TableHead>{isRTL ? "ينتهي" : "Expires"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
            <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {reservations.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.reservation_number}</TableCell>
                <TableCell><div>{r.item_code}</div><div className="text-xs text-muted-foreground">{r.item_description}</div></TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.customer_name || "-"}</TableCell>
                <TableCell>{r.warehouse_code || "-"}</TableCell>
                <TableCell>{r.expires_at ? format(new Date(r.expires_at), "dd/MM HH:mm") : "-"}</TableCell>
                <TableCell>{getStatusBadge(r)}</TableCell>
                <TableCell className="flex gap-1">
                  {r.status === "active" && !r.converted_to_sale && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => convertToSale.mutate({ id: r.id, saleDocId: "" })}><CheckCircle className="h-3 w-3 mr-1" />{isRTL ? "بيع" : "Sell"}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => releaseReservation.mutate({ id: r.id, reason: "Manual release" })}><XCircle className="h-3 w-3" /></Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {reservations.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">{isRTL ? "لا توجد حجوزات" : "No reservations yet"}</CardContent></Card>}
      </div>
    
  );
};

export default POSInventoryReservation;
