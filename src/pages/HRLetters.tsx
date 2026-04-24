import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Eye, CheckCircle, Clock, XCircle, Download, Printer, Edit, FileCheck, Languages } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import jsPDF from 'jspdf';

const DOC_TYPES = [
  { value: 'offer_letter', label: 'Offer Letter', labelAr: 'خطاب عرض' },
  { value: 'contract', label: 'Employment Contract', labelAr: 'عقد عمل' },
  { value: 'salary_certificate', label: 'Salary Certificate', labelAr: 'شهادة راتب' },
  { value: 'warning_letter', label: 'Warning Letter', labelAr: 'خطاب إنذار' },
  { value: 'leave_letter', label: 'Leave Letter', labelAr: 'خطاب إجازة' },
  { value: 'experience_certificate', label: 'Experience Certificate', labelAr: 'شهادة خبرة' },
  { value: 'noc', label: 'No Objection Certificate', labelAr: 'شهادة عدم ممانعة' },
  { value: 'policy_acknowledgement', label: 'Policy Acknowledgement', labelAr: 'إقرار بالسياسة' },
];

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline', pending_approval: 'secondary', approved: 'default', rejected: 'destructive', issued: 'default',
};

export default function HRLetters() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState('documents');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Generate form state
  const [genForm, setGenForm] = useState({
    employee_id: '', employee_name: '', document_type: 'salary_certificate', template_id: '',
    language: 'bilingual', purpose: '', placeholders: {} as Record<string, string>,
  });

  // Template editor state
  const [tplForm, setTplForm] = useState({
    template_name: '', document_type: 'offer_letter', language: 'bilingual',
    subject_en: '', subject_ar: '', body_template_en: '', body_template_ar: '',
  });

  // Queries
  const { data: templates = [] } = useQuery({
    queryKey: ['hr-doc-templates', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('hr_document_templates' as any).select('*').eq('is_active', true).order('document_type') as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['hr-gen-documents', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('hr_generated_documents' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('employees').select('id, first_name, last_name, employee_code, position_id, department_id, basic_salary, hire_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q.order('first_name').limit(500);
      return data || [];
    },
  });

  const { data: company } = useQuery({
    queryKey: ['company-info', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data } = await supabase.from('sap_companies').select('*').eq('id', activeCompanyId).single();
      return data;
    },
    enabled: !!activeCompanyId,
  });

  // Mutations
  const createDoc = useMutation({
    mutationFn: async (doc: any) => {
      const { error } = await (supabase.from('hr_generated_documents' as any).insert(doc) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-gen-documents'] }); toast({ title: 'Document generated' }); setShowGenerate(false); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDoc = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('hr_generated_documents' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-gen-documents'] }); toast({ title: 'Document updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createTemplate = useMutation({
    mutationFn: async (tpl: any) => {
      const { error } = await (supabase.from('hr_document_templates' as any).insert(tpl) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-doc-templates'] }); toast({ title: 'Template saved' }); setShowTemplateEditor(false); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('hr_document_templates' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-doc-templates'] }); toast({ title: 'Template updated' }); setShowTemplateEditor(false); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Helpers
  const replacePlaceholders = (text: string, vars: Record<string, string>) => {
    let result = text || '';
    Object.entries(vars).forEach(([k, v]) => { result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || ''); });
    // Remove unreplaced placeholders
    result = result.replace(/\{\{[^}]+\}\}/g, '___');
    return result;
  };

  const getPlaceholderValues = (emp: any) => {
    const vals: Record<string, string> = {
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '',
      employee_name_ar: emp ? `${emp.first_name} ${emp.last_name}` : '',
      position: emp?.position_id || '',
      department: emp?.department_id || '',
      salary: emp?.basic_salary?.toLocaleString() || '',
      join_date: emp?.hire_date ? format(new Date(emp.hire_date), 'dd/MM/yyyy') : '',
      employee_id_number: emp?.employee_code || '',
      company_name: company?.company_name || '',
      company_name_ar: company?.company_name || '',
      date: format(new Date(), 'dd/MM/yyyy'),
      ...genForm.placeholders,
    };
    return vals;
  };

  const handleGenerate = () => {
    const tpl = templates.find((t: any) => t.id === genForm.template_id);
    if (!tpl) { toast({ title: 'Select a template', variant: 'destructive' }); return; }
    const emp = employees.find((e: any) => e.id === genForm.employee_id);
    const vars = getPlaceholderValues(emp);

    const doc = {
      company_id: activeCompanyId,
      employee_id: genForm.employee_id || null,
      employee_name: genForm.employee_name || vars.employee_name,
      template_id: genForm.template_id,
      document_type: genForm.document_type,
      language: genForm.language,
      subject_en: replacePlaceholders(tpl.subject_en, vars),
      subject_ar: replacePlaceholders(tpl.subject_ar, vars),
      generated_content_en: replacePlaceholders(tpl.body_template_en, vars),
      generated_content_ar: replacePlaceholders(tpl.body_template_ar, vars),
      purpose: genForm.purpose,
      status: 'draft',
      requested_by: user?.id,
    };
    createDoc.mutate(doc);
  };

  const handleApprove = (doc: any) => updateDoc.mutate({ id: doc.id, status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() });
  const handleReject = (doc: any) => updateDoc.mutate({ id: doc.id, status: 'rejected', rejection_reason: 'Rejected by reviewer' });
  const handleIssue = (doc: any) => updateDoc.mutate({ id: doc.id, status: 'issued', issued_at: new Date().toISOString() });
  const handleSubmitForApproval = (doc: any) => updateDoc.mutate({ id: doc.id, status: 'pending_approval' });

  const exportPDF = (doc: any) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 25;

    // Header
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(company?.company_name || 'Company', margin, y);
    pdf.text(doc.reference_number || '', pageW - margin, y, { align: 'right' });
    y += 8;
    pdf.setDrawColor(26, 54, 93);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, pageW - margin, y);
    y += 12;

    // English content
    if (doc.language !== 'ar' && doc.generated_content_en) {
      pdf.setFontSize(14);
      pdf.setTextColor(26, 54, 93);
      pdf.text(doc.subject_en || '', pageW / 2, y, { align: 'center' });
      y += 12;
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      const lines = pdf.splitTextToSize(doc.generated_content_en, contentW);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 10;
    }

    // Separator for bilingual
    if (doc.language === 'bilingual' && doc.generated_content_en && doc.generated_content_ar) {
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 20, y, pageW - margin - 20, y);
      y += 10;
    }

    // Arabic content (simplified - jsPDF has limited Arabic support)
    if (doc.language !== 'en' && doc.generated_content_ar) {
      pdf.setFontSize(14);
      pdf.setTextColor(26, 54, 93);
      pdf.text(doc.subject_ar || '', pageW / 2, y, { align: 'center' });
      y += 12;
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      const arLines = pdf.splitTextToSize(doc.generated_content_ar, contentW);
      pdf.text(arLines, margin, y);
    }

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(160);
    pdf.text('This document was generated electronically', pageW / 2, 285, { align: 'center' });

    pdf.save(`${doc.reference_number || 'HR-Document'}.pdf`);
    toast({ title: 'PDF downloaded' });
  };

  const filteredTemplates = templates.filter((t: any) => t.document_type === genForm.document_type);

  const stats = {
    total: documents.length,
    draft: documents.filter((d: any) => d.status === 'draft').length,
    pending: documents.filter((d: any) => d.status === 'pending_approval').length,
    approved: documents.filter((d: any) => d.status === 'approved' || d.status === 'issued').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />HR Letters & Documents</h1>
          <p className="text-muted-foreground text-sm">Bilingual document generation with templates, approvals, and PDF export</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setTplForm({ template_name: '', document_type: 'offer_letter', language: 'bilingual', subject_en: '', subject_ar: '', body_template_en: '', body_template_ar: '' }); setSelectedTemplate(null); setShowTemplateEditor(true); }}>
            <Edit className="h-4 w-4 mr-2" />New Template
          </Button>
          <Button onClick={() => { setGenForm({ employee_id: '', employee_name: '', document_type: 'salary_certificate', template_id: '', language: 'bilingual', purpose: '', placeholders: {} }); setShowGenerate(true); }}>
            <Plus className="h-4 w-4 mr-2" />Generate Document
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Documents', value: stats.total, icon: FileText, color: 'text-primary' },
          { label: 'Drafts', value: stats.draft, icon: Edit, color: 'text-muted-foreground' },
          { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Approved / Issued', value: stats.approved, icon: CheckCircle, color: 'text-emerald-500' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="templates"><Languages className="h-4 w-4 mr-1" />Templates</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle className="text-sm">Generated Documents</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Ref #</TableHead><TableHead>Employee</TableHead><TableHead>Type</TableHead>
                  <TableHead>Language</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {documents.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.reference_number}</TableCell>
                      <TableCell className="font-medium">{d.employee_name}</TableCell>
                      <TableCell><Badge variant="outline">{DOC_TYPES.find(dt => dt.value === d.document_type)?.label || d.document_type}</Badge></TableCell>
                      <TableCell className="text-sm capitalize">{d.language}</TableCell>
                      <TableCell><Badge variant={STATUS_COLORS[d.status] || 'outline'}>{d.status?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(d.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setPreviewDoc(d); setShowPreview(true); }}><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => exportPDF(d)}><Download className="h-3 w-3" /></Button>
                          {d.status === 'draft' && <Button size="sm" variant="ghost" onClick={() => handleSubmitForApproval(d)}><FileCheck className="h-3 w-3" /></Button>}
                          {d.status === 'pending_approval' && (
                            <>
                              <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => handleApprove(d)}><CheckCircle className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleReject(d)}><XCircle className="h-3 w-3" /></Button>
                            </>
                          )}
                          {d.status === 'approved' && <Button size="sm" variant="ghost" className="text-primary" onClick={() => handleIssue(d)}><Printer className="h-3 w-3" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No documents generated yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader><CardTitle className="text-sm">Document Templates</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((t: any) => (
                  <Card key={t.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
                    setSelectedTemplate(t);
                    setTplForm({ template_name: t.template_name, document_type: t.document_type, language: t.language, subject_en: t.subject_en || '', subject_ar: t.subject_ar || '', body_template_en: t.body_template_en || '', body_template_ar: t.body_template_ar || '' });
                    setShowTemplateEditor(true);
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{t.template_name}</h3>
                          <Badge variant="outline" className="mt-1 text-xs">{DOC_TYPES.find(dt => dt.value === t.document_type)?.label || t.document_type}</Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">{t.language}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.subject_en}</p>
                      {t.subject_ar && <p className="text-xs text-muted-foreground mt-1 line-clamp-1 text-right" dir="rtl">{t.subject_ar}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Document Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Generate Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={genForm.employee_id} onValueChange={v => {
                const emp = employees.find((e: any) => e.id === v);
                setGenForm(f => ({ ...f, employee_id: v, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={genForm.document_type} onValueChange={v => setGenForm(f => ({ ...f, document_type: v, template_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label} / {dt.labelAr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={genForm.template_id} onValueChange={v => setGenForm(f => ({ ...f, template_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}
                  {filteredTemplates.length === 0 && <SelectItem value="_none" disabled>No templates for this type</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={genForm.language} onValueChange={v => setGenForm(f => ({ ...f, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bilingual">Bilingual (AR + EN)</SelectItem>
                  <SelectItem value="en">English Only</SelectItem>
                  <SelectItem value="ar">Arabic Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose</Label>
              <Input value={genForm.purpose} onChange={e => setGenForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Bank requirement, visa application..." />
            </div>
            {/* Extra placeholders */}
            {['warning_level', 'violation_description', 'incident_date', 'end_date', 'probation_period', 'validity_period', 'policy_name'].map(ph => (
              <div key={ph}>
                <Label className="capitalize">{ph.replace(/_/g, ' ')}</Label>
                <Input value={genForm.placeholders[ph] || ''} onChange={e => setGenForm(f => ({ ...f, placeholders: { ...f.placeholders, [ph]: e.target.value } }))} placeholder={`{{${ph}}}`} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!genForm.template_id || !genForm.employee_id}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />Document Preview — {previewDoc?.reference_number}
          </DialogTitle></DialogHeader>
          {previewDoc && (
            <div ref={printRef} className="border rounded-lg p-8 bg-white text-black space-y-6" style={{ fontFamily: "'Segoe UI', sans-serif" }}>
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-[#1a365d] pb-3">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#1a365d' }}>{company?.company_name || 'Company'}</h2>
                  <p className="text-xs text-gray-500">{previewDoc.reference_number} | {format(new Date(previewDoc.created_at), 'dd/MM/yyyy')}</p>
                </div>
                <Badge variant={STATUS_COLORS[previewDoc.status] || 'outline'} className="text-xs">{previewDoc.status?.replace(/_/g, ' ')}</Badge>
              </div>

              {/* English Content */}
              {previewDoc.language !== 'ar' && previewDoc.generated_content_en && (
                <div>
                  <h3 className="text-center font-bold text-base mb-4" style={{ color: '#1a365d' }}>{previewDoc.subject_en}</h3>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{previewDoc.generated_content_en}</div>
                </div>
              )}

              {/* Separator */}
              {previewDoc.language === 'bilingual' && <hr className="border-gray-300" />}

              {/* Arabic Content */}
              {previewDoc.language !== 'en' && previewDoc.generated_content_ar && (
                <div dir="rtl" className="text-right">
                  <h3 className="text-center font-bold text-base mb-4" style={{ color: '#1a365d' }}>{previewDoc.subject_ar}</h3>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{previewDoc.generated_content_ar}</div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-[9px] text-gray-400 border-t pt-2 mt-8">
                This document was generated electronically — هذا المستند تم إنشاؤه إلكترونياً
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {previewDoc?.status === 'draft' && <Button variant="outline" onClick={() => { handleSubmitForApproval(previewDoc); setShowPreview(false); }}><FileCheck className="h-4 w-4 mr-1" />Submit for Approval</Button>}
            {previewDoc?.status === 'pending_approval' && (
              <>
                <Button variant="outline" className="text-emerald-600" onClick={() => { handleApprove(previewDoc); setShowPreview(false); }}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                <Button variant="outline" className="text-destructive" onClick={() => { handleReject(previewDoc); setShowPreview(false); }}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
              </>
            )}
            <Button onClick={() => previewDoc && exportPDF(previewDoc)}><Download className="h-4 w-4 mr-1" />Export PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedTemplate ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Template Name</Label>
                <Input value={tplForm.template_name} onChange={e => setTplForm(f => ({ ...f, template_name: e.target.value }))} />
              </div>
              <div>
                <Label>Document Type</Label>
                <Select value={tplForm.document_type} onValueChange={v => setTplForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={tplForm.language} onValueChange={v => setTplForm(f => ({ ...f, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bilingual">Bilingual</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Subject (EN)</Label><Input value={tplForm.subject_en} onChange={e => setTplForm(f => ({ ...f, subject_en: e.target.value }))} /></div>
              <div><Label>Subject (AR)</Label><Input value={tplForm.subject_ar} onChange={e => setTplForm(f => ({ ...f, subject_ar: e.target.value }))} dir="rtl" /></div>
            </div>
            <div>
              <Label>Body Template (English)</Label>
              <Textarea rows={8} value={tplForm.body_template_en} onChange={e => setTplForm(f => ({ ...f, body_template_en: e.target.value }))} placeholder="Use {{placeholders}} like {{employee_name}}, {{position}}, {{salary}}" />
            </div>
            <div>
              <Label>Body Template (Arabic)</Label>
              <Textarea rows={8} value={tplForm.body_template_ar} onChange={e => setTplForm(f => ({ ...f, body_template_ar: e.target.value }))} dir="rtl" placeholder="استخدم {{employee_name_ar}} و {{position}} وغيرها" />
            </div>
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              <strong>Available placeholders:</strong> {'{{employee_name}}'}, {'{{employee_name_ar}}'}, {'{{position}}'}, {'{{department}}'}, {'{{salary}}'}, {'{{join_date}}'}, {'{{company_name}}'}, {'{{company_name_ar}}'}, {'{{date}}'}, {'{{employee_id_number}}'}, {'{{purpose}}'}, {'{{end_date}}'}, {'{{warning_level}}'}, {'{{violation_description}}'}, {'{{probation_period}}'}, {'{{validity_period}}'}, {'{{policy_name}}'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateEditor(false)}>Cancel</Button>
            <Button onClick={() => {
              const payload = { ...tplForm, company_id: activeCompanyId, created_by: user?.id };
              if (selectedTemplate) updateTemplate.mutate({ id: selectedTemplate.id, ...payload });
              else createTemplate.mutate(payload);
            }} disabled={!tplForm.template_name}>
              {selectedTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
