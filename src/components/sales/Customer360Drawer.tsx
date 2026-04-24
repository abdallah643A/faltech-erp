import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Building2, Mail, Phone, MapPin, User, FileText, ShoppingCart, Receipt,
  AlertTriangle, TrendingUp, Calendar, Loader2, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useCustomer360 } from '@/hooks/useCustomer360';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { cn } from '@/lib/utils';

/**
 * Customer 360 Drawer — Module 2 / Enhancement #2
 *
 * A slide-out unified view of a business partner: master data, contacts,
 * lifetime KPIs, AR aging, open quotes/orders, unpaid invoices, and
 * recent activity. Drop in next to any customer reference.
 */

interface Customer360DrawerProps {
  businessPartnerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Customer360Drawer({ businessPartnerId, open, onOpenChange }: Customer360DrawerProps) {
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const { currencySymbol } = useCompanyCurrency();
  const { data, isLoading } = useCustomer360(businessPartnerId ?? undefined);

  const fmt = (n: number) =>
    `${currencySymbol}${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const T = {
    title: isAr ? 'نظرة شاملة على العميل' : 'Customer 360',
    overview: isAr ? 'نظرة عامة' : 'Overview',
    contacts: isAr ? 'جهات الاتصال' : 'Contacts',
    docs: isAr ? 'المستندات' : 'Documents',
    aging: isAr ? 'أعمار الذمم' : 'AR Aging',
    activity: isAr ? 'النشاط' : 'Activity',
    lifetime: isAr ? 'إجمالي القيمة' : 'Lifetime Value',
    invoices: isAr ? 'الفواتير' : 'Invoices',
    avgOrder: isAr ? 'متوسط الفاتورة' : 'Avg Invoice',
    outstanding: isAr ? 'المستحق' : 'Outstanding',
    openQuotes: isAr ? 'عروض مفتوحة' : 'Open Quotes',
    openOrders: isAr ? 'طلبات مفتوحة' : 'Open Orders',
    unpaid: isAr ? 'فواتير غير مدفوعة' : 'Unpaid Invoices',
    none: isAr ? 'لا توجد سجلات' : 'No records',
    lastInvoice: isAr ? 'آخر فاتورة' : 'Last invoice',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={direction === 'rtl' ? 'left' : 'right'}
        className="w-full sm:max-w-2xl overflow-y-auto"
        dir={direction}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {T.title}
          </SheetTitle>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data.partner ? (
          <div className="text-center text-muted-foreground py-20">{T.none}</div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold truncate">{data.partner.card_name}</h3>
                  <div className="text-sm text-muted-foreground">{data.partner.card_code}</div>
                </div>
                <Badge variant={data.partner.card_type === 'Customer' ? 'default' : 'secondary'}>
                  {data.partner.card_type}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {data.partner.email_address && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{data.partner.email_address}</span>
                )}
                {data.partner.phone1 && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{data.partner.phone1}</span>
                )}
                {data.partner.address && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{data.partner.address}</span>
                )}
              </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <KPI icon={TrendingUp} label={T.lifetime} value={fmt(data.lifetimeValue)} tone="success" />
              <KPI icon={Receipt} label={T.invoices} value={String(data.invoiceCount)} />
              <KPI icon={FileText} label={T.avgOrder} value={fmt(data.avgOrderValue)} />
              <KPI
                icon={AlertTriangle}
                label={T.outstanding}
                value={fmt(data.arAging.total)}
                tone={data.arAging.total > 0 ? 'destructive' : 'neutral'}
              />
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">{T.overview}</TabsTrigger>
                <TabsTrigger value="contacts">{T.contacts}</TabsTrigger>
                <TabsTrigger value="docs">{T.docs}</TabsTrigger>
                <TabsTrigger value="aging">{T.aging}</TabsTrigger>
                <TabsTrigger value="activity">{T.activity}</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-3 mt-3">
                <DocList
                  title={T.openQuotes}
                  icon={FileText}
                  rows={data.openQuotes}
                  basePath="/sales-quotations"
                  fmt={fmt}
                  emptyText={T.none}
                />
                <DocList
                  title={T.openOrders}
                  icon={ShoppingCart}
                  rows={data.openOrders}
                  basePath="/sales-orders"
                  fmt={fmt}
                  emptyText={T.none}
                />
                {data.lastInvoiceDate && (
                  <div className="text-xs text-muted-foreground">
                    {T.lastInvoice}: {format(new Date(data.lastInvoiceDate), 'PP')}
                  </div>
                )}
              </TabsContent>

              {/* Contacts */}
              <TabsContent value="contacts" className="mt-3">
                {data.contacts.length === 0 ? (
                  <Empty text={T.none} />
                ) : (
                  <div className="space-y-2">
                    {data.contacts.map((c: any) => (
                      <Card key={c.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{c.name}</div>
                              {c.position && <div className="text-xs text-muted-foreground">{c.position}</div>}
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                                {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Documents */}
              <TabsContent value="docs" className="space-y-3 mt-3">
                <DocList title={T.openQuotes} icon={FileText} rows={data.openQuotes} basePath="/sales-quotations" fmt={fmt} emptyText={T.none} />
                <DocList title={T.openOrders} icon={ShoppingCart} rows={data.openOrders} basePath="/sales-orders" fmt={fmt} emptyText={T.none} />
                <DocList title={T.unpaid} icon={Receipt} rows={data.unpaidInvoices} basePath="/ar-invoices" fmt={fmt} emptyText={T.none} balanceField />
              </TabsContent>

              {/* Aging */}
              <TabsContent value="aging" className="mt-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{T.aging}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AgingRow label={isAr ? 'حالي' : 'Current'} amount={data.arAging.current} fmt={fmt} tone="success" />
                    <Separator className="my-1.5" />
                    <AgingRow label="1–30" amount={data.arAging.bucket30} fmt={fmt} />
                    <Separator className="my-1.5" />
                    <AgingRow label="31–60" amount={data.arAging.bucket60} fmt={fmt} tone="warning" />
                    <Separator className="my-1.5" />
                    <AgingRow label="61–90" amount={data.arAging.bucket90} fmt={fmt} tone="warning" />
                    <Separator className="my-1.5" />
                    <AgingRow label="90+" amount={data.arAging.over120} fmt={fmt} tone="destructive" />
                    <Separator className="my-2" />
                    <AgingRow label={isAr ? 'الإجمالي' : 'Total'} amount={data.arAging.total} fmt={fmt} bold />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity */}
              <TabsContent value="activity" className="mt-3">
                {data.recentActivities.length === 0 ? (
                  <Empty text={T.none} />
                ) : (
                  <div className="space-y-2">
                    {data.recentActivities.map((a: any) => (
                      <div key={a.id} className="flex items-start gap-2 text-sm border-b border-border pb-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{a.subject}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.type} · {a.status} · {format(new Date(a.created_at), 'PP')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function KPI({
  icon: Icon, label, value, tone = 'neutral',
}: { icon: any; label: string; value: string; tone?: 'neutral' | 'success' | 'warning' | 'destructive' }) {
  const toneClass =
    tone === 'success' ? 'text-success' :
    tone === 'warning' ? 'text-warning' :
    tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <div className={cn('text-base font-semibold mt-0.5 truncate', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function DocList({
  title, icon: Icon, rows, basePath, fmt, emptyText, balanceField,
}: {
  title: string;
  icon: any;
  rows: any[];
  basePath: string;
  fmt: (n: number) => string;
  emptyText: string;
  balanceField?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="h-5 text-[10px]">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">{emptyText}</div>
        ) : (
          <div className="space-y-1">
            {rows.slice(0, 8).map((r: any) => (
              <Link
                key={r.id}
                to={`${basePath}/${r.id}`}
                className="flex items-center justify-between text-sm py-1 px-1.5 rounded hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">#{r.doc_num}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.doc_date && format(new Date(r.doc_date), 'MMM d')}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {fmt(balanceField ? Number(r.balance_due) : Number(r.total))}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgingRow({
  label, amount, fmt, tone = 'neutral', bold,
}: {
  label: string; amount: number; fmt: (n: number) => string;
  tone?: 'neutral' | 'success' | 'warning' | 'destructive'; bold?: boolean;
}) {
  const toneClass =
    tone === 'success' ? 'text-success' :
    tone === 'warning' ? 'text-warning' :
    tone === 'destructive' ? 'text-destructive' : '';
  return (
    <div className={cn('flex items-center justify-between text-sm', bold && 'font-semibold')}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums', toneClass)}>{fmt(amount)}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center text-sm text-muted-foreground py-6">{text}</div>;
}

/**
 * Convenience trigger button — pair with state in the parent.
 */
export function Customer360Button({
  businessPartnerId,
  label,
}: { businessPartnerId: string; label?: string }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Building2 className="h-3.5 w-3.5" />
        {label ?? (isAr ? '360°' : '360°')}
      </Button>
      <Customer360Drawer
        businessPartnerId={businessPartnerId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
