import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, RefreshCw, DollarSign, FolderOpen, Mail, Lock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ClientPortalView() {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const [email, setEmail] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: portal, isLoading: portalLoading } = useQuery({
    queryKey: ['portal-public', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portals')
        .select('*')
        .eq('portal_slug', slug)
        .eq('is_enabled', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch invoices for this customer
  const { data: invoices = [] } = useQuery({
    queryKey: ['portal-invoices', portal?.customer_id],
    queryFn: async () => {
      if (!portal?.customer_id) return [];
      const { data, error } = await supabase
        .from('ar_invoices')
        .select('id, doc_num, doc_date, total, status, currency, balance_due')
        .eq('customer_id', portal.customer_id)
        .order('doc_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: authenticated && !!portal?.customer_id && portal?.show_invoices,
  });

  // Fetch retainers
  const { data: retainers = [] } = useQuery({
    queryKey: ['portal-retainers', portal?.customer_id],
    queryFn: async () => {
      if (!portal?.customer_id) return [];
      const { data, error } = await supabase
        .from('retainers')
        .select('*')
        .eq('customer_id', portal.customer_id)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: authenticated && !!portal?.customer_id && portal?.show_retainers,
  });

  const handleMagicLink = async () => {
    setSending(true);
    // Simulate magic link send
    setTimeout(() => {
      setSending(false);
      setAuthenticated(true); // For demo, auto-authenticate
    }, 1500);
  };

  if (portalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-bold mb-2">Portal Not Found</h2>
            <p className="text-muted-foreground">This client portal doesn't exist or has been disabled.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = portal.primary_color || '#1e40af';

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05)` }}>
        <Card className="max-w-md w-full shadow-xl border-0">
          <div className="h-2 w-full rounded-t-lg" style={{ backgroundColor: primaryColor }} />
          <CardContent className="pt-8 pb-6 px-8 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{portal.customer_name}</h1>
              <p className="text-muted-foreground text-sm mt-2">
                {portal.welcome_message || 'Welcome to your client portal'}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Your Email</label>
                <Input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleMagicLink}
                disabled={!email || sending}
                className="w-full h-11 text-white font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                {sending ? 'Sending magic link...' : 'Sign in with Magic Link'}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                We'll send a secure link to your email. No password needed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated portal view
  const totalOutstanding = invoices.reduce((s: number, inv: any) => s + (inv.balance_due || 0), 0);

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${primaryColor}08, transparent)` }}>
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: primaryColor }}>{portal.customer_name}</h1>
            <p className="text-xs text-muted-foreground">Client Portal</p>
          </div>
          <Badge variant="outline" className="text-xs">
            <span className="h-1.5 w-1.5 rounded-full mr-1.5" style={{ backgroundColor: primaryColor }} />
            Secure Session
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {portal.show_invoices && (
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold mt-1">{totalOutstanding.toLocaleString()} SAR</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <DollarSign className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {portal.show_invoices && (
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold mt-1">{invoices.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <FileText className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {portal.show_retainers && (
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Retainers</p>
                    <p className="text-2xl font-bold mt-1">{retainers.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <RefreshCw className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pay Now */}
        {portal.show_pay_button && totalOutstanding > 0 && (
          <Card className="shadow-sm border-2" style={{ borderColor: `${primaryColor}30` }}>
            <CardContent className="py-6 flex items-center justify-between">
              <div>
                <p className="font-semibold">Pay Outstanding Balance</p>
                <p className="text-sm text-muted-foreground">{totalOutstanding.toLocaleString()} SAR due</p>
              </div>
              <Button size="lg" className="text-white font-semibold px-8" style={{ backgroundColor: primaryColor }}>
                <DollarSign className="h-4 w-4 mr-2" /> Pay Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invoices */}
        {portal.show_invoices && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No invoices found</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: `${primaryColor}10` }}>
                          <FileText className="h-4 w-4" style={{ color: primaryColor }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">INV-{inv.doc_num}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(inv.doc_date), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{(inv.total || 0).toLocaleString()} {inv.currency || 'SAR'}</span>
                        <Badge variant="outline" className={
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          inv.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }>
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Retainers */}
        {portal.show_retainers && retainers.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Retainer Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {retainers.map((r: any) => (
                <div key={r.id} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{r.description || `${r.frequency} retainer`}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.frequency} · {r.amount.toLocaleString()} {r.currency}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{t('common.active')}</Badge>
                  </div>
                  {r.hours_included && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{r.hours_used || 0} / {r.hours_included} hours used</span>
                        <span>{Math.round(((r.hours_used || 0) / r.hours_included) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((r.hours_used || 0) / r.hours_included) * 100)}%`,
                            backgroundColor: primaryColor,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
        <p>Secure client portal · Powered by your service provider</p>
      </footer>
    </div>
  );
}
