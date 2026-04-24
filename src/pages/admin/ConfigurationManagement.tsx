import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Camera, GitCompare, RotateCcw, Upload, Download, Clock, Shield, Eye, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Snapshot {
  id: string;
  name: string;
  environment: 'development' | 'testing' | 'production';
  createdBy: string;
  createdAt: string;
  modules: string[];
  size: string;
  status: 'active' | 'archived';
}

const MOCK_SNAPSHOTS: Snapshot[] = [
  { id: '1', name: 'Pre-GoLive Baseline', environment: 'production', createdBy: 'Ahmad K.', createdAt: '2026-04-14 09:00', modules: ['Finance', 'Sales', 'HR', 'Inventory'], size: '2.4 MB', status: 'active' },
  { id: '2', name: 'After Tax Config Update', environment: 'production', createdBy: 'Sara M.', createdAt: '2026-04-12 14:30', modules: ['Finance'], size: '0.8 MB', status: 'active' },
  { id: '3', name: 'UAT Config', environment: 'testing', createdBy: 'Omar S.', createdAt: '2026-04-10 11:00', modules: ['Finance', 'Sales', 'HR', 'Inventory', 'Security'], size: '3.1 MB', status: 'active' },
  { id: '4', name: 'Dev Sprint 5', environment: 'development', createdBy: 'Omar S.', createdAt: '2026-04-05 16:00', modules: ['All'], size: '3.5 MB', status: 'archived' },
];

const ENV_COLORS: Record<string, string> = { development: 'bg-blue-100 text-blue-700', testing: 'bg-orange-100 text-orange-700', production: 'bg-green-100 text-green-700' };

const CHANGE_LOG = [
  { date: '2026-04-14 09:15', user: 'Ahmad K.', setting: 'Tax Rate - Standard', old: '5%', new: '15%', module: 'Finance', status: 'approved' },
  { date: '2026-04-13 11:00', user: 'Sara M.', setting: 'Default Warehouse', old: 'WH-01', new: 'WH-03', module: 'Inventory', status: 'approved' },
  { date: '2026-04-12 16:30', user: 'Omar S.', setting: 'Password Policy Min Length', old: '6', new: '8', module: 'Security', status: 'approved' },
  { date: '2026-04-12 14:00', user: 'Sara M.', setting: 'Fiscal Year Start', old: 'January', new: 'April', module: 'Finance', status: 'pending' },
];

export default function ConfigurationManagement() {
  const { language } = useLanguage();
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'إدارة التكوين' : 'Configuration Management'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة لقطات التكوين والمقارنة والاستعادة' : 'Manage configuration snapshots, compare versions, and track changes'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5 mr-1.5" />Import Package</Button>
          <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1.5" />Export Package</Button>
          <Button size="sm"><Camera className="h-3.5 w-3.5 mr-1.5" />Take Snapshot</Button>
        </div>
      </div>

      <Tabs defaultValue="snapshots">
        <TabsList>
          <TabsTrigger value="snapshots"><Camera className="h-3.5 w-3.5 mr-1.5" />Snapshots</TabsTrigger>
          <TabsTrigger value="compare"><GitCompare className="h-3.5 w-3.5 mr-1.5" />Compare</TabsTrigger>
          <TabsTrigger value="changelog"><Clock className="h-3.5 w-3.5 mr-1.5" />Change Log</TabsTrigger>
          <TabsTrigger value="deployment"><ArrowRight className="h-3.5 w-3.5 mr-1.5" />Deployment</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshots" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Snapshot Name</TableHead><TableHead>Environment</TableHead><TableHead>Modules</TableHead><TableHead>Created By</TableHead><TableHead>Date</TableHead><TableHead>Size</TableHead><TableHead className="w-32">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {MOCK_SNAPSHOTS.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell><Badge className={cn('text-xs capitalize', ENV_COLORS[s.environment])}>{s.environment}</Badge></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1">{s.modules.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}</div></TableCell>
                      <TableCell className="text-sm">{s.createdBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.createdAt}</TableCell>
                      <TableCell className="text-sm">{s.size}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><RotateCcw className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Compare Snapshots</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={compareA} onValueChange={setCompareA}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select Snapshot A" /></SelectTrigger><SelectContent>{MOCK_SNAPSHOTS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                <GitCompare className="h-5 w-5 text-muted-foreground" />
                <Select value={compareB} onValueChange={setCompareB}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select Snapshot B" /></SelectTrigger><SelectContent>{MOCK_SNAPSHOTS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                <Button size="sm" disabled={!compareA || !compareB}>Compare</Button>
              </div>
              {compareA && compareB && (
                <Table>
                  <TableHeader><TableRow><TableHead>Setting</TableHead><TableHead>Module</TableHead><TableHead>Snapshot A</TableHead><TableHead>Snapshot B</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="text-sm">Tax Rate - Standard</TableCell><TableCell><Badge variant="secondary" className="text-xs">Finance</Badge></TableCell><TableCell className="text-sm">5%</TableCell><TableCell className="text-sm font-medium text-orange-600">15%</TableCell><TableCell><Badge className="text-xs bg-orange-100 text-orange-700">Changed</Badge></TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Default Warehouse</TableCell><TableCell><Badge variant="secondary" className="text-xs">Inventory</Badge></TableCell><TableCell className="text-sm">WH-01</TableCell><TableCell className="text-sm">WH-01</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Same</Badge></TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Multi-Currency</TableCell><TableCell><Badge variant="secondary" className="text-xs">System</Badge></TableCell><TableCell className="text-sm">Disabled</TableCell><TableCell className="text-sm font-medium text-orange-600">Enabled</TableCell><TableCell><Badge className="text-xs bg-orange-100 text-orange-700">Changed</Badge></TableCell></TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Setting</TableHead><TableHead>Module</TableHead><TableHead>Old Value</TableHead><TableHead>New Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {CHANGE_LOG.map((c, i) => (
                    <TableRow key={i}><TableCell className="text-sm text-muted-foreground">{c.date}</TableCell><TableCell className="text-sm">{c.user}</TableCell><TableCell className="text-sm font-medium">{c.setting}</TableCell><TableCell><Badge variant="secondary" className="text-xs">{c.module}</Badge></TableCell><TableCell className="text-sm text-red-600">{c.old}</TableCell><TableCell className="text-sm text-green-600">{c.new}</TableCell><TableCell>{c.status === 'approved' ? <Badge className="text-xs bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge> : <Badge className="text-xs bg-orange-100 text-orange-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Deployment History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead></TableHead><TableHead>To</TableHead><TableHead>Package</TableHead><TableHead>Deployed By</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell className="text-sm">2026-04-14</TableCell><TableCell><Badge className={cn('text-xs', ENV_COLORS.testing)}>Testing</Badge></TableCell><TableCell><ArrowRight className="h-3 w-3" /></TableCell><TableCell><Badge className={cn('text-xs', ENV_COLORS.production)}>Production</Badge></TableCell><TableCell className="text-sm">UAT Config</TableCell><TableCell className="text-sm">Ahmad K.</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Success</Badge></TableCell></TableRow>
                  <TableRow><TableCell className="text-sm">2026-04-10</TableCell><TableCell><Badge className={cn('text-xs', ENV_COLORS.development)}>Development</Badge></TableCell><TableCell><ArrowRight className="h-3 w-3" /></TableCell><TableCell><Badge className={cn('text-xs', ENV_COLORS.testing)}>Testing</Badge></TableCell><TableCell className="text-sm">Dev Sprint 5</TableCell><TableCell className="text-sm">Omar S.</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Success</Badge></TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
