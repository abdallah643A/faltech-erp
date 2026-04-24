import { HardHat, Package, Factory } from 'lucide-react';
import { useIndustryTheme, IndustryTheme, THEME_CONFIGS } from '@/contexts/IndustryThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const THEME_ICONS: Record<IndustryTheme, typeof HardHat> = {
  construction: HardHat,
  trading: Package,
  industrial: Factory,
};

export function IndustryThemeSwitcher() {
  const { theme, setTheme } = useIndustryTheme();
  const CurrentIcon = THEME_ICONS[theme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
          title="Industry Theme"
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Industry Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(THEME_CONFIGS) as IndustryTheme[]).map((key) => {
          const config = THEME_CONFIGS[key];
          const Icon = THEME_ICONS[key];
          const isActive = theme === key;
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                'flex items-center gap-3 py-2.5 cursor-pointer',
                isActive && 'bg-accent font-semibold'
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-md flex items-center justify-center shrink-0',
                key === 'construction' && 'bg-orange-500/15 text-orange-500',
                key === 'trading' && 'bg-blue-500/15 text-blue-500',
                key === 'industrial' && 'bg-red-500/15 text-red-500',
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm">{config.label}</span>
                <span className="text-[10px] text-muted-foreground font-normal">{config.description}</span>
              </div>
              {isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
