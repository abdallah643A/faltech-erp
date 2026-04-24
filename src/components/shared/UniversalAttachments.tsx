import { useState, useCallback } from 'react';
import { useAttachments, useRecordComments } from '@/hooks/useUniversalAttachments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Paperclip, Upload, Trash2, Download, FileText, Image, File,
  MessageSquare, Pin, PinOff, Send, Loader2, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UniversalAttachmentsProps {
  entityType: string;
  recordId: string;
  compact?: boolean;
}

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (mime?.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  if (mime?.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function UniversalAttachments({ entityType, recordId, compact }: UniversalAttachmentsProps) {
  const { documents, isLoading, upload, isUploading, deleteDoc } = useAttachments(entityType, recordId);
  const { comments, addComment, togglePin, deleteComment, isAdding } = useRecordComments(entityType, recordId);
  const [commentText, setCommentText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => {
      if (f.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${f.name} exceeds 20MB limit`, variant: 'destructive' });
        return;
      }
      upload(f);
    });
  }, [upload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    addComment(commentText.trim());
    setCommentText('');
  };

  return (
    <Card className={compact ? 'border-0 shadow-none' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments & Notes
          <Badge variant="secondary" className="text-[10px]">{documents.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="h-8">
            <TabsTrigger value="files" className="text-xs gap-1"><Paperclip className="h-3 w-3" />Files ({documents.length})</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1"><MessageSquare className="h-3 w-3" />Notes ({comments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-2 space-y-2">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/40'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById(`file-input-${entityType}-${recordId}`)?.click()}
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Drop files here or click to upload</span>
                </div>
              )}
              <input
                id={`file-input-${entityType}-${recordId}`}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>

            {/* File list */}
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group text-xs">
                    {fileIcon(doc.mime_type)}
                    <div className="flex-1 min-w-0">
                      <a href={doc.file_url} target="_blank" rel="noopener" className="font-medium truncate block hover:underline">{doc.file_name}</a>
                      <div className="text-muted-foreground text-[10px]">
                        {formatSize(doc.file_size)} · {doc.uploaded_by_name} · {format(new Date(doc.created_at), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener"><Download className="h-3 w-3" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteDoc(doc.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!isLoading && documents.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-4">No attachments yet</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notes" className="mt-2 space-y-2">
            {/* Comment input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="min-h-[60px] text-xs"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitComment(); }}
              />
              <Button size="sm" onClick={handleSubmitComment} disabled={!commentText.trim() || isAdding} className="self-end">
                <Send className="h-3 w-3" />
              </Button>
            </div>

            {/* Comments list */}
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className={`p-2 rounded-md text-xs border ${c.is_pinned ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{c.user_name || 'User'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-[10px]">{format(new Date(c.created_at), 'dd MMM yyyy HH:mm')}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => togglePin({ id: c.id, pinned: c.is_pinned })}>
                          {c.is_pinned ? <PinOff className="h-3 w-3 text-yellow-600" /> : <Pin className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteComment(c.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{c.comment_text}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-4">No notes yet</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
