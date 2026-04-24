import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, FileText, RefreshCw, CheckCircle, AlertTriangle, Clock, Eye, Zap, ScanLine, Link2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BankStatementAutomation() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('feeds');

  // Bank feeds
  const bankFeeds = [
    { bank: 'Al Rajhi Bank', account: '****4521', format: 'ISO 20022', lastSync: '2026-03-17 08:30', status: 'connected', txnCount: 145, autoRecon: 92 },
    { bank: 'Saudi National Bank', account: '****7890', format: 'MT940', lastSync: '2026-03-17 08:00', status: 'connected', txnCount: 89, autoRecon: 88 },
    { bank: 'Riyad Bank', account: '****3456', format: 'ISO 20022', lastSync: '2026-03-16 23:00', status: 'delayed', txnCount: 67, autoRecon: 85 },
    { bank: 'Emirates NBD', account: '****1234', format: 'MT940', lastSync: '2026-03-15 12:00', status: 'disconnected', txnCount: 0, autoRecon: 0 },
  ];

  // Auto-matching results
  const matchingResults = [
    { bank: 'Al Rajhi', total: 145, matched: 134, unmatched: 8, exceptions: 3, percentage: 92.4 },
    { bank: 'SNB', total: 89, matched: 78, unmatched: 7, exceptions: 4, percentage: 87.6 },
    { bank: 'Riyad', total: 67, matched: 57, unmatched: 8, exceptions: 2, percentage: 85.1 },
  ];

  // OCR uploads
  const ocrUploads = [
    { id: '1', filename: 'statement-march-2026.pdf', bank: 'Al Rajhi', pages: 5, txnExtracted: 42, accuracy: 96, status: 'processed', uploadDate: '2026-03-15' },
    { id: '2', filename: 'SNB-Feb-stmt.pdf', bank: 'SNB', pages: 3, txnExtracted: 28, accuracy: 93, status: 'processed', uploadDate: '2026-03-10' },
    { id: '3', filename: 'riyad-bank-q1.pdf', bank: 'Riyad', pages: 12, txnExtracted: 0, accuracy: 0, status: 'processing', uploadDate: '2026-03-17' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Download className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Statement Automation</h1>
          <p className="text-sm text-muted-foreground">Direct feeds, auto-matching, and OCR statement processing</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="feeds"><Link2 className="h-3 w-3 mr-1" /> Bank Feeds</TabsTrigger>
          <TabsTrigger value="matching"><Zap className="h-3 w-3 mr-1" /> Auto-Match</TabsTrigger>
          <TabsTrigger value="ocr"><ScanLine className="h-3 w-3 mr-1" /> OCR Import</TabsTrigger>
        </TabsList>

        {/* Bank Feeds */}
        <TabsContent value="feeds" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">ISO 20022 (camt.053) and MT940 direct bank feeds</p>
            <Button size="sm"><Link2 className="h-4 w-4 mr-1" /> Connect Bank</Button>
          </div>

          <div className="space-y-3">
            {bankFeeds.map((f, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${f.status === 'connected' ? 'bg-green-500' : f.status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-medium text-sm">{f.bank}</p>
                        <p className="text-xs text-muted-foreground">{f.account} · {f.format}</p>
                      </div>
                    </div>
                    <Badge variant={f.status === 'connected' ? 'default' : f.status === 'delayed' ? 'outline' : 'destructive'} className="text-[10px]">
                      {f.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Last Sync</p>
                      <p className="text-xs font-medium">{f.lastSync}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Transactions</p>
                      <p className="text-xs font-medium">{f.txnCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Auto-Recon %</p>
                      <p className="text-xs font-medium">{f.autoRecon}%</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Sync Now</Button>
                    <Button size="sm" variant="ghost" className="text-xs">Settings</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Auto-Matching */}
        <TabsContent value="matching" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3 text-center">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-600">{matchingResults.reduce((s, r) => s + r.matched, 0)}</p>
                <p className="text-[10px] text-muted-foreground">Auto-Matched</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-amber-600">{matchingResults.reduce((s, r) => s + r.unmatched, 0)}</p>
                <p className="text-[10px] text-muted-foreground">Unmatched</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-600">{matchingResults.reduce((s, r) => s + r.exceptions, 0)}</p>
                <p className="text-[10px] text-muted-foreground">Exceptions</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {matchingResults.map((r, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{r.bank}</span>
                    <span className="text-sm font-bold">{r.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={r.percentage} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{r.matched} matched</span>
                    <span>{r.unmatched} pending</span>
                    <span>{r.exceptions} exceptions</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* OCR */}
        <TabsContent value="ocr" className="space-y-4 mt-4">
          <Card className="border-2 border-dashed border-muted-foreground/30">
            <CardContent className="p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Upload PDF Bank Statement</p>
              <p className="text-xs text-muted-foreground mt-1">OCR will extract transaction data automatically</p>
              <Button className="mt-4"><Upload className="h-4 w-4 mr-2" /> Choose PDF File</Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {ocrUploads.map(u => (
              <Card key={u.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{u.filename}</p>
                        <p className="text-xs text-muted-foreground">{u.bank} · {u.pages} pages · {u.uploadDate}</p>
                      </div>
                    </div>
                    <Badge variant={u.status === 'processed' ? 'default' : 'outline'} className="text-[10px]">
                      {u.status === 'processing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                      {u.status}
                    </Badge>
                  </div>
                  {u.status === 'processed' && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Transactions Extracted</p>
                        <p className="text-sm font-bold">{u.txnExtracted}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">OCR Accuracy</p>
                        <p className="text-sm font-bold">{u.accuracy}%</p>
                      </div>
                    </div>
                  )}
                  {u.status === 'processed' && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="text-xs"><Eye className="h-3 w-3 mr-1" /> Review</Button>
                      <Button size="sm" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Import</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
