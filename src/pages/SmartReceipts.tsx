import { useState } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReceiptTemplates, useCreateReceiptTemplate, useUpdateReceiptTemplate, useDeleteReceiptTemplate } from "@/hooks/useReceiptTemplates";
import { Receipt, Plus, Edit, Trash2, Eye, QrCode, Languages } from "lucide-react";

const SmartReceipts = () => {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [form, setForm] = useState({
    template_name: "", header_text: "", header_text_ar: "", footer_text: "", footer_text_ar: "",
    thank_you_message: "Thank you for your purchase!", thank_you_message_ar: "شكراً لتسوقكم معنا!",
    show_loyalty_summary: true, show_next_offer: true, show_feedback_qr: true, show_warranty_info: true,
    is_bilingual: true, paper_size: "80mm", feedback_url: "", return_policy_text: "", return_policy_text_ar: "",
  });

  const companyId = undefined as string | undefined;
  const { data: templates = [] } = useReceiptTemplates(companyId);
  const createTemplate = useCreateReceiptTemplate();
  const deleteTemplate = useDeleteReceiptTemplate();

  return (
    
      <div className={`p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isRTL ? "تخصيص الإيصالات الذكية" : "Smart Receipt Personalization"}</h1>
            <p className="text-muted-foreground">{isRTL ? "إدارة تصاميم وقوالب الإيصالات" : "Manage receipt layouts and templates"}</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "قالب جديد" : "New Template"}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{isRTL ? "إنشاء قالب إيصال" : "Create Receipt Template"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>{isRTL ? "اسم القالب" : "Template Name"}</Label><Input value={form.template_name} onChange={e => setForm(p => ({ ...p, template_name: e.target.value }))} /></div>
                <div><Label>{isRTL ? "نص الترويسة (EN)" : "Header (EN)"}</Label><Input value={form.header_text} onChange={e => setForm(p => ({ ...p, header_text: e.target.value }))} /></div>
                <div><Label>{isRTL ? "نص الترويسة (AR)" : "Header (AR)"}</Label><Input value={form.header_text_ar} onChange={e => setForm(p => ({ ...p, header_text_ar: e.target.value }))} /></div>
                <div><Label>{isRTL ? "رسالة الشكر (EN)" : "Thank You (EN)"}</Label><Textarea value={form.thank_you_message} onChange={e => setForm(p => ({ ...p, thank_you_message: e.target.value }))} /></div>
                <div><Label>{isRTL ? "رسالة الشكر (AR)" : "Thank You (AR)"}</Label><Textarea value={form.thank_you_message_ar} onChange={e => setForm(p => ({ ...p, thank_you_message_ar: e.target.value }))} /></div>
                <div><Label>{isRTL ? "رابط التقييم" : "Feedback URL"}</Label><Input value={form.feedback_url} onChange={e => setForm(p => ({ ...p, feedback_url: e.target.value }))} /></div>
                <div><Label>{isRTL ? "حجم الورق" : "Paper Size"}</Label><Input value={form.paper_size} onChange={e => setForm(p => ({ ...p, paper_size: e.target.value }))} /></div>
                <div className="col-span-2 grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2"><Switch checked={form.show_loyalty_summary} onCheckedChange={v => setForm(p => ({ ...p, show_loyalty_summary: v }))} /><Label>{isRTL ? "ملخص الولاء" : "Loyalty Summary"}</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.show_next_offer} onCheckedChange={v => setForm(p => ({ ...p, show_next_offer: v }))} /><Label>{isRTL ? "العرض التالي" : "Next Offer"}</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.show_feedback_qr} onCheckedChange={v => setForm(p => ({ ...p, show_feedback_qr: v }))} /><Label>{isRTL ? "QR تقييم" : "Feedback QR"}</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.show_warranty_info} onCheckedChange={v => setForm(p => ({ ...p, show_warranty_info: v }))} /><Label>{isRTL ? "معلومات الضمان" : "Warranty Info"}</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.is_bilingual} onCheckedChange={v => setForm(p => ({ ...p, is_bilingual: v }))} /><Label>{isRTL ? "ثنائي اللغة" : "Bilingual"}</Label></div>
                </div>
                <Button className="col-span-2" onClick={() => { createTemplate.mutate(form); setShowDialog(false); }}>{isRTL ? "إنشاء" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي القوالب" : "Total Templates"}</p><p className="text-2xl font-bold">{templates.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><Languages className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "ثنائي اللغة" : "Bilingual"}</p><p className="text-2xl font-bold">{templates.filter((t: any) => t.is_bilingual).length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><QrCode className="h-5 w-5 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "QR مفعّل" : "QR Enabled"}</p><p className="text-2xl font-bold">{templates.filter((t: any) => t.show_feedback_qr).length}</p></div></CardContent></Card>
        </div>

        <Table>
          <TableHeader><TableRow>
            <TableHead>{isRTL ? "اسم القالب" : "Template Name"}</TableHead>
            <TableHead>{isRTL ? "حجم الورق" : "Paper"}</TableHead>
            <TableHead>{isRTL ? "ثنائي اللغة" : "Bilingual"}</TableHead>
            <TableHead>{isRTL ? "ولاء" : "Loyalty"}</TableHead>
            <TableHead>{isRTL ? "QR" : "QR"}</TableHead>
            <TableHead>{isRTL ? "ضمان" : "Warranty"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
            <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {templates.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.template_name}</TableCell>
                <TableCell>{t.paper_size}</TableCell>
                <TableCell>{t.is_bilingual ? "✓" : "✗"}</TableCell>
                <TableCell>{t.show_loyalty_summary ? "✓" : "✗"}</TableCell>
                <TableCell>{t.show_feedback_qr ? "✓" : "✗"}</TableCell>
                <TableCell>{t.show_warranty_info ? "✓" : "✗"}</TableCell>
                <TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}</Badge></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewTemplate(t)}><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTemplate.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{isRTL ? "معاينة الإيصال" : "Receipt Preview"}</DialogTitle></DialogHeader>
            {previewTemplate && (
              <div className="border rounded p-4 space-y-3 text-sm font-mono bg-white text-black">
                <div className="text-center font-bold">{previewTemplate.header_text || "Company Name"}</div>
                {previewTemplate.is_bilingual && <div className="text-center font-bold">{previewTemplate.header_text_ar || "اسم الشركة"}</div>}
                <hr className="border-dashed" />
                <div className="text-center text-xs">Receipt #12345 | {new Date().toLocaleDateString()}</div>
                <hr className="border-dashed" />
                <div className="flex justify-between"><span>Sample Item x1</span><span>50.00</span></div>
                <hr className="border-dashed" />
                <div className="flex justify-between font-bold"><span>Total</span><span>50.00 SAR</span></div>
                <hr className="border-dashed" />
                {previewTemplate.show_loyalty_summary && <div className="text-center text-xs">⭐ Points earned: 50 | Balance: 250</div>}
                {previewTemplate.show_next_offer && <div className="text-center text-xs bg-yellow-50 p-1 rounded">🎁 Next visit: 10% off accessories!</div>}
                <div className="text-center text-xs italic">{previewTemplate.thank_you_message}</div>
                {previewTemplate.is_bilingual && <div className="text-center text-xs italic">{previewTemplate.thank_you_message_ar}</div>}
                {previewTemplate.show_feedback_qr && <div className="text-center text-xs">📱 [QR Code] Scan to rate us</div>}
                {previewTemplate.show_warranty_info && <div className="text-center text-xs">🛡️ Warranty: 12 months from purchase</div>}
                <div className="text-center text-xs text-muted-foreground">{previewTemplate.footer_text || "Thank you for shopping with us"}</div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    
  );
};

export default SmartReceipts;
