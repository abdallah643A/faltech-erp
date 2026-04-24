import { ReactNode, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, FileText, FolderOpen, MessageSquare, ClipboardList,
  LogOut, Menu, X, Building2,
} from 'lucide-react';

interface PortalLayoutProps {
  children: ReactNode;
  portal: {
    customer_name: string;
    primary_color: string;
    logo_url?: string | null;
    company_name_override?: string | null;
    white_label?: boolean;
    footer_text?: string | null;
    show_invoices?: boolean;
    show_projects?: boolean;
    show_documents?: boolean;
    show_change_orders?: boolean;
    show_messages?: boolean;
  };
  clientName: string | null;
  onLogout: () => void;
}

export default function PortalLayout({ children, portal, clientName, onLogout }: PortalLayoutProps) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pc = portal.primary_color || '#1e40af';
  const displayName = portal.company_name_override || portal.customer_name;

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: `/portal/${slug}`, show: true },
    { label: 'Projects', icon: Building2, path: `/portal/${slug}/projects`, show: portal.show_projects !== false },
    { label: 'Invoices', icon: FileText, path: `/portal/${slug}/invoices`, show: portal.show_invoices !== false },
    { label: 'Documents', icon: FolderOpen, path: `/portal/${slug}/documents`, show: portal.show_documents !== false },
    { label: 'Change Orders', icon: ClipboardList, path: `/portal/${slug}/change-orders`, show: portal.show_change_orders !== false },
    { label: 'Messages', icon: MessageSquare, path: `/portal/${slug}/messages`, show: portal.show_messages !== false },
  ].filter(i => i.show);

  const isActive = (path: string) => {
    if (path === `/portal/${slug}`) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {portal.logo_url && (
                <img src={portal.logo_url} alt="Logo" className="h-8 w-auto" />
              )}
              <div>
                <h1 className="text-lg font-bold" style={{ color: pc }}>{displayName}</h1>
                <p className="text-[10px] text-gray-400 -mt-0.5">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:block">{clientName}</span>
              <Button variant="ghost" size="sm" onClick={onLogout} className="text-gray-500 hover:text-gray-700">
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Nav */}
      <nav className="bg-white border-b hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive(item.path)
                    ? 'border-current'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={isActive(item.path) ? { color: pc, borderColor: pc } : {}}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b shadow-lg">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 w-full px-6 py-3 text-sm ${
                isActive(item.path) ? 'font-semibold' : 'text-gray-600'
              }`}
              style={isActive(item.path) ? { color: pc } : {}}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      {!portal.white_label && (
        <footer className="border-t py-6 text-center text-xs text-gray-400">
          {portal.footer_text || 'Secure client portal · Powered by your service provider'}
        </footer>
      )}
    </div>
  );
}
