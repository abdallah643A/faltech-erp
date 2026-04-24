import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Save, Mail, Bell, FileText, AlertTriangle, Send, Server, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

interface MailConfig {
  id: string;
  from_name: string;
  from_email: string;
  reply_to_email: string | null;
  email_enabled: boolean;
  daily_overdue_report_enabled: boolean;
  workflow_notifications_enabled: boolean;
  escalation_notifications_enabled: boolean;
  quote_email_enabled: boolean;
  footer_text: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null;
  smtp_secure: boolean;
  use_custom_smtp: boolean;
  mail_provider: string;
  api_provider: string | null;
  api_key: string | null;
}

export default function MailConfiguration() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['mail-configuration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mail_configuration')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as MailConfig | null;
    },
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<MailConfig>();

  useEffect(() => {
    if (config) reset(config);
  }, [config, reset]);

  const updateMutation = useMutation({
    mutationFn: async (values: Partial<MailConfig>) => {
      const payload = {
        from_name: values.from_name,
        from_email: values.from_email,
        reply_to_email: values.reply_to_email || null,
        email_enabled: values.email_enabled,
        daily_overdue_report_enabled: values.daily_overdue_report_enabled,
        workflow_notifications_enabled: values.workflow_notifications_enabled,
        escalation_notifications_enabled: values.escalation_notifications_enabled,
        quote_email_enabled: values.quote_email_enabled,
        footer_text: values.footer_text || null,
        smtp_host: values.smtp_host || null,
        smtp_port: values.smtp_port || 587,
        smtp_username: values.smtp_username || null,
        smtp_password: values.smtp_password || null,
        smtp_secure: values.smtp_secure ?? true,
        use_custom_smtp: values.mail_provider === 'smtp',
        mail_provider: values.mail_provider || 'smtp',
        api_provider: values.api_provider || 'resend',
        api_key: values.api_key || null,
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        const { error } = await supabase
          .from('mail_configuration')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mail_configuration')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mail-configuration'] });
      toast({ title: 'Mail configuration saved successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Error saving configuration', description: err?.message, variant: 'destructive' });
    },
  });

  const onSubmit = (values: MailConfig) => {
    updateMutation.mutate(values);
  };

  const testEmail = async () => {
    if (!testRecipient) {
      toast({ title: 'Please enter a recipient email', variant: 'destructive' });
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-workflow-email', {
        body: { test: true, test_recipient: testRecipient },
      });
      if (error) {
        const errMsg = typeof error === 'object' && error.message ? error.message : String(error);
        throw new Error(errMsg);
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      toast({ title: 'Test email sent successfully', description: 'Sent to ' + testRecipient });
      setTestDialogOpen(false);
      setTestRecipient('');
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      let displayMessage = errorMessage;
      if (errorMessage.includes('Failed to send test email:')) {
        displayMessage = errorMessage.replace('Failed to send test email: ', '');
      }
      toast({
        title: 'Failed to send test email',
        description: displayMessage,
        variant: 'destructive'
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>;
  }

  const emailEnabled = watch('email_enabled') ?? config?.email_enabled ?? true;
  const mailProvider = watch('mail_provider') ?? config?.mail_provider ?? 'smtp';
  const apiProvider = watch('api_provider') ?? config?.api_provider ?? 'resend';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mail Configuration</h1>
          <p className="text-muted-foreground">Configure email settings for all system notifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Test Email
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test_recipient">Recipient Email</Label>
              <Input
                id="test_recipient"
                type="email"
                placeholder="recipient@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Enter the email address that will receive the test email</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={testEmail} disabled={sendingTest || !testRecipient}>
              <Send className="h-4 w-4 mr-2" />
              {sendingTest ? 'Sending...' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Mail Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Mail Provider
            </CardTitle>
            <CardDescription>
              Choose how emails are sent — via your own SMTP server or an API-based provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={mailProvider}
              onValueChange={(v) => {
                setValue('mail_provider', v, { shouldDirty: true });
                setValue('use_custom_smtp', v === 'smtp', { shouldDirty: true });
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  mailProvider === 'smtp' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <RadioGroupItem value="smtp" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="h-4 w-4 text-primary" />
                    <span className="font-medium">Custom SMTP</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect your own mail server (e.g. Office 365, Gmail SMTP, or any SMTP server)
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  mailProvider === 'api' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <RadioGroupItem value="api" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-medium">API Provider</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use an API-based email service (Resend, SendGrid, Mailgun) — easier setup, no SMTP needed
                  </p>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* SMTP Configuration - shown when SMTP selected */}
        {mailProvider === 'smtp' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure your SMTP server credentials (e.g. Office 365, Gmail)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input id="smtp_host" {...register('smtp_host')} placeholder="smtp.office365.com" />
                  <p className="text-xs text-muted-foreground">Office 365: smtp.office365.com</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input id="smtp_port" type="number" {...register('smtp_port', { valueAsNumber: true })} placeholder="587" />
                  <p className="text-xs text-muted-foreground">Office 365: 587 (STARTTLS)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_username">SMTP Username / Email</Label>
                  <Input id="smtp_username" {...register('smtp_username')} placeholder="yourmail@yourdomain.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">SMTP Password / App Password</Label>
                  <Input id="smtp_password" type="password" {...register('smtp_password')} placeholder="••••••••" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Use TLS/STARTTLS</p>
                  <p className="text-xs text-muted-foreground">Required for Office 365 (port 587)</p>
                </div>
                <Switch
                  checked={watch('smtp_secure') ?? true}
                  onCheckedChange={(v) => setValue('smtp_secure', v, { shouldDirty: true })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Provider Configuration - shown when API selected */}
        {mailProvider === 'api' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                API Provider Configuration
              </CardTitle>
              <CardDescription>
                Configure your API-based email service credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Service Provider</Label>
                <Select
                  value={apiProvider}
                  onValueChange={(v) => setValue('api_provider', v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {apiProvider === 'resend' && 'Get your API key from resend.com/api-keys'}
                  {apiProvider === 'sendgrid' && 'Get your API key from app.sendgrid.com/settings/api_keys'}
                  {apiProvider === 'mailgun' && 'Get your API key from app.mailgun.com/settings/api_security'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input id="api_key" type="password" {...register('api_key')} placeholder="Enter your API key" />
                <p className="text-xs text-muted-foreground">Your API key will be stored securely and used for sending emails</p>
              </div>
              {apiProvider === 'mailgun' && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> For Mailgun, the From Email below must be from a verified domain in your Mailgun account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sender Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Sender Settings
            </CardTitle>
            <CardDescription>
              Configure the sender name and email address used for all outgoing emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_name">From Name</Label>
                <Input id="from_name" {...register('from_name')} placeholder="AlrajhiCRM" />
                <p className="text-xs text-muted-foreground">Display name shown in recipient's inbox</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="from_email">From Email</Label>
                <Input id="from_email" type="email" {...register('from_email')} placeholder="noreply@yourdomain.com" />
                <p className="text-xs text-muted-foreground">
                  {mailProvider === 'smtp' ? 'Must match your SMTP username for Office 365' : 'Must be from a verified domain in your email provider'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply_to_email">Reply-To Email (Optional)</Label>
              <Input id="reply_to_email" type="email" {...register('reply_to_email')} placeholder="support@yourdomain.com" />
              <p className="text-xs text-muted-foreground">Where replies will be directed. Leave empty to use the From Email.</p>
            </div>
          </CardContent>
        </Card>

        {/* Master Switch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Email Notifications
            </CardTitle>
            <CardDescription>Enable or disable specific email notification categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Master Email Switch</p>
                <p className="text-sm text-muted-foreground">Enable or disable all outgoing emails system-wide</p>
              </div>
              <Switch
                checked={emailEnabled}
                onCheckedChange={(v) => setValue('email_enabled', v, { shouldDirty: true })}
              />
            </div>

            <Separator />

            <div className={!emailEnabled ? 'opacity-50 pointer-events-none' : ''}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="font-medium text-sm">Daily Overdue Report</p>
                      <p className="text-xs text-muted-foreground">Summary of overdue stages sent to managers daily</p>
                    </div>
                  </div>
                  <Switch
                    checked={watch('daily_overdue_report_enabled') ?? true}
                    onCheckedChange={(v) => setValue('daily_overdue_report_enabled', v, { shouldDirty: true })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="font-medium text-sm">Workflow Notifications</p>
                      <p className="text-xs text-muted-foreground">Phase transitions, task assignments, payment alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={watch('workflow_notifications_enabled') ?? true}
                    onCheckedChange={(v) => setValue('workflow_notifications_enabled', v, { shouldDirty: true })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="font-medium text-sm">SLA Escalation Emails</p>
                      <p className="text-xs text-muted-foreground">Escalation alerts to Region Manager, GM, and CEO</p>
                    </div>
                  </div>
                  <Switch
                    checked={watch('escalation_notifications_enabled') ?? true}
                    onCheckedChange={(v) => setValue('escalation_notifications_enabled', v, { shouldDirty: true })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Quote Emails</p>
                      <p className="text-xs text-muted-foreground">Send quotes to customers via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={watch('quote_email_enabled') ?? true}
                    onCheckedChange={(v) => setValue('quote_email_enabled', v, { shouldDirty: true })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Email Footer
            </CardTitle>
            <CardDescription>Custom footer text appended to all outgoing emails</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('footer_text')}
              placeholder="This is an automated email from AlrajhiCRM."

              rows={3}
            />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
