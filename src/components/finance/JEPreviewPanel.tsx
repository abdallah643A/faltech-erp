import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  BookOpen, CheckCircle2, AlertTriangle, Edit3, Save, X, Send,
  ChevronDown, ChevronRight, Eye, Loader2,
} from 'lucide-react';
import { generateJEPreview, generateJEPreviewFromData, postDocumentWithJE, GeneratedJE, GeneratedJELine } from '@/services/jeGenerationService';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JEPreviewPanelProps {
  documentType: string;
  /** Document ID — required for saved documents. Omit for unsaved. */
  documentId?: string;
  documentRef?: string;
  postingDate?: string;
  /** Pass form data to preview JE before saving the document */
  formData?: {
    total?: number;
    subtotal?: number;
    tax_amount?: number;
    currency?: string;
    doc_date?: string;
    doc_num?: number | string;
    customer_code?: string;
    customer_name?: string;
    vendor_code?: string;
    vendor_name?: string;
    discount_amount?: number;
    [key: string]: any;
  };
  /** If true, show inline (collapsed by default). If false, always expanded */
  collapsible?: boolean;
  /** Callback after successful posting */
  onPosted?: (jeId: string, jeNumber: string) => void;
}

export default function JEPreviewPanel({
  documentType,
  documentId,
  documentRef,
  postingDate,
  formData,
  collapsible = true,
  onPosted,
}: JEPreviewPanelProps) {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(!collapsible);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [preview, setPreview] = useState<GeneratedJE | null>(null);
  const [editableLines, setEditableLines] = useState<GeneratedJELine[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ acct_code: string; acct_name: string }[]>([]);

  const isPreSave = !documentId;

  // Load accounts for edit mode
  useEffect(() => {
    supabase
      .from('chart_of_accounts')
      .select('acct_code, acct_name')
      .eq('is_active', true)
      .order('acct_code')
      .then(({ data }) => {
        if (data) setAccounts(data);
      });
  }, []);

  const loadPreview = useCallback(async () => {
    if (!documentType) return;
    // For pre-save, need formData with at least a total
    if (isPreSave && (!formData || !formData.total)) {
      setError('Enter document total to preview the finance effect');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let je: GeneratedJE;
      if (isPreSave && formData) {
        je = await generateJEPreviewFromData(documentType, formData, activeCompanyId);
      } else if (documentId) {
        je = await generateJEPreview(documentType, documentId, postingDate, activeCompanyId);
      } else {
        throw new Error('No document data available');
      }
      setPreview(je);
      setEditableLines(je.lines.map(l => ({ ...l })));
    } catch (err: any) {
      setError(err.message || 'Failed to generate JE preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [documentType, documentId, postingDate, activeCompanyId, formData, isPreSave]);

  useEffect(() => {
    if (isOpen && !preview && !loading) {
      loadPreview();
    }
  }, [isOpen, preview, loading, loadPreview]);

  // Auto-refresh when formData changes (pre-save mode)
  useEffect(() => {
    if (isPreSave && isOpen && formData?.total) {
      const timer = setTimeout(() => {
        loadPreview();
      }, 500); // debounce
      return () => clearTimeout(timer);
    }
  }, [formData?.total, formData?.subtotal, formData?.tax_amount, isPreSave, isOpen]);

  const handleEditLine = (idx: number, field: keyof GeneratedJELine, value: any) => {
    setEditableLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === 'account_code') {
        const acct = accounts.find(a => a.acct_code === value);
        if (acct) updated.account_name = acct.acct_name;
      }
      return updated;
    }));
  };

  const editedTotalDebit = editableLines.reduce((s, l) => s + l.debit_amount, 0);
  const editedTotalCredit = editableLines.reduce((s, l) => s + l.credit_amount, 0);
  const editedBalanced = Math.abs(editedTotalDebit - editedTotalCredit) < 0.01;

  const handlePost = async () => {
    if (!user?.id || !editedBalanced || !documentId) return;
    setPosting(true);
    try {
      const result = await postDocumentWithJE(
        documentType,
        documentId,
        postingDate || new Date().toISOString().split('T')[0],
        user.id,
        activeCompanyId,
      );
      toast({
        title: 'Journal Entry Posted',
        description: `${result.je_number} created and queued for SAP sync`,
      });
      onPosted?.(result.je_id, result.je_number);
    } catch (err: any) {
      toast({ title: 'Posting Failed', description: err.message, variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const displayLines = editMode ? editableLines : (preview?.lines || []);
  const totalDebit = editMode ? editedTotalDebit : (preview?.total_debit || 0);
  const totalCredit = editMode ? editedTotalCredit : (preview?.total_credit || 0);
  const isBalanced = editMode ? editedBalanced : (preview?.is_balanced || false);

  const panelContent = (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Finance Effect — JE Preview
            {isPreSave && <Badge variant="outline" className="text-xs">Draft</Badge>}
            {documentRef && <span className="text-sm font-normal text-muted-foreground">({documentRef})</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {preview && !editMode && (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Edit3 className="h-3 w-3 mr-1" /> Edit Lines
              </Button>
            )}
            {editMode && (
              <>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditMode(false);
                  setEditableLines(preview?.lines.map(l => ({ ...l })) || []);
                }}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                  <Save className="h-3 w-3 mr-1" /> Apply
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={loadPreview} disabled={loading}>
              <Eye className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>
        {isPreSave && (
          <p className="text-xs text-muted-foreground mt-1">
            This is a draft preview based on current form values. Accounts are determined by the active G/L mapping rule for <strong>{documentType.replace(/_/g, ' ')}</strong>.
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Calculating journal entry...
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 text-destructive py-4 text-sm">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {preview && !loading && (
          <div className="space-y-3">
            {/* Header info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Posting Date</span>
                <p className="font-medium">{preview.posting_date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Period</span>
                <p className="font-medium">{preview.period}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Currency</span>
                <p className="font-medium">{preview.currency}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Source</span>
                <p className="font-medium">{preview.source_document_type.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
            </div>

            {/* JE Lines Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <TableHead className="text-xs">Account Code</TableHead>
                    <TableHead className="text-xs">Account Name</TableHead>
                    <TableHead className="text-right text-xs">Debit</TableHead>
                    <TableHead className="text-right text-xs">Credit</TableHead>
                    <TableHead className="text-xs">Cost Center</TableHead>
                    <TableHead className="text-xs">BP</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayLines.map((line, idx) => (
                    <TableRow key={idx} className={line.debit_amount > 0 ? 'bg-green-50/30 dark:bg-green-950/10' : 'bg-red-50/30 dark:bg-red-950/10'}>
                      <TableCell className="text-xs text-muted-foreground">{line.line_number}</TableCell>
                      <TableCell>
                        {editMode ? (
                          <Select value={line.account_code} onValueChange={v => handleEditLine(idx, 'account_code', v)}>
                            <SelectTrigger className="h-7 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map(a => (
                                <SelectItem key={a.acct_code} value={a.acct_code}>
                                  {a.acct_code} - {a.acct_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-mono text-xs font-medium">{line.account_code}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{line.account_name}</TableCell>
                      <TableCell className="text-right">
                        {editMode ? (
                          <Input
                            type="number"
                            value={line.debit_amount || ''}
                            onChange={e => handleEditLine(idx, 'debit_amount', Number(e.target.value) || 0)}
                            className="h-7 text-xs w-24 text-right"
                          />
                        ) : (
                          <span className={`font-mono text-xs ${line.debit_amount > 0 ? 'text-green-700 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                            {line.debit_amount > 0 ? Number(line.debit_amount).toLocaleString('en', { minimumFractionDigits: 2 }) : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editMode ? (
                          <Input
                            type="number"
                            value={line.credit_amount || ''}
                            onChange={e => handleEditLine(idx, 'credit_amount', Number(e.target.value) || 0)}
                            className="h-7 text-xs w-24 text-right"
                          />
                        ) : (
                          <span className={`font-mono text-xs ${line.credit_amount > 0 ? 'text-red-700 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                            {line.credit_amount > 0 ? Number(line.credit_amount).toLocaleString('en', { minimumFractionDigits: 2 }) : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{line.cost_center || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{line.partner_id || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{line.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/70 font-semibold border-t-2">
                    <TableCell colSpan={3} className="text-xs text-right">TOTAL</TableCell>
                    <TableCell className="text-right font-mono text-xs text-green-700 dark:text-green-400">
                      {totalDebit.toLocaleString('en', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-red-700 dark:text-red-400">
                      {totalCredit.toLocaleString('en', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={3}>
                      {isBalanced ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Balanced
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Unbalanced (Diff: {Math.abs(totalDebit - totalCredit).toFixed(2)})
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Post button — only for saved documents */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {isPreSave ? 'Save the document first to post the journal entry.' : preview.description}
              </p>
              {!isPreSave && (
                <Button
                  onClick={handlePost}
                  disabled={!isBalanced || posting}
                  className="gap-1"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {posting ? 'Posting...' : 'Post & Generate JE'}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!collapsible) return panelContent;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between mb-2">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Finance Effect — JE Preview
            {isPreSave && <Badge variant="outline" className="text-xs">Draft</Badge>}
            {preview && (
              <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-xs">
                DR {totalDebit.toLocaleString('en', { minimumFractionDigits: 2 })} / CR {totalCredit.toLocaleString('en', { minimumFractionDigits: 2 })}
              </Badge>
            )}
          </span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {panelContent}
      </CollapsibleContent>
    </Collapsible>
  );
}
