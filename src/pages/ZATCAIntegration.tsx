import { useState } from 'react';
import { useZATCA, ZATCASettings, ZATCASubmission } from '@/hooks/useZATCA';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Shield, Settings, FileText, Send, CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, Key, Building2, QrCode, Activity, Eye, Zap, Hash, Link2, ShieldCheck,
  AlertCircle, Info,
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  cleared: 'bg-green-100 text-green-800',
  reported: 'bg-green-100 text-green-800',
  warning: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
  error: 'bg-red-100 text-red-800',
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  submitted: Send,
  cleared: CheckCircle,
  reported: CheckCircle,
  warning: AlertTriangle,
  rejected: XCircle,
  error: XCircle,
};

export default function ZATCAIntegration() {
  const { t } = useLanguage();
  const {
    settings, submissions, logs, loading,
    saveSettings, generateXML, submitClearance, submitReporting,
    simulateClearance, onboardCSID, refresh,
  } = useZATCA();

  const [settingsForm, setSettingsForm] = useState<Partial<ZATCASettings>>({});
  const [otpValue, setOtpValue] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ZATCASubmission | null>(null);
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const [checkingCompliance, setCheckingCompliance] = useState(false);

  const initForm = () => {
    setSettingsForm(settings || {
      organization_name: '', organization_name_ar: '', vat_number: '', cr_number: '',
      street: '', building_number: '', city: '', district: '', postal_code: '',
      environment: 'sandbox',
    });
  };

  const handleSaveSettings = async () => {
    await saveSettings(settingsForm);
  };

  const handleSubmit = async (sub: ZATCASubmission, action: 'clearance' | 'reporting') => {
    setSubmitting(sub.id);
    try {
      if (action === 'clearance') await submitClearance(sub.id);
      else await submitReporting(sub.id);
    } finally {
      setSubmitting(null);
    }
  };

  const handleOnboard = async () => {
    if (!otpValue) return;
    await onboardCSID(otpValue);
    setOtpValue('');
  };

  const handleComplianceCheck = async () => {
    setCheckingCompliance(true);
    try {
      const { callZATCA } = await import('@/hooks/useZATCA').then(() => {
        // Call via the hook's internal method
        return { callZATCA: async () => {
          const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/zatca-integration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ action: 'compliance_check' }),
          });
          return resp.json();
        }};
      });
      const result = await callZATCA();
      setComplianceResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingCompliance(false);
    }
  };

  // Stats
  const totalSubmissions = submissions.length;
  const clearedCount = submissions.filter(s => s.status === 'cleared' || s.status === 'reported').length;
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const errorCount = submissions.filter(s => s.status === 'rejected' || s.status === 'error').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            {t('nav.zatcaIntegration')}
          </h1>
          <p className="text-muted-foreground">هيئة الزكاة والضريبة والجمارك - Phase 2 Integration</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm px-3 py-1">
            {settings?.environment === 'production' ? '🟢 Production' : settings?.environment === 'simulation' ? '🟡 Simulation' : '🔵 Sandbox'}
          </Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Hash className="h-3 w-3 mr-1" /> Phase 2
          </Badge>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{clearedCount}</p>
                <p className="text-xs text-muted-foreground">Cleared</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Link2 className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{(settings as any)?.invoice_counter || 0}</p>
                <p className="text-xs text-muted-foreground">ICV Counter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compliance" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="compliance"><ShieldCheck className="h-4 w-4 mr-1" /> Compliance</TabsTrigger>
          <TabsTrigger value="submissions"><FileText className="h-4 w-4 mr-1" /> Submissions</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Settings</TabsTrigger>
          <TabsTrigger value="onboarding"><Key className="h-4 w-4 mr-1" /> Onboarding</TabsTrigger>
          <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-1" /> API Logs</TabsTrigger>
        </TabsList>

        {/* Phase 2 Compliance Check Tab */}
        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Phase 2 Readiness Check</CardTitle>
                <CardDescription>Verify your configuration meets ZATCA Phase 2 (Integration) requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleComplianceCheck} disabled={checkingCompliance} className="w-full">
                  {checkingCompliance ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Run Compliance Check
                </Button>

                {complianceResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={complianceResult.overall_status === 'ready' ? 'bg-green-100 text-green-800' : complianceResult.overall_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                        {complianceResult.overall_status === 'ready' ? '✅ Ready' : complianceResult.overall_status === 'partial' ? '⚠️ Partial' : '❌ Not Ready'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {complianceResult.summary?.passed}/{complianceResult.summary?.total} passed
                      </span>
                    </div>
                    <Progress value={(complianceResult.summary?.passed / complianceResult.summary?.total) * 100} />

                    <div className="space-y-2">
                      {complianceResult.checks?.map((check: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                          {check.status === 'pass' ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" /> :
                           check.status === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" /> :
                           <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                          <div className="flex-1">
                            <span className="font-medium">{check.name}</span>
                            <p className="text-xs text-muted-foreground">{check.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" /> Phase 2 Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <h4 className="font-semibold flex items-center gap-2"><Hash className="h-4 w-4" /> Cryptographic Stamps</h4>
                    <p className="text-muted-foreground">SHA-256 invoice hashing with ECDSA digital signatures using X.509 certificates issued by ZATCA.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <h4 className="font-semibold flex items-center gap-2"><QrCode className="h-4 w-4" /> TLV QR Codes</h4>
                    <p className="text-muted-foreground">Phase 2 QR codes include 8 TLV tags: seller name, VAT, timestamp, totals, invoice hash, ECDSA signature, and public key.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <h4 className="font-semibold flex items-center gap-2"><Link2 className="h-4 w-4" /> Invoice Chaining (ICV + PIH)</h4>
                    <p className="text-muted-foreground">Sequential Invoice Counter Value and Previous Invoice Hash ensure tamper-proof invoice chains.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <h4 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> UBL 2.1 + XAdES</h4>
                    <p className="text-muted-foreground">Full UBL 2.1 XML with XAdES enveloped signatures, buyer details for B2B, and ZATCA-mandated extensions.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <h4 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> CSID Lifecycle</h4>
                    <p className="text-muted-foreground">CSR → Compliance CSID → Compliance Testing → Production CSID flow with OTP-based onboarding.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Submissions</CardTitle>
              <CardDescription>Phase 2 submissions with cryptographic hashing, UUID, and invoice chaining</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No submissions yet</p>
                  <p className="text-sm">Generate XML from AR Invoices, Credit Memos, or Returns to start</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doc #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>ICV</TableHead>
                        <TableHead>UUID</TableHead>
                        <TableHead>Submission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((sub) => {
                        const StatusIcon = statusIcons[sub.status] || Clock;
                        return (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.document_number || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-xs">{sub.document_type.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{sub.invoice_type === 'standard' ? '388' : '381'}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{(sub as any).invoice_counter || '-'}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[80px] truncate">{sub.uuid?.substring(0, 8)}...</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{sub.submission_type === 'clearance' ? '🔒 Clear' : '📊 Report'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[sub.status] || ''}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {sub.created_at ? format(new Date(sub.created_at), 'dd/MM HH:mm') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {sub.status === 'pending' && (
                                  <Button size="sm" variant="default" disabled={submitting === sub.id}
                                    onClick={() => handleSubmit(sub, sub.submission_type === 'clearance' ? 'clearance' : 'reporting')}>
                                    {submitting === sub.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    <span className="ml-1">{sub.submission_type === 'clearance' ? 'Clear' : 'Report'}</span>
                                  </Button>
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedSubmission(sub)}>
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Submission Details - {sub.document_number}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><Label>UUID</Label><p className="text-muted-foreground break-all font-mono text-xs">{sub.uuid}</p></div>
                                        <div><Label>SHA-256 Hash</Label><p className="text-muted-foreground break-all font-mono text-xs">{sub.invoice_hash || '-'}</p></div>
                                        <div><Label>Invoice Counter (ICV)</Label><p className="font-mono">{(sub as any).invoice_counter || '-'}</p></div>
                                        <div><Label>Previous Hash (PIH)</Label><p className="text-muted-foreground break-all font-mono text-xs">{(sub as any).previous_invoice_hash?.substring(0, 30) || '-'}...</p></div>
                                        <div><Label>ZATCA Status</Label><p>{sub.zatca_status || '-'}</p></div>
                                        <div><Label>Cleared At</Label><p>{sub.cleared_at ? format(new Date(sub.cleared_at), 'dd/MM/yyyy HH:mm') : '-'}</p></div>
                                      </div>
                                      {sub.qr_code && (
                                        <div>
                                          <Label className="flex items-center gap-1"><QrCode className="h-4 w-4" /> Phase 2 TLV QR Code</Label>
                                          <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded mt-1 font-mono">{sub.qr_code}</p>
                                        </div>
                                      )}
                                      {sub.validation_results && (
                                        <div>
                                          <Label>Validation Results</Label>
                                          <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-60">
                                            {JSON.stringify(sub.validation_results, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {sub.error_messages && (
                                        <div>
                                          <Label className="text-destructive">Errors</Label>
                                          <pre className="text-xs bg-destructive/10 p-3 rounded mt-1 overflow-auto">
                                            {JSON.stringify(sub.error_messages, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Organization Settings</CardTitle>
              <CardDescription>Configure your organization details for ZATCA Phase 2 compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization Name (EN) *</Label>
                    <Input value={settingsForm.organization_name || settings?.organization_name || ''}
                      onChange={e => setSettingsForm(f => ({ ...f, organization_name: e.target.value }))}
                      placeholder="Company Name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Organization Name (AR)</Label>
                    <Input value={settingsForm.organization_name_ar || settings?.organization_name_ar || ''}
                      onChange={e => setSettingsForm(f => ({ ...f, organization_name_ar: e.target.value }))}
                      placeholder="اسم الشركة" dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label>VAT Registration Number *</Label>
                    <Input value={settingsForm.vat_number || settings?.vat_number || ''}
                      onChange={e => setSettingsForm(f => ({ ...f, vat_number: e.target.value }))}
                      placeholder="3XXXXXXXXXX0003" />
                  </div>
                  <div className="space-y-2">
                    <Label>Commercial Registration (CR)</Label>
                    <Input value={settingsForm.cr_number || settings?.cr_number || ''}
                      onChange={e => setSettingsForm(f => ({ ...f, cr_number: e.target.value }))}
                      placeholder="1010XXXXXX" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Address (Required for Phase 2)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Street</Label>
                      <Input value={settingsForm.street || settings?.street || ''}
                        onChange={e => setSettingsForm(f => ({ ...f, street: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Building Number</Label>
                      <Input value={settingsForm.building_number || settings?.building_number || ''}
                        onChange={e => setSettingsForm(f => ({ ...f, building_number: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={settingsForm.city || settings?.city || ''}
                        onChange={e => setSettingsForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>District</Label>
                      <Input value={settingsForm.district || settings?.district || ''}
                        onChange={e => setSettingsForm(f => ({ ...f, district: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input value={settingsForm.postal_code || settings?.postal_code || ''}
                        onChange={e => setSettingsForm(f => ({ ...f, postal_code: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Environment</Label>
                      <Select value={settingsForm.environment || settings?.environment || 'sandbox'}
                        onValueChange={v => setSettingsForm(f => ({ ...f, environment: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">🔵 Sandbox (Testing)</SelectItem>
                          <SelectItem value="simulation">🟡 Simulation</SelectItem>
                          <SelectItem value="production">🟢 Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => { initForm(); handleSaveSettings(); }}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Phase 2 CSID Onboarding</CardTitle>
                <CardDescription>Complete the CSID lifecycle: CSR → Compliance → Production</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium">Phase 2 Onboarding Steps:</h4>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Generate CSR (Certificate Signing Request)</li>
                    <li>Log in to ZATCA Fatoora Portal</li>
                    <li>Submit CSR and generate OTP</li>
                    <li>Obtain Compliance CSID using OTP</li>
                    <li>Run compliance tests (6 invoice scenarios)</li>
                    <li>Request Production CSID</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <Label>OTP from ZATCA Portal</Label>
                  <Input value={otpValue} onChange={e => setOtpValue(e.target.value)} placeholder="Enter OTP" />
                </div>
                <Button onClick={handleOnboard} disabled={!otpValue} className="w-full">
                  <Zap className="h-4 w-4 mr-2" /> Onboard CSID
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Compliance CSID</Label>
                  <div className="p-2 bg-muted rounded text-sm font-mono break-all">
                    {settings?.compliance_csid ? `${settings.compliance_csid.substring(0, 20)}...` : 'Not configured'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Production CSID</Label>
                  <div className="p-2 bg-muted rounded text-sm font-mono break-all">
                    {settings?.production_csid ? `${settings.production_csid.substring(0, 20)}...` : 'Not configured'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Badge variant="outline" className="text-sm">{settings?.environment || 'Not set'}</Badge>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Counter (ICV)</Label>
                  <Badge variant="secondary">{(settings as any)?.invoice_counter || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> API Logs</CardTitle>
              <CardDescription>Detailed log of all ZATCA API interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No API logs yet</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{log.created_at ? format(new Date(log.created_at), 'dd/MM HH:mm:ss') : '-'}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{log.action}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.request_url || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={log.response_status && log.response_status < 300 ? 'default' : 'destructive'}>
                              {log.response_status || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.duration_ms ? `${log.duration_ms}ms` : '-'}</TableCell>
                          <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
