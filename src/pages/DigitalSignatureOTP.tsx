import { useState, useRef, useCallback } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDigitalSignatures, useCreateSignature, useVerifyOTP, generateOTP } from "@/hooks/useDigitalSignatures";
import { PenTool, Shield, Smartphone, Plus, CheckCircle, XCircle, Eye } from "lucide-react";

const DigitalSignatureOTP = () => {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("signatures");
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [form, setForm] = useState({
    transaction_type: "sale", transaction_reference: "", verification_method: "signature",
    signer_name: "", signer_role: "", otp_sent_to: "",
  });

  const companyId = undefined as string | undefined;
  const { data: signatures = [] } = useDigitalSignatures(companyId);
  const createSignature = useCreateSignature();
  const verifyOTP = useVerifyOTP();

  const stats = {
    total: signatures.length,
    verified: signatures.filter((s: any) => s.is_verified).length,
    pending: signatures.filter((s: any) => !s.is_verified).length,
    bySignature: signatures.filter((s: any) => s.verification_method === "signature").length,
    byOTP: signatures.filter((s: any) => s.verification_method === "otp").length,
  };

  // Canvas drawing handlers
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [isDrawing]);

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const handleSubmit = () => {
    const otp = generateOTP();
    const signatureData = form.verification_method === "signature" ? getSignatureData() : null;
    createSignature.mutate({
      ...form,
      signature_data: signatureData,
      otp_code: form.verification_method === "otp" || form.verification_method === "both" ? otp : null,
      otp_sent_at: form.verification_method !== "signature" ? new Date().toISOString() : null,
      is_verified: form.verification_method === "signature",
      verified_at: form.verification_method === "signature" ? new Date().toISOString() : null,
    });
    setShowDialog(false);
  };

  const txTypes = [
    { value: "sale", label: isRTL ? "بيع" : "Sale" },
    { value: "return", label: isRTL ? "مرتجع" : "Return" },
    { value: "refund", label: isRTL ? "استرداد" : "Refund" },
    { value: "credit_sale", label: isRTL ? "بيع آجل" : "Credit Sale" },
    { value: "delivery", label: isRTL ? "تسليم" : "Delivery" },
    { value: "warranty", label: isRTL ? "ضمان" : "Warranty" },
  ];

  return (
    
      <div className={`p-6 space-y-6 ${isRTL ? "rtl" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isRTL ? "التوقيع الرقمي وتأكيد OTP" : "Digital Signature & OTP"}</h1>
            <p className="text-muted-foreground">{isRTL ? "تأكيد المعاملات عالية القيمة" : "Secure verification for high-value transactions"}</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isRTL ? "تأكيد جديد" : "New Verification"}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{isRTL ? "إنشاء تأكيد" : "Create Verification"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isRTL ? "نوع المعاملة" : "Transaction Type"}</Label>
                    <Select value={form.transaction_type} onValueChange={v => setForm(p => ({ ...p, transaction_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{txTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{isRTL ? "طريقة التحقق" : "Method"}</Label>
                    <Select value={form.verification_method} onValueChange={v => setForm(p => ({ ...p, verification_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signature">{isRTL ? "توقيع" : "Signature"}</SelectItem>
                        <SelectItem value="otp">{isRTL ? "OTP" : "OTP"}</SelectItem>
                        <SelectItem value="both">{isRTL ? "كلاهما" : "Both"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>{isRTL ? "مرجع المعاملة" : "Reference"}</Label><Input value={form.transaction_reference} onChange={e => setForm(p => ({ ...p, transaction_reference: e.target.value }))} /></div>
                <div><Label>{isRTL ? "اسم الموقّع" : "Signer Name"}</Label><Input value={form.signer_name} onChange={e => setForm(p => ({ ...p, signer_name: e.target.value }))} /></div>
                {(form.verification_method === "signature" || form.verification_method === "both") && (
                  <div>
                    <Label>{isRTL ? "التوقيع" : "Signature Pad"}</Label>
                    <div className="border rounded p-1 bg-white">
                      <canvas ref={canvasRef} width={400} height={150} className="border rounded cursor-crosshair w-full"
                        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} />
                    </div>
                    <Button size="sm" variant="ghost" onClick={clearCanvas} className="mt-1">{isRTL ? "مسح" : "Clear"}</Button>
                  </div>
                )}
                {(form.verification_method === "otp" || form.verification_method === "both") && (
                  <div><Label>{isRTL ? "إرسال OTP إلى" : "Send OTP to"}</Label><Input value={form.otp_sent_to} onChange={e => setForm(p => ({ ...p, otp_sent_to: e.target.value }))} placeholder="+966..." /></div>
                )}
                <Button className="w-full" onClick={handleSubmit}>{isRTL ? "إنشاء وإرسال" : "Create & Send"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p><p className="text-2xl font-bold">{stats.total}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "مؤكّدة" : "Verified"}</p><p className="text-2xl font-bold text-green-600">{stats.verified}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><PenTool className="h-5 w-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "بالتوقيع" : "By Signature"}</p><p className="text-2xl font-bold">{stats.bySignature}</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-2"><Smartphone className="h-5 w-5 text-purple-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "بـ OTP" : "By OTP"}</p><p className="text-2xl font-bold">{stats.byOTP}</p></div></CardContent></Card>
        </div>

        <Table>
          <TableHeader><TableRow>
            <TableHead>{isRTL ? "النوع" : "Type"}</TableHead>
            <TableHead>{isRTL ? "المرجع" : "Reference"}</TableHead>
            <TableHead>{isRTL ? "الطريقة" : "Method"}</TableHead>
            <TableHead>{isRTL ? "الموقّع" : "Signer"}</TableHead>
            <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
            <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {signatures.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell><Badge variant="outline">{s.transaction_type}</Badge></TableCell>
                <TableCell>{s.transaction_reference || "-"}</TableCell>
                <TableCell><Badge>{s.verification_method === "signature" ? (isRTL ? "توقيع" : "Signature") : s.verification_method === "otp" ? "OTP" : (isRTL ? "كلاهما" : "Both")}</Badge></TableCell>
                <TableCell>{s.signer_name || "-"}</TableCell>
                <TableCell>{s.is_verified ? <Badge className="bg-green-100 text-green-800">{isRTL ? "مؤكّد" : "Verified"}</Badge> : <Badge variant="destructive">{isRTL ? "معلق" : "Pending"}</Badge>}</TableCell>
                <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {!s.is_verified && (s.verification_method === "otp" || s.verification_method === "both") && (
                    <Button size="sm" variant="outline" onClick={() => { setVerifyId(s.id); setOtpInput(""); }}>
                      <Shield className="h-3 w-3 mr-1" />{isRTL ? "تحقق" : "Verify"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* OTP Verify Dialog */}
        <Dialog open={!!verifyId} onOpenChange={() => setVerifyId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{isRTL ? "تحقق من OTP" : "Verify OTP"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{isRTL ? "أدخل رمز OTP" : "Enter OTP Code"}</Label><Input value={otpInput} onChange={e => setOtpInput(e.target.value)} maxLength={6} className="text-center text-2xl tracking-widest" /></div>
              <Button className="w-full" onClick={() => { if (verifyId) { verifyOTP.mutate({ id: verifyId, otpCode: otpInput }); setVerifyId(null); } }}>{isRTL ? "تأكيد" : "Verify"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    
  );
};

export default DigitalSignatureOTP;
