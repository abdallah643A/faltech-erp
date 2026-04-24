/**
 * Setup Hub — single landing page for the entire Administration & Setup
 * module. Replaces the legacy /setup/* redirects with a real, navigable
 * dashboard that surfaces every configuration sub-area in one place,
 * with bilingual labels (EN/AR) and direct links to the working pages.
 */
import { useNavigate } from 'react-router-dom';
import {
  Building2, GitBranch, MapPin, Calendar, Hash, ShieldCheck,
  Upload, Download, ListChecks, History, Settings, BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface Tile {
  id: string;
  icon: typeof Building2;
  title: string;
  titleAr: string;
  desc: string;
  descAr: string;
  to: string;
  category: 'organization' | 'finance' | 'security' | 'data' | 'operations';
}

const TILES: Tile[] = [
  // Organization
  { id: 'companies', icon: Building2, title: 'Companies', titleAr: 'الشركات',
    desc: 'Multi-company master data and tenant settings.', descAr: 'بيانات الشركات والإعدادات.',
    to: '/admin/companies', category: 'organization' },
  { id: 'branches', icon: GitBranch, title: 'Branches', titleAr: 'الفروع',
    desc: 'Operating branches per company with addresses and contacts.', descAr: 'فروع التشغيل لكل شركة.',
    to: '/admin/branches', category: 'organization' },
  { id: 'regions', icon: MapPin, title: 'Regions', titleAr: 'المناطق',
    desc: 'Geographic regions, sales territories and zones.', descAr: 'المناطق الجغرافية والمبيعات.',
    to: '/admin/regions', category: 'organization' },

  // Finance
  { id: 'periods', icon: Calendar, title: 'Posting Periods', titleAr: 'فترات الترحيل',
    desc: 'Open, lock and close fiscal periods across modules.', descAr: 'فتح وإغلاق فترات الترحيل المالية.',
    to: '/admin/posting-periods', category: 'finance' },
  { id: 'numbering', icon: Hash, title: 'Numbering Series', titleAr: 'سلاسل الترقيم',
    desc: 'Document numbering rules with prefix, range and lock.', descAr: 'قواعد ترقيم المستندات.',
    to: '/admin/document-numbering', category: 'finance' },

  // Security
  { id: 'authorizations', icon: ShieldCheck, title: 'Authorizations', titleAr: 'الصلاحيات',
    desc: 'User roles, module access and document permissions.', descAr: 'صلاحيات المستخدمين والوحدات.',
    to: '/admin/authorizations', category: 'security' },

  // Data
  { id: 'imports', icon: Upload, title: 'Data Imports', titleAr: 'استيراد البيانات',
    desc: 'Async import jobs with validation and rollback snapshot.', descAr: 'مهام استيراد البيانات مع التراجع.',
    to: '/setup/imports', category: 'data' },
  { id: 'exports', icon: Download, title: 'Data Exports', titleAr: 'تصدير البيانات',
    desc: 'Schedule and download data extracts in any format.', descAr: 'تصدير البيانات بأي تنسيق.',
    to: '/setup/exports', category: 'data' },

  // Operations
  { id: 'impl', icon: ListChecks, title: 'Implementation Tasks', titleAr: 'مهام التنفيذ',
    desc: 'Go-live checklist with owners, due dates and blockers.', descAr: 'قائمة مهام الإطلاق مع المسؤولين.',
    to: '/setup/implementation-tasks', category: 'operations' },
  { id: 'audit', icon: History, title: 'Setup Audit Log', titleAr: 'سجل التغييرات',
    desc: 'Tamper-proof trail of every configuration change.', descAr: 'سجل غير قابل للتعديل لكل التغييرات.',
    to: '/setup/audit-log', category: 'operations' },
  { id: 'general', icon: Settings, title: 'General Settings', titleAr: 'الإعدادات العامة',
    desc: 'Company-wide preferences, defaults and feature flags.', descAr: 'تفضيلات الشركة الافتراضية.',
    to: '/admin/general-settings', category: 'operations' },
  { id: 'help', icon: BookOpen, title: 'Help & Onboarding', titleAr: 'المساعدة والتدريب',
    desc: 'Manage tooltips, tours and contextual help content.', descAr: 'إدارة محتوى المساعدة والجولات.',
    to: '/admin/help-content', category: 'operations' },
];

const CATEGORY_LABELS: Record<Tile['category'], { en: string; ar: string }> = {
  organization: { en: 'Organization', ar: 'المؤسسة' },
  finance:      { en: 'Finance & Periods', ar: 'المالية والفترات' },
  security:     { en: 'Security & Access', ar: 'الأمان والصلاحيات' },
  data:         { en: 'Data Management', ar: 'إدارة البيانات' },
  operations:   { en: 'Operations & Audit', ar: 'العمليات والتدقيق' },
};

export default function SetupHub() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const grouped = (Object.keys(CATEGORY_LABELS) as Tile['category'][]).map((cat) => ({
    cat,
    label: isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en,
    tiles: TILES.filter((t) => t.category === cat),
  }));

  return (
    <div className="container mx-auto p-6 space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isAr ? 'الإدارة والإعدادات' : 'Administration & Setup'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAr
            ? 'مركز موحد لجميع إعدادات النظام مع سجل تدقيق كامل وأدوات تراجع آمنة.'
            : 'Unified hub for every system configuration, with full audit trail and rollback-safe controls.'}
        </p>
      </div>

      {grouped.map((group) => (
        <section key={group.cat} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{group.label}</h2>
            <Badge variant="secondary">{group.tiles.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Card
                  key={tile.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(tile.to)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(tile.to); }}
                  className="cursor-pointer transition-colors hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">
                      {isAr ? tile.titleAr : tile.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      {isAr ? tile.descAr : tile.desc}
                    </CardDescription>
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
