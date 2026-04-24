import { useState, useEffect } from 'react';
import { Moon, Sun, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ThemeMode = 'light' | 'dark';

interface AccentTheme {
  id: string;
  label: string;
  primary: string;       // HSL value
  secondary: string;
  preview: string;       // Tailwind-safe bg color for preview dot
}

const ACCENT_THEMES: AccentTheme[] = [
  { id: 'navy', label: 'Navy (Default)', primary: '214 72% 23%', secondary: '43 65% 49%', preview: 'bg-[hsl(214,72%,23%)]' },
  { id: 'emerald', label: 'Emerald Corporate', primary: '152 68% 28%', secondary: '43 65% 49%', preview: 'bg-[hsl(152,68%,28%)]' },
  { id: 'purple', label: 'Purple Executive', primary: '262 60% 38%', secondary: '280 50% 60%', preview: 'bg-[hsl(262,60%,38%)]' },
  { id: 'slate', label: 'Slate Professional', primary: '215 25% 27%', secondary: '210 40% 50%', preview: 'bg-[hsl(215,25%,27%)]' },
  { id: 'teal', label: 'Teal Modern', primary: '180 60% 30%', secondary: '170 50% 45%', preview: 'bg-[hsl(180,60%,30%)]' },
  { id: 'crimson', label: 'Crimson Bold', primary: '348 70% 36%', secondary: '20 80% 55%', preview: 'bg-[hsl(348,70%,36%)]' },
];

function getStoredMode(): ThemeMode {
  return (localStorage.getItem('theme-mode') as ThemeMode) || 'light';
}
function getStoredAccent(): string {
  return localStorage.getItem('theme-accent') || 'navy';
}

export function applyTheme() {
  const mode = getStoredMode();
  const accentId = getStoredAccent();
  const accent = ACCENT_THEMES.find(a => a.id === accentId) || ACCENT_THEMES[0];

  document.documentElement.classList.toggle('dark', mode === 'dark');

  // Apply accent colors as CSS variables
  if (mode === 'light') {
    document.documentElement.style.setProperty('--primary', accent.primary);
    document.documentElement.style.setProperty('--ring', accent.primary);
    document.documentElement.style.setProperty('--sidebar-background', accent.primary.replace(/\d+%$/, (m) => `${Math.max(parseInt(m) - 8, 5)}%`));
  } else {
    // In dark mode, use secondary as primary for contrast
    document.documentElement.style.setProperty('--primary', accent.secondary);
    document.documentElement.style.setProperty('--ring', accent.secondary);
  }
}

// Apply on load
applyTheme();

export function ThemeSwitcher() {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [accent, setAccent] = useState(getStoredAccent);

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-accent', accent);
    applyTheme();
  }, [mode, accent]);

  const toggleMode = () => setMode(m => m === 'light' ? 'dark' : 'light');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8">
          {mode === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5" /> Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Mode toggle */}
        <button
          onClick={toggleMode}
          className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-sm"
        >
          {mode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          Switch to {mode === 'light' ? 'Dark' : 'Light'} Mode
        </button>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Accent Color</DropdownMenuLabel>

        {ACCENT_THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => setAccent(theme.id)}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-sm",
              accent === theme.id && "bg-muted font-medium"
            )}
          >
            <div className={cn("h-4 w-4 rounded-full border", theme.preview)} />
            <span className="flex-1 text-left">{theme.label}</span>
            {accent === theme.id && <Check className="h-3 w-3" />}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
