import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Search, RefreshCw, Loader2, Package } from 'lucide-react';
import { useExternalSAPDatabase, ExternalItem } from '@/hooks/useExternalSAPDatabase';

interface ExternalItemSelectorProps {
  onSelectItem: (item: ExternalItem, connectionId: string, connectionName: string) => void;
  selectedConnectionId?: string | null;
  onConnectionChange?: (connId: string | null) => void;
}

export function ExternalItemSelector({ onSelectItem, selectedConnectionId, onConnectionChange }: ExternalItemSelectorProps) {
  const { language } = useLanguage();
  const { connections, getExternalItems, syncItems } = useExternalSAPDatabase();
  const [activeConnection, setActiveConnection] = useState<string | null>(selectedConnectionId || null);
  const [items, setItems] = useState<ExternalItem[]>([]);
  const [search, setSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLimit, setSyncLimit] = useState('500');
  const [includeZeroStock, setIncludeZeroStock] = useState(true);

  const activeConnections = connections.filter(c => c.is_active);

  useEffect(() => {
    if (selectedConnectionId) setActiveConnection(selectedConnectionId);
  }, [selectedConnectionId]);

  useEffect(() => {
    if (activeConnection) {
      loadItems();
    } else {
      setItems([]);
    }
  }, [activeConnection, includeZeroStock]);

  const loadItems = async (searchVal?: string) => {
    if (!activeConnection) return;
    setLoadingItems(true);
    const data = await getExternalItems(activeConnection, searchVal || search || undefined, includeZeroStock);
    setItems(data);
    setLoadingItems(false);
  };

  const handleSearch = () => loadItems(search);

  const handleConnectionChange = (connId: string) => {
    setActiveConnection(connId);
    onConnectionChange?.(connId);
  };

  const handleSync = async () => {
    if (!activeConnection) return;
    setSyncing(true);
    await syncItems(activeConnection, undefined, parseInt(syncLimit) || 500);
    await loadItems();
    setSyncing(false);
  };

  if (activeConnections.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <Database className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'لا توجد قواعد بيانات خارجية متاحة' : 'No external databases available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          {language === 'ar' ? 'أصناف قاعدة بيانات خارجية' : 'External Database Items'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Selector */}
        <Select value={activeConnection || ''} onValueChange={handleConnectionChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={language === 'ar' ? 'اختر قاعدة البيانات' : 'Select Database'} />
          </SelectTrigger>
          <SelectContent>
            {activeConnections.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {language === 'ar' && c.name_ar ? c.name_ar : c.name} ({c.company_db})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sync Options */}
        {activeConnection && (
          <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                {language === 'ar' ? 'حد المزامنة' : 'Sync Limit'}
              </Label>
              <Select value={syncLimit} onValueChange={setSyncLimit}>
                <SelectTrigger className="h-7 text-xs w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="2000">2,000</SelectItem>
                  <SelectItem value="5000">5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="include-zero-stock"
                checked={includeZeroStock}
                onCheckedChange={setIncludeZeroStock}
                className="scale-75"
              />
              <Label htmlFor="include-zero-stock" className="text-xs text-muted-foreground cursor-pointer">
                {language === 'ar' ? 'عرض بدون مخزون' : 'Show zero stock'}
              </Label>
            </div>
            <Button variant="default" size="sm" onClick={handleSync} disabled={syncing} className="h-7 text-xs ml-auto">
              {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              {language === 'ar' ? 'مزامنة' : 'Sync'}
            </Button>
          </div>
        )}

        {/* Search */}
        {activeConnection && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 text-xs pl-7"
                placeholder={language === 'ar' ? 'بحث عن صنف...' : 'Search item...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch} className="h-8">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Items List */}
        {activeConnection && (
          <ScrollArea className="h-[250px]">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading items...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-3">
                  {language === 'ar' ? 'لا توجد أصناف. اضغط مزامنة لجلب الأصناف' : 'No items found. Click Sync to fetch items from the external database'}
                </p>
                <Button variant="default" size="sm" onClick={handleSync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  {language === 'ar' ? 'مزامنة الأصناف الآن' : 'Sync Items Now'}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{language === 'ar' ? 'كود' : 'Code'}</TableHead>
                    <TableHead className="text-xs">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead className="text-xs">{language === 'ar' ? 'المستودع' : 'WH'}</TableHead>
                    <TableHead className="text-xs text-right">{language === 'ar' ? 'متاح' : 'Avail'}</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const connName = activeConnections.find(c => c.id === activeConnection)?.name || '';
                    return (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectItem(item, activeConnection, connName)}>
                        <TableCell className="text-xs font-mono">{item.item_code}</TableCell>
                        <TableCell className="text-xs">{language === 'ar' && item.item_name_ar ? item.item_name_ar : item.item_name}</TableCell>
                        <TableCell className="text-xs">{item.warehouse_code || '-'}</TableCell>
                        <TableCell className="text-xs text-right">
                          <Badge variant={item.available_qty > 0 ? 'default' : 'secondary'} className="text-[10px]">
                            {item.available_qty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); onSelectItem(item, activeConnection, connName); }}>
                            {language === 'ar' ? 'إضافة' : 'Add'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}