import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, TestTube, Plus, Mail, Server, Bell, FileText, RotateCcw, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-3 py-1.5">
      <Label className="text-sm text-muted-foreground pt-2">{label}</Label>
      <div>{children}{hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}</div>
    </div>
  );
}

export default function EmailSettings() {
  const { language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const handleTest = () => { toast.success('Test email sent successfully!'); };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'إعدادات البريد الإلكتروني' : 'E-Mail Settings'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة خادم SMTP والإشعارات والقوالب' : 'Configure SMTP server, notification rules, and email templates'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset</Button>
          <Button size="sm"><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button>
        </div>
      </div>

      <Tabs defaultValue="smtp">
        <TabsList>
          <TabsTrigger value="smtp"><Server className="h-3.5 w-3.5 mr-1.5" />SMTP Configuration</TabsTrigger>
          <TabsTrigger value="sender"><Mail className="h-3.5 w-3.5 mr-1.5" />Sender Identities</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 mr-1.5" />Notification Rules</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-3.5 w-3.5 mr-1.5" />Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue & Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">SMTP Server Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <FormField label="SMTP Host"><Input className="h-8 text-sm" placeholder="smtp.office365.com" defaultValue="smtp.office365.com" /></FormField>
              <FormField label="Port"><Input className="h-8 text-sm w-24" defaultValue="587" /></FormField>
              <FormField label="Encryption"><Select defaultValue="tls"><SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="ssl">SSL</SelectItem><SelectItem value="tls">TLS</SelectItem></SelectContent></Select></FormField>
              <FormField label="Username"><Input className="h-8 text-sm" placeholder="noreply@company.com" /></FormField>
              <FormField label="Password">
                <div className="relative"><Input type={showPassword ? 'text' : 'password'} className="h-8 text-sm pr-8" placeholder="••••••••" /><button className="absolute right-2 top-1.5" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}</button></div>
              </FormField>
              <FormField label="From Email"><Input className="h-8 text-sm" placeholder="noreply@company.com" /></FormField>
              <FormField label="From Name"><Input className="h-8 text-sm" placeholder="ERP System" /></FormField>
              <FormField label="Reply-to Email"><Input className="h-8 text-sm" placeholder="support@company.com" /></FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Connection Test</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input className="h-8 text-sm flex-1" placeholder="Enter test email address" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                <Button size="sm" onClick={handleTest}><TestTube className="h-3.5 w-3.5 mr-1.5" />Send Test</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Queue & Retry Settings</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <FormField label="Batch Size"><Input className="h-8 text-sm w-24" defaultValue="50" /></FormField>
              <FormField label="Retry Attempts"><Input className="h-8 text-sm w-24" defaultValue="3" /></FormField>
              <FormField label="Retry Interval"><Select defaultValue="5"><SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 minute</SelectItem><SelectItem value="5">5 minutes</SelectItem><SelectItem value="15">15 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem></SelectContent></Select></FormField>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sender" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between"><CardTitle className="text-sm">Sender Profiles</CardTitle><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Add Profile</Button></div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Profile Name</TableHead><TableHead>From Email</TableHead><TableHead>Module</TableHead><TableHead>Branch</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell className="font-medium">Default</TableCell><TableCell>noreply@company.com</TableCell><TableCell><Badge variant="secondary" className="text-xs">All</Badge></TableCell><TableCell>All Branches</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Active</Badge></TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">Sales</TableCell><TableCell>sales@company.com</TableCell><TableCell><Badge variant="secondary" className="text-xs">Sales</Badge></TableCell><TableCell>All Branches</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Active</Badge></TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">HR</TableCell><TableCell>hr@company.com</TableCell><TableCell><Badge variant="secondary" className="text-xs">HR</Badge></TableCell><TableCell>HQ Only</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Active</Badge></TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Recipients</TableHead><TableHead>Email</TableHead><TableHead>In-App</TableHead><TableHead>SMS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {['New Sales Order', 'Invoice Created', 'Payment Received', 'PO Approval Required', 'Leave Request Submitted', 'Document Expiring', 'Budget Exceeded', 'Inventory Low Stock'].map(evt => (
                    <TableRow key={evt}><TableCell className="text-sm">{evt}</TableCell><TableCell className="text-sm text-muted-foreground">Manager, Admin</TableCell><TableCell><Switch defaultChecked /></TableCell><TableCell><Switch defaultChecked /></TableCell><TableCell><Switch /></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Email Templates</CardTitle><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />New Template</Button></div></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Template Name</TableHead><TableHead>Subject</TableHead><TableHead>Module</TableHead><TableHead>Language</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[{ name: 'Invoice Email', subject: 'Invoice #{doc_num} from {company}', module: 'Sales', lang: 'EN/AR' },
                    { name: 'Approval Request', subject: '{doc_type} Pending Your Approval', module: 'Workflow', lang: 'EN/AR' },
                    { name: 'Welcome Email', subject: 'Welcome to {company} ERP', module: 'System', lang: 'EN/AR' },
                    { name: 'Password Reset', subject: 'Reset Your Password', module: 'Auth', lang: 'EN/AR' },
                  ].map(t => (
                    <TableRow key={t.name}><TableCell className="font-medium text-sm">{t.name}</TableCell><TableCell className="text-sm text-muted-foreground">{t.subject}</TableCell><TableCell><Badge variant="secondary" className="text-xs">{t.module}</Badge></TableCell><TableCell className="text-sm">{t.lang}</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Active</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Email Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>To</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Attempts</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[{ date: '2026-04-14 10:30', to: 'user@example.com', subject: 'Invoice #1234', status: 'sent', attempts: 1 },
                    { date: '2026-04-14 10:15', to: 'manager@example.com', subject: 'Approval Required', status: 'sent', attempts: 1 },
                    { date: '2026-04-14 09:45', to: 'vendor@external.com', subject: 'PO #5678', status: 'failed', attempts: 3 },
                  ].map((e, i) => (
                    <TableRow key={i}><TableCell className="text-sm">{e.date}</TableCell><TableCell className="text-sm">{e.to}</TableCell><TableCell className="text-sm">{e.subject}</TableCell><TableCell>{e.status === 'sent' ? <Badge className="text-xs bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge> : <Badge className="text-xs bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}</TableCell><TableCell className="text-sm">{e.attempts}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
