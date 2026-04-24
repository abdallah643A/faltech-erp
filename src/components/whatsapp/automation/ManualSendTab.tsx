import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useARInvoices, ARInvoice } from '@/hooks/useARInvoices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  MessageCircle, Send, Loader2, Eye, FileText, Search, Mail, Zap
} from 'lucide-react';
import { WhatsAppInvoicePreview } from '@/components/whatsapp/WhatsAppInvoicePreview';

const DEFAULT_WELCOME_EN = `Dear {{customer_name}},

Please find attached your invoice #{{doc_num}} with a total amount of {{total}} SAR.

Thank you for your business!`;

const DEFAULT_WELCOME_AR = `عزيزي {{customer_name}}،

يسعدنا مشاركة فاتورتكم رقم #{{doc_num}} بمبلغ إجمالي {{total}} ريال سعودي.

شكراً لاختياركم لنا!`;

export function ManualSendTab() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { invoices, loading: invoicesLoading, fetchInvoiceWithLines } = useARInvoices();
  const { toast } = useToast();

  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);
  const [invoiceWithLines, setInvoiceWithLines] = useState<ARInvoice | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<string>('whatsapp');
  const [welcomeMessage, setWelcomeMessage] = useState(isAr ? DEFAULT_WELCOME_AR : DEFAULT_WELCOME_EN);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleSelectInvoice = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    setSelectedInvoice(inv);
    setLoadingDetails(true);

    const full = await fetchInvoiceWithLines(invoiceId);
    if (full) {
      setInvoiceWithLines(full);
      if (full.customer_id) {
        const { data: bp } = await supabase
          .from('business_partners')
          .select('phone, mobile, email')
          .eq('id', full.customer_id)
          .single();
        if (bp) {
          setPhone(bp.mobile || bp.phone || '');
          setEmail(bp.email || '');
        }
      }
    }
    setLoadingDetails(false);

    const msg = isAr ? DEFAULT_WELCOME_AR : DEFAULT_WELCOME_EN;
    setWelcomeMessage(
      msg.replace(/\{\{customer_name\}\}/g, inv.customer_name)
        .replace(/\{\{doc_num\}\}/g, String(inv.doc_num || ''))
        .replace(/\{\{total\}\}/g, String(inv.total?.toLocaleString() || '0'))
    );
  };

  const formatPhoneNumber = (phoneNum: string): string => {
    let cleaned = phoneNum.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) cleaned = '+966' + cleaned.substring(1);
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  const handleSend = async () => {
    if (!selectedInvoice) return;
    if (channel !== 'email' && !phone) { toast({ title: 'Error', description: 'Phone required', variant: 'destructive' }); return; }
    if (channel !== 'whatsapp' && !email) { toast({ title: 'Error', description: 'Email required', variant: 'destructive' }); return; }

    setSending(true);
    try {
      // Queue the invoice for sending
      const queueItems = [];
      if (channel === 'whatsapp' || channel === 'both') {
        queueItems.push({
          invoice_id: selectedInvoice.id,
          doc_num: selectedInvoice.doc_num,
          customer_name: selectedInvoice.customer_name,
          customer_code: selectedInvoice.customer_code,
          customer_phone: formatPhoneNumber(phone),
          channel: 'whatsapp',
          preferred_channel: channel,
          status: 'pending',
          amount: selectedInvoice.total,
        });
      }
      if (channel === 'email' || channel === 'both') {
        queueItems.push({
          invoice_id: selectedInvoice.id,
          doc_num: selectedInvoice.doc_num,
          customer_name: selectedInvoice.customer_name,
          customer_code: selectedInvoice.customer_code,
          customer_email: email,
          channel: 'email',
          preferred_channel: channel,
          status: 'pending',
          amount: selectedInvoice.total,
        });
      }

      const { error } = await supabase.from('invoice_send_queue').insert(queueItems);
      if (error) throw error;

      // Also trigger the existing whatsapp-invoice edge function for immediate WhatsApp send
      if (channel === 'whatsapp' || channel === 'both') {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke('whatsapp-invoice', {
          body: {
            invoiceId: selectedInvoice.id,
            docNum: selectedInvoice.doc_num,
            customerName: selectedInvoice.customer_name,
            customerCode: selectedInvoice.customer_code,
            recipientPhone: formatPhoneNumber(phone),
            welcomeMessage,
            sapDocEntry: selectedInvoice.sap_doc_entry,
            total: selectedInvoice.total,
          },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
      }

      toast({
        title: isAr ? 'تم الإرسال' : 'Queued Successfully',
        description: isAr ? `تم إرسال الفاتورة #${selectedInvoice.doc_num}` : `Invoice #${selectedInvoice.doc_num} queued for sending`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    !searchTerm ||
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(inv.doc_num).includes(searchTerm) ||
    inv.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const invoicePreviewData = invoiceWithLines ? {
    doc_num: invoiceWithLines.doc_num,
    doc_date: invoiceWithLines.doc_date,
    customer_name: invoiceWithLines.customer_name,
    customer_code: invoiceWithLines.customer_code,
    customer_phone: phone,
    subtotal: invoiceWithLines.subtotal || 0,
    discount_amount: invoiceWithLines.discount_amount || 0,
    tax_amount: invoiceWithLines.tax_amount || 0,
    total: invoiceWithLines.total || 0,
    lines: (invoiceWithLines.lines || []).map(l => ({
      line_num: l.line_num, item_code: l.item_code, description: l.description,
      quantity: l.quantity, unit_price: l.unit_price, unit: l.warehouse || 'PCS',
      discount_percent: l.discount_percent, line_total: l.line_total,
    })),
  } : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Invoice Selection */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {isAr ? 'اختر فاتورة' : 'Select Invoice'}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="max-h-[450px] overflow-y-auto space-y-2 p-3">
          {invoicesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filteredInvoices.slice(0, 50).map(inv => (
            <div key={inv.id} onClick={() => handleSelectInvoice(inv.id!)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedInvoice?.id === inv.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">#{inv.doc_num}</p>
                  <p className="text-xs text-muted-foreground">{inv.customer_name}</p>
                </div>
                <p className="text-sm font-semibold">{inv.total?.toLocaleString()} SAR</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{inv.doc_date}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Compose */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            {isAr ? 'إعداد الرسالة' : 'Compose & Send'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedInvoice ? (
            <>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="font-medium">{isAr ? 'فاتورة' : 'Invoice'} #{selectedInvoice.doc_num}</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.customer_name}</p>
                <p className="text-sm font-semibold mt-1">{selectedInvoice.total?.toLocaleString()} SAR</p>
              </div>

              <div>
                <Label>{isAr ? 'قناة الإرسال' : 'Delivery Channel'}</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp"><span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />WhatsApp</span></SelectItem>
                    <SelectItem value="email"><span className="flex items-center gap-1"><Mail className="h-3 w-3" />Email</span></SelectItem>
                    <SelectItem value="both"><span className="flex items-center gap-1"><Zap className="h-3 w-3" />{isAr ? 'كلاهما' : 'Both'}</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(channel === 'whatsapp' || channel === 'both') && (
                <div>
                  <Label>{isAr ? 'رقم هاتف العميل' : 'Customer Phone'} *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5XX XXX XXXX" dir="ltr" />
                </div>
              )}

              {(channel === 'email' || channel === 'both') && (
                <div>
                  <Label>{isAr ? 'بريد العميل' : 'Customer Email'} *</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" dir="ltr" />
                </div>
              )}

              <div>
                <Label>{isAr ? 'رسالة الترحيب' : 'Welcome Message'}</Label>
                <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={6} className="text-sm" />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreview(true)} disabled={loadingDetails} className="flex-1 gap-2">
                  {loadingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  {isAr ? 'معاينة' : 'Preview'}
                </Button>
                <Button onClick={handleSend} disabled={sending} className="flex-1 gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isAr ? 'إرسال' : 'Send'}
                </Button>
              </div>

              {progress && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm">{isAr ? 'جاري الإرسال...' : 'Sending...'} {progress.current}/{progress.total}</p>
                  <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>{isAr ? 'اختر فاتورة من القائمة' : 'Select an invoice from the list'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />{isAr ? 'معاينة الفاتورة' : 'Invoice Preview'}</DialogTitle>
          </DialogHeader>
          {invoicePreviewData && <WhatsAppInvoicePreview ref={previewRef} invoice={invoicePreviewData} welcomeMessage={welcomeMessage} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
