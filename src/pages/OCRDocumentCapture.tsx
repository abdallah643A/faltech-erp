import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ScanLine, Upload, CheckCircle, AlertTriangle, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const DOC_TYPES = ['ap_invoice', 'receipt', 'contract', 'general'];

export default function OCRDocumentCapture() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('ap_invoice');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data: records = [] } = useQuery({
    queryKey: ['ocr-capture', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ocr_capture_records' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['ocr-fields', selectedRecord?.id],
    queryFn: async () => {
      if (!selectedRecord) return [];
      const { data, error } = await (supabase.from('ocr_extracted_fields' as any).select('*').eq('capture_id', selectedRecord.id) as any);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRecord,
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('ocr-uploads').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = await supabase.storage.from('ocr-uploads').createSignedUrl(path, 3600);
      if (!urlData) throw new Error('Could not create signed URL');

      const { data, error } = await supabase.functions.invoke('ocr-extract', {
        body: {
          file_url: urlData.signedUrl,
          document_type: uploadType,
          file_name: file.name,
          company_id: activeCompanyId,
        },
      });
      if (error) throw error;
      toast({ title: 'Extraction complete', description: `Confidence: ${Math.round((data?.overall_confidence ?? 0) * 100)}%` });
      qc.invalidateQueries({ queryKey: ['ocr-capture'] });
    } catch (e) {
      toast({ title: 'OCR failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveCorrections = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editValues).map(([id, val]) =>
        (supabase.from('ocr_extracted_fields' as any).update({ corrected_value: val, needs_review: false }).eq('id', id) as any),
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocr-fields', selectedRecord?.id] });
      toast({ title: 'Corrections saved' });
    },
  });

  const approveRecord = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('ocr_capture_records' as any).update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocr-capture'] }); toast({ title: 'Document approved and record created' }); },
  });

  const confidenceColor = (c: number) => c > 0.85 ? 'text-green-600' : c > 0.6 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScanLine className="h-6 w-6" />OCR Document Capture</h1>
          <p className="text-muted-foreground">Extract data from scanned invoices, receipts, and contracts via AI.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={uploadType} onValueChange={setUploadType}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
          <Input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Processing', value: records.filter((r: any) => r.status === 'processing').length },
          { label: 'Needs Review', value: records.filter((r: any) => r.status === 'needs_review').length },
          { label: 'Approved', value: records.filter((r: any) => r.status === 'approved').length },
          { label: 'Total Scanned', value: records.length },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Scanned Documents</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>File</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Confidence</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.file_name || 'Document'}</TableCell>
                  <TableCell><Badge variant="outline">{r.document_type}</Badge></TableCell>
                  <TableCell><span className={`font-bold ${confidenceColor(r.overall_confidence)}`}>{Math.round((r.overall_confidence || 0) * 100)}%</span></TableCell>
                  <TableCell><Badge variant={r.status === 'approved' ? 'default' : r.status === 'needs_review' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedRecord(r); setEditValues({}); }}><Eye className="h-3 w-3 mr-1" />Review</Button>
                      {r.status !== 'approved' && <Button size="sm" onClick={() => approveRecord.mutate(r.id)}><CheckCircle className="h-3 w-3 mr-1" />Approve</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scanned documents</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Extracted Fields</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {fields.map((f: any) => (
              <div key={f.id} className="flex items-center gap-3">
                <div className="w-1/3">
                  <Label className="text-sm">{f.field_label || f.field_name}</Label>
                  {f.needs_review && <AlertTriangle className="h-3 w-3 text-orange-500 inline ml-1" />}
                </div>
                <Input
                  defaultValue={f.corrected_value || f.extracted_value}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  className="flex-1"
                />
                <Badge variant={f.confidence > 0.85 ? 'default' : 'destructive'} className="text-[10px] w-12 justify-center">{Math.round(f.confidence * 100)}%</Badge>
              </div>
            ))}
            {fields.length === 0 && <p className="text-center text-muted-foreground py-4">No fields extracted</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
            <Button onClick={() => saveCorrections.mutate()} disabled={Object.keys(editValues).length === 0}>
              Save Corrections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
