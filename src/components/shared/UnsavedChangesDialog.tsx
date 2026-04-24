import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnsavedChangesDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({ open, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {isAr ? 'تغييرات غير محفوظة' : 'Unsaved Changes'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isAr
              ? 'أنت تغادر بدون حفظ، هل تريد الحفظ؟'
              : 'You are leaving without saving. Do you want to save?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDiscard}>
            <X className="h-4 w-4 mr-1" />
            {isAr ? 'لا، تجاهل' : 'No, Discard'}
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-1" />
            {isAr ? 'نعم، حفظ' : 'Yes, Save'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
