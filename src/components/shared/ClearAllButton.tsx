import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ClearAllButtonProps {
  tableName: string;
  displayName: string;
  queryKeys: string[];
  /** Optional related tables to clear first (child tables with FK) */
  relatedTables?: string[];
}

export function ClearAllButton({ tableName, displayName, queryKeys, relatedTables }: ClearAllButtonProps) {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [open, setOpen] = useState(false);

  // Only admins can see this button
  if (!hasRole('admin')) return null;

  const handleClear = async () => {
    if (confirmText !== 'DELETE') return;
    setIsLoading(true);
    try {
      // Clear related tables first (child tables)
      if (relatedTables) {
        for (const related of relatedTables) {
          const { error } = await supabase.from(related as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) console.error(`Error clearing ${related}:`, error.message);
        }
      }
      // Clear main table
      const { error } = await supabase.from(tableName as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      
      // Invalidate queries
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      
      toast({ title: `${displayName} cleared`, description: 'All records have been deleted.' });
      setOpen(false);
      setConfirmText('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(''); }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-1" /> {t('custom.clear_all') !== 'custom.clear_all' ? t('custom.clear_all') : 'Clear All'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('custom.clear_all_title') !== 'custom.clear_all_title' ? t('custom.clear_all_title') : `Clear All ${displayName}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('custom.clear_all_desc') !== 'custom.clear_all_desc'
              ? t('custom.clear_all_desc')
              : <>This will permanently delete ALL records from {displayName}. This action cannot be undone. Type <strong>DELETE</strong> to confirm.</>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={t('custom.clear_all_placeholder') !== 'custom.clear_all_placeholder' ? t('custom.clear_all_placeholder') : 'Type DELETE to confirm'}
          className="mt-2"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>{t('custom.cancel') !== 'custom.cancel' ? t('custom.cancel') : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={confirmText !== 'DELETE' || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t('custom.delete_all') !== 'custom.delete_all' ? t('custom.delete_all') : 'Delete All'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
