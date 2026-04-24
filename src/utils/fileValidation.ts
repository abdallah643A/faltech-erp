import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'docx', 'xlsx'];
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // Check size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File too large (${sizeMB}MB). Maximum allowed is 50MB.` };
  }

  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type ".${ext}" not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }

  // Check MIME type as secondary validation
  const allowedMimes = [
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (file.type && !allowedMimes.includes(file.type)) {
    // Warn but don't block - some browsers report wrong MIME types
    console.warn(`Unexpected MIME type: ${file.type} for file: ${file.name}`);
  }

  return { valid: true };
}

export function validateFiles(files: FileList | File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];

  Array.from(files).forEach(file => {
    const result = validateFile(file);
    if (result.valid) {
      valid.push(file);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  });

  return { valid, errors };
}

export function useFileUploadValidator() {
  const { toast } = useToast();

  const validate = useCallback((files: FileList | File[]): File[] => {
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      toast({
        title: 'Upload Error',
        description: errors.join('\n'),
        variant: 'destructive',
      });
    }

    return valid;
  }, [toast]);

  return { validate, ALLOWED_EXTENSIONS, MAX_FILE_SIZE };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
