import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Paperclip, Upload, Image, FileText, File, Trash2, Download, Eye,
  Tag, Clock, User, X, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Attachment {
  id: string;
  document_type: string;
  document_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  category: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  version: number;
}

interface Props {
  documentType: string;
  documentId: string;
  categories?: string[];
  requiredCategories?: string[];
  compact?: boolean;
}

const CATEGORIES = ['General', 'Contract', 'Payment Proof', 'Approval', 'Technical', 'Design', 'Photo', 'Certificate', 'Other'];

function getFileIcon(mime: string) {
  if (mime?.startsWith('image/')) return <Image className="h-4 w-4 text-info" />;
  if (mime?.includes('pdf')) return <FileText className="h-4 w-4 text-destructive" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function EnhancedAttachmentsPanel({ documentType, documentId, categories, requiredCategories = [], compact }: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ['doc-attachments', documentType, documentId];
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');

  const cats = categories || CATEGORIES;

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_attachments')
        .select('*')
        .eq('document_type', documentType)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!documentType && !!documentId,
  });

  // Check missing required
  const missingRequired = requiredCategories.filter(
    cat => !attachments.some(a => a.category === cat)
  );

  // Upload files
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${documentType}/${documentId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('document-attachments')
          .upload(path, file);
        
        if (uploadError) {
          // If bucket doesn't exist, store as reference
          console.warn('Storage upload failed, saving reference:', uploadError);
        }
        
        const fileUrl = uploadError ? '#' : supabase.storage.from('document-attachments').getPublicUrl(path).data.publicUrl;
        
        const existing = attachments.filter(a => a.file_name === file.name);
        await supabase.from('document_attachments').insert({
          document_type: documentType,
          document_id: documentId,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
          category: selectedCategory,
          uploaded_by: user?.id,
          uploaded_by_name: profile?.full_name || null,
          version: existing.length + 1,
        });
      }
      qc.invalidateQueries({ queryKey: key });
      toast.success(`${Array.from(files).length} file(s) uploaded`);
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [documentType, documentId, selectedCategory, user, profile, attachments, qc, key]);

  const deleteAttachment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_attachments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Attachment removed');
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1 text-xs">
          <Paperclip className="h-3 w-3" /> {attachments.length} files
        </Badge>
        {missingRequired.length > 0 && (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3" /> {missingRequired.length} required missing
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Attachments</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1">{attachments.length}</Badge>
        {missingRequired.length > 0 && (
          <Badge variant="destructive" className="text-[10px] h-4 px-1 gap-0.5 ml-auto">
            <AlertCircle className="h-2.5 w-2.5" /> {missingRequired.length} required
          </Badge>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`m-2 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${documentId}`)?.click()}
      >
        <input
          id={`file-input-${documentId}`}
          type="file"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
        </p>
        <div className="flex items-center gap-2 justify-center mt-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32 h-6 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cats.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Missing required */}
      {missingRequired.length > 0 && (
        <div className="mx-2 mb-2 p-2 bg-destructive/5 border border-destructive/20 rounded text-[10px] text-destructive">
          <span className="font-medium">Missing required:</span> {missingRequired.join(', ')}
        </div>
      )}

      {/* File list */}
      <ScrollArea className="max-h-[250px]">
        {attachments.map(att => (
          <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 group text-xs">
            {getFileIcon(att.mime_type)}
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{att.file_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatSize(att.file_size)} • {att.category}
                {att.uploaded_by_name && ` • ${att.uploaded_by_name}`}
                {att.version > 1 && ` • v${att.version}`}
                {' • '}{formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {(att.mime_type?.startsWith('image/') || att.mime_type?.includes('pdf')) && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                  setPreviewUrl(att.file_url);
                  setPreviewType(att.mime_type);
                }}>
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                <a href={att.file_url} target="_blank" rel="noopener"><Download className="h-3 w-3" /></a>
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteAttachment.mutate(att.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
          </DialogHeader>
          {previewType?.startsWith('image/') ? (
            <img src={previewUrl!} alt="Preview" className="max-h-[70vh] object-contain mx-auto" />
          ) : previewType?.includes('pdf') ? (
            <iframe src={previewUrl!} className="w-full h-[70vh]" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
