import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSearch, Upload, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DocumentClassification() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();

  const { data: docs = [] } = useQuery({
    queryKey: ['doc-classification', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('document_classifications' as any).select('*').order('created_at', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const pending = docs.filter((d: any) => d.review_status === 'pending');
  const classified = docs.filter((d: any) => d.review_status === 'confirmed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSearch className="h-6 w-6" />Document Classification</h1>
          <p className="text-muted-foreground">AI-assisted detection and routing of uploaded documents</p>
        </div>
        <Button><Upload className="h-4 w-4 mr-2" />Upload Documents</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Total Processed', value: docs.length, icon: FileSearch },
          { label: 'Pending Review', value: pending.length, icon: Clock },
          { label: 'Confirmed', value: classified.length, icon: CheckCircle },
          { label: 'Low Confidence', value: docs.filter((d: any) => (d.confidence || 0) < 0.7).length, icon: AlertTriangle },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Classified Documents</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>File Name</TableHead><TableHead>Detected Type</TableHead><TableHead>Confidence</TableHead><TableHead>Suggested Workflow</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {docs.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-sm">{d.file_name}</TableCell>
                  <TableCell><Badge variant="outline">{d.detected_type || 'Unknown'}</Badge></TableCell>
                  <TableCell><span className={`font-bold ${(d.confidence || 0) > 0.85 ? 'text-green-600' : (d.confidence || 0) > 0.6 ? 'text-orange-600' : 'text-red-600'}`}>{Math.round((d.confidence || 0) * 100)}%</span></TableCell>
                  <TableCell className="text-sm">{d.suggested_workflow || '—'}</TableCell>
                  <TableCell><Badge variant={d.review_status === 'confirmed' ? 'default' : d.review_status === 'rejected' ? 'destructive' : 'secondary'}>{d.review_status}</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(d.created_at), 'dd MMM yyyy')}</TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents classified yet. Upload files to begin.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
