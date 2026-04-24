import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrintLayouts, PrintLayout, DOCUMENT_TYPES } from '@/hooks/usePrintLayouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Printer, Plus, Trash2, Star, Loader2, Eye, FileText, Layout, Settings2, Code, Upload, Palette, Type, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZES = ['A4', 'Letter', 'A5'];
const ORIENTATIONS = ['portrait', 'landscape'];

const DEFAULT_FIELDS: Record<string, Array<{ field: string; label: string; width: number; visible: boolean; order: number }>> = {
  sales_order: [
    { field: 'doc_num', label: '#', width: 60, visible: true, order: 1 },
    { field: 'item_code', label: 'Item Code', width: 100, visible: true, order: 2 },
    { field: 'description', label: 'Description', width: 200, visible: true, order: 3 },
    { field: 'quantity', label: 'Qty', width: 60, visible: true, order: 4 },
    { field: 'unit_price', label: 'Unit Price', width: 80, visible: true, order: 5 },
    { field: 'discount', label: 'Discount %', width: 70, visible: true, order: 6 },
    { field: 'tax', label: 'Tax', width: 60, visible: true, order: 7 },
    { field: 'line_total', label: 'Total', width: 90, visible: true, order: 8 },
  ],
  ar_invoice: [
    { field: 'line_num', label: '#', width: 50, visible: true, order: 1 },
    { field: 'item_code', label: 'Item Code', width: 100, visible: true, order: 2 },
    { field: 'description', label: 'Description', width: 200, visible: true, order: 3 },
    { field: 'quantity', label: 'Qty', width: 60, visible: true, order: 4 },
    { field: 'unit_price', label: 'Price', width: 80, visible: true, order: 5 },
    { field: 'tax_code', label: 'Tax Code', width: 70, visible: true, order: 6 },
    { field: 'line_total', label: 'Total', width: 90, visible: true, order: 7 },
  ],
};

