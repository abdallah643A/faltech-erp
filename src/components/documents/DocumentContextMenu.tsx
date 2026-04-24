import { useState, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FlowChain } from '@/hooks/useDocumentFlow';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DocumentRelationshipMap from './DocumentRelationshipMap';
import { GitBranch, ExternalLink, Copy, FileText } from 'lucide-react';

interface DocumentContextMenuProps {
  children: ReactNode;
  chain: FlowChain;
  documentType: string;
  documentId: string;
  documentNumber?: string;
  onOpen?: () => void;
  onCopyNumber?: () => void;
  extraItems?: { label: string; labelAr?: string; icon?: ReactNode; onClick: () => void }[];
}

export default function DocumentContextMenu({
  children, chain, documentType, documentId, documentNumber, onOpen, onCopyNumber, extraItems,
}: DocumentContextMenuProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [showMap, setShowMap] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={() => setShowMap(true)} className="gap-2">
            <GitBranch className="h-4 w-4" />
            {isAr ? 'خريطة العلاقات' : 'Relationship Map'}
          </ContextMenuItem>
          {onOpen && (
            <ContextMenuItem onClick={onOpen} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {isAr ? 'فتح المستند' : 'Open Document'}
            </ContextMenuItem>
          )}
          {documentNumber && (
            <ContextMenuItem
              onClick={() => {
                navigator.clipboard.writeText(documentNumber);
                onCopyNumber?.();
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {isAr ? 'نسخ رقم المستند' : 'Copy Document No.'}
            </ContextMenuItem>
          )}
          {extraItems && extraItems.length > 0 && (
            <>
              <ContextMenuSeparator />
              {extraItems.map((item, i) => (
                <ContextMenuItem key={i} onClick={item.onClick} className="gap-2">
                  {item.icon || <FileText className="h-4 w-4" />}
                  {isAr && item.labelAr ? item.labelAr : item.label}
                </ContextMenuItem>
              ))}
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              {isAr ? 'خريطة العلاقات' : 'Relationship Map'}
              {documentNumber && <span className="text-muted-foreground font-mono text-sm">— {documentNumber}</span>}
            </DialogTitle>
          </DialogHeader>
          <DocumentRelationshipMap
            chain={chain}
            documentType={documentType}
            documentId={documentId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
