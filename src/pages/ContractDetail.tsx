import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, FileText, Clock, Shield, Scale, TrendingUp, Gavel, History, ArrowUpDown, Paperclip } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', review: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800', signed: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800', amended: 'bg-amber-100 text-amber-800',
  suspended: 'bg-orange-100 text-orange-800', expired: 'bg-red-100 text-red-800',
  terminated: 'bg-red-200 text-red-900', pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: contract } = useQuery({
    queryKey: ['contract-detail', id],
    queryFn: async () => {
      const { data } = await (supabase.from('contracts' as any).select('*').eq('id', id).single() as any);
      return data as any;
    },
    enabled: !!id,
  });

  const { data: amendments = [] } = useQuery({
    queryKey: ['contract-amendments', id],
    queryFn: async () => { const { data } = await (supabase.from('contract_amendments' as any).select('*').eq('contract_id', id).order('created_at', { ascending: false }) as any); return (data || []) as any[]; },
    enabled: !!id,
  });

  const { data: obligations = [] } = useQuery({
    queryKey: ['contract-obligations', id],
    queryFn: async () => { const { data } = await (supabase.from('contract_obligations' as any).select('*').eq('contract_id', id).order('due_date') as any); return (data || []) as any[]; },
    enabled: !!id,
  });

  const { data: guarantees = [] } = useQuery({
    queryKey: ['contract-guarantees', id],
    queryFn: async () => { const { data } = await (supabase.from('contract_guarantees' as any).select('*').eq('contract_id', id).order('expiry_date') as any); return (data || []) as any[]; },
    enabled: !!id,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['contract-claims', id],
    queryFn: async () => { const { data } = await (supabase.from('contract_claims' as any).select('*').eq('contract_id', id).order('created_at', { ascending: false }) as any); return (data || []) as any[]; },
    enabled: !!id,
  });

  const { data: variations = [] } = useQuery({
    queryKey: ['contract-variations', id],
    queryFn: async () => { const { data } = await (supabase.from('contract_variations' as any).select('*').eq('contract_id', id).order('created_at', { ascending: false }) as any); return (data || []) as any[]; },
    enabled: !!id,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['contract-documents', id],
    queryFn: async () => { const { data } = await (supabase.from('contract_documents' as any).select('*').eq('contract_id', id).order('created_at', { ascending: false }) as any); return (data || []) as any[]; },
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['contract-history', id],
    queryFn: async () => { const { data } = await (supabase.from('contract_history' as any).select('*').eq('contract_id', id).order('created_at', { ascending: false }) as any); return (data || []) as any[]; },
    enabled: !!id,
  });

  if (!contract) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const daysLeft = contract.end_date ? differenceInDays(new Date(contract.end_date), new Date()) : null;
  const totalVariationImpact = variations.reduce((s: number, v: any) => s + Number(v.cost_impact || 0), 0);
  const revisedValue = Number(contract.value || 0) + totalVariationImpact;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contract-management')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {contract.contract_number} — {contract.partner_name}
          </h1>
          <p className="text-sm text-muted-foreground">{contract.title || contract.contract_type}</p>
        </div>
        <Badge className={`text-base px-3 py-1 ${statusColors[contract.status] || 'bg-muted'}`}>{contract.status}</Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Original Value</p><p className="text-lg font-bold">{Number(contract.value || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Revised Value</p><p className="text-lg font-bold text-foreground">{revisedValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Retention</p><p className="text-lg font-bold">{contract.retention_pct || 0}%</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Days Remaining</p><p className={`text-lg font-bold ${daysLeft !== null && daysLeft <= 30 ? 'text-red-600' : ''}`}>{daysLeft !== null ? daysLeft : '-'}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Amendments</p><p className="text-lg font-bold">{amendments.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Variations</p><p className="text-lg font-bold">{variations.length}</p></CardContent></Card>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview"><FileText className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="obligations"><Clock className="h-3.5 w-3.5 mr-1" />Obligations ({obligations.length})</TabsTrigger>
          <TabsTrigger value="amendments"><TrendingUp className="h-3.5 w-3.5 mr-1" />Amendments ({amendments.length})</TabsTrigger>
          <TabsTrigger value="guarantees"><Shield className="h-3.5 w-3.5 mr-1" />Guarantees ({guarantees.length})</TabsTrigger>
          <TabsTrigger value="variations"><ArrowUpDown className="h-3.5 w-3.5 mr-1" />Variations ({variations.length})</TabsTrigger>
          <TabsTrigger value="claims"><Gavel className="h-3.5 w-3.5 mr-1" />Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="documents"><Paperclip className="h-3.5 w-3.5 mr-1" />Documents ({docs.length})</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card><CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1">{contract.contract_type}</span></div>
              <div><span className="text-muted-foreground">Start:</span> <span className="font-medium ml-1">{contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : '-'}</span></div>
              <div><span className="text-muted-foreground">End:</span> <span className="font-medium ml-1">{contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '-'}</span></div>
              <div><span className="text-muted-foreground">Currency:</span> <span className="font-medium ml-1">{contract.currency || 'SAR'}</span></div>
              <div><span className="text-muted-foreground">Payment Terms:</span> <span className="font-medium ml-1">{contract.payment_terms || '-'}</span></div>
              <div><span className="text-muted-foreground">Governing Law:</span> <span className="font-medium ml-1">{contract.governing_law || '-'}</span></div>
              <div><span className="text-muted-foreground">Risk Level:</span> <Badge className={contract.risk_level === 'high' ? 'bg-red-100 text-red-800' : contract.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>{contract.risk_level || 'medium'}</Badge></div>
              <div><span className="text-muted-foreground">Auto Renew:</span> <span className="font-medium ml-1">{contract.auto_renew ? 'Yes' : 'No'}</span></div>
              <div><span className="text-muted-foreground">E-Sign:</span> <span className="font-medium ml-1">{contract.e_sign_status || 'not_started'}</span></div>
            </div>
            {contract.notes && <div className="mt-4 p-3 bg-muted/50 rounded"><p className="text-sm">{contract.notes}</p></div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="obligations">
          <Card><ScrollArea className="h-[400px]"><Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Due</TableHead><TableHead>Responsible</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {obligations.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell><Badge variant="outline">{o.obligation_type}</Badge></TableCell>
                  <TableCell>{o.title}</TableCell>
                  <TableCell className={o.due_date && isPast(new Date(o.due_date)) && o.status === 'pending' ? 'text-red-600 font-medium' : ''}>{o.due_date ? format(new Date(o.due_date), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{o.responsible_party || '-'}</TableCell>
                  <TableCell><Badge className={o.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-muted'}>{o.priority}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[o.status] || 'bg-muted'}>{o.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></ScrollArea></Card>
        </TabsContent>

        <TabsContent value="amendments">
          <Card><ScrollArea className="h-[400px]"><Table>
            <TableHeader><TableRow><TableHead>AMD #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Old Value</TableHead><TableHead className="text-right">New Value</TableHead><TableHead className="text-right">Impact</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {amendments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.amendment_number}</TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell><Badge variant="outline">{a.amendment_type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{Number(a.old_value || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{Number(a.new_value || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{Number(a.cost_impact || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge className={statusColors[a.status] || 'bg-muted'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></ScrollArea></Card>
        </TabsContent>

        <TabsContent value="guarantees">
          <Card><ScrollArea className="h-[400px]"><Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Provider</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {guarantees.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell><Badge variant="outline">{g.guarantee_type}</Badge></TableCell>
                  <TableCell>{g.title}</TableCell>
                  <TableCell>{g.provider || '-'}</TableCell>
                  <TableCell className="text-right font-mono">{Number(g.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>{g.expiry_date ? format(new Date(g.expiry_date), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell><Badge className={statusColors[g.status] || 'bg-muted'}>{g.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></ScrollArea></Card>
        </TabsContent>

        <TabsContent value="variations">
          <Card><ScrollArea className="h-[400px]"><Table>
            <TableHeader><TableRow><TableHead>VO #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Cost Impact</TableHead><TableHead>Schedule</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {variations.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono">{v.variation_number}</TableCell>
                  <TableCell>{v.title}</TableCell>
                  <TableCell><Badge variant="outline">{v.variation_type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{Number(v.cost_impact || 0).toLocaleString()}</TableCell>
                  <TableCell>{v.schedule_impact_days || 0} days</TableCell>
                  <TableCell><Badge className={statusColors[v.status] || 'bg-muted'}>{v.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></ScrollArea></Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card><ScrollArea className="h-[400px]"><Table>
            <TableHeader><TableRow><TableHead>Claim #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Claimed</TableHead><TableHead className="text-right">Approved</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {claims.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.claim_number}</TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell><Badge variant="outline">{c.claim_type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{Number(c.amount_claimed || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">{Number(c.amount_approved || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge className={statusColors[c.status] || 'bg-muted'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></ScrollArea></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card><CardContent className="p-6 text-center text-muted-foreground">
            <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Document repository — {docs.length} documents</p>
            <p className="text-xs mt-1">Upload and manage contract documents, redline versions, and signed copies</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="history">
          <Card><ScrollArea className="h-[400px]"><Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Field</TableHead><TableHead>Old Value</TableHead><TableHead>New Value</TableHead><TableHead>Changed By</TableHead></TableRow></TableHeader>
            <TableBody>
              {history.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">{h.created_at ? format(new Date(h.created_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                  <TableCell><Badge variant="outline">{h.action}</Badge></TableCell>
                  <TableCell>{h.field_changed || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{h.old_value || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">{h.new_value || '-'}</TableCell>
                  <TableCell>{h.changed_by_name || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></ScrollArea></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
