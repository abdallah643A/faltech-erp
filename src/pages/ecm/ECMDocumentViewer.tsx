import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, Printer, ZoomIn, ZoomOut, RotateCw,
  Lock, Unlock, MessageSquare, Stamp, Highlighter, StickyNote,
  History, Shield, FileText, Tag, Clock, User, Building2
} from 'lucide-react';

export default function ECMDocumentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['ecm-document', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_documents').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['ecm-versions', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_document_versions').select('*').eq('document_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: annotations = [] } = useQuery({
    queryKey: ['ecm-annotations', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_document_annotations').select('*').eq('document_id', id!).order('page_number');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['ecm-audit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_document_audit').select('*').eq('document_id', id!).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const toggleCheckout = useMutation({
    mutationFn: async () => {
      if (!doc) return;
      const { error } = await supabase.from('ecm_documents').update({
        is_checked_out: !doc.is_checked_out,
        checked_out_by: !doc.is_checked_out ? user?.id : null,
        checked_out_at: !doc.is_checked_out ? new Date().toISOString() : null,
      }).eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecm-document', id] });
      toast.success(doc?.is_checked_out ? 'Document checked in' : 'Document checked out');
    },
  });

  const handleDownload = async () => {
    if (!doc) return;
    const { data } = await supabase.storage.from('ecm-documents').createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><p>Loading...</p></div>;
  if (!doc) return <div className="flex items-center justify-center h-64"><p>Document not found</p></div>;

  const CONF_COLORS: Record<string, string> = {
    public: 'bg-green-100 text-green-800', internal: 'bg-blue-100 text-blue-800',
    confidential: 'bg-amber-100 text-amber-800', strictly_confidential: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-lg font-bold">{doc.title}</h1>
            <p className="text-sm text-muted-foreground">{doc.document_number} • v{doc.current_version_number}</p>
          </div>
          <Badge variant="outline" className={CONF_COLORS[doc.confidentiality || 'internal']}>
            {(doc.confidentiality || 'internal').replace(/_/g, ' ')}
          </Badge>
          <Badge variant={doc.status === 'active' ? 'default' : doc.status === 'expired' ? 'destructive' : 'secondary'}>
            {doc.status}
          </Badge>
          {doc.is_checked_out && <Badge variant="outline" className="bg-amber-50 text-amber-700"><Lock className="h-3 w-3 mr-1" /> Checked Out</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(25, z - 25))}><ZoomOut className="h-4 w-4" /></Button>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(300, z + 25))}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}><RotateCw className="h-4 w-4" /></Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={() => toggleCheckout.mutate()}>
            {doc.is_checked_out ? <><Unlock className="h-4 w-4 mr-1" /> Check In</> : <><Lock className="h-4 w-4 mr-1" /> Check Out</>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}><Download className="h-4 w-4 mr-1" /> Download</Button>
          <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-250px)]">
        {/* Document Preview */}
        <Card className="flex-1 border-border overflow-hidden">
          <CardContent className="p-0 h-full flex items-center justify-center bg-muted/20">
            <div style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transition: 'transform 0.3s' }}>
              {doc.mime_type?.startsWith('image/') ? (
                <img src={`https://aymdzjbgfeqcxitglopo.supabase.co/storage/v1/object/public/ecm-documents/${doc.file_path}`} alt={doc.title} className="max-w-full max-h-[70vh] object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-4 p-12 text-muted-foreground">
                  <FileText className="h-24 w-24 opacity-20" />
                  <p className="font-medium">{doc.file_name}</p>
                  <p className="text-sm">Preview not available — click Download to view</p>
                  <Button onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> Open Document</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <Card className="w-80 shrink-0 border-border">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="mx-3 mt-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-4 pt-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">File Name</span><span className="font-medium truncate ml-2">{doc.file_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{(doc.file_size / 1024).toFixed(0)} KB</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{doc.document_type}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{doc.department || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Author</span><span>{doc.author || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span>{doc.reference_number || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(doc.created_at).toLocaleDateString()}</span></div>
                    {doc.expiry_date && <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span>{new Date(doc.expiry_date).toLocaleDateString()}</span></div>}
                  </div>
                  {doc.tags && doc.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="versions" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No version history</p>
                  ) : versions.map(v => (
                    <div key={v.id} className="p-3 border rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={v.version_type === 'major' ? 'default' : 'secondary'}>v{v.version_number}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                      </div>
                      {v.comment && <p className="text-xs text-muted-foreground">{v.comment}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="audit" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-2 pt-2">
                  {auditLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No audit entries</p>
                  ) : auditLog.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2 py-2 border-b last:border-0">
                      <Shield className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="text-xs">
                        <p><span className="font-medium">{entry.user_name || 'System'}</span> {entry.action}</p>
                        <p className="text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
