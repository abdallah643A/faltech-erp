import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, FileText, Users, TrendingUp, AlertTriangle,
  ClipboardList, CreditCard, LogOut, Menu, X, HardHat
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubPortalLayoutProps {
  children: React.ReactNode;
  subName: string;
  contactName?: string | null;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { path: '', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'claims', label: 'Progress Claims', icon: FileText },
  { path: 'invoices', label: 'Invoices', icon: CreditCard },
  { path: 'manpower', label: 'Manpower Logs', icon: Users },
  { path: 'progress', label: 'Work Progress', icon: TrendingUp },
  { path: 'variations', label: 'Variations', icon: AlertTriangle },
  { path: 'punch-list', label: 'Punch List', icon: ClipboardList },
  { path: 'payments', label: 'Payment Status', icon: CreditCard },
];

export default function SubPortalLayout({ children, subName, contactName, onLogout }: SubPortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const basePath = '/subcontractor-portal';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:translate-x-0 lg:static",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold text-sm">Subcontractor Portal</h2>
              <p className="text-[10px] text-muted-foreground truncate">{subName}</p>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
          <nav className="p-2 space-y-1">
            {NAV_ITEMS.map(item => {
              const fullPath = item.path ? `${basePath}/${item.path}` : basePath;
              const isActive = item.path
                ? location.pathname.startsWith(fullPath)
                : location.pathname === basePath;
              return (
                <Link
                  key={item.path}
                  to={fullPath}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="p-3 border-t">
          <div className="text-xs text-muted-foreground mb-2 truncate">{contactName || 'Subcontractor'}</div>
          <Button variant="outline" size="sm" className="w-full gap-1" onClick={onLogout}>
            <LogOut className="h-3 w-3" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-4 gap-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-sm truncate">Subcontractor Portal</h1>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}