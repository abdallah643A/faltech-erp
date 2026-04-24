import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, FileText, Upload, Download, Trash2, Search, History, Tag, File, Image, FileSpreadsheet, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';

const fileTypeIcons: Record<string, React.ElementType> = {
  pdf: FileText, doc: FileText, docx: FileText,
  xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet,
  png: Image, jpg: Image, jpeg: Image, gif: Image, webp: Image,
};

function getFileIcon(fileName: string) {
  const { t } = useLanguage();

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return fileTypeIcons[ext] || File;
}

function formatFileSize(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DocumentManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [showVersions, setShowVersions] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    entity_type: 'business_partner', entity_id: '', description: '', tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', entityFilter],
    queryFn: async () => {
      let q = supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (entityFilter !== 'all') q = q.eq('entity_type', entityFilter);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['bp-list-docs'],
    queryFn: async () => {
      const { data } = await supabase.from('business_partners').select('id, card_name').limit(500);
      return data || [];
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !uploadForm.entity_id) throw new Error('File and entity required');
      setIsUploading(true);

      const ext = selectedFile.name.split('.').pop();
      const path = `documents/${uploadForm.entity_type}/${uploadForm.entity_id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('project-documents').upload(path, selectedFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('project-documents').getPublicUrl(path);

      // Check for existing document with same name to auto-version
      const { data: existing } = await supabase.from('documents')
        .select('id, version')
        .eq('entity_id', uploadForm.entity_id)
        .eq('file_name', selectedFile.name)
        .order('version', { ascending: false })
        .limit(1);

      const version = existing && existing.length > 0 ? (existing[0].version || 1) + 1 : 1;
      const parentId = existing && existing.length > 0 ? existing[0].id : null;

      const tags = uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      const { error } = await supabase.from('documents').insert({
        file_name: selectedFile.name,
        file_url: urlData.publicUrl || path,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        entity_type: uploadForm.entity_type,
        entity_id: uploadForm.entity_id,
        version,
        parent_document_id: parentId,
        description: uploadForm.description,
        tags,
        uploaded_by: user?.id,
        uploaded_by_name: user?.email?.split('@')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ entity_type: 'business_partner', entity_id: '', description: '', tags: '' });
      toast({ title: 'Document uploaded' });
    },
    onError: (err: any) => {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    },
    onSettled: () => setIsUploading(false),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Document deleted' });
    },
  });

  const filteredDocs = documents.filter((d: any) =>
    d.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const versions = showVersions
    ? documents.filter((d: any) =>
        d.id === showVersions || d.parent_document_id === showVersions ||
        (d.file_name === documents.find((x: any) => x.id === showVersions)?.file_name &&
         d.entity_id === documents.find((x: any) => x.id === showVersions)?.entity_id)
      ).sort((a: any, b: any) => (b.version || 1) - (a.version || 1))
    : [];

  const entityTypes = [
    { value: 'business_partner', label: 'Business Partner' },
    { value: 'lead', label: 'Lead' },
    { value: 'opportunity', label: 'Opportunity' },
    { value: 'sales_order', label: 'Sales Order' },
    { value: 'project', label: 'Project' },
    { value: 'quote', label: 'Quote' },
  ];

  const stats = {
    total: documents.length,
    byType: Object.entries(documents.reduce((acc: any, d: any) => {
      acc[d.entity_type] = (acc[d.entity_type] || 0) + 1;
      return acc;
    }, {})),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.documents')}</h1>
          <p className="text-muted-foreground">Attach files to deals & contacts with version tracking</p>
        </div>
        <Button onClick={() => setShowUpload(true)}><Upload className="h-4 w-4 mr-2" />Upload Document</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Documents</p><p className="text-2xl font-bold">{stats.total}</p></div>
          </div>
        </CardContent></Card>
        {stats.byType.slice(0, 3).map(([type, count]: any) => (
          <Card key={type}><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><File className="h-5 w-5 text-muted-foreground" /></div>
              <div><p className="text-sm text-muted-foreground capitalize">{type.replace('_', ' ')}</p><p className="text-2xl font-bold">{count}</p></div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents, tags..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {entityTypes.map(et => <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map((doc: any) => {
              const IconComp = getFileIcon(doc.file_name);
              return (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconComp className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.file_name}</p>
                        {doc.description && <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{doc.entity_type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="secondary">v{doc.version || 1}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatFileSize(doc.file_size)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(doc.tags || []).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs"><Tag className="h-2 w-2 mr-1" />{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{doc.uploaded_by_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setShowVersions(doc.id)}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDocument.mutate(doc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredDocs.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No documents found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={uploadForm.entity_type} onValueChange={v => setUploadForm(p => ({ ...p, entity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {entityTypes.map(et => <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entity</Label>
                {uploadForm.entity_type === 'business_partner' ? (
                  <Select value={uploadForm.entity_id} onValueChange={v => setUploadForm(p => ({ ...p, entity_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                    <SelectContent>
                      {partners.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.card_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={uploadForm.entity_id} onChange={e => setUploadForm(p => ({ ...p, entity_id: e.target.value }))} placeholder="Entity ID" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} placeholder="Document description..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={uploadForm.tags} onChange={e => setUploadForm(p => ({ ...p, tags: e.target.value }))} placeholder="contract, signed, 2024" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={() => uploadDocument.mutate()} disabled={!selectedFile || !uploadForm.entity_id || isUploading}>
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!showVersions} onOpenChange={() => setShowVersions(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {versions.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={v.id === showVersions ? 'default' : 'secondary'}>v{v.version || 1}</Badge>
                  <div>
                    <p className="text-sm font-medium">{v.file_name}</p>
                    <p className="text-xs text-muted-foreground">{v.uploaded_by_name} · {format(new Date(v.created_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href={v.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                </Button>
              </div>
            ))}
            {versions.length === 0 && <p className="text-center text-muted-foreground py-4">No version history</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
