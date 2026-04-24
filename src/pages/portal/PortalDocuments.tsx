import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, FileText, Download, Upload, Search, File } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PortalDocuments({ portal, client }: { portal: any; client: any }) {
  const { t } = useLanguage();
  const pc = portal.primary_color || '#1e40af';
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['portal-all-docs', portal.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portal_shared_documents')
        .select('*')
        .eq('portal_id', portal.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = `portal-docs/${portal.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('cpms-documents').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('cpms-documents').getPublicUrl(path);
      
      const { error } = await supabase.from('portal_shared_documents').insert({
        portal_id: portal.id,
        document_name: file.name,
        document_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        category: 'general',
        uploaded_by: client?.full_name || client?.email || 'Client',
        is_client_upload: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-all-docs'] });
      toast({ title: 'Document uploaded successfully' });
    },
    onError: (e: any) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const filtered = docs.filter((d: any) =>
    d.document_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categoryIcon: Record<string, string> = {
    contract: '📋', drawing: '📐', permit: '🏛️', report: '📊', general: '📄',
  };

  const grouped = filtered.reduce((acc: Record<string, any[]>, doc: any) => {
    const cat = doc.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Documents</h2>
          <p className="text-sm text-gray-500">Contracts, drawings, permits, and shared files.</p>
        </div>
        {portal.allow_client_uploads && (
          <>
            <Button onClick={() => fileRef.current?.click()} className="text-white" style={{ backgroundColor: pc }}>
              <Upload className="h-4 w-4 mr-2" /> Upload Document
            </Button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.png,.jpg,.jpeg,.zip" />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="pl-10" />
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-gray-400">Loading documents...</CardContent></Card>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No documents shared yet.</p>
        </CardContent></Card>
      ) : (
        Object.entries(grouped).map(([category, catDocs]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{categoryIcon[category] || '📄'}</span>
                {category.charAt(0).toUpperCase() + category.slice(1)}
                <Badge variant="secondary" className="text-xs">{(catDocs as any[]).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(catDocs as any[]).map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                        <File className="h-4 w-4" style={{ color: pc }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.document_name}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                          {doc.uploaded_by && ` · by ${doc.uploaded_by}`}
                          {doc.is_client_upload && ' (Your upload)'}
                        </p>
                      </div>
                    </div>
                    {doc.document_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3 mr-1" /> Download
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