export default function PrintLayoutDesigner() {
  const { language } = useLanguage();
  const { layouts, isLoading, createLayout, updateLayout, deleteLayout, setDefault } = usePrintLayouts();
  const [showDialog, setShowDialog] = useState(false);
  const [editingLayout, setEditingLayout] = useState<PrintLayout | null>(null);
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [previewLayout, setPreviewLayout] = useState<PrintLayout | null>(null);

  const [form, setForm] = useState({
    name: '',
    document_type: 'sales_order',
    page_size: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 15, bottom: 20, left: 15 },
    header_config: { show_logo: true, show_company_info: true, show_doc_title: true, logo_url: '', header_color: '#1e3a5f', rtl: false, show_zatca_qr: false },
    body_config: { show_line_numbers: true, alternating_rows: true, border_style: 'full', font_size: 10 },
    footer_config: { show_totals: true, show_signature: true, show_terms: true, terms_text: '', font_size: 9 },
    custom_css: '',
    field_mappings: [] as Array<{ field: string; label: string; width: number; visible: boolean; order: number }>,
    is_default: false,
    is_active: true,
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const openNew = () => {
    setEditingLayout(null);
    const defaultFields = DEFAULT_FIELDS['sales_order'] || [];
    setForm({
      name: '', document_type: 'sales_order', page_size: 'A4', orientation: 'portrait',
      margins: { top: 20, right: 15, bottom: 20, left: 15 },
      header_config: { show_logo: true, show_company_info: true, show_doc_title: true, logo_url: '', header_color: '#1e3a5f', rtl: false, show_zatca_qr: false },
      body_config: { show_line_numbers: true, alternating_rows: true, border_style: 'full', font_size: 10 },
      footer_config: { show_totals: true, show_signature: true, show_terms: true, terms_text: '', font_size: 9 },
      custom_css: '', field_mappings: defaultFields, is_default: false, is_active: true,
    });
    setShowDialog(true);
  };

  const openEdit = (layout: PrintLayout) => {
    setEditingLayout(layout);
    setForm({
      name: layout.name,
      document_type: layout.document_type,
      page_size: layout.page_size,
      orientation: layout.orientation,
      margins: layout.margins || { top: 20, right: 15, bottom: 20, left: 15 },
      header_config: { show_logo: true, show_company_info: true, show_doc_title: true, logo_url: '', header_color: '#1e3a5f', rtl: false, show_zatca_qr: false, ...(layout.header_config || {}) },
      body_config: { show_line_numbers: true, alternating_rows: true, border_style: 'full', font_size: 10, ...(layout.body_config || {}) },
      footer_config: { show_totals: true, show_signature: true, show_terms: true, terms_text: '', font_size: 9, ...(layout.footer_config || {}) },
      custom_css: layout.custom_css || '',
      field_mappings: layout.field_mappings || [],
      is_default: layout.is_default,
      is_active: layout.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const payload = { ...form };
    if (editingLayout) {
      updateLayout.mutate({ id: editingLayout.id, ...payload });
    } else {
      createLayout.mutate(payload);
    }
    setShowDialog(false);
  };

  const handleDocTypeChange = (dt: string) => {
    const defaults = DEFAULT_FIELDS[dt] || DEFAULT_FIELDS['sales_order'] || [];
    setForm(f => ({ ...f, document_type: dt, field_mappings: defaults }));
  };

  const toggleFieldVisibility = (index: number) => {
    setForm(f => {
      const updated = [...f.field_mappings];
      updated[index] = { ...updated[index], visible: !updated[index].visible };
      return { ...f, field_mappings: updated };
    });
  };

  const updateFieldLabel = (index: number, label: string) => {
    setForm(f => {
      const updated = [...f.field_mappings];
      updated[index] = { ...updated[index], label };
      return { ...f, field_mappings: updated };
    });
  };

  const updateFieldWidth = (index: number, width: number) => {
    setForm(f => {
      const updated = [...f.field_mappings];
      updated[index] = { ...updated[index], width };
      return { ...f, field_mappings: updated };
    });
  };

  const filteredLayouts = docTypeFilter === 'all' ? layouts : layouts.filter(l => l.document_type === docTypeFilter);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            {language === 'ar' ? 'مصمم تخطيط الطباعة' : 'Print Layout Designer'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تصميم قوالب طباعة مخصصة لكل نوع مستند' : 'Design custom print templates per document type'}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'تخطيط جديد' : 'New Layout'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع المستندات' : 'All Document Types'}</SelectItem>
                {DOCUMENT_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filteredLayouts.length} {language === 'ar' ? 'تخطيط' : 'layouts'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filteredLayouts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Printer className="h-12 w-12 mx-auto mb-3 opacity-30" />
              {language === 'ar' ? 'لا توجد تخطيطات. أنشئ واحداً جديداً.' : 'No print layouts. Create one to get started.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'نوع المستند' : 'Document Type'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحجم' : 'Size'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الاتجاه' : 'Orientation'}</TableHead>
                  <TableHead>{language === 'ar' ? 'افتراضي' : 'Default'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLayouts.map((layout) => (
                  <TableRow key={layout.id} className="cursor-pointer" onClick={() => openEdit(layout)}>
                    <TableCell className="font-medium">{layout.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{DOCUMENT_TYPES.find(d => d.value === layout.document_type)?.label || layout.document_type}</Badge>
                    </TableCell>
                    <TableCell>{layout.page_size}</TableCell>
                    <TableCell>{layout.orientation}</TableCell>
                    <TableCell>
                      {layout.is_default ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Button size="sm" variant="ghost" className="text-xs h-6" onClick={(e) => { e.stopPropagation(); setDefault.mutate({ id: layout.id, documentType: layout.document_type }); }}>
                          Set Default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={layout.is_active ? 'default' : 'secondary'}>{layout.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewLayout(layout); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteLayout.mutate(layout.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* LAYOUT DESIGNER DIALOG */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLayout ? (language === 'ar' ? 'تعديل التخطيط' : 'Edit Layout') : (language === 'ar' ? 'تخطيط جديد' : 'New Print Layout')}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general">
            <TabsList className="w-full flex-wrap">
              <TabsTrigger value="general" className="gap-1"><Settings2 className="h-3 w-3" /> General</TabsTrigger>
              <TabsTrigger value="fields" className="gap-1"><FileText className="h-3 w-3" /> Fields</TabsTrigger>
              <TabsTrigger value="sections" className="gap-1"><Layout className="h-3 w-3" /> Sections</TabsTrigger>
              <TabsTrigger value="style" className="gap-1"><Palette className="h-3 w-3" /> Style</TabsTrigger>
              <TabsTrigger value="css" className="gap-1"><Code className="h-3 w-3" /> CSS</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Layout Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Document Type</Label>
                  <Select value={form.document_type} onValueChange={handleDocTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOCUMENT_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Page Size</Label>
                  <Select value={form.page_size} onValueChange={v => setForm(f => ({ ...f, page_size: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAGE_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Orientation</Label>
                  <Select value={form.orientation} onValueChange={v => setForm(f => ({ ...f, orientation: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIENTATIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Margins (mm)</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                    <div key={side}>
                      <Label className="text-[10px]">{side}</Label>
                      <Input type="number" value={form.margins[side]} onChange={e => setForm(f => ({ ...f, margins: { ...f.margins, [side]: Number(e.target.value) } }))} className="h-8" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} /><Label>Default</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="mt-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Configure visible columns and their order</Label>
                {form.field_mappings.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                    <Switch checked={field.visible} onCheckedChange={() => toggleFieldVisibility(idx)} />
                    <span className="text-xs font-mono text-muted-foreground w-24">{field.field}</span>
                    <Input value={field.label} onChange={e => updateFieldLabel(idx, e.target.value)} className="h-7 flex-1" />
                    <Input type="number" value={field.width} onChange={e => updateFieldWidth(idx, Number(e.target.value))} className="h-7 w-16" />
                    <span className="text-[10px] text-muted-foreground">px</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sections" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label className="font-semibold">Header</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={form.header_config.show_logo} onCheckedChange={v => setForm(f => ({ ...f, header_config: { ...f.header_config, show_logo: v } }))} /><Label className="text-sm">Logo</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.header_config.show_company_info} onCheckedChange={v => setForm(f => ({ ...f, header_config: { ...f.header_config, show_company_info: v } }))} /><Label className="text-sm">Company Info</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.header_config.show_doc_title} onCheckedChange={v => setForm(f => ({ ...f, header_config: { ...f.header_config, show_doc_title: v } }))} /><Label className="text-sm">Document Title</Label></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="font-semibold">Body</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={form.body_config.show_line_numbers} onCheckedChange={v => setForm(f => ({ ...f, body_config: { ...f.body_config, show_line_numbers: v } }))} /><Label className="text-sm">Line Numbers</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.body_config.alternating_rows} onCheckedChange={v => setForm(f => ({ ...f, body_config: { ...f.body_config, alternating_rows: v } }))} /><Label className="text-sm">Alternating Rows</Label></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="font-semibold">Footer</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={form.footer_config.show_totals} onCheckedChange={v => setForm(f => ({ ...f, footer_config: { ...f.footer_config, show_totals: v } }))} /><Label className="text-sm">Totals</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.footer_config.show_signature} onCheckedChange={v => setForm(f => ({ ...f, footer_config: { ...f.footer_config, show_signature: v } }))} /><Label className="text-sm">Signature Line</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.footer_config.show_terms} onCheckedChange={v => setForm(f => ({ ...f, footer_config: { ...f.footer_config, show_terms: v } }))} /><Label className="text-sm">Terms & Conditions</Label></div>
                </div>
                {form.footer_config.show_terms && (
                  <Textarea placeholder="Terms & conditions text..." value={form.footer_config.terms_text || ''} onChange={e => setForm(f => ({ ...f, footer_config: { ...f.footer_config, terms_text: e.target.value } }))} rows={3} />
                )}
              </div>
            </TabsContent>

            {/* Style Tab - New */}
            <TabsContent value="style" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Layout Direction</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={form.header_config.rtl} onCheckedChange={v => setForm(f => ({ ...f, header_config: { ...f.header_config, rtl: v } }))} />
                  <Label className="text-sm">RTL (Arabic / Right-to-Left)</Label>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="font-semibold flex items-center gap-2"><Upload className="h-4 w-4" /> Company Logo</Label>
                <div className="flex items-center gap-3">
                  {form.header_config.logo_url && (
                    <img src={form.header_config.logo_url} alt="Logo" className="h-12 w-12 object-contain border rounded" />
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const path = `print-logos/${Date.now()}-${file.name}`;
                    const { data } = await supabase.storage.from('print-assets').upload(path, file);
                    if (data) {
                      const { data: urlData } = supabase.storage.from('print-assets').getPublicUrl(data.path);
                      setForm(f => ({ ...f, header_config: { ...f.header_config, logo_url: urlData.publicUrl } }));
                    }
                  }} />
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" /> Upload Logo
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="font-semibold flex items-center gap-2"><Palette className="h-4 w-4" /> Header Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.header_config.header_color} onChange={e => setForm(f => ({ ...f, header_config: { ...f.header_config, header_color: e.target.value } }))} className="h-8 w-12 rounded cursor-pointer" />
                  <Input value={form.header_config.header_color} onChange={e => setForm(f => ({ ...f, header_config: { ...f.header_config, header_color: e.target.value } }))} className="w-28 h-8" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="font-semibold flex items-center gap-2"><Type className="h-4 w-4" /> Font Sizes</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Body Font Size: {form.body_config.font_size}pt</Label>
                    <Slider value={[form.body_config.font_size]} min={7} max={16} step={1} onValueChange={([v]) => setForm(f => ({ ...f, body_config: { ...f.body_config, font_size: v } }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Footer Font Size: {form.footer_config.font_size}pt</Label>
                    <Slider value={[form.footer_config.font_size]} min={7} max={14} step={1} onValueChange={([v]) => setForm(f => ({ ...f, footer_config: { ...f.footer_config, font_size: v } }))} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="font-semibold">ZATCA QR Code</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={form.header_config.show_zatca_qr} onCheckedChange={v => setForm(f => ({ ...f, header_config: { ...f.header_config, show_zatca_qr: v } }))} />
                  <Label className="text-sm">Show ZATCA e-invoicing QR code</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="css" className="mt-4">
              <Label className="text-xs text-muted-foreground">Custom CSS to override default print styles</Label>
              <Textarea value={form.custom_css} onChange={e => setForm(f => ({ ...f, custom_css: e.target.value }))} rows={12} className="font-mono text-xs mt-2" placeholder={`/* Custom print styles */\n.print-header { ... }\n.print-table th { ... }`} />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name}>{editingLayout ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewLayout} onOpenChange={() => setPreviewLayout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewLayout?.name}</DialogTitle>
          </DialogHeader>
          {previewLayout && (
            <div className={`border rounded-lg p-6 bg-white text-black min-h-[400px] ${(previewLayout.header_config as any)?.rtl ? 'direction-rtl text-right' : ''}`} style={{ fontFamily: 'serif', fontSize: `${(previewLayout.body_config as any)?.font_size || 10}pt` }}>
              {/* Header Preview */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b-2" style={{ borderColor: (previewLayout.header_config as any)?.header_color || '#000', color: (previewLayout.header_config as any)?.header_color || '#000' }}>
                {previewLayout.header_config?.show_logo && (
                  (previewLayout.header_config as any)?.logo_url
                    ? <img src={(previewLayout.header_config as any).logo_url} alt="Logo" className="w-16 h-16 object-contain" />
                    : <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">LOGO</div>
                )}
                <div className={(previewLayout.header_config as any)?.rtl ? 'text-left' : 'text-right'}>
                  {previewLayout.header_config?.show_company_info && <div className="text-sm font-bold">Company Name</div>}
                  {previewLayout.header_config?.show_doc_title && (
                    <div className="text-lg font-bold mt-2">{DOCUMENT_TYPES.find(d => d.value === previewLayout.document_type)?.label || previewLayout.document_type}</div>
                  )}
                </div>
              </div>
              {/* Body Preview */}
              <table className="w-full text-xs border-collapse mb-6">
                <thead>
                  <tr>
                    {(previewLayout.field_mappings || []).filter(f => f.visible).map((f, i) => (
                      <th key={i} className="border border-black p-1 bg-gray-100 text-left" style={{ width: f.width }}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map(row => (
                    <tr key={row} className={previewLayout.body_config?.alternating_rows && row % 2 === 0 ? 'bg-gray-50' : ''}>
                      {(previewLayout.field_mappings || []).filter(f => f.visible).map((f, i) => (
                        <td key={i} className="border border-black p-1">Sample</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Footer Preview */}
              {previewLayout.footer_config?.show_totals && (
                <div className="text-right mb-4 text-sm">
                  <div>Subtotal: 0.00</div>
                  <div>Tax: 0.00</div>
                  <div className="font-bold">Total: 0.00</div>
                </div>
              )}
              {previewLayout.footer_config?.show_signature && (
                <div className="flex justify-between mt-8 pt-4">
                  <div className="text-center"><div className="border-t border-black w-32 mt-8" /><span className="text-xs">Authorized</span></div>
                  <div className="text-center"><div className="border-t border-black w-32 mt-8" /><span className="text-xs">Received By</span></div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
