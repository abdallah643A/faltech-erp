import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageCircle,
  Plus,
  Save,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface WhatsAppConfig {
  id?: string;
  key_name: string;
  phone_number_id: string;
  business_account_id: string;
  instance_id: string;
  webhook_url: string;
  is_active: boolean;
  api_provider: '360dialog' | 'greenapi';
}

interface WhatsAppTemplate {
  id?: string;
  name: string;
  message_text: string;
  is_default: boolean;
  document_type: 'ar_invoice' | 'sales_order' | 'quote';
}

interface WhatsAppLog {
  id: string;
  document_type: string;
  document_number: string;
  recipient_phone: string;
  recipient_name: string;
  message_text: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
}

export default function WhatsAppSettings() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('config');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Config state
  const [config, setConfig] = useState<WhatsAppConfig>({
    key_name: 'default',
    phone_number_id: '',
    business_account_id: '',
    instance_id: '',
    webhook_url: '',
    is_active: false,
    api_provider: '360dialog',
  });

  // Templates state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<WhatsAppTemplate>({
    name: '',
    message_text: '',
    is_default: false,
    document_type: 'ar_invoice',
  });

  // Logs state
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configResult, templatesResult, logsResult] = await Promise.all([
        supabase.from('whatsapp_config').select('*').limit(1).single(),
        supabase.from('whatsapp_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('whatsapp_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (configResult.data) {
        setConfig({
          ...configResult.data,
          api_provider: (configResult.data.api_provider || '360dialog') as '360dialog' | 'greenapi',
        });
      }
      if (templatesResult.data) {
        setTemplates(templatesResult.data as WhatsAppTemplate[]);
      }
      if (logsResult.data) {
        setLogs(logsResult.data as WhatsAppLog[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    // Validate based on provider
    const isGreenApi = config.api_provider === 'greenapi';
    const requiredFields = isGreenApi 
      ? !config.instance_id
      : !config.phone_number_id;

    if (requiredFields) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (config.id) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update({
            key_name: config.key_name,
            phone_number_id: config.phone_number_id,
            business_account_id: config.business_account_id,
            instance_id: config.instance_id,
            webhook_url: config.webhook_url,
            is_active: config.is_active,
            api_provider: config.api_provider,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('whatsapp_config')
          .insert({
            key_name: config.key_name,
            phone_number_id: config.phone_number_id,
            business_account_id: config.business_account_id,
            instance_id: config.instance_id,
            webhook_url: config.webhook_url,
            is_active: config.is_active,
            api_provider: config.api_provider,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        setConfig({ ...config, id: data.id });
      }

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ إعدادات WhatsApp بنجاح' : 'WhatsApp settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    const template = editingTemplate || newTemplate;
    
    if (!template.name || !template.message_text) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editingTemplate?.id) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update({
            name: template.name,
            message_text: template.message_text,
            is_default: template.is_default,
            document_type: template.document_type,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert({
            name: template.name,
            message_text: template.message_text,
            is_default: template.is_default,
            document_type: template.document_type,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ القالب بنجاح' : 'Template saved successfully',
      });

      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      setNewTemplate({
        name: '',
        message_text: '',
        is_default: false,
        document_type: 'ar_invoice',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف القالب' : 'Template deleted',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-warning/10 text-warning', icon: <Clock className="h-3 w-3" /> },
      sent: { color: 'bg-info/10 text-info', icon: <CheckCircle2 className="h-3 w-3" /> },
      delivered: { color: 'bg-success/10 text-success', icon: <CheckCircle2 className="h-3 w-3" /> },
      read: { color: 'bg-success/10 text-success', icon: <Eye className="h-3 w-3" /> },
      failed: { color: 'bg-destructive/10 text-destructive', icon: <XCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} gap-1`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getDocTypeBadge = (type: string) => {
    const typeLabels: Record<string, { en: string; ar: string; color: string }> = {
      ar_invoice: { en: 'A/R Invoice', ar: 'فاتورة مبيعات', color: 'bg-primary/10 text-primary' },
      sales_order: { en: 'Sales Order', ar: 'أمر بيع', color: 'bg-info/10 text-info' },
      quote: { en: 'Quote', ar: 'عرض سعر', color: 'bg-warning/10 text-warning' },
    };

    const label = typeLabels[type] || { en: type, ar: type, color: 'bg-muted text-muted-foreground' };
    return (
      <Badge className={label.color}>
        {language === 'ar' ? label.ar : label.en}
      </Badge>
    );
  };

  const handleResendMessage = async (log: WhatsAppLog) => {
    if (!log.message_text) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'لا يمكن إعادة إرسال هذه الرسالة' : 'Cannot resend this message',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          documentType: log.document_type,
          documentId: log.id,
          documentNumber: log.document_number,
          customerName: log.recipient_name || '',
          recipientPhone: log.recipient_phone,
          message: log.message_text,
          sapDocEntry: null, // We don't have this info, will send text only
          total: 0,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to resend');
      }

      toast({
        title: language === 'ar' ? 'تم الإرسال' : 'Sent',
        description: language === 'ar' 
          ? 'تم إعادة إرسال الرسالة بنجاح'
          : 'Message resent successfully',
      });

      // Refresh logs
      fetchData();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-success" />
            {language === 'ar' ? 'إعدادات واتساب' : 'WhatsApp Settings'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'إعداد WhatsApp Business API لإرسال المستندات'
              : 'Configure WhatsApp Business API for document sharing'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">
            {language === 'ar' ? 'الإعدادات' : 'Configuration'}
          </TabsTrigger>
          <TabsTrigger value="templates">
            {language === 'ar' ? 'قوالب الرسائل' : 'Message Templates'}
          </TabsTrigger>
          <TabsTrigger value="logs">
            {language === 'ar' ? 'سجل الإرسال' : 'Send History'}
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {language === 'ar' ? 'إعدادات WhatsApp API' : 'WhatsApp API Settings'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'اختر مزود WhatsApp API وأدخل بيانات الاعتماد'
                  : 'Choose your WhatsApp API provider and enter credentials'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'مزود API' : 'API Provider'}</Label>
                <Select
                  value={config.api_provider}
                  onValueChange={(value: '360dialog' | 'greenapi') => 
                    setConfig({ ...config, api_provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="360dialog">
                      360dialog (Production)
                    </SelectItem>
                    <SelectItem value="greenapi">
                      Green API (Testing)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {config.api_provider === 'greenapi' 
                    ? (language === 'ar' ? 'Green API مناسب للتطوير والاختبار' : 'Green API is suitable for development and testing')
                    : (language === 'ar' ? '360dialog للإنتاج مع WhatsApp Business API الرسمي' : '360dialog for production with official WhatsApp Business API')
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {language === 'ar' ? 'اسم مفتاح السر' : 'Secret Key Name'}
                  </Label>
                  <Input
                    value={config.key_name}
                    onChange={(e) => setConfig({ ...config, key_name: e.target.value })}
                    placeholder="default"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'يتم تخزين مفتاح API في إعدادات السر الآمنة. اتصل بالمسؤول لتحديثه.'
                      : 'API key is stored in secure secrets. Contact admin to update it.'}
                  </p>
                </div>

                {config.api_provider === 'greenapi' ? (
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'معرف المثيل (Instance ID)' : 'Instance ID'} *</Label>
                    <Input
                      value={config.instance_id}
                      onChange={(e) => setConfig({ ...config, instance_id: e.target.value })}
                      placeholder="1234567890"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'معرف المثيل من Green API' : 'Instance ID from Green API'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'معرف رقم الهاتف' : 'Phone Number ID'} *</Label>
                    <Input
                      value={config.phone_number_id}
                      onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>
                )}

                {config.api_provider === '360dialog' && (
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'معرف حساب الأعمال' : 'Business Account ID'}</Label>
                    <Input
                      value={config.business_account_id}
                      onChange={(e) => setConfig({ ...config, business_account_id: e.target.value })}
                      placeholder="1234567890"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'رابط Webhook' : 'Webhook URL'}</Label>
                  <Input
                    value={config.webhook_url || `https://aehmctdgiapuygcqlcky.supabase.co/functions/v1/whatsapp-webhook`}
                    onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                    placeholder="https://your-domain.com/webhook"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'لاستقبال تحديثات حالة الرسائل (تم الإرسال، تم التسليم، تمت القراءة)'
                      : 'For receiving message status updates (sent, delivered, read)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Switch
                  checked={config.is_active}
                  onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                />
                <div>
                  <Label>{language === 'ar' ? 'تفعيل إرسال واتساب' : 'Enable WhatsApp Sending'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'تفعيل أو تعطيل إرسال الرسائل عبر واتساب'
                      : 'Enable or disable WhatsApp message sending'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveConfig} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'دليل الإعداد' : 'Setup Guide'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">
                  {language === 'ar' ? '1. إنشاء حساب 360dialog' : '1. Create 360dialog Account'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'قم بزيارة 360dialog.com وأنشئ حساب WhatsApp Business API'
                    : 'Visit 360dialog.com and create a WhatsApp Business API account'}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">
                  {language === 'ar' ? '2. الحصول على مفتاح API' : '2. Get API Key'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'من لوحة تحكم 360dialog، انتقل إلى Settings > API Keys'
                    : 'From 360dialog dashboard, go to Settings > API Keys'}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">
                  {language === 'ar' ? '3. إعداد رقم الهاتف' : '3. Setup Phone Number'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'قم بتسجيل رقم هاتف الأعمال والحصول على معرف رقم الهاتف'
                    : 'Register your business phone number and get the Phone Number ID'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {language === 'ar' ? 'قوالب الرسائل' : 'Message Templates'}
            </h2>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTemplate(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'قالب جديد' : 'New Template'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate
                      ? (language === 'ar' ? 'تعديل القالب' : 'Edit Template')
                      : (language === 'ar' ? 'قالب جديد' : 'New Template')}
                  </DialogTitle>
                  <DialogDescription>
                    {language === 'ar' 
                      ? 'إنشاء قالب رسالة لإرسالها مع المستندات'
                      : 'Create a message template to send with documents'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'اسم القالب' : 'Template Name'} *</Label>
                    <Input
                      value={editingTemplate?.name || newTemplate.name}
                      onChange={(e) => {
                        if (editingTemplate) {
                          setEditingTemplate({ ...editingTemplate, name: e.target.value });
                        } else {
                          setNewTemplate({ ...newTemplate, name: e.target.value });
                        }
                      }}
                      placeholder={language === 'ar' ? 'مثال: رسالة الفاتورة' : 'e.g., Invoice Message'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'نوع المستند' : 'Document Type'}</Label>
                    <Select
                      value={editingTemplate?.document_type || newTemplate.document_type}
                      onValueChange={(value: 'ar_invoice' | 'sales_order' | 'quote') => {
                        if (editingTemplate) {
                          setEditingTemplate({ ...editingTemplate, document_type: value });
                        } else {
                          setNewTemplate({ ...newTemplate, document_type: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar_invoice">
                          {language === 'ar' ? 'فاتورة مبيعات' : 'A/R Invoice'}
                        </SelectItem>
                        <SelectItem value="sales_order">
                          {language === 'ar' ? 'أمر بيع' : 'Sales Order'}
                        </SelectItem>
                        <SelectItem value="quote">
                          {language === 'ar' ? 'عرض سعر' : 'Quote'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'نص الرسالة' : 'Message Text'} *</Label>
                    <Textarea
                      value={editingTemplate?.message_text || newTemplate.message_text}
                      onChange={(e) => {
                        if (editingTemplate) {
                          setEditingTemplate({ ...editingTemplate, message_text: e.target.value });
                        } else {
                          setNewTemplate({ ...newTemplate, message_text: e.target.value });
                        }
                      }}
                      placeholder={language === 'ar' 
                        ? 'السلام عليكم،\nمرفق الفاتورة رقم {{doc_num}} بقيمة {{total}} ريال.\nشكراً لتعاملكم معنا.'
                        : 'Hello,\nPlease find attached Invoice #{{doc_num}} for {{total}} SAR.\nThank you for your business.'}
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' 
                        ? 'استخدم {{doc_num}}, {{customer_name}}, {{total}} للمتغيرات'
                        : 'Use {{doc_num}}, {{customer_name}}, {{total}} for variables'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingTemplate?.is_default || newTemplate.is_default}
                      onCheckedChange={(checked) => {
                        if (editingTemplate) {
                          setEditingTemplate({ ...editingTemplate, is_default: checked });
                        } else {
                          setNewTemplate({ ...newTemplate, is_default: checked });
                        }
                      }}
                    />
                    <Label>{language === 'ar' ? 'قالب افتراضي' : 'Default Template'}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSaveTemplate} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'نوع المستند' : 'Document Type'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الرسالة' : 'Message'}</TableHead>
                  <TableHead>{language === 'ar' ? 'افتراضي' : 'Default'}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد قوالب. أضف قالب جديد.' : 'No templates. Add a new template.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{getDocTypeBadge(template.document_type)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{template.message_text}</TableCell>
                      <TableCell>
                        {template.is_default && (
                          <Badge variant="secondary">
                            {language === 'ar' ? 'افتراضي' : 'Default'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTemplate(template);
                              setIsTemplateDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => template.id && handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'سجل الرسائل المرسلة' : 'Sent Messages Log'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'عرض سجل جميع الرسائل المرسلة عبر واتساب'
                  : 'View history of all WhatsApp messages sent'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المستند' : 'Document'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المستلم' : 'Recipient'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="w-[100px]">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد رسائل مرسلة' : 'No messages sent yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getDocTypeBadge(log.document_type)}
                            <span className="text-sm font-mono">{log.document_number}</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.recipient_name || '-'}</TableCell>
                        <TableCell className="font-mono">{log.recipient_phone}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(log.status)}
                            {log.error_message && (
                              <span className="text-xs text-destructive truncate max-w-[150px]" title={log.error_message}>
                                {log.error_message}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleResendMessage(log)}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {language === 'ar' ? 'إعادة' : 'Retry'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
