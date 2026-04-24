import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSQLServerConnections, useSQLServerQuery } from '@/hooks/useSQLServerQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Database, Table2, Users, Package, FileText } from 'lucide-react';

export function SQLServerExplorer() {
  const { language } = useLanguage();
  const { connections } = useSQLServerConnections();
  const [selectedConn, setSelectedConn] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('SELECT TOP 10 * FROM OCRD WHERE CardType = \'C\'');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [sapData, setSapData] = useState<{ type: string; data: any[] } | null>(null);

  const { executeQuery, fetchTables, fetchSAPCustomers, fetchSAPItems, fetchSAPInvoices } = useSQLServerQuery(selectedConn);

  const handleRunQuery = async () => {
    if (!queryText.trim()) return;
    setLoading(true);
    const result = await executeQuery(queryText);
    setResults(result);
    setLoading(false);
  };

  const handleFetchTables = async () => {
    setLoading(true);
    const data = await fetchTables();
    setTables(data);
    setLoading(false);
  };

  const handleSAPAction = async (type: string) => {
    setLoading(true);
    let data: any[] = [];
    if (type === 'customers') data = await fetchSAPCustomers();
    else if (type === 'items') data = await fetchSAPItems();
    else if (type === 'invoices') data = await fetchSAPInvoices();
    setSapData({ type, data });
    setLoading(false);
  };

  const sqlServerConns = connections.filter(c => c.connection_type === 'sql_server');

  if (sqlServerConns.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'مستكشف SQL Server' : 'SQL Server Explorer'}
          </CardTitle>
          <Select value={selectedConn || ''} onValueChange={setSelectedConn}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={language === 'ar' ? 'اختر اتصال' : 'Select connection'} />
            </SelectTrigger>
            <SelectContent>
              {sqlServerConns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.sql_database})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      {selectedConn && (
        <CardContent>
          <Tabs defaultValue="sap" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sap">{language === 'ar' ? 'بيانات SAP' : 'SAP Data'}</TabsTrigger>
              <TabsTrigger value="tables">{language === 'ar' ? 'الجداول' : 'Tables'}</TabsTrigger>
              <TabsTrigger value="query">{language === 'ar' ? 'استعلام مخصص' : 'Custom Query'}</TabsTrigger>
            </TabsList>

            <TabsContent value="sap" className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => handleSAPAction('customers')} disabled={loading}>
                  <Users className="h-4 w-4 mr-2" />{language === 'ar' ? 'العملاء' : 'Customers'}
                </Button>
                <Button variant="outline" onClick={() => handleSAPAction('items')} disabled={loading}>
                  <Package className="h-4 w-4 mr-2" />{language === 'ar' ? 'الأصناف' : 'Items'}
                </Button>
                <Button variant="outline" onClick={() => handleSAPAction('invoices')} disabled={loading}>
                  <FileText className="h-4 w-4 mr-2" />{language === 'ar' ? 'الفواتير' : 'Invoices'}
                </Button>
              </div>
              {loading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              {sapData && !loading && (
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  <Badge className="m-2">{sapData.data.length} {language === 'ar' ? 'سجل' : 'records'}</Badge>
                  {sapData.data.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(sapData.data[0]).map(col => (
                            <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sapData.data.slice(0, 50).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).map((val: any, j) => (
                              <TableCell key={j} className="text-xs whitespace-nowrap">{val?.toString() || '-'}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tables" className="space-y-4">
              <Button onClick={handleFetchTables} disabled={loading} variant="outline">
                <Table2 className="h-4 w-4 mr-2" />{language === 'ar' ? 'تحميل الجداول' : 'Load Tables'}
              </Button>
              {tables.length > 0 && (
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Schema</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{t.TABLE_SCHEMA}</TableCell>
                          <TableCell className="text-xs font-mono">{t.TABLE_NAME}</TableCell>
                          <TableCell className="text-xs">{t.TABLE_TYPE}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="query" className="space-y-4">
              <div className="space-y-2">
                <textarea
                  className="w-full h-24 p-3 border rounded-lg font-mono text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  placeholder="SELECT TOP 10 * FROM OCRD"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleRunQuery} disabled={loading || !queryText.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    {language === 'ar' ? 'تنفيذ' : 'Execute'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'استعلامات القراءة فقط (SELECT)' : 'Read-only queries (SELECT only)'}
                  </span>
                </div>
              </div>
              {results && (
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  {results.success ? (
                    <>
                      <Badge className="m-2">{results.rowCount} {language === 'ar' ? 'سجل' : 'rows'}</Badge>
                      {results.data?.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(results.data[0]).map((col: string) => (
                                <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.data.slice(0, 100).map((row: any, i: number) => (
                              <TableRow key={i}>
                                {Object.values(row).map((val: any, j: number) => (
                                  <TableCell key={j} className="text-xs whitespace-nowrap">{val?.toString() || '-'}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  ) : (
                    <div className="p-4 text-destructive text-sm">{results.error}</div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
