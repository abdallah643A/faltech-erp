import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserCog, Check, Sparkles } from 'lucide-react';
import { useDashboardPersona } from '@/hooks/useDashboardPersona';
import { PERSONA_LIST, type PersonaKey } from '@/data/personaPresets';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * PersonaSwitcher — one-click "lens" selector that re-curates the dashboard
 * to the active persona's KPI preset (CEO, CFO, COO, Sales, Procurement, PM, HR).
 *
 * Behaviour:
 *  - Selecting a persona writes `profiles.preferred_persona` and rewrites
 *    `profiles.dashboard_preferences.widgets` (visibility + order).
 *  - User can still customize afterwards; persona becomes 'custom' once edited
 *    via the existing DashboardCustomizer (out of scope for this control).
 */
export function PersonaSwitcher({ compact = false }: { compact?: boolean }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { persona, applyPersona, isApplying } = useDashboardPersona();
  const [open, setOpen] = useState(false);

  const current = PERSONA_LIST.find(p => p.key === persona);
  const label = current ? (isAr ? current.labelAr : current.label) : (isAr ? 'مخصص' : 'Custom');

  const handleSelect = async (key: PersonaKey) => {
    setOpen(false);
    await applyPersona(key);
    const preset = PERSONA_LIST.find(p => p.key === key);
    toast.success(
      isAr ? `تم تطبيق العرض: ${preset?.labelAr ?? key}` : `Applied view: ${preset?.label ?? key}`,
      { description: isAr ? 'تم تحديث لوحة المعلومات لمؤشرات هذا الدور' : 'Dashboard re-curated for this role' }
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isApplying}
          className={cn('gap-1.5 text-xs', compact && 'h-8 px-2')}
        >
          <UserCog className="h-3.5 w-3.5" />
          {!compact && <span>{label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {isAr ? 'اختر دورك (KPI Preset)' : 'Choose your role (KPI preset)'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PERSONA_LIST.map(p => (
          <DropdownMenuItem
            key={p.key}
            onSelect={() => handleSelect(p.key)}
            className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium text-sm">{isAr ? p.labelAr : p.label}</span>
              {persona === p.key && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
            <span className="text-[11px] text-muted-foreground leading-tight">{p.description}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => handleSelect('custom' as PersonaKey)}
          className="text-xs text-muted-foreground cursor-pointer"
        >
          {isAr ? 'تخطي — احتفظ بإعداداتي' : 'Skip — keep my custom layout'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
