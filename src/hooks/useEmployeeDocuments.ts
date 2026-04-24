import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  expiry_date: string | null;
  is_verified: boolean | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmployeeDocuments(employeeId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployeeDocument[];
    },
    enabled: !!employeeId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ employeeId, file, title, documentType, description, expiryDate }: {
      employeeId: string; file: File; title: string; documentType: string;
      description?: string; expiryDate?: string;
    }) => {
      const filePath = `${employeeId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          title,
          document_type: documentType,
          description: description || null,
          file_url: filePath,
          file_name: file.name,
          file_size: file.size,
          expiry_date: expiryDate || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      toast({ title: 'Document uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error uploading document', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: EmployeeDocument) => {
      await supabase.storage.from('employee-documents').remove([doc.file_url]);
      const { error } = await supabase.from('employee_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
      toast({ title: 'Document deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting document', description: error.message, variant: 'destructive' });
    },
  });

  const getDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return { documents, isLoading, uploadDocument, deleteDocument, getDownloadUrl };
}
