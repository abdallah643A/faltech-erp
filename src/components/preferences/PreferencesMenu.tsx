import { useState } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { COMMON_TIMEZONES } from '@/lib/datetime';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Settings2, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP', 'JOD', 'TRY', 'INR', 'CNY', 'JPY'];

/**
 * Header dropdown for changing personal display preferences:
 * timezone, display currency, UI density. Persists via user_preferences.
 */
export function PreferencesMenu() {
  const { prefs, update, isUpdating } = useUserPreferences();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
          aria-label={isAr ? 'تفضيلات العرض' : 'Display preferences'}
          title={isAr ? 'تفضيلات العرض الشخصية' : 'Personal display preferences'}
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-3">
        <DropdownMenuLabel>{isAr ? 'تفضيلات العرض' : 'Display preferences'}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-3 pt-1">
          <div>
            <Label className="text-xs text-muted-foreground">{isAr ? 'المنطقة الزمنية' : 'Timezone'}</Label>
            <Select value={prefs.timezone} onValueChange={(v) => update({ timezone: v })}>
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {COMMON_TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{isAr ? 'عملة العرض' : 'Display currency'}</Label>
            <Select
              value={prefs.display_currency ?? 'auto'}
              onValueChange={(v) => update({ display_currency: v === 'auto' ? null : v })}
            >
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{isAr ? 'تلقائي (حسب الشركة)' : 'Auto (use company)'}</SelectItem>
                {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{isAr ? 'كثافة الواجهة' : 'UI density'}</Label>
            <Select value={prefs.density} onValueChange={(v: any) => update({ density: v })}>
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">{isAr ? 'مدمج' : 'Compact'}</SelectItem>
                <SelectItem value="comfortable">{isAr ? 'مريح' : 'Comfortable'}</SelectItem>
                <SelectItem value="spacious">{isAr ? 'فسيح' : 'Spacious'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
