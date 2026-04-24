/**
 * Accounting Foundation Hub — single landing page surfacing all
 * controller-grade workflows added by the governance migration.
 */
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, Hash, Repeat, Building2, Layers,
  ClipboardCheck, History, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface Tile {
  id: string;
  icon: typeof CalendarClock;
  title: string; titleAr: string;
  desc: string;  descAr: string;
  to: string;
  group: 'governance' | 'automation' | 'consolidation' | 'audit';
}

const TILES: Tile[] = [
  { id: 'periods', icon: CalendarClock,
    title: 'Posting Periods', titleAr: 'فترات الترحيل',
    desc: 'Open, soft-close, and close fiscal periods. DB blocks postings into closed periods.',
    descAr: 'فتح وإقفال الفترات. قاعدة البيانات تمنع الترحيل في الفترات المقفلة.',
    to: '/accounting/periods', group: 'governance' },
  { id: 'numbering', icon: Hash,
    title: 'Numbering Series', titleAr: 'سلاسل الترقيم',
    desc: 'Atomic next-number allocation with prefix, range, and lock.',
    descAr: 'تخصيص الأرقام الذري مع البادئة والنطاق والقفل.',
    to: '/accounting/numbering', group: 'governance' },
  { id: 'close', icon: ClipboardCheck,
    title: 'Period-Close Checklist', titleAr: 'قائمة إقفال الفترة',
    desc: 'Reconciliations, accruals, and reviews per period with owners.',
    descAr: 'المطابقات والاستحقاقات والمراجعات لكل فترة.',
    to: '/accounting/period-close', group: 'governance' },

  { id: 'recurring', icon: Repeat,
    title: 'Recurring JEs', titleAr: 'القيود المتكررة',
    desc: 'Templates with monthly/quarterly schedules. Daily cron runs at 02:00 UTC.',
    descAr: 'قوالب جدولة شهرية/ربع سنوية. تشغيل تلقائي يومي.',
    to: '/accounting/recurring', group: 'automation' },

  { id: 'intercompany', icon: Building2,
    title: 'Intercompany', titleAr: 'بين الشركات',
    desc: 'Auto-mirror entries between companies with full traceability.',
    descAr: 'إنشاء قيد مرآة تلقائي بين الشركات مع التتبع الكامل.',
    to: '/accounting/intercompany', group: 'consolidation' },
  { id: 'eliminations', icon: Layers,
    title: 'Consolidation Eliminations', titleAr: 'استبعادات التوحيد',
    desc: 'Eliminate intercompany revenue, COGS, AR/AP at consolidation.',
    descAr: 'استبعاد الإيرادات والتكاليف والذمم بين الشركات.',
    to: '/accounting/eliminations', group: 'consolidation' },

  { id: 'postingLog', icon: History,
    title: 'Posting Audit Log', titleAr: 'سجل ترحيل القيود',
    desc: 'Append-only trail of every post, reversal, and period change.',
    descAr: 'سجل غير قابل للتعديل لكل ترحيل أو عكس أو تغيير فترة.',
    to: '/accounting/posting-log', group: 'audit' },
  { id: 'controller', icon: BarChart3,
    title: 'Controller Dashboard', titleAr: 'لوحة المراقب المالي',
    desc: 'KPIs across periods, postings, exceptions, and intercompany health.',
    descAr: 'مؤشرات الفترات والترحيلات والاستثناءات.',
    to: '/accounting/controller', group: 'audit' },
];

const GROUPS: Record<Tile['group'], { en: string; ar: string }> = {
  governance:    { en: 'Governance & Periods',     ar: 'الحوكمة والفترات' },
  automation:    { en: 'Automation',                ar: 'الأتمتة' },
  consolidation: { en: 'Intercompany & Consol',     ar: 'بين الشركات والتوحيد' },
  audit:         { en: 'Audit & Insight',           ar: 'التدقيق والرؤى' },
};

export default function AccountingHub() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const grouped = (Object.keys(GROUPS) as Tile['group'][]).map((g) => ({
    g, label: isAr ? GROUPS[g].ar : GROUPS[g].en,
    tiles: TILES.filter((t) => t.group === g),
  }));

  return (
    <div className="container mx-auto p-6 space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isAr ? 'أساس المحاسبة' : 'Accounting Foundation'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAr
            ? 'حوكمة قوية للقيود اليومية مع فترات ترحيل، ترقيم، أتمتة، توحيد، وتدقيق كامل.'
            : 'Hard-enforced JE governance with periods, numbering, automation, consolidation, and full audit.'}
        </p>
      </div>

      {grouped.map((g) => (
        <section key={g.g} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{g.label}</h2>
            <Badge variant="secondary">{g.tiles.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {g.tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.id}
                  role="button" tabIndex={0}
                  onClick={() => navigate(t.to)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(t.to); }}
                  className="cursor-pointer transition-colors hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{isAr ? t.titleAr : t.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{isAr ? t.descAr : t.desc}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
