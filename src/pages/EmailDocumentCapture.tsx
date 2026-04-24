import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Mail, FileText, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const DOC_TYPES = ['ap_invoice', 'supplier_quotation', 'customer_inquiry', 'service_request', 'support_case'];

export default function EmailDocumentCapture() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ['email-capture', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('email_capture_records' as any).select('*').order('received_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('email_capture_records' as any).update({ ...updates, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-capture'] }); toast({ title: 'Record updated' }); },
  });

  const statusIcon = (s: string) => s === 'approved' ? <CheckCircle className="h-4 w-4 text-green-600" /> : s === 'rejected' ? <XCircle className="h-4 w-4 text-red-600" /> : <Clock className="h-4 w-4 text-orange-600" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" />Email-to-Document Capture</h1>
        <p className="text-muted-foreground">Convert incoming emails into draft ERP documents with review workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Pending Review', value: records.filter((r: any) => r.status === 'pending').length, color: 'text-orange-600' },
          { label: 'Approved', value: records.filter((r: any) => r.status === 'approved').length, color: 'text-green-600' },
          { label: 'Rejected', value: records.filter((r: any) => r.status === 'rejected').length, color: 'text-red-600' },
          { label: 'Total Captured', value: records.length, color: 'text-primary' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Captured Emails</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>From</TableHead><TableHead>Subject</TableHead><TableHead>Suggested Type</TableHead><TableHead>Confidence</TableHead><TableHead>Received</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium text-sm">{r.from_name || r.from_email}</div><div className="text-xs text-muted-foreground">{r.from_email}</div></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{r.subject}</TableCell>
                  <TableCell>
                    <Select defaultValue={r.target_document_type || r.suggested_document_type || ''} onValueChange={v => updateRecord.mutate({ id: r.id, updates: { target_document_type: v } })}>
                      <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant={r.confidence_score > 0.7 ? 'default' : 'secondary'}>{Math.round((r.confidence_score || 0) * 100)}%</Badge></TableCell>
                  <TableCell className="text-sm">{format(new Date(r.received_at), 'dd MMM HH:mm')}</TableCell>
                  <TableCell>{statusIcon(r.status)}</TableCell>
                  <TableCell>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => updateRecord.mutate({ id: r.id, updates: { status: 'approved' } })}><ArrowRight className="h-3 w-3 mr-1" />Create</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateRecord.mutate({ id: r.id, updates: { status: 'rejected' } })}>Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No captured emails yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
