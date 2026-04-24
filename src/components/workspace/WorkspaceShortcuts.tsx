import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface Shortcut {
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

interface Props {
  shortcuts: Shortcut[];
}

export function WorkspaceShortcuts({ shortcuts }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.quickAccess')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.href}
              onClick={() => navigate(s.href)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-colors group"
            >
              <div className="h-10 w-10 rounded-lg bg-muted group-hover:bg-background flex items-center justify-center transition-colors">
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
