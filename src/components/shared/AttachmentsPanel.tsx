import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Paperclip, UploadCloud, Download, Trash2, Loader2, Inbox,
  FileText, FileImage, FileSpreadsheet, FileVideo, FileArchive, File as FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useRecordAttachments, formatFileSize, RecordAttachment,
} from '@/hooks/useRecordAttachments';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Props {
  entityType: string;
  recordId: string;
  /** Override panel title. */
  title?: string;
  /** Restrict file types, e.g. ['application/pdf', 'image/*']. */
  accept?: string;
  /** Max file size in bytes (default 25 MB). */
  maxSize?: number;
  /** Read-only mode (hide upload + delete). */
  readOnly?: boolean;
}

const DEFAULT_MAX = 25 * 1024 * 1024;

function pickIcon(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime === 'application/pdf') return FileText;
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return FileArchive;
  return FileText;
}

export function AttachmentsPanel({
  entityType, recordId, title, accept, maxSize = DEFAULT_MAX, readOnly,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { attachments, isLoading, upload, isUploading, remove } =
    useRecordAttachments(entityType, recordId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDel, setConfirmDel] = useState<RecordAttachment | null>(null);

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(f => {
      if (f.size > maxSize) {
        // Defer to toast in hook? handled here for clarity
        import('sonner').then(({ toast }) =>
          toast.error(
            isAr
              ? `${f.name}: تجاوز الحد الأقصى ${formatFileSize(maxSize)}`
              : `${f.name}: exceeds ${formatFileSize(maxSize)} limit`
          ));
        return;
      }
      upload({ file: f });
    });
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (readOnly) return;
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = ''; // reset
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">
            {title ?? (isAr ? 'المرفقات' : 'Attachments')}
          </h3>
          <Badge variant="outline" className="text-xs">{attachments.length}</Badge>
        </div>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={accept}
              className="hidden"
              onChange={onPickFiles}
            />
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              {isUploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" />
                : <UploadCloud className="h-3.5 w-3.5 me-1" />}
              {isAr ? 'رفع' : 'Upload'}
            </Button>
          </>
        )}
      </div>

      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'mb-3 rounded-lg border-2 border-dashed py-6 text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-accent/40',
          )}
        >
          <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">
            {isAr
              ? 'اسحب الملفات هنا أو انقر للاختيار'
              : 'Drag files here or click to choose'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isAr ? 'الحد الأقصى' : 'Max'} {formatFileSize(maxSize)}
          </p>
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-muted-foreground">
            <Inbox className="h-7 w-7 opacity-50" />
            <p className="text-sm">{isAr ? 'لا توجد مرفقات' : 'No attachments yet'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map(a => {
              const Icon = pickIcon(a.mime_type);
              return (
                <div
                  key={a.id}
                  className="group flex items-center gap-3 rounded-md border p-2 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium truncate block hover:underline"
                      title={a.file_name}
                    >
                      {a.file_name}
                    </a>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>{formatFileSize(a.file_size)}</span>
                      {a.uploaded_by_name && (
                        <>
                          <span>·</span>
                          <span>{a.uploaded_by_name}</span>
                        </>
                      )}
                      {a.created_at && (
                        <>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                        </>
                      )}
                      {a.category && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {a.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      asChild
                    >
                      <a href={a.file_url} download={a.file_name} target="_blank" rel="noreferrer" aria-label="Download">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    {!readOnly && (
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => setConfirmDel(a)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent dir={isAr ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAr ? 'حذف المرفق؟' : 'Delete attachment?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? `سيتم حذف "${confirmDel?.file_name}" نهائياً.`
                : `"${confirmDel?.file_name}" will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDel) { remove(confirmDel); setConfirmDel(null); } }}
            >
              {isAr ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
