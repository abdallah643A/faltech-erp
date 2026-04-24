import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMetadataCache, useMetadataComparisons, useMetadataActions } from '@/hooks/useSyncEnhanced';
import { Loader2, Search, Download, CheckCircle2, AlertTriangle, ArrowRight, Database, FileCode, GitCompare, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';

export function SyncMetadataDiscovery() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [metaTab, setMetaTab] = useState('discovered');
  const [typeFilter, setTypeFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<any>(null);

  const { data: cached = [], isLoading: cacheLoading } = useMetadataCache(typeFilter || undefined);
  const { data: comparisons = [], isLoading: compLoading } = useMetadataComparisons(dirFilter || undefined);
  const { approveProvisioning, skipComparison } = useMetadataActions();

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const statusCounts = (comparisons as any[]).reduce((acc: any, c: any) => {
    acc[c.match_status] = (acc[c.match_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <Tabs value={metaTab} onValueChange={setMetaTab}>
        <TabsList>
          <TabsTrigger value="discovered" className="gap-1 text-xs"><Database className="h-3.5 w-3.5" /> {isAr ? 'المكتشف' : 'Discovered'}</TabsTrigger>
          <TabsTrigger value="compare" className="gap-1 text-xs"><GitCompare className="h-3.5 w-3.5" /> {isAr ? 'مقارنة' : 'Compare'}</TabsTrigger>
          <TabsTrigger value="provision" className="gap-1 text-xs"><Shield className="h-3.5 w-3.5" /> {isAr ? 'تجهيز' : 'Provision'}</TabsTrigger>
        </TabsList>

        {/* Discovered UDF/UDT Cache */}
        <TabsContent value="discovered" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="udf">UDF</SelectItem>
                <SelectItem value="udt">UDT</SelectItem>
                <SelectItem value="udo">UDO</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{(cached as any[]).length} {isAr ? 'عنصر' : 'items'}</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {cacheLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">{isAr ? 'النوع' : 'Type'}</th>
                        <th className="p-2 text-left">{isAr ? 'الكائن' : 'Object'}</th>
                        <th className="p-2 text-left">{isAr ? 'الجدول' : 'Table'}</th>
                        <th className="p-2 text-left">{isAr ? 'الحقل' : 'Field'}</th>
                        <th className="p-2 text-left">{isAr ? 'نوع الحقل' : 'Field Type'}</th>
                        <th className="p-2 text-right">{isAr ? 'الطول' : 'Length'}</th>
                        <th className="p-2 text-center">{isAr ? 'إلزامي' : 'Mandatory'}</th>
                        <th className="p-2 text-left">{isAr ? 'آخر فحص' : 'Last Scan'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cached as any[]).map((c: any) => (
                        <tr key={c.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedMeta(c)}>
                          <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.metadata_type?.toUpperCase()}</Badge></td>
                          <td className="p-2 font-medium">{c.object_name}</td>
                          <td className="p-2 font-mono text-xs">{c.table_name || '-'}</td>
                          <td className="p-2 font-mono text-xs">{c.field_name || '-'}</td>
                          <td className="p-2 text-xs">{c.field_type || '-'}</td>
                          <td className="p-2 text-right">{c.field_length || '-'}</td>
                          <td className="p-2 text-center">{c.is_mandatory ? <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 mx-auto" /> : '-'}</td>
                          <td className="p-2 text-xs text-muted-foreground">{c.last_scanned_at ? format(new Date(c.last_scanned_at), 'MMM dd HH:mm') : '-'}</td>
                        </tr>
                      ))}
                      {(cached as any[]).length === 0 && (
                        <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                          <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          {isAr ? 'لم يتم اكتشاف بيانات وصفية بعد. قم بتشغيل فحص البيانات الوصفية.' : 'No metadata discovered yet. Run a metadata scan from SAP.'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compare SAP vs ERP */}
        <TabsContent value="compare" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Select value={dirFilter || 'all'} onValueChange={(v) => setDirFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Directions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sap_to_erp">SAP → ERP</SelectItem>
                <SelectItem value="erp_to_sap">ERP → SAP</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant={status === 'matched' ? 'secondary' : status.includes('new') ? 'default' : 'outline'} className="text-[10px]">
                  {status}: {count as number}
                </Badge>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {compLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">{isAr ? 'الاتجاه' : 'Direction'}</th>
                        <th className="p-2 text-left">SAP Object</th>
                        <th className="p-2 text-left">SAP Field</th>
                        <th className="p-2 text-center"><ArrowRight className="h-3 w-3 mx-auto" /></th>
                        <th className="p-2 text-left">ERP Entity</th>
                        <th className="p-2 text-left">ERP Field</th>
                        <th className="p-2 text-center">{isAr ? 'الحالة' : 'Match'}</th>
                        <th className="p-2 text-center">{isAr ? 'تجهيز' : 'Provision'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(comparisons as any[]).map((c: any) => (
                        <tr key={c.id} className="border-b hover:bg-muted/30">
                          <td className="p-2"><Badge variant="outline" className="text-[10px]">{c.comparison_type === 'sap_to_erp' ? 'SAP→ERP' : 'ERP→SAP'}</Badge></td>
                          <td className="p-2 font-mono text-xs">{c.sap_object_name || '-'}</td>
                          <td className="p-2 font-mono text-xs">{c.sap_field_name || '-'}</td>
                          <td className="p-2 text-center"><ArrowRight className="h-3 w-3 text-muted-foreground mx-auto" /></td>
                          <td className="p-2 font-mono text-xs">{c.erp_entity_name || '-'}</td>
                          <td className="p-2 font-mono text-xs">{c.erp_field_name || '-'}</td>
                          <td className="p-2 text-center">
                            <Badge variant={c.match_status === 'matched' ? 'secondary' : c.match_status === 'type_mismatch' ? 'destructive' : 'outline'} className="text-[10px]">
                              {c.match_status}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={c.provisioning_status === 'provisioned' ? 'secondary' : c.provisioning_status === 'approved' ? 'default' : 'outline'} className="text-[10px]">
                              {c.provisioning_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {(comparisons as any[]).length === 0 && (
                        <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                          {isAr ? 'لم يتم إجراء مقارنة بعد' : 'No comparisons yet. Run a metadata comparison.'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provisioning */}
        <TabsContent value="provision" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{isAr ? 'تجهيز UDF/UDT في SAP' : 'SAP UDF/UDT Provisioning'}</CardTitle>
                {selectedItems.length > 0 && (
                  <Button size="sm" onClick={() => { approveProvisioning.mutate(selectedItems); setSelectedItems([]); }} disabled={approveProvisioning.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {isAr ? 'اعتماد المحدد' : `Approve ${selectedItems.length} Selected`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 w-8"><Checkbox onCheckedChange={(checked) => { if (checked) { setSelectedItems((comparisons as any[]).filter((c: any) => c.provisioning_status === 'pending').map((c: any) => c.id)); } else { setSelectedItems([]); } }} /></th>
                      <th className="p-2 text-left">Direction</th>
                      <th className="p-2 text-left">Object/Field</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(comparisons as any[]).filter((c: any) => ['pending', 'approved'].includes(c.provisioning_status)).map((c: any) => (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="p-2"><Checkbox checked={selectedItems.includes(c.id)} onCheckedChange={() => toggleSelection(c.id)} /></td>
                        <td className="p-2 text-xs">{c.comparison_type === 'erp_to_sap' ? 'ERP→SAP' : 'SAP→ERP'}</td>
                        <td className="p-2 font-mono text-xs">{c.sap_object_name || c.erp_entity_name} / {c.sap_field_name || c.erp_field_name}</td>
                        <td className="p-2 text-xs">{c.sap_field_type || c.erp_field_type || '-'}</td>
                        <td className="p-2 text-center"><Badge variant={c.provisioning_status === 'approved' ? 'default' : 'outline'} className="text-[10px]">{c.provisioning_status}</Badge></td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => skipComparison.mutate(c.id)}>Skip</Button>
                        </td>
                      </tr>
                    ))}
                    {(comparisons as any[]).filter((c: any) => ['pending', 'approved'].includes(c.provisioning_status)).length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{isAr ? 'لا توجد عناصر تحتاج تجهيز' : 'No items pending provisioning'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedMeta} onOpenChange={() => setSelectedMeta(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isAr ? 'تفاصيل البيانات الوصفية' : 'Metadata Detail'}</SheetTitle>
          </SheetHeader>
          {selectedMeta && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Type:</span> <Badge>{selectedMeta.metadata_type?.toUpperCase()}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{selectedMeta.status}</Badge></div>
                <div><span className="text-muted-foreground">Object:</span> <span className="font-medium">{selectedMeta.object_name}</span></div>
                <div><span className="text-muted-foreground">Table:</span> <span className="font-mono text-xs">{selectedMeta.table_name}</span></div>
                <div><span className="text-muted-foreground">Field:</span> <span className="font-mono text-xs">{selectedMeta.field_name}</span></div>
                <div><span className="text-muted-foreground">Field Type:</span> <span>{selectedMeta.field_type}</span></div>
                <div><span className="text-muted-foreground">Length:</span> <span>{selectedMeta.field_length}</span></div>
                <div><span className="text-muted-foreground">Mandatory:</span> <span>{selectedMeta.is_mandatory ? 'Yes' : 'No'}</span></div>
              </div>
              {selectedMeta.field_description && <div><span className="text-muted-foreground">Description:</span> <p className="mt-1">{selectedMeta.field_description}</p></div>}
              {selectedMeta.valid_values && (
                <div><span className="text-muted-foreground">Valid Values:</span><pre className="text-[10px] mt-1 bg-muted p-2 rounded overflow-auto max-h-32">{JSON.stringify(selectedMeta.valid_values, null, 2)}</pre></div>
              )}
              {selectedMeta.raw_definition && (
                <div><span className="text-muted-foreground">Raw Definition:</span><pre className="text-[10px] mt-1 bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(selectedMeta.raw_definition, null, 2)}</pre></div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
