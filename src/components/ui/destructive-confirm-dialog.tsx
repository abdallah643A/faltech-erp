import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DestructiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  /** If set, user must type this text to confirm */
  confirmText?: string;
  /** Number of items being deleted */
  itemCount?: number;
  /** Number of attachments that will be lost */
  attachmentCount?: number;
  /** Loading state */
  loading?: boolean;
}

export function DestructiveConfirmDialog({
  open, onOpenChange, onConfirm, title, description,
  confirmText, itemCount, attachmentCount, loading,
}: DestructiveConfirmDialogProps) {
  const { language } = useLanguage();
  const [typed, setTyped] = useState('');

  const needsTyping = confirmText || (itemCount && itemCount > 10);
  const requiredText = confirmText || 'DELETE EVERYTHING';
  const canConfirm = needsTyping ? typed === requiredText : true;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    setTyped('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setTyped('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title || (language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion')}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{description || (language === 'ar' ? 'هل أنت متأكد من هذا الإجراء؟' : 'Are you sure about this action?')}</p>
            
            {itemCount && itemCount > 1 && (
              <p className="font-medium text-foreground">
                {language === 'ar' 
                  ? `سيتم حذف ${itemCount} عنصر` 
                  : `${itemCount} items will be deleted.`}
              </p>
            )}

            {attachmentCount && attachmentCount > 0 && (
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ {language === 'ar' 
                  ? `${attachmentCount} مرفق سيتم حذفه أيضاً` 
                  : `${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''} will also be permanently deleted.`}
              </p>
            )}

            <p className="text-destructive font-semibold text-sm">
              {language === 'ar' ? '⛔ لا يمكن التراجع عن هذا الإجراء.' : '⛔ This action cannot be undone.'}
            </p>
          </DialogDescription>
        </DialogHeader>

        {needsTyping && (
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `اكتب "${requiredText}" للتأكيد:` 
                : `Type "${requiredText}" to confirm:`}
            </p>
            <Input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={requiredText}
              className="font-mono"
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm || loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            {loading 
              ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...') 
              : (language === 'ar' ? 'حذف نهائي' : 'Delete Permanently')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple single-item delete confirmation (no typing required)
 */
interface SimpleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function SimpleDeleteConfirmDialog({
  open, onOpenChange, onConfirm, title, description, loading,
}: SimpleConfirmDialogProps) {
  const { language } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title || (language === 'ar' ? 'تأكيد الحذف' : 'Delete Confirmation')}
          </DialogTitle>
          <DialogDescription>
            {description || (language === 'ar' ? 'هل أنت متأكد أنك تريد حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this item? This action cannot be undone.')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            {loading ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...') : (language === 'ar' ? 'حذف' : 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
