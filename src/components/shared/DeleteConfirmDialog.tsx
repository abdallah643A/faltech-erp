import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemCount?: number;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemCount,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const { language } = useLanguage();

  const defaultTitle = itemCount && itemCount > 1
    ? (language === 'ar' ? `حذف ${itemCount} عنصر` : `Delete ${itemCount} Items`)
    : (language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion');

  const defaultDescription = itemCount && itemCount > 1
    ? (language === 'ar'
        ? `هل أنت متأكد من حذف ${itemCount} عنصر؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to delete ${itemCount} items? This action cannot be undone.`)
    : (language === 'ar'
        ? 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.'
        : 'Are you sure you want to delete this item? This action cannot be undone.');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>{title || defaultTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading
              ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...')
              : (language === 'ar' ? 'حذف' : 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
