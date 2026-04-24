import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDesignBOMs, useBOMItems, useCostVariances, DesignBOM, BOMItem, CostVariance } from '@/hooks/useDesignCosting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PenTool, Plus, Search, MoreHorizontal, CheckCircle, XCircle,
  DollarSign, TrendingUp, TrendingDown, FileText, AlertTriangle, X,
  Upload, Paperclip, Eye, Send,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const bomStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  under_review: { label: 'Under Review', variant: 'default' },
  approved: { label: 'Approved', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

const varianceStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export default function DesignCosting() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { boms, isLoading: bomsLoading, createBOM, approveBOM, updateBOM } = useDesignBOMs();
  const { variances, isLoading: variancesLoading, createVariance, approveVariance, rejectVariance } = useCostVariances();
  const [bomFormOpen, setBomFormOpen] = useState(false);
  const [varianceFormOpen, setVarianceFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('boms');
  const [bomDetailId, setBomDetailId] = useState<string | null>(null);

  // Alert-linked state
  const [alertProjectId, setAlertProjectId] = useState<string | null>(null);
  const [alertSalesOrderId, setAlertSalesOrderId] = useState<string | null>(null);

  // BOM form state
  const [bomForm, setBomForm] = useState({
    title: '', description: '', project_id: '',
    total_material_cost: '', total_labor_cost: '', total_overhead_cost: '',
  });
  const [bomFiles, setBomFiles] = useState<File[]>([]);
  const bomFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculated total cost
  const calculatedTotalCost = (parseFloat(bomForm.total_material_cost) || 0) +
    (parseFloat(bomForm.total_labor_cost) || 0) +
    (parseFloat(bomForm.total_overhead_cost) || 0);
  // Variance form state
  const [varForm, setVarForm] = useState({
    project_id: '', original_estimated_cost: '', revised_cost: '', variance_reason: '', category: 'material',
  });

  // Fetch design_costing alerts
  const { data: designAlerts } = useQuery({
    queryKey: ['design-costing-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`
          *,
          sales_order:sales_orders(doc_num, customer_name, contract_number, contract_value, total)
        `)
        .eq('alert_type', 'design_costing')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('finance_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-costing-alerts'] });
    },
  });

  // Complete Design & Costing
  const completeDesignCosting = useMutation({
    mutationFn: async ({ projectId, exactTotalCost }: { projectId: string; exactTotalCost: number }) => {
      const { error } = await supabase.rpc('complete_design_costing', {
        p_project_id: projectId,
        p_exact_total_cost: exactTotalCost,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-boms'] });
      queryClient.invalidateQueries({ queryKey: ['design-costing-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['cost-variances'] });
      toast({ title: 'Design & Costing completed', description: 'Project advanced to next phase' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error completing design', description: error.message, variant: 'destructive' });
    },
  });

  const totalBOMs = boms?.length || 0;
  const approvedBOMs = boms?.filter(b => b.status === 'approved').length || 0;
  const pendingVariances = variances?.filter(v => v.status === 'pending').length || 0;
  const totalVarianceAmount = variances?.reduce((sum, v) => sum + v.variance_amount, 0) || 0;

  const filteredBOMs = (boms || []).filter(b =>
    !searchTerm || b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.bom_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVariances = (variances || []).filter(v =>
    !searchTerm || v.variance_reason?.toLowerCase().includes(searchTerm.toLowerCase()) || v.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateBOMFromAlert = (alert: any) => {
    setAlertProjectId(alert.project_id);
    setAlertSalesOrderId(alert.sales_order_id);
    setBomForm({
      title: `BOM - ${alert.sales_order?.customer_name || 'Project'}`,
      description: alert.description || '',
      project_id: alert.project_id || '',
      total_material_cost: '', total_labor_cost: '', total_overhead_cost: '',
    });
    setBomFiles([]);
    setBomFormOpen(true);
  };

  const handleBomCreate = async () => {
    const projectId = bomForm.project_id || alertProjectId || crypto.randomUUID();

    createBOM.mutate({
      title: bomForm.title,
      description: bomForm.description || null,
      project_id: projectId,
      total_material_cost: parseFloat(bomForm.total_material_cost) || 0,
      total_labor_cost: parseFloat(bomForm.total_labor_cost) || 0,
      total_overhead_cost: parseFloat(bomForm.total_overhead_cost) || 0,
      total_cost: calculatedTotalCost,
    }, {
      onSuccess: async (data) => {
        // Upload attachments if any
        if (bomFiles.length > 0 && data?.project_id) {
          const { data: { user } } = await supabase.auth.getUser();
          for (const file of bomFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `design-costing/${data.project_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('project-documents').upload(fileName, file);
            if (uploadError) continue;
            const { data: urlData } = await supabase.storage.from('project-documents').createSignedUrl(fileName, 3600 * 24 * 365);
            await supabase.from('project_documents').insert([{
              project_id: data.project_id,
              document_type: 'design_attachment',
              file_name: file.name,
              file_url: urlData?.signedUrl || fileName,
              file_size: file.size,
              mime_type: file.type,
              phase: 'design_costing' as any,
              uploaded_by: user?.id,
            }]);
          }
          queryClient.invalidateQueries({ queryKey: ['bom-documents'] });
        }

        // Resolve alert if linked
        if (alertSalesOrderId && alertProjectId) {
          const matchingAlert = designAlerts?.find(a => a.sales_order_id === alertSalesOrderId);
          if (matchingAlert) resolveAlert.mutate(matchingAlert.id);
        }

        // Auto-complete Design & Costing phase
        if (data?.project_id && calculatedTotalCost > 0) {
          completeDesignCosting.mutate({
            projectId: data.project_id,
            exactTotalCost: calculatedTotalCost,
          });
        }
      },
    });
    setBomFormOpen(false);
    setBomForm({ title: '', description: '', project_id: '', total_material_cost: '', total_labor_cost: '', total_overhead_cost: '' });
    setBomFiles([]);
    setAlertProjectId(null);
    setAlertSalesOrderId(null);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Design & Costing</h1>
          <p className="text-muted-foreground">BOM management, cost calculations, and variance tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setVarianceFormOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report Variance
          </Button>
          <Button onClick={() => { setAlertProjectId(null); setAlertSalesOrderId(null); setBomFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New BOM
          </Button>
        </div>
      </div>

      {/* Design & Costing Alerts */}
      {designAlerts && designAlerts.length > 0 && (
        <div className="space-y-3">
          {designAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 !text-amber-600" />
              <AlertTitle className="flex items-center justify-between">
                <span>{alert.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => resolveAlert.mutate(alert.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {alert.description}
                {alert.sales_order && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">SO-{alert.sales_order.doc_num}</Badge>
                    <span className="text-xs">{alert.sales_order.customer_name}</span>
                    {alert.sales_order.contract_value && (
                      <Badge variant="secondary" className="text-xs">
                        {alert.sales_order.contract_value.toLocaleString()} SAR
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex justify-end mt-3">
                  <Button size="sm" onClick={() => handleCreateBOMFromAlert(alert)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create BOM
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalBOMs}</p><p className="text-xs text-muted-foreground">Total BOMs</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{approvedBOMs}</p><p className="text-xs text-muted-foreground">Approved</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{pendingVariances}</p><p className="text-xs text-muted-foreground">Pending Variances</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><TrendingUp className="h-5 w-5 text-red-500" /></div><div><p className="text-2xl font-bold">{totalVarianceAmount.toLocaleString()} SAR</p><p className="text-xs text-muted-foreground">Total Variance</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="boms">Bill of Materials</TabsTrigger>
            <TabsTrigger value="variances">Cost Variances</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* BOMs Table */}
      {activeTab === 'boms' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BOM #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Material Cost</TableHead>
                  <TableHead>Labor Cost</TableHead>
                  <TableHead>Exact Total Cost</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomsLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                ) : filteredBOMs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No BOMs found</TableCell></TableRow>
                ) : (
                  filteredBOMs.map((bom) => {
                    const statusCfg = bomStatusConfig[bom.status] || bomStatusConfig.draft;
                    return (
                      <TableRow key={bom.id} className="cursor-pointer" onClick={() => setBomDetailId(bom.id)}>
                        <TableCell className="font-mono text-sm">{bom.bom_number || '—'}</TableCell>
                        <TableCell className="font-medium">{bom.title}</TableCell>
                        <TableCell><Badge variant="outline">Rev {bom.revision_number}</Badge></TableCell>
                        <TableCell>{bom.total_material_cost.toLocaleString()} SAR</TableCell>
                        <TableCell>{bom.total_labor_cost.toLocaleString()} SAR</TableCell>
                        <TableCell className="font-semibold">{bom.total_cost.toLocaleString()} SAR</TableCell>
                        <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setBomDetailId(bom.id); }}>
                                <Eye className="h-4 w-4 mr-2" />View Details
                              </DropdownMenuItem>
                              {bom.status === 'draft' && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); approveBOM.mutate(bom.id); }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />Approve
                                </DropdownMenuItem>
                              )}
                              {bom.status === 'approved' && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  completeDesignCosting.mutate({
                                    projectId: bom.project_id,
                                    exactTotalCost: bom.total_cost,
                                  });
                                }}>
                                  <Send className="h-4 w-4 mr-2" />Complete & Advance
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Variances Table */}
      {activeTab === 'variances' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Original Cost</TableHead>
                  <TableHead>Revised Cost</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variancesLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                ) : filteredVariances.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No variances found</TableCell></TableRow>
                ) : (
                  filteredVariances.map((v) => {
                    const statusCfg = varianceStatusConfig[v.status] || varianceStatusConfig.pending;
                    return (
                      <TableRow key={v.id}>
                        <TableCell><Badge variant="outline" className="capitalize">{v.category}</Badge></TableCell>
                        <TableCell>{v.original_estimated_cost.toLocaleString()} SAR</TableCell>
                        <TableCell>{v.revised_cost.toLocaleString()} SAR</TableCell>
                        <TableCell className={v.variance_amount > 0 ? 'text-red-500 font-semibold' : 'text-green-500 font-semibold'}>
                          {v.variance_amount > 0 ? '+' : ''}{v.variance_amount.toLocaleString()} SAR
                        </TableCell>
                        <TableCell className={v.variance_percentage > 0 ? 'text-red-500' : 'text-green-500'}>
                          {v.variance_percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{v.variance_reason || '—'}</TableCell>
                        <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                        <TableCell>
                          {v.status === 'pending' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => approveVariance.mutate(v.id)}><CheckCircle className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => rejectVariance.mutate({ id: v.id, reason: 'Rejected by manager' })}><XCircle className="h-4 w-4 mr-2" />Reject</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New BOM Dialog */}
      <Dialog open={bomFormOpen} onOpenChange={(open) => { setBomFormOpen(open); if (!open) { setAlertProjectId(null); setAlertSalesOrderId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Bill of Materials</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div><Label>Title *</Label><Input value={bomForm.title} onChange={(e) => setBomForm({ ...bomForm, title: e.target.value })} placeholder="BOM Title" /></div>
              <div><Label>{t('common.description')}</Label><Textarea value={bomForm.description} onChange={(e) => setBomForm({ ...bomForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Material Cost (SAR)</Label><Input type="number" value={bomForm.total_material_cost} onChange={(e) => setBomForm({ ...bomForm, total_material_cost: e.target.value })} placeholder="0" /></div>
                <div><Label>Labor Cost (SAR)</Label><Input type="number" value={bomForm.total_labor_cost} onChange={(e) => setBomForm({ ...bomForm, total_labor_cost: e.target.value })} placeholder="0" /></div>
                <div><Label>Overhead Cost (SAR)</Label><Input type="number" value={bomForm.total_overhead_cost} onChange={(e) => setBomForm({ ...bomForm, total_overhead_cost: e.target.value })} placeholder="0" /></div>
                <div>
                  <Label>Exact Total Cost (SAR)</Label>
                  <Input type="number" value={calculatedTotalCost.toFixed(2)} readOnly className="font-semibold bg-muted cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground mt-1">Auto-calculated from costs above</p>
                </div>
              </div>

              {/* Attachment Field */}
              <div>
                <Label>Attachments</Label>
                <div className="mt-1">
                  <input
                    ref={bomFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
                    onChange={(e) => {
                      if (e.target.files) setBomFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => bomFileInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" /> Add Files
                  </Button>
                  {bomFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {bomFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-muted/30 text-sm">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            <span>{file.name}</span>
                            <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBomFiles(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {alertProjectId && (
                <div className="p-3 rounded-md bg-muted/50 text-sm">
                  <p className="font-medium">Linked to Project</p>
                  <p className="text-xs text-muted-foreground">This BOM is linked to the project from the workflow alert. Design & Costing will auto-complete on creation.</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBomFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!bomForm.title || calculatedTotalCost <= 0} onClick={handleBomCreate}>Create BOM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BOM Detail Dialog */}
      {bomDetailId && (
        <BOMDetailDialog
          bomId={bomDetailId}
          bom={boms?.find(b => b.id === bomDetailId) || null}
          open={!!bomDetailId}
          onOpenChange={(open) => { if (!open) setBomDetailId(null); }}
          onComplete={(projectId, totalCost) => {
            completeDesignCosting.mutate({ projectId, exactTotalCost: totalCost });
            setBomDetailId(null);
          }}
        />
      )}

      {/* Variance Report Dialog */}
      <Dialog open={varianceFormOpen} onOpenChange={setVarianceFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Cost Variance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Original Estimated Cost</Label><Input type="number" value={varForm.original_estimated_cost} onChange={(e) => setVarForm({ ...varForm, original_estimated_cost: e.target.value })} /></div>
              <div><Label>Revised Cost</Label><Input type="number" value={varForm.revised_cost} onChange={(e) => setVarForm({ ...varForm, revised_cost: e.target.value })} /></div>
            </div>
            <div><Label>Category</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={varForm.category} onChange={(e) => setVarForm({ ...varForm, category: e.target.value })}>
                <option value="material">Material</option>
                <option value="labor">Labor</option>
                <option value="overhead">Overhead</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><Label>Reason</Label><Textarea value={varForm.variance_reason} onChange={(e) => setVarForm({ ...varForm, variance_reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarianceFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!varForm.original_estimated_cost || !varForm.revised_cost} onClick={() => {
              createVariance.mutate({
                project_id: varForm.project_id || crypto.randomUUID(),
                original_estimated_cost: parseFloat(varForm.original_estimated_cost),
                revised_cost: parseFloat(varForm.revised_cost),
                variance_reason: varForm.variance_reason || null,
                category: varForm.category,
              });
              setVarianceFormOpen(false);
              setVarForm({ project_id: '', original_estimated_cost: '', revised_cost: '', variance_reason: '', category: 'material' });
            }}>Submit Variance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// BOM Detail Dialog with attachments
function BOMDetailDialog({ bomId, bom, open, onOpenChange, onComplete }: {
  bomId: string; bom: DesignBOM | null; open: boolean; onOpenChange: (open: boolean) => void;
  onComplete: (projectId: string, totalCost: number) => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Fetch project documents for this BOM's project
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['bom-documents', bom?.project_id],
    queryFn: async () => {
      if (!bom?.project_id) return [];
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', bom.project_id)
        .eq('phase', 'design_costing')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!bom?.project_id,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bom?.project_id) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `design-costing/${bom.project_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);
      if (uploadError) {
        toast({ title: 'Upload error', description: uploadError.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365);

      await supabase.from('project_documents').insert([{
        project_id: bom.project_id,
        document_type: 'design_attachment',
        file_name: file.name,
        file_url: urlData?.signedUrl || fileName,
        file_size: file.size,
        mime_type: file.type,
        phase: 'design_costing' as any,
        uploaded_by: user?.id,
      }]);
    }

    queryClient.invalidateQueries({ queryKey: ['bom-documents', bom.project_id] });
    setUploading(false);
    e.target.value = '';
    toast({ title: 'Files uploaded successfully' });
  };

  if (!bom) return null;

  const statusCfg = bomStatusConfig[bom.status] || bomStatusConfig.draft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            BOM Details - {bom.bom_number}
            <Badge variant={statusCfg.variant} className="ml-2">{statusCfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {/* BOM Info */}
            <div>
              <h3 className="font-semibold text-sm mb-3">BOM Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Title</p><p className="font-medium">{bom.title}</p></div>
                <div><p className="text-xs text-muted-foreground">Revision</p><p className="font-medium">Rev {bom.revision_number}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('common.description')}</p><p className="font-medium">{bom.description || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{format(new Date(bom.created_at), 'MMM dd, yyyy')}</p></div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Cost Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Material Cost</p>
                  <p className="text-lg font-bold">{bom.total_material_cost.toLocaleString()} SAR</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Labor Cost</p>
                  <p className="text-lg font-bold">{bom.total_labor_cost.toLocaleString()} SAR</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Overhead Cost</p>
                  <p className="text-lg font-bold">{bom.total_overhead_cost.toLocaleString()} SAR</p>
                </Card>
                <Card className="p-3 border-primary">
                  <p className="text-xs text-muted-foreground">Exact Total Cost</p>
                  <p className="text-lg font-bold text-primary">{bom.total_cost.toLocaleString()} SAR</p>
                </Card>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({documents?.length || 0})
                </h3>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      <Upload className="h-3 w-3 mr-1" />
                      {uploading ? 'Uploading...' : 'Upload'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              {docsLoading ? (
                <p className="text-sm text-muted-foreground">Loading attachments...</p>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3 mr-1" />View
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attachments yet. Upload design documents, drawings, or specifications.</p>
              )}
            </div>
          </div>
        </ScrollArea>

        {bom.status === 'approved' && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={() => onComplete(bom.project_id, bom.total_cost)}>
              <Send className="h-4 w-4 mr-2" />
              Complete Design & Advance
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
