import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSTimeClock } from '@/hooks/useCPMSTimeClock';
import { useAuth } from '@/contexts/AuthContext';
import {
  Clock, Camera, ClipboardList, Receipt, Calendar, Building2,
  Play, Square, Wifi, WifiOff, ChevronRight,
} from 'lucide-react';
import { MobileBottomNav } from '@/components/cpms/mobile/MobileBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSMobileHome() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects } = useCPMS();
  const { activeEntry } = useCPMSTimeClock();
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'active');
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const quickActions = [
    {
      icon: activeEntry ? Square : Play,
      label: activeEntry ? 'Clock Out' : 'Clock In',
      color: activeEntry ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-600 text-white',
      action: () => navigate('/cpms/mobile/time'),
    },
    {
      icon: ClipboardList,
      label: 'Daily Report',
      color: 'bg-primary text-primary-foreground',
      action: () => navigate('/cpms/daily-reports'),
    },
    {
      icon: Camera,
      label: 'Take Photo',
      color: 'bg-blue-600 text-white',
      action: () => navigate('/cpms/mobile/photos'),
    },
    {
      icon: Receipt,
      label: 'Submit Expense',
      color: 'bg-orange-600 text-white',
      action: () => navigate('/cpms/expenses'),
    },
    {
      icon: Calendar,
      label: "Today's Schedule",
      color: 'bg-violet-600 text-white',
      action: () => navigate('/cpms/gantt'),
    },
    {
      icon: Building2,
      label: 'View Projects',
      color: 'bg-secondary text-secondary-foreground',
      action: () => navigate('/cpms/projects'),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-6 rounded-b-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm opacity-80">{greeting}</p>
            <h1 className="text-xl font-bold">{profile?.full_name || 'Field User'}</h1>
          </div>
          <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Active Timer Banner */}
        {activeEntry && (
          <Card className="bg-white/15 border-white/20 backdrop-blur">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-foreground">
                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium">Timer Active</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/cpms/mobile/time')}>
                View <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="p-4 -mt-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              className={`${action.color} rounded-xl p-4 flex flex-col items-center gap-2 min-h-[100px] justify-center shadow-sm active:scale-95 transition-transform`}
            >
              <action.icon className="h-8 w-8" />
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Projects Carousel */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Active Projects ({activeProjects.length})</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {activeProjects.slice(0, 10).map((p) => (
            <Card
              key={p.id}
              className="min-w-[240px] snap-start cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/cpms/projects/${p.id}`)}
            >
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{p.code}</p>
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2" style={{ width: `${p.percent_complete || 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{p.percent_complete || 0}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {activeProjects.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No active projects</p>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
