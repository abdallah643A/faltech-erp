import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, Users, Landmark, Factory, HardHat, Crown, LayoutDashboard, Check, Heart, Sparkles } from 'lucide-react';
import { type WorkspaceKey, WORKSPACES } from '@/hooks/useWorkspace';

const iconMap: Record<string, any> = {
  LayoutDashboard, TrendingUp, Package, Users, Landmark, Factory, HardHat, Crown, Heart,
};

// Maps app roles → recommended default workspace.
function suggestWorkspace(roles: string[]): WorkspaceKey {
  const r = new Set(roles.map(x => x.toLowerCase()));
  if (r.has('admin')) return 'executive';
  if (r.has('manager')) return 'executive';
  if (r.has('sales_rep')) return 'sales';
  if (r.has('procurement')) return 'procurement';
  if (r.has('hr_manager') || r.has('hr')) return 'hr';
  if (r.has('finance') || r.has('accountant')) return 'finance';
  if (r.has('production')) return 'manufacturing';
  if (r.has('site_engineer') || r.has('project_manager')) return 'construction';
  if (r.has('doctor') || r.has('nurse') || r.has('reception')) return 'hospital';
  return 'general';
}

interface Props {
  open: boolean;
  onSelect: (key: WorkspaceKey) => void;
  loading?: boolean;
  currentWorkspace?: WorkspaceKey | null;
}

export function WorkspaceSelector({ open, onSelect, loading, currentWorkspace }: Props) {
  const { language } = useLanguage();
  const { roles } = useAuth();
  const isAr = language === 'ar';
  const suggested = suggestWorkspace(roles as string[]);
  const [selected, setSelected] = useState<WorkspaceKey | null>(currentWorkspace || suggested);

  // Pre-select the suggested workspace each time the dialog opens for a new user.
  useEffect(() => {
    if (open && !currentWorkspace) setSelected(suggested);
  }, [open, currentWorkspace, suggested]);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isAr ? 'اختر مساحة العمل الخاصة بك' : 'Choose Your Workspace'}
          </DialogTitle>
          <DialogDescription>
            {isAr
              ? 'حدد الصفحة الرئيسية التي تناسب دورك. يمكنك تغييرها لاحقاً من الإعدادات.'
              : 'Select the homepage that fits your role. You can change it later in settings.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {WORKSPACES.map((ws) => {
            const Icon = iconMap[ws.icon] || LayoutDashboard;
            const isSelected = selected === ws.key;
            const isRecommended = ws.key === suggested && !currentWorkspace;
            return (
              <button
                key={ws.key}
                onClick={() => setSelected(ws.key)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isRecommended && (
                  <Badge variant="secondary" className="absolute -top-2 left-1/2 -translate-x-1/2 gap-1 text-[9px] px-1.5 py-0">
                    <Sparkles className="h-2.5 w-2.5" />
                    {isAr ? 'موصى به' : 'Recommended'}
                  </Badge>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-center">
                  {isAr ? ws.labelAr : ws.label}
                </span>
                <p className="text-[10px] text-muted-foreground text-center leading-tight">
                  {ws.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected || loading}
            className="min-w-[140px]"
          >
            {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'ابدأ' : 'Get Started')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
