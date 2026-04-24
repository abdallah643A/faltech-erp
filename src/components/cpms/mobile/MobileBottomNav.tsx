import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Clock, Camera, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/cpms/mobile' },
  { icon: Building2, label: 'Projects', path: '/cpms/projects' },
  { icon: Clock, label: 'Time', path: '/cpms/mobile/time' },
  { icon: Camera, label: 'Photos', path: '/cpms/mobile/photos' },
  { icon: MoreHorizontal, label: 'More', path: '/cpms' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
