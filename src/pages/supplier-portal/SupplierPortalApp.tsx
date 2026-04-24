import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Globe, FileText, Package, Receipt, CreditCard, Upload, MessageSquare, LogOut, Home, Menu, X, AlertTriangle, Award, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import SupplierPortalDashboard from './SupplierPortalDashboard';
import SupplierPortalRFQs from './SupplierPortalRFQs';
import SupplierPortalPOs from './SupplierPortalPOs';
import SupplierPortalInvoices from './SupplierPortalInvoices';
import SupplierPortalPayments from './SupplierPortalPayments';
import SupplierPortalDocuments from './SupplierPortalDocuments';
import SupplierPortalMessages from './SupplierPortalMessages';
import SupplierPortalDisputes from './SupplierPortalDisputes';
import SupplierPortalScorecard from './SupplierPortalScorecard';
import SupplierPortalProfile from './SupplierPortalProfile';

const STORAGE_KEY = 'supplier_portal_session';

interface PortalAccount {
  id: string;
  email: string;
  contact_name: string | null;
  portal_role: string;
  company_id: string | null;
  vendor_id: string | null;
  subcontractor_id: string | null;
  permissions: any;
}

function SupplierPortalLogin({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Globe className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle className="text-xl">Supplier Portal</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to access your portal</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierPortalLayout({ account, onLogout, children }: { account: PortalAccount; onLogout: () => void; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const basePath = '/supplier-portal';
  const perms = account.permissions || {};

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '' },
    ...(perms.view_rfqs ? [{ icon: FileText, label: 'RFQs & Quotations', path: '/rfqs' }] : []),
    ...(perms.view_pos ? [{ icon: Package, label: 'Purchase Orders', path: '/purchase-orders' }] : []),
    ...(perms.submit_invoices ? [{ icon: Receipt, label: 'Invoices', path: '/invoices' }] : []),
    ...(perms.view_payments ? [{ icon: CreditCard, label: 'Payments', path: '/payments' }] : []),
    ...(perms.upload_documents ? [{ icon: Upload, label: 'Documents', path: '/documents' }] : []),
    { icon: AlertTriangle, label: 'Disputes', path: '/disputes' },
    { icon: Award, label: 'Scorecard', path: '/scorecard' },
    { icon: User, label: 'My Profile', path: '/profile' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-bold">Supplier Portal</p>
              <p className="text-xs text-muted-foreground">{account.contact_name || account.email}</p>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === basePath + item.path || (item.path === '' && location.pathname === basePath);
            return (
              <Link key={item.path} to={basePath + item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="lg:hidden flex items-center gap-2 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-medium">Supplier Portal</span>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

export default function SupplierPortalApp() {
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setAccount(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data: accounts, error } = await supabase
      .from('supplier_portal_accounts')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .limit(1);

    if (error || !accounts?.length) throw new Error('Invalid credentials or account disabled');

    const acc = accounts[0];
    if (acc.password_hash !== password) throw new Error('Invalid credentials');

    // Update login tracking
    await supabase.from('supplier_portal_accounts' as any).update({
      last_login_at: new Date().toISOString(),
      login_count: (acc.login_count || 0) + 1,
    }).eq('id', acc.id);

    // Log interaction
    await supabase.from('supplier_portal_interactions' as any).insert({
      portal_account_id: acc.id,
      company_id: acc.company_id,
      interaction_type: 'login',
    });

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(acc));
    setAccount(acc);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAccount(null);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!account) return <SupplierPortalLogin onLogin={login} />;

  return (
    <SupplierPortalLayout account={account} onLogout={logout}>
      <Routes>
        <Route index element={<SupplierPortalDashboard account={account} />} />
        <Route path="rfqs" element={<SupplierPortalRFQs account={account} />} />
        <Route path="purchase-orders" element={<SupplierPortalPOs account={account} />} />
        <Route path="invoices" element={<SupplierPortalInvoices account={account} />} />
        <Route path="payments" element={<SupplierPortalPayments account={account} />} />
        <Route path="documents" element={<SupplierPortalDocuments account={account} />} />
        <Route path="messages" element={<SupplierPortalMessages account={account} />} />
        <Route path="disputes" element={<SupplierPortalDisputes account={account} />} />
        <Route path="scorecard" element={<SupplierPortalScorecard account={account} />} />
        <Route path="profile" element={<SupplierPortalProfile account={account} />} />
      </Routes>
    </SupplierPortalLayout>
  );
}
