import { useActiveCompany } from '@/hooks/useActiveCompany';

const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: 'ر.س',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  EGP: 'ج.م',
  KWD: 'د.ك',
  BHD: 'د.ب',
  QAR: 'ر.ق',
  OMR: 'ر.ع',
  JOD: 'د.ا',
  IQD: 'د.ع',
  TRY: '₺',
  INR: '₹',
  CNY: '¥',
  JPY: '¥',
};

export function useCompanyCurrency() {
  const { activeCompany } = useActiveCompany();
  const currencyCode = (activeCompany as any)?.default_currency || 'SAR';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

  const formatAmount = (amount: number | null | undefined, opts?: { decimals?: number; showSymbol?: boolean }) => {
    const value = amount ?? 0;
    const decimals = opts?.decimals ?? 2;
    const showSymbol = opts?.showSymbol ?? true;
    const formatted = value.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return showSymbol ? `${formatted} ${currencySymbol}` : formatted;
  };

  return { currencyCode, currencySymbol, formatAmount };
}
