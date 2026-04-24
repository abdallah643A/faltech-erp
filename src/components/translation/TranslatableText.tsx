import { useState, useCallback, ReactNode } from 'react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import TranslationEditDialog from './TranslationEditDialog';

interface TranslatableTextProps {
  /** The translation key (e.g. 'nav.dashboard') */
  tKey: string;
  /** Children = displayed text */
  children: ReactNode;
  /** Optional page/module context hint */
  context?: string;
  /** If true, renders as inline span instead of block */
  as?: 'span' | 'div';
}

/**
 * Wraps any text so that right-clicking shows an option to edit/add translation.
 * Usage: <TranslatableText tKey="nav.dashboard">Dashboard</TranslatableText>
 */
export default function TranslatableText({ tKey, children, context, as = 'span' }: TranslatableTextProps) {
  const { language } = useLanguage();
  const [showEdit, setShowEdit] = useState(false);
  const isAr = language === 'ar';

  const currentText = typeof children === 'string' ? children : '';

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {as === 'div' ? <div>{children}</div> : <span>{children}</span>}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => setShowEdit(true)} className="gap-2">
            <Languages className="h-4 w-4" />
            {isAr ? 'تعديل الترجمة' : 'Edit Translation'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <TranslationEditDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        translationKey={tKey}
        currentText={currentText}
        context={context}
      />
    </>
  );
}
