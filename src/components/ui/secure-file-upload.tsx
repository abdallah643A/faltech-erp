import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, Image, File as FileIcon, Loader2 } from 'lucide-react';
import { validateFile, formatFileSize, ALLOWED_EXTENSIONS } from '@/utils/fileValidation';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface SecureFileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  uploading?: boolean;
  progress?: number;
  onCancel?: () => void;
}

const ALLOWED_ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.docx,.xlsx';

export function SecureFileUpload({
  onFilesSelected, accept, multiple = false, maxFiles = 10,
  uploading, progress, onCancel,
}: SecureFileUploadProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach(f => {
      const result = validateFile(f);
      if (result.valid) valid.push(f);
      else errors.push(`${f.name}: ${result.error}`);
    });

    if (errors.length) {
      toast({ title: 'Upload Error', description: errors.join('; '), variant: 'destructive' });
    }

    if (valid.length > maxFiles) {
      toast({ title: 'Too many files', description: `Maximum ${maxFiles} files allowed`, variant: 'destructive' });
      valid.splice(maxFiles);
    }

    setSelectedFiles(valid);
    if (valid.length) onFilesSelected(valid);
  }, [maxFiles, onFilesSelected, toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Image className="h-4 w-4 text-green-500" />;
    if (ext === 'pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <FileIcon className="h-4 w-4 text-blue-500" />;
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          {language === 'ar' ? 'اسحب الملفات هنا أو انقر للاختيار' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {language === 'ar' ? 'الحد الأقصى 50 ميجا' : 'Max 50MB'} · PDF, JPG, PNG, GIF, DOCX, XLSX
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept || ALLOWED_ACCEPT}
          multiple={multiple}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
              {getFileIcon(file.name)}
              <span className="text-sm flex-1 truncate">{file.name}</span>
              <Badge variant="outline" className="text-xs">{formatFileSize(file.size)}</Badge>
              {!uploading && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
            {progress !== undefined && <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>}
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="ml-auto">
                <X className="h-3 w-3 mr-1" />{language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            )}
          </div>
          {progress !== undefined && <Progress value={progress} className="h-2" />}
        </div>
      )}
    </div>
  );
}
