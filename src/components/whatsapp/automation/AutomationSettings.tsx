import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Settings, Timer, RotateCcw, AlertTriangle, Bell, Save, Loader2, Clock, Globe, Trash
} from 'lucide-react';

interface AutoSettings {
  id: string;
  is_enabled: boolean;
  interval_minutes: number;
  start_time: string;
  end_time: string;
  max_retry_attempts: number;
  retry_intervals: number[];
  invoice_date_filter: string;
  default_channel: string;
  timezone: string;
  log_retention_days: number;
  alert_failure_threshold: number;
}

export function AutomationSettings() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { toast } = useToast();
  const [settings, setSettings] = useState<AutoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoice_automation_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings({
        ...data,
        retry_intervals: Array.isArray(data.retry_intervals) ? data.retry_intervals as number[] : [15, 30, 60, 180, 360],
      } as AutoSettings);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('invoice_automation_settings').update({
        is_enabled: settings.is_enabled,
        interval_minutes: settings.interval_minutes,
        start_time: settings.start_time,
        end_time: settings.end_time,
        max_retry_attempts: settings.max_retry_attempts,
        retry_intervals: settings.retry_intervals,
        invoice_date_filter: settings.invoice_date_filter,
        default_channel: settings.default_channel,
        timezone: settings.timezone,
        log_retention_days: settings.log_retention_days,
        alert_failure_threshold: settings.alert_failure_threshold,
        updated_at: new Date().toISOString(),
      }).eq('id', settings.id);

      if (error) throw error;
      toast({ title: isAr ? 'تم الحفظ' : 'Settings Saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof AutoSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading || !settings) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Automation Toggle */}
      <Card className={settings.is_enabled ? 'border-green-500/50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {isAr ? 'الجدولة التلقائية' : 'Automatic Scheduling'}
              </CardTitle>
              <CardDescription>
                {isAr ? 'تشغيل/إيقاف الإرسال التلقائي للفواتير' : 'Enable/disable automatic invoice sending'}
              </CardDescription>
            </div>
            <Switch checked={settings.is_enabled} onCheckedChange={(v) => update('is_enabled', v)} />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4" />
              {isAr ? 'إعدادات الجدولة' : 'Schedule Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{isAr ? 'الفاصل الزمني (دقائق)' : 'Interval (minutes)'}</Label>
              <Select value={String(settings.interval_minutes)} onValueChange={(v) => update('interval_minutes', parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="10">10 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? 'وقت البدء' : 'Start Time'}</Label>
                <Input type="time" value={settings.start_time} onChange={(e) => update('start_time', e.target.value)} />
              </div>
              <div>
                <Label>{isAr ? 'وقت الانتهاء' : 'End Time'}</Label>
                <Input type="time" value={settings.end_time} onChange={(e) => update('end_time', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{isAr ? 'فلتر تاريخ الفاتورة' : 'Invoice Date Filter'}</Label>
              <Select value={settings.invoice_date_filter} onValueChange={(v) => update('invoice_date_filter', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{isAr ? 'اليوم فقط' : 'Today Only'}</SelectItem>
                  <SelectItem value="7days">{isAr ? 'آخر 7 أيام' : 'Last 7 Days'}</SelectItem>
                  <SelectItem value="30days">{isAr ? 'آخر 30 يوم' : 'Last 30 Days'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? 'القناة الافتراضية' : 'Default Channel'}</Label>
              <Select value={settings.default_channel} onValueChange={(v) => update('default_channel', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">{isAr ? 'كلاهما' : 'Both'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Globe className="h-3 w-3" />{isAr ? 'المنطقة الزمنية' : 'Timezone'}</Label>
              <Select value={settings.timezone} onValueChange={(v) => update('timezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Riyadh">Asia/Riyadh (UTC+3)</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Retry Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {isAr ? 'إعدادات إعادة المحاولة' : 'Retry Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{isAr ? 'الحد الأقصى للمحاولات' : 'Max Retry Attempts'}</Label>
              <Input type="number" min={1} max={10} value={settings.max_retry_attempts} onChange={(e) => update('max_retry_attempts', parseInt(e.target.value) || 5)} />
            </div>
            <div>
              <Label>{isAr ? 'فواصل إعادة المحاولة (بالدقائق)' : 'Retry Intervals (minutes)'}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {isAr ? 'الفاصل الزمني بين كل محاولة' : 'Time gap between each retry attempt'}
              </p>
              {settings.retry_intervals.map((interval, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground w-20">{isAr ? 'المحاولة' : 'Attempt'} {idx + 1}:</span>
                  <Input
                    type="number"
                    value={interval}
                    onChange={(e) => {
                      const arr = [...settings.retry_intervals];
                      arr[idx] = parseInt(e.target.value) || 15;
                      update('retry_intervals', arr);
                    }}
                    className="w-24 h-8"
                  />
                  <span className="text-xs text-muted-foreground">{isAr ? 'دقيقة' : 'min'}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div>
              <Label className="flex items-center gap-1">
                <Bell className="h-3 w-3" />{isAr ? 'حد تنبيه الفشل %' : 'Failure Alert Threshold %'}
              </Label>
              <Input type="number" min={5} max={100} value={settings.alert_failure_threshold} onChange={(e) => update('alert_failure_threshold', parseFloat(e.target.value) || 20)} />
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'تنبيه عند تجاوز نسبة الفشل هذا الحد' : 'Alert when failure rate exceeds this threshold'}
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-1">
                <Trash className="h-3 w-3" />{isAr ? 'مدة الاحتفاظ بالسجلات (أيام)' : 'Log Retention (days)'}
              </Label>
              <Input type="number" min={7} max={365} value={settings.log_retention_days} onChange={(e) => update('log_retention_days', parseInt(e.target.value) || 30)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isAr ? 'حفظ الإعدادات' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
