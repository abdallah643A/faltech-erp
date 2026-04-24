import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Search, Eye, Edit, Video, Link, HelpCircle, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TooltipEntry {
  id: string;
  module: string;
  page: string;
  field: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  helpUrl?: string;
  videoUrl?: string;
  isActive: boolean;
  lastUpdated: string;
}

const MOCK_TOOLTIPS: TooltipEntry[] = [
  { id: '1', module: 'Sales', page: 'Sales Order', field: 'Customer Code', titleEn: 'Customer Code', titleAr: 'رمز العميل', descriptionEn: 'The unique identifier for the customer in the system. Use the search icon to find customers.', descriptionAr: 'المعرف الفريد للعميل في النظام. استخدم أيقونة البحث للعثور على العملاء.', helpUrl: '/help/sales/customer-code', isActive: true, lastUpdated: '2026-04-10' },
  { id: '2', module: 'Finance', page: 'Journal Entry', field: 'Posting Date', titleEn: 'Posting Date', titleAr: 'تاريخ الترحيل', descriptionEn: 'The date the transaction is recorded in the general ledger. Must be within an open posting period.', descriptionAr: 'التاريخ الذي يتم فيه تسجيل العملية في دفتر الأستاذ العام.', isActive: true, lastUpdated: '2026-04-08' },
  { id: '3', module: 'Inventory', page: 'Goods Receipt', field: 'Warehouse', titleEn: 'Target Warehouse', titleAr: 'المستودع المستهدف', descriptionEn: 'Select the warehouse where goods will be received. Inventory will be updated accordingly.', descriptionAr: 'اختر المستودع الذي ستُستلم فيه البضائع.', videoUrl: '/help/inventory/warehouse-guide', isActive: true, lastUpdated: '2026-04-05' },
  { id: '4', module: 'HR', page: 'Employee', field: 'Department', titleEn: 'Department', titleAr: 'القسم', descriptionEn: 'The organizational department the employee belongs to. Used for reporting and approval workflows.', descriptionAr: 'القسم التنظيمي الذي ينتمي إليه الموظف.', isActive: false, lastUpdated: '2026-03-28' },
  { id: '5', module: 'Purchasing', page: 'Purchase Order', field: 'Vendor Code', titleEn: 'Vendor Code', titleAr: 'رمز المورد', descriptionEn: 'The unique code identifying the vendor/supplier. Required for all purchase transactions.', descriptionAr: 'الرمز الفريد للمورد. مطلوب لجميع عمليات الشراء.', isActive: true, lastUpdated: '2026-04-12' },
];

export default function TooltipPreview() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [selectedTooltip, setSelectedTooltip] = useState<TooltipEntry | null>(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);

  const filtered = MOCK_TOOLTIPS.filter(t => {
    if (search && !t.titleEn.toLowerCase().includes(search.toLowerCase()) && !t.field.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterModule !== 'all' && t.module !== filterModule) return false;
    return true;
  });

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'معاينة التلميحات' : 'Tooltip Preview'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة تلميحات المساعدة والمحتوى التوجيهي' : 'Manage inline help text, tooltips, and contextual guidance across the ERP'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm"><span>Tooltips Enabled</span><Switch checked={globalEnabled} onCheckedChange={setGlobalEnabled} /></div>
          <Button size="sm"><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search tooltips..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={filterModule} onValueChange={setFilterModule}><SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Module" /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem>{['Sales', 'Finance', 'Inventory', 'HR', 'Purchasing'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Add Tooltip</Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Page</TableHead><TableHead>Field</TableHead><TableHead>Title</TableHead><TableHead>Links</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map(t => (
                    <TableRow key={t.id} className={cn('cursor-pointer', selectedTooltip?.id === t.id && 'bg-muted/50')} onClick={() => setSelectedTooltip(t)}>
                      <TableCell><Badge variant="secondary" className="text-xs">{t.module}</Badge></TableCell>
                      <TableCell className="text-sm">{t.page}</TableCell>
                      <TableCell className="text-sm font-medium">{t.field}</TableCell>
                      <TableCell className="text-sm">{t.titleEn}</TableCell>
                      <TableCell><div className="flex gap-1">{t.helpUrl && <Link className="h-3 w-3 text-blue-600" />}{t.videoUrl && <Video className="h-3 w-3 text-blue-600" />}</div></TableCell>
                      <TableCell><Switch checked={t.isActive} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedTooltip ? (
            <>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Edit className="h-4 w-4" />Edit Tooltip</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div><label className="text-xs text-muted-foreground">Title (EN)</label><Input className="h-8 text-sm" value={selectedTooltip.titleEn} /></div>
                  <div><label className="text-xs text-muted-foreground">Title (AR)</label><Input className="h-8 text-sm" dir="rtl" value={selectedTooltip.titleAr} /></div>
                  <div><label className="text-xs text-muted-foreground">Description (EN)</label><Textarea className="text-sm" rows={3} value={selectedTooltip.descriptionEn} /></div>
                  <div><label className="text-xs text-muted-foreground">Description (AR)</label><Textarea className="text-sm" rows={3} dir="rtl" value={selectedTooltip.descriptionAr} /></div>
                  <div><label className="text-xs text-muted-foreground">Help Article URL</label><Input className="h-8 text-sm" placeholder="https://..." value={selectedTooltip.helpUrl || ''} /></div>
                  <div><label className="text-xs text-muted-foreground">Training Video URL</label><Input className="h-8 text-sm" placeholder="https://..." value={selectedTooltip.videoUrl || ''} /></div>
                  <Button size="sm" className="w-full"><Save className="h-3.5 w-3.5 mr-1.5" />Update Tooltip</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Eye className="h-4 w-4" />Live Preview</CardTitle></CardHeader>
                <CardContent>
                  <div className="border rounded p-4 bg-muted/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">{selectedTooltip.field}</label>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" /></TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium text-sm">{selectedTooltip.titleEn}</p>
                          <p className="text-xs mt-1">{selectedTooltip.descriptionEn}</p>
                          {selectedTooltip.helpUrl && <a className="text-xs text-blue-400 mt-1 block">📖 Learn more</a>}
                          {selectedTooltip.videoUrl && <a className="text-xs text-blue-400">🎬 Watch video</a>}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input className="h-8 text-sm" placeholder="Sample field..." disabled />
                    <p className="text-xs text-muted-foreground italic">Hover the help icon above to see the tooltip preview</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a tooltip from the list to edit and preview</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
