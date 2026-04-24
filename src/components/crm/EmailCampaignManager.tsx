import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, Send, Eye, MousePointer, Clock, Play, Pause, Plus, BarChart3 } from 'lucide-react';

const labels: Record<string, Record<string, string>> = {
  en: { title: 'Email Campaign Manager', subtitle: 'Create and manage automated email sequences', campaigns: 'Campaigns', analytics: 'Analytics', create: 'New Campaign', name: 'Campaign', status: 'Status', sent: 'Sent', opened: 'Opened', clicked: 'Clicked', openRate: 'Open Rate', clickRate: 'Click Rate', active: 'Active', paused: 'Paused', draft: 'Draft', completed: 'Completed', totalSent: 'Total Sent', avgOpen: 'Avg Open Rate', avgClick: 'Avg Click Rate', activeCampaigns: 'Active Campaigns', steps: 'steps', recipients: 'recipients' },
  ar: { title: 'مدير حملات البريد', subtitle: 'إنشاء وإدارة تسلسلات البريد الإلكتروني', campaigns: 'الحملات', analytics: 'التحليلات', create: 'حملة جديدة', name: 'الحملة', status: 'الحالة', sent: 'مُرسل', opened: 'مفتوح', clicked: 'نقر', openRate: 'معدل الفتح', clickRate: 'معدل النقر', active: 'نشطة', paused: 'متوقفة', draft: 'مسودة', completed: 'مكتملة', totalSent: 'إجمالي المُرسل', avgOpen: 'متوسط الفتح', avgClick: 'متوسط النقر', activeCampaigns: 'حملات نشطة', steps: 'خطوات', recipients: 'مستلمين' },
  ur: { title: 'ای میل مہم مینیجر', subtitle: 'خودکار ای میل سیکوئنسز بنائیں اور منظم کریں', campaigns: 'مہمات', analytics: 'تجزیات', create: 'نئی مہم', name: 'مہم', status: 'حالت', sent: 'بھیجا', opened: 'کھولا', clicked: 'کلک', openRate: 'کھولنے کی شرح', clickRate: 'کلک شرح', active: 'فعال', paused: 'رکا ہوا', draft: 'مسودہ', completed: 'مکمل', totalSent: 'کل بھیجے', avgOpen: 'اوسط کھولنے کی شرح', avgClick: 'اوسط کلک شرح', activeCampaigns: 'فعال مہمات', steps: 'مراحل', recipients: 'وصول کنندگان' },
  hi: { title: 'ईमेल अभियान प्रबंधक', subtitle: 'स्वचालित ईमेल अनुक्रम बनाएं और प्रबंधित करें', campaigns: 'अभियान', analytics: 'विश्लेषण', create: 'नया अभियान', name: 'अभियान', status: 'स्थिति', sent: 'भेजा', opened: 'खोला', clicked: 'क्लिक', openRate: 'खुलने की दर', clickRate: 'क्लिक दर', active: 'सक्रिय', paused: 'रुका', draft: 'ड्राफ्ट', completed: 'पूर्ण', totalSent: 'कुल भेजे', avgOpen: 'औसत खुलने की दर', avgClick: 'औसत क्लिक दर', activeCampaigns: 'सक्रिय अभियान', steps: 'चरण', recipients: 'प्राप्तकर्ता' },
};

const mockCampaigns = [
  { id: '1', name: 'New Lead Welcome Sequence', status: 'active' as const, steps: 5, recipients: 234, sent: 1170, opened: 842, clicked: 198 },
  { id: '2', name: 'Product Launch Announcement', status: 'completed' as const, steps: 3, recipients: 1500, sent: 4500, opened: 2700, clicked: 675 },
  { id: '3', name: 'Quarterly Newsletter', status: 'active' as const, steps: 1, recipients: 3200, sent: 3200, opened: 1920, clicked: 480 },
  { id: '4', name: 'Re-engagement Campaign', status: 'paused' as const, steps: 4, recipients: 450, sent: 900, opened: 315, clicked: 63 },
  { id: '5', name: 'Onboarding Drip', status: 'draft' as const, steps: 7, recipients: 0, sent: 0, opened: 0, clicked: 0 },
];

export function EmailCampaignManager() {
  const { language } = useLanguage();
  const l = labels[language] || labels.en;

  const totalSent = mockCampaigns.reduce((s, c) => s + c.sent, 0);
  const totalOpened = mockCampaigns.reduce((s, c) => s + c.opened, 0);
  const totalClicked = mockCampaigns.reduce((s, c) => s + c.clicked, 0);
  const activeCamps = mockCampaigns.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold">{l.title}</h3><p className="text-sm text-muted-foreground">{l.subtitle}</p></div>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />{l.create}</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><Send className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">{l.totalSent}</span></div><p className="text-2xl font-bold">{totalSent.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><Eye className="h-3.5 w-3.5 text-success" /><span className="text-xs text-muted-foreground">{l.avgOpen}</span></div><p className="text-2xl font-bold text-success">{totalSent ? Math.round(totalOpened / totalSent * 100) : 0}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><MousePointer className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">{l.avgClick}</span></div><p className="text-2xl font-bold">{totalSent ? Math.round(totalClicked / totalSent * 100) : 0}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-1 mb-1"><Play className="h-3.5 w-3.5 text-warning" /><span className="text-xs text-muted-foreground">{l.activeCampaigns}</span></div><p className="text-2xl font-bold">{activeCamps}</p></CardContent></Card>
      </div>

      <div className="space-y-2">
        {mockCampaigns.map(c => {
          const openRate = c.sent ? Math.round(c.opened / c.sent * 100) : 0;
          const clickRate = c.sent ? Math.round(c.clicked / c.sent * 100) : 0;
          return (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.steps} {l.steps} · {c.recipients.toLocaleString()} {l.recipients}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {c.sent > 0 && (
                      <div className="flex gap-4 text-xs">
                        <span>{l.openRate}: <strong className="text-success">{openRate}%</strong></span>
                        <span>{l.clickRate}: <strong className="text-primary">{clickRate}%</strong></span>
                      </div>
                    )}
                    <Badge variant={c.status === 'active' ? 'default' : c.status === 'completed' ? 'secondary' : c.status === 'paused' ? 'outline' : 'secondary'}>
                      {c.status === 'active' && <Play className="h-3 w-3 mr-1" />}
                      {c.status === 'paused' && <Pause className="h-3 w-3 mr-1" />}
                      {l[c.status]}
                    </Badge>
                  </div>
                </div>
                {c.sent > 0 && <Progress value={openRate} className="h-1 mt-3" />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
