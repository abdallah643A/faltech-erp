import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/**
 * Route-aware global breadcrumbs. Derives a friendly label from each path
 * segment and renders all ancestors as links. Hidden on root and auth routes.
 */

const SKIP_PATHS = new Set(['/', '/login', '/signup', '/forgot-password', '/reset-password']);

// Optional explicit overrides for non-obvious slugs.
const LABEL_OVERRIDES: Record<string, { en: string; ar: string }> = {
  hr: { en: 'HR', ar: 'الموارد البشرية' },
  pm: { en: 'Projects', ar: 'المشاريع' },
  pos: { en: 'POS', ar: 'نقاط البيع' },
  cpms: { en: 'CPMS', ar: 'إدارة المشاريع' },
  ecm: { en: 'Documents', ar: 'الوثائق' },
  saas: { en: 'SaaS', ar: 'SaaS' },
  ar: { en: 'AR', ar: 'العملاء' },
  ap: { en: 'AP', ar: 'الموردون' },
  bp: { en: 'Business Partners', ar: 'الشركاء' },
  wms: { en: 'Warehouse', ar: 'المستودعات' },
  hse: { en: 'HSE', ar: 'السلامة' },
  qa: { en: 'QA / QC', ar: 'الجودة' },
  pmo: { en: 'PMO', ar: 'مكتب المشاريع' },
  mfg: { en: 'Manufacturing', ar: 'التصنيع' },
  rfq: { en: 'RFQ', ar: 'طلب عرض' },
  zatca: { en: 'ZATCA', ar: 'زاتكا' },
  mr: { en: 'Material Requests', ar: 'طلبات المواد' },
  it: { en: 'IT', ar: 'تقنية المعلومات' },
  sla: { en: 'SLA', ar: 'اتفاقيات الخدمة' },
  hr1: { en: 'HR', ar: 'الموارد البشرية' },
  new: { en: 'New', ar: 'جديد' },
  edit: { en: 'Edit', ar: 'تعديل' },
};

function humanize(seg: string, isAr: boolean): string {
  const lower = seg.toLowerCase();
  if (LABEL_OVERRIDES[lower]) return isAr ? LABEL_OVERRIDES[lower].ar : LABEL_OVERRIDES[lower].en;
  // UUID / numeric id → show short token
  if (/^[0-9a-f]{8}-/i.test(seg)) return `#${seg.slice(0, 6)}`;
  if (/^\d+$/.test(seg)) return `#${seg}`;
  return seg
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  if (SKIP_PATHS.has(pathname)) return null;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: humanize(seg, isAr),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav
      aria-label={isAr ? 'مسار التنقل' : 'Breadcrumb'}
      className="px-3 md:px-5 pt-1.5 pb-0.5 text-xs"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <ol className="flex items-center gap-1 flex-wrap text-muted-foreground">
        <li className="flex items-center">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label={isAr ? 'الرئيسية' : 'Home'}
          >
            <Home className="h-3 w-3" />
          </Link>
        </li>
        {crumbs.map(c => (
          <li key={c.href} className="flex items-center gap-1">
            <ChevronRight className={cn('h-3 w-3 opacity-50', isAr && 'rotate-180')} />
            {c.isLast ? (
              <span className="font-medium text-foreground" aria-current="page">{c.label}</span>
            ) : (
              <Link to={c.href} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
