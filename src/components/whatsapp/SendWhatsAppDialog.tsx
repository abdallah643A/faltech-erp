import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageCircle, Send, Loader2, FileText, Eye, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppTemplate {
  id: string;
  name: string;
  message_text: string;
  is_default: boolean;
  document_type: string;
}

interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'ar_invoice' | 'sales_order' | 'quote';
  documentId: string;
  documentNumber: string;
  customerName: string;
  customerPhone?: string;
  total?: number;
  sapDocEntry?: string | null;
  preGeneratedPdfBase64?: string | null;
}

export function SendWhatsAppDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentNumber,
  customerName,
  customerPhone = '',
  total = 0,
  sapDocEntry,
  preGeneratedPdfBase64,
}: SendWhatsAppDialogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');
  const [phone, setPhone] = useState(customerPhone);
  const [message, setMessage] = useState('');
  const [configExists, setConfigExists] = useState(false);
  
  // PDF Preview state
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      checkConfig();
      setPhone(customerPhone);
      setPdfBase64(preGeneratedPdfBase64 || null);
      setShowPdfPreview(false);
    }
  }, [open, customerPhone, preGeneratedPdfBase64]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('document_type', documentType)
      .order('is_default', { ascending: false });

    if (data) {
      setTemplates(data as WhatsAppTemplate[]);
      const defaultTemplate = data.find((t: any) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        setMessage(replaceVariables(defaultTemplate.message_text));
      }
    }
  };

  const checkConfig = async () => {
    const { data } = await supabase
      .from('whatsapp_config')
      .select('is_active')
      .limit(1)
      .single();

    setConfigExists(data?.is_active || false);
  };

  const replaceVariables = (text: string): string => {
    return text
      .replace(/\{\{doc_num\}\}/g, documentNumber)
      .replace(/\{\{customer_name\}\}/g, customerName)
      .replace(/\{\{total\}\}/g, total.toLocaleString());
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'custom') {
      setMessage('');
    } else {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setMessage(replaceVariables(template.message_text));
      }
    }
  };

  const formatPhoneNumber = (phoneNum: string): string => {
    let cleaned = phoneNum.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+966' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const handlePreviewPdf = async () => {
    if (!sapDocEntry) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يجب مزامنة المستند مع SAP أولاً'
          : 'Document must be synced to SAP first',
        variant: 'destructive',
      });
      return;
    }

    setLoadingPdf(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('get-sap-pdf', {
        body: {
          documentType,
          sapDocEntry,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch PDF');
      }

      if (response.data?.pdfBase64) {
        setPdfBase64(response.data.pdfBase64);
        setShowPdfPreview(true);
      }
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `${documentType === 'ar_invoice' ? 'Invoice' : documentType === 'sales_order' ? 'SalesOrder' : 'Quote'}_${documentNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSend = async () => {
    if (!phone) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Please enter phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!message) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال الرسالة' : 'Please enter message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If we have a local PDF, upload it to storage first to avoid payload size limits
      let pdfStoragePath: string | null = null;
      if (pdfBase64) {
        try {
          const binaryStr = atob(pdfBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const storagePath = `whatsapp-temp/${documentType}_${documentNumber}_${Date.now()}.pdf`;
          
          const { error: uploadError } = await supabase.storage
            .from('project-documents')
            .upload(storagePath, blob, { contentType: 'application/pdf', upsert: true });
          
          if (!uploadError) {
            pdfStoragePath = storagePath;
          } else {
            console.warn('PDF upload failed, will send without PDF:', uploadError);
          }
        } catch (uploadErr) {
          console.warn('PDF upload error:', uploadErr);
        }
      }

      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          documentType,
          documentId,
          documentNumber,
          customerName,
          recipientPhone: formatPhoneNumber(phone),
          message,
          sapDocEntry,
          total,
          pdfStoragePath,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send WhatsApp message');
      }

      toast({
        title: language === 'ar' ? 'تم الإرسال' : 'Sent',
        description: language === 'ar' 
          ? 'تم إرسال الرسالة عبر واتساب بنجاح'
          : 'WhatsApp message sent successfully',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getDocTypeLabel = () => {
    const labels: Record<string, { en: string; ar: string }> = {
      ar_invoice: { en: 'A/R Invoice', ar: 'فاتورة مبيعات' },
      sales_order: { en: 'Sales Order', ar: 'أمر بيع' },
      quote: { en: 'Quote', ar: 'عرض سعر' },
    };
    return language === 'ar' ? labels[documentType].ar : labels[documentType].en;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" />
              {language === 'ar' ? 'إرسال عبر واتساب' : 'Send via WhatsApp'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? `إرسال ${getDocTypeLabel()} رقم ${documentNumber} كملف PDF`
                : `Send ${getDocTypeLabel()} #${documentNumber} as PDF`}
            </DialogDescription>
          </DialogHeader>

          {!configExists ? (
            <div className="py-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {language === 'ar' 
                  ? 'لم يتم إعداد WhatsApp بعد. يرجى تكوين إعدادات WhatsApp أولاً.'
                  : 'WhatsApp is not configured yet. Please configure WhatsApp settings first.'}
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/whatsapp-settings'}>
                {language === 'ar' ? 'الذهاب للإعدادات' : 'Go to Settings'}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Document Info with Preview Button */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{getDocTypeLabel()} #{documentNumber}</p>
                      <p className="text-sm text-muted-foreground">{customerName}</p>
                    </div>
                  </div>
                  {sapDocEntry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewPdf}
                      disabled={loadingPdf}
                      className="gap-1"
                    >
                      {loadingPdf ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {language === 'ar' ? 'معاينة' : 'Preview'}
                    </Button>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'رقم هاتف المستلم' : 'Recipient Phone Number'} *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 5XX XXX XXXX"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'أدخل رقم الهاتف مع رمز الدولة'
                      : 'Enter phone number with country code'}
                  </p>
                </div>

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'قالب الرسالة' : 'Message Template'}</Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        {language === 'ar' ? 'رسالة مخصصة' : 'Custom Message'}
                      </SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الرسالة' : 'Message'} *</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={language === 'ar' 
                      ? 'أدخل الرسالة التي سترسل مع ملف PDF...'
                      : 'Enter the message to send with the PDF...'}
                    rows={5}
                  />
                </div>

                {!sapDocEntry && (
                  <div className="p-3 rounded-lg bg-warning/10 text-warning text-sm">
                    {language === 'ar' 
                      ? '⚠️ هذا المستند غير مزامن مع SAP. سيتم إرسال الرسالة النصية فقط بدون ملف PDF.'
                      : '⚠️ This document is not synced to SAP. Only text message will be sent (no PDF attachment).'}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleSend} disabled={sending} className="gap-2">
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {language === 'ar' ? 'إرسال' : 'Send'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'معاينة PDF' : 'PDF Preview'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'تحميل' : 'Download'}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 h-full">
            {pdfBase64 && (
              <iframe
                src={`data:application/pdf;base64,${pdfBase64}`}
                className="w-full h-full rounded-lg border"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
