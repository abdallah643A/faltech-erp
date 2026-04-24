import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage, LANGUAGE_OPTIONS } from '@/contexts/LanguageContext';
import { useDbTranslations } from '@/hooks/useDbTranslations';
import { Globe, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TranslationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translationKey: string;
  currentText: string;
  context?: string;
}

export default function TranslationEditDialog({
  open, onOpenChange, translationKey, currentText, context,
}: TranslationEditDialogProps) {
  const { language } = useLanguage();
  const { upsertTranslation, translationMap } = useDbTranslations(language);
  const { toast } = useToast();
  const [text, setText] = useState('');

  const currentLang = LANGUAGE_OPTIONS.find(l => l.code === language);

  useEffect(() => {
    if (open) {
      setText(translationMap.get(translationKey) || currentText || '');
    }
  }, [open, translationKey, currentText, translationMap]);

  const handleSave = async () => {
    if (!text.trim()) return;
    try {
      await upsertTranslation.mutateAsync({ key: translationKey, text: text.trim(), context });
      toast({ title: language === 'ar' ? 'تم حفظ الترجمة' : 'Translation saved' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'تعديل الترجمة' : 'Edit Translation'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">
              {language === 'ar' ? 'المفتاح' : 'Key'}
            </Label>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">
              {translationKey}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              {language === 'ar' ? 'اللغة الحالية' : 'Current Language'}
            </Label>
            <p className="text-sm flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {currentLang?.nativeLabel || language} ({currentLang?.label})
            </p>
          </div>

          <div>
            <Label htmlFor="translation-text">
              {language === 'ar' ? 'الترجمة' : 'Translation'}
            </Label>
            <Textarea
              id="translation-text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل الترجمة...' : 'Enter translation...'}
              rows={3}
              dir={language === 'ar' || language === 'ur' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={upsertTranslation.isPending || !text.trim()}>
              {upsertTranslation.isPending
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
