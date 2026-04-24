import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Check, X, Loader2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * InlineEditCell — Module 1 / Enhancement #12
 *
 * Click-to-edit field. Supports text/number/date/select. Optimistic UI
 * with rollback on error, Enter=save, Esc=cancel, blur=save.
 *
 * Usage:
 *   <InlineEditCell
 *     value={po.remarks}
 *     onSave={async v => await supabase.from('purchase_orders')
 *       .update({ remarks: v }).eq('id', po.id)}
 *   />
 */

type CellType = 'text' | 'number' | 'date' | 'select';

interface BaseProps<V> {
  value: V;
  onSave: (next: V) => void | Promise<void>;
  type?: CellType;
  /** Display formatter (read mode). */
  format?: (v: V) => string;
  /** Validate before save. Return error string to block. */
  validate?: (v: V) => string | null;
  /** Disable editing entirely. */
  readOnly?: boolean;
  /** Placeholder shown when value is empty. */
  placeholder?: string;
  className?: string;
  /** For select: option list. */
  options?: { value: string; label: string }[];
  /** Show pencil hint on hover. Default true. */
  showHint?: boolean;
  /** Min/max for number type. */
  min?: number;
  max?: number;
  /** Step for number type. */
  step?: number;
  /** Cell width hint, e.g. "w-32". */
  widthClass?: string;
}

export function InlineEditCell<V extends string | number | null>({
  value,
  onSave,
  type = 'text',
  format,
  validate,
  readOnly,
  placeholder,
  className,
  options,
  showHint = true,
  min, max, step,
  widthClass,
}: BaseProps<V>) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<V>(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editing]);

  const display = format
    ? format(value)
    : (value === null || value === '' || value === undefined
        ? (placeholder ?? (isAr ? '— انقر للتعديل —' : '— click to edit —'))
        : String(value));

  const isEmpty = value === null || value === '' || value === undefined;

  const commit = async () => {
    if (draft === value) { setEditing(false); return; }
    const err = validate?.(draft) ?? null;
    if (err) { setError(err); toast.error(err); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e: any) {
      setDraft(value); // rollback
      const msg = e?.message ?? (isAr ? 'فشل الحفظ' : 'Save failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value);
    setError(null);
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  if (readOnly) {
    return (
      <span className={cn('text-sm', isEmpty && 'text-muted-foreground italic', className)}>
        {display}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          'group inline-flex items-center gap-1 text-sm rounded px-1.5 py-0.5',
          'hover:bg-accent transition-colors text-left',
          isEmpty && 'text-muted-foreground italic',
          className,
        )}
        aria-label={isAr ? 'تعديل' : 'Edit'}
      >
        <span className="truncate">{display}</span>
        {showHint && (
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
        )}
      </button>
    );
  }

  // ─── Edit mode ──────────────────────────────────────────────
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {type === 'select' && options ? (
        <Select
          value={String(draft ?? '')}
          onValueChange={(v) => setDraft(v as V)}
          open
          onOpenChange={(o) => { if (!o) commit(); }}
        >
          <SelectTrigger className={cn('h-8 text-sm', widthClass ?? 'w-40')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          ref={inputRef}
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          value={draft === null || draft === undefined ? '' : String(draft)}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(
              (type === 'number'
                ? (v === '' ? null : Number(v))
                : v) as V
            );
          }}
          onKeyDown={handleKey}
          onBlur={commit}
          disabled={saving}
          min={min}
          max={max}
          step={step}
          className={cn(
            'h-8 text-sm',
            widthClass ?? (type === 'number' ? 'w-24' : 'w-40'),
            error && 'border-destructive focus-visible:ring-destructive',
          )}
          aria-invalid={!!error}
        />
      )}

      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-success hover:text-success"
            onClick={commit}
            aria-label={isAr ? 'حفظ' : 'Save'}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onMouseDown={(e) => e.preventDefault() /* prevent blur-then-save */}
            onClick={cancel}
            aria-label={isAr ? 'إلغاء' : 'Cancel'}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
